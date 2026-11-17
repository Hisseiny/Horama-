import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { Decision, Regle } from "@horama/contrats";
import { ecrireDecision, lireDecisions, lireNotes, lireTestsAcceptes } from "@horama/memoire";
import { PNG } from "pngjs";
import { comparerImages, consoliderConstats, formuler, releverValeurs, verifierReleve, versDecision } from "../index.ts";
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
  NOTE_RULES.find((rule) => rule.type === type && rule.type !== "egalite" && rule.type !== "etat" && rule.ecran === ecran && rule.colonne === colonne)!;

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

test("visuel, liste des factures : un seul constat, le bouton Exporter déplacé de son ancienne place à la nouvelle", () => {
  const [constat, ...others] = visual(LIST);
  const { avant, apres } = position("export-haut");
  assert.equal(others.length, 0);
  assert.equal(constat.genre, "visuel");
  assert.equal(constat.statut, "SUSPECTED");
  assert.equal(constat.description, "Cette zone a changé depuis la version 12.");
  assert.ok(constat.pixels! >= 6);
  assert.equal(constat.nature, "deplacement");
  assert.deepEqual(constat.zone, apres);
  assert.deepEqual(constat.zone_avant, avant);
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

test("visuel : une décision « voulu » sur le bouton neutralise son déplacement, une autre zone du même écran reste suspecte", () => {
  const { apres } = position("export-haut");
  // The real capture with a black square painted on it: another change on the same screen.
  const square = { x: 300, y: 700, largeur: 12, hauteur: 12 };
  const painted = PNG.sync.read(Buffer.from(LIST.png));
  for (let y = square.y; y < square.y + square.hauteur; y++) painted.data.fill(0, (y * painted.width + square.x) * 4, (y * painted.width + square.x + square.largeur) * 4);
  const changed = { ...LIST, png: PNG.sync.write(painted) };
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
  const constats = visual(changed, [decision]);
  const neutralised = constats.filter((constat) => constat.statut === "PASS");
  const suspected = constats.filter((constat) => constat.statut === "SUSPECTED");
  assert.deepEqual([neutralised.length, suspected.length, constats.length], [1, 1, 2]);
  assert.equal(neutralised[0].decision_id, decision.id);
  assert.equal(neutralised[0].nature, "deplacement");
  assert.ok(distance(neutralised[0].zone!, apres) < 40);
  assert.equal(suspected[0].decision_id, undefined);
  assert.equal(suspected[0].nature, "changement");
  assert.deepEqual(suspected[0].zone, square);
  // The decision holds for its version only.
  assert.ok(visual(changed, [{ ...decision, version: "14" }]).every((constat) => constat.statut === "SUSPECTED"));
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

// ---------- Findings a spectator understands: one finding per moved element, plain words, the human decision ----------

const DOUBT_ON_AMOUNT = "tableau-de-bord--defaut--visuel--1";
const CA_DEFECT = "liste-des-factures--defaut--regle--1";
const MOVED_BUTTON = "liste-des-factures--defaut--visuel--1";
const FILTER_DEFECT = "liste-des-factures--filtre-echeance--regle--1";
// What the scene reads under each zone: the text of the element at its centre, as displayed.
const TEXTS: Record<string, string> = { [DOUBT_ON_AMOUNT]: nbsp("1 240,00 €"), [MOVED_BUTTON]: "Exporter" };

// The whole run of T7: each capture is verified as it is taken, against the v12 reference of the vault when there is one.
const run = (decisions: Decision[] = []) =>
  RUN.flatMap((releve, index) => {
    const path = `${VAULT}/facturo/references/${releve.ecran}/${releve.vue}--v12.png`;
    return verifierReleve({ releve, releves: RUN.slice(0, index + 1), regles: TEST_RULES, reference: existsSync(path) ? readFileSync(path) : undefined, version_reference: "12", decisions });
  });
const FOUND = run(); // no decision, and before the scene has read the text under the zones
const withTexts = (constats: Constat[]) => constats.map((constat) => (TEXTS[constat.id] ? { ...constat, texte_zone: TEXTS[constat.id] } : constat));
const byId = (constats: Constat[], id: string) => constats.find((constat) => constat.id === id)!;
const said = (constat: Constat): string[] => Object.values(formuler(constat));

test("parcours réel : chaque constat a son identifiant, son écran et sa vue ; le bouton déplacé ne fait qu'un constat", () => {
  assert.deepEqual(
    FOUND.map(({ id, ecran, vue, genre, statut, nature }) => [id, ecran, vue, genre, statut, nature]),
    [
      [DOUBT_ON_AMOUNT, "tableau-de-bord", "defaut", "visuel", "SUSPECTED", "changement"],
      [CA_DEFECT, "liste-des-factures", "defaut", "regle", "VERIFIED_FAIL", undefined],
      [MOVED_BUTTON, "liste-des-factures", "defaut", "visuel", "SUSPECTED", "deplacement"],
      [FILTER_DEFECT, "liste-des-factures", "filtre-echeance", "regle", "VERIFIED_FAIL", undefined],
      ["detail-facture--defaut--regle--1", "detail-facture", "defaut", "regle", "PASS", undefined],
      ["detail-facture--defaut--regle--2", "detail-facture", "defaut", "regle", "PASS", undefined],
    ],
  );
  const button = byId(FOUND, MOVED_BUTTON);
  assert.deepEqual([button.zone, button.zone_avant], [position("export-haut").apres, position("export-haut").avant]);
  assert.deepEqual(button.page, { largeur: 1280, hauteur: 900 });
  assert.equal(byId(FOUND, DOUBT_ON_AMOUNT).zone_avant, undefined);
  // The same run gives the same identifiers.
  assert.deepEqual(run().map(({ id }) => id), FOUND.map(({ id }) => id));
});

// A block drawn on the grey image: an inside and an outline, like a button.
const block = (place: Box, inside: number, outline = inside): Array<[number, number, number]> =>
  Array.from({ length: place.largeur * place.hauteur }, (_, i) => {
    const [dx, dy] = [i % place.largeur, Math.floor(i / place.largeur)];
    return [place.x + dx, place.y + dy, dx === 0 || dy === 0 || dx === place.largeur - 1 || dy === place.hauteur - 1 ? outline : inside];
  });

test("comparerImages : un élément déplacé donne une zone, à sa nouvelle place, qui garde l'ancienne", () => {
  const [from, to] = [{ x: 10, y: 60, largeur: 20, hauteur: 10 }, { x: 90, y: 5, largeur: 20, hauteur: 10 }];
  const button = (place: Box, inside = 160) => image(120, 80, block(place, inside, 250));
  const moved = comparerImages(button(to), button(from));
  assert.deepEqual(moved.zones, [{ ...to, pixels: 200, zone_avant: from }]);
  assert.deepEqual([moved.rawZones, moved.differentPixels], [2, 400]);
  // The other way round, the old place is still the one of the reference.
  assert.deepEqual(comparerImages(button(from), button(to)).zones, [{ ...from, pixels: 200, zone_avant: to }]);
  // Same size, other content: one element went, another came. Two changes, not a move.
  assert.deepEqual(comparerImages(button(to, 200), button(from)).zones.map(({ zone_avant }) => zone_avant), [undefined, undefined]);
  // Another size: two changes.
  assert.equal(comparerImages(button({ ...to, largeur: 21 }), button(from)).zones.length, 2);
  // A block of one flat colour cannot be told from an empty place: two changes (known limit).
  assert.equal(comparerImages(image(120, 80, block(to, 160)), image(120, 80, block(from, 160))).zones.length, 2);
});

test("consoliderConstats : le doute sur le montant du tableau de bord est expliqué par le défaut du CA du mois", () => {
  const constats = withTexts(FOUND);
  const consolidated = consoliderConstats(constats);
  assert.equal(byId(consolidated, DOUBT_ON_AMOUNT).explique_par, CA_DEFECT);
  // Nothing is removed, nothing else changes, the input is left as it was.
  assert.deepEqual(consolidated.map(({ explique_par, ...constat }) => constat), constats);
  assert.ok(constats.every((constat) => constat.explique_par === undefined));
  // What is left to show: 2 proven defects and 1 doubt, the button.
  assert.deepEqual(consolidated.filter((constat) => constat.statut === "VERIFIED_FAIL").map(({ id }) => id), [CA_DEFECT, FILTER_DEFECT]);
  assert.deepEqual(consolidated.filter((constat) => constat.statut === "SUSPECTED" && !constat.explique_par).map(({ id }) => id), [MOVED_BUTTON]);

  // Without the text of the zone, nothing links the doubt to the defect.
  assert.ok(consoliderConstats(FOUND).every((constat) => constat.explique_par === undefined));
  // The text must be a value of the defect on the screen of the doubt: 1 420,00 € is the value of the list, not of the dashboard.
  const elsewhere = constats.map((constat) => (constat.id === DOUBT_ON_AMOUNT ? { ...constat, texte_zone: nbsp("1 420,00 €") } : constat));
  assert.equal(byId(consoliderConstats(elsewhere), DOUBT_ON_AMOUNT).explique_par, undefined);
  // A text that is not an amount is compared as a text: here the due date of the row the filter should not show.
  const doubt: Constat = { ...byId(constats, MOVED_BUTTON), id: "liste-des-factures--filtre-echeance--visuel--1", vue: "filtre-echeance", texte_zone: " 30/11/2026 " };
  assert.equal(consoliderConstats([...constats, doubt]).at(-1)!.explique_par, FILTER_DEFECT);
});

test("formuler : les phrases du parcours réel, telles qu'un spectateur les lit", () => {
  const constats = consoliderConstats(withTexts(FOUND));
  assert.deepEqual(
    constats.map((constat) => ({ id: constat.id, ...formuler(constat) })),
    [
      { id: DOUBT_ON_AMOUNT, resultat: "Quelque chose a changé ici, autour de « 1 240 € »." },
      {
        id: CA_DEFECT,
        annonce: "Je vérifie que « CA du mois » correspond à « Total ».",
        resultat: "Problème : ici 1 420 €, là-bas 1 240 €. Il manque 180 €.",
        question: "« CA du mois » affiche 1 240 €, « Total » affiche 1 420 €. Bug ou voulu ?",
      },
      {
        id: MOVED_BUTTON,
        resultat: "« Exporter » a changé de place.",
        question: "« Exporter » a été déplacé vers le haut, il est maintenant en haut à droite. Bug ou voulu ?",
      },
      {
        id: FILTER_DEFECT,
        annonce: "Je vérifie que ce filtre ne montre que des dates passées.",
        resultat: "Problème : F-120 ne devrait pas être ici. Sa date, le 30/11, n'est pas encore passée.",
        question: "Le filtre « Échéance dépassée » montre F-120 (Échéance : 30/11). Bug ou voulu ?",
      },
      {
        id: "detail-facture--defaut--regle--1",
        annonce: "Je vérifie que « Total TTC » correspond à « Montant TTC de F-119 ».",
        resultat: "C'est bon : 480 € des deux côtés.",
      },
      { id: "detail-facture--defaut--regle--2", annonce: "Je refais l'addition de « Total TTC ».", resultat: "C'est bon : l'addition fait bien 480 €." },
    ],
  );
  // The exact computation stays in the finding.
  assert.equal(byId(constats, CA_DEFECT).calcul, "1 240,00 ≠ 1 420,00, écart 180,00");

  // Before the scene has read the text under the zones.
  assert.deepEqual(formuler(byId(FOUND, DOUBT_ON_AMOUNT)), { resultat: "Quelque chose a changé ici.", question: "Quelque chose a changé ici. Bug ou voulu ?" });
  assert.deepEqual(formuler(byId(FOUND, MOVED_BUTTON)), {
    resultat: "Quelque chose a changé de place.",
    question: "Quelque chose a été déplacé vers le haut, il est maintenant en haut à droite. Bug ou voulu ?",
  });
  // Both places in the same third of the page, or no page size: no position words.
  const button = byId(constats, MOVED_BUTTON);
  for (const near of [{ ...button, zone_avant: { ...button.zone!, x: 900 } }, { ...button, page: undefined }]) {
    assert.equal(formuler(near).question, "« Exporter » a changé de place. Bug ou voulu ?");
  }
  assert.equal(formuler({ ...button, zone_avant: { x: 20, y: 800, largeur: 120, hauteur: 36 } }).question, "« Exporter » a été déplacé vers la droite, il est maintenant en haut à droite. Bug ou voulu ?");
  assert.equal(formuler({ ...button, zone_avant: { x: 600, y: 400, largeur: 120, hauteur: 36 } }).question, "« Exporter » a été déplacé vers la droite, il est maintenant en haut à droite. Bug ou voulu ?");
  // Images of two sizes.
  assert.deepEqual(formuler(visual(LIST, [], image(60, 30))[0]), { resultat: "Je n'arrive pas à comparer cette page avec l'ancienne. Les deux images n'ont pas la même taille." });
});

// Another software, made up for the test: the stock of a warehouse. Nothing in the sentences may depend on Facturo.
const STOCK = `Aujourd'hui : 03/02/2027
Valeur du stock
12 500,00 €
Filtrer : En rupture
Article\tQuantité\tÉtat\tArrivage\tValeur
Vis\t40\tEn rupture\t01/02/2027\t2 500,00 €
Clous\t\tEn stock\t2027-02-20\t9 000,50 €
Total\t\t\t\t11 500,50 €`;
const ORDERS = `Client : Atelier Brun
Montant commandé
11 500,50 €`;
const stock = (regles: Regle[], texte = STOCK) => {
  const releves = [
    { ecran: "commandes", vue: "defaut", version: "2", png: new Uint8Array(), texte: ORDERS, url: "" },
    { ecran: "entrepot", vue: "defaut", version: "2", png: new Uint8Array(), texte, url: "" },
  ];
  return verifierReleve({ releve: releves[1], releves, regles, decisions: [] }).map((constat) => [constat.statut, formuler(constat)] as const);
};

test("formuler : un autre logiciel, les cinq types, conformes et en défaut", () => {
  assert.deepEqual(
    stock([
      { type: "egalite", a: { ecran: "entrepot", champ: "Total" }, b: { ecran: "commandes", champ: "Montant commandé" } },
      { type: "egalite", a: { ecran: "commandes", champ: "Montant commandé" }, b: { ecran: "entrepot", champ: "Valeur du stock" } },
      { type: "egalite", a: { ecran: "entrepot", champ: "Valeur du stock" }, b: { ecran: "entrepot", champ: "Total" } },
      { type: "egalite", a: { ecran: "commandes", champ: "Client" }, b: { ecran: "entrepot", champ: "Article de Vis" } },
      { type: "somme", ecran: "entrepot", colonne: "Valeur", cible: "Total" },
      { type: "somme", ecran: "entrepot", colonne: "Valeur", cible: "Valeur du stock" },
      { type: "filtre", ecran: "entrepot", filtre: "En rupture", colonne: "État", condition: "= valeur", valeur: "En rupture" },
      { type: "filtre", ecran: "entrepot", filtre: "En rupture", colonne: "Arrivage", condition: "<= aujourd_hui" },
      { type: "format", ecran: "entrepot", colonne: "Valeur", motif: "montant-fr" },
      { type: "format", ecran: "entrepot", colonne: "Arrivage", motif: "date-fr" },
      { type: "presence", ecran: "entrepot", colonne: "Article" },
      { type: "presence", ecran: "entrepot", colonne: "Quantité" },
    ]),
    [
      ["PASS", { annonce: "Je vérifie que « Total » correspond à « Montant commandé ».", resultat: "C'est bon : 11 500,50 € des deux côtés." }],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je vérifie que « Montant commandé » correspond à « Valeur du stock ».",
          resultat: "Problème : ici 12 500 €, là-bas 11 500,50 €. Il manque 999,50 €.",
          question: "« Montant commandé » affiche 11 500,50 €, « Valeur du stock » affiche 12 500 €. Bug ou voulu ?",
        },
      ],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je vérifie que « Valeur du stock » correspond à « Total ».",
          resultat: "Problème : 12 500 € d'un côté, 11 500,50 € de l'autre. Il manque 999,50 €.",
          question: "« Valeur du stock » affiche 12 500 €, « Total » affiche 11 500,50 €. Bug ou voulu ?",
        },
      ],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je vérifie que « Client » correspond à « Article de Vis ».",
          resultat: "Problème : ici Vis, là-bas Atelier Brun.",
          question: "« Client » affiche Atelier Brun, « Article de Vis » affiche Vis. Bug ou voulu ?",
        },
      ],
      ["PASS", { annonce: "Je refais l'addition de « Total ».", resultat: "C'est bon : l'addition fait bien 11 500,50 €." }],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je refais l'addition de « Valeur du stock ».",
          resultat: "Problème : l'addition fait 11 500,50 €, la page affiche 12 500 €. Il manque 999,50 €.",
          question: "« Valeur du stock » affiche 12 500 €, l'addition fait 11 500,50 €. Bug ou voulu ?",
        },
      ],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je vérifie que ce filtre ne montre que « En rupture ».",
          resultat: "Problème : Clous ne devrait pas être ici. Elle affiche « En stock » au lieu de « En rupture ».",
          question: "Le filtre « En rupture » montre Clous (État : En stock). Bug ou voulu ?",
        },
      ],
      [
        "INCONCLUSIVE",
        { annonce: "Je vérifie que ce filtre ne montre aucune date à venir.", resultat: "Je n'arrive pas à lire cette valeur. Date illisible : Arrivage de Clous affiche « 2027-02-20 »." },
      ],
      ["PASS", { annonce: "Je vérifie que les montants de « Valeur » sont bien écrits.", resultat: "C'est bon : tout est bien écrit." }],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je vérifie que les dates de « Arrivage » sont bien écrites.",
          resultat: "Problème : « 2027-02-20 » est mal écrit. J'attendais une date écrite jour/mois/année.",
          question: "« Arrivage » affiche « 2027-02-20 ». Bug ou voulu ?",
        },
      ],
      ["PASS", { annonce: "Je vérifie que « Article » est rempli partout.", resultat: "C'est bon : rien ne manque." }],
      [
        "VERIFIED_FAIL",
        {
          annonce: "Je vérifie que « Quantité » est rempli partout.",
          resultat: "Problème : « Quantité » est vide pour Clous.",
          question: "« Quantité » est vide pour Clous. Bug ou voulu ?",
        },
      ],
    ],
  );

  // Dates against today, and several faulty rows.
  const dated = STOCK.replace("2027-02-20", "20/02/2027").replace("01/02/2027", "03/02/2027");
  const arrival = (condition: "< aujourd_hui" | "<= aujourd_hui", texte: string) => stock([{ type: "filtre", ecran: "entrepot", filtre: "En rupture", colonne: "Arrivage", condition }], texte)[0];
  assert.deepEqual(arrival("<= aujourd_hui", dated)[1], {
    annonce: "Je vérifie que ce filtre ne montre aucune date à venir.",
    resultat: "Problème : Clous ne devrait pas être ici. Sa date, le 20/02, est après aujourd'hui.",
    question: "Le filtre « En rupture » montre Clous (Arrivage : 20/02). Bug ou voulu ?",
  });
  assert.deepEqual(arrival("< aujourd_hui", dated)[1], {
    annonce: "Je vérifie que ce filtre ne montre que des dates passées.",
    resultat: "Problème : 2 lignes ne devraient pas être ici, dont Vis. Sa date, le 03/02, n'est pas encore passée.",
    question: "Le filtre « En rupture » montre Vis (Arrivage : 03/02). Bug ou voulu ?",
  });
  assert.deepEqual(arrival("< aujourd_hui", STOCK.replace("2027-02-20", "02/02/2027")), [
    "PASS",
    { annonce: "Je vérifie que ce filtre ne montre que des dates passées.", resultat: "C'est bon : chaque ligne affichée a sa place ici." },
  ]);
  // Something that cannot be read: the reason, without the identifier of the screen.
  assert.equal(stock([{ type: "presence", ecran: "entrepot", colonne: "Fournisseur" }])[0][1].resultat, "Je n'arrive pas à lire cette valeur. Colonne Fournisseur introuvable.");
});

test("formuler : 90 caractères au plus par phrase, sans jargon ni tiret long, même avec des noms très longs", () => {
  const long = "Montant total hors taxes de toutes les commandes en cours de livraison ce trimestre";
  const nail = "Clous de charpentier galvanisés à tête plate, boîte de cinq cents, second choix, lot de mars";
  const wordy = stock(
    [
      { type: "egalite", a: { ecran: "entrepot", champ: long }, b: { ecran: "commandes", champ: "Montant commandé" } },
      { type: "egalite", a: { ecran: "entrepot", champ: long }, b: { ecran: "entrepot", champ: "Total" } },
      { type: "somme", ecran: "entrepot", colonne: "Valeur", cible: long },
      { type: "filtre", ecran: "entrepot", filtre: "En rupture", colonne: "État", condition: "= valeur", valeur: long },
      { type: "format", ecran: "entrepot", colonne: long, motif: "date-fr" },
      { type: "format", ecran: "entrepot", colonne: "Arrivage", motif: "date-fr" },
      { type: "presence", ecran: "entrepot", colonne: "Quantité" },
      { type: "presence", ecran: "entrepot", colonne: `${long} ${long}` },
    ],
    STOCK.replace("Valeur du stock", long).replace("Clous", nail).replace("2027-02-20", `le ${long}`),
  ).map(([, wording]) => wording);
  const zone = { ...byId(FOUND, MOVED_BUTTON), texte_zone: long };
  const all = [
    ...consoliderConstats(withTexts(FOUND)).flatMap(said),
    ...FOUND.flatMap(said),
    ...wordy.flatMap((wording): string[] => Object.values(wording)),
    ...said(zone),
    ...said({ ...zone, nature: "changement" }),
    ...said({ ...zone, statut: "PASS", decision_id: "2026-11-16-liste-des-factures-exporter" }),
    ...said(visual(LIST, [], image(60, 30))[0]),
  ];
  const BANNED = new Set(["règle", "règles", "regle", "regles", "égalité", "egalite", "constat", "constats", "relevé", "relevés", "releve", "releves", "vue", "vues", "zone", "zones"]);
  for (const field of all) {
    for (const sentence of field.split(/(?<=[.?!]) /)) assert.ok(sentence.length <= 90, `${sentence.length} caractères : ${sentence}`);
    assert.deepEqual(field.toLowerCase().split(/[^\p{L}]+/u).filter((word) => BANNED.has(word)), [], field);
    assert.doesNotMatch(field, /[\u2013\u2014]|\[\[|\]\]/, field);
    assert.match(field, /[.?]$/, field);
  }
  // Names and values too long for a sentence: the sentence does without them.
  assert.deepEqual(wordy, [
    {
      annonce: "Je vérifie que deux valeurs correspondent.",
      resultat: "Problème : ici 12 500 €, là-bas 11 500,50 €. Il manque 999,50 €.",
      question: "Deux valeurs devraient correspondre : 12 500 € et 11 500,50 €. Bug ou voulu ?",
    },
    {
      annonce: "Je vérifie que deux valeurs correspondent.",
      resultat: "Problème : 12 500 € d'un côté, 11 500,50 € de l'autre. Il manque 999,50 €.",
      question: "Deux valeurs devraient correspondre : 12 500 € et 11 500,50 €. Bug ou voulu ?",
    },
    {
      annonce: "Je refais l'addition.",
      resultat: "Problème : l'addition fait 11 500,50 €, la page affiche 12 500 €. Il manque 999,50 €.",
      question: "La page affiche 12 500 €, l'addition fait 11 500,50 €. Bug ou voulu ?",
    },
    {
      annonce: "Je vérifie que ce filtre montre les bonnes lignes.",
      resultat: "Problème : 2 lignes ne devraient pas être ici, dont Vis.",
      question: "Le filtre « En rupture » montre Vis (État : En rupture). Bug ou voulu ?",
    },
    {
      annonce: "Je vérifie que tout est bien écrit.",
      resultat: "Problème : « 12 500,00 € » est mal écrit. J'attendais une date écrite jour/mois/année.",
      question: "Une valeur est mal écrite. Bug ou voulu ?",
    },
    {
      annonce: "Je vérifie que les dates de « Arrivage » sont bien écrites.",
      resultat: "Problème : une valeur est mal écrite. J'attendais une date écrite jour/mois/année.",
      question: "Une valeur est mal écrite. Bug ou voulu ?",
    },
    { annonce: "Je vérifie que « Quantité » est rempli partout.", resultat: "Problème : une case est vide.", question: "Une case est vide. Bug ou voulu ?" },
    { annonce: "Je vérifie qu'il ne manque rien.", resultat: "Je n'arrive pas à lire cette valeur." },
  ]);
  assert.deepEqual(said(zone), ["Quelque chose a changé de place.", "Quelque chose a changé de place. Bug ou voulu ?"]);
});

// The tests never write in the repository: the decisions go to a copy of the vault, removed when the file ends.
const temporaryVault = () => {
  const folder = mkdtempSync(join(tmpdir(), "horama-vault-"));
  cpSync(VAULT, folder, { recursive: true });
  after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
};
const CONTEXT = { passage_id: "2026-11-16-21h45-5675", test_id: "ca-du-mois-egal-total", logiciel: "facturo", version: "13", par: "Nathan", le: "2026-11-16T22:10:00.000Z" };

test("versDecision : la décision s'écrit dans le vault, se relit, et « voulu » sur le bouton le neutralise au parcours suivant", () => {
  const vault = temporaryVault();
  const constats = consoliderConstats(withTexts(FOUND));
  const wanted = versDecision(byId(constats, MOVED_BUTTON), "voulu", CONTEXT);
  const bug = versDecision(byId(constats, CA_DEFECT), "bug", CONTEXT);
  assert.deepEqual(wanted, {
    id: "2026-11-16-liste-des-factures-exporter",
    passage_id: "2026-11-16-21h45-5675",
    test_id: "ca-du-mois-egal-total",
    ecart_id: MOVED_BUTTON,
    decision: "voulu",
    logiciel: "facturo",
    ecran: "liste-des-factures",
    vue: "defaut",
    ecart: "« Exporter » a changé de place.",
    zone: position("export-haut").apres,
    version: "13",
    portee: "cet ecart, cet ecran, cette version",
    par: "Nathan",
    le: "2026-11-16T22:10:00.000Z",
  });
  assert.deepEqual(
    [bug.id, bug.ecart_id, bug.decision, bug.ecart, bug.zone],
    ["2026-11-16-liste-des-factures-ca-du-mois", CA_DEFECT, "bug", "Problème : ici 1 420 €, là-bas 1 240 €. Il manque 180 €.", undefined],
  );
  // One identifier per finding of the run, in kebab-case.
  assert.deepEqual(constats.map((constat) => versDecision(constat, "bug", CONTEXT).id), [
    "2026-11-16-tableau-de-bord-1-240-00",
    "2026-11-16-liste-des-factures-ca-du-mois",
    "2026-11-16-liste-des-factures-exporter",
    "2026-11-16-liste-des-factures-filtre-echeance-depassee",
    "2026-11-16-detail-facture-total-ttc",
    "2026-11-16-detail-facture-somme-total-ttc",
  ]);
  assert.equal(versDecision(byId(FOUND, MOVED_BUTTON), "bug", CONTEXT).id, "2026-11-16-liste-des-factures-deplacement-1");

  assert.equal(ecrireDecision(vault, wanted), "facturo/decisions/2026-11-16-liste-des-factures-exporter.md");
  ecrireDecision(vault, bug);
  const decisions = lireDecisions(vault, "facturo");
  assert.deepEqual(decisions, [bug, wanted]);
  assert.ok(readFileSync(join(vault, "facturo/decisions/2026-11-16-liste-des-factures-exporter.md"), "utf8").includes("\nÉcart : « Exporter » a changé de place.\nDécision : voulu\n"));

  // Next run, with the memory of the vault: the moved button (new place and old place) is settled, the rest is found again.
  const next = consoliderConstats(withTexts(run(decisions)));
  assert.deepEqual(next.map(({ id }) => id), constats.map(({ id }) => id));
  const button = byId(next, MOVED_BUTTON);
  assert.deepEqual([button.statut, button.decision_id, button.nature], ["PASS", wanted.id, "deplacement"]);
  assert.deepEqual(formuler(button), { resultat: "Déjà vu et validé." });
  assert.deepEqual(next.filter((constat) => constat.statut === "SUSPECTED" && !constat.explique_par), []);
  assert.deepEqual(next.filter((constat) => constat.statut === "VERIFIED_FAIL").map(({ id }) => id), [CA_DEFECT, FILTER_DEFECT]);
  // A « bug » neutralises nothing, and a « voulu » holds for its version only.
  for (const other of [{ ...wanted, decision: "bug" as const }, { ...wanted, version: "14" }]) assert.equal(byId(visual(LIST, [other]), MOVED_BUTTON).statut, "SUSPECTED");
});
