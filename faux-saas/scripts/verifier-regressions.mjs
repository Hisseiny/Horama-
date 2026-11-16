import { writeFileSync } from "node:fs";
import { CHANGES } from "../regressions.ts";
import { BASE, HEIGHT, VIEWS, WIDTH, diff, openBrowser, visit } from "./browser.mjs";

const TOTAL = 3 + CHANGES.length * 4 + CHANGES.filter((change) => change.texte_avant !== undefined).length + 6;
let passed = 0;

function check(label, ok) {
  console.log(`${ok ? "ok   " : "ÉCART"} ${label}`);
  if (!ok) {
    console.error(`${passed} contrôles passés sur ${TOTAL}, arrêt au premier écart.`);
    process.exit(1);
  }
  passed++;
}

const browser = await openBrowser();
const DEFAULT_VIEWS = VIEWS.filter((view) => view.vue === "defaut");
const [dashboard, list, , filtered] = VIEWS;

const before = new Map();
for (const view of VIEWS) before.set(view, await visit(browser, "13", view.path, "aucun"));

for (const view of DEFAULT_VIEWS) {
  const v12 = await visit(browser, "12", view.path);
  check(`v13 r=aucun identique à la v12 : ${view.ecran}`, diff(v12.image, before.get(view).image).pixels === 0);
}

const positions = [];
for (const change of CHANGES) {
  const touched = VIEWS.find((view) => view.ecran === change.ecran && view.vue === change.vue);
  const after = await visit(browser, "13", touched.path, change.id);
  const { pixels, boite } = diff(before.get(touched).image, after.image);
  check(`${change.id} : ${change.ecran} (${change.vue}) diffère, ${pixels} pixels`, pixels > 0);
  check(`${change.id} : pas de défilement`, after.scrollWidth <= WIDTH && after.scrollHeight <= HEIGHT);
  for (const view of DEFAULT_VIEWS.filter((candidate) => candidate.ecran !== change.ecran)) {
    const other = await visit(browser, "13", view.path, change.id);
    check(`${change.id} : ${view.ecran} inchangé`, diff(before.get(view).image, other.image).pixels === 0);
  }
  const zoneBefore = before.get(touched).zones[change.zone];
  const zoneAfter = after.zones[change.zone];
  if (change.texte_avant !== undefined) {
    check(
      `${change.id} : texte de la zone ${change.zone}, « ${change.texte_avant} » puis « ${change.texte_apres} »`,
      zoneBefore?.texte === change.texte_avant && zoneAfter?.texte === change.texte_apres,
    );
  }
  positions.push({
    id: change.id,
    ecran: change.ecran,
    vue: change.vue,
    zone: change.zone,
    avant: zoneBefore?.boite ?? null,
    apres: zoneAfter?.boite ?? null,
    pixels_differents: pixels,
    boite_pixels: boite,
  });
}

const byId = (id) => CHANGES.find((change) => change.id === id);
const boxAfter = (id) => JSON.stringify(positions.find((position) => position.id === id).apres);
const r = "defaut,total-liste";
const dashboardMixed = await visit(browser, "13", dashboard.path, r);
check(`r=${r} : ca-mois actif`, dashboardMixed.zones["valeur-ca-mois"].texte === byId("ca-mois").texte_apres);
const listMixed = await visit(browser, "13", list.path, r);
check(`r=${r} : total-liste actif`, listMixed.zones["total-liste"].texte === byId("total-liste").texte_apres);
check(`r=${r} : export-haut actif`, JSON.stringify(listMixed.zones["bouton-exporter"].boite) === boxAfter("export-haut"));
const filteredMixed = await visit(browser, "13", filtered.path, r);
check(`r=${r} : filtre-echeance actif`, JSON.stringify(filteredMixed.zones["ligne-F-120"]?.boite) === boxAfter("filtre-echeance"));
await browser.close();

const unknown = await fetch(`${BASE}/v13/entrer?r=inconnu`, { redirect: "manual" });
const unknownBody = await unknown.text();
check("identifiant inconnu : réponse 400 qui liste les identifiants valides", unknown.status === 400 && CHANGES.every((change) => unknownBody.includes(change.id)));
const outside = await fetch(`${BASE}/v13/entrer?suite=/v12/factures`, { redirect: "manual" });
check("suite hors version : réponse 400", outside.status === 400);

writeFileSync(new URL("../positions.json", import.meta.url), `${JSON.stringify(positions, null, 2)}\n`);
console.log(`${passed} contrôles passés sur ${TOTAL}, positions.json écrit.`);
if (passed !== TOTAL) process.exit(1);
