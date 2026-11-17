import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, sep } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

function relativePath(value) {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.split(/[\\/]/).some((part) => part === ".." || part === ".git")) {
    throw new Error("Le chemin de la note doit rester relatif au dépôt et au vault.");
  }
  return value;
}

// C5 is passed unchanged, after appliquerCorrection has returned an accepted correction.
// run(command, args, options) is injectable; it has the same result as promisified execFile.
export async function ouvrirPrDoc(
  { passage_id, fichier, avant, apres, decision },
  { repository, vaultPath, passageUrl, base = "dev", remote = `https://github.com/${repository}.git`, run = execute } = {},
) {
  const correction = decision?.correction_de_note;
  if (decision?.decision !== "voulu" || decision.passage_id !== passage_id || correction?.statut !== "acceptee"
    || correction.fichier !== fichier || correction.avant !== avant || correction.apres !== apres) {
    throw new Error("Une correction acceptée et sa décision C5 correspondante sont nécessaires.");
  }
  if (![passage_id, avant, decision.test_id, decision.ecart, decision.par, base].every((value) => typeof value === "string" && value.trim()) || typeof apres !== "string" || avant === apres) {
    throw new Error("Le passage, le test, l'écart, l'auteur et une correction effective sont nécessaires.");
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) throw new Error("repository doit être explicite, au format propriétaire/dépôt.");
  const link = new URL(passageUrl);
  if (!["http:", "https:"].includes(link.protocol)) throw new Error("passageUrl doit être un lien HTTP(S) vers le passage.");
  const notePath = join(relativePath(vaultPath), relativePath(fichier));
  if (!notePath.endsWith(".md")) throw new Error("La correction doit viser une note Markdown.");

  const branch = `docs/note-${randomUUID()}`;
  const temporary = await mkdtemp(join(tmpdir(), "horama-pr-doc-"));
  const checkout = join(temporary, "checkout");
  const git = (args) => run("git", args, { cwd: checkout, encoding: "utf8", timeout: 60_000 });
  try {
    await run("git", ["clone", "--single-branch", "--branch", base, "--no-tags", "--", remote, checkout], { encoding: "utf8", timeout: 60_000 });
    await git(["switch", "--create", branch]);
    await git(["ls-files", "--error-unmatch", "--", notePath]);
    const file = await realpath(join(checkout, notePath));
    if (!file.startsWith(await realpath(checkout) + sep)) throw new Error("La note sort du dépôt (lien symbolique).");
    const note = await readFile(file, "utf8");
    const count = note.split(avant).length - 1;
    if (count !== 1) throw new Error(`Le texte avant apparaît ${count} fois dans ${notePath} (une seule attendue).`);
    await writeFile(file, note.replace(avant, () => apres));
    await git(["add", "--", notePath]);
    await git(["commit", "-m", `docs : correction acceptée du passage ${passage_id}`, "--", notePath]);

    const body = [
      `Test : ${decision.test_id}`,
      `Écart : ${decision.ecart}`,
      `Décision humaine : voulu, correction acceptée par ${decision.par}.${decision.pourquoi ? ` ${decision.pourquoi}` : ""}`,
      `Note : ${notePath}`,
      `Passage : ${passageUrl}`,
      "",
    ].join("\n");
    const bodyFile = join(temporary, "pr.md");
    await writeFile(bodyFile, body);
    // An explicit refspec never pushes a base branch, even with push.default configured globally.
    await git(["push", "origin", `HEAD:refs/heads/${branch}`]);
    const result = await run("gh", [
      "pr", "create", "--repo", repository, "--base", base, "--head", branch,
      "--title", `Documentation : correction du test ${decision.test_id}`, "--body-file", bodyFile,
    ], { cwd: checkout, encoding: "utf8", timeout: 60_000 });
    return { status: "opened", url: result.stdout.trim(), branch };
  } catch (error) {
    // A failed push or GitHub call must not interrupt the scene or claim a PR exists.
    return { status: "INCONCLUSIVE", reason: error.message, branch };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
