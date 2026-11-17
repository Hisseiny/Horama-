import { randomUUID } from "node:crypto";
import type { Capture, CoureurAgent, LancementPassage, Passage, RapportPassage } from "@horama/contrats";
import { ecrireRapportPassage } from "@horama/memoire";
import type { BasePassages } from "./base.ts";
import { construireConsigne } from "./consigne.ts";
import type { CourseStep } from "./consigne.ts";
import { creerSessionH } from "./session.ts";
import type { OptionsSessionH, ResultatSession, Session } from "./session.ts";

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
  relever(ecran: string, vue: string): Promise<ReleveCapture>;
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
      && actual.searchParams.get("filtre") === expected.searchParams.get("filtre");
  } catch { return false; }
}

export function creerCoureur({ vault, base, relever, session = creerSessionH(), h, baseUrl, maintenant = Date.now, identifiant = randomUUID, signaler = console.error, writeReport = ecrireRapportPassage }: OptionsCoureur): CoureurAgent {
  const jouer = h ? creerSessionH(h) : session;
  const passages = new Map<string, Promise<RapportPassage>>();
  return {
    async lancerPassage(input: LancementPassage) {
      const consigne = construireConsigne({ vault, logiciel: input.logiciel, version: input.version_testee, ids: input.tests, baseUrl, regressions: input.regressions });
      const debut = maintenant();
      const passage: Passage = { id: identifiant(), logiciel: input.logiciel, version_testee: input.version_testee, version_reference: input.version_reference, etat: "en_cours", debut: new Date(debut).toISOString() };
      const taken = new Map<string, { capture: Capture; phrase: string }>();
      let sessionId = "";
      let etape = 0;
      let ended = false;
      let failed = false;
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
      const launch = () => jouer({
        consigne, cle: input.cle ?? "dev",
        async onCreated(id) { sessionId = id; etape = 0; },
        async onStep(step) {
          etape = step.etape;
          await safe(() => base.insererEvenement({ ...step, passage_id: passage.id, test_id: nextTest(), session_id: sessionId }));
        },
        async onTool(name, args) {
          if (name === "terminer") {
            ended = true;
            failed = args.etat !== "reussi";
            return "Parcours terminé. N'effectue plus aucune action.";
          }
          if (name !== "relever") return "Outil inconnu.";
          const step = consigne.course.find((step) => step.ecran === args.ecran && step.vue === args.vue);
          if (!step) return "Relevé inconnu dans ce parcours.";
          const previous = taken.get(step.key);
          if (previous) return previous.phrase;
          let result: ReleveCapture;
          try { result = await relever(step.ecran, step.vue); }
          catch { return "Relevé impossible : la capture a échoué. Réessaie ou appelle terminer en échec."; }
          if (!bonneAdresse(step, result.url_page, consigne.start)) return "Relevé refusé : écran non atteint. Rejoins l'écran demandé avant de relever.";
          const chemin = `${passage.id}/${step.test_id}/${step.ecran}--${step.vue}.png`;
          let capture: Capture | undefined;
          const written = await safe(async () => {
            const url = await base.deposerPng(chemin, result.png);
            capture = {
              passage_id: passage.id, test_id: step.test_id, session_id: sessionId, ecran: step.ecran, vue: step.vue,
              version: input.version_testee, chemin, url, largeur: result.largeur, hauteur: result.hauteur,
              defilement: result.defilement, texte_page: result.texte, url_page: result.url_page, etape,
              prise_le: new Date(maintenant()).toISOString(),
            };
            await base.enregistrerCapture(capture);
          });
          if (written && capture) taken.set(step.key, { capture, phrase: result.phrase });
          return written ? result.phrase : `${result.phrase}\nAttention : capture non enregistrée, base indisponible.`;
        },
      });
      const finish = async (result: ResultatSession, cout: number | null, etapes: number) => {
        const fin = maintenant();
        const final: Passage = { ...passage, etat: result.muted || result.erreur || failed || !ended || baseFailed ? "echec" : "joue", fin: new Date(fin).toISOString(), duree_s: (fin - debut) / 1000, cout_usd: cout };
        const report: RapportPassage = {
          passage: final,
          tests: consigne.tests.map((test) => {
            const captured = test.releves.filter(({ ecran, vue }) => taken.has(`${ecran}--${vue}`));
            const complete = captured.length === test.releves.length;
            return {
              test_id: test.id, session_id: result.id, etat: complete ? "termine" : "non_concluant",
              ...(!complete ? { raison: result.muted ? "session muette" : "ecran non atteint" } : {}),
              ecrans_releves: [...new Set(captured.map(({ ecran }) => ecran))],
              ...(result.replay_url ? { replay_url: result.replay_url } : {}),
              duree_s: final.duree_s!, cout_usd: cout, etapes,
            };
          }),
        };
        try { writeReport(vault, report, []); }
        catch {
          report.passage.etat = "echec";
          signaler(`Passage ${passage.id} : écriture du rapport dans le vault impossible ; le passage sera en échec.`);
        }
        const written = await safe(() => base.terminerPassage(report));
        if (!written) report.passage.etat = "echec";
        return report;
      };
      let running;
      try { running = await launch(); }
      catch (error) {
        await finish({ id: sessionId, muted: false, cout_usd: null, etapes: 0, erreur: "Création de session impossible." }, null, 0);
        throw error;
      }
      const completion = (async () => {
        let cout: number | null = 0;
        let etapes = 0;
        for (let attempt = 1; ; attempt++) {
          let result: ResultatSession;
          try { result = await running.fin; }
          catch { result = { id: running.id, muted: false, cout_usd: null, etapes: etape, erreur: "Session interrompue." }; }
          cout = cout === null || result.cout_usd === null ? null : cout + result.cout_usd;
          etapes += result.etapes;
          if (result.muted && attempt === 1) {
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
