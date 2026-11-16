import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { analyserLigneRegle, lireNotes, urlDepart } from "../index.ts";
import { temporaryVault } from "./vault.ts";

const vault = temporaryVault();

test("les 6 notes du vault sont lues avec leur en-tête et leur titre", () => {
  const notes = lireNotes(vault, "facturo");
  assert.deepEqual(notes.map((note) => note.chemin), [
    "produit/_regles-communes.md",
    "produit/detail-facture.md",
    "produit/liste-des-factures.md",
    "produit/regles-entre-ecrans.md",
    "produit/tableau-de-bord.md",
    "notes-de-version/v13.md",
  ]);
  const liste = notes[2];
  assert.equal(liste.titre, "Liste des factures");
  assert.deepEqual(liste.entete, { ecran: "liste-des-factures", chemin: "Menu > Factures", url: "/factures" });
  assert.ok(liste.texte.startsWith("---\necran: liste-des-factures\n"));
  assert.deepEqual(notes[5].entete, { version: 13, date: "2026-11-18" });
  assert.deepEqual(notes[5].regles, []);
});

test("les 10 lignes regle: du vault ont le bon type et le bon écran", () => {
  const rules = lireNotes(vault, "facturo").flatMap((note) => note.regles.flatMap(({ regle }) => regle ?? []));
  assert.deepEqual(rules, [
    { type: "somme", ecran: "detail-facture", colonne: "Montant", cible: "Total TTC" },
    { type: "format", ecran: "detail-facture", colonne: "Montant", motif: "montant-fr" },
    { type: "somme", ecran: "liste-des-factures", colonne: "Montant TTC", cible: "Total" },
    { type: "format", ecran: "liste-des-factures", colonne: "Montant TTC", motif: "montant-fr" },
    { type: "format", ecran: "liste-des-factures", colonne: "Échéance", motif: "date-fr" },
    { type: "presence", ecran: "liste-des-factures", colonne: "Échéance" },
    { type: "egalite", a: { ecran: "tableau-de-bord", champ: "CA du mois" }, b: { ecran: "liste-des-factures", champ: "Total" } },
    { type: "egalite", a: { ecran: "tableau-de-bord", champ: "Factures du mois" }, b: { ecran: "liste-des-factures", champ: "Nombre de factures" } },
    { type: "egalite", a: { ecran: "detail-facture", champ: "Total TTC" }, b: { ecran: "liste-des-factures", champ: "Montant TTC de F-119" } },
    { type: "format", ecran: "tableau-de-bord", colonne: "CA du mois", motif: "montant-fr" },
  ]);
});

test("une puce sans ligne regle: est rendue avec null, avec sa phrase et sa ligne", () => {
  const untested = lireNotes(vault, "facturo").flatMap((note) =>
    note.regles.filter(({ regle }) => regle === null).map(({ phrase, ligne }) => [note.chemin, ligne, phrase]),
  );
  assert.deepEqual(untested, [
    ["produit/detail-facture.md", 16, "Le « Total TTC » doit être égal au montant de la facture dans la liste : voir [[regles-entre-ecrans]]."],
    ["produit/liste-des-factures.md", 22, "Sous le tableau, le nombre de factures affichées est indiqué (« 4 factures »)."],
    ["produit/tableau-de-bord.md", 16, "Le « CA du mois » et le nombre de « Factures du mois » doivent correspondre à la liste des factures : voir [[regles-entre-ecrans]]."],
  ]);
  const first = lireNotes(vault, "facturo")[2].regles[0];
  assert.equal(first.phrase, "Le total en bas du tableau est la somme de la colonne « Montant TTC ».");
  assert.equal(first.ligne, 14);
});

test("analyserLigneRegle lit les cinq types", () => {
  assert.deepEqual(analyserLigneRegle("  regle: filtre | filtre: Échéance dépassée | colonne: Échéance | condition: < aujourd_hui", "liste-des-factures"), {
    type: "filtre", ecran: "liste-des-factures", filtre: "Échéance dépassée", colonne: "Échéance", condition: "< aujourd_hui",
  });
  assert.deepEqual(analyserLigneRegle("regle: filtre | filtre: Statut | colonne: Statut | condition: = valeur | valeur: Payée", "liste-des-factures"), {
    type: "filtre", ecran: "liste-des-factures", filtre: "Statut", colonne: "Statut", condition: "= valeur", valeur: "Payée",
  });
  assert.deepEqual(analyserLigneRegle("regle: egalite | a: detail-facture.Total TTC | b: liste-des-factures.Montant de F-1.2"), {
    type: "egalite", a: { ecran: "detail-facture", champ: "Total TTC" }, b: { ecran: "liste-des-factures", champ: "Montant de F-1.2" },
  });
  assert.equal(analyserLigneRegle("regle: somme | colonne: Montant | cible: Total", "detail-facture").type, "somme");
  assert.equal(analyserLigneRegle("regle: presence | colonne: Échéance", "liste-des-factures").type, "presence");
  assert.equal(analyserLigneRegle("regle: format | colonne: Échéance | motif: date-fr", "liste-des-factures").type, "format");
});

test("analyserLigneRegle refuse une ligne hors grammaire en la citant", () => {
  const refused: Array<[string, string | undefined, RegExp]> = [
    ["regle: moyenne | colonne: Montant", "liste-des-factures", /type de règle inconnu « moyenne »/],
    ["colonne: Montant | cible: Total", "liste-des-factures", /type de règle inconnu/],
    ["regle: somme | colonne: Montant TTC", "liste-des-factures", /champ « cible » manquant/],
    ["regle: somme | colonne: Montant TTC | cible: Total", undefined, /champ « ecran » manquant/],
    ["regle: presence", "liste-des-factures", /champ « colonne » manquant/],
    ["regle: format | colonne: Montant TTC | motif: montant-us", "liste-des-factures", /motif « montant-us » hors du contrat/],
    ["regle: format | colonne: Montant TTC", "liste-des-factures", /champ « motif » manquant/],
    ["regle: filtre | filtre: Échéance dépassée | colonne: Échéance | condition: < aujourd'hui", "liste-des-factures", /condition « < aujourd'hui » hors du contrat/],
    ["regle: filtre | colonne: Échéance | condition: < aujourd_hui", "liste-des-factures", /champ « filtre » manquant/],
    ["regle: egalite | a: tableau-de-bord.CA du mois", undefined, /champ « b.ecran » manquant/],
    ["regle: egalite | a: CA du mois | b: liste-des-factures.Total", undefined, /champ « a.ecran » manquant/],
    ["regle: egalite | a: tableau-de-bord. | b: liste-des-factures.Total", undefined, /champ « a.champ » manquant/],
  ];
  for (const [line, screen, reason] of refused) {
    assert.throws(() => analyserLigneRegle(line, screen), (error: Error) => error.message.includes(`« ${line} »`) && reason.test(error.message), line);
  }
});

test("une ligne regle: invalide dans une note nomme le fichier et la ligne", () => {
  const broken = temporaryVault();
  appendFileSync(join(broken, "facturo/produit/tableau-de-bord.md"), "- Règle mal écrite.\n  regle: somme | colonne: CA\n");
  assert.throws(() => lireNotes(broken, "facturo"), /facturo\/produit\/tableau-de-bord\.md, ligne 18 : .*champ « cible » manquant/);
});

test("urlDepart compose l'entrée authentifiée depuis l'url de la note de l'écran", () => {
  assert.equal(urlDepart(vault, "facturo", "13", "liste-des-factures"), "/v13/entrer?suite=/v13/factures");
  assert.equal(urlDepart(vault, "facturo", "12", "tableau-de-bord"), "/v12/entrer?suite=/v12/tableau-de-bord");
  assert.throws(() => urlDepart(vault, "facturo", "13", "ecran-inconnu"), /« ecran-inconnu »/);
});
