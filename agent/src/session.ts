import type { EvenementFil } from "@horama/contrats";
import type { Consigne } from "./consigne.ts";

export interface EtapeSession {
  horodatage: string;
  etape: number;
  action: string;
  etat_session: EvenementFil["etat_session"];
}
export interface ResultatSession {
  id: string;
  muted: boolean;
  cout_usd: number | null;
  etapes: number;
  erreur?: string;
  replay_url?: string;
}
export interface SessionInput {
  consigne: Consigne;
  cle: "dev" | "demo";
  onCreated(id: string): Promise<void>;
  onStep(etape: EtapeSession): Promise<void>;
  onTool(name: string, args: Record<string, unknown>): Promise<string>;
}
export interface SessionEnCours { id: string; fin: Promise<ResultatSession> }
export type Session = (input: SessionInput) => Promise<SessionEnCours>;
export interface NavigateurSession {
  channel: string;
  stop(): void | Promise<void>;
  failed?(): string | null;
}
export interface OptionsSessionH {
  navigateur?: () => Promise<NavigateurSession>;
  key?: string;
  requete?: typeof fetch;
  maintenant?: () => number;
  pause?: (ms: number) => Promise<void>;
}

const TERMINAL = ["completed", "failed", "timed_out", "interrupted"];
const API = "https://agp.eu.hcompany.ai/api/v2";

export function libelleAction(names: string[]): string {
  const labels: Record<string, string> = { go_to: "Ouvre une page", click: "Clique", click_web: "Clique", wait_web: "Attend la page", scroll_web: "Défile", relever: "Relève l'écran", terminer: "Termine le parcours" };
  return (names.length ? names.map((name) => labels[name] ?? "Agit dans le navigateur").join(", ") : "Agit dans le navigateur").slice(0, 100);
}

export function creerSessionH({ navigateur, key, requete = fetch, maintenant = Date.now, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }: OptionsSessionH = {}): Session {
  let previous = false;
  return async (input) => {
    const secret = key ?? (input.cle === "demo" ? process.env.HAI_API_KEY_DEMO : process.env.HAI_API_KEY);
    if (!secret) throw new Error("Clé H absente pour ce passage.");
    if (!navigateur) throw new Error("Le couloir scène doit fournir le navigateur et son pont local (navigateur).");
    async function h(method: string, path: string, body?: unknown): Promise<any> {
      for (let attempt = 1; ; attempt++) {
        let response: Response;
        try {
          response = await requete(API + path, {
            method, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45_000),
          });
        } catch { throw new Error("H inaccessible (erreur réseau)."); }
        if (response.status === 429 && attempt < 3) { await pause(30_000); continue; }
        if (!response.ok) throw new Error(`H a répondu ${response.status} sur ${method} ${path.split("?")[0]}.`);
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
    }
    if (previous) await pause(35_000);
    previous = true;
    const browser = await navigateur();
    const created = maintenant();
    let session: any;
    try {
      session = await h("POST", "/sessions", {
        agent: {
          name: "horama-testeur", description: "Horama : joue un parcours sur Facturo dans un Chrome local.",
          model: process.env.HAI_AGENT_MODEL || "holo4-27b", reasoning_effort: process.env.HAI_AGENT_REASONING || "medium",
          instructions: input.consigne.instructions,
          environments: [{ id: "browser", kind: "web", host: "user_device", session_id: browser.channel, settle_s: 0.5, mode: { type: "visual", markdown: true } }],
          tools: input.consigne.tools,
        },
        messages: [{ type: "user_message", message: input.consigne.task }], queue: false, max_time_s: 240, max_steps: 40,
      });
    } catch (error) { await browser.stop(); throw error; }
    const id: string = session.id;
    await input.onCreated(id);
    const fin = (async (): Promise<ResultatSession> => {
      let status: string = session.status?.status ?? "";
      let metrics: { total_cost?: number } | null = null;
      let etapes = 0;
      let next = 0;
      let muted = false;
      let erreur: string | undefined;
      let deadline = created + 330_000;
      const handled = new Set<string>();
      try {
        for (;;) {
          const terminal = TERMINAL.includes(status);
          if (!terminal && !etapes && maintenant() - created > 45_000) { muted = true; break; }
          if (!terminal && browser.failed?.()) { erreur = "Le pont du navigateur est interrompu."; break; }
          if (!terminal && maintenant() > deadline) { erreur = "La session n'a pas atteint d'état final dans le délai."; break; }
          const wait = terminal ? 2 : etapes ? 20 : 5;
          const changes = await h("GET", `/sessions/${id}/changes?from_index=${next}&wait_for_seconds=${wait}`);
          if (!changes?.new_events?.length && terminal) break;
          if (!changes) continue;
          const events = changes.new_events ?? [];
          next = (changes.first_index ?? next) + events.length;
          status = changes.status ?? status;
          metrics = changes.metrics ?? metrics;
          if (changes.error || changes.error_code) erreur = "La session H signale une erreur.";
          const calls = [...(changes.pending_tool_calls ?? [])];
          for (const event of events) {
            if (event.type === "MetricsUpdateEvent") metrics = event.data?.metrics ?? event.data ?? metrics;
            if (event.type === "AgentEvent" && event.data?.kind === "policy_event") {
              etapes++;
              await input.onStep({
                horodatage: event.timestamp || new Date(maintenant()).toISOString(), etape: etapes,
                action: libelleAction((event.data.tool_reqs ?? []).map((request: any) => request.tool_name)),
                etat_session: "en_cours",
              });
            }
            if (event.type === "ActiveStateChangeEvent" && event.data?.state === "awaiting_tool_results") calls.push(...(event.data.pending_tool_calls ?? []));
          }
          for (const call of calls) {
            const callId = call.id ?? `${call.tool_name}:${JSON.stringify(call.args)}`;
            if (handled.has(callId)) continue;
            handled.add(callId);
            const result = await input.onTool(call.tool_name, call.args ?? {});
            await h("POST", `/sessions/${id}/tool_results`, { kind: "tool_result", tool_req: call, result });
            if (call.tool_name === "terminer") deadline = Math.min(deadline, maintenant() + 40_000);
          }
        }
      } catch { erreur = "La session H est interrompue (erreur réseau ou outil)."; }
      finally {
        if (!TERMINAL.includes(status)) await h("DELETE", `/sessions/${id}`).catch(() => {});
        await browser.stop();
      }
      return { id, muted, cout_usd: metrics?.total_cost ?? null, etapes, ...(erreur ? { erreur } : {}) };
    })();
    return { id, fin };
  };
}
