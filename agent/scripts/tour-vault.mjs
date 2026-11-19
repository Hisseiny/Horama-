import { FRONT_MATTER, splitFrontMatter, yamlScalar } from "../../memoire/src/files.ts";

export function recordDecision(index, { passage: key, constat, decision }, name, now) {
  const passage = key.replace(/^dev:/, "");
  const entry = index.passages.find(item => (item.passage ?? `${item.pr?.numero}-${item.commit}`) === passage);
  const finding = entry?.constats?.find(item => item.id === constat);
  if (!finding) return { changed: false, value: { status: 404 } };
  const previous = finding.decision;
  if (previous) return { changed: false, value: { status: 409, verdict: previous } };
  const verdict = { choix: decision, decision, par: name, le: new Date(now()).toISOString() };
  finding.decision = verdict;
  index.maj = verdict.le;
  return { changed: true, value: { status: 200, verdict } };
}

const decisionBlock = /^```decision[ \t]*\n([\s\S]*?)^```[ \t]*$/m;
const conflict = message => Object.assign(new Error(message), { conflict: true });
const documentationLine = ({ fichier, statut }) => statut === "acceptee"
  ? `${fichier} corrigée (proposition acceptée).` : `${fichier} laissée telle quelle (proposition refusée).`;

export function readCorrection(text) {
  if (!text) return null;
  const block = decisionBlock.exec(text.replace(/\r\n/g, "\n"));
  const correction = block ? JSON.parse(block[1]).correction_de_note : null;
  return typeof correction?.fichier === "string" && typeof correction.avant === "string" &&
    typeof correction.apres === "string" ? correction : null;
}

export function applyCorrection(text, { fichier, avant, apres }) {
  const count = avant ? text.split(avant).length - 1 : 0;
  // A retry after a failed second write finds the note already corrected.
  if (count === 0 && apres && text.includes(apres)) return text;
  if (count !== 1) throw conflict(`Le texte à remplacer apparaît ${count} fois dans ${fichier} (une seule attendue).`);
  return text.replace(avant, () => apres);
}

export function closeCorrection(text, statut, note) {
  const markdown = text.replace(/\r\n/g, "\n");
  const block = decisionBlock.exec(markdown);
  const decision = JSON.parse(block[1]);
  const correction = decision.correction_de_note;
  if (correction?.fichier !== note || correction.statut !== "proposee") throw conflict("Cette correction a déjà été tranchée.");
  decision.correction_de_note = { ...correction, statut };
  return markdown
    .replace(/^Documentation : .*$/m, () => `Documentation : ${documentationLine(decision.correction_de_note)}`)
    .replace(decisionBlock, () => `\`\`\`decision\n${JSON.stringify(decision, null, 2)}\n\`\`\``);
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
