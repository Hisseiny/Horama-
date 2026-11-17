// Local fallback for issue #36: a commit touching site-eugenia/ wakes impact, then the scripted scene.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const commitAt = (root, ref) => git(root, ["rev-parse", "--verify", `${ref}^{commit}`]);

// Check every first-parent commit, including when several arrive between two polls.
export function changesSince(root, previous, ref) {
  const current = commitAt(root, ref);
  if (current === previous) return [];
  execFileSync("git", ["merge-base", "--is-ancestor", previous, current], { cwd: root });
  let before = previous;
  return git(root, ["rev-list", "--first-parent", "--reverse", `${previous}..${current}`]).split("\n").filter(Boolean).map((after) => {
    const changed = git(root, ["diff", "--name-only", before, after, "--", "site-eugenia/"]);
    const change = { before, after, siteChanged: changed.length > 0 };
    before = after;
    return change;
  });
}

function runNode(root, args, capture = false) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"] });
    let stdout = "";
    child.stdout?.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolveRun(stdout);
      else reject(new Error(`${args[0]} : sortie ${code ?? signal}`));
    });
  });
}

export async function wakeCommit({ root = ROOT, before, after, baseUrl, software = "eugenia", output, sceneArgs = [] }, run = runNode) {
  const started = performance.now();
  const folder = join(output, after);
  mkdirSync(folder, { recursive: true });
  const impactFile = join(folder, "impact.json");
  const reportFile = join(folder, "reveil.json");
  const report = { depuis: before, vers: after, recu_le: new Date().toISOString(), base_url: baseUrl, etat: "impact" };
  const save = () => writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  save();
  try {
    const json = await run(root, ["automatisation/impact/impact.mjs", "--depuis", before, "--vers", after, "--logiciel", software, "--json"], true);
    const impact = JSON.parse(json);
    if (impact.format !== "horama-impact-1" || impact.logiciel !== software || !Array.isArray(impact.retenus) || !Array.isArray(impact.ecartes)) {
      throw new Error("impact ne produit pas un fichier horama-impact-1 lisible par la scène");
    }
    writeFileSync(impactFile, json);
    report.impact_ms = performance.now() - started;
    console.log(`réveil : impact écrit dans ${impactFile} (${impact.retenus.length} retenus, ${impact.ecartes.length} écartés)`);
    if (!impact.retenus.length) {
      report.etat = "aucun-test";
      console.log("réveil : aucun test retenu, scène non lancée");
      return report;
    }
    // The scene writes reports/decisions: give it a private vault from the same commit as impact.
    const archive = execFileSync("git", ["archive", "--format=tar", after, "vault-horama"], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
    execFileSync("tar", ["-xf", "-", "-C", folder], { input: archive });
    const args = ["automatisation/scene/parcours.mjs", "--sans-agent", "--sans-base", "--impact", impactFile,
      "--base-url", baseUrl, "--logiciel", software, "--vault", join(folder, "vault-horama"),
      "--profil", join(output, "profil"), "--sortie", join(folder, "scene"), ...sceneArgs];
    report.scene_lancee_ms = performance.now() - started;
    report.etat = "scene";
    save();
    console.log(`réveil : lancement de la scène après ${report.scene_lancee_ms.toFixed(1)} ms`);
    await run(root, args);
    report.etat = "termine";
    report.total_ms = performance.now() - started;
    return report;
  } catch (error) {
    report.etat = "echec";
    report.erreur = error.message;
    throw error;
  } finally {
    save();
  }
}

async function main() {
  const separator = process.argv.indexOf("--");
  const sceneArgs = separator < 0 ? [] : process.argv.slice(separator + 1);
  const { values } = parseArgs({ args: process.argv.slice(2, separator < 0 ? undefined : separator), options: {
    branche: { type: "string" }, depuis: { type: "string" }, "base-url": { type: "string" },
    logiciel: { type: "string", default: "eugenia" }, sortie: { type: "string", default: ".orchestrateur/reveil" },
    intervalle: { type: "string", default: "500" }, "une-fois": { type: "boolean" }, aide: { type: "boolean" },
  } });
  if (values.aide) {
    console.log("Usage : node automatisation/reveil/wake.mjs --base-url http://localhost:3000 [--branche branche-demo] [--depuis commit] [--une-fois] [--intervalle 500] [--sortie dossier] [--logiciel eugenia] [-- options-scene]");
    return;
  }
  const url = new URL(values["base-url"]);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("--base-url attend une adresse HTTP(S) du site déjà servi");
  const interval = Number(values.intervalle);
  if (!Number.isFinite(interval) || interval < 50) throw new Error("--intervalle doit être un nombre de millisecondes >= 50");
  // Selection, target and writes belong to the wake-up, not to forwarded scene options.
  const reserved = new Set(["tests", "impact", "base-url", "logiciel", "vault", "profil", "sortie", "avec-base"]);
  for (const arg of sceneArgs) {
    if (reserved.has(arg.replace(/^--/, "").split("=")[0])) throw new Error(`option de scène réservée au réveil : ${arg}`);
  }
  const branch = values.branche ?? git(ROOT, ["symbolic-ref", "--short", "HEAD"]);
  let previous = commitAt(ROOT, values.depuis ?? branch);
  const output = resolve(ROOT, values.sortie);
  console.log(`réveil : surveillance de ${branch} depuis ${previous}, site-eugenia/, toutes les ${interval} ms`);
  while (true) {
    for (const change of changesSince(ROOT, previous, branch)) {
      if (change.siteChanged) {
        await wakeCommit({ before: change.before, after: change.after, baseUrl: url.href, software: values.logiciel, output, sceneArgs });
        if (values["une-fois"]) return;
      }
      previous = change.after;
    }
    await setTimeout(interval);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`réveil : arrêt — ${error.message}. Corriger puis relancer avec --depuis <dernier commit traité>.`);
    process.exitCode = 2;
  });
}
