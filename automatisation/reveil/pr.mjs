// Wake-up by a pull request of the target site (issue #71, mode dev on a clone whose code we have): the Mac asks GitHub
// every 20 s or so, no public server. For each open PR whose last commit has a successful Vercel Preview deployment,
// once: the files the PR changes (GitHub), the tests they touch (choisirTests of impact.mjs, on the vault of this
// repository: notes whose `code:` field lists a changed file, plus the baseline), then the scene on the preview address.
// Several pushes in a row: only the last commit of the PR is played, once its own preview is ready.
//
// Usage: node automatisation/reveil/pr.mjs --depot <propriétaire/dépôt> --logiciel <logiciel du vault> [--intervalle 20]
//          [--une-fois] [--a-blanc] [--vault vault-horama] [--sortie .orchestrateur/reveil-pr] [--faux-github <fichier.json>]
//          [-- options de la scène, par exemple --vitrine]
// --a-blanc: one look at the repository, nothing played (no scene, no H, nothing written): the open PRs, the Preview
// deployment of their last commit, their files and the tests they would replay, and how many Preview deployments the
// repository has at all (none: Vercel is not linked to it yet).
// --faux-github: a JSON file { prs: [...], deploiements: { <sha>: { etat, adresse } }, fichiers: { <numéro>: [...] } }
// read instead of GitHub, to try the chain without a real PR.
// Exit: 0 (--une-fois: after the first PR played), 2 on a usage error or a failed impact or scene.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { lireNotes, lireTestsAcceptes } from "../../memoire/index.ts";
import { choisirTests } from "../impact/impact.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const gh = (path) => JSON.parse(execFileSync("gh", ["api", "--paginate", "--slurp", path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })).flat();

// What GitHub says of a repository: its open PRs, the Preview deployment of a commit, the files of a PR. Vercel writes a
// deployment per commit with an environment named « Preview » (sometimes « Preview – <projet> ») and, once ready, a
// status « success » whose environment_url is the preview address.
export function lecteurGithub(depot, read = gh) {
  return {
    prs: () => read(`repos/${depot}/pulls?state=open&per_page=100`).map((pr) => ({ numero: pr.number, adresse: pr.html_url, titre: pr.title, base: pr.base.sha, tete: pr.head.sha })),
    previsualisation(sha) {
      const deployment = read(`repos/${depot}/deployments?sha=${sha}&per_page=100`).find((candidate) => /^preview/i.test(candidate.environment ?? ""));
      if (!deployment) return null;
      const status = read(`repos/${depot}/deployments/${deployment.id}/statuses?per_page=100`)[0];
      return status ? { etat: status.state, adresse: status.environment_url || status.target_url || null } : null;
    },
    fichiers: (numero) => read(`repos/${depot}/pulls/${numero}/files?per_page=100`).map((file) => file.filename),
    deploiementsPreview: () => read(`repos/${depot}/deployments?per_page=100`).filter((candidate) => /^preview/i.test(candidate.environment ?? "")).length,
  };
}

// The same three answers read from a JSON file (--faux-github), for a trial without a real PR.
export function lecteurFaux(fichier) {
  const data = () => JSON.parse(readFileSync(fichier, "utf8"));
  return {
    prs: () => data().prs,
    previsualisation: (sha) => data().deploiements?.[sha] ?? null,
    fichiers: (numero) => data().fichiers?.[numero] ?? [],
    deploiementsPreview: () => Object.keys(data().deploiements ?? {}).length,
  };
}

// The PRs to play now: open, last commit deployed with success to a preview address, not played yet (`faits` holds
// « numéro@sha »). A PR whose preview is not ready yet is waited for, not skipped.
export function aJouer(lecteur, faits) {
  const prets = [];
  for (const pr of lecteur.prs()) {
    if (faits.has(`${pr.numero}@${pr.tete}`)) continue;
    const preview = lecteur.previsualisation(pr.tete);
    if (preview?.etat === "success" && preview.adresse) prets.push({ ...pr, previsualisation: preview.adresse });
  }
  return prets;
}

// The selection of a PR, in the format the scene reads (horama-impact-1, docs/decisions/2026-11-17-format-impact.md):
// `depuis` and `vers` are the base and the last commit of the PR, `fichiers` the files it changes in the target site.
export function impactDePr({ pr, fichiers, vault, logiciel, socle = [] }) {
  const resultat = choisirTests({ fichiers, notes: lireNotes(vault, logiciel), fiches: [], tests: lireTestsAcceptes(vault, logiciel), socle });
  return { format: "horama-impact-1", le: new Date().toISOString(), depuis: pr.base, vers: pr.tete, logiciel, fichiers, fiches_retenues: [], socle, pr: pr.adresse, ...resultat };
}

// The dry run (--a-blanc): what the wake-up would do now, as lines for a human. Reads GitHub, plays nothing.
export function aBlanc(lecteur, { vault, logiciel, socle = [] }) {
  const lines = [];
  const total = lecteur.deploiementsPreview();
  lines.push(total ? `${total} déploiement(s) Preview sur le dépôt.` : "Aucun déploiement Preview sur le dépôt : Vercel n'y est pas encore relié.");
  const prs = lecteur.prs();
  if (!prs.length) lines.push("Aucune PR ouverte.");
  for (const pr of prs) {
    const preview = lecteur.previsualisation(pr.tete);
    const fichiers = lecteur.fichiers(pr.numero);
    const impact = impactDePr({ pr, fichiers, vault, logiciel, socle });
    const etat = !preview ? "pas de déploiement Preview pour ce commit" : preview.etat === "success" && preview.adresse ? `prévisualisation prête, ${preview.adresse}` : `prévisualisation « ${preview.etat} », pas encore jouable`;
    lines.push(`PR #${pr.numero} (${pr.tete.slice(0, 7)}) « ${pr.titre ?? ""} » : ${etat}.`);
    lines.push(`  ${fichiers.length} fichier(s) : ${fichiers.join(", ") || "aucun"}`);
    lines.push(`  tests rejoués : ${impact.ids.join(", ") || "aucun"} ; écartés : ${impact.ecartes.map((e) => e.id).join(", ") || "aucun"}`);
  }
  return lines;
}

function runNode(args) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
    child.on("error", fail);
    child.on("exit", (code, signal) => (code === 0 ? done() : fail(new Error(`${args[0]} : sortie ${code ?? signal}`))));
  });
}

// One PR played: impact, then the scene on the preview. Everything in <sortie>/pr-<numéro>-<sha court>/.
export async function jouerPr({ pr, fichiers, vault, logiciel, socle, sortie, sceneArgs = [] }, run = runNode) {
  const started = performance.now();
  const folder = join(sortie, `pr-${pr.numero}-${pr.tete.slice(0, 7)}`);
  mkdirSync(folder, { recursive: true });
  const report = { pr: pr.adresse, tete: pr.tete, previsualisation: pr.previsualisation, recu_le: new Date().toISOString(), etat: "impact" };
  const save = () => writeFileSync(join(folder, "reveil.json"), `${JSON.stringify(report, null, 2)}\n`);
  save();
  try {
    const impact = impactDePr({ pr, fichiers, vault, logiciel, socle });
    const impactFile = join(folder, "impact.json");
    writeFileSync(impactFile, `${JSON.stringify(impact, null, 2)}\n`);
    report.impact_ms = performance.now() - started;
    console.log(`réveil PR : #${pr.numero} (${pr.tete.slice(0, 7)}), ${fichiers.length} fichier(s) modifié(s), ${impact.retenus.length} test(s) retenu(s), ${impact.ecartes.length} écarté(s).`);
    if (!impact.retenus.length) {
      report.etat = "aucun-test";
      console.log("réveil PR : aucun test touché par cette PR, scène non lancée.");
      return report;
    }
    report.etat = "scene";
    report.scene_lancee_ms = performance.now() - started;
    save();
    await run(["automatisation/scene/parcours.mjs", "--impact", impactFile, "--base-url", pr.previsualisation, "--logiciel", logiciel, "--vault", vault,
      "--pr", pr.adresse, "--sortie", join(folder, "scene"), ...sceneArgs]);
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
    depot: { type: "string" }, logiciel: { type: "string" }, intervalle: { type: "string", default: "20" }, "une-fois": { type: "boolean" }, "a-blanc": { type: "boolean" },
    vault: { type: "string", default: "vault-horama" }, sortie: { type: "string", default: ".orchestrateur/reveil-pr" }, "faux-github": { type: "string" },
  } });
  if (!values.logiciel || (!values.depot && !values["faux-github"])) throw new Error("--logiciel et --depot (ou --faux-github) sont requis");
  if (values.depot && !/^[\w.-]+\/[\w.-]+$/.test(values.depot)) throw new Error("--depot attend propriétaire/dépôt");
  const interval = Number(values.intervalle);
  if (!(interval >= 1)) throw new Error("--intervalle attend un nombre de secondes, 1 au moins");
  // Selection, target, vault and output belong to the wake-up, not to the forwarded scene options.
  for (const arg of sceneArgs) {
    if (["tests", "impact", "base-url", "logiciel", "vault", "sortie", "pr"].includes(arg.replace(/^--/, "").split("=")[0])) throw new Error(`option de scène réservée au réveil : ${arg}`);
  }
  const vault = resolve(ROOT, values.vault);
  if (!existsSync(join(vault, values.logiciel))) throw new Error(`pas de dossier ${values.logiciel} dans le vault ${vault}`);
  const sortie = resolve(ROOT, values.sortie);
  const lecteur = values["faux-github"] ? lecteurFaux(resolve(values["faux-github"])) : lecteurGithub(values.depot);
  const socle = JSON.parse(readFileSync(join(ROOT, "automatisation/impact/socle.json"), "utf8"))[values.logiciel] ?? [];
  if (values["a-blanc"]) {
    console.log(`réveil PR, à blanc : ${values.depot ?? values["faux-github"]}, vault ${values.logiciel}, rien n'est joué.`);
    for (const line of aBlanc(lecteur, { vault, logiciel: values.logiciel, socle })) console.log(line);
    return;
  }
  const faits = new Set();
  console.log(`réveil PR : surveillance de ${values.depot ?? values["faux-github"]} toutes les ${interval} s, vault ${values.logiciel}.`);
  for (;;) {
    for (const pr of aJouer(lecteur, faits)) {
      faits.add(`${pr.numero}@${pr.tete}`);
      await jouerPr({ pr, fichiers: lecteur.fichiers(pr.numero), vault, logiciel: values.logiciel, socle, sortie, sceneArgs });
      if (values["une-fois"]) return;
    }
    await sleep(interval * 1000);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`réveil PR : arrêt, ${error.message}`);
    process.exitCode = 2;
  });
}
