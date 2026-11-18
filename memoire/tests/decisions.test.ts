import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { Decision, EcartVisuel } from "@horama/contrats";
import { c4Resultat, c5Decision } from "@horama/contrats/exemples";
import {
  appliquerCorrection,
  decisionQuiNeutralise,
  ecrireDecision,
  lireDecisions,
  peutValiderReference,
  refuserCorrection,
} from "../index.ts";
import { temporaryVault } from "./vault.ts";

const NOTE = "facturo/produit/liste-des-factures.md";
const read = (vault: string, path: string) => readFileSync(join(vault, path), "utf8");
const ecart: EcartVisuel = c4Resultat.ecarts_visuels[0];
const bug: Decision = { ...c5Decision, id: "2026-11-18-total-faux", decision: "bug", correction_de_note: undefined };

test("décision : aller-retour sans perte, fichier lisible dans Obsidian", () => {
  const vault = temporaryVault();
  const withoutOptions: Decision = { ...bug, ecart_id: undefined, zone: undefined, pourquoi: undefined };
  assert.equal(ecrireDecision(vault, c5Decision), "facturo/decisions/2026-11-18-bouton-exporter.md");
  ecrireDecision(vault, withoutOptions);
  assert.deepEqual(lireDecisions(vault, "facturo"), [c5Decision, JSON.parse(JSON.stringify(withoutOptions))]);

  const text = read(vault, "facturo/decisions/2026-11-18-bouton-exporter.md");
  assert.ok(text.startsWith('---\ndate: 2026-11-18\nversion: "13"\necran: liste-des-factures\nvue: defaut\npar: Léa\ndecision: voulu\n---\n\n'));
  assert.ok(text.includes("\nÉcart : Bouton « Exporter » déplacé en haut à droite\n"));
  assert.ok(text.includes("\nDécision : voulu (Refonte de la barre d'actions (note de version v13))\n"));
  assert.ok(text.includes("\nPortée : cet écart (zone de 140 × 44 px en x = 1060, y = 96), cet écran, cette version. Le reste de l'écran reste vérifié.\n"));
  assert.ok(text.includes("\nDocumentation : correction de produit/liste-des-factures.md proposée, en attente de réponse.\n"));
  assert.doesNotMatch(text, /[\u2013\u2014]/);

  const other = read(vault, "facturo/decisions/2026-11-18-total-faux.md");
  assert.ok(other.includes("\nDécision : bug\nPortée : cet écart, cet écran, cette version."));
  assert.ok(other.includes("\nDocumentation : aucune correction de note proposée.\n"));
});

test("lireDecisions : aucun dossier, aucune décision ; un fichier sans bloc est nommé", () => {
  const vault = temporaryVault();
  assert.deepEqual(lireDecisions(vault, "facturo"), []);
  const path = ecrireDecision(vault, c5Decision);
  writeFileSync(join(vault, path), read(vault, path).replace("```decision", "```json"));
  assert.throws(() => lireDecisions(vault, "facturo"), /facturo\/decisions\/2026-11-18-bouton-exporter\.md : décision illisible \(bloc ```decision absent\)/);
  writeFileSync(join(vault, path), read(vault, path).replace("```json\n{", "```decision\n{,"));
  assert.throws(() => lireDecisions(vault, "facturo"), /facturo\/decisions\/2026-11-18-bouton-exporter\.md : décision illisible/);
});

test("correction appliquée : la note change, le fichier de la décision aussi ; deuxième application refusée", () => {
  const vault = temporaryVault();
  ecrireDecision(vault, c5Decision);
  const before = read(vault, NOTE);

  const applied = appliquerCorrection(vault, c5Decision);
  assert.deepEqual(applied, { ...c5Decision, correction_de_note: { ...c5Decision.correction_de_note!, statut: "acceptee" } });
  const after = read(vault, NOTE);
  assert.equal(after, before.replace(c5Decision.correction_de_note!.avant, c5Decision.correction_de_note!.apres));
  assert.notEqual(after, before);
  assert.deepEqual(lireDecisions(vault, "facturo"), [applied]);
  assert.ok(read(vault, "facturo/decisions/2026-11-18-bouton-exporter.md").includes("Documentation : produit/liste-des-factures.md corrigée (proposition acceptée)."));

  assert.throws(() => appliquerCorrection(vault, c5Decision), /apparaît 0 fois dans produit\/liste-des-factures\.md/);
  assert.throws(() => appliquerCorrection(vault, applied), /est déjà acceptée/);
  assert.throws(() => refuserCorrection(vault, applied), /est déjà acceptée/);
  assert.equal(read(vault, NOTE), after);
  assert.deepEqual(lireDecisions(vault, "facturo"), [applied]);
});

test("correction refusée sans rien écrire : avant absent, avant présent deux fois, pas de correction, fichier hors du logiciel", () => {
  const vault = temporaryVault();
  const before = read(vault, NOTE);
  const withCorrection = (change: Partial<NonNullable<Decision["correction_de_note"]>>): Decision => ({
    ...c5Decision,
    correction_de_note: { ...c5Decision.correction_de_note!, ...change },
  });
  assert.throws(() => appliquerCorrection(vault, withCorrection({ avant: "Le bouton « Exporter » se trouve à gauche." })), /apparaît 0 fois/);
  assert.throws(() => appliquerCorrection(vault, withCorrection({ avant: "Montant TTC" })), /apparaît [2-9] fois/);
  assert.throws(() => appliquerCorrection(vault, withCorrection({ avant: "" })), /apparaît 0 fois/);
  assert.throws(() => appliquerCorrection(vault, bug), /n'a pas de correction de note/);
  assert.throws(() => refuserCorrection(vault, bug), /n'a pas de correction de note/);
  assert.throws(() => appliquerCorrection(vault, withCorrection({ fichier: "../facturo-bis/produit/liste-des-factures.md" })), /sort du dossier facturo/);
  assert.equal(read(vault, NOTE), before);
  assert.deepEqual(lireDecisions(vault, "facturo"), []);
});

test("refuserCorrection : la décision passe à refusee, la note n'est pas touchée", () => {
  const vault = temporaryVault();
  const before = read(vault, NOTE);
  const refused = refuserCorrection(vault, c5Decision);
  assert.equal(refused.correction_de_note?.statut, "refusee");
  assert.equal(read(vault, NOTE), before);
  assert.deepEqual(lireDecisions(vault, "facturo"), [refused]);
  assert.ok(read(vault, "facturo/decisions/2026-11-18-bouton-exporter.md").includes("laissée telle quelle (proposition refusée)."));
});

test("decisionQuiNeutralise : même zone oui ; zone voisine, autre vue, autre version, bug, sans zone : non", () => {
  assert.equal(decisionQuiNeutralise(ecart, "13", [bug, c5Decision]), c5Decision);
  // Shifted by 60 px out of 140: the intersection covers more than half of the zone.
  assert.equal(decisionQuiNeutralise({ ...ecart, zone: { ...ecart.zone, x: 1120 } }, "13", [c5Decision]), c5Decision);
  // Shifted by 80 px: less than half.
  assert.equal(decisionQuiNeutralise({ ...ecart, zone: { ...ecart.zone, x: 1140 } }, "13", [c5Decision]), null);
  // A small zone inside the decided one is covered entirely.
  assert.equal(decisionQuiNeutralise({ ...ecart, zone: { x: 1100, y: 100, largeur: 20, hauteur: 20 } }, "13", [c5Decision]), c5Decision);
  assert.equal(decisionQuiNeutralise({ ...ecart, zone: { ...ecart.zone, x: 1200 } }, "13", [c5Decision]), null, "zone voisine sans recouvrement");
  assert.equal(decisionQuiNeutralise({ ...ecart, vue: "filtre-echeance" }, "13", [c5Decision]), null, "autre vue");
  assert.equal(decisionQuiNeutralise({ ...ecart, ecran: "tableau-de-bord" }, "13", [c5Decision]), null, "autre écran");
  assert.equal(decisionQuiNeutralise(ecart, "14", [c5Decision]), null, "autre version");
  assert.equal(decisionQuiNeutralise(ecart, "13", [{ ...c5Decision, decision: "bug" }]), null, "une décision bug ne neutralise jamais");
  assert.equal(decisionQuiNeutralise(ecart, "13", [{ ...c5Decision, zone: undefined }]), null, "une décision sans zone ne neutralise rien");
  assert.equal(decisionQuiNeutralise(ecart, "13", []), null);
});

test("peutValiderReference : tout tranché voulu oui ; un bug non ; un écart sans décision non", () => {
  const second: EcartVisuel = { ...ecart, id: "ecart-2", description: "Colonne « Montant TTC » renommée", zone: { x: 900, y: 200, largeur: 120, hauteur: 30 } };
  const secondVoulu: Decision = { ...c5Decision, id: "2026-11-18-colonne", ecart_id: "ecart-2", zone: undefined, correction_de_note: undefined };

  assert.deepEqual(peutValiderReference([], [], "13"), { ok: true, raison: "Tous les écarts sont tranchés et aucun n'est un bug." });
  assert.equal(peutValiderReference([ecart, second], [c5Decision, secondVoulu], "13").ok, true);
  // Decided at a previous passage under another ecart id: the zone links the decision to the gap.
  assert.equal(peutValiderReference([{ ...ecart, id: "ecart-7" }], [c5Decision], "13").ok, true);

  const withBug = peutValiderReference([ecart, second], [c5Decision, { ...secondVoulu, decision: "bug" }], "13");
  assert.equal(withBug.ok, false);
  assert.match(withBug.raison, /l'écart ecart-2 \(liste-des-factures, vue defaut : Colonne « Montant TTC » renommée\) est un bug/);

  const undecided = peutValiderReference([ecart, second], [c5Decision], "13");
  assert.equal(undecided.ok, false);
  assert.match(undecided.raison, /l'écart ecart-2 .* n'est pas tranché/);

  assert.equal(peutValiderReference([ecart], [c5Decision], "14").ok, false, "une décision d'une autre version ne compte pas");
  assert.match(peutValiderReference([ecart, second], [], "13").raison, /l'écart ecart-1 /, "nomme le premier écart qui bloque");
});
