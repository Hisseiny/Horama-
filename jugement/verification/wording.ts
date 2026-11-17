import type { Regle } from "@horama/contrats";
import type { Constat } from "./index.ts";
import { key, normalize, readCents, showCents } from "./values.ts";

// What the mascot says about a finding, for someone who knows nothing of the software under test.
// Every sentence is built from the rule, its values and the zones. Nothing here knows Facturo.

interface Wording {
  annonce?: string; // rules only: what the mascot checks
  resultat: string; // what it found
  question?: string; // proven defects and doubts: what the human is asked at the end of the run
}

const MAX = 90; // characters, for each sentence

// The first sentence that fits. The last one given carries no name and no value: it always fits.
const fit = (...sentences: string[]) => sentences.find((sentence) => sentence.length <= MAX) ?? sentences.at(-1)!;
const quote = (text: string) => `« ${normalize(text)} »`;
const ask = (...sentences: string[]) => `${fit(...sentences)} Bug ou voulu ?`;
const euros = (cents: number) => `${showCents(cents).replace(/,00$/, "")} €`;
// An amount of `valeurs` (« 1240.00 ») or of the screen (« 1 240,00 € »), in cents. null when the text is not an amount.
const cents = (value: string) => (/^-?\d+\.\d{2}$/.test(value) ? Number(value.replace(".", "")) : readCents(value));
// A value as it is said: « 1 240 € » for an amount (cents dropped when they are zero), « 30/11 » for a date, else the text.
const plain = (value: string) => {
  const amount = cents(value);
  return amount === null ? normalize(value).replace(/^(\d{2}\/\d{2})\/\d{4}$/, "$1") : euros(amount);
};
const join = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

function announce(regle: Regle): string {
  switch (regle.type) {
    case "egalite":
      return fit(`Je vérifie que ${quote(regle.a.champ)} correspond à ${quote(regle.b.champ)}.`, "Je vérifie que deux valeurs correspondent.");
    case "somme":
      return fit(`Je refais l'addition de ${quote(regle.cible)}.`, "Je refais l'addition.");
    case "filtre":
      if (regle.condition === "< aujourd_hui") return "Je vérifie que ce filtre ne montre que des dates passées.";
      if (regle.condition === "<= aujourd_hui") return "Je vérifie que ce filtre ne montre aucune date à venir.";
      return fit(`Je vérifie que ce filtre ne montre que ${quote(regle.valeur ?? "")}.`, "Je vérifie que ce filtre montre les bonnes lignes.");
    case "format":
      return fit(
        regle.motif === "date-fr" ? `Je vérifie que les dates de ${quote(regle.colonne)} sont bien écrites.` : `Je vérifie que les montants de ${quote(regle.colonne)} sont bien écrits.`,
        "Je vérifie que tout est bien écrit.",
      );
    case "presence":
      return fit(`Je vérifie que ${quote(regle.colonne)} est rempli partout.`, "Je vérifie qu'il ne manque rien.");
    case "etat":
      return fit(`Je vérifie qu'après l'action, la page affiche ${quote(regle.texte_present?.[0] ?? "")}.`, "Je vérifie que la page affiche le bon texte.");
  }
}

function conforming(regle: Regle, valeurs: Record<string, string>): string {
  switch (regle.type) {
    case "egalite":
      return fit(`C'est bon : ${plain(Object.values(valeurs)[0])} des deux côtés.`, "C'est bon : les deux correspondent.");
    case "somme":
      return fit(`C'est bon : l'addition fait bien ${plain(Object.values(valeurs).at(-1)!)}.`, "C'est bon : l'addition est juste.");
    case "filtre":
      return "C'est bon : chaque ligne affichée a sa place ici.";
    case "format":
      return "C'est bon : tout est bien écrit.";
    case "presence":
      return "C'est bon : rien ne manque.";
    case "etat":
      return fit(`C'est bon : ${quote(regle.texte_present?.[0] ?? "")} s'affiche.`, "C'est bon : l'état attendu s'affiche.");
  }
}

// `valeurs` keeps the order in which the rule read its values: both sides of an equality (a, then b), the column then the target of a sum.
// `textes_a_surligner` names what is at fault: the rows for a filter or an empty cell, the values for a format.
function broken(regle: Regle, { ecran, valeurs, textes_a_surligner }: Constat): { resultat: string; question: string } {
  const [first = "", ...others] = textes_a_surligner.map(normalize);
  const several = others.length + 1;
  switch (regle.type) {
    case "egalite": {
      const values = Object.values(valeurs);
      const [a, b] = values.map(plain);
      const [here, there] = regle.a.ecran === ecran ? [a, b] : [b, a];
      const amounts = values.map(cents);
      return {
        resultat: join(
          fit(regle.a.ecran === regle.b.ecran ? `Problème : ${a} d'un côté, ${b} de l'autre.` : `Problème : ici ${here}, là-bas ${there}.`, "Problème : les deux valeurs sont différentes."),
          amounts[0] !== null && amounts[1] !== null && `Il manque ${euros(Math.abs(amounts[0] - amounts[1]))}.`,
        ),
        question: ask(`${quote(regle.a.champ)} affiche ${a}, ${quote(regle.b.champ)} affiche ${b}.`, `Deux valeurs devraient correspondre : ${a} et ${b}.`, "Deux valeurs devraient correspondre."),
      };
    }
    case "somme": {
      const amounts = Object.values(valeurs).map((value) => cents(value)!);
      const displayed = amounts.pop()!;
      const sum = amounts.reduce((total, amount) => total + amount, 0);
      return {
        resultat: join(
          fit(`Problème : l'addition fait ${euros(sum)}, la page affiche ${euros(displayed)}.`, "Problème : l'addition ne tombe pas juste."),
          `Il manque ${euros(Math.abs(sum - displayed))}.`,
        ),
        question: ask(`${quote(regle.cible)} affiche ${euros(displayed)}, l'addition fait ${euros(sum)}.`, `La page affiche ${euros(displayed)}, l'addition fait ${euros(sum)}.`, "L'addition ne tombe pas juste."),
      };
    }
    case "filtre": {
      const value = Object.entries(valeurs).find(([name]) => name.endsWith(` de ${first}`))?.[1];
      const why =
        value === undefined
          ? ""
          : regle.condition === "= valeur"
            ? fit(`Elle affiche ${quote(value)} au lieu de ${quote(regle.valeur ?? "")}.`, "")
            : fit(`Sa date, le ${plain(value)}, ${regle.condition === "< aujourd_hui" ? "n'est pas encore passée" : "est après aujourd'hui"}.`, "");
      return {
        resultat: join(
          fit(several > 1 ? `Problème : ${several} lignes ne devraient pas être ici, dont ${first}.` : `Problème : ${first} ne devrait pas être ici.`, "Problème : ce filtre montre trop de lignes."),
          why,
        ),
        question: ask(
          ...(value === undefined ? [] : [`Le filtre ${quote(regle.filtre)} montre ${first} (${normalize(regle.colonne)} : ${plain(value)}).`]),
          `Ce filtre montre ${first}.`,
          "Ce filtre montre une ligne en trop.",
        ),
      };
    }
    case "format":
      return {
        resultat: join(
          fit(several > 1 ? `Problème : ${several} valeurs sont mal écrites, dont ${quote(first)}.` : `Problème : ${quote(first)} est mal écrit.`, "Problème : une valeur est mal écrite."),
          regle.motif === "date-fr" ? "J'attendais une date écrite jour/mois/année." : "J'attendais un montant écrit comme 1 420,00 €.",
        ),
        question: ask(`${quote(regle.colonne)} affiche ${quote(first)}.`, "Une valeur est mal écrite."),
      };
    case "presence":
      return {
        resultat: fit(
          several > 1 ? `Problème : ${quote(regle.colonne)} est vide pour ${several} lignes, dont ${first}.` : `Problème : ${quote(regle.colonne)} est vide pour ${first}.`,
          "Problème : une case est vide.",
        ),
        question: ask(`${quote(regle.colonne)} est vide pour ${first}.`, "Une case est vide."),
      };
    case "etat": {
      const banned = new Set((regle.texte_absent ?? []).map(key));
      const detail = textes_a_surligner.map((item) => (banned.has(key(item)) ? `${quote(item)} s'affiche alors qu'il ne devrait pas` : `${quote(item)} n'apparaît pas`));
      return {
        resultat: fit(`Problème : ${detail.join(" et ")}.`, "Problème : la page n'affiche pas le bon texte."),
        question: ask(`${detail[0] ?? "le texte attendu n'y est pas"}.`, "La page n'affiche pas le bon texte."),
      };
    }
  }
}

// « en haut à droite », by thirds of the page; the middle third has no word of its own.
function where({ x, y, largeur, hauteur }: NonNullable<Constat["zone"]>, page: NonNullable<Constat["page"]>): string {
  const [across, down] = [(x + largeur / 2) / page.largeur, (y + hauteur / 2) / page.hauteur];
  return join(down < 1 / 3 ? "en haut" : down > 2 / 3 && "en bas", across < 1 / 3 ? "à gauche" : across > 2 / 3 && "à droite") || "au milieu";
}

function visual({ statut, nature, zone, zone_avant, page, texte_zone, explique_par }: Constat): Wording {
  if (statut === "INCONCLUSIVE") return { resultat: "Je n'arrive pas à comparer cette page avec l'ancienne. Les deux images n'ont pas la même taille." };
  if (statut === "PASS") return { resultat: "Déjà vu et validé." };
  const subject = texte_zone ? quote(plain(texte_zone)) : "Quelque chose";
  let resultat = texte_zone ? fit(`Quelque chose a changé ici, autour de ${subject}.`, "Quelque chose a changé ici.") : "Quelque chose a changé ici.";
  let question = resultat;
  if (nature === "deplacement") {
    resultat = question = fit(`${subject} a changé de place.`, "Quelque chose a changé de place.");
    const [from, to] = zone && zone_avant && page ? [where(zone_avant, page), where(zone, page)] : [];
    if (zone && zone_avant && to && from !== to) {
      const [dx, dy] = [zone.x - zone_avant.x, zone.y - zone_avant.y];
      const direction = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? "vers le haut" : "vers le bas") : dx < 0 ? "vers la gauche" : "vers la droite";
      question = fit(`${subject} a été déplacé ${direction}, il est maintenant ${to}.`, resultat);
    }
  }
  // A doubt explained by a proven defect is not asked again: the question is the one of the defect.
  return explique_par ? { resultat } : { resultat, question: `${question} Bug ou voulu ?` };
}

export function formuler(constat: Constat): Wording {
  const { regle, statut, valeurs } = constat;
  if (!regle) return visual(constat);
  const annonce = announce(regle);
  if (statut === "PASS") return { annonce, resultat: conforming(regle, valeurs) };
  if (statut === "VERIFIED_FAIL") return { annonce, ...broken(regle, constat) };
  // The reason, without the identifiers of the screens.
  const screens = regle.type === "egalite" ? [regle.a.ecran, regle.b.ecran] : [regle.ecran];
  const reason = screens.reduce((text, ecran) => text.replaceAll(` sur ${ecran}`, ""), constat.raison ?? "");
  // An « etat » rule that found no expected text does not say « unreadable »: the state may never have been reached.
  if (regle.type === "etat") return { annonce, resultat: reason ? fit(`${reason[0].toUpperCase()}${reason.slice(1)}.`, "L'état attendu n'a pas été atteint.") : "L'état attendu n'a pas été atteint." };
  return { annonce, resultat: join("Je n'arrive pas à lire cette valeur.", reason && fit(`${reason[0].toUpperCase()}${reason.slice(1)}.`, "")) };
}
