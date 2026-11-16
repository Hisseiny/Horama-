import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HEIGHT, VIEWS, WIDTH, arg, diff, openBrowser, visit } from "./browser.mjs";

const out = arg("sortie");
if (!out) {
  console.error("Usage : node scripts/captures.mjs --sortie <dossier> [--base <url>]");
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const browser = await openBrowser();
const files = new Set();
let failed = false;
for (const version of ["12", "13"]) {
  for (const view of VIEWS) {
    if (view.vue === "filtre-echeance" && version === "12") continue;
    const first = await visit(browser, version, view.path);
    const second = await visit(browser, version, view.path);
    const { pixels } = diff(first.image, second.image);
    const file = `${view.ecran}--${view.vue}--v${version}.png`;
    writeFileSync(join(out, file), first.buffer);
    files.add(file);
    const scrolls = first.scrollWidth > WIDTH || first.scrollHeight > HEIGHT;
    if (pixels !== 0 || scrolls) failed = true;
    console.log(
      `${file} : ${pixels} pixel(s) différent(s) entre les deux visites, largeur de défilement ${first.scrollWidth}, hauteur de défilement ${first.scrollHeight}${scrolls ? " (la page défile)" : ""}`,
    );
  }
}
await browser.close();

const cell = (file) =>
  files.has(file) ? `<td><img src="${file}" width="620" alt="${file}"></td>` : "<td>Pas de capture : ce filtre n'existe pas en version 12.</td>";
const rows = VIEWS.map(
  (view) =>
    `<tr><th>${view.ecran}<br>vue ${view.vue}</th>${cell(`${view.ecran}--${view.vue}--v12.png`)}${cell(`${view.ecran}--${view.vue}--v13.png`)}</tr>`,
).join("\n");
writeFileSync(
  join(out, "index.html"),
  `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<title>Facturo : captures des versions 12 et 13</title>
<style>
body { font: 14px/20px Arial, sans-serif; margin: 24px; }
th, td { padding: 8px; text-align: left; vertical-align: top; }
img { display: block; border: 1px solid #b8c1cc; }
</style>
<h1>Facturo : captures des versions 12 et 13</h1>
<p>Fenêtre de ${WIDTH} × ${HEIGHT}, changements par défaut de chaque version, détail de la facture F-119.</p>
<table>
<tr><th>Écran</th><th>Version 12</th><th>Version 13</th></tr>
${rows}
</table>
</html>
`,
);

console.log(`${files.size} captures et la planche index.html écrites dans ${out}`);
if (failed) {
  console.error("ÉCART : deux visites diffèrent ou une page défile.");
  process.exit(1);
}
