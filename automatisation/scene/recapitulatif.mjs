// The end of a course, shared by parcours.mjs (development mode) and exploration.mjs (public mode): the summary in a
// panel of the layer (all the text of the course, each defect and doubt with its capture ringed), then each one in
// turn, in large, and a human says « bug » or « voulu ».
import { sleep } from "./scene.mjs";

// A PNG as an address the page can show (a file address does not load in the tested page).
export const dataUrl = (png) => `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
// Width and height of a PNG, read in its header.
export const sizeOf = (png) => ({ largeur: Buffer.from(png).readUInt32BE(16), hauteur: Buffer.from(png).readUInt32BE(20) });

// mascot: (command, ...args) => layer call. recap: { titre, lignes, selection }. items: { id, genre ("defaut" or
// "doute"), etat (of the mascot), texte (one line in the summary), image, zones, page, textes, question }. choix: the
// answers of --choix, in order. answer(): a promise of the next { id, choix } the layer reports. Returns, per item, the
// choice made.
export async function revoir({ mascot, recap, items, choix = [], presentation, witness, say }, answer) {
  await mascot("recap", { ...recap, items: items.map(({ id, genre, texte, image, zones, page }) => ({ id, genre, texte, image, zones, page })) });
  await witness("recapitulatif");
  const made = [];
  if (!items.length) return made;
  // Time to read the summary: 4 s, plus 1,5 s per finding.
  if (presentation) await sleep(4000 + 1500 * items.length);
  for (const [index, item] of items.entries()) {
    const rang = `${index + 1} sur ${items.length}`;
    const response = answer();
    await mascot("examen", { id: item.id, rang, genre: item.genre, etat: item.etat, image: item.image, zones: item.zones, page: item.page, textes: item.textes, question: item.question });
    await witness(`examen-${index + 1}`);
    // --choix answers by itself, after the time it takes to read: 2,5 s plus 50 ms per character.
    const words = [...item.textes, item.question].join(" ");
    if (choix[index]) sleep(presentation ? 2500 + 50 * words.length : 0).then(() => mascot("choisir", choix[index])).catch(() => {});
    const { choix: chosen } = await response;
    say(`Question ${rang} : ${item.question} Réponse : ${chosen}${choix[index] ? " (--choix)" : ""}.`);
    made.push({ item, choix: chosen });
    if (presentation) await sleep(900);
    await witness(`reponse-${index + 1}`);
  }
  await mascot("panneau");
  return made;
}
