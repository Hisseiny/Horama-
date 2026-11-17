// J3 control: each capture of a run (<ecran>--<vue>.png) is compared pixel by pixel to the reference of the same view
// in the vault, and every differing pixel must fall inside the zones of the changes that the tested version carries
// (faux-saas/verite.json entries whose `defaut_v<version>` is true, rectangles `avant` and `apres` of
// faux-saas/positions.json, same `id` : a moved element differs at both ends, both are excluded). A pixel differs when
// any of its four RGBA channels differs, no tolerance (same byte read as sonde-t7.mjs compare()).
//
// Usage: node automatisation/scene/controle-captures.mjs --releves <dir> [--vault <dir>] [--logiciel facturo]
//          [--version 13] [--reference 12] [--rapport <file.md>]
// Exit: 0 every compared capture has the size of its reference and 0 differing pixel outside the expected zones,
//       1 otherwise, 2 a needed file or directory is missing.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { option } from "./scene.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const value = (name) => {
  const v = option(name, null);
  return v === null || String(v).startsWith("--") ? null : v;
};
const RELEVES = value("releves") && resolve(value("releves"));
const VAULT = resolve(value("vault") ?? join(ROOT, "vault-horama"));
const LOGICIEL = value("logiciel") ?? "facturo";
const VERSION = value("version") ?? "13";
const REFERENCE = value("reference") ?? "12";
const REPORT = value("rapport") && resolve(value("rapport"));
const TRUTH = join(ROOT, "faux-saas", "verite.json");
const POSITIONS = join(ROOT, "faux-saas", "positions.json");

const missing = [];
if (!RELEVES) missing.push("option --releves <dossier> absente");
else if (!existsSync(RELEVES)) missing.push(`dossier de relevés introuvable : ${RELEVES}`);
if (!existsSync(VAULT)) missing.push(`vault introuvable : ${VAULT}`);
if (!existsSync(TRUTH)) missing.push(`fichier introuvable : ${TRUTH}`);
if (!existsSync(POSITIONS)) missing.push(`fichier introuvable : ${POSITIONS}`);
if (missing.length) {
  for (const line of missing) console.error(line);
  process.exit(2);
}

const truth = JSON.parse(readFileSync(TRUTH, "utf8"));
const positions = new Map(JSON.parse(readFileSync(POSITIONS, "utf8")).map((entry) => [entry.id, entry]));

// The changes a capture of version --version is expected to carry against the reference, as pixel zones to exclude.
const expectedFor = (ecran, vue) =>
  truth
    .filter((change) => change.ecran === ecran && change.vue === vue && change[`defaut_v${VERSION}`] === true)
    .map((change) => {
      const entry = positions.get(change.id);
      if (!entry) console.error(`avertissement : pas de rectangle dans positions.json pour ${change.id}`);
      return { id: change.id, rects: [entry?.avant, entry?.apres].filter(Boolean) };
    });
const inside = (rect, x, y) => x >= rect.x && x < rect.x + rect.largeur && y >= rect.y && y < rect.y + rect.hauteur;

const rows = [];
for (const file of readdirSync(RELEVES).filter((file) => file.endsWith(".png")).sort()) {
  const name = basename(file, ".png");
  const sep = name.indexOf("--");
  if (sep === -1) {
    console.error(`ignoré, pas de « -- » dans le nom : ${file}`);
    continue;
  }
  const [ecran, vue] = [name.slice(0, sep), name.slice(sep + 2)];
  const shot = PNG.sync.read(readFileSync(join(RELEVES, file)));
  const row = { ecran, vue, taille: `${shot.width} × ${shot.height}`, zones: expectedFor(ecran, vue) };
  const referenceFile = join(VAULT, LOGICIEL, "references", ecran, `${vue}--v${REFERENCE}.png`);
  if (!existsSync(referenceFile)) {
    row.etat = "sans référence";
    rows.push(row);
    continue;
  }
  const reference = PNG.sync.read(readFileSync(referenceFile));
  row.taille_reference = `${reference.width} × ${reference.height}`;
  if (shot.width !== reference.width || shot.height !== reference.height) {
    row.etat = "tailles différentes";
    rows.push(row);
    continue;
  }
  const par_changement = new Map(row.zones.map((zone) => [zone.id, 0]));
  let total = 0;
  let attendus = 0;
  let hors_zones = 0;
  let boite = null;
  for (let y = 0; y < shot.height; y++) {
    for (let x = 0; x < shot.width; x++) {
      const i = (y * shot.width + x) * 4;
      if (shot.data.readUInt32LE(i) === reference.data.readUInt32LE(i)) continue;
      total++;
      let exclude = false;
      for (const zone of row.zones) {
        if (zone.rects.some((rect) => inside(rect, x, y))) {
          par_changement.set(zone.id, par_changement.get(zone.id) + 1);
          exclude = true;
        }
      }
      if (exclude) attendus++;
      else {
        hors_zones++;
        boite = boite
          ? { x: Math.min(boite.x, x), y: Math.min(boite.y, y), droite: Math.max(boite.droite, x), bas: Math.max(boite.bas, y) }
          : { x, y, droite: x, bas: y };
      }
    }
  }
  Object.assign(row, { total, attendus, par_changement, hors_zones, boite, etat: hors_zones === 0 ? "ok" : "pixels hors zones" });
  rows.push(row);
}

const box = (boite) => (boite ? `x ${boite.x}, y ${boite.y}, largeur ${boite.droite - boite.x + 1}, hauteur ${boite.bas - boite.y + 1}` : "");
const cellZones = (row) =>
  row.total === undefined
    ? ""
    : `${row.attendus} ${row.par_changement.size ? `(${[...row.par_changement].map(([id, n]) => `${id} : ${n}`).join(" ; ")})` : "(aucune attendue)"}`;
const ecrans = [...new Set(rows.map((row) => row.ecran))];
const table = (ecran) => [
  `## ${ecran}`,
  "",
  "| Vue | Taille du relevé | Taille de la référence | Pixels différents | Dans les zones attendues | Hors zones | Boîte englobante hors zones |",
  "|---|---|---|---|---|---|---|",
  ...rows
    .filter((row) => row.ecran === ecran)
    .map((row) =>
      row.etat === "sans référence"
        ? `| ${row.vue} | ${row.taille} | sans référence |  |  |  |  |`
        : row.etat === "tailles différentes"
          ? `| ${row.vue} | ${row.taille} | ${row.taille_reference} | non comparé |  |  |  |`
          : `| ${row.vue} | ${row.taille} | ${row.taille_reference} | ${row.total} | ${cellZones(row)} | ${row.hors_zones} | ${box(row.boite)} |`
    ),
  "",
];

const compared = rows.filter((row) => row.total !== undefined);
const withoutRef = rows.filter((row) => row.etat === "sans référence");
const failed = rows.filter((row) => row.etat === "tailles différentes" || row.etat === "pixels hors zones");
const exit = rows.length === 0 ? 1 : failed.length ? 1 : 0;
const verdict = failed.length
  ? `Échec : ${failed.map((row) => `${row.ecran}--${row.vue} (${row.etat}${row.hors_zones ? `, ${row.hors_zones} pixel(s) hors zones, boîte ${box(row.boite)}` : ""})`).join(" ; ")}.`
  : compared.length
    ? `Toutes les ${compared.length} images comparées ont la taille de leur référence et 0 pixel différent hors des zones attendues.`
    : "Aucune image n'a pu être comparée.";

const lines = [
  `# J3 : contrôle chiffré des captures v${VERSION} contre les références v${REFERENCE}`,
  "",
  "Rapport écrit par `automatisation/scene/controle-captures.mjs`. Aucun chiffre n'est saisi à la main.",
  "",
  `- Date : ${new Date().toLocaleString("fr-FR")} (${new Date().toISOString()})`,
  `- Commande : \`${["node", ...process.execArgv, relative(process.cwd(), process.argv[1]), ...process.argv.slice(2)].join(" ")}\``,
  `- Relevés : \`${relative(process.cwd(), RELEVES) || "."}\` (${rows.length} capture(s) .png)`,
  `- Références : \`${relative(process.cwd(), join(VAULT, LOGICIEL, "references"))}/<ecran>/<vue>--v${REFERENCE}.png\``,
  `- Zones attendues : changements de \`faux-saas/verite.json\` avec \`defaut_v${VERSION}: true\`, rectangles \`avant\` et \`apres\` de \`faux-saas/positions.json\`, tous deux exclus. Le détail par changement compte un pixel dans chaque zone qui le contient.`,
  "- Un pixel diffère si un de ses quatre canaux RGBA diffère, sans tolérance.",
  "",
  `${rows.length} capture(s) relevée(s), ${compared.length} comparée(s), ${withoutRef.length} sans référence v${REFERENCE}.`,
  "",
  ...ecrans.flatMap(table),
  "## Verdict",
  "",
  `${verdict} Sortie : ${exit}.`,
  "",
];
const output = lines.join("\n");
console.log(output);
if (REPORT) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, output);
}
process.exit(exit);
