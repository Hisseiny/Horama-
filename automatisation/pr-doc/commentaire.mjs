// The answer on the pull request that woke the passage (issue #71, mode dev): what was replayed and set aside, what is
// proven, what is only a doubt, what the human decided, and where the note of the passage is. Text only: the API of
// GitHub cannot attach an image to a comment; the captures stay with the note of the passage, in the vault.
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const count = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const DECIDED = { bug: "bug", voulu: "voulu" };

// passage: id of the passage; rejoues, ecartes: lines « id (raisons) »; prouves, doutes: [{ id, ecran, texte }];
// decisions: [{ ecart_id, decision }]; note: path of the note of the passage in the vault; complet: every relevé taken.
export function ecrireCommentaire({ passage, rejoues, ecartes, prouves, doutes, decisions, note, complet = true }) {
  const decided = (id) => DECIDED[decisions.find((decision) => decision.ecart_id === id)?.decision] ?? "pas tranché";
  const verdict = !complet ? "Passage incomplet : tous les écrans n'ont pas pu être relevés."
    : prouves.length ? `${count(prouves.length, "défaut prouvé", "défauts prouvés")}${doutes.length ? `, ${count(doutes.length, "doute", "doutes")}` : ""}.`
    : doutes.length ? `Aucun défaut prouvé, ${count(doutes.length, "doute", "doutes")} à regarder.` : "Aucun défaut prouvé, aucun doute : rien à signaler.";
  const lines = [`## Horama : passage ${passage}`, "", `**${verdict}**`, "", "### Tests", "",
    ...rejoues.map((line) => `- Rejoué : ${line}`), ...ecartes.map((line) => `- Écarté : ${line}`), ...(rejoues.length + ecartes.length ? [] : ["- Aucun test."]), ""];
  if (prouves.length) lines.push("### Défauts prouvés par le code", "", ...prouves.map(({ id, ecran, texte }) => `- ${ecran} : ${texte} (décision : ${decided(id)})`), "");
  if (doutes.length) lines.push("### Doutes, rien n'est prouvé", "", ...doutes.map(({ id, ecran, texte }) => `- ${ecran} : ${texte} (décision : ${decided(id)})`), "");
  lines.push(`La note du passage, avec chaque capture entourée et chaque décision : \`${note}\` (vault Horama).`, "");
  return lines.join("\n");
}

// Posts the comment with gh (`gh pr comment <adresse> --body-file`). A failure is returned, never thrown: the scene
// says it and goes on. run(command, args, options) is injectable, with the result of promisified execFile.
export async function publierCommentaire(adresse, corps, { run = execute } = {}) {
  const folder = await mkdtemp(join(tmpdir(), "horama-commentaire-"));
  try {
    const file = join(folder, "commentaire.md");
    await writeFile(file, corps);
    const result = await run("gh", ["pr", "comment", adresse, "--body-file", file], { encoding: "utf8", timeout: 60_000 });
    return { status: "publie", url: result.stdout.trim() };
  } catch (error) {
    return { status: "INCONCLUSIVE", reason: error.message.trim().split("\n").at(-1) };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
