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

// The part of the exploration of the whole site of the preview (issue #122): mechanical checks prove, Holo only doubts,
// the human says bug or voulu. For each finding, its page, its zone in pixels of the capture (1280 × 900) and its proof,
// and its capture ringed when the wake-up has put it on a branch of the target repository (option a, `image`); the
// captures ringed are also in the note of the passage, whose path closes the part.
// bilan: bilanExploration (scene/recapitulatif.mjs). prouves, doutes, dejaVoulus: [{ id, chemin, texte, preuve,
// zone, capture }]; decisions: [{ ecart_id, decision }].
export function ecrireSectionExploration({ adresse, bilan, totaux, prouves, doutes, dejaVoulus = [], decisions, note }) {
  // « à trancher », the word of the tower of control (#238), where a case left open is settled.
  const decided = (id) => DECIDED[decisions.find((decision) => decision.ecart_id === id)?.decision] ?? "à trancher";
  const zone = ({ zone: box }) => (box ? `zone x ${Math.round(box.x)}, y ${Math.round(box.y)}, ${Math.round(box.largeur)} × ${Math.round(box.hauteur)} px sur la capture` : "zone non mesurée");
  // With --captures-sur-branche (option a), an entry carries `image`: the address of its capture ringed, shown under it.
  // A grouped finding (#180): its CSS selectors folded under the line, for the developer; the jury reads the line.
  const folded = (item) => (item.selecteurs?.length > 1
    ? `\n\n  <details><summary>Sélecteurs des ${item.selecteurs.length} éléments</summary>\n\n${item.selecteurs.map((selector) => `  - \`${selector}\``).join("\n")}\n\n  </details>\n` : "");
  const line = (item, withDecision = true) => `- ${item.chemin} : ${item.texte}${item.preuve ? ` ${item.preuve}` : ""} (${zone(item)}${withDecision ? `, décision : ${decided(item.id)}` : ""})`
    + folded(item) + (item.image ? `\n\n  ![${item.chemin} : ${item.texte.replace(/[[\]]/g, "")}](${item.image})\n` : "");
  const lines = ["### Exploration de tout le site de la prévisualisation", ""];
  if (bilan.aucune) {
    lines.push(`**${bilan.phrase}**`, "");
  } else {
    lines.push(`${adresse} : ${count(totaux.pages_visitees, "page visitée", "pages visitées")} sur ${count(totaux.pages_trouvees, "trouvée", "trouvées")}.`, "");
    lines.push(`**${prouves.length ? count(prouves.length, "défaut de mise en page prouvé", "défauts de mise en page prouvés") : "Aucun défaut prouvé"}${doutes.length ? `, ${count(doutes.length, "doute", "doutes")}` : ""}.**`, "");
    if (prouves.length) lines.push("#### Défauts prouvés par le code", "", ...prouves.map((item) => line(item)), "");
    if (doutes.length) lines.push("#### Doutes du regard de Holo, rien n'est prouvé", "", ...doutes.map((item) => line(item)), "");
    if (dejaVoulus.length) lines.push("#### Déjà déclarés voulus, non redemandés", "", ...dejaVoulus.map((item) => line(item, false)), "");
    if (bilan.nonVisitees.length) lines.push("#### Pages non visitées", "", ...bilan.nonVisitees.map(({ chemin, raison }) => `- ${chemin}${raison ? ` : ${raison.replace(/\.+$/, "")}` : ""}`), "");
  }
  lines.push(`Les captures entourées et chaque décision : \`${note}\` (vault Horama).`, "");
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
