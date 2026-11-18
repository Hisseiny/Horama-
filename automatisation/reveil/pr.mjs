// Wake-up by a pull request of the target site (issue #71, mode dev on a clone whose code we have): the Mac asks GitHub
// every 20 s or so, no public server. For each open PR whose last commit has a successful Vercel preview (a GitHub
// deployment, or the Vercel status of the commit and the address in the comment of the Vercel bot) that opens without
// a Vercel login, once: the files the PR changes (GitHub), the tests they touch (choisirTests of impact.mjs, on the vault of this
// repository: notes whose `code:` field lists a changed file, plus the baseline) played by the scene on the preview
// address, then the exploration of the whole site of the preview (public mode, issue #122).
// Several pushes in a row: only the last commit of the PR is played, once its own preview is ready.
//
// Usage: node automatisation/reveil/pr.mjs --depot <propriétaire/dépôt> --logiciel <logiciel du vault> [--intervalle 20]
//          [--une-fois] [--a-blanc] [--vault vault-horama] [--sortie .orchestrateur/reveil-pr] [--faux-github <fichier.json>]
//          [--max 8] [--pages-cliquees 4] [--sans-exploration] [-- options des deux scènes, par exemple --vitrine]
// --max, --pages-cliquees: the exploration of the preview (pages at most, pages the agent reaches by a click);
// --sans-exploration: the vault tests only.
// --a-blanc: one look at the repository, nothing played (no scene, no H, nothing written): the open PRs, the preview of
// their last commit (where it was found, whether it opens without a Vercel login), their files and the tests they would
// replay.
// --faux-github: a JSON file { prs: [...], deploiements: { <sha>: { etat, adresse } }, fichiers: { <numéro>: [...] } }
// read instead of GitHub, to try the chain without a real PR.
// Exit: 0 (--une-fois: after the first PR played, whatever its scenes gave: see reveil.json), 2 on a usage error or a
// failed impact.
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

// The preview address in the comment of the Vercel bot on a PR: the JSON of its hidden line « [vc]: #<id>:<base64> »
// (projects[].previewUrl, the alias of the branch, which follows its last commit), else its « [Preview](<url>) » link.
export function adresseCommentaireVercel(body) {
  const hidden = /\[vc\]: #[^:\s]*:([A-Za-z0-9+/=]+)/.exec(body ?? "");
  if (hidden) {
    try {
      const url = JSON.parse(Buffer.from(hidden[1], "base64").toString("utf8")).projects?.find((project) => project.previewUrl)?.previewUrl;
      if (url) return /^https?:\/\//.test(url) ? url : `https://${url}`;
    } catch {}
  }
  return /\[Preview\]\((https:\/\/[^)\s]+)\)/.exec(body ?? "")?.[1] ?? null;
}

// What GitHub says of a repository: its open PRs, the preview of a commit, the files of a PR. Two ways for Vercel to
// give a preview: a GitHub deployment with an environment named « Preview » (sometimes « Preview – <projet> ») whose
// status « success » carries environment_url; or, as on the clone of Eugenia (18/11), no deployment at all, only a commit
// status whose context names Vercel (its target_url is the Vercel dashboard, not the site) and a comment of the
// vercel[bot] on the PR that gives the address.
export function lecteurGithub(depot, read = gh) {
  return {
    prs: () => read(`repos/${depot}/pulls?state=open&per_page=100`).map((pr) => ({ numero: pr.number, adresse: pr.html_url, titre: pr.title, base: pr.base.sha, tete: pr.head.sha })),
    previsualisation(sha, numero) {
      const deployment = read(`repos/${depot}/deployments?sha=${sha}&per_page=100`).find((candidate) => /^preview/i.test(candidate.environment ?? ""));
      if (deployment) {
        const status = read(`repos/${depot}/deployments/${deployment.id}/statuses?per_page=100`)[0];
        return status ? { etat: status.state, adresse: status.environment_url || status.target_url || null, source: "déploiement GitHub" } : null;
      }
      const status = (read(`repos/${depot}/commits/${sha}/status`)[0]?.statuses ?? []).find((candidate) => /vercel/i.test(candidate.context ?? ""));
      if (!status) return null;
      const comment = status.state === "success" && numero !== undefined
        ? read(`repos/${depot}/issues/${numero}/comments?per_page=100`).filter((candidate) => candidate.user?.login === "vercel[bot]").at(-1)
        : undefined;
      return { etat: status.state, adresse: adresseCommentaireVercel(comment?.body), source: "statut et commentaire de Vercel" };
    },
    fichiers: (numero) => read(`repos/${depot}/pulls/${numero}/files?per_page=100`).map((file) => file.filename),
  };
}

// Whether a preview opens without a Vercel login (Deployment Protection off): a redirection to vercel.com, or a 401,
// means the agent would land on a login page. Never throws: a network failure is said as such.
export async function ouverteSansConnexion(adresse, request = fetch) {
  try {
    const response = await request(adresse, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const location = response.headers.get("location") ?? "";
    if (response.status === 401 || (response.status >= 300 && response.status < 400 && /vercel\.com/.test(location))) {
      return { ouverte: false, raison: `la prévisualisation demande une connexion Vercel (code ${response.status})` };
    }
    return { ouverte: true, code: response.status };
  } catch (error) {
    return { ouverte: false, raison: `la prévisualisation ne répond pas (${error.message})` };
  }
}

// The same three answers read from a JSON file (--faux-github), for a trial without a real PR.
export function lecteurFaux(fichier) {
  const data = () => JSON.parse(readFileSync(fichier, "utf8"));
  return {
    prs: () => data().prs,
    previsualisation: (sha) => (data().deploiements?.[sha] ? { source: "faux GitHub", ...data().deploiements[sha] } : null),
    fichiers: (numero) => data().fichiers?.[numero] ?? [],
  };
}

// The PRs to play now: open, last commit deployed with success to a preview address, not played yet (`faits` holds
// « numéro@sha »). A PR whose preview is not ready yet is waited for, not skipped.
export function aJouer(lecteur, faits) {
  const prets = [];
  for (const pr of lecteur.prs()) {
    if (faits.has(`${pr.numero}@${pr.tete}`)) continue;
    const preview = lecteur.previsualisation(pr.tete, pr.numero);
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

// The dry run (--a-blanc): what the wake-up would do now, as lines for a human. Reads GitHub and asks the preview
// whether it opens without a login; plays nothing.
export async function aBlanc(lecteur, { vault, logiciel, socle = [], ouverte = ouverteSansConnexion }) {
  const lines = [];
  const prs = lecteur.prs();
  if (!prs.length) lines.push("Aucune PR ouverte.");
  for (const pr of prs) {
    const preview = lecteur.previsualisation(pr.tete, pr.numero);
    const fichiers = lecteur.fichiers(pr.numero);
    const impact = impactDePr({ pr, fichiers, vault, logiciel, socle });
    let etat = "pas de prévisualisation pour ce commit (ni déploiement GitHub, ni statut Vercel)";
    if (preview && preview.etat !== "success") etat = `prévisualisation « ${preview.etat} », pas encore jouable`;
    else if (preview && !preview.adresse) etat = `prévisualisation prête (${preview.source}), mais son adresse est introuvable`;
    else if (preview) {
      const access = await ouverte(preview.adresse);
      etat = `prévisualisation prête (${preview.source}), ${preview.adresse}, ${access.ouverte ? `répond sans connexion (code ${access.code})` : `pas jouable : ${access.raison}`}`;
    }
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
// One PR played: impact, then the scene of the vault tests the PR touches (parcours.mjs, development mode), then the
// exploration of the whole site of the preview (exploration.mjs, public mode: mechanical checks and Holo), unless
// `exploration` is null. Everything in <sortie>/pr-<numéro>-<sha court>/. A scene that fails is written in the report,
// never thrown: the other one still runs, and the wake-up goes on with the next PR.
export async function jouerPr({ pr, fichiers, vault, logiciel, socle, sortie, sceneArgs = [], exploration = { max: 8, pagesCliquees: 4 } }, run = runNode) {
  const started = performance.now();
  const folder = join(sortie, `pr-${pr.numero}-${pr.tete.slice(0, 7)}`);
  mkdirSync(folder, { recursive: true });
  const report = { pr: pr.adresse, tete: pr.tete, previsualisation: pr.previsualisation, recu_le: new Date().toISOString(), etat: "impact", parcours: null, exploration: null };
  const save = () => writeFileSync(join(folder, "reveil.json"), `${JSON.stringify(report, null, 2)}\n`);
  save();
  const step = async (name, args) => {
    report.etat = name;
    report[name] = { etat: "lance", lance_ms: performance.now() - started };
    save();
    try {
      await run(args);
      report[name].etat = "termine";
    } catch (error) {
      report[name] = { ...report[name], etat: "echec", erreur: error.message };
      console.log(`réveil PR : ${name} en échec, ${error.message}`);
    }
  };
  try {
    const impact = impactDePr({ pr, fichiers, vault, logiciel, socle });
    const impactFile = join(folder, "impact.json");
    writeFileSync(impactFile, `${JSON.stringify(impact, null, 2)}\n`);
    report.impact_ms = performance.now() - started;
    console.log(`réveil PR : #${pr.numero} (${pr.tete.slice(0, 7)}), ${fichiers.length} fichier(s) modifié(s), ${impact.retenus.length} test(s) retenu(s), ${impact.ecartes.length} écarté(s).`);
    if (impact.retenus.length) {
      await step("parcours", ["automatisation/scene/parcours.mjs", "--impact", impactFile, "--base-url", pr.previsualisation, "--logiciel", logiciel, "--vault", vault,
        "--pr", pr.adresse, "--sortie", join(folder, "scene"), ...sceneArgs]);
    } else {
      report.parcours = { etat: "aucun-test" };
      console.log("réveil PR : aucun test du vault touché par cette PR.");
    }
    if (exploration) {
      await step("exploration", ["automatisation/scene/exploration.mjs", "--url", pr.previsualisation, "--max", String(exploration.max), "--pages-cliquees", String(exploration.pagesCliquees),
        "--vault", vault, "--sortie", join(folder, "exploration"), ...sceneArgs]);
    }
    const ran = [report.parcours, report.exploration].filter((item) => item && item.etat !== "aucun-test");
    report.etat = !ran.length ? "aucun-test" : ran.some((item) => item.etat === "echec") ? "echec" : "termine";
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
    max: { type: "string", default: "8" }, "pages-cliquees": { type: "string", default: "4" }, "sans-exploration": { type: "boolean" },
  } });
  if (!values.logiciel || (!values.depot && !values["faux-github"])) throw new Error("--logiciel et --depot (ou --faux-github) sont requis");
  if (values.depot && !/^[\w.-]+\/[\w.-]+$/.test(values.depot)) throw new Error("--depot attend propriétaire/dépôt");
  const interval = Number(values.intervalle);
  if (!(interval >= 1)) throw new Error("--intervalle attend un nombre de secondes, 1 au moins");
  const exploration = values["sans-exploration"] ? null : { max: Number(values.max), pagesCliquees: Number(values["pages-cliquees"]) };
  if (exploration && !(Number.isInteger(exploration.max) && exploration.max >= 1 && Number.isInteger(exploration.pagesCliquees) && exploration.pagesCliquees >= 0)) {
    throw new Error("--max attend un entier, 1 au moins, et --pages-cliquees un entier, 0 au moins");
  }
  // Selection, target, vault and output belong to the wake-up, not to the forwarded scene options.
  for (const arg of sceneArgs) {
    if (["tests", "impact", "base-url", "logiciel", "vault", "sortie", "pr", "url", "max", "pages-cliquees"].includes(arg.replace(/^--/, "").split("=")[0])) throw new Error(`option de scène réservée au réveil : ${arg}`);
  }
  const vault = resolve(ROOT, values.vault);
  if (!existsSync(join(vault, values.logiciel))) throw new Error(`pas de dossier ${values.logiciel} dans le vault ${vault}`);
  const sortie = resolve(ROOT, values.sortie);
  const lecteur = values["faux-github"] ? lecteurFaux(resolve(values["faux-github"])) : lecteurGithub(values.depot);
  const socle = JSON.parse(readFileSync(join(ROOT, "automatisation/impact/socle.json"), "utf8"))[values.logiciel] ?? [];
  if (values["a-blanc"]) {
    console.log(`réveil PR, à blanc : ${values.depot ?? values["faux-github"]}, vault ${values.logiciel}, rien n'est joué.`);
    for (const line of await aBlanc(lecteur, { vault, logiciel: values.logiciel, socle })) console.log(line);
    return;
  }
  const faits = new Set();
  const protegees = new Set(); // « numéro@sha » already said protected: said once, tried again at each round
  console.log(`réveil PR : surveillance de ${values.depot ?? values["faux-github"]} toutes les ${interval} s, vault ${values.logiciel}.`);
  for (;;) {
    for (const pr of aJouer(lecteur, faits)) {
      // A protected preview would send the agent to a Vercel login page: not played, tried again once it opens.
      const access = await ouverteSansConnexion(pr.previsualisation);
      if (!access.ouverte) {
        if (!protegees.has(`${pr.numero}@${pr.tete}`)) console.log(`réveil PR : #${pr.numero} (${pr.tete.slice(0, 7)}) pas jouée, ${access.raison}.`);
        protegees.add(`${pr.numero}@${pr.tete}`);
        continue;
      }
      faits.add(`${pr.numero}@${pr.tete}`);
      await jouerPr({ pr, fichiers: lecteur.fichiers(pr.numero), vault, logiciel: values.logiciel, socle, sortie, sceneArgs, exploration });
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
