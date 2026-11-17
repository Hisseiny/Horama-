import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { BaseMemoire } from "./src/base.ts";
import { construireConsigne } from "./src/consigne.ts";
import { creerCoureur } from "./src/coureur.ts";
import type { OptionsCoureur, ReleveCapture } from "./src/coureur.ts";
import type { SessionInput } from "./src/session.ts";

const source = fileURLToPath(new URL("../vault-horama/facturo", import.meta.url));
const baseUrl = "http://localhost:3100";
const input = { logiciel: "facturo", version_testee: "13", version_reference: "12", tests: ["ca-du-mois-egal-total", "detail-facture-total-egal-liste"] };
let vault: string;
beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "horama-hook-"));
  cpSync(source, join(vault, "facturo"), { recursive: true });
  rmSync(join(vault, "facturo/references"), { recursive: true, force: true });
});
afterEach(() => { rmSync(vault, { recursive: true, force: true }); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture(ecran: string): ReleveCapture {
  const path = ecran === "tableau-de-bord" ? "/tableau-de-bord" : ecran === "detail-facture" ? "/factures/F-119" : "/factures";
  return { png: new Uint8Array([1]), texte: ecran === "tableau-de-bord" ? "CA du mois\n1 420,00 €" : "Numéro\tMontant TTC\nF-119\t1 420,00 €\nTotal\t1 420,00 €",
    url_page: `${baseUrl}/v13${path}`, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture enregistrée." };
}

function fakeH({ hold = false, refuseDelete = false } = {}) {
  const polling = deferred<void>();
  const toolResults: string[] = [];
  let deletes = 0;
  let stops = 0;
  let polls = 0;
  const course = construireConsigne({ vault, logiciel: "facturo", version: "13", ids: input.tests, baseUrl }).course;
  const calls = [...course.map(({ ecran, vue }) => ({ tool_name: "relever", args: { ecran, vue } })), { tool_name: "terminer", args: { etat: "reussi" } }];
  const json = (value: unknown) => new Response(JSON.stringify(value));
  const h = {
    key: "factice",
    navigateur: async () => ({ channel: "channel-hook", stop() { stops++; } }),
    requete: (async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path.endsWith("/sessions")) return json({ id: "session-hook", status: { status: "running" } });
      if (init?.method === "DELETE") { deletes++; return new Response(null, { status: refuseDelete ? 403 : 204 }); }
      if (path.endsWith("/share")) return json({ share_url: "/share/replay-hook" });
      if (path.endsWith("/tool_results")) { toolResults.push(JSON.parse(String(init!.body)).result); return new Response(null, { status: 204 }); }
      polling.resolve();
      if (hold) return new Promise<Response>(() => {});
      const call = calls[polls++];
      return call ? json({ status: "running", pending_tool_calls: [{ ...call, id: `call-${polls}` }], new_events: [
        { type: "AgentEvent", data: { kind: "policy_event", tool_reqs: [{ tool_name: call.tool_name }] } },
      ] }) : json({ status: "completed", new_events: [] });
    }) as typeof fetch,
  };
  return { h, polling, toolResults, deletes: () => deletes, stops: () => stops };
}

function setup(options: Partial<OptionsCoureur> = {}, fake = fakeH()) {
  const base = new BaseMemoire();
  const messages: string[] = [];
  const runner = creerCoureur({ vault, base, baseUrl, h: fake.h, relever: async (ecran) => fixture(ecran), signaler: (message) => messages.push(message), ...options });
  return { base, messages, runner, fake };
}

test("timeout du crochet : aucune capture tardive, C4 ciblé, rapport et PATCH final", { timeout: 2000 }, async () => {
  const late = deferred<ReleveCapture>();
  let hookSignal: AbortSignal | undefined;
  const { runner, base, messages, fake } = setup({ hookTimeoutMs: 10, relever: async (ecran, _vue, signal) => {
    if (ecran !== "detail-facture") return fixture(ecran);
    hookSignal = signal;
    return late.promise;
  } });
  const { passage_id } = await runner.lancerPassage(input);
  const report = await runner.attendreFin(passage_id);
  assert.equal(hookSignal?.aborted, true);
  assert.equal(report.passage.etat, "echec");
  assert.ok(report.passage.fin);
  assert.equal(base.captures.size, 2);
  assert.equal(base.fichiers.size, 2);
  assert.deepEqual(base.resultats.map(({ statut }) => statut), ["PASS", "INCONCLUSIVE"]);
  assert.match(base.resultats[1].raison!, /crochet relever dépassé \(10 ms\)/);
  assert.match(messages.join("\n"), /detail-facture\/defaut/);
  assert.ok(fake.toolResults.some((message) => message.includes("Délai du crochet")));
  assert.equal(fake.stops(), 1);
  assert.deepEqual(base.rapports.get(passage_id), report);
  assert.match(readFileSync(join(vault, "facturo/passages", `${passage_id}.md`), "utf8"), /INCONCLUSIVE/);
  late.resolve(fixture("detail-facture"));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(base.captures.size, 2);
  assert.equal(base.fichiers.size, 2);
});

test("le timeout du crochet est plafonné par timeout_s des tests concernés", { timeout: 2000 }, async () => {
  const file = join(vault, "facturo/tests/ca-du-mois-egal-total.md");
  writeFileSync(file, readFileSync(file, "utf8").replace(/timeout_s: \d+/, "timeout_s: 0.01"));
  const { runner, base } = setup({ hookTimeoutMs: 1000, relever: () => new Promise(() => {}) });
  const { passage_id } = await runner.lancerPassage({ ...input, tests: [input.tests[0]] });
  await runner.attendreFin(passage_id);
  assert.match(base.resultats[0].raison!, /\(10 ms\)/);
});

for (const duringHook of [true, false]) {
  test(`annulation ${duringHook ? "pendant le crochet" : "pendant le polling H"} : arrêt H/pont, finalisation et raison`, { timeout: 2000 }, async () => {
    const controller = new AbortController();
    const entered = deferred<void>();
    const late = deferred<ReleveCapture>();
    let hookSignal: AbortSignal | undefined;
    const fake = fakeH({ hold: !duringHook, refuseDelete: !duringHook });
    const { runner, base, messages } = setup({ signal: controller.signal, relever: async (_ecran, _vue, signal) => {
      hookSignal = signal;
      entered.resolve();
      return late.promise;
    } }, fake);
    const { passage_id } = await runner.lancerPassage(input);
    await (duringHook ? entered.promise : fake.polling.promise);
    controller.abort("arrêt demandé par la scène");
    const report = await runner.attendreFin(passage_id);
    assert.equal(report.passage.etat, "echec");
    assert.ok(report.passage.fin);
    assert.equal(base.captures.size, 0);
    assert.equal(base.fichiers.size, 0);
    assert.equal(fake.deletes(), 1);
    assert.equal(fake.stops(), 1);
    assert.ok(report.tests.every(({ etat, raison }) => etat === "non_concluant" && raison?.includes("arrêt demandé par la scène")));
    assert.equal(base.resultats.length, input.tests.length);
    assert.ok(base.resultats.every(({ statut, raison }) => statut === "INCONCLUSIVE" && raison?.includes("arrêt demandé par la scène")));
    assert.deepEqual(base.rapports.get(passage_id), report);
    assert.match(messages.join("\n"), /arrêt demandé par la scène/);
    if (duringHook) assert.equal(hookSignal?.aborted, true);
    else assert.match(messages.join("\n"), /arrêt H non confirmé/);
    late.resolve(fixture("tableau-de-bord"));
    await Promise.resolve();
    assert.equal(base.captures.size, 0);
  });
}

test("une session injectée qui ignore le signal est abandonnée sans accepter ses outils tardifs", { timeout: 2000 }, async () => {
  const controller = new AbortController();
  let sessionInput!: SessionInput;
  let stops = 0;
  const { runner, base } = setup({ signal: controller.signal, h: undefined, session: async (settings) => {
    sessionInput = settings;
    await settings.onCreated("injection");
    return { id: "injection", fin: new Promise(() => {}), stop: async () => { stops++; } };
  } });
  const { passage_id } = await runner.lancerPassage(input);
  controller.abort("abandon");
  await runner.attendreFin(passage_id);
  assert.equal(stops, 1);
  assert.match(await sessionInput.onTool("relever", { ecran: "tableau-de-bord", vue: "defaut" }), /Passage arrêté/);
  assert.equal(base.captures.size, 0);
});

test("signal déjà annulé : aucune session créée, passage finalisé et raison conservée", async () => {
  let calls = 0;
  const { runner, base } = setup({ signal: AbortSignal.abort("avant lancement"), h: undefined, session: async () => { calls++; throw new Error(); } });
  const { passage_id } = await runner.lancerPassage(input);
  assert.equal(calls, 0);
  assert.equal((await runner.attendreFin(passage_id)).passage.etat, "echec");
  assert.ok(base.resultats.every(({ raison }) => raison?.includes("avant lancement")));
});

test("annulation pendant la création du pont : un pont livré tardivement est arrêté", { timeout: 2000 }, async () => {
  const controller = new AbortController();
  const opening = deferred<void>();
  const browser = deferred<{ channel: string; stop(): void }>();
  const stopped = deferred<void>();
  let requests = 0;
  const { runner, base } = setup({ signal: controller.signal, h: {
    key: "factice", navigateur: () => { opening.resolve(); return browser.promise; },
    requete: async () => { requests++; throw new Error(); },
  } });
  const starting = runner.lancerPassage(input);
  await opening.promise;
  controller.abort("pont trop lent");
  const { passage_id } = await starting;
  assert.equal((await runner.attendreFin(passage_id)).passage.etat, "echec");
  browser.resolve({ channel: "pont-tardif", stop() { stopped.resolve(); } });
  await stopped.promise;
  assert.equal(requests, 0);
  assert.ok(base.resultats.every(({ raison }) => raison?.includes("pont trop lent")));
});

test("sans annulation ni timeout : captures, événements, C4 calculé et rapport normaux", async () => {
  const { runner, base, fake, messages } = setup();
  const { passage_id } = await runner.lancerPassage(input);
  const report = await runner.attendreFin(passage_id);
  assert.equal(report.passage.etat, "joue");
  assert.ok(report.tests.every(({ etat }) => etat === "termine"));
  assert.equal(base.captures.size, 3);
  assert.equal(base.evenements.length, 4);
  assert.equal(base.resultats[0].statut, "PASS");
  assert.equal(fake.stops(), 1);
  assert.equal(fake.deletes(), 0);
  assert.deepEqual(messages, []);
});

test("délai invalide refusé et exception ordinaire du crochet sans capture", async () => {
  for (const hookTimeoutMs of [0, -1, NaN, Infinity, 2_147_483_648]) {
    assert.throws(() => setup({ hookTimeoutMs }), /hookTimeoutMs/);
  }
  const { runner, base } = setup({ relever: async () => { throw new Error("capture indisponible"); } });
  const { passage_id } = await runner.lancerPassage(input);
  assert.ok((await runner.attendreFin(passage_id)).tests.every(({ etat }) => etat === "non_concluant"));
  assert.equal(base.captures.size, 0);
  assert.ok(base.resultats.every(({ statut }) => statut === "INCONCLUSIVE"));
});
