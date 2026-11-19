// The end of a course, shared by parcours.mjs (development mode) and exploration.mjs (public mode): the summary in a
// panel of the layer (all the text of the course, each defect and doubt with its capture ringed), then each one in
// turn, in large, and a human says « bug » or « voulu ».
import { sleep } from "./scene.mjs";

// A PNG as an address the page can show (a file address does not load in the tested page).
export const dataUrl = (png) => `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
// Width and height of a PNG, read in its header.
export const sizeOf = (png) => ({ largeur: Buffer.from(png).readUInt32BE(16), hauteur: Buffer.from(png).readUInt32BE(20) });

// What an exploration (horama-exploration-1) could not do, for the summary: with no page visited (a site that blocks
// robots, an address not found, a login asked: PR #117), the reason of the run, said instead of an empty list and
// « 0 défaut »; otherwise each page not visited with its reason (pages[].raison, else the INCONCLUSIVE finding of the
// page). Returns { aucune, phrase, nonVisitees: [{ chemin, raison }] }; phrase only when aucune.
export function bilanExploration(report) {
  const pathOf = (url) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };
  const reasonOf = (page) => page.raison ?? report.constats?.find((constat) => constat.ecran === page.ecran && constat.raison)?.raison ?? null;
  const nonVisitees = report.pages.filter((page) => page.etat === "non_visitee").map((page) => ({ chemin: pathOf(page.url), raison: reasonOf(page) }));
  if (report.etat === "en_cours" || report.totaux.pages_visitees > 0) return { aucune: false, nonVisitees };
  const raison = (report.agents?.find((agent) => agent.raison)?.raison ?? nonVisitees.find((page) => page.raison)?.raison ?? "").trim().replace(/\.+$/, "");
  const phrase = raison ? `Horama n'a pas pu visiter ce site : ${raison.charAt(0).toLowerCase()}${raison.slice(1)}.` : "Horama n'a pas pu visiter ce site.";
  return { aucune: true, phrase, nonVisitees };
}

// A finding a human already said « voulu » for, on an earlier course of the same site: same page, same description,
// zones that overlap (or no zone on one side). The engine applies the decisions to the image comparison only; this
// keeps a defect of a check or a doubt of Holo, once accepted, from being asked again. decisions: lireDecisions.
export function dejaVoulu(constat, decisions) {
  const overlap = (a, b) => !a || !b || (a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur && b.y < a.y + a.hauteur);
  return decisions.find((decision) => decision.decision === "voulu" && decision.ecran === constat.ecran && decision.ecart === constat.description && overlap(decision.zone, constat.zone)) ?? null;
}

// mascot: (command, ...args) => layer call. recap: { titre, site, chiffres, lignes, selection } (see recap in
// couche-horama.js). items: { id, genre ("defaut" or "doute"), etat (of the mascot), texte (one line in the summary),
// mesure (its measure in the summary, or nothing), png (the capture), zones, page, textes, question }. choix: the
// answers of --choix, in order; a question without one waits for a real click. repeter (--repeter-choix, filmed
// exploration on a temporary vault only, S9): the answers are taken again from the start, so that a filmed passage shows
// the whole end without knowing in advance how many questions it will ask. answer(): a promise of the next { id, choix } the layer reports. Returns, per item, the
// choice made.
export async function revoir({ mascot, recap, items, choix = [], repeter = false, presentation, witness, say }, answer) {
  await mascot("recap", { ...recap, items: items.map(({ id, genre, texte, mesure }) => ({ id, genre, texte, mesure })) });
  await witness("recapitulatif");
  const made = [];
  if (!items.length) return made;
  // Time to read the summary: 4 s, plus 1,5 s per finding.
  if (presentation) await sleep(4000 + 1500 * items.length);
  for (const [index, item] of items.entries()) {
    const rang = `${index + 1} sur ${items.length}`;
    const response = answer();
    await mascot("examen", { id: item.id, rang, genre: item.genre, etat: item.etat, image: dataUrl(item.png), zones: item.zones, page: item.page, textes: item.textes, question: item.question });
    await witness(`examen-${index + 1}`);
    // --choix answers by itself, after the time it takes to read: 2,5 s plus 50 ms per character.
    const words = [...item.textes, item.question].join(" ");
    const auto = choix[index] ?? (repeter && choix.length ? choix[index % choix.length] : null);
    if (auto) sleep(presentation ? 2500 + 50 * words.length : 0).then(() => mascot("choisir", auto)).catch(() => {});
    const { choix: chosen } = await response;
    say(`Question ${rang} : ${item.question} Réponse : ${chosen}${auto ? " (--choix)" : ""}.`);
    made.push({ item, choix: chosen });
    if (presentation) await sleep(900);
    await witness(`reponse-${index + 1}`);
  }
  await mascot("panneau");
  return made;
}
