import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { creerFauxService } from "./faux-service.mjs";

const index = { format: "horama-passages-1", passages: [{ passage: "p1", constats: [{ id: "c1", statut: "VERIFIED_FAIL" }, { id: "c2", statut: "VERIFIED_FAIL" }] }] };
const proposition = { id: "2026-11-19-admissions--holo--1", decision: "voulu", ecart: "Le titre a changé.", ecran: "admissions", par: "Nathan", le: "2026-11-19T18:00:00Z",
  correction_de_note: { fichier: "produit/admissions.md", avant: "Titre « Admissions ».", apres: "Titre « Candidater ».", statut: "proposee" } };
const vault = [{ chemin: "tests/admissions.md", contenu: "---\nid: admissions\nstatut: propose\n---\n\n## Task\nancien\n\n## Verification\nancienne\n\n```regles\n[]\n```\n" },
  { chemin: "produit/admissions.md", contenu: "# Admissions\n\nTitre « Admissions ».\n" },
  { chemin: "decisions/2026-11-19-admissions--holo--1.md", contenu: `Documentation : correction proposée.\n\n\`\`\`decision\n${JSON.stringify(proposition, null, 2)}\n\`\`\`\n` }];
let t = 1_000_000;
const serveur = creerFauxService({ maintenant: () => t, index, vault });
let base;
before(() => new Promise((ok) => serveur.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${serveur.address().port}`; ok(); })));
after(() => serveur.close());

const appel = (chemin, { jeton, corps, methode = corps ? "POST" : "GET", headers = {} } = {}) =>
  fetch(base + chemin, { method: methode, headers: { "Content-Type": "application/json", ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...headers }, body: corps ? JSON.stringify(corps) : undefined });
const connexion = (mdp = "essai-local") => appel("/tour/session", { corps: { email: "equipe@horama.test", mot_de_passe: mdp } });
const donnees = async () => (await appel("/tour/donnees")).json();

test("mauvaise connexion puis bonne connexion", async () => {
  assert.equal((await connexion("faux")).status, 401);
  const r = await connexion();
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.nom, "Équipe Horama");
  assert.equal(new Date(j.expire_le).getTime(), t + 12 * 3600 * 1000);
});

test("429 au 6e essai", async () => {
  t += 120000; // fresh minute window
  for (let i = 0; i < 5; i++) assert.equal((await connexion("faux")).status, 401);
  assert.equal((await connexion("faux")).status, 429);
  t += 120000;
});

test("jeton expiré, puis falsifié, puis écriture sans jeton", async () => {
  const { jeton } = await (await connexion()).json();
  const corps = { passage: "p1", constat: "c1", decision: "bug" };
  t += 12 * 3600 * 1000 + 1;
  assert.equal((await appel("/tour/decision", { jeton, corps })).status, 401);
  t += 120000;
  const frais = (await (await connexion()).json()).jeton;
  const [p, s] = frais.split(".");
  const faux = `${Buffer.from(JSON.stringify({ nom: "x", exp: t + 1e9 })).toString("base64url")}.${s}`;
  assert.equal((await appel("/tour/decision", { jeton: faux, corps })).status, 401);
  assert.equal((await appel("/tour/decision", { jeton: `${p}.AAAA`, corps })).status, 401);
  assert.equal((await appel("/tour/decision", { corps })).status, 401);
});

test("décision, relecture, double décision, constat inconnu, champs invalides", async () => {
  const { jeton } = await (await connexion()).json();
  const corps = { passage: "p1", constat: "c1", decision: "voulu" };
  const r = await appel("/tour/decision", { jeton, corps });
  assert.equal(r.status, 200);
  // The answer and the index entry as the real service writes them (agent/scripts/tour-service.mjs, tour-vault.mjs).
  assert.deepEqual(await r.json(), { decision: "voulu", par: "Équipe Horama", le: new Date(t).toISOString() });
  const lu = (await donnees()).index;
  const c1 = lu.passages[0].constats[0];
  assert.equal(c1.decision.choix, "voulu");
  assert.equal(c1.decision.decision, "voulu");
  assert.equal(lu.maj, c1.decision.le);
  assert.equal(c1.decision.par, "Équipe Horama");
  assert.equal((await appel("/tour/decision", { jeton, corps })).status, 409);
  assert.equal((await appel("/tour/decision", { jeton, corps: { ...corps, constat: "nope" } })).status, 404);
  assert.equal((await appel("/tour/decision", { jeton, corps: { ...corps, decision: "autre" } })).status, 400);
});

test("test accepté puis relu, modifié, inconnu", async () => {
  const { jeton } = await (await connexion()).json();
  assert.equal((await appel("/tour/test", { jeton, corps: { test: "admissions", action: "accepter" } })).status, 200);
  let note = (await donnees()).vault.find((n) => n.chemin === "tests/admissions.md").contenu;
  assert.match(note, /statut: accepte/);
  assert.match(note, /accepte_par: Équipe Horama/);
  assert.equal((await appel("/tour/test", { jeton, corps: { test: "admissions", action: "modifier", task: "neuve", verification: "nouvelle" } })).status, 200);
  note = (await donnees()).vault.find((n) => n.chemin === "tests/admissions.md").contenu;
  assert.match(note, /## Task\nneuve\n\n## Verification\nnouvelle\n\n```regles\n\[\]\n```\n/);
  assert.equal((await appel("/tour/test", { jeton, corps: { test: "inconnu", action: "refuser" } })).status, 404);
});

test("/tour/doc tranche une proposition du vault, comme le vrai service ; le reste 404", async () => {
  const { jeton } = await (await connexion()).json();
  const corps = { note: "produit/admissions.md", correction: "2026-11-19-admissions--holo--1", action: "accepter" };
  assert.equal((await appel("/tour/doc", { jeton, corps: { ...corps, correction: "un texte libre" } })).status, 400);
  assert.equal((await appel("/tour/doc", { jeton, corps: { ...corps, correction: "inconnue" } })).status, 404);
  const r = await appel("/tour/doc", { jeton, corps });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { statut: "acceptee" });
  const lu = (await donnees()).vault;
  assert.equal(lu.find((n) => n.chemin === "produit/admissions.md").contenu, "# Admissions\n\nTitre « Candidater ».\n");
  assert.match(lu.find((n) => n.chemin === corps.correction.replace(/^/, "decisions/") + ".md").contenu, /"statut": "acceptee"/);
  assert.equal((await appel("/tour/doc", { jeton, corps: { ...corps, action: "refuser" } })).status, 409);
  assert.equal((await appel("/autre")).status, 404);
});

test("en-têtes CORS", async () => {
  const ok = await appel("/tour/donnees", { headers: { Origin: "https://horama-gold.vercel.app" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://horama-gold.vercel.app");
  const local = await appel("/tour/donnees", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(local.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const non = await appel("/tour/donnees", { headers: { Origin: "https://evil.example" } });
  assert.equal(non.headers.get("access-control-allow-origin"), null);
  const pre = await appel("/tour/decision", { methode: "OPTIONS", headers: { Origin: "https://horama-gold.vercel.app" } });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get("access-control-allow-headers"), /Authorization.*Content-Type/);
});
