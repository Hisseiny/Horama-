import { createHash } from "node:crypto";
import { FRONT_MATTER, splitFrontMatter, yamlScalar } from "../../memoire/src/files.ts";

export function recordDecision(index, { passage: key, constat, decision }, name, now) {
  const passage = key.replace(/^dev:/, "");
  const entry = index.passages.find(item => (item.passage ?? `${item.pr?.numero}-${item.commit}`) === passage);
  const finding = entry?.constats?.find(item => item.id === constat);
  if (!finding) return { changed: false, value: { status: 404 } };
  const previous = finding.decision;
  const verdict = previous ?? { choix: decision, decision, par: name, le: new Date(now()).toISOString() };
  if (!previous) {
    finding.decision = verdict;
    index.maj = verdict.le;
  }
  // Earlier decisions came from the scene and already have their own vault notes.
  const note = verdict.decision ? decisionNote(entry, finding, passage, verdict) : null;
  return { changed: !previous, value: { status: previous ? 409 : 200, verdict, note } };
}

function decisionNote(entry, finding, passage, verdict) {
  const id = "tour-" + createHash("sha256").update(JSON.stringify([passage, finding.id])).digest("hex").slice(0, 32);
  const screen = finding.ecran ?? finding.id.split("--")[0];
  const data = {
    id, passage_id: passage, test_id: finding.test_id ?? `exploration--${screen}`, ecart_id: finding.id,
    decision: verdict.decision, logiciel: "eugenia-clone", ecran: screen, vue: "defaut",
    ecart: finding.texte ?? finding.id, zone: finding.zone ?? undefined, version: String(entry.version ?? entry.commit),
    portee: "cet ecart, cet ecran, cette version", par: verdict.par, le: verdict.le,
  };
  const content = [
    "---", `date: ${yamlScalar(data.le.slice(0, 10))}`, `version: ${yamlScalar(data.version)}`,
    `ecran: ${yamlScalar(data.ecran)}`, `vue: ${data.vue}`, `par: ${yamlScalar(data.par)}`,
    `decision: ${data.decision}`, "---", "",
    `Écart : ${data.ecart.replace(/\s+/g, " ")}`, `Décision : ${data.decision}`,
    "", "```decision", JSON.stringify(data, null, 2), "```", "",
  ].join("\n");
  return { id, content };
}

const taskSection = /^## Task[ \t]*\n[\s\S]*?(?=^## Expected Result[ \t]*$)/m;
const verificationSection = /^## Verification[ \t]*\n[\s\S]*?(?=^```regles[ \t]*$)/m;
const acceptanceFields = /^(?:statut|accepte_par|accepte_le|refuse_par|refuse_le):/;
const readingInstruction = "Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.";

export function updateTestMarkdown(text, { test, action, task, verification }, name, now) {
  const markdown = text.replace(/\r\n/g, "\n");
  const front = FRONT_MATTER.exec(markdown);
  const { header, body } = splitFrontMatter(markdown);
  if (!front || header.id !== test || !taskSection.test(body) || !verificationSection.test(body)) {
    throw new Error("Format du test illisible.");
  }
  let updatedBody = body;
  if (action === "modifier") {
    if (task !== undefined) updatedBody = updatedBody.replace(taskSection, () => {
      const steps = task.trim().split("\n").filter(line => !line.includes(readingInstruction));
      const number = Number(steps.filter(line => /^\d+\. /.test(line)).at(-1)?.match(/^\d+/)?.[0] ?? 0) + 1;
      return `## Task\n${steps.join("\n").trimEnd()}\n${number}. ${readingInstruction}\n\n`;
    });
    if (verification !== undefined) {
      updatedBody = updatedBody.replace(verificationSection, () => `## Verification\n${verification.trim()}\n\n`);
    }
  }
  const status = action === "refuser" ? "refuse" : "accepte";
  if (header.statut === status && header[`${status}_par`] === name && header[`${status}_le`] && updatedBody === body) return text;
  const date = new Date(now()).toISOString();
  const fields = front[1].split("\n").filter(line => !acceptanceFields.test(line));
  fields.push(`statut: ${status}`, `${status}_par: ${yamlScalar(name)}`, `${status}_le: ${date}`);
  return `---\n${fields.join("\n")}\n---\n${updatedBody}`;
}
