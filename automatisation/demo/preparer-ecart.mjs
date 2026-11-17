// Rehearsal only: a copy of the vault in which the Bachelor page of Eugenia differs from the live site, since the live
// site cannot be changed. As in the demo, a button label changes: in the copy, the note says the button of the top of
// the page reads « POSTULER → » (the label before the change), and the v1 reference of the Bachelor has that button
// painted grey (x 48 to 213, y 788 to 849) so that it differs from the live page. The live site, which reads
// « CANDIDATER → », then shows a visual doubt around that button. Nothing is written in the repository vault.
//
// Usage: node automatisation/demo/preparer-ecart.mjs <destination>
// Exit: 0, or 2 when the destination already exists or is missing.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { PNG } = createRequire(new URL("../scene/package.json", import.meta.url))("pngjs");
const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const dest = process.argv[2] && resolve(process.argv[2]);
if (!dest || existsSync(dest)) {
  console.error("Usage : preparer-ecart.mjs <destination absente>");
  process.exit(2);
}
cpSync(join(ROOT, "vault-horama"), dest, { recursive: true });

const reference = join(dest, "eugenia/references/bachelor/defaut--v1.png");
const png = PNG.sync.read(readFileSync(reference));
for (let y = 788; y <= 849; y++) {
  for (let x = 48; x <= 213; x++) png.data.set([150, 150, 150, 255], (y * png.width + x) * 4);
}
writeFileSync(reference, PNG.sync.write(png));

const note = join(dest, "eugenia/produit/bachelor.md");
writeFileSync(
  note,
  readFileSync(note, "utf8").replace(
    /<!-- À écrire par Axil et Noé.*-->/,
    "Page du Bachelor IA Applied to Business. En haut de page, le bouton « POSTULER → » est à côté de « TÉLÉCHARGER LA BROCHURE ».",
  ),
);
console.log(`Copie du vault prête : ${dest} (référence du Bachelor repeinte, note du bouton « POSTULER → »).`);
