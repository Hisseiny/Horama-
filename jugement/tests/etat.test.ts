import assert from "node:assert/strict";
import { test } from "node:test";
import type { Regle } from "@horama/contrats";
import { formuler, verifierReleve } from "../index.ts";
import type { ReleveCapture } from "../index.ts";

// The rule « etat » of D7 (section 3), on page texts written by hand: the dark mode of the D7 scenario.
const RULE: Regle = { type: "etat", ecran: "tableau-de-bord", vue: "mode-sombre", texte_present: ["Revenir au mode clair", "Thème sombre"], texte_absent: ["Passer en mode sombre"] };
const capture = (vue: string, texte: string): ReleveCapture => ({ ecran: "tableau-de-bord", vue, version: "13", png: new Uint8Array(), texte, url: "/v13/" });
const judge = (texte: string, regle: Regle = RULE, vue = "mode-sombre") => {
  const releve = capture(vue, texte);
  return verifierReleve({ releve, releves: [releve], regles: [regle], decisions: [] });
};

test("etat : tous les textes attendus et aucun texte interdit, PASS", () => {
  const [constat] = judge("Tableau de bord\nThème sombre\nRevenir au mode clair\nCA du mois\t1 240,00 €");
  assert.equal(constat.statut, "PASS");
  assert.equal(constat.calcul, "présents : 2 sur 2 ; absents : 1 sur 1");
  assert.deepEqual(constat.valeurs, {
    "tableau-de-bord.Revenir au mode clair": "affiché",
    "tableau-de-bord.Thème sombre": "affiché",
    "tableau-de-bord.Passer en mode sombre": "absent",
  });
  assert.deepEqual(formuler(constat), { annonce: "Je vérifie que « Revenir au mode clair » apparaît bien.", resultat: "C'est bon : « Revenir au mode clair » est bien affiché." });
});

test("etat : les textes se comparent sans la casse ni les espaces insécables, en sous-chaîne", () => {
  assert.equal(judge("REVENIR AU MODE   CLAIR — thème sombre activé")[0].statut, "PASS");
});

test("etat : un texte attendu manque alors que l'état est prouvé par un autre, VERIFIED_FAIL", () => {
  const [constat] = judge("Tableau de bord\nRevenir au mode clair");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.calcul, "présents : 1 sur 2, manque « Thème sombre » ; absents : 1 sur 1");
  assert.deepEqual(constat.textes_a_surligner, ["Thème sombre"]);
  assert.deepEqual(formuler(constat), {
    annonce: "Je vérifie que « Revenir au mode clair » apparaît bien.",
    resultat: "Problème : « Thème sombre » n'apparaît pas.",
    question: "Après l'action, « Thème sombre » n'apparaît pas. Bug ou voulu ?",
  });
});

test("etat : un texte interdit est encore affiché, VERIFIED_FAIL", () => {
  const [constat] = judge("Thème sombre\nRevenir au mode clair\nPasser en mode sombre");
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.calcul, "présents : 2 sur 2 ; absents : 0 sur 1, affiché « Passer en mode sombre »");
  assert.deepEqual(constat.textes_a_surligner, ["Passer en mode sombre"]);
  assert.equal(formuler(constat).resultat, "Problème : « Passer en mode sombre » est encore affiché.");
});

test("etat : aucun texte attendu sur la page, l'action n'est pas prouvée : INCONCLUSIVE, jamais un défaut", () => {
  const [constat] = judge("Tableau de bord\nPasser en mode sombre");
  assert.equal(constat.statut, "INCONCLUSIVE");
  assert.match(constat.raison!, /^état non atteint en vue mode-sombre sur tableau-de-bord : aucun des textes attendus \(« Revenir au mode clair », « Thème sombre »\) n'apparaît$/);
  assert.deepEqual(constat.textes_a_surligner, []);
  assert.deepEqual(formuler(constat), { annonce: "Je vérifie que « Revenir au mode clair » apparaît bien.", resultat: "Je ne vois pas la nouveauté : l'action n'a peut-être pas été faite." });
});

test("etat : une règle sans texte témoin n'est jamais jugée réussie", () => {
  const [constat] = judge("Tableau de bord", { type: "etat", ecran: "tableau-de-bord", vue: "mode-sombre", texte_absent: ["Passer en mode sombre"] });
  assert.equal(constat.statut, "INCONCLUSIVE");
  assert.equal(constat.raison, "règle etat sans texte témoin sur tableau-de-bord");
});

test("etat : la règle se juge sur le relevé de sa vue, pas sur la vue « defaut »", () => {
  const page = "Thème sombre\nRevenir au mode clair";
  assert.deepEqual(judge(page, RULE, "defaut"), [], "un relevé de la vue « defaut » ne la décide pas");
  const before = capture("defaut", "Passer en mode sombre");
  const after = capture("mode-sombre", page);
  const constats = verifierReleve({ releve: after, releves: [before, after], regles: [RULE], decisions: [] });
  assert.deepEqual(constats.map(({ id, statut }) => ({ id, statut })), [{ id: "tableau-de-bord--mode-sombre--regle--1", statut: "PASS" }]);
});
