import type { TestPropose, Version } from "@horama/contrats";
import { lireNotes } from "@horama/memoire";
import { buildMessages, retryMessage } from "./prompt.ts";
import { callModel } from "./router.ts";
import type { ModelCall } from "./router.ts";
import { validateAnswer } from "./validation.ts";

// Provisional: T4 has not been measured yet. The winner of comparaison.md (written by scripts/t4-generation.ts) goes here.
export const DEFAULT_MODEL = "openai/gpt-oss-120b";

export interface Options {
  modele?: string;
  version?: Version; // tested version
  trace?: (call: ModelCall) => void; // receives every call to the router, with the raw answer and the reasons of refusal
}

export interface Proposal {
  tests: TestPropose[];
  modele: string;
  duree_ms: number;
  essais: number;
}

export async function proposerTests(vault: string, logiciel: string, cheminNote: string, options: Options = {}): Promise<Proposal> {
  const modele = options.modele ?? DEFAULT_MODEL;
  const notes = lireNotes(vault, logiciel);
  const note = notes.find(({ chemin }) => chemin === cheminNote);
  if (!note) throw new Error(`Note « ${cheminNote} » introuvable dans ${logiciel}`);
  const screens = notes.filter(({ chemin, entete }) => chemin.startsWith("produit/") && typeof entete.ecran === "string");
  const source = { logiciel, note, screens: screens.map(({ entete }) => entete.ecran as string), modele };
  const messages = buildMessages(logiciel, options.version ?? "13", note, screens);

  const start = Date.now();
  let reasons: string[] = [];
  for (let essais = 1; essais <= 2; essais++) {
    const call = await callModel(modele, messages);
    const checked = call.content === undefined ? undefined : validateAnswer(call.content, source);
    options.trace?.({ ...call, rejections: checked?.reasons });
    if (!checked) throw new Error(`Génération impossible (${modele}, ${cheminNote}) : ${call.error}`);
    if (!checked.reasons.length) return { tests: checked.tests, modele, duree_ms: Date.now() - start, essais };
    reasons = checked.reasons;
    messages.push({ role: "assistant", content: call.content! }, { role: "user", content: retryMessage(reasons) });
  }
  throw new Error(`Tests refusés après 2 essais (${modele}, ${cheminNote}) : ${reasons.join(" ; ")}`);
}
