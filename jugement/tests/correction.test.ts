import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, mock, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { Decision } from "@horama/contrats";
import { appliquerCorrection, lireDecisions, lireNotes, ecrireDecision } from "@horama/memoire";
import { proposerCorrection } from "../index.ts";
import { validateAnswer, withVersion } from "../correction/validation.ts";

// No test reaches the network: fetch is replaced. The model answers below are written by hand, to pin what the code accepts
// and refuses; the measure with a real model goes to docs/tests/.
const VAULT = fileURLToPath(new URL("../../vault-horama", import.meta.url));
const MODEL = "openai/gpt-oss-120b";
const LISTE = lireNotes(VAULT, "facturo").find(({ chemin }) => chemin === "produit/liste-des-factures.md")!;
const EXPORTER_BEFORE = "Le bouton « Exporter » se trouve en bas du tableau.";

const EXPORTER: Decision = {
  id: "2026-11-18-liste-des-factures-exporter",
  passage_id: "2026-11-18-14h02",
  test_id: "bouton-exporter-deplacement-liste-factures",
  ecart_id: "liste-des-factures--defaut--visuel--1",
  decision: "voulu",
  logiciel: "facturo",
  ecran: "liste-des-factures",
  vue: "defaut",
  ecart: "« Exporter » a changé de place.",
  zone: { x: 1040, y: 96, largeur: 120, hauteur: 40 },
  version: "13",
  portee: "cet ecart, cet ecran, cette version",
  par: "Léa",
  le: "2026-11-18T14:05:00.000Z",
};

const answer = (phrase_contredite: string | null, nouvelle_phrase: string | null, raison = "choix du modèle") =>
  JSON.stringify({ phrase_contredite, nouvelle_phrase, raison });
const GOOD = answer(EXPORTER_BEFORE, "Le bouton « Exporter » se trouve en haut à droite du tableau.", "La note de version dit que le bouton passe en haut à droite.");

process.env.HF_TOKEN = "jeton-de-test";
afterEach(() => mock.restoreAll());

function router(...answers: Array<string | Response>) {
  const requests: Array<{ model: string; temperature: number; messages: Array<{ role: string; content: string }> }> = [];
  mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    const reply = answers[requests.length - 1];
    if (reply instanceof Response) return reply;
    return new Response(JSON.stringify({ choices: [{ message: { content: reply } }], usage: { prompt_tokens: 900, completion_tokens: 80 } }));
  });
  return requests;
}

// ---------- validateAnswer: what the code accepts and refuses ----------

test("la version est ajoutée par le code, avant le point final", () => {
  assert.equal(withVersion("Le bouton est en haut.", "13"), "Le bouton est en haut (depuis la version 13).");
  assert.equal(withVersion("Le bouton est en haut", "13"), "Le bouton est en haut (depuis la version 13)");
});

test("une bonne réponse donne avant (recopié de la note) et après (avec la version)", () => {
  assert.deepEqual(validateAnswer(GOOD, LISTE, "13"), {
    avant: EXPORTER_BEFORE,
    apres: "Le bouton « Exporter » se trouve en haut à droite du tableau (depuis la version 13).",
    raison: "La note de version dit que le bouton passe en haut à droite.",
    reasons: [],
  });
  assert.deepEqual(validateAnswer("```json\n" + GOOD + "\n```", LISTE, "13").reasons, [], "un bloc de code autour est toléré");
});

test("aucune phrase contredite : pas de correction, et ce n'est pas une erreur", () => {
  assert.deepEqual(validateAnswer(answer(null, null, "La note ne parle pas de cet élément."), LISTE, "13"), { raison: "La note ne parle pas de cet élément.", reasons: [] });
});

test("phrase contredite mais nouvel état inconnu : pas de correction, rien n'est inventé", () => {
  const checked = validateAnswer(answer(EXPORTER_BEFORE, null, "Rien ne dit où est le bouton."), LISTE, "13");
  assert.deepEqual(checked, { raison: "Rien ne dit où est le bouton.", reasons: [] });
});

test("un libellé renommé est accepté quand le changement le donne", () => {
  const before = "Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ».";
  const after = "Le tableau a quatre colonnes : « Numéro », « Société », « Échéance », « Montant TTC ».";
  const change = "Quelque chose a changé ici, autour de « Société ».";
  const sources = `${LISTE.texte}\nChangement validé comme voulu : ${change}`;
  assert.deepEqual(validateAnswer(answer(before, after), LISTE, "13", sources, change).reasons, []);
  assert.match(validateAnswer(answer(before, after), LISTE, "13").reasons[0], /« Société »/, "sans le changement, « Société » est inventé");
});

test("refusé : une correction qui ne parle pas du changement (la note de version en annonce un autre)", () => {
  const change = "Quelque chose a changé ici, autour de « Nouvelle facture ».";
  const { reasons } = validateAnswer(GOOD, LISTE, "13", LISTE.texte, change);
  assert.match(reasons[0], /ne parle pas de ce changement \(« Nouvelle facture »\)/);
  assert.deepEqual(validateAnswer(GOOD, LISTE, "13", LISTE.texte, "« Exporter » a changé de place.").reasons, [], "le bon changement passe");
  assert.deepEqual(validateAnswer(GOOD, LISTE, "13", LISTE.texte, "Quelque chose a changé ici.").reasons, [], "sans libellé, pas de contrôle");
});

test("refusé : une phrase paraphrasée, qui n'est pas mot pour mot dans la note", () => {
  const { reasons } = validateAnswer(answer("Le bouton Exporter est en bas du tableau.", "Le bouton Exporter est en haut."), LISTE, "13");
  assert.match(reasons[0], /apparaît 0 fois dans la note/);
});

test("refusé : une phrase de la partie « Règles », un titre ou l'en-tête", () => {
  for (const phrase of ["Le total en bas du tableau est la somme de la colonne « Montant TTC ».", "Liste des factures", "url: /factures"]) {
    const { reasons } = validateAnswer(answer(phrase, "Une autre phrase avec « Montant TTC »."), LISTE, "13");
    assert.ok(reasons.some((reason) => reason.includes("ne se corrigent pas ici")), phrase);
  }
});

test("refusé : version écrite par le modèle, libellé inventé, phrase identique, phrase vide, JSON illisible", () => {
  const reasonsOf = (content: string) => validateAnswer(content, LISTE, "13").reasons;
  assert.match(reasonsOf(answer(EXPORTER_BEFORE, "Le bouton « Exporter » est en haut à droite depuis la version 13."))[0], /cite une version/);
  assert.match(reasonsOf(answer(EXPORTER_BEFORE, "Le bouton « Télécharger » se trouve en haut à droite du tableau."))[0], /cite des libellés que rien ne donne : « Télécharger »/);
  assert.match(reasonsOf(answer(EXPORTER_BEFORE, EXPORTER_BEFORE))[0], /identique/);
  assert.match(reasonsOf(answer(EXPORTER_BEFORE, " "))[0], /doit être une phrase, ou null/);
  assert.match(reasonsOf(answer(null, "Une phrase."))[0], /doit être null/);
  assert.deepEqual(reasonsOf("Voici ma réponse"), ["la réponse n'est pas un objet JSON"]);
});

// ---------- proposerCorrection, with the router replaced ----------

test("proposerCorrection : la note de l'écran, la note de version et l'écart partent au modèle, à température 0", async () => {
  const requests = router(GOOD);
  const proposal = await proposerCorrection(VAULT, EXPORTER, { indices: ["La mascotte a demandé : « Exporter » est passé du bas au haut à droite. Bug ou voulu ?"] });
  assert.deepEqual(proposal.decision.correction_de_note, {
    fichier: "produit/liste-des-factures.md",
    avant: EXPORTER_BEFORE,
    apres: "Le bouton « Exporter » se trouve en haut à droite du tableau (depuis la version 13).",
    statut: "proposee",
  });
  assert.deepEqual({ modele: proposal.modele, essais: proposal.essais }, { modele: MODEL, essais: 1 });
  assert.equal(requests[0].temperature, 0);
  const user = requests[0].messages[1].content;
  assert.ok(user.includes("Changement validé comme voulu : « Exporter » a changé de place."));
  assert.ok(user.includes("le bouton « Exporter » passe en haut à droite."), "la note de version de la v13");
  assert.ok(user.includes(EXPORTER_BEFORE), "la note de l'écran");
  assert.ok(user.includes("Indice : La mascotte a demandé"));
});

test("proposerCorrection : la correction proposée s'applique au vault par @horama/memoire, et la note se relit", async () => {
  router(GOOD);
  const vault = mkdtempSync(join(tmpdir(), "horama-correction-"));
  after(() => rmSync(vault, { recursive: true, force: true }));
  cpSync(join(VAULT, "facturo", "produit"), join(vault, "facturo", "produit"), { recursive: true });
  cpSync(join(VAULT, "facturo", "notes-de-version"), join(vault, "facturo", "notes-de-version"), { recursive: true });
  const { decision } = await proposerCorrection(vault, EXPORTER);
  ecrireDecision(vault, decision);
  const applied = appliquerCorrection(vault, decision);
  const note = readFileSync(join(vault, "facturo", "produit", "liste-des-factures.md"), "utf8");
  assert.ok(note.includes("Le bouton « Exporter » se trouve en haut à droite du tableau (depuis la version 13)."));
  assert.ok(!note.includes(EXPORTER_BEFORE));
  assert.equal(applied.correction_de_note?.statut, "acceptee");
  assert.equal(lireDecisions(vault, "facturo")[0].correction_de_note?.statut, "acceptee");
  assert.equal(lireNotes(vault, "facturo").find(({ chemin }) => chemin === "produit/liste-des-factures.md")!.regles.length, 5, "les règles se lisent toujours");
});

test("proposerCorrection : une correction d'un autre changement est refusée, le second essai rend « pas de correction »", async () => {
  const requests = router(GOOD, answer(null, null, "La note ne parle pas du bouton « Nouvelle facture »."));
  const decision: Decision = { ...EXPORTER, ecart: "Quelque chose a changé ici, autour de « Nouvelle facture »." };
  const proposal = await proposerCorrection(VAULT, decision);
  assert.equal(proposal.decision.correction_de_note, undefined);
  assert.equal(proposal.essais, 2);
  assert.match(requests[1].messages[3].content, /ne parle pas de ce changement/);
});

test("proposerCorrection : une réponse refusée repart au modèle avec la raison, pour un second essai", async () => {
  const requests = router(answer("Le bouton Exporter est en bas du tableau.", "Le bouton « Exporter » est en haut à droite."), GOOD);
  const proposal = await proposerCorrection(VAULT, EXPORTER);
  assert.equal(proposal.essais, 2);
  assert.equal(proposal.decision.correction_de_note?.avant, EXPORTER_BEFORE);
  assert.deepEqual(requests[1].messages.map(({ role }) => role), ["system", "user", "assistant", "user"]);
  assert.match(requests[1].messages[3].content, /apparaît 0 fois dans la note/);
});

test("proposerCorrection : deux réponses refusées, pas de correction, la raison est dite, pas de troisième appel", async () => {
  const wrong = answer("Le bouton Exporter est en bas du tableau.", "Le bouton « Exporter » est en haut à droite.");
  const requests = router(wrong, wrong, GOOD);
  const proposal = await proposerCorrection(VAULT, EXPORTER);
  assert.equal(proposal.decision.correction_de_note, undefined);
  assert.match(proposal.raison, /^Pas de correction proposée : réponse refusée après 2 essais \(« phrase_contredite » apparaît 0 fois/);
  assert.equal(requests.length, 2);
});

test("proposerCorrection : le modèle ne trouve aucune phrase contredite, la décision reste sans correction", async () => {
  router(answer(null, null, "La note ne dit pas où se trouve la carte « Factures en retard »."));
  const decision: Decision = { ...EXPORTER, ecran: "tableau-de-bord", ecart: "« Factures en retard » a changé de place.", ecart_id: "tableau-de-bord--defaut--visuel--1" };
  const proposal = await proposerCorrection(VAULT, decision);
  assert.equal(proposal.decision, decision);
  assert.equal(proposal.raison, "Pas de correction proposée : La note ne dit pas où se trouve la carte « Factures en retard ».");
});

test("proposerCorrection : un appel en échec ne casse rien, la raison est dite (jamais le jeton), pas de nouvel essai", async () => {
  const requests = router(new Response(JSON.stringify({ error: { message: "Invalid credentials" } }), { status: 401 }), GOOD);
  const proposal = await proposerCorrection(VAULT, EXPORTER);
  assert.equal(proposal.decision.correction_de_note, undefined);
  assert.equal(proposal.raison, "Pas de correction proposée : le modèle n'a pas répondu (HTTP 401 : Invalid credentials).");
  assert.equal(requests.length, 1);
  assert.ok(!proposal.raison.includes("jeton-de-test"));
});

test("proposerCorrection : un bug ou un écran sans note ne coûte aucun appel", async () => {
  const requests = router(GOOD);
  assert.equal((await proposerCorrection(VAULT, { ...EXPORTER, decision: "bug" })).raison, "Un bug ne change pas la documentation.");
  assert.equal((await proposerCorrection(VAULT, { ...EXPORTER, ecran: "parametres" })).raison, "Aucune note de facturo ne décrit l'écran « parametres ».");
  assert.equal(requests.length, 0);
});
