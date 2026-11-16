import assert from "node:assert/strict";
import { test } from "node:test";
import { creerSessionH } from "./src/session.ts";
import type { EtapeSession, SessionInput } from "./src/session.ts";
import type { Consigne } from "./src/consigne.ts";

const consigne: Consigne = { tests: [], dropped: [], course: [], start: "http://localhost", task: "Parcours", instructions: "Consigne", tools: [] };
const json = (value: unknown) => new Response(JSON.stringify(value));
const defaults = (): SessionInput => ({ consigne, cle: "dev", onCreated: async () => {}, onStep: async () => {}, onTool: async () => "Continue." });

test("session locale : corps, étapes, appels dédoublonnés, résultats et métriques tardives", async () => {
  const requests: Array<{ url: string; body: any; method: string }> = [];
  const steps: EtapeSession[] = [];
  let polls = 0;
  let tools = 0;
  let stopped = false;
  let created = "";
  const call = { id: "call-1", tool_name: "relever", args: { ecran: "factures", vue: "defaut" } };
  const requete: typeof fetch = async (url, init) => {
    const address = String(url);
    requests.push({ url: address, body: init?.body ? JSON.parse(String(init.body)) : null, method: init?.method ?? "GET" });
    if (address.endsWith("/sessions")) return json({ id: "session-h", status: { status: "running" } });
    if (address.endsWith("/tool_results")) return new Response(null, { status: 204 });
    if (++polls === 1) return new Response(null, { status: 204 });
    if (polls === 2) return json({ first_index: 0, status: "running", metrics: { total_cost: 0.01 }, pending_tool_calls: [call], new_events: [
      { type: "AgentEvent", timestamp: "2026-11-16T12:00:00Z", data: { kind: "policy_event", tool_reqs: [{ tool_name: "click_web" }] } },
      { type: "ActiveStateChangeEvent", data: { state: "awaiting_tool_results", pending_tool_calls: [call] } },
    ] });
    if (polls === 3) return json({ first_index: 2, status: "completed", pending_tool_calls: [call, { id: "end", tool_name: "terminer", args: { etat: "reussi" } }], new_events: [{ type: "MetricsUpdateEvent", data: { total_cost: 0.03 } }] });
    if (polls === 4) return json({ first_index: 3, status: "completed", new_events: [{ type: "MetricsUpdateEvent", data: { total_cost: 0.04 } }] });
    return new Response(null, { status: 204 });
  };
  const session = creerSessionH({ key: "test-key", requete, navigateur: async () => ({ channel: "local-channel", stop: () => { stopped = true; } }) });
  const running = await session({ ...defaults(), onCreated: async (id) => { created = id; }, onStep: async (step) => { steps.push(step); }, onTool: async () => { tools++; return "Phrase de Nathan."; } });
  const result = await running.fin;
  assert.equal(created, "session-h");
  assert.equal(stopped, true);
  assert.equal(tools, 2);
  assert.deepEqual(steps.map(({ action }) => action), ["Clique"]);
  assert.equal(result.cout_usd, 0.04);
  assert.equal(result.etapes, 1);
  assert.equal(result.muted, false);
  assert.equal(requests[0].body.queue, false);
  assert.equal(requests[0].body.agent.environments[0].session_id, "local-channel");
  assert.deepEqual(requests[0].body.agent.environments[0].mode, { type: "visual", markdown: true });
  assert.equal(requests.filter(({ url }) => url.endsWith("/tool_results"))[0].body.result, "Phrase de Nathan.");
  assert.ok(requests.some(({ url }) => url.includes("from_index=3&wait_for_seconds=2")));
});

test("45 secondes sans action : annulation, puis nouveau pont après 35 secondes", async () => {
  let now = 0;
  let stopped = 0;
  let bridges = 0;
  const methods: string[] = [];
  const pauses: number[] = [];
  const session = creerSessionH({
    key: "test-key", maintenant: () => now, pause: async (ms) => { pauses.push(ms); now += ms; },
    navigateur: async () => ({ channel: `channel-${++bridges}`, stop: () => { stopped++; } }),
    requete: async (url, init) => {
      methods.push(init?.method ?? "GET");
      if (String(url).endsWith("/sessions")) return json({ id: `session-${bridges}` });
      if (init?.method === "GET") now += 46_000;
      return new Response(null, { status: 204 });
    },
  });
  assert.equal((await (await session(defaults())).fin).muted, true);
  assert.equal((await (await session(defaults())).fin).muted, true);
  assert.equal(stopped, 2);
  assert.equal(bridges, 2);
  assert.deepEqual(pauses, [35_000]);
  assert.equal(methods.filter((method) => method === "DELETE").length, 2);
});

test("429 est réessayé deux fois et un échec de création ferme le pont sans exposer la clé", async () => {
  let posts = 0;
  let stopped = false;
  const pauses: number[] = [];
  const session = creerSessionH({ key: "secret-test", pause: async (ms) => { pauses.push(ms); }, navigateur: async () => ({ channel: "channel", stop: () => { stopped = true; } }), requete: async () => { posts++; return new Response("secret-test", { status: 429 }); } });
  await assert.rejects(session(defaults()), /^Error: H a répondu 429 sur POST \/sessions\.$/);
  assert.equal(posts, 3);
  assert.equal(stopped, true);
  assert.deepEqual(pauses, [30_000, 30_000]);
});

test("réseau et pont indisponibles donnent un résultat d'échec avec nettoyage", async () => {
  let calls = 0;
  let stopped = false;
  const session = creerSessionH({ key: "test-key", navigateur: async () => ({ channel: "channel", stop: () => { stopped = true; } }), requete: async () => {
    if (++calls === 1) return json({ id: "failed" });
    throw new Error("test-key");
  } });
  const result = await (await session(defaults())).fin;
  assert.equal(stopped, true);
  assert.match(result.erreur!, /interrompue/);
  assert.equal(result.cout_usd, null);
  await assert.rejects(creerSessionH({ key: "test-key" })(defaults()), /pont local/);
});
