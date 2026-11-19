// Wake-up by a pull request of the target site (issue #71, mode dev on a clone whose code we have): the Mac asks GitHub
// every 20 s or so, no public server. For each open PR whose last commit has a successful Vercel preview (a GitHub
// deployment, or the Vercel status of the commit and the address in the comment of the Vercel bot) that opens without
// a Vercel login, once: the files the PR changes (GitHub), the tests they touch (choisirTests of impact.mjs, on the vault of this
// repository: notes whose `code:` field lists a changed file, plus the baseline) played by the scene on the preview
// address, then the exploration of the whole site of the preview (public mode, issue #122).
// Several pushes in a row: only the last commit of the PR is played, once its own preview is ready.
//
// Usage: node automatisation/reveil/pr.mjs --depot <propriétaire/dépôt> --logiciel <logiciel du vault> [--intervalle 20]
//          [--une-fois] [--a-blanc] [--numero <PR>] [--vault vault-horama] [--sortie .orchestrateur/reveil-pr] [--faux-github <fichier.json>]
//          [--max 8] [--pages-cliquees 8] [--sans-exploration] [--commenter] [--captures-sur-branche horama/captures]
//          [-- options des deux scènes, par exemple --vitrine]
// --commenter: one answer on the PR, once both scenes are done (the part of each scene).
// --captures-sur-branche <branche>: with --commenter, the captures ringed of the exploration are put on this branch of
// the target repository (created if needed, never merged) and shown in the answer.
// --max, --pages-cliquees: the exploration of the preview (pages at most, pages the agent reaches by a click: 8 by
// default, every page after the page of departure, as the explorer caps it at the number of pages minus one; a page
// opened by its address is a jump on the screen, a click is a gesture the audience follows);
// --sans-exploration: the vault tests only.
// --a-blanc: one look at the repository, nothing played (no scene, no H, nothing written): the open PRs, the preview of
// their last commit (where it was found, whether it opens without a Vercel login), their files and the tests they would
// replay.
// --faux-github: a JSON file { prs: [...], deploiements: { <sha>: { etat, adresse } }, fichiers: { <numéro>: [...] } }
// read instead of GitHub, to try the chain without a real PR.
// Exit: 0 (--une-fois: after the first PR played, whatever its scenes gave: see reveil.json), 2 on a usage error or a
// failed impact.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { lireNotes, lireTestsAcceptes } from "../../memoire/index.ts";
import { choisirTests } from "../impact/impact.mjs";
import { ecrireSectionExploration, publierCommentaire } from "../pr-doc/commentaire.mjs";
import { connectTab, navigate, openChrome } from "../scene/scene.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const gh = (path) => JSON.parse(execFileSync("gh", ["api", "--paginate", "--slurp", path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })).flat();

// The preview address in the summary of the check « Vercel Preview Comments » of a commit: its link to the feedback of
// the preview, « vercel.live/open-feedback/<host> ». One check per commit, even when the bot writes no comment on the PR
// (seen on the PR #14 of the clone, 18/11).
export function adresseControleVercel(summary) {
  const host = /vercel\.live\/open-feedback\/([a-z0-9.-]+\.vercel\.app)/i.exec(summary ?? "")?.[1];
  return host ? `https://${host}` : null;
}

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
// status whose context names Vercel (its target_url is the Vercel dashboard, not the site); the address is then read in
// the check « Vercel Preview Comments » of the commit, else in the comment of the vercel[bot] on the PR.
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
      if (status.state !== "success") return { etat: status.state, adresse: null, source: "statut de Vercel" };
      const checks = read(`repos/${depot}/commits/${sha}/check-runs?per_page=100`).flatMap((page) => page.check_runs ?? [page]);
      const fromCheck = checks.filter((run) => run.app?.slug === "vercel").map((run) => adresseControleVercel(run.output?.summary)).find(Boolean);
      if (fromCheck) return { etat: status.state, adresse: fromCheck, source: "statut et contrôle de Vercel" };
      const comment = numero !== undefined
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

// The language a page declares (`<html lang>`), its first subtag in lower case (« fr-FR » gives « fr »); null when the
// page does not say it or does not answer: then nothing is set aside on that ground.
export async function langueDePage(adresse, request = fetch) {
  try {
    const response = await request(adresse, { signal: AbortSignal.timeout(15_000) });
    const lang = /<html\b[^>]*\slang\s*=\s*["']?([A-Za-z]{2,3})/i.exec(await response.text())?.[1];
    return lang ? lang.toLowerCase() : null;
  } catch {
    return null;
  }
}

// The vault tests are written in the language of the documented site: a page of the preview in another language (a
// translation, issue #122) would fail them on every text, so they are set aside, and only the exploration of the site
// runs. Generic: a note declares the language of its page in its header (`langue: fr`); the page of the preview at the
// same address is asked its `<html lang>`. A test is set aside when one of its screens differs; a note without `langue`,
// or a page that does not say its language, sets nothing aside.
export async function ecarterLangue(impact, { vault, logiciel, base, langue = langueDePage }) {
  const notes = new Map(lireNotes(vault, logiciel).filter((note) => note.entete?.ecran).map((note) => [note.entete.ecran, note.entete]));
  const tests = new Map(lireTestsAcceptes(vault, logiciel).map((test) => [test.id, test]));
  const asked = new Map();
  const changed = async (ecran) => {
    const note = notes.get(ecran);
    if (typeof note?.langue !== "string" || typeof note.url !== "string") return null;
    if (!asked.has(ecran)) asked.set(ecran, langue(new URL(note.url, base).href));
    const shown = await asked.get(ecran);
    const wanted = note.langue.toLowerCase().split("-")[0];
    return shown && shown !== wanted ? `${wanted} → ${shown}` : null;
  };
  const retenus = [];
  const ecartes = [...impact.ecartes];
  for (const kept of impact.retenus) {
    let change = null;
    for (const { ecran } of tests.get(kept.id)?.releves ?? []) change ??= await changed(ecran);
    if (change) ecartes.push({ id: kept.id, raison: `langue du site changée (${change}) : tests de la documentation non joués` });
    else retenus.push(kept);
  }
  return { ...impact, ids: retenus.map((kept) => kept.id), retenus, ecartes };
}

// The dry run (--a-blanc): what the wake-up would do now, as lines for a human. Reads GitHub and asks the preview
// whether it opens without a login; plays nothing.
export async function aBlanc(lecteur, { vault, logiciel, socle = [], ouverte = ouverteSansConnexion, langue = langueDePage }) {
  const lines = [];
  const prs = lecteur.prs();
  if (!prs.length) lines.push("Aucune PR ouverte.");
  for (const pr of prs) {
    const preview = lecteur.previsualisation(pr.tete, pr.numero);
    const fichiers = lecteur.fichiers(pr.numero);
    let impact = impactDePr({ pr, fichiers, vault, logiciel, socle });
    let etat = "pas de prévisualisation pour ce commit (ni déploiement GitHub, ni statut Vercel)";
    if (preview && preview.etat !== "success") etat = `prévisualisation « ${preview.etat} », pas encore jouable`;
    else if (preview && !preview.adresse) etat = `prévisualisation prête (${preview.source}), mais son adresse est introuvable`;
    else if (preview) {
      const access = await ouverte(preview.adresse);
      etat = `prévisualisation prête (${preview.source}), ${preview.adresse}, ${access.ouverte ? `répond sans connexion (code ${access.code})` : `pas jouable : ${access.raison}`}`;
      if (access.ouverte) impact = await ecarterLangue(impact, { vault, logiciel, base: preview.adresse, langue });
    }
    lines.push(`PR #${pr.numero} (${pr.tete.slice(0, 7)}) « ${pr.titre ?? ""} » : ${etat}.`);
    lines.push(`  ${fichiers.length} fichier(s) : ${fichiers.join(", ") || "aucun"}`);
    lines.push(`  tests rejoués : ${impact.ids.join(", ") || "aucun"} ; écartés : ${impact.ecartes.map((e) => e.id).join(", ") || "aucun"}`);
    const language = impact.ecartes.find((e) => e.raison.startsWith("langue du site changée"));
    if (language) lines.push(`  ${language.raison} (${impact.ecartes.filter((e) => e.raison === language.raison).map((e) => e.id).join(", ")})`);
  }
  return lines;
}

// The answer on the PR: the part of the vault tests (passage.json of the scene, commentaire_corps), then the part of the
// exploration (scene.json, commentaire.corps). Without the first, a heading says why the vault tests did not run.
export function reponseSurPr({ pr, impact, report, folder, images = null }) {
  const read = (file) => {
    try {
      return JSON.parse(readFileSync(join(folder, file), "utf8"));
    } catch {
      return null;
    }
  };
  const tests = read("scene/passage.json")?.commentaire_corps ?? null;
  const part = read("exploration/scene.json")?.commentaire ?? null;
  // With images: the part of the exploration written again from its elements, each finding with its capture.
  const withImage = (item) => ({ ...item, image: images?.[item.id] ?? null });
  const site = images && part?.elements
    ? ecrireSectionExploration({ ...part.elements, prouves: part.elements.prouves.map(withImage), doutes: part.elements.doutes.map(withImage) })
    : part?.corps ?? null;
  if (!tests && !site) return null;
  const heading = tests ? [] : [`## Horama : PR #${pr.numero} (${pr.tete.slice(0, 7)})`, "",
    report.langue ? `${report.langue.charAt(0).toUpperCase()}${report.langue.slice(1)}.` : impact.retenus.length ? "Tests de la documentation : non rendus." : "Tests de la documentation : aucun touché par cette PR.", ""];
  return [...heading, ...(tests ? [tests] : []), ...(site ? [site] : [])].join("\n");
}

// Puts one capture on a branch of the target repository with the API of GitHub (no clone), and returns the address of
// the image at the commit made, which stays valid whatever the branch becomes. The branch is created from the default
// branch when it does not exist; it is never merged. Never throws: { url } or { raison }.
export async function televerserCapture({ depot, branche, chemin, fichier, message }, api = ghApi) {
  try {
    const ref = `heads/${branche}`;
    if (!(await api(["GET", `repos/${depot}/git/ref/${ref}`]).catch(() => null))) {
      const { default_branch: main } = await api(["GET", `repos/${depot}`]);
      const { object } = await api(["GET", `repos/${depot}/git/ref/heads/${main}`]);
      await api(["POST", `repos/${depot}/git/refs`], { ref: `refs/${ref}`, sha: object.sha });
    }
    const existing = await api(["GET", `repos/${depot}/contents/${chemin}?ref=${encodeURIComponent(branche)}`]).catch(() => null);
    const done = await api(["PUT", `repos/${depot}/contents/${chemin}`], { message, branch: branche, content: readFileSync(fichier).toString("base64"), ...(existing?.sha ? { sha: existing.sha } : {}) });
    return { url: `https://raw.githubusercontent.com/${depot}/${done.commit.sha}/${chemin}` };
  } catch (error) {
    return { raison: String(error.message).trim().split("\n").at(-1) };
  }
}

// The index of the passages (#149, tower of control), index.json at the root of the branch of the captures, public and
// read through raw.githubusercontent.com: one entry per PR and commit played, the latest first. entreeIndex composes the
// entry of a passage from what the scene wrote (scene.json: passage, decisions, elements of the answer) and what the
// wake-up knows (PR, commit, preview, address of the answer, captures pushed).
export function entreeIndex({ pr, logiciel, report, scene, images = {} }) {
  const elements = scene?.commentaire?.elements ?? {};
  const decided = (id) => scene?.decisions?.find(({ decision }) => decision.ecart_id === id)?.decision ?? null;
  const constat = (statut, genre) => (entry) => {
    const decision = decided(entry.id);
    return { id: entry.id, statut, genre, page: entry.chemin, texte: entry.texte, preuve: entry.preuve ?? null, zone: entry.zone ?? null,
      capture: images[entry.id] ?? null, decision: decision ? { choix: decision.decision, par: decision.par ?? null, le: decision.le ?? null } : null };
  };
  return {
    passage: scene?.passage_id ?? null, date: report.recu_le, site: logiciel, previsualisation: pr.previsualisation,
    pr: { numero: pr.numero, adresse: pr.adresse, titre: pr.titre ?? null }, commit: pr.tete,
    reponse: report.commentaire?.url ?? null, etat: report.exploration?.etat ?? null, totaux: elements.totaux ?? null,
    constats: [...(elements.prouves ?? []).map(constat("VERIFIED_FAIL", "defaut")), ...(elements.doutes ?? []).map(constat("SUSPECTED", "doute"))],
  };
}
export async function publierIndex({ depot, branche, entree }, api = ghApi) {
  const chemin = "index.json";
  try {
    const existing = await api(["GET", `repos/${depot}/contents/${chemin}?ref=${encodeURIComponent(branche)}`]).catch(() => null);
    let index = { format: "horama-passages-1", depot, passages: [] };
    // An index there but unreadable (corrupt JSON, or over 1 MB: the contents API then gives an empty content): no
    // writing, else the history would be erased without a word (review of #211).
    if (existing?.sha) {
      try {
        index = JSON.parse(Buffer.from(existing.content ?? "", "base64").toString("utf8"));
        if (!Array.isArray(index.passages)) throw new Error("pas de liste de passages");
      } catch (error) {
        return { raison: `index.json illisible (${existing.content ? error.message : "contenu vide, fichier de plus de 1 Mo ?"}) : écriture refusée pour ne pas effacer l'historique` };
      }
    }
    const others = (index.passages ?? []).filter((item) => !(item.pr?.numero === entree.pr.numero && item.commit === entree.commit));
    index = { ...index, format: "horama-passages-1", depot, maj: new Date().toISOString(), passages: [entree, ...others].sort((a, b) => String(b.date).localeCompare(String(a.date))) };
    const content = Buffer.from(`${JSON.stringify(index, null, 2)}\n`).toString("base64");
    const done = await api(["PUT", `repos/${depot}/contents/${chemin}`], { message: `Horama : index des passages (PR #${entree.pr.numero}, ${String(entree.commit).slice(0, 7)})`, branch: branche, content, ...(existing?.sha ? { sha: existing.sha } : {}) });
    return { url: `https://raw.githubusercontent.com/${depot}/${encodeURIComponent(branche).replace(/%2F/g, "/")}/${chemin}`, commit: done.commit.sha, passages: index.passages.length };
  } catch (error) {
    return { raison: String(error.message).trim().split("\n").at(-1) };
  }
}

// gh api with a JSON body given through a file (a capture in base64 is too long for the command line).
async function ghApi([method, path], body) {
  const folder = body ? mkdtempSync(join(tmpdir(), "horama-gh-")) : null;
  try {
    const args = ["api", "--method", method, path];
    if (body) {
      writeFileSync(join(folder, "corps.json"), JSON.stringify(body));
      args.push("--input", join(folder, "corps.json"));
    }
    return JSON.parse(execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }) || "null");
  } finally {
    if (folder) rmSync(folder, { recursive: true, force: true });
  }
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
export async function jouerPr({ pr, fichiers, vault, logiciel, socle, sortie, sceneArgs = [], exploration = { max: 8, pagesCliquees: 8 }, langue = langueDePage, commenter = false, publier = publierCommentaire,
  captures = null, televerser = televerserCapture, indexer = publierIndex }, run = runNode) {
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
    const impact = await ecarterLangue(impactDePr({ pr, fichiers, vault, logiciel, socle }), { vault, logiciel, base: pr.previsualisation, langue });
    const impactFile = join(folder, "impact.json");
    writeFileSync(impactFile, `${JSON.stringify(impact, null, 2)}\n`);
    report.impact_ms = performance.now() - started;
    console.log(`réveil PR : #${pr.numero} (${pr.tete.slice(0, 7)}), ${fichiers.length} fichier(s) modifié(s), ${impact.retenus.length} test(s) retenu(s), ${impact.ecartes.length} écarté(s).`);
    const language = impact.ecartes.find((e) => e.raison.startsWith("langue du site changée"));
    if (language) {
      report.langue = language.raison;
      console.log(`réveil PR : ${language.raison}.`);
    }
    if (impact.retenus.length) {
      await step("parcours", ["automatisation/scene/parcours.mjs", "--impact", impactFile, "--base-url", pr.previsualisation, "--logiciel", logiciel, "--vault", vault,
        "--pr", pr.adresse, "--sortie", join(folder, "scene"), ...sceneArgs]);
    } else {
      report.parcours = { etat: "aucun-test" };
      console.log("réveil PR : aucun test du vault touché par cette PR.");
    }
    if (exploration) {
      await step("exploration", ["automatisation/scene/exploration.mjs", "--url", pr.previsualisation, "--max", String(exploration.max), "--pages-cliquees", String(exploration.pagesCliquees),
        "--vault", vault, "--site", logiciel, "--sortie", join(folder, "exploration"), "--pr", pr.adresse, ...sceneArgs]);
    }
    // One answer on the PR for both scenes (--commenter): what each wrote, put together.
    if (commenter) {
      // Option a (--captures-sur-branche): the captures ringed of the exploration put on a branch of the target
      // repository, shown in the answer. A capture that cannot be put there leaves its finding in text.
      let images = null;
      if (captures) {
        images = {};
        const elements = (() => {
          try {
            return JSON.parse(readFileSync(join(folder, "exploration", "scene.json"), "utf8")).commentaire?.elements ?? null;
          } catch {
            return null;
          }
        })();
        for (const item of [...(elements?.prouves ?? []), ...(elements?.doutes ?? [])].filter((entry) => entry.anneau)) {
          const sent = await televerser({ ...captures, chemin: `pr-${pr.numero}/${pr.tete.slice(0, 7)}/${item.id}.png`, fichier: join(vault, item.anneau), message: `Horama : capture ${item.id} de la PR #${pr.numero} (${pr.tete.slice(0, 7)})` });
          if (sent.url) images[item.id] = sent.url;
          else console.log(`réveil PR : capture ${item.id} non poussée, ${sent.raison}`);
        }
        report.captures = { branche: captures.branche, poussees: Object.keys(images).length };
      }
      const corps = reponseSurPr({ pr, impact, report, folder, images });
      report.commentaire = corps ? await publier(pr.adresse, corps) : { status: "INCONCLUSIVE", reason: "aucune scène n'a écrit sa partie" };
      console.log(report.commentaire.status === "publie" ? `réveil PR : réponse publiée, ${report.commentaire.url}` : `réveil PR : réponse non publiée, ${report.commentaire.reason}`);
      // The index of the passages on the same public branch as the captures (#149), with the address of the answer.
      if (captures) {
        const scene = (() => {
          try {
            return JSON.parse(readFileSync(join(folder, "exploration", "scene.json"), "utf8"));
          } catch {
            return null;
          }
        })();
        report.index = await indexer({ depot: captures.depot, branche: captures.branche, entree: entreeIndex({ pr, logiciel, report, scene, images: images ?? {} }) });
        console.log(report.index.url ? `réveil PR : index des passages à jour (${report.index.passages} passage(s)), ${report.index.url}` : `réveil PR : index non publié, ${report.index.raison}`);
      }
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

// The Chrome of the scene (port 9333, profile of the scene, as exploration.mjs and parcours.mjs open it by default) on
// automatisation/scene/attente.html: the sky of the charter, the mascot, the repository watched.
async function ouvrirAttente(depot) {
  const port = 9333;
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port, profile: join(ROOT, ".orchestrateur/chrome-agent") });
  const tab = await connectTab(port);
  const page = new URL("../scene/attente.html", import.meta.url);
  page.searchParams.set("depot", depot ?? "");
  await navigate(tab, page.href);
  tab.close();
  console.log(`réveil PR : Chrome de la scène ${chrome.started ? "ouvert" : "déjà ouvert"} sur la page d'attente (port ${port}).`);
}

async function main() {
  const separator = process.argv.indexOf("--");
  const sceneArgs = separator < 0 ? [] : process.argv.slice(separator + 1);
  const { values } = parseArgs({ args: process.argv.slice(2, separator < 0 ? undefined : separator), options: {
    depot: { type: "string" }, logiciel: { type: "string" }, intervalle: { type: "string", default: "20" }, "une-fois": { type: "boolean" }, "a-blanc": { type: "boolean" }, numero: { type: "string" },
    vault: { type: "string", default: "vault-horama" }, sortie: { type: "string", default: ".orchestrateur/reveil-pr" }, "faux-github": { type: "string" },
    max: { type: "string", default: "8" }, "pages-cliquees": { type: "string", default: "8" }, "sans-exploration": { type: "boolean" }, commenter: { type: "boolean" }, "captures-sur-branche": { type: "string" },
  } });
  if (!values.logiciel || (!values.depot && !values["faux-github"])) throw new Error("--logiciel et --depot (ou --faux-github) sont requis");
  if (values.depot && !/^[\w.-]+\/[\w.-]+$/.test(values.depot)) throw new Error("--depot attend propriétaire/dépôt");
  const interval = Number(values.intervalle);
  if (!(interval >= 1)) throw new Error("--intervalle attend un nombre de secondes, 1 au moins");
  if (values["captures-sur-branche"] && (!values.depot || !values.commenter)) throw new Error("--captures-sur-branche demande --depot et --commenter");
  if (values["captures-sur-branche"] && !/^[\w./-]+$/.test(values["captures-sur-branche"])) throw new Error("--captures-sur-branche attend un nom de branche");
  const exploration = values["sans-exploration"] ? null : { max: Number(values.max), pagesCliquees: Number(values["pages-cliquees"]) };
  if (exploration && !(Number.isInteger(exploration.max) && exploration.max >= 1 && Number.isInteger(exploration.pagesCliquees) && exploration.pagesCliquees >= 0)) {
    throw new Error("--max attend un entier, 1 au moins, et --pages-cliquees un entier, 0 au moins");
  }
  // Selection, target, vault and output belong to the wake-up, not to the forwarded scene options.
  for (const arg of sceneArgs) {
    if (["tests", "impact", "base-url", "logiciel", "vault", "sortie", "pr", "url", "max", "pages-cliquees", "commenter"].includes(arg.replace(/^--/, "").split("=")[0])) throw new Error(`option de scène réservée au réveil : ${arg}`);
  }
  const vault = resolve(ROOT, values.vault);
  if (!existsSync(join(vault, values.logiciel))) throw new Error(`pas de dossier ${values.logiciel} dans le vault ${vault}`);
  const sortie = resolve(ROOT, values.sortie);
  const lu = values["faux-github"] ? lecteurFaux(resolve(values["faux-github"])) : lecteurGithub(values.depot);
  // --numero <n>: this PR only, whatever the other open PRs of the repository (a passage published on one PR must not
  // play, nor answer on, a newer PR first).
  const numero = values.numero === undefined ? null : Number(values.numero);
  if (numero !== null && !(Number.isInteger(numero) && numero > 0)) throw new Error("--numero attend le numéro d'une PR");
  const lecteur = numero === null ? lu : { ...lu, prs: () => lu.prs().filter((pr) => pr.numero === numero) };
  const socle = JSON.parse(readFileSync(join(ROOT, "automatisation/impact/socle.json"), "utf8"))[values.logiciel] ?? [];
  if (values["a-blanc"]) {
    console.log(`réveil PR, à blanc : ${values.depot ?? values["faux-github"]}, vault ${values.logiciel}, rien n'est joué.`);
    for (const line of await aBlanc(lecteur, { vault, logiciel: values.logiciel, socle })) console.log(line);
    return;
  }
  // S1 (19/11): the Chrome of the scene opens now, on a page of waiting in the charter, instead of about:blank when the
  // PR comes; the scenes find it on their port and take its tab. Not with options of scene that change the Chrome
  // (another port or profile).
  if (!sceneArgs.some((arg) => /^--(port|profil)\b/.test(arg))) await ouvrirAttente(values.depot ?? values["faux-github"]).catch((error) => console.log(`réveil PR : page d'attente non ouverte, ${error.message}.`));
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
      await jouerPr({ pr, fichiers: lecteur.fichiers(pr.numero), vault, logiciel: values.logiciel, socle, sortie, sceneArgs, exploration, commenter: Boolean(values.commenter),
        captures: values["captures-sur-branche"] ? { depot: values.depot, branche: values["captures-sur-branche"] } : null });
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
