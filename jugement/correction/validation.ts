import type { Version } from "@horama/contrats";
import type { Note } from "@horama/memoire";
import { key } from "../verification/values.ts";

export interface Checked {
  avant?: string;
  apres?: string;
  raison: string;
  reasons: string[]; // why the code refuses the answer; empty when it is accepted
}

const LABEL = /«\s*([^»]+?)\s*»/g;
export const labels = (text: string) => new Set([...text.matchAll(LABEL)].map((match) => match[1]));
const occurrences = (text: string, part: string) => text.split(part).length - 1;

// The lines a correction may touch: the body of the note, outside the front matter, the headings and the « Règles » part.
export function editableLines(note: Note): string[] {
  const lines = note.texte.split("\n");
  const body = lines[0] === "---" ? lines.slice(lines.indexOf("---", 1) + 1) : lines;
  let inRules = false;
  return body.filter((line) => {
    if (line.startsWith("#")) inRules = /^## Règles\s*$/.test(line);
    return !inRules && !line.startsWith("#");
  });
}

// "(depuis la version 13)" goes before the final point, so the sentence keeps its punctuation.
export function withVersion(sentence: string, version: Version): string {
  const mark = `(depuis la version ${version})`;
  return /[.!]$/.test(sentence) ? `${sentence.slice(0, -1)} ${mark}${sentence.slice(-1)}` : `${sentence} ${mark}`;
}

// `sources`: the decision and hints, not the whole note or the model's instructions.
// `change`: what is said of this change (ecart, pourquoi, hints). When it names labels, the correction must be about one of them.
export function validateAnswer(content: string, note: Note, version: Version, sources = "", change = ""): Checked {
  let answer: unknown;
  try {
    answer = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { raison: "", reasons: ["la réponse n'est pas un objet JSON"] };
  }
  const { phrase_contredite: before, nouvelle_phrase: after, raison } = (answer ?? {}) as Record<string, unknown>;
  const why = typeof raison === "string" ? raison.trim() : "";
  if (before === null) {
    return after === null ? { raison: why, reasons: [] } : { raison: why, reasons: ["« nouvelle_phrase » doit être null quand « phrase_contredite » l'est"] };
  }
  if (typeof before !== "string" || !before.trim()) return { raison: why, reasons: ["« phrase_contredite » doit être une phrase de la note, ou null"] };
  const avant = before.trim();
  const reasons: string[] = [];
  if (avant.includes("\n")) reasons.push("« phrase_contredite » tient sur plusieurs lignes : une seule phrase est attendue");
  const count = occurrences(note.texte, avant);
  if (count !== 1) reasons.push(`« phrase_contredite » apparaît ${count} fois dans la note (une seule attendue, recopiée caractère pour caractère) : « ${avant} »`);
  else if (!editableLines(note).some((line) => line.includes(avant))) {
    reasons.push("« phrase_contredite » est dans l'en-tête, un titre ou la partie « Règles » : ces lignes ne se corrigent pas ici");
  }
  // The note is contradicted but nothing says the new state: no correction, and the caller says why.
  if (after === null) return { raison: why, reasons };
  const named = labels(change);
  const touched = new Set([...labels(avant), ...(typeof after === "string" ? labels(after) : [])].map(key));
  if (named.size && ![...named].some((label) => touched.has(key(label)))) {
    reasons.push(`la correction ne parle pas de ce changement (${[...named].map((label) => `« ${label} »`).join(", ")}) : ne corrige que ce qui concerne ce changement, sinon réponds null`);
  }
  if (typeof after !== "string" || !after.trim()) return { raison: why, reasons: [...reasons, "« nouvelle_phrase » doit être une phrase, ou null"] };
  const sentence = after.trim();
  if (sentence.includes("\n")) reasons.push("« nouvelle_phrase » tient sur plusieurs lignes : une seule phrase est attendue");
  if (sentence === avant) reasons.push("« nouvelle_phrase » est identique à « phrase_contredite »");
  if (/\bversion\b/i.test(sentence)) reasons.push("« nouvelle_phrase » cite une version : le programme l'ajoute lui-même");
  const known = new Set([...sources.split(/\r?\n/), ...labels(sources), ...labels(avant)].map(key));
  const invented = [...labels(sentence)].filter((label) => !known.has(key(label)));
  if (invented.length) reasons.push(`« nouvelle_phrase » cite des libellés que rien ne donne : ${invented.map((label) => `« ${label} »`).join(", ")}`);
  return reasons.length ? { raison: why, reasons } : { avant, apres: withVersion(sentence, version), raison: why, reasons };
}
