import { readFileSync } from "node:fs";
import type { Decision } from "@horama/contrats";
import type { Note } from "@horama/memoire";
import { CORRECTION_MODEL } from "../correction/index.ts";
import { buildMessages } from "../correction/prompt.ts";
import { validateAnswer } from "../correction/validation.ts";
import { callModel } from "../generation/router.ts";

interface Fixture {
  decision: Decision;
  note: Note;
  releaseNote?: Note;
  indices: string[];
}

const [path, model = CORRECTION_MODEL] = process.argv.slice(2);
if (!path || !process.env.HF_TOKEN) throw new Error("Usage : HF_TOKEN lié dans l'environnement, node jugement/scripts/t54-correction.ts <entrees.json> [modele]");
const fixtures = JSON.parse(readFileSync(path, "utf8")) as { gray: Fixture; caseA: Fixture };
for (const name of ["gray", "caseA"] as const) {
  const { decision, note, releaseNote, indices } = fixtures[name];
  const messages = buildMessages(decision, note, releaseNote, indices);
  const sources = [decision.ecart, decision.pourquoi ?? "", ...indices].join("\n");
  console.log(JSON.stringify({ cas: name, modele: model, messages }));
  for (let pass = 1; pass <= 6; pass++) {
    const call = await callModel(model, messages);
    const checked = call.content === undefined ? undefined : validateAnswer(call.content, note, decision.version, sources, sources);
    console.log(JSON.stringify({ cas: name, passe: pass, appel: call, validation: checked }));
    if (!call.content) process.exitCode = 1;
  }
}
