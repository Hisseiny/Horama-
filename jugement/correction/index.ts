import type { Decision } from "@horama/contrats";
import { lireNotes } from "@horama/memoire";
import { DEFAULT_MODEL } from "../generation/index.ts";
import { callModel } from "../generation/router.ts";
import type { ModelCall } from "../generation/router.ts";
import { buildMessages, retryMessage } from "./prompt.ts";
import { validateAnswer } from "./validation.ts";

export interface CorrectionOptions {
  modele?: string;
  indices?: string[]; // what the caller knows besides the decision, e.g. the question asked to the human with its position words
  trace?: (call: ModelCall) => void; // receives every call to the router, with the raw answer and the reasons of refusal
}

export interface CorrectionProposal {
  decision: Decision; // the decision, with `correction_de_note` (statut "proposee") when a correction is proposed
  raison: string; // why there is, or is not, a correction: shown to the human when there is none
  modele: string;
  duree_ms: number;
  essais: number;
}

// Proposes the note correction of a "voulu" decision. Never throws for a model or network failure: the decision comes back
// without correction and `raison` says why. `appliquerCorrection` (@horama/memoire) applies it once the human accepts.
export async function proposerCorrection(vault: string, decision: Decision, options: CorrectionOptions = {}): Promise<CorrectionProposal> {
  const modele = options.modele ?? DEFAULT_MODEL;
  const start = Date.now();
  const none = (raison: string, essais = 0): CorrectionProposal => ({ decision, raison, modele, duree_ms: Date.now() - start, essais });
  if (decision.decision !== "voulu") return none("Un bug ne change pas la documentation.");
  const notes = lireNotes(vault, decision.logiciel);
  const note = notes.find(({ entete }) => entete.ecran === decision.ecran);
  if (!note) return none(`Aucune note de ${decision.logiciel} ne décrit l'écran « ${decision.ecran} ».`);
  const releaseNote = notes.find(({ chemin }) => chemin === `notes-de-version/v${decision.version}.md`);
  const messages = buildMessages(decision, note, releaseNote, options.indices ?? []);
  const sources = messages.map(({ content }) => content).join("\n");

  let reasons: string[] = [];
  for (let essais = 1; essais <= 2; essais++) {
    const call = await callModel(modele, messages);
    const checked = call.content === undefined ? undefined : validateAnswer(call.content, note, decision.version, sources);
    options.trace?.({ ...call, rejections: checked?.reasons });
    if (!checked) return none(`Pas de correction proposée : le modèle n'a pas répondu (${call.error}).`, essais);
    if (!checked.reasons.length) {
      const { avant, apres, raison } = checked;
      if (!avant || !apres) return none(raison ? `Pas de correction proposée : ${raison}` : "Pas de correction proposée.", essais);
      return {
        decision: { ...decision, correction_de_note: { fichier: note.chemin, avant, apres, statut: "proposee" } },
        raison,
        modele,
        duree_ms: Date.now() - start,
        essais,
      };
    }
    reasons = checked.reasons;
    messages.push({ role: "assistant", content: call.content! }, { role: "user", content: retryMessage(reasons) });
  }
  return none(`Pas de correction proposée : réponse refusée après 2 essais (${reasons.join(" ; ")}).`, 2);
}
