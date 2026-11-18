// The report of a passage in the vault, completed after the human has decided (issue #71, point 2): the runner writes
// <vault>/<logiciel>/passages/<id>.md at the end of the H session, before any choice. The scene then adds what only it
// knows: the tests replayed and set aside, each defect and doubt with its capture ringed, the decision of the human,
// and the PR. « L'agent réécrit dans Obsidian où sont les erreurs. »
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const MARK = "\n## Après le passage\n";
const COLORS = { defaut: [229, 72, 77], doute: [232, 163, 61] };

// The capture with a frame of 4 px around each zone (pixels of the capture), 8 px off it, in the colour of its kind.
export function ringed(png, zones, genre) {
  const image = PNG.sync.read(Buffer.from(png));
  const [r, g, b] = COLORS[genre] ?? COLORS.defaut;
  const paint = (x, y) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const i = (y * image.width + x) * 4;
    image.data[i] = r;
    image.data[i + 1] = g;
    image.data[i + 2] = b;
    image.data[i + 3] = 255;
  };
  for (const zone of zones) {
    const [left, top] = [Math.round(zone.x) - 8, Math.round(zone.y) - 8];
    const [right, bottom] = [Math.round(zone.x + zone.largeur) + 8, Math.round(zone.y + zone.hauteur) + 8];
    for (let t = 0; t < 4; t++) {
      for (let x = left - t; x <= right + t; x++) {
        paint(x, top - t);
        paint(x, bottom + t);
      }
      for (let y = top - t; y <= bottom + t; y++) {
        paint(left - t, y);
        paint(right + t, y);
      }
    }
  }
  return PNG.sync.write(image);
}

// vault, logiciel, passage: where the note is. tests: { titre, lignes }: what was played and set aside. items: the findings shown
// at the end ({ id, genre, texte, png, zones, textes }). decisions: [{ fichier, decision }] as written in the vault.
// pr: links ({ label, url }). Returns the path of the note, relative to the vault; null when the runner wrote none.
// Written again on a second call: the section is replaced, the runner's part is kept.
export function completerNote({ vault, logiciel, passage, tests, items, decisions, pr = [] }) {
  const chemin = `${logiciel}/passages/${passage}.md`;
  const file = join(vault, chemin);
  if (!existsSync(file)) return null;
  const before = readFileSync(file, "utf8").split(MARK)[0].trimEnd();
  const folder = join(vault, logiciel, "passages", passage);
  if (items.length) mkdirSync(folder, { recursive: true });
  const kind = { defaut: "défaut prouvé", doute: "doute" };
  const lines = [MARK.trim(), "", "Écrit par la scène après les choix de l'humain.", "", `### ${tests.titre}`, "", ...tests.lignes.map((line) => `- ${line}`), "", "### Défauts et doutes", ""];
  if (!items.length) lines.push("Aucun défaut prouvé, aucun doute à trancher.", "");
  for (const [index, item] of items.entries()) {
    const image = `${item.id}.png`;
    writeFileSync(join(folder, image), ringed(item.png, item.zones, item.genre));
    const found = decisions.find(({ decision }) => decision.ecart_id === item.id);
    const correction = found?.decision.correction_de_note;
    lines.push(`#### ${index + 1}. ${kind[item.genre]} : ${item.id}`, "", ...(item.textes.length ? item.textes : [item.texte]).flatMap((text) => [text, ""]),
      `![${item.id}](${passage}/${image})`, "",
      found
        ? `Décision : **${found.decision.decision}**, par ${found.decision.par}, le ${found.decision.le.slice(0, 10)} : [${found.fichier.split("/").pop()}](../${found.fichier.split("/").slice(1).join("/")})${correction ? `. Correction de la note ${correction.fichier} : ${correction.statut}` : ""}.`
        : "Décision : pas tranchée.", "");
  }
  lines.push("### PR", "", ...(pr.length ? pr.map(({ label, url }) => `- ${label} : ${url}`) : ["- Aucune."]), "");
  writeFileSync(file, `${before}\n${lines.join("\n")}`);
  return chemin;
}
