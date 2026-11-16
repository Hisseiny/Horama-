import type { Regle } from "@horama/contrats";
import type { Constat } from "./index.ts";
import { key, normalize, plainCents, readCents, readDate, showCents } from "./values.ts";
import type { ScreenValues } from "./values.ts";

const UNREADABLE = "unreadable";
const MONTANT_FR = /^-?\d{1,3}( \d{3})*,\d{2} €$/;

// A value that is missing or cannot be read is never made up: the rule ends INCONCLUSIVE with this reason.
function unreadable(raison: string): never {
  throw new Error(raison, { cause: UNREADABLE });
}

interface Item {
  name: string; // « CA du mois », « Montant TTC de F-119 »
  text: string; // as displayed
  row?: string; // first cell of its row, as displayed
  mark?: string; // text to highlight when it is not `text`
}

// Conventions of the vault, in this order: total row, number of rows, « <Colonne> de <Numéro> », labelled value, table column.
function resolve(ecran: string, values: ScreenValues, name: string, kind: "champ" | "colonne"): Item[] {
  const wanted = key(name);
  const column = (header: string) => {
    for (const table of values.tables) {
      const index = table.headers.findIndex((candidate) => key(candidate) === key(header));
      if (index !== -1) return { table, index };
    }
  };
  if (wanted === "total" || wanted === "total ttc") {
    const text = values.tables.find((table) => table.total)?.total!.slice(1).filter(Boolean).at(-1);
    if (text) return [{ name, text }];
  }
  if (wanted === "nombre de factures") {
    const table = values.tables[0] ?? unreadable(`tableau introuvable sur ${ecran}`);
    const { count } = values;
    if (count && count.value !== table.rows.length) {
      unreadable(`nombre de factures illisible sur ${ecran} : ${table.rows.length} ligne(s) au tableau, compteur affiché « ${count.text} »`);
    }
    return [{ name, text: String(table.rows.length), mark: count?.text }];
  }
  const cell = /^(.+) de (\S+)$/.exec(normalize(name));
  const found = cell && column(cell[1]);
  if (cell && found) {
    const row = found.table.rows.find((candidate) => key(candidate[0]) === key(cell[2])) ?? unreadable(`ligne ${cell[2]} introuvable sur ${ecran}`);
    return [{ name, text: row[found.index], row: row[0] }];
  }
  const label = Object.keys(values.labelled).find((candidate) => key(candidate) === wanted);
  if (label !== undefined) return [{ name, text: values.labelled[label] }];
  const whole = column(name);
  if (whole) {
    const header = normalize(whole.table.headers[whole.index]);
    return whole.table.rows.map((row) => ({ name: `${header} de ${normalize(row[0])}`, text: row[whole.index], row: row[0] }));
  }
  return unreadable(`${kind} ${name} introuvable sur ${ecran}`);
}

interface Verdict {
  ok: boolean;
  calcul: string;
  description: string;
  marks: string[]; // texts to highlight when the rule is broken
}

function judge(regle: Regle, screens: Map<string, ScreenValues>, valeurs: Record<string, string>, current: string): Verdict {
  const column = (ecran: string, name: string) => resolve(ecran, screens.get(ecran)!, name, "colonne");
  const field = (ecran: string, name: string) => {
    const items = resolve(ecran, screens.get(ecran)!, name, "champ");
    return items.length === 1 ? items[0] : unreadable(`${name} désigne ${items.length} valeurs sur ${ecran}, une seule attendue`);
  };
  const shown = (ecran: string, item: Item) => `sur ${ecran} : ${item.name} affiche « ${normalize(item.text)} »`;
  // Each value read is recorded in `valeurs`, even when the rule ends INCONCLUSIVE further on.
  const text = (ecran: string, item: Item) => (valeurs[`${ecran}.${item.name}`] = normalize(item.text));
  const amount = (ecran: string, item: Item) => {
    const cents = readCents(item.text) ?? unreadable(`montant illisible ${shown(ecran, item)}`);
    valeurs[`${ecran}.${item.name}`] = plainCents(cents);
    return cents;
  };
  const today = (ecran: string) => {
    const date = screens.get(ecran)!.today ?? unreadable(`date du jour introuvable sur ${ecran}`);
    valeurs[`${ecran}.Aujourd'hui`] = normalize(date);
    return { date: normalize(date), day: readDate(date) ?? unreadable(`date du jour illisible sur ${ecran} : « ${normalize(date)} »`) };
  };
  const highlight = (item: Item) => item.mark ?? item.text;

  switch (regle.type) {
    case "somme": {
      const { ecran, colonne, cible } = regle;
      const amounts = column(ecran, colonne).map((item) => amount(ecran, item));
      const target = field(ecran, cible);
      const displayed = amount(ecran, target);
      const sum = amounts.reduce((total, cents) => total + cents, 0);
      const ok = sum === displayed;
      return {
        ok,
        calcul: `${amounts.map(showCents).join(" + ")} = ${showCents(sum)}${ok ? "" : `, affiché ${showCents(displayed)}`}`,
        description: ok ? `« ${cible} » est bien la somme de « ${colonne} ».` : `La somme de « ${colonne} » fait ${showCents(sum)}, mais « ${cible} » affiche ${showCents(displayed)}.`,
        marks: [highlight(target)],
      };
    }
    case "egalite": {
      const sides = [regle.a, regle.b].map(({ ecran, champ }) => ({ ecran, champ, item: field(ecran, champ) }));
      const cents = sides.map(({ item }) => readCents(item.text));
      // Amounts are compared in cents (an amount facing a text that is not one is unreadable), anything else as normalized text.
      const [a, b] = cents.some((value) => value !== null)
        ? sides.map(({ ecran, item }) => showCents(amount(ecran, item)))
        : sides.map(({ ecran, item }) => text(ecran, item) || unreadable(`valeur vide ${shown(ecran, item)}`));
      const ok = a === b;
      const gap = ok || cents[0] === null ? "" : `, écart ${showCents(Math.abs(cents[0] - cents[1]!))}`;
      return {
        ok,
        calcul: `${a} ${ok ? "=" : "≠"} ${b}${gap}`,
        description: ok
          ? `« ${sides[0].champ} » et « ${sides[1].champ} » sont égaux : ${a}.`
          : `« ${sides[0].champ} » affiche ${a}, mais « ${sides[1].champ} » affiche ${b}.`,
        marks: sides.filter(({ ecran }) => ecran === current).map(({ item }) => highlight(item)),
      };
    }
    case "filtre": {
      const { ecran, filtre, colonne, condition } = regle;
      const items = column(ecran, colonne);
      let expected: string;
      let bad: Item[];
      if (condition === "= valeur") {
        const valeur = normalize(regle.valeur ?? "");
        expected = `« ${valeur} »`;
        bad = items.filter((item) => text(ecran, item) !== valeur);
      } else {
        const { date, day } = today(ecran);
        expected = `${condition === "< aujourd_hui" ? "avant le" : "au plus tard le"} ${date}`;
        bad = items.filter((item) => {
          const due = readDate(text(ecran, item)) ?? unreadable(`date illisible ${shown(ecran, item)}`);
          return condition === "< aujourd_hui" ? due >= day : due > day;
        });
      }
      const ok = !bad.length;
      const rows = bad.map((item) => normalize(item.row ?? item.name)).join(", ");
      return {
        ok,
        calcul: ok ? `${colonne} ${expected} sur chaque ligne (${items.length})` : bad.map((item) => `${item.name} : ${normalize(item.text)}, attendu ${expected}`).join(" ; "),
        description: ok
          ? `Avec le filtre « ${filtre} », chaque ligne affichée est conforme.`
          : `Avec le filtre « ${filtre} », ${bad.length > 1 ? "des lignes ne devraient pas être affichées" : "une ligne ne devrait pas être affichée"} : ${rows}.`,
        marks: bad.map((item) => item.row ?? item.text),
      };
    }
    case "format": {
      const { ecran, colonne, motif } = regle;
      // An empty cell is the business of the rule « presence ».
      const items = column(ecran, colonne).filter((item) => text(ecran, item));
      let shape = "1 420,00 €";
      let conforms = (value: string) => MONTANT_FR.test(value);
      if (motif === "date-fr") {
        const thisYear = Math.floor(today(ecran).day / 10000);
        shape = `JJ/MM/AAAA, année de 2020 à ${thisYear}`;
        conforms = (value) => {
          const year = Math.floor((readDate(value) ?? 0) / 10000);
          return year >= 2020 && year <= thisYear;
        };
      }
      const bad = items.filter((item) => !conforms(normalize(item.text)));
      const ok = !bad.length;
      return {
        ok,
        calcul: ok
          ? `valeurs au format ${shape} : ${items.length} sur ${items.length}`
          : bad.map((item) => `${item.name} : « ${normalize(item.text)} », attendu ${shape}`).join(" ; "),
        description: ok
          ? `« ${colonne} » est au bon format.`
          : `« ${colonne} » n'est pas au format ${shape} : ${bad.map((item) => normalize(item.text)).join(", ")}.`,
        marks: bad.map(highlight),
      };
    }
    case "presence": {
      const { ecran, colonne } = regle;
      const items = column(ecran, colonne);
      const bad = items.filter((item) => !text(ecran, item));
      const ok = !bad.length;
      return {
        ok,
        calcul: `cases remplies : ${items.length - bad.length} sur ${items.length}${ok ? "" : `, vide : ${bad.map((item) => item.name).join(", ")}`}`,
        description: ok
          ? `« ${colonne} » est remplie sur chaque ligne.`
          : `« ${colonne} » est vide pour ${bad.map((item) => normalize(item.row ?? item.name)).join(", ")}.`,
        marks: bad.map((item) => item.row ?? item.name),
      };
    }
  }
}

// `screens` gives, for each screen of the rule, the values of the capture to read; `current` is the screen just captured.
export function checkRule(regle: Regle, screens: Map<string, ScreenValues>, current: string): Constat {
  const valeurs: Record<string, string> = {};
  try {
    const { ok, marks, ...said } = judge(regle, screens, valeurs, current);
    return { genre: "regle", statut: ok ? "PASS" : "VERIFIED_FAIL", regle, valeurs, ...said, textes_a_surligner: ok ? [] : marks };
  } catch (error) {
    if (!(error instanceof Error) || error.cause !== UNREADABLE) throw error;
    return {
      genre: "regle",
      statut: "INCONCLUSIVE",
      regle,
      valeurs,
      description: `Je n'ai pas pu vérifier : ${error.message}.`,
      textes_a_surligner: [],
      raison: error.message,
    };
  }
}
