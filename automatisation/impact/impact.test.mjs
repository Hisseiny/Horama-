import assert from "node:assert/strict";
import { test } from "node:test";
import { choisirTests } from "./impact.mjs";

// Same shape as the real vault: three screen notes declaring their code files (one page file, then the shared
// files), a note without ecran, and the four tests of facturo with their releves.
const COMMUNS = ["faux-saas/lib/data.ts", "faux-saas/lib/session.ts", "faux-saas/app/shell.tsx", "faux-saas/app/layout.tsx", "faux-saas/app/styles.ts", "faux-saas/regressions.ts"];
const notes = [
  { chemin: "produit/tableau-de-bord.md", entete: { ecran: "tableau-de-bord", code: ["faux-saas/app/[version]/tableau-de-bord/page.tsx", ...COMMUNS] } },
  { chemin: "produit/liste-des-factures.md", entete: { ecran: "liste-des-factures", code: ["faux-saas/app/[version]/factures/page.tsx", ...COMMUNS] } },
  { chemin: "produit/detail-facture.md", entete: { ecran: "detail-facture", code: ["faux-saas/app/[version]/factures/[numero]/page.tsx", ...COMMUNS] } },
  { chemin: "produit/_regles-communes.md", entete: { logiciel: "facturo" } },
];
const tests = [
  { id: "ca-du-mois-egal-total", releves: [{ ecran: "tableau-de-bord", vue: "defaut" }, { ecran: "liste-des-factures", vue: "defaut" }] },
  { id: "detail-facture-total-egal-liste", releves: [{ ecran: "liste-des-factures", vue: "defaut" }, { ecran: "detail-facture", vue: "defaut" }] },
  { id: "liste-factures-filtre-echeance", releves: [{ ecran: "liste-des-factures", vue: "filtre-echeance" }] },
  { id: "mode-sombre-tableau-de-bord", releves: [{ ecran: "tableau-de-bord", vue: "mode-sombre" }] },
];
const SOCLE = ["ca-du-mois-egal-total"];
const choix = (fichiers, fiches = [], socle = SOCLE) => choisirTests({ fichiers, notes, fiches, tests, socle });

test("un fichier propre à la page de la liste ne retient que les tests qui relèvent la liste", () => {
  const resultat = choix(["faux-saas/app/[version]/factures/page.tsx"]);
  assert.deepEqual(resultat.ids, ["ca-du-mois-egal-total", "detail-facture-total-egal-liste", "liste-factures-filtre-echeance"]);
  assert.deepEqual(resultat.ecrans, [{ ecran: "liste-des-factures", raisons: ["code de la note produit/liste-des-factures.md : faux-saas/app/[version]/factures/page.tsx"] }]);
  assert.deepEqual(resultat.ecartes, [{ id: "mode-sombre-tableau-de-bord", raison: "page non touchée" }]);
});

test("un fichier commun à toutes les notes retient tous les tests", () => {
  assert.deepEqual(choix(["faux-saas/app/shell.tsx"]).ids, [
    "ca-du-mois-egal-total",
    "detail-facture-total-egal-liste",
    "liste-factures-filtre-echeance",
    "mode-sombre-tableau-de-bord",
  ]);
});

test("une fiche avec ne_doit_pas_changer ajoute les tests de cet écran", () => {
  const fiche = { id: "bouton-relancer", code: ["faux-saas/app/[version]/factures/page.tsx"], ecrans_vises: ["liste-des-factures"], ne_doit_pas_changer: ["tableau-de-bord"], titre: "", chemin: "changements/bouton-relancer.md" };
  const resultat = choix(["faux-saas/app/[version]/factures/page.tsx"], [fiche]);
  assert.deepEqual(resultat.ecrans.map(({ ecran }) => ecran), ["liste-des-factures", "tableau-de-bord"]);
  assert.deepEqual(resultat.ecrans[1].raisons, ["fiche bouton-relancer : ne_doit_pas_changer"]);
  assert.deepEqual(resultat.ids, ["ca-du-mois-egal-total", "detail-facture-total-egal-liste", "liste-factures-filtre-echeance", "mode-sombre-tableau-de-bord"]);
});

test("un fichier hors de toute note et sans fiche ne retient que le socle", () => {
  const resultat = choix(["faux-saas/package.json"]);
  assert.deepEqual(resultat.ids, ["ca-du-mois-egal-total"]);
  assert.deepEqual(resultat.ecrans, []);
  assert.deepEqual(resultat.retenus, [{ id: "ca-du-mois-egal-total", raisons: ["socle"] }]);
});

test("un test retenu par un écran et par le socle n'apparaît qu'une fois, dans l'ordre des identifiants", () => {
  const resultat = choix(["faux-saas/app/[version]/tableau-de-bord/page.tsx"]);
  assert.deepEqual(resultat.ids, ["ca-du-mois-egal-total", "mode-sombre-tableau-de-bord"]);
  assert.deepEqual(resultat.retenus[0], { id: "ca-du-mois-egal-total", raisons: ["relève tableau-de-bord", "socle"] });
});

test("un id de socle inconnu des tests acceptés est signalé, pas joué", () => {
  const resultat = choix(["faux-saas/package.json"], [], ["ca-du-mois-egal-total", "test-inexistant"]);
  assert.deepEqual(resultat.ids, ["ca-du-mois-egal-total"]);
  assert.deepEqual(resultat.socle_inconnus, ["test-inexistant"]);
});
