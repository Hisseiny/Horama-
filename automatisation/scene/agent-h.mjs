// H side of the T7 probe: the bridge `holo local browser`, and one H session on the local browser through the REST API.
// From Nami (tag demo-oral-2026-11-08): the session body on a "user_device" web environment, queue false, settle_s 0.5
// (lib/h-agent.ts); one bridge channel (a new UUID) per session, bridge restarted when it stops, given up after three
// quick failures (lib/local-bridge.ts, scripts/lancer-demo.sh); tool calls read from pending_tool_calls and from the
// awaiting_tool_results events, each answered once (lib/agent-changes.ts); session given up when H never acts
// (lib/agent-stall.ts). Never prints the key.
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { sleep } from "./scene.mjs";

const API = "https://agp.eu.hcompany.ai/api/v2";
export const SETTINGS = {
  model: process.env.HAI_AGENT_MODEL || "holo4-27b",
  reasoning_effort: process.env.HAI_AGENT_REASONING || "medium",
  settle_s: 0.5,
  max_time_s: 240,
  max_steps: 40,
};
export const MUTE_MS = 45_000;
export const REST_MS = 35_000;
const TERMINAL = ["completed", "failed", "timed_out", "interrupted"];
const BRIDGE_READY_LINE = "Local web bridge serving session id";

export function findHolo() {
  const candidates = [
    process.env.HOLO_BIN,
    ...(process.env.PATH ?? "").split(delimiter).map((dir) => join(dir, "holo")),
    join(homedir(), ".venvs/holo/bin/holo"),
  ];
  return candidates.find((file) => file && existsSync(file)) ?? null;
}

// Serves the Chrome of `port` to H on `channel`. The bridge ends with each session: it is restarted until stop().
export function startBridge({ holo, port, channel, logFile }) {
  const bridge = { failed: null, stop, ready };
  let child = null;
  let stopped = false;
  let quick = 0;
  const from = existsSync(logFile) ? readFileSync(logFile, "utf8").length : 0;
  const launch = () => {
    if (stopped) return;
    const started = Date.now();
    const log = openSync(logFile, "a");
    // detached: its own process group, so that stop() also ends the chromedriver it starts.
    child = spawn(holo, ["local", "browser", "--debug-port", String(port), "--session-id", channel], { detached: true, stdio: ["ignore", log, log] });
    closeSync(log);
    child.on("error", (error) => { bridge.failed = `le pont de H n'a pas pu être lancé : ${error.message}`; });
    child.on("exit", (code) => {
      quick = Date.now() - started < 5000 ? quick + 1 : 0;
      if (quick >= 3) bridge.failed = `le pont de H s'arrête aussitôt lancé (code ${code}), journal : ${logFile}`;
      else setTimeout(launch, 1000);
    });
  };
  function stop() {
    stopped = true;
    try {
      if (child?.pid && child.exitCode === null) process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  async function ready(timeoutMs) {
    for (const end = Date.now() + timeoutMs; Date.now() < end && !bridge.failed; await sleep(500)) {
      if (readFileSync(logFile, "utf8").slice(from).includes(BRIDGE_READY_LINE)) return true;
    }
    return false;
  }
  launch();
  return bridge;
}

async function h(key, method, path, body) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    if (response.status === 429 && attempt < 3) {
      console.log(`H répond 429 (essai ${attempt} sur 3) : nouvelle tentative dans 30 s.`);
      await sleep(30_000);
      continue;
    }
    const text = await response.text();
    if (!response.ok) throw new Error(`H a répondu ${response.status} sur ${method} ${path.split("?")[0]} : ${text.replaceAll(key, "***").slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }
}

let open = null;
// For Ctrl+C: frees the session slot of H.
export const cancelOpenSession = () => (open ? h(open.key, "DELETE", `/sessions/${open.id}`).catch(() => {}) : null);

// Creates the session on the local browser served on `channel` and follows it to its end. onTool(name, args) answers
// the custom tools. Returns what was measured; `muted` when H did nothing within MUTE_MS of the start.
export async function runSession({ key, channel, task, instructions, tools, endTool, bridge, say, onTool }) {
  const created = Date.now();
  const session = await h(key, "POST", "/sessions", {
    agent: {
      name: "horama-sonde-t7",
      description: "Horama, sonde T7 : joue un parcours sur Facturo dans un Chrome local.",
      model: SETTINGS.model,
      reasoning_effort: SETTINGS.reasoning_effort,
      instructions,
      environments: [{ id: "browser", kind: "web", host: "user_device", session_id: channel, settle_s: SETTINGS.settle_s, mode: { type: "visual", markdown: true } }],
      tools,
    },
    messages: [{ type: "user_message", message: task }],
    queue: false,
    max_time_s: SETTINGS.max_time_s,
    max_steps: SETTINGS.max_steps,
  });
  const out = { id: session.id, created, startedAt: null, steps: [], status: session.status?.status ?? null, metrics: null, error: null, answer: null, muted: false };
  open = { key, id: out.id };
  const handled = new Set();
  let next = 0;
  // H ends a session 60 s after max_time_s at the latest.
  let deadline = created + (SETTINGS.max_time_s + 90) * 1000;
  try {
    for (;;) {
      const terminal = TERMINAL.includes(out.status);
      if (!terminal && !out.steps.length && Date.now() - created > MUTE_MS) {
        out.muted = true;
        break;
      }
      if (!terminal && bridge.failed) {
        out.error = bridge.failed;
        break;
      }
      if (!terminal && Date.now() > deadline) {
        out.error = "la session n'a pas atteint d'état final dans le délai, abandonnée";
        break;
      }
      // Short waits until the first action so that a mute session is seen on time; 204 (null) means nothing new.
      const wait = terminal ? 2 : out.steps.length ? 20 : 5;
      const changes = await h(key, "GET", `/sessions/${out.id}/changes?from_index=${next}&wait_for_seconds=${wait}`);
      // The final events and the answer can arrive after the terminal status: stop on the first empty poll after it.
      if (!changes?.new_events?.length && terminal) break;
      if (!changes) continue;
      const events = changes.new_events ?? [];
      next = (changes.first_index ?? next) + events.length;
      out.status = changes.status ?? out.status;
      out.metrics = changes.metrics ?? out.metrics;
      out.answer = changes.answer ?? out.answer;
      out.startedAt = changes.started_at ? Date.parse(changes.started_at) : out.startedAt;
      if (changes.error || changes.error_code) out.error = `${changes.error_code ?? ""} ${changes.error ?? ""}`.trim();
      const calls = [...(changes.pending_tool_calls ?? [])];
      for (const event of events) {
        if (event.type === "AgentEvent" && event.data?.kind === "policy_event") {
          out.steps.push(Date.parse(event.timestamp) || Date.now());
          const actions = (event.data.tool_reqs ?? []).map((request) => request.tool_name).join(", ");
          say(`étape ${out.steps.length} : ${actions || String(event.data.content ?? "").replace(/\s+/g, " ").slice(0, 100)}`);
        }
        if (event.type === "ActiveStateChangeEvent" && event.data?.state === "awaiting_tool_results") calls.push(...(event.data.pending_tool_calls ?? []));
      }
      for (const call of calls) {
        const id = call.id ?? `${call.tool_name}:${JSON.stringify(call.args)}`;
        if (handled.has(id)) continue;
        handled.add(id);
        const result = await onTool(call.tool_name, call.args ?? {});
        say(`outil ${call.tool_name}(${Object.values(call.args ?? {}).join(", ")}) : ${result}`);
        await h(key, "POST", `/sessions/${out.id}/tool_results`, { kind: "tool_result", tool_req: call, result });
        if (call.tool_name === endTool) deadline = Math.min(deadline, Date.now() + 40_000);
      }
    }
  } finally {
    // Best effort: on Nami a mute session ignored DELETE.
    if (!TERMINAL.includes(out.status)) await h(key, "DELETE", `/sessions/${out.id}`).catch(() => {});
    open = null;
  }
  return out;
}
