import { randomUUID } from "node:crypto";
import type { Capture, CoureurAgent, LancementPassage, Passage, RapportPassage } from "@horama/contrats";
import { ecrireRapportPassage } from "@horama/memoire";
import type { BasePassages } from "./base.ts";
import { construireConsigne } from "./consigne.ts";
import type { CourseStep } from "./consigne.ts";
import { creerSessionH } from "./session.ts";
import type { OptionsSessionH, ResultatSession, Session, SessionEnCours } from "./session.ts";
import { verifierTest } from "./verification.ts";
import { withAbort, withTimeout } from "./abort.ts";

export interface ReleveCapture {
  png: Uint8Array;
  texte: string;
  url_page: string;
  largeur: number;
  hauteur: number;
  defilement: [number, number];
  phrase: string;
}

export interface OptionsCoureur {
  vault: string;
  base: BasePassages;
  relever(ecran: string, vue: string, signal?: AbortSignal): Promise<ReleveCapture>;
  hookTimeoutMs?: number;
  signal?: AbortSignal;
  session?: Session;
  h?: OptionsSessionH;
  baseUrl?: string;
  maintenant?: () => number;
  identifiant?: () => string;
  signaler?: (message: string) => void;
  writeReport?: typeof ecrireRapportPassage;
}

function bonneAdresse(step: CourseStep, address: string, start: string): boolean {
  try {
    const actual = new URL(address);
    const expected = new URL(step.address, start);
    const pattern = `^${decodeURI(expected.pathname).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^/]+")}$`;
    return actual.origin === expected.origin && new RegExp(pattern).test(actual.pathname)
      && [...expected.searchParams].every(([key, value]) => actual.searchParams.get(key) === value)
      && actual.searchParams.get("filtre") === expected.searchParams.get("filtre");
  } catch { return false; }
}

export function creerCoureur({ vault, base, relever, hookTimeoutMs = 30_000, signal, session = creerSessionH(), h, baseUrl, maintenant = Date.now, identifiant = randomUUID, signaler = console.error, writeReport = ecrireRapportPassage }: OptionsCoureur): CoureurAgent {
  if (!Number.isFinite(hookTimeoutMs) || hookTimeoutMs <= 0 || hookTimeoutMs > 2_147_483_647) throw new Error("hookTimeoutMs doit être un délai positif en millisecondes.");
  const jouer = h ? creerSessionH({ ...h, signaler: h.signaler ?? signaler }) : session;
  const passages = new Map<string, Promise<RapportPassage>>();
  return {
    async lancerPassage(input: LancementPassage) {
      const consigne = construireConsigne({ vault, logiciel: input.logiciel, version: input.version_testee, ids: input.tests, baseUrl, regressions: input.regressions });
      const debut = maintenant();
      const passage: Passage = { id: identifiant(), logiciel: input.logiciel, version_testee: input.version_testee, version_reference: input.version_reference, etat: "en_cours", debut: new Date(debut).toISOString() };
      const taken = new Map<string, { capture: Capture; phrase: string; png: Uint8Array }>();
      const hookFailures = new Map<string, string>();
      let finishing = false;
      let sessionId = "";
      let etape = 0;
      let ended = false;
      let failed = false;
      let failureReason: string | undefined;
      let baseFailed = false;
      const safe = async (action: () => Promise<unknown>): Promise<boolean> => {
        try { await action(); return true; }
        catch {
          baseFailed = true;
          signaler(`Passage ${passage.id} : écriture en base impossible ; le parcours continue, le passage sera en échec.`);
          return false;
        }
      };
      await safe(() => base.insererPassage(passage));
      const nextTest = () => consigne.course.find((step) => !taken.has(step.key))?.test_id ?? consigne.course.at(-1)!.test_id;
      const launch = async () => {
        signal?.throwIfAborted();
        const starting = jouer({
          consigne, cle: input.cle ?? "dev", signal,
          async onCreated(id) { sessionId = id; etape = 0; },
          async onStep(step) {
            if (finishing || signal?.aborted) return;
            etape = step.etape;
            await safe(() => base.insererEvenement({ ...step, passage_id: passage.id, test_id: nextTest(), session_id: sessionId }));
          },
          async onTool(name, args) {
            if (finishing || signal?.aborted) return "Passage arrêté. N'effectue plus aucune action.";
            if (name === "terminer") {
              ended = true;
              failed = args.etat !== "reussi";
              failureReason = failed ? (typeof args.raison === "string" && args.raison.trim() ? args.raison : "Parcours terminé en échec.") : undefined;
              return "Parcours terminé. N'effectue plus aucune action.";
            }
            if (name !== "relever") return "Outil inconnu.";
            const step = consigne.course.find((step) => step.ecran === args.ecran && step.vue === args.vue);
            if (!step) return "Relevé inconnu dans ce parcours.";
            const previous = taken.get(step.key);
            if (previous) {
              const next = consigne.course.find((step) => !taken.has(step.key));
              return next ? `Déjà relevé. Relevé suivant : ecran=${next.ecran}, vue=${next.vue}.` : 'Déjà relevé. Tous les relevés sont pris. Appelle terminer(etat="reussi").';
            }
            if (hookFailures.has(step.key)) return hookFailures.get(step.key)!;
            const testTimeouts = consigne.tests.filter((test) => test.releves.some(({ ecran, vue }) => ecran === step.ecran && vue === step.vue))
              .map((test) => test.timeout_s * 1000).filter((timeout) => Number.isFinite(timeout) && timeout > 0);
            const timeout = Math.min(hookTimeoutMs, ...testTimeouts);
            const controller = new AbortController();
            const hookSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
            const reason = `Délai du crochet relever dépassé (${timeout} ms) pour ${step.ecran}/${step.vue}.`;
            const timer = setTimeout(() => controller.abort(new Error(reason)), timeout);
            let result: ReleveCapture;
            try { result = await withAbort(Promise.resolve().then(() => {
              hookSignal.throwIfAborted();
              return relever(step.ecran, step.vue, hookSignal);
            }), hookSignal); }
            catch {
              if (signal?.aborted) return "Passage annulé. N'effectue plus aucune action.";
              if (controller.signal.aborted) {
                hookFailures.set(step.key, reason);
                signaler(`Passage ${passage.id} : ${reason}`);
                return `${reason} Continue les autres relevés, puis termine le parcours.`;
              }
              return "Relevé impossible : la capture a échoué. Réessaie ou appelle terminer en échec.";
            } finally { clearTimeout(timer); }
            if (finishing || signal?.aborted) return "Passage arrêté. N'effectue plus aucune action.";
            if (!bonneAdresse(step, result.url_page, consigne.start)) return "Relevé refusé : écran non atteint. Rejoins l'écran demandé avant de relever.";
            const chemin = `${passage.id}/${step.test_id}/${step.ecran}--${step.vue}.png`;
            let capture: Capture | undefined;
            const written = await safe(async () => {
              const url = await base.deposerPng(chemin, result.png);
              if (finishing || signal?.aborted) return;
              capture = {
                passage_id: passage.id, test_id: step.test_id, session_id: sessionId, ecran: step.ecran, vue: step.vue,
                version: input.version_testee, chemin, url, largeur: result.largeur, hauteur: result.hauteur,
                defilement: result.defilement, texte_page: result.texte, url_page: result.url_page, etape,
                prise_le: new Date(maintenant()).toISOString(),
              };
              await base.enregistrerCapture(capture);
            });
            if (written && capture && !finishing && !signal?.aborted) taken.set(step.key, { capture, phrase: result.phrase, png: result.png.slice() });
            return written ? result.phrase : `${result.phrase}\nAttention : capture non enregistrée, base indisponible.`;
          },
        });
        void starting.then((session) => {
          void session.fin.catch(() => {});
          if (signal?.aborted) void Promise.resolve().then(() => session.stop?.()).catch(() => {});
        }, () => {});
        return withAbort(starting, signal);
      };
      const finish = async (result: ResultatSession, cout: number | null, etapes: number) => {
        finishing = true;
        const cancellation = signal?.aborted ? `Passage annulé : ${typeof signal.reason === "string" ? signal.reason : signal.reason instanceof Error ? signal.reason.message : "annulation demandée"}` : undefined;
        if (cancellation) signaler(`${passage.id} : ${cancellation}`);
        const sessionFailure = result.erreur || (result.muted ? "session muette" : failureReason);
        const fin = maintenant();
        const final: Passage = { ...passage, etat: cancellation || hookFailures.size || result.muted || result.erreur || failed || !ended || baseFailed ? "echec" : "joue", fin: new Date(fin).toISOString(), duree_s: (fin - debut) / 1000, cout_usd: cout };
        const report: RapportPassage = {
          passage: final,
          tests: consigne.tests.map((test) => {
            const captured = test.releves.filter(({ ecran, vue }) => taken.has(`${ecran}--${vue}`));
            const complete = captured.length === test.releves.length;
            const reason = cancellation ?? test.releves.map(({ ecran, vue }) => hookFailures.get(`${ecran}--${vue}`)).find(Boolean) ?? sessionFailure;
            return {
              test_id: test.id, session_id: result.id, etat: complete && !reason ? "termine" : "non_concluant",
              ...(reason || !complete ? { raison: reason ?? (result.muted ? "session muette" : "ecran non atteint") } : {}),
              ecrans_releves: [...new Set(captured.map(({ ecran }) => ecran))],
              ...(result.replay_url ? { replay_url: result.replay_url } : {}),
              duree_s: final.duree_s!, cout_usd: cout, etapes,
            };
          }),
        };
        const results = consigne.tests.map((test) => verifierTest({ vault, logiciel: input.logiciel, test,
          acquired: [...taken.values()], passageId: passage.id, version: input.version_testee, referenceVersion: input.version_reference,
          sessionFailed: !!(cancellation || result.muted || result.erreur || failed || !ended), replayUrl: result.replay_url }));
        for (const verification of results) {
          const reason = report.tests.find((test) => test.test_id === verification.test_id)?.raison;
          if (cancellation || hookFailures.size && reason) {
            verification.statut = "INCONCLUSIVE";
            verification.raison = reason;
          }
        }
        for (const verification of results) {
          try { await base.enregistrerResultat(verification); }
          catch { signaler(`Passage ${passage.id} : résultat C4 non enregistré pour ${verification.test_id} ; le passage continue.`); }
        }
        try { writeReport(vault, report, results); }
        catch {
          report.passage.etat = "echec";
          signaler(`Passage ${passage.id} : écriture du rapport dans le vault impossible ; le passage sera en échec.`);
        }
        const written = await safe(() => base.terminerPassage(report));
        if (!written) report.passage.etat = "echec";
        return report;
      };
      let running: SessionEnCours;
      try { running = await launch(); }
      catch (error) {
        const completion = finish({ id: sessionId, muted: false, cout_usd: null, etapes: 0, erreur: "Création de session impossible." }, null, 0);
        passages.set(passage.id, completion);
        await completion;
        if (signal?.aborted) return { passage_id: passage.id };
        throw error;
      }
      const completion = (async () => {
        let cout: number | null = 0;
        let etapes = 0;
        for (let attempt = 1; ; attempt++) {
          let result: ResultatSession;
          try { result = await withAbort(running.fin, signal); }
          catch {
            if (signal?.aborted && running.stop) {
              try { await withTimeout(async () => { await running.stop!(); }, 5_000); }
              catch { signaler(`Passage ${passage.id} : arrêt du navigateur ou de H non confirmé ; session abandonnée.`); }
            }
            result = { id: running.id, muted: false, cout_usd: null, etapes: etape, erreur: "Session interrompue." };
          }
          cout = cout === null || result.cout_usd === null ? null : cout + result.cout_usd;
          etapes += result.etapes;
          if (result.muted && attempt === 1 && !signal?.aborted) {
            signaler(`Passage ${passage.id} : session muette, une relance.`);
            try { running = await launch(); continue; }
            catch { return finish({ ...result, erreur: "Relance impossible." }, cout, etapes); }
          }
          return finish(result, cout, etapes);
        }
      })();
      passages.set(passage.id, completion);
      return { passage_id: passage.id };
    },
    async attendreFin(id) {
      const completion = passages.get(id);
      if (!completion) throw new Error(`Passage inconnu : ${id}.`);
      return completion;
    },
  };
}
