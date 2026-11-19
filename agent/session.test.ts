import assert from "node:assert/strict";
import { test } from "node:test";
import { creerSessionH, libelleAction } from "./src/session.ts";
import type { EtapeSession, SessionInput } from "./src/session.ts";
import type { Consigne } from "./src/consigne.ts";

const consigne: Consigne = { tests: [], dropped: [], course: [], start: "http://localhost", task: "Parcours", instructions: "Consigne", tools: [] };
const json = (value: unknown) => new Response(JSON.stringify(value));
const defaults = (): SessionInput => ({ consigne, cle: "dev", onCreated: async () => {}, onStep: async () => {}, onTool: async () => "Continue." });

test("go_to_web et go_to sont des ouvertures de page", () => {
  assert.equal(libelleAction(["go_to_web"]), "Ouvre une page");
  assert.equal(libelleAction(["go_to"]), "Ouvre une page");
  assert.equal(libelleAction(["scroll_web", "click_web", "go_to_web"]), "Défile, Clique, Ouvre une page");
});

for (const pending of ["changes", "429", "share"]) {
  test(`arrêt local : annule l'attente ${pending} sans attendre la limite distante`, { timeout: 2000 }, async () => {
    let ready!: () => void;
    const waiting = new Promise<void>(resolve => { ready = resolve; });
    let deletes = 0;
    const session = creerSessionH({ key: "test-key", signaler() {}, navigateur: async () => ({ channel: "fake", stop() {} }),
      pause: async () => { ready(); await new Promise<void>(() => {}); },
      requete: async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/sessions")) return json({ id: "stopping", status: { status: "running" } });
        if (init?.method === "DELETE") { deletes++; return new Response(null, { status: 204 }); }
        if (path.endsWith("/changes") && pending === "429") return new Response(null, { status: 429 });
        if (path.endsWith("/changes") && pending === "share") throw new Error("Observation indisponible");
        ready();
        return new Promise<Response>(() => {});
      },
    });
    const running = await session(defaults());
    await waiting;
    await running.stop?.();
    const result = await running.fin;
    assert.equal(deletes, 1);
    assert.equal(result.replay_url, undefined);
  });
}

test("suppression refusée : arrêt compatible mais confirmation de fermeture en échec", async () => {
  const session = creerSessionH({
    key: "test-key", navigateur: async () => ({ channel: "fake", stop() {} }), signaler() {}, pause: async () => {},
    requete: async (url, init) => {
      if (String(url).endsWith("/sessions")) return json({ id: "unclosed", status: { status: "running" } });
      if (String(url).endsWith("/share")) return json({ share_url: "/share/unclosed" });
      if (init?.method === "DELETE") return new Response("", { status: 503 });
      throw new Error("Connexion interrompue");
    },
  });
  const running = await session(defaults());
  await running.fin;
  await running.stop?.();
  await assert.rejects(async () => { await running.confirmStopped?.(); }, /arrêt H non confirmé/);
});

for (const remote of ["erreur", "illisible", "running"]) {
  test(`état terminal connu par les événements, confirmation distante : ${remote}`, async () => {
    const messages: string[] = [];
    let reads = 0, deletes = 0, polls = 0;
    const session = creerSessionH({
      key: "test-key", navigateur: async () => ({ channel: "fake", stop() {} }),
      pause: async () => {}, signaler: message => messages.push(message),
      requete: async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/sessions")) return json({ id: "finished", status: { status: "running" } });
        if (path.endsWith("/share")) return json({ share_url: "/share/finished" });
        if (path.endsWith("/changes")) {
          polls++;
          return json({ status: "completed", new_events: [] });
        }
        if (init?.method === "DELETE") { deletes++; return new Response(null, { status: 204 }); }
        reads++;
        if (remote === "erreur") throw new Error("GET indisponible");
        return json(remote === "illisible" ? {} : { status: { status: "running" } });
      },
    });
    const running = await session(defaults());
    await running.fin;
    assert.ok(polls > 0);
    if (remote === "running") {
      await assert.rejects(async () => running.confirmStopped?.(), /arrêt H non confirmé/);
      assert.equal(deletes, 3);
    } else {
      await running.confirmStopped?.();
      assert.match(messages.at(-1)!, /lectures distantes indisponibles ; état terminal déjà connu : completed/);
    }
    assert.equal(reads, 16);
  });
}

for (const outcome of ["completed", "idle", "running", "illisible", "erreur"]) {
  test(`confirmation distante après abandon : ${outcome}`, async () => {
    let deletes = 0, reads = 0;
    const pauses: number[] = [], messages: string[] = [];
    const session = creerSessionH({
      key: "test-key", navigateur: async () => ({ channel: "fake", stop() {} }),
      pause: async ms => { pauses.push(ms); }, signaler: message => messages.push(message),
      requete: async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/sessions")) return json({ id: "abandoned", status: { status: "running" } });
        if (path.endsWith("/share")) return json({ share_url: "/share/abandoned" });
        if (init?.method === "DELETE") { deletes++; return new Response(null, { status: 204 }); }
        if (path.endsWith("/changes")) throw new Error("Observation interrompue");
        reads++;
        if (outcome === "erreur") throw new Error("GET indisponible");
        if (outcome === "illisible") return json({});
        return json({ status: { status: reads === 1 ? "running" : outcome } });
      },
    });
    const running = await session(defaults());
    await running.fin;
    await running.stop?.();
    assert.equal(deletes, 1);
    if (outcome === "completed" || outcome === "idle") {
      await running.confirmStopped?.();
      assert.equal(reads, 2);
      assert.equal(deletes, 2);
      assert.deepEqual(pauses, [1000]);
      assert.deepEqual(messages, []);
    } else {
      await assert.rejects(async () => running.confirmStopped?.(), /arrêt H non confirmé/);
      assert.equal(reads, 16);
      assert.deepEqual(pauses, [1000, 1000, 1000, ...Array(12).fill(5000)]);
      assert.match(messages.at(-1)!, /arrêt H non confirmé ; état distant/);
      if (outcome === "running") {
        assert.equal(deletes, 4);
        assert.match(messages.at(-1)!, /running/);
      }
    }
  });
}

test("budget transmis à H, valeur par défaut inchangée et queue désactivée", async () => {
  for (const [maxSteps, maxTimeS] of [[undefined, undefined], [70, 560], [18, undefined]]) {
    let observed = 0, observedTime = 0;
    const session = creerSessionH({ key: "test-key", navigateur: async () => ({ channel: "fake", stop() {} }),
      requete: async (url, init) => {
        if (String(url).endsWith("/sessions")) {
          const body = JSON.parse(String(init?.body));
          assert.equal(body.queue, false);
          observed = body.max_steps; observedTime = body.max_time_s;
          return json({ id: "budget", status: { status: "completed" } });
        }
        if (String(url).endsWith("/share")) return json({ share_url: "/share/budget" });
        return new Response(null, { status: 204 });
      },
    });
    await (await session({ ...defaults(), maxSteps, maxTimeS })).fin;
    assert.equal(observed, maxSteps ?? 40);
    assert.equal(observedTime, maxTimeS ?? 240);
  }
});

test("budget invalide refusé avant tout démarrage H", async () => {
  const session = creerSessionH({ key: "test-key", navigateur: async () => { throw new Error("Ne doit pas démarrer"); } });
  for (const maxSteps of [0, -1, 1.5, Infinity, NaN]) {
    await assert.rejects(session({ ...defaults(), maxSteps }), /maxSteps doit être un entier positif/);
  }
});

for (const settle_s of [undefined, 0, 1, 1.25]) {
  test(`settle_s transmis à H : ${settle_s ?? "défaut 0,5"}`, async () => {
    let observed: number | undefined;
    let stopped = false;
    const session = creerSessionH({ settle_s, key: "factice", navigateur: async () => ({ channel: "channel", stop() { stopped = true; } }),
      requete: async (url, init) => {
        if (String(url).endsWith("/sessions")) {
          observed = JSON.parse(String(init!.body)).agent.environments[0].settle_s;
          return json({ id: "settle-test", status: { status: "completed" } });
        }
        if (String(url).endsWith("/share")) return json({ share_url: "/share/settle-test" });
        return new Response(null, { status: 204 });
      },
    });
    await (await session(defaults())).fin;
    assert.equal(observed, settle_s ?? 0.5);
    assert.equal(stopped, true);
  });
}

test("settle_s négatif ou non fini refusé avant toute session", () => {
  for (const settle_s of [-1, NaN, Infinity, -Infinity]) {
    assert.throws(() => creerSessionH({ settle_s }), /settle_s/);
  }
});

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
    if (address.endsWith("/share")) return json({ share_url: "/share/api/v1/trajectories/public-session" });
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
  assert.equal(result.replay_url, "https://agp.eu.hcompany.ai/share/api/v1/trajectories/public-session");
  assert.equal(requests.filter(({ url, method }) => url.endsWith("/sessions/session-h/share") && method === "POST").length, 1);
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
      if (String(url).endsWith("/share")) return json({ share_url: "/share/replay" });
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

test("un statut failed après terminer reste un échec même sans erreur explicite", async () => {
  let polls = 0;
  let ended = false;
  const session = creerSessionH({
    key: "test-key", navigateur: async () => ({ channel: "channel", stop() {} }),
    requete: async (url) => {
      if (String(url).endsWith("/share")) return json({ share_url: "/share/replay" });
      if (String(url).endsWith("/sessions")) return json({ id: "failed-after-end" });
      if (String(url).endsWith("/tool_results")) return new Response(null, { status: 204 });
      if (++polls === 1) return json({ status: "running", new_events: [], pending_tool_calls: [{ id: "end", tool_name: "terminer", args: { etat: "reussi" } }] });
      if (polls === 2) return json({ status: "failed", metrics: { total_cost: 0.02 }, new_events: [] });
      return new Response(null, { status: 204 });
    },
  });
  const result = await (await session({ ...defaults(), onTool: async () => { ended = true; return "Terminé."; } })).fin;
  assert.equal(ended, true);
  assert.match(result.erreur!, /échoué/);
  assert.equal(result.muted, false);
  assert.equal(result.cout_usd, 0.02);
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

for (const tool of ["relever", "terminer"]) {
  test(`un résultat ${tool} accepté après deux 429 ne rend pas la session muette`, async () => {
    let now = 0;
    let polls = 0;
    let posts = 0;
    let cancelled = 0;
    let bridges = 0;
    let tools = 0;
    const pauses: number[] = [];
    const session = creerSessionH({
      key: "test-key", maintenant: () => now,
      pause: async (ms) => { pauses.push(ms); now += ms; },
      navigateur: async () => ({ channel: `channel-${++bridges}`, stop() {} }),
      requete: async (url, init) => {
        if (String(url).endsWith("/share")) return json({ share_url: "/share/replay" });
        if (String(url).endsWith("/sessions")) return json({ id: "rate-limited-tool" });
        if (init?.method === "DELETE") { cancelled++; return new Response(null, { status: 204 }); }
        if (String(url).endsWith("/tool_results")) return new Response(null, { status: ++posts < 3 ? 429 : 204 });
        if (++polls === 1) return json({ status: "running", new_events: [], pending_tool_calls: [{ id: "call", tool_name: tool, args: {} }] });
        if (polls === 2) { now += 30_000; return new Response(null, { status: 204 }); }
        if (polls === 3) return json({ status: "completed", new_events: [] });
        return new Response(null, { status: 204 });
      },
    });
    const result = await (await session({ ...defaults(), onTool: async () => { tools++; return "Accepté."; } })).fin;
    assert.equal(result.muted, false);
    assert.equal(result.erreur, undefined);
    assert.equal(posts, 3);
    assert.equal(tools, 1);
    assert.equal(polls, 4);
    assert.equal(cancelled, 0);
    assert.equal(bridges, 1);
    assert.equal(now, 90_000);
    assert.deepEqual(pauses, [30_000, 30_000]);
  });
}

test("le silence se mesure depuis le dernier événement, même après une action", async () => {
  let now = 0;
  let polls = 0;
  let cancelled = 0;
  const session = creerSessionH({
    key: "test-key", maintenant: () => now,
    navigateur: async () => ({ channel: "channel", stop() {} }),
    requete: async (url, init) => {
      if (String(url).endsWith("/share")) return json({ share_url: "/share/replay" });
      if (String(url).endsWith("/sessions")) return json({ id: "stalled" });
      if (init?.method === "DELETE") { cancelled++; return new Response(null, { status: 204 }); }
      if (++polls === 1) {
        now = 30_000;
        return json({ status: "running", new_events: [{ type: "AgentEvent", data: { kind: "policy_event", tool_reqs: [] } }] });
      }
      if (polls === 2) {
        now = 60_000;
        return json({ status: "running", new_events: [{ type: "ActiveStateChangeEvent", data: { state: "running" } }] });
      }
      now += 15_000;
      return new Response(null, { status: 204 });
    },
  });
  const result = await (await session(defaults())).fin;
  assert.equal(result.muted, true);
  assert.equal(result.etapes, 1);
  assert.equal(now, 105_000);
  assert.equal(cancelled, 1);
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

for (const shared of [
  { share_url: "https://agp.eu.hcompany.ai/share/replay" },
  null,
  {},
  { share_url: "" },
  { share_url: "https://example.org/replay" },
  { share_url: "http://example.org/replay" },
  { share_url: "javascript:alert(1)" },
  "http-error",
  "network-error",
]) {
  test(`replay public : réponse ${JSON.stringify(shared)}`, async () => {
    const warnings: string[] = [];
    const session = creerSessionH({
      key: "secret-test", signaler: (message) => warnings.push(message),
      navigateur: async () => ({ channel: "channel", stop() {} }),
      requete: async (url, init) => {
        if (String(url).endsWith("/sessions")) return json({ id: "session-share" });
        if (String(url).endsWith("/share")) {
          assert.equal(init?.method, "POST");
          if (shared === "network-error") throw new Error("secret-test");
          if (shared === "http-error") return new Response("secret-test", { status: 404 });
          return json(shared);
        }
        return json({ status: "completed", new_events: [] });
      },
    });
    const result = await (await session(defaults())).fin;
    const valid = shared !== null && typeof shared === "object" && shared.share_url?.startsWith("https://");
    assert.equal(result.replay_url, valid ? shared.share_url : undefined);
    assert.equal(result.erreur, undefined);
    assert.deepEqual(warnings, valid ? [] : ["Session session-share : replay public indisponible ; aucun lien ajouté au rapport."]);
    assert.ok(!JSON.stringify(warnings).includes("secret-test"));
  });
}
