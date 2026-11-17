// Impact of a diff on the accepted tests (decision D6 option B, PR #10, and D7 section 4.1): between two commits,
// the screens whose note declares a changed file in its `code` field, plus the screens of `ecrans_vises` and
// `ne_doit_pas_changer` of the change sheets added or modified between the commits, plus a baseline played every
// time. The vault is read at the `--vers` commit (D7 section 4.2): exported by `git archive` into a temporary
// folder, read with @horama/memoire, removed at the end.
//
// Usage: node automatisation/impact/impact.mjs --depuis <commit> --vers <commit> [--logiciel facturo] [--socle a,b] [--json]
// Stdout: the test ids, comma separated on one line, ready for `parcours.mjs --tests` (or the JSON detail with --json).
// Stderr: the detail for a human. Exit: 0, or 2 when a commit is unknown or the vault cannot be read.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lireChangements, lireNotes, lireTestsAcceptes } from "../../memoire/index.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "../..");
const flag = (name) => process.argv.includes(`--${name}`);
const option = (name, fallback) => (flag(name) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);

// The pure choice: which accepted tests to replay for a set of changed files. `notes` and `tests` come from
// lireNotes/lireTestsAcceptes, `fiches` are the change sheets retained for this diff (already filtered by the
// caller: their file was added or modified between the two commits), `socle` is a list of test ids always played.
// Returns { ids, ecrans, retenus, ecartes, socle_inconnus }, ids sorted without duplicates.
export function choisirTests({ fichiers, notes, fiches, tests, socle }) {
  const changed = new Set(fichiers);
  const ecrans = new Map();
  const touch = (ecran, raison) => {
    if (!ecrans.has(ecran)) ecrans.set(ecran, []);
    if (!ecrans.get(ecran).includes(raison)) ecrans.get(ecran).push(raison);
  };
  for (const note of notes) {
    const { ecran, code } = note.entete ?? {};
    if (typeof ecran !== "string" || !Array.isArray(code)) continue;
    for (const fichier of code.filter((fichier) => typeof fichier === "string" && changed.has(fichier))) {
      touch(ecran, `code de la note ${note.chemin} : ${fichier}`);
    }
  }
  for (const fiche of fiches) {
    for (const ecran of fiche.ecrans_vises) touch(ecran, `fiche ${fiche.id} : ecrans_vises`);
    for (const ecran of fiche.ne_doit_pas_changer) touch(ecran, `fiche ${fiche.id} : ne_doit_pas_changer`);
  }
  const kept = new Map();
  for (const test of tests) {
    const hits = [...new Set(test.releves.map(({ ecran }) => ecran).filter((ecran) => ecrans.has(ecran)))];
    if (hits.length) kept.set(test.id, hits.map((ecran) => `relève ${ecran}`));
  }
  const socle_inconnus = [];
  for (const id of new Set(socle)) {
    if (!tests.some((test) => test.id === id)) {
      socle_inconnus.push(id);
      continue;
    }
    kept.set(id, [...(kept.get(id) ?? []), "socle"]);
  }
  const ids = [...kept.keys()].sort();
  return {
    ids,
    ecrans: [...ecrans.keys()].sort().map((ecran) => ({ ecran, raisons: ecrans.get(ecran) })),
    retenus: ids.map((id) => ({ id, raisons: kept.get(id) })),
    ecartes: tests.filter((test) => !kept.has(test.id)).map((test) => ({ id: test.id })),
    socle_inconnus,
  };
}

const fail = (message) => {
  console.error(`impact : ${message}`);
  process.exit(2);
};

// Reads the vault of a commit without touching the worktree: git archive into a temporary folder, removed after.
function withVault(commit, fn) {
  const folder = mkdtempSync(join(tmpdir(), "horama-impact-"));
  try {
    const archive = execFileSync("git", ["archive", "--format=tar", commit, "vault-horama"], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
    execFileSync("tar", ["-xf", "-", "-C", folder], { input: archive });
    return fn(join(folder, "vault-horama"));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

function detail(resultat, { depuis, vers, logiciel, fichiers, fiches, socle }) {
  const lines = [`Sélection pour ${logiciel}, de ${depuis} à ${vers} :`, ""];
  lines.push(`Fichiers modifiés (${fichiers.length}) :`);
  for (const fichier of fichiers) lines.push(`  ${fichier}`);
  if (!fichiers.length) lines.push("  (aucun)");
  lines.push("", `Fiches de changement retenues (${fiches.length}) :`);
  for (const fiche of fiches) lines.push(`  ${fiche.id} : ${fiche.titre}`);
  if (!fiches.length) lines.push("  (aucune)");
  lines.push("", `Écrans touchés (${resultat.ecrans.length}) :`);
  for (const { ecran, raisons } of resultat.ecrans) lines.push(`  ${ecran} : ${raisons.join(" ; ")}`);
  if (!resultat.ecrans.length) lines.push("  (aucun)");
  lines.push("", `Tests retenus (${resultat.retenus.length}) :`);
  for (const { id, raisons } of resultat.retenus) lines.push(`  ${id} : ${raisons.join(" ; ")}`);
  if (!resultat.retenus.length) lines.push("  (aucun)");
  lines.push("", `Tests écartés (${resultat.ecartes.length}) :`);
  for (const { id } of resultat.ecartes) lines.push(`  ${id}`);
  if (!resultat.ecartes.length) lines.push("  (aucun)");
  lines.push("", `Socle : ${socle.join(", ") || "(vide)"}${resultat.socle_inconnus.length ? ` ; inconnus : ${resultat.socle_inconnus.join(", ")}` : ""}`);
  return lines.join("\n");
}

function main() {
  const DEPUIS = option("depuis");
  const VERS = option("vers");
  const LOGICIEL = option("logiciel", "facturo");
  if (!DEPUIS || !VERS) {
    fail("usage : node automatisation/impact/impact.mjs --depuis <commit> --vers <commit> [--logiciel facturo] [--socle a,b] [--json]");
  }
  const git = (args, options) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", ...options });
  for (const commit of [DEPUIS, VERS]) {
    try {
      git(["rev-parse", "--verify", "--quiet", `${commit}^{commit}`], { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      fail(`commit inconnu : ${commit}`);
    }
  }
  const fichiers = git(["diff", "--name-only", DEPUIS, VERS]).split("\n").filter(Boolean);
  let socle;
  if (flag("socle")) {
    socle = (option("socle") ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  } else {
    try {
      socle = JSON.parse(readFileSync(join(HERE, "socle.json"), "utf8"))[LOGICIEL] ?? [];
    } catch (error) {
      fail(`socle.json illisible : ${error.message.split("\n")[0]}`);
    }
  }
  let sortie;
  try {
    sortie = withVault(VERS, (vault) => {
      const notes = lireNotes(vault, LOGICIEL);
      const tests = lireTestsAcceptes(vault, LOGICIEL);
      const fiches = lireChangements(vault, LOGICIEL).filter((fiche) =>
        fichiers.includes(`vault-horama/${LOGICIEL}/${fiche.chemin}`),
      );
      return { resultat: choisirTests({ fichiers, notes, fiches, tests, socle }), fiches };
    });
  } catch (error) {
    const reason = error.stderr?.toString().split("\n")[0] ?? error.message.split("\n")[0];
    fail(`le vault du commit ${VERS} ne se lit pas : ${reason}`);
  }
  const { resultat, fiches } = sortie;
  if (flag("json")) {
    process.stdout.write(`${JSON.stringify({ depuis: DEPUIS, vers: VERS, logiciel: LOGICIEL, fichiers, fiches_retenues: fiches.map(({ id }) => id), socle, ...resultat }, null, 2)}\n`);
    return;
  }
  console.error(detail(resultat, { depuis: DEPUIS, vers: VERS, logiciel: LOGICIEL, fichiers, fiches, socle }));
  process.stdout.write(`${resultat.ids.join(",")}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
