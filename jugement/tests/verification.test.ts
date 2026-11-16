import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { Decision, Regle } from "@horama/contrats";
import { lireNotes, lireTestsAcceptes } from "@horama/memoire";
import { PNG } from "pngjs";
import { comparerImages, releverValeurs, verifierReleve } from "../index.ts";
import type { Constat, ReleveCapture } from "../index.ts";

// Real data, no network: the 4 screens of Facturo v13 captured during run 1 of T7 (docs/tests/2026-11-16-t7-navigateur-local.md),
// the v12 references of docs/captures/2026-11-16-n2-faux-saas/, the rules of the 3 accepted tests and of the notes of the vault.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const VAULT = `${ROOT}vault-horama`;
const file = (path: string) => readFileSync(`${ROOT}${path}`);
const capture = (ecran: string, vue: string, texte = file(`docs/captures/2026-11-16-t7/passe-1/${ecran}--${vue}.txt`).toString()): ReleveCapture => ({
  ecran,
  vue,
  version: "13",
  png: file(`docs/captures/2026-11-16-t7/passe-1/${ecran}--${vue}.png`),
  texte,
  url: "",
});
const reference = (ecran: string, vue: string) => file(`docs/captures/2026-11-16-n2-faux-saas/${ecran}--${vue}--v12.png`);

// The order of the run of T7.
const DASHBOARD = capture("tableau-de-bord", "defaut");
const LIST = capture("liste-des-factures", "defaut");
const FILTERED = capture("liste-des-factures", "filtre-echeance");
const DETAIL = capture("detail-facture", "defaut");
const RUN = [DASHBOARD, LIST, FILTERED, DETAIL];
const TEST_RULES = lireTestsAcceptes(VAULT, "facturo").flatMap((accepted) => accepted.regles);
const NOTE_RULES = lireNotes(VAULT, "facturo").flatMap((note) => note.regles.flatMap(({ regle }) => regle ?? []));
const noteRule = (type: Regle["type"], ecran: string, colonne: string) =>
  NOTE_RULES.find((rule) => rule.type === type && rule.type !== "egalite" && rule.ecran === ecran && rule.colonne === colonne)!;

type Box = { x: number; y: number; largeur: number; hauteur: number };
const POSITIONS = JSON.parse(file("faux-saas/positions.json").toString()) as Array<{ id: string; avant: Box; apres: Box }>;
const position = (id: string) => POSITIONS.find((entry) => entry.id === id)!;
const distance = (a: Box, b: Box) => Math.hypot(a.x + a.largeur / 2 - b.x - b.largeur / 2, a.y + a.hauteur / 2 - b.y - b.hauteur / 2);

// The findings of the capture `releve`, the run being played up to it.
const verify = (releve: ReleveCapture, regles = TEST_RULES, releves = RUN.slice(0, RUN.indexOf(releve) + 1)) =>
  verifierReleve({ releve, releves, regles, decisions: [] });
const visual = (releve: ReleveCapture, decisions: Decision[] = [], png: Uint8Array = reference(releve.ecran, releve.vue)) =>
  verifierReleve({ releve, releves: [releve], regles: [], reference: png, version_reference: "12", decisions });
const ofType = (constats: Constat[], type: Regle["type"]) => constats.filter((constat) => constat.regle?.type === type);

// The real text of the list, changed in one place. Amounts are displayed with no-break spaces.
const nbsp = (text: string) => text.replaceAll(" ", "\u00a0");
const changedList = (from: string, to: string) => {
  assert.equal(LIST.texte.split(from).length, 2, `« ${from} » doit apparaître une fois dans le texte de la liste`);
  return capture("liste-des-factures", "defaut", LIST.texte.replace(from, to));
};
const listRule = (releve: ReleveCapture, type: Regle["type"], colonne: string) => {
  const [constat, ...others] = verify(releve, [noteRule(type, "liste-des-factures", colonne)], [releve]);
  assert.equal(others.length, 0);
  return constat;
};

test("releverValeurs : tableaux, total, valeurs étiquetées, date du jour, filtre et compteur des vrais écrans", () => {
  const list = releverValeurs(FILTERED.texte);
  assert.deepEqual(list.tables[0].headers, ["Numéro", "Client", "Échéance", "Montant TTC"]);
  assert.deepEqual(list.tables[0].rows[1], ["F-119", "Studio Lune", "12/11/2026", nbsp("480,00 €")]);
  assert.equal(list.tables[0].rows.length, 4);
  assert.deepEqual(list.tables[0].total, ["Total", "", "", nbsp("1 420,00 €")]);
  assert.equal(list.today, "18/11/2026");
  assert.equal(list.filter, "Échéance dépassée");
  assert.deepEqual(list.count, { value: 4, text: "4 factures" });

  const dashboard = releverValeurs(DASHBOARD.texte);
  assert.equal(dashboard.labelled["CA du mois"], nbsp("1 240,00 €"));
  assert.equal(dashboard.labelled["Factures du mois"], "4");
  assert.deepEqual(dashboard.tables[0].rows, [["F-120", "Café Mira", "30/11/2026"]]);

  const detail = releverValeurs(DETAIL.texte);
  assert.deepEqual(detail.tables[0].rows, [["Maquette de site", nbsp("300,00 €")], ["Intégration", nbsp("180,00 €")]]);
  assert.deepEqual(detail.tables[0].total, ["Total TTC", nbsp("480,00 €")]);
  assert.equal(detail.labelled["Client"], "Studio Lune");
});

test("CA du mois : rien au tableau de bord, défaut prouvé à la liste", () => {
  assert.deepEqual(verify(DASHBOARD), []);
  const [constat, ...others] = verify(LIST);
  assert.equal(others.length, 0);
  assert.equal(constat.genre, "regle");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.deepEqual(constat.valeurs, { "tableau-de-bord.CA du mois": "1240.00", "liste-des-factures.Total": "1420.00" });
  assert.equal(constat.calcul, "1 240,00 ≠ 1 420,00, écart 180,00");
  assert.deepEqual(constat.textes_a_surligner, [nbsp("1 420,00 €")]);
  assert.ok(LIST.texte.includes(constat.textes_a_surligner[0]));
});

test("filtre : défaut prouvé sur la vue filtre-echeance, pas décidable sur la vue defaut", () => {
  assert.deepEqual(ofType(verify(LIST), "filtre"), []);
  const [constat, ...others] = verify(FILTERED);
  assert.equal(others.length, 0);
  assert.equal(constat.regle?.type, "filtre");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.valeurs["liste-des-factures.Échéance de F-120"], "30/11/2026");
  assert.equal(constat.valeurs["liste-des-factures.Aujourd'hui"], "18/11/2026");
  assert.equal(constat.calcul, "Échéance de F-120 : 30/11/2026, attendu avant le 18/11/2026");
  assert.deepEqual(constat.textes_a_surligner, ["F-120"]);
});

test("détail F-119 : égalité avec la liste et somme des lignes conformes", () => {
  const constats = verify(DETAIL);
  assert.deepEqual(constats.map((constat) => [constat.regle?.type, constat.statut, constat.calcul]), [
    ["egalite", "PASS", "480,00 = 480,00"],
    ["somme", "PASS", "300,00 + 180,00 = 480,00"],
  ]);
  assert.deepEqual(constats[0].valeurs, { "detail-facture.Total TTC": "480.00", "liste-des-factures.Montant TTC de F-119": "480.00" });
  assert.deepEqual(constats.flatMap((constat) => constat.textes_a_surligner), []);
});

test("chaque règle est rendue une seule fois sur le parcours, même si un écran est relevé deux fois", () => {
  assert.equal(RUN.flatMap((releve) => verify(releve)).length, TEST_RULES.length);
  assert.deepEqual(verify(LIST, TEST_RULES, [...RUN, LIST]), []);
  assert.deepEqual(verify(LIST, [...TEST_RULES, ...TEST_RULES]).length, 1);
});

test("nombre de factures : le tableau de bord contre le nombre de lignes de la liste", () => {
  const rule = NOTE_RULES.find((candidate) => candidate.type === "egalite" && candidate.b.champ === "Nombre de factures")!;
  assert.equal(verify(LIST, [rule])[0].calcul, "4 = 4");
  const dashboard = capture("tableau-de-bord", "defaut", DASHBOARD.texte.replace("Factures du mois\n4", "Factures du mois\n3"));
  const [constat] = verify(LIST, [rule], [dashboard, LIST]);
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.calcul, "3 ≠ 4");
  assert.deepEqual(constat.textes_a_surligner, ["4 factures"]);
  // The counter under the table contradicts the rows: the value is not readable.
  const [unsure] = verify(changedList("4 factures", "5 factures"), [rule], [DASHBOARD, changedList("4 factures", "5 factures")]);
  assert.equal(unsure.statut, "INCONCLUSIVE");
});

test("somme en défaut : le total affiché n'est pas la somme de la colonne", () => {
  const constat = listRule(changedList(nbsp("Total\t\t\t1 420,00 €"), nbsp("Total\t\t\t1 400,00 €")), "somme", "Montant TTC");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.calcul, "320,00 + 480,00 + 180,00 + 440,00 = 1 420,00, affiché 1 400,00");
  assert.equal(constat.valeurs["liste-des-factures.Total"], "1400.00");
  assert.deepEqual(constat.textes_a_surligner, [nbsp("1 400,00 €")]);
  assert.equal(listRule(LIST, "somme", "Montant TTC").calcul, "320,00 + 480,00 + 180,00 + 440,00 = 1 420,00");
  // Any Unicode space reads the same.
  assert.equal(listRule(capture("liste-des-factures", "defaut", LIST.texte.replaceAll("\u00a0", "\u202f")), "somme", "Montant TTC").statut, "PASS");
});

test("format montant en défaut, et la somme devient non concluante (valeur illisible, pas inventée)", () => {
  const releve = changedList(nbsp("480,00 €"), nbsp("480.00 €"));
  const format = listRule(releve, "format", "Montant TTC");
  assert.equal(format.statut, "VERIFIED_FAIL");
  assert.deepEqual(format.textes_a_surligner, [nbsp("480.00 €")]);
  assert.equal(format.calcul, "Montant TTC de F-119 : « 480.00 € », attendu 1 420,00 €");
  assert.equal(listRule(LIST, "format", "Montant TTC").statut, "PASS");

  const sum = listRule(releve, "somme", "Montant TTC");
  assert.equal(sum.statut, "INCONCLUSIVE");
  assert.equal(sum.raison, "montant illisible sur liste-des-factures : Montant TTC de F-119 affiche « 480.00 € »");
  assert.equal(sum.calcul, undefined);
  assert.deepEqual(sum.valeurs, { "liste-des-factures.Montant TTC de F-118": "320.00" });
});

test("format date en défaut : mauvaise forme, ou année après celle du jour", () => {
  const constat = listRule(changedList("10/11/2026", "2026-11-10"), "format", "Échéance");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.deepEqual(constat.textes_a_surligner, ["2026-11-10"]);
  assert.equal(listRule(changedList("10/11/2026", "10/11/2027"), "format", "Échéance").statut, "VERIFIED_FAIL");
  assert.equal(listRule(LIST, "format", "Échéance").statut, "PASS");
});

test("presence en défaut : une case vide, et une colonne introuvable est non concluante", () => {
  const releve = changedList("\t05/11/2026\t", "\t\t");
  const constat = listRule(releve, "presence", "Échéance");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.calcul, "cases remplies : 3 sur 4, vide : Échéance de F-118");
  assert.deepEqual(constat.textes_a_surligner, ["F-118"]);
  assert.equal(listRule(releve, "format", "Échéance").statut, "PASS");
  assert.equal(listRule(LIST, "presence", "Échéance").statut, "PASS");

  const missing = listRule(changedList("Client\tÉchéance\t", "Client\tDate limite\t"), "presence", "Échéance");
  assert.equal(missing.statut, "INCONCLUSIVE");
  assert.equal(missing.raison, "colonne Échéance introuvable sur liste-des-factures");
});

test("visuel, liste des factures : les zones sont celles du bouton Exporter, à son ancienne et à sa nouvelle place", () => {
  const constats = visual(LIST);
  const { avant, apres } = position("export-haut");
  assert.ok(constats.length > 0);
  for (const constat of constats) {
    assert.equal(constat.genre, "visuel");
    assert.equal(constat.statut, "SUSPECTED");
    assert.equal(constat.description, "Cette zone a changé depuis la version 12.");
    assert.ok(constat.pixels! >= 6);
    assert.ok(Math.min(distance(constat.zone!, avant), distance(constat.zone!, apres)) < 40, JSON.stringify(constat.zone));
  }
  for (const place of [avant, apres]) assert.ok(constats.some((constat) => distance(constat.zone!, place) < 40));
});

test("visuel : une zone sur la valeur du CA au tableau de bord, aucune sur le détail ni entre deux images identiques", () => {
  const [constat, ...others] = visual(DASHBOARD);
  const card = position("ca-mois").apres;
  assert.equal(others.length, 0);
  assert.equal(constat.statut, "SUSPECTED");
  assert.ok(constat.zone!.x >= card.x && constat.zone!.x + constat.zone!.largeur <= card.x + card.largeur);
  assert.ok(constat.zone!.y >= card.y && constat.zone!.y + constat.zone!.hauteur <= card.y + card.hauteur);

  assert.deepEqual(visual(DETAIL), []);
  assert.deepEqual(visual(LIST, [], LIST.png), []);
  assert.deepEqual(verify(LIST).filter((found) => found.genre === "visuel"), []); // no reference, no visual finding
});

test("visuel : une décision « voulu » sur le bouton neutralise sa zone, une autre zone du même écran reste suspecte", () => {
  const { avant, apres } = position("export-haut");
  const decision: Decision = {
    id: "2026-11-16-export-haut",
    passage_id: "passage",
    test_id: "liste-factures-filtre-echeance",
    decision: "voulu",
    logiciel: "facturo",
    ecran: "liste-des-factures",
    vue: "defaut",
    ecart: "Le bouton « Exporter » est en haut à droite.",
    zone: apres,
    version: "13",
    portee: "cet ecart, cet ecran, cette version",
    par: "Nathan",
    le: "2026-11-16T21:00:00.000Z",
  };
  const constats = visual(LIST, [decision]);
  const neutralised = constats.filter((constat) => constat.statut === "PASS");
  const suspected = constats.filter((constat) => constat.statut === "SUSPECTED");
  assert.equal(neutralised.length + suspected.length, constats.length);
  assert.ok(neutralised.length > 0 && suspected.length > 0);
  for (const constat of neutralised) {
    assert.equal(constat.decision_id, decision.id);
    assert.ok(distance(constat.zone!, apres) < 40);
  }
  for (const constat of suspected) {
    assert.equal(constat.decision_id, undefined);
    assert.ok(distance(constat.zone!, avant) < 40);
  }
  // The decision holds for its version only.
  assert.ok(visual(LIST, [{ ...decision, version: "14" }]).every((constat) => constat.statut === "SUSPECTED"));
});

// A grey image; each [x, y, red] sets the red channel of one pixel.
const image = (width: number, height: number, pixels: Array<[number, number, number]> = []) => {
  const png = new PNG({ width, height });
  png.data.fill(100);
  for (const [x, y, red] of pixels) png.data[(y * width + x) * 4] = red;
  return PNG.sync.write(png);
};

test("comparerImages : tolérance de 24, zones à 8 px, minimum de 6 pixels, tailles différentes", () => {
  const row = (x: number, y: number, length: number): Array<[number, number, number]> => Array.from({ length }, (_, i) => [x + i, y, 200]);
  const grey = image(60, 40);

  assert.equal(comparerImages(image(60, 40, [[5, 5, 124]]), grey).differentPixels, 0);
  assert.deepEqual(comparerImages(image(60, 40, row(5, 5, 5)), grey), {
    sameSize: true,
    size: { width: 60, height: 40 },
    referenceSize: { width: 60, height: 40 },
    differentPixels: 5,
    rawZones: 1,
    zones: [],
  });
  assert.deepEqual(comparerImages(image(60, 40, [[5, 5, 125], ...row(6, 5, 5)]), grey).zones, [{ x: 5, y: 5, largeur: 6, hauteur: 1, pixels: 6 }]);
  // 8 px apart, across or down: one zone. 9 px apart: two zones.
  assert.deepEqual(comparerImages(image(60, 40, [...row(2, 2, 3), ...row(12, 10, 3)]), grey).zones, [{ x: 2, y: 2, largeur: 13, hauteur: 9, pixels: 6 }]);
  const apart = comparerImages(image(60, 40, [...row(2, 2, 6), ...row(16, 2, 6), ...row(2, 11, 6)]), grey);
  assert.deepEqual([apart.rawZones, apart.zones.length, apart.differentPixels], [3, 3, 18]);
  // Two branches that meet lower down are one zone.
  const joined = comparerImages(image(60, 40, [...row(2, 2, 2), ...row(20, 2, 2), ...row(4, 8, 16)]), grey);
  assert.deepEqual(joined.zones, [{ x: 2, y: 2, largeur: 20, hauteur: 7, pixels: 20 }]);

  const other = comparerImages(grey, image(60, 30));
  assert.deepEqual([other.sameSize, other.zones.length], [false, 0]);
  const [constat, ...others] = visual(LIST, [], image(60, 30));
  assert.equal(others.length, 0);
  assert.equal(constat.statut, "INCONCLUSIVE");
  assert.equal(constat.raison, "tailles différentes : 1280 × 900 contre 60 × 30 pour la référence");
});

test("durée : verifierReleve sur un écran réel, règles et image, en moins de 200 ms", (t) => {
  const entree = { releve: LIST, releves: [DASHBOARD, LIST], regles: [...TEST_RULES, ...NOTE_RULES], reference: reference("liste-des-factures", "defaut"), version_reference: "12", decisions: [] };
  const durations = Array.from({ length: 5 }, () => {
    const start = performance.now();
    verifierReleve(entree);
    return performance.now() - start;
  });
  t.diagnostic(`verifierReleve, liste-des-factures / defaut, 1280 × 900 : ${durations.map((ms) => ms.toFixed(1)).join(" ; ")} ms`);
  const rulesOnly = performance.now();
  verifierReleve({ ...entree, reference: undefined });
  t.diagnostic(`sans image (règles seules) : ${(performance.now() - rulesOnly).toFixed(2)} ms`);
  assert.ok(Math.max(...durations) < 200);
});
