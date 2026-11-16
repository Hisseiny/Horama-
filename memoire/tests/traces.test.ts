import assert from "node:assert/strict";
import { mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { RapportPassage, ResultatVerification } from "@horama/contrats";
import { c4Resultat, c6Rapport } from "@horama/contrats/exemples";
import { derniersFichiers, ecrireRapportPassage, ecrireReference, lireReferences } from "../index.ts";
import { temporaryVault } from "./vault.ts";

test("référence écrite au bon chemin, relue dans la liste", () => {
  const vault = temporaryVault();
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(lireReferences(vault, "facturo"), []);
  assert.equal(ecrireReference(vault, "facturo", "liste-des-factures", "defaut", "12", png), "facturo/references/liste-des-factures/defaut--v12.png");
  ecrireReference(vault, "facturo", "liste-des-factures", "filtre-echeance", "13", png);
  ecrireReference(vault, "facturo", "detail-facture", "defaut", "12", png);
  assert.deepEqual(new Uint8Array(readFileSync(join(vault, "facturo/references/liste-des-factures/defaut--v12.png"))), png);
  assert.deepEqual(lireReferences(vault, "facturo"), [
    { ecran: "detail-facture", vue: "defaut", version: "12", chemin: "facturo/references/detail-facture/defaut--v12.png" },
    { ecran: "liste-des-factures", vue: "defaut", version: "12", chemin: "facturo/references/liste-des-factures/defaut--v12.png" },
    { ecran: "liste-des-factures", vue: "filtre-echeance", version: "13", chemin: "facturo/references/liste-des-factures/filtre-echeance--v13.png" },
  ]);
});

test("rapport de passage : résumé par statut, coût null écrit « inconnu », du plus grave au moins grave", () => {
  const vault = temporaryVault();
  const session = c6Rapport.tests[0];
  const rapport: RapportPassage = {
    passage: c6Rapport.passage,
    tests: [
      { ...session, test_id: "conforme", cout_usd: 0.05 },
      { ...session, test_id: "muet", etat: "non_concluant", raison: "session muette", ecrans_releves: [], replay_url: undefined },
      { ...session, test_id: "suspect" },
      session,
      { ...session, test_id: "jamais-verifie" },
    ],
  };
  const pass: ResultatVerification = { ...c4Resultat, test_id: "conforme", statut: "PASS", calcul: "1420.00 = 1420.00", ecarts_visuels: [] };
  const neutralised = { ...c4Resultat.ecarts_visuels[0], statut: "PASS" as const, decision_id: "2026-11-18-bouton-exporter" };
  const resultats: ResultatVerification[] = [
    pass,
    { ...pass, test_id: "suspect", statut: "SUSPECTED", regle: undefined, valeurs: {}, calcul: undefined, niveau_de_preuve: "aucun", ecarts_visuels: [neutralised] },
    { ...pass, test_id: "muet", statut: "INCONCLUSIVE", raison: "écran non atteint", regle: undefined, valeurs: {}, calcul: undefined },
    c4Resultat,
  ];

  assert.equal(ecrireRapportPassage(vault, rapport, resultats), "facturo/passages/2026-11-18-14h02-a1b2.md");
  const text = readFileSync(join(vault, "facturo/passages/2026-11-18-14h02-a1b2.md"), "utf8");

  assert.ok(text.includes("Tests joués : 5. Réussites : 1 (seuls les tests conformes comptent)."));
  assert.ok(text.includes("Durée : 3 min 40 s. Coût : inconnu."));
  assert.ok(text.includes("| défaut prouvé (`VERIFIED_FAIL`) | 1 |\n| suspect (`SUSPECTED`) | 1 |\n| non concluant (`INCONCLUSIVE`) | 2 |\n| conforme (`PASS`) | 1 |"));
  assert.deepEqual(text.split("\n").filter((line) => line.startsWith("## ")), [
    "## ca-du-mois-egal-total : défaut prouvé",
    "## suspect : suspect",
    "## muet : non concluant",
    "## jamais-verifie : non concluant",
    "## conforme : conforme",
  ]);

  assert.ok(text.includes("Session terminée : 1 min 36 s, 10 étapes, coût inconnu. Écrans relevés : tableau-de-bord, liste-des-factures."));
  assert.ok(text.includes("- Statut : défaut prouvé (`VERIFIED_FAIL`), niveau de preuve : releve + calcul."));
  assert.ok(text.includes('- Règle : `{ "type": "egalite", "a": { "ecran": "tableau-de-bord", "champ": "CA du mois" }, "b": { "ecran": "liste-des-factures", "champ": "Total" } }`'));
  assert.ok(text.includes("- Valeurs : tableau-de-bord.CA du mois = 1240.00 ; liste-des-factures.Total = 1420.00"));
  assert.ok(text.includes("- Calcul : 1240.00 != 1420.00, écart 180.00"));
  assert.ok(text.includes("- Écart visuel ecart-1 (liste-des-factures, vue defaut) : Bouton « Exporter » déplacé du bas du tableau vers le haut à droite. Zone de 140 × 44 px en x = 1060, y = 96, à trancher (`SUSPECTED`)."));
  assert.ok(text.includes("- Replay : [session H](https://platform.hcompany.ai/share/…)"));

  assert.ok(text.includes("neutralisé par la décision 2026-11-18-bouton-exporter (`PASS`)."));
  assert.ok(text.includes("Session non concluante (session muette) : 1 min 36 s, 10 étapes, coût inconnu. Écrans relevés : aucun."));
  assert.ok(text.includes("- Raison : écran non atteint"));
  assert.ok(text.includes("- Replay : aucun lien"));
  assert.ok(text.includes("- Aucun résultat de vérification. Replay : [session H]"));
  assert.ok(text.includes("coût 0.05 $."));
  assert.ok(text.includes("- Écarts visuels : aucun"));
  assert.doesNotMatch(text, /[\u2013\u2014]/);
});

test("rapport de passage : coût connu, durée inconnue, résultat d'un test absent du rapport", () => {
  const vault = temporaryVault();
  const passage = { ...c6Rapport.passage, cout_usd: 0.25, duree_s: undefined };
  const text = readFileSync(join(vault, ecrireRapportPassage(vault, { passage, tests: [] }, [c4Resultat])), "utf8");
  assert.ok(text.includes("Durée : inconnue. Coût : 0.25 $."));
  assert.ok(text.includes("Tests joués : 1. Réussites : 0"));
  assert.ok(text.includes("## ca-du-mois-egal-total : défaut prouvé\n\nSession absente du rapport de passage."));
});

test("derniersFichiers : les plus récents d'abord, sans dossiers ni fichiers cachés", () => {
  const vault = temporaryVault();
  mkdirSync(join(vault, ".obsidian"));
  const touch = (path: string, date: string) => {
    writeFileSync(join(vault, path), "x");
    utimesSync(join(vault, path), new Date(date), new Date(date));
  };
  touch(".obsidian/app.json", "2030-01-04T00:00:00Z");
  touch("facturo/.cache", "2030-01-03T00:00:00Z");
  touch("facturo/decisions/recent.md", "2030-01-02T00:00:00Z");
  touch("facturo/produit/tableau-de-bord.md", "2030-01-01T00:00:00Z");
  assert.deepEqual(derniersFichiers(vault, 2), [
    { chemin: "facturo/decisions/recent.md", date: "2030-01-02T00:00:00.000Z" },
    { chemin: "facturo/produit/tableau-de-bord.md", date: "2030-01-01T00:00:00.000Z" },
  ]);
  assert.equal(derniersFichiers(vault, 100).length, 10);
});
