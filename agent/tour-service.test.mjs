import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createExplorationService } from "./scripts/exploration-service.mjs";
import { assertWritableBranch } from "./scripts/tour-github.mjs";
import { splitFrontMatter } from "../memoire/src/files.ts";

const githubIndex = "/repos/Hisseiny/eugenia-school-website/contents/index.json";
const githubVault = "/repos/Hisseiny/Horama-";
const testId = "accueil-vers-programmes";
const testPath = `${githubVault}/contents/vault-horama/eugenia-clone/tests/${testId}.md`;
const vaultPath = file => `${githubVault}/contents/vault-horama/eugenia-clone/${file}`;
const correctionId = "2026-11-19-accueil--doc--1";
const decisionPath = vaultPath(`decisions/${correctionId}.md`);
const screenPath = vaultPath("ecrans/accueil.md");
const proposal = { fichier: "ecrans/accueil.md", avant: "Le bouton est bleu.", apres: "Le bouton est vert.", statut: "proposee" };
const decisionMarkdown = correction => [
  "---", "decision: voulu", "---", "", "Écart : bouton vert.",
  `Documentation : correction de ${correction.fichier} proposée, en attente de réponse.`, "",
  "```decision", JSON.stringify({ id: correctionId, decision: "voulu", correction_de_note: correction }, null, 2), "```", "",
].join("\n");
const email = "equipe@example.test";
const password = "mot de passe factice";
const name = "Équipe Horama";
const salt = Buffer.alloc(16, 42);
const env = {
  TOUR_EMAIL: email, TOUR_NOM: name, TOUR_SECRET: "secret-factice-de-32-octets-au-moins",
  TOUR_MOT_DE_PASSE_HASH: `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`,
  GITHUB_TOKEN_TOUR: "jeton-github-factice",
};
const origin = "https://horama-gold.vercel.app";
const hour = 3_600_000;
const payload = { passage: "dev:passage-essai", constat: "accueil--controle--1", decision: "voulu" };
const response = (body, status = 200) => Response.json(body, { status });
const encoded = (text, sha) => ({ sha, encoding: "base64", content: Buffer.from(text).toString("base64") });
const finding = () => ({ id: payload.constat, texte: "Le titre dépasse.", zone: { x: 1, y: 2, largeur: 3, hauteur: 4 }, decision: null });

async function setup(t, { variables = env, run = async () => {}, log = () => {} } = {}) {
  let clock = Date.parse("2026-11-19T16:00:00Z");
  const directory = await mkdtemp(join(tmpdir(), "horama-tour-"));
  const state = {
    index: { format: "horama-passages-1", passages: [{ passage: "passage-essai", commit: "base", constats: [finding()] }] },
    indexSha: "initial-index", testSha: "initial-test", treeSha: "initial-tree",
    markdown: await readFile(new URL(`../vault-horama/eugenia-clone/tests/${testId}.md`, import.meta.url), "utf8"),
    calls: [], files: new Map(), writes: [], beforeWrite: () => undefined, vaultBranch: false, writtenBranches: [],
  };
  async function fetchGitHub(input, init) {
    const url = new URL(input);
    const route = url.pathname;
    state.calls.push([init.method, route]);
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(init.headers.Authorization, `Bearer ${env.GITHUB_TOKEN_TOUR}`);
    if (init.method === "POST") {
      const request = JSON.parse(init.body);
      assert.equal(route, `${githubVault}/git/refs`);
      assert.deepEqual(request, { ref: "refs/heads/horama/vault", sha: "dev-head" });
      state.writtenBranches.push(request.ref);
      if (state.vaultBranch) return response({ message: "Reference already exists" }, 422);
      state.vaultBranch = true;
      return response({ ref: request.ref }, 201);
    }
    if (init.method === "PUT") {
      const request = JSON.parse(init.body);
      state.writtenBranches.push(request.branch);
      const fault = state.beforeWrite(route, request);
      if (fault) return response({}, fault);
      const content = Buffer.from(request.content, "base64").toString();
      if (route === githubIndex) {
        assert.equal(request.branch, "horama/captures");
        if (request.sha !== state.indexSha) return response({}, 409);
        state.index = JSON.parse(content);
        state.indexSha += "-new";
      } else {
        assert.equal(request.branch, "horama/vault");
        assert.ok(state.vaultBranch);
        if (route === testPath) {
          if (request.sha !== state.testSha) return response({}, 409);
          state.markdown = content;
          state.testSha += "-new";
        } else {
          const file = state.files.get(route);
          if (!file || request.sha !== file.sha) return response({}, 409);
          state.files.set(route, { content, sha: `${file.sha}-new` });
        }
        state.treeSha += "-new";
      }
      state.writes.push(route);
      return response({ commit: { sha: "commit-github" } }, 201);
    }
    if (route === githubIndex) {
      assert.equal(url.searchParams.get("ref"), "horama/captures");
      return response(encoded(JSON.stringify(state.index), state.indexSha));
    }
    if (route === `${githubVault}/git/ref/heads/horama/vault`) {
      return state.vaultBranch ? response({ object: { sha: "vault-head" } }) : response({}, 404);
    }
    if (route === `${githubVault}/git/ref/heads/dev`) return response({ object: { sha: "dev-head" } });
    if (route === testPath) {
      assert.equal(url.searchParams.get("ref"), "horama/vault");
      return response(encoded(state.markdown, state.testSha));
    }
    if (state.files.has(route)) {
      assert.equal(url.searchParams.get("ref"), "horama/vault");
      const file = state.files.get(route);
      return response(encoded(file.content, file.sha));
    }
    if (route === `${githubVault}/contents/vault-horama`) {
      const ref = url.searchParams.get("ref");
      assert.ok(ref === "horama/vault" || ref === "dev");
      if (ref === "horama/vault" && !state.vaultBranch) return response({ message: "No commit found for the ref horama/vault" }, 404);
      return response([{ name: "eugenia-clone", type: "dir", sha: ref === "dev" ? state.treeSha : state.vaultTreeSha ?? state.treeSha }]);
    }
    if (route === `${githubVault}/git/trees/${state.treeSha}`) {
      assert.equal(url.searchParams.get("recursive"), "1");
      return response({ tree: [{ type: "blob", mode: "100644", path: `tests/${testId}.md`, sha: state.testSha }] });
    }
    if (route === `${githubVault}/git/blobs/${state.testSha}`) return response(encoded(state.markdown, state.testSha));
    return response({}, 404);
  }
  const { server, stop } = createExplorationService({
    data: directory, now: () => clock, run, resolveAddress: async () => {}, tour: { env: variables, fetchGitHub, log },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await stop();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const request = (route, options) => fetch(`http://127.0.0.1:${server.address().port}${route}`, options);
  const post = (route, body, headers = {}) => request(route, { method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers } });
  const login = (pass = password, headers) => post("/tour/session", { email, mot_de_passe: pass }, headers);
  const session = async () => {
    const reply = await login();
    assert.equal(reply.status, 200);
    const data = await reply.json();
    assert.deepEqual({ nom: data.nom, expire_le: data.expire_le }, { nom: name, expire_le: new Date(clock + 12 * hour).toISOString() });
    return { Authorization: `Bearer ${data.jeton}` };
  };
  return { request, post, login, session, state, advance: ms => { clock += ms; } };
}

test("login uses the team password, throttles after five attempts per minute and renews the limit", async t => {
  const { login, advance } = await setup(t, { variables: { ...env, RAILWAY_ENVIRONMENT_ID: "fake" } });
  const client = { "X-Real-IP": "192.0.2.11", Origin: origin };
  for (let i = 0; i < 5; i++) assert.equal((await login("incorrect", client)).status, 401);
  const limited = await login(password, client);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.equal(limited.headers.get("access-control-allow-origin"), origin);
  assert.equal((await login(password, { "X-Real-IP": "192.0.2.12" })).status, 200);
  advance(60_000);
  assert.equal((await login(password, client)).status, 200);
});

test("CORS is restricted to the Vercel tour and loopback, while existing exploration CORS stays public", async t => {
  const { request, post } = await setup(t);
  for (const allowed of [origin, "http://127.0.0.1:4321"]) {
    const preflight = await request("/tour/decision", { method: "OPTIONS", headers: { Origin: allowed } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), allowed);
    assert.match(preflight.headers.get("access-control-allow-headers"), /Authorization/);
    assert.equal(preflight.headers.get("vary"), "Origin");
  }
  const refused = await post("/tour/session", {}, { Origin: "https://horama-gold.vercel.app.example.test" });
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.has("access-control-allow-origin"), false);
  assert.equal((await request("/explorations", { method: "OPTIONS" })).headers.get("access-control-allow-origin"), "*");
});

test("all writes reject missing, forged and expired tokens", async t => {
  const { post, session, advance, state } = await setup(t);
  for (const path of ["/tour/decision", "/tour/test", "/tour/doc"]) {
    assert.equal((await post(path, payload)).status, 401);
  }
  const token = await session();
  const forged = { Authorization: token.Authorization.replace(/\.[^.]+$/, "." + "A".repeat(43)) };
  assert.equal((await post("/tour/decision", payload, forged)).status, 401);
  assert.equal((await post("/tour/doc", {}, forged)).status, 401);
  advance(12 * hour);
  assert.equal((await post("/tour/decision", payload, token)).status, 401);
  assert.deepEqual(state.calls, []);
});

test("public tour data caches GitHub for ten seconds and includes current exploration summaries", async t => {
  let complete;
  const finished = new Promise(resolve => { complete = resolve; });
  const { request, post, advance, state } = await setup(t, { run: async job => {
    await mkdir(job.directory, { recursive: true });
    await writeFile(join(job.directory, "exploration.json"), JSON.stringify({ format: "horama-exploration-1", etat: "fini",
      totaux: { pages_visitees: 3, defauts: 0, doutes: 2 }, duree_s: 6, cout_usd: 0 }));
    complete();
  } });
  const [a, b] = await Promise.all([request("/tour/donnees"), request("/tour/donnees")]);
  const snapshot = await a.json();
  assert.equal(a.status, 200);
  assert.deepEqual(await b.json(), snapshot);
  assert.deepEqual(snapshot, { index: state.index, vault: [{ chemin: `tests/${testId}.md`, contenu: state.markdown }],
    agent: { disponible: true, file_attente: 0 }, explorations: [] });
  assert.deepEqual(state.calls.filter(([, route]) => route.endsWith("/contents/vault-horama")).length, 2);
  assert.equal(state.calls.length, 5);
  const { id } = await (await post("/explorations", { url: "https://example.test/?parametre=prive" })).json();
  await finished;
  const next = await (await request("/tour/donnees")).json();
  assert.deepEqual(next.explorations, [{
    id, url: "https://example.test/", date: "2026-11-19T16:00:00.000Z",
    etat: "fini", pages: 3, defauts: 0, doutes: 2, duree_s: 6, cout_usd: 0,
  }]);
  assert.equal(state.calls.length, 5);
  advance(10_000);
  assert.equal((await request("/tour/donnees")).status, 200);
  assert.equal(state.calls.length, 8);
});

test("public tour data reads the vault from horama/vault once that branch exists", async t => {
  const { request, state } = await setup(t);
  state.vaultBranch = true;
  const snapshot = await (await request("/tour/donnees")).json();
  assert.equal(snapshot.vault[0].chemin, `tests/${testId}.md`);
  const vaultReads = state.calls.filter(([, route]) => route.endsWith("/contents/vault-horama"));
  assert.equal(vaultReads.length, 1);
});

test("decisions retry a changed SHA, preserve concurrent index updates and write only index.json", async t => {
  const { post, request, session, state } = await setup(t);
  const token = await session();
  await (await request("/tour/donnees")).json();
  let conflict = true;
  state.beforeWrite = route => {
    if (route === githubIndex && conflict) {
      conflict = false;
      state.indexSha = "other-write";
      state.index.passages.push({ passage: "another", constats: [] });
      return 409;
    }
  };
  const first = await post("/tour/decision", payload, token);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { decision: "voulu", par: name, le: "2026-11-19T16:00:00.000Z" });
  const snapshot = await (await request("/tour/donnees")).json();
  assert.equal(snapshot.index.passages[1].passage, "another");
  assert.deepEqual(snapshot.index.passages[0].constats[0].decision, {
    choix: "voulu", decision: "voulu", par: name, le: "2026-11-19T16:00:00.000Z",
  });
  assert.equal(snapshot.index.maj, "2026-11-19T16:00:00.000Z");
  assert.equal((await post("/tour/decision", { ...payload, decision: "bug" }, token)).status, 409);
  assert.deepEqual(state.writes, [githubIndex]);
  assert.ok(state.calls.every(([method, route]) => method === "GET" || route === githubIndex));
});

test("an unknown passage or finding answers 404 without writing", async t => {
  const { post, session, state } = await setup(t);
  const token = await session();
  assert.equal((await post("/tour/decision", { ...payload, passage: "inconnu" }, token)).status, 404);
  assert.equal((await post("/tour/decision", { ...payload, constat: "inconnu" }, token)).status, 404);
  assert.equal((await post("/tour/decision", { ...payload, decision: "peut-etre" }, token)).status, 400);
  assert.deepEqual(state.writes, []);
});

test("a GitHub refusal answers 503 with its status and logs it", async t => {
  const logs = [];
  const { post, session, state } = await setup(t, { log: message => logs.push(message) });
  state.beforeWrite = () => 403;
  const reply = await post("/tour/decision", payload, await session());
  assert.equal(reply.status, 503);
  assert.match((await reply.json()).erreur, /GitHub 403/);
  assert.deepEqual(logs, ["Tour /tour/decision : GitHub 403 : GitHub indisponible."]);
  assert.deepEqual(state.writes, []);
});

test("simultaneous choices have one winner and existing scene decisions remain untouched", async t => {
  const { post, session, state } = await setup(t);
  const token = await session();
  const choices = await Promise.all([post("/tour/decision", payload, token), post("/tour/decision", { ...payload, decision: "bug" }, token)]);
  assert.deepEqual(choices.map(result => result.status).sort(), [200, 409]);
  assert.equal(state.writes.length, 1);
  const legacy = { ...finding(), id: "ancien", decision: { choix: "bug", par: "Nathan", le: "2026-11-18T20:00:00Z" } };
  state.index.passages[0].constats.push(legacy);
  assert.equal((await post("/tour/decision", { ...payload, constat: legacy.id }, token)).status, 409);
  assert.equal(state.writes.length, 1);
});

test("accepting, refusing and editing a vault test preserves unrelated fields and rules", async t => {
  const { post, session, state } = await setup(t);
  const token = await session();
  const edit = (action, changes = {}) => post("/tour/test", { test: testId, action, ...changes }, token);
  const originalRules = state.markdown.slice(state.markdown.indexOf("```regles"));
  assert.equal((await edit("refuser")).status, 200);
  assert.equal(splitFrontMatter(state.markdown).header.statut, "refuse");
  assert.equal(splitFrontMatter(state.markdown).header.accepte_par, undefined);
  assert.equal((await edit("accepter")).status, 200);
  assert.equal(splitFrontMatter(state.markdown).header.accepte_par, name);
  const changes = { task: "1. Ouvrir la page.", verification: "- FAIL if la page ne charge pas." };
  assert.equal((await edit("modifier", changes)).status, 200);
  assert.match(state.markdown, /1\. Ouvrir la page\.\n2\. Pour chaque relevé/);
  assert.ok(state.markdown.includes(changes.verification));
  assert.ok(state.markdown.endsWith(originalRules));
  assert.equal((await edit("modifier", changes)).status, 200);
  assert.equal(state.writes.length, 3);
  assert.deepEqual(state.writtenBranches, ["refs/heads/horama/vault", "horama/vault", "horama/vault", "horama/vault"]);
  assert.equal((await edit("modifier", { task: "## Verification\n" })).status, 400);
  assert.equal((await edit("refuser", { test: "../note" })).status, 400);
});

test("missing Railway secrets leave exploration healthy and fail tour requests closed with a visible reason", async t => {
  const { request, login, post, state } = await setup(t, { variables: {} });
  assert.equal((await request("/sante")).status, 200);
  const data = await request("/tour/donnees");
  assert.equal(data.status, 503);
  const body = await data.json();
  assert.match(body.erreur, /GITHUB_TOKEN_TOUR/);
  assert.deepEqual({ agent: body.agent, explorations: body.explorations }, { agent: { disponible: true, file_attente: 0 }, explorations: [] });
  const refused = await login();
  assert.equal(refused.status, 503);
  assert.match((await refused.json()).erreur, /TOUR_EMAIL, TOUR_NOM, TOUR_MOT_DE_PASSE_HASH, TOUR_SECRET/);
  assert.equal((await post("/tour/decision", payload, { Authorization: "Bearer x" })).status, 503);
  for (let i = 0; i < 4; i++) await login();
  assert.equal((await login()).status, 429);
  assert.deepEqual(state.calls, []);
});

test("outside Railway a forged X-Real-IP header does not escape the login limit", async t => {
  const { login } = await setup(t);
  for (let i = 0; i < 5; i++) assert.equal((await login("incorrect", { "X-Real-IP": `192.0.2.${i}` })).status, 401);
  assert.equal((await login(password, { "X-Real-IP": "192.0.2.99" })).status, 429);
});

test("the vault branch is created from dev once, and an existing branch is reused", async t => {
  const { post, session, state } = await setup(t);
  state.vaultBranch = true;
  const token = await session();
  assert.equal((await post("/tour/test", { test: testId, action: "accepter" }, token)).status, 200);
  assert.deepEqual(state.writtenBranches, ["horama/vault"]);
  assert.equal((await post("/tour/test", { test: "inconnu", action: "accepter" }, token)).status, 404);
  assert.equal(state.calls.filter(([, route]) => route.includes("/git/ref")).length, 1);
});

test("the service never writes to dev or main, only to its two data branches", async t => {
  for (const [repo, branch] of [["Hisseiny/Horama-", "dev"], ["Hisseiny/Horama-", "main"],
    ["Hisseiny/eugenia-school-website", "main"], ["Hisseiny/Horama-", "horama/captures"],
    ["Hisseiny/eugenia-school-website", "horama/vault"], ["Hisseiny/Horama-", "refs/heads/horama/vault"], ["Autre/depot", "horama/vault"]]) {
    assert.throws(() => assertWritableBranch(repo, branch), /Écriture refusée/);
  }
  assert.doesNotThrow(() => assertWritableBranch("Hisseiny/eugenia-school-website", "horama/captures"));
  assert.doesNotThrow(() => assertWritableBranch("Hisseiny/Horama-", "horama/vault"));
  const { post, session, state } = await setup(t);
  const token = await session();
  await post("/tour/decision", payload, token);
  await post("/tour/test", { test: testId, action: "accepter" }, token);
  assert.ok(state.writtenBranches.length >= 3);
  assert.ok(state.writtenBranches.every(branch => ["horama/captures", "horama/vault", "refs/heads/horama/vault"].includes(branch)));
  assert.ok(state.calls.every(([method, route]) => method === "GET" || route === githubIndex ||
    route === testPath || route === `${githubVault}/git/refs`));
});

function withCorrection(state, correction = proposal, screen = "# Accueil\n\nLe bouton est bleu.\n") {
  state.vaultBranch = true;
  state.files.set(decisionPath, { content: decisionMarkdown(correction), sha: "decision" });
  state.files.set(screenPath, { content: screen, sha: "screen" });
}
const closedStatus = state => JSON.parse(/```decision\n([\s\S]*?)```/.exec(state.files.get(decisionPath).content)[1]).correction_de_note.statut;

test("accepting a doc correction edits the note then closes the proposal, on horama/vault only", async t => {
  const { post, session, state } = await setup(t);
  withCorrection(state);
  const token = await session();
  const answer = { note: proposal.fichier, correction: correctionId, action: "accepter" };
  const reply = await post("/tour/doc", answer, token);
  assert.equal(reply.status, 200);
  assert.deepEqual(await reply.json(), { statut: "acceptee" });
  assert.equal(state.files.get(screenPath).content, "# Accueil\n\nLe bouton est vert.\n");
  assert.equal(closedStatus(state), "acceptee");
  assert.match(state.files.get(decisionPath).content, /^Documentation : ecrans\/accueil\.md corrigée \(proposition acceptée\)\.$/m);
  assert.deepEqual(state.writes, [screenPath, decisionPath]);
  assert.deepEqual(state.writtenBranches, ["horama/vault", "horama/vault"]);
  assert.equal((await post("/tour/doc", answer, token)).status, 409);
  assert.equal(state.writes.length, 2);
});

test("refusing a doc correction leaves the note untouched", async t => {
  const { post, session, state } = await setup(t);
  withCorrection(state);
  const token = await session();
  const reply = await post("/tour/doc", { note: proposal.fichier, correction: correctionId, action: "refuser" }, token);
  assert.equal(reply.status, 200);
  assert.deepEqual(await reply.json(), { statut: "refusee" });
  assert.equal(state.files.get(screenPath).content, "# Accueil\n\nLe bouton est bleu.\n");
  assert.equal(closedStatus(state), "refusee");
  assert.deepEqual(state.writes, [decisionPath]);
});

test("a doc correction is refused when ambiguous, unknown or outside the vault, and resumes after a partial write", async t => {
  const { post, session, state } = await setup(t);
  withCorrection(state, proposal, "Le bouton est bleu. Le bouton est bleu.");
  const token = await session();
  const send = changes => post("/tour/doc", { note: proposal.fichier, correction: correctionId, action: "accepter", ...changes }, token);
  const ambiguous = await send();
  assert.equal(ambiguous.status, 409);
  assert.match((await ambiguous.json()).erreur, /2 fois/);
  assert.equal((await send({ note: "ecrans/autre.md" })).status, 404);
  assert.equal((await send({ correction: "inconnue" })).status, 404);
  for (const note of ["../../AGENTS.md", "/etc/passwd.md", "ecrans/accueil.txt"]) assert.equal((await send({ note })).status, 400);
  assert.equal((await send({ correction: "../tests/x" })).status, 400);
  assert.equal((await send({ action: "modifier" })).status, 400);
  assert.deepEqual(state.writes, []);
  withCorrection(state, proposal, "Le bouton est vert.");
  assert.equal((await send()).status, 200);
  assert.deepEqual(state.writes, [decisionPath]);
  assert.equal(closedStatus(state), "acceptee");
});
