import assert from "node:assert/strict";
import { test } from "node:test";
import { BaseMemoire, creerBaseSupabase } from "./src/base.ts";
import type { Capture, EvenementFil, Passage, RapportPassage, ResultatVerification } from "@horama/contrats";

const passage: Passage = { id: "p1", logiciel: "facturo", version_testee: "13", version_reference: "12", etat: "en_cours", debut: "2026-11-16T12:00:00Z" };
const capture: Capture = { passage_id: "p1", test_id: "t1", session_id: "s1", ecran: "factures", vue: "defaut", version: "13", chemin: "p1/t1/factures--defaut.png", url: "http://localhost/capture.png", largeur: 1280, hauteur: 900, defilement: [0, 0], texte_page: "Total", url_page: "http://localhost/v13/factures", etape: 1, prise_le: passage.debut };
const evenement: EvenementFil = { passage_id: "p1", test_id: "t1", session_id: "s1", horodatage: passage.debut, etape: 1, action: "Ouvre une page", etat_session: "en_cours" };
const rapport: RapportPassage = { passage: { ...passage, etat: "joue", fin: passage.debut, duree_s: 0, cout_usd: null }, tests: [] };
const verification: ResultatVerification = { passage_id: "p1", test_id: "t1", version_testee: "13", version_reference: "12", statut: "INCONCLUSIVE", valeurs: {}, ecrans: [], niveau_de_preuve: "aucun", ecarts_visuels: [], captures: [], raison: "Capture absente" };

test("C4 complet dans resultats, copie mémoire et refus HTTP ou réseau explicites", async () => {
  const memory = new BaseMemoire();
  await memory.enregistrerResultat(verification);
  assert.deepEqual(memory.resultats, [verification]);
  assert.notEqual(memory.resultats[0], verification);
  const base = creerBaseSupabase({ url: "https://example.com", key: "test-key", requete: async (url, init) => {
    assert.equal(String(url), "https://example.com/rest/v1/resultats");
    assert.equal(init!.method, "POST");
    assert.deepEqual(JSON.parse(String(init!.body)), { passage_id: "p1", test_id: "t1", statut: "INCONCLUSIVE", payload: verification });
    return new Response(null, { status: 201 });
  } });
  await base.enregistrerResultat(verification);
  const denied = creerBaseSupabase({ url: "https://example.com", key: "test-key", requete: async () => new Response(null, { status: 403 }) });
  await assert.rejects(denied.enregistrerResultat(verification), /HTTP 403/);
  const offline = creerBaseSupabase({ url: "https://example.com", key: "test-key", requete: async () => { throw new Error("privé"); } });
  await assert.rejects(offline.enregistrerResultat(verification), /erreur réseau/);
});

test("la base mémoire conserve les écritures et remplace une capture sur sa clé unique", async () => {
  const base = new BaseMemoire();
  await base.insererPassage(passage);
  await base.insererEvenement(evenement);
  await base.deposerPng(capture.chemin, new Uint8Array([1]));
  await base.enregistrerCapture(capture);
  await base.enregistrerCapture({ ...capture, texte_page: "Nouveau total" });
  await base.terminerPassage(rapport);
  assert.equal(base.captures.size, 1);
  assert.equal([...base.captures.values()][0].texte_page, "Nouveau total");
  assert.equal(base.evenements.length, 1);
  assert.equal(base.passages.get("p1")?.etat, "joue");
});

test("PostgREST et Storage reçoivent les contrats sans exposer la clé", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const requete: typeof fetch = async (url, init) => { requests.push({ url: String(url), init: init! }); return new Response(null, { status: 201 }); };
  const base = creerBaseSupabase({ url: "http://localhost:54321/", key: "test-key", requete });
  await base.insererPassage(passage);
  await base.insererEvenement(evenement);
  assert.equal(await base.deposerPng(capture.chemin, new Uint8Array([1])), `http://localhost:54321/storage/v1/object/public/captures/${capture.chemin}`);
  await base.enregistrerCapture(capture);
  await base.terminerPassage(rapport);
  assert.equal(requests[0].url, "http://localhost:54321/rest/v1/passages");
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), passage);
  assert.equal(requests[1].url, "http://localhost:54321/rest/v1/evenements");
  assert.equal(new Headers(requests[2].init.headers).get("x-upsert"), "true");
  assert.equal(new Headers(requests[2].init.headers).get("Content-Type"), "image/png");
  assert.match(requests[3].url, /on_conflict=passage_id,test_id,ecran,vue$/);
  assert.equal(new Headers(requests[3].init.headers).get("Prefer"), "resolution=merge-duplicates,return=minimal");
  assert.equal(requests[4].init.method, "PATCH");
  assert.deepEqual(JSON.parse(String(requests[4].init.body)).rapport, rapport);
  assert.ok(requests.every(({ init }) => new Headers(init.headers).get("Authorization") === "Bearer test-key"));
});

test("configuration absente, réseau et refus HTTP donnent des erreurs sans clé", async () => {
  assert.throws(() => creerBaseSupabase({ url: "", key: "" }), /requises côté serveur/);
  const network = creerBaseSupabase({ url: "http://localhost", key: "secret-test", requete: async () => { throw new Error("secret-test"); } });
  await assert.rejects(network.insererPassage(passage), /^Error: Base Supabase inaccessible \(erreur réseau\)\.$/);
  await assert.rejects(network.deposerPng("p/test.png", new Uint8Array()), /Stockage Supabase inaccessible/);
  const denied = creerBaseSupabase({ url: "http://localhost", key: "secret-test", requete: async () => new Response("secret-test", { status: 403 }) });
  await assert.rejects(denied.enregistrerCapture(capture), /^Error: Écriture Supabase refusée \(HTTP 403\)\.$/);
  await assert.rejects(denied.deposerPng("p/test.png", new Uint8Array()), /^Error: Dépôt PNG refusé \(HTTP 403\)\.$/);
});
