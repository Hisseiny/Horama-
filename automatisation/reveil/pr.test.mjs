import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { aBlanc, aJouer, adresseCommentaireVercel, adresseControleVercel, ecarterLangue, impactDePr, jouerPr, langueDePage, lecteurGithub, ouverteSansConnexion, televerserCapture, entreeIndex, publierIndex } from "./pr.mjs";

// A vault of trial: two screens of a site whose code we have, one test per screen.
function vaultEssai(t) {
  const vault = mkdtempSync(join(tmpdir(), "horama-pr-"));
  t.after(() => rmSync(vault, { recursive: true, force: true }));
  const write = (file, text) => {
    mkdirSync(join(vault, "site-essai", file, ".."), { recursive: true });
    writeFileSync(join(vault, "site-essai", file), text);
  };
  write("produit/accueil.md", "---\necran: accueil\nurl: /\ncode: [\"src/pages/index.astro\", \"src/data/home.ts\"]\nvues: []\n---\n\n# Accueil\n");
  write("produit/programmes.md", "---\necran: programmes\nurl: /programmes\ncode: [\"src/pages/programmes.astro\", \"src/data/programmes.ts\"]\nvues: []\n---\n\n# Programmes\n");
  const testFile = (id, ecran, url) => `---\nid: ${id}\nlogiciel: site-essai\nsource: produit/${ecran}.md\nreleves: [{ ecran: ${ecran}, vue: defaut }]\nurl_depart: ${url}\nversion_cible: "1"\ntimeout_s: 120\nstatut: accepte\naccepte_par: essai\naccepte_le: 2026-11-18\n---\n\n# ${id}\n\n## Setup\nSur la page.\n\n## Task\n1. Relever la page : c'est le relevé ecran=${ecran}, vue=defaut.\n\n## Expected Result\nLa page s'affiche.\n\n## Verification\n- FAIL if la page ne s'affiche pas.\n\n\`\`\`regles\n[]\n\`\`\`\n`;
  write("tests/voir-accueil.md", testFile("voir-accueil", "accueil", "/"));
  write("tests/voir-programmes.md", testFile("voir-programmes", "programmes", "/programmes"));
  return vault;
}

test("GitHub : PR ouvertes, prévisualisation Vercel du dernier commit, fichiers de la PR", () => {
  const answers = {
    "repos/o/d/pulls?state=open&per_page=100": [{ number: 7, html_url: "https://github.com/o/d/pull/7", title: "Durée", base: { sha: "b1" }, head: { sha: "h1" } }],
    "repos/o/d/deployments?sha=h1&per_page=100": [{ id: 3, environment: "Production" }, { id: 4, environment: "Preview – eugenia" }],
    "repos/o/d/deployments/4/statuses?per_page=100": [{ state: "success", environment_url: "https://eugenia-git-pr-7.vercel.app" }, { state: "in_progress" }],
    "repos/o/d/pulls/7/files?per_page=100": [{ filename: "src/data/home.ts" }],
  };
  const lecteur = lecteurGithub("o/d", (path) => answers[path] ?? []);
  assert.deepEqual(lecteur.prs(), [{ numero: 7, adresse: "https://github.com/o/d/pull/7", titre: "Durée", base: "b1", tete: "h1" }]);
  assert.deepEqual(lecteur.previsualisation("h1"), { etat: "success", adresse: "https://eugenia-git-pr-7.vercel.app", source: "déploiement GitHub" });
  assert.equal(lecteur.previsualisation("inconnu"), null);
  assert.deepEqual(lecteur.fichiers(7), ["src/data/home.ts"]);
});

test("seul le dernier commit d'une PR est joué, une fois, quand sa prévisualisation est prête", () => {
  let deployments = { h2: { etat: "pending", adresse: null } };
  const lecteur = { prs: () => [{ numero: 7, adresse: "u", base: "b", tete: "h2" }], previsualisation: (sha) => deployments[sha] ?? null, fichiers: () => [] };
  const faits = new Set();
  assert.deepEqual(aJouer(lecteur, faits), [], "prévisualisation pas prête : on attend");
  deployments = { h2: { etat: "success", adresse: "https://p.vercel.app" } };
  const prets = aJouer(lecteur, faits);
  assert.deepEqual(prets.map((pr) => [pr.numero, pr.tete, pr.previsualisation]), [[7, "h2", "https://p.vercel.app"]]);
  faits.add("7@h2");
  assert.deepEqual(aJouer(lecteur, faits), [], "déjà joué");
});

test("les fichiers de la PR choisissent les tests par le champ code des notes", (t) => {
  const vault = vaultEssai(t);
  const pr = { numero: 7, adresse: "https://github.com/o/d/pull/7", base: "b1", tete: "h1" };
  const impact = impactDePr({ pr, fichiers: ["src/data/home.ts", "README.md"], vault, logiciel: "site-essai" });
  assert.equal(impact.format, "horama-impact-1");
  assert.deepEqual([impact.depuis, impact.vers, impact.pr], ["b1", "h1", "https://github.com/o/d/pull/7"]);
  assert.deepEqual(impact.retenus, [{ id: "voir-accueil", raisons: ["relève accueil"] }]);
  assert.deepEqual(impact.ecartes, [{ id: "voir-programmes", raison: "page non touchée" }]);
});

test("une PR jouée : impact, tests du vault sur la prévisualisation, puis exploration de tout le site", async (t) => {
  const vault = vaultEssai(t);
  const sortie = mkdtempSync(join(tmpdir(), "horama-pr-sortie-"));
  t.after(() => rmSync(sortie, { recursive: true, force: true }));
  const calls = [];
  const pr = { numero: 7, adresse: "https://github.com/o/d/pull/7", base: "b1", tete: "h1234567890", previsualisation: "https://p.vercel.app" };
  const report = await jouerPr({ pr, fichiers: ["src/data/programmes.ts"], vault, logiciel: "site-essai", sortie, sceneArgs: ["--vitrine"] }, async (args) => calls.push(args));
  assert.equal(report.etat, "termine");
  assert.deepEqual([report.parcours.etat, report.exploration.etat], ["termine", "termine"]);
  const folder = join(sortie, "pr-7-h123456");
  assert.deepEqual(JSON.parse(readFileSync(join(folder, "impact.json"), "utf8")).ids, ["voir-programmes"]);
  assert.deepEqual(calls, [
    ["automatisation/scene/parcours.mjs", "--impact", join(folder, "impact.json"), "--base-url", "https://p.vercel.app", "--logiciel", "site-essai", "--vault", vault,
      "--pr", "https://github.com/o/d/pull/7", "--sortie", join(folder, "scene"), "--vitrine"],
    ["automatisation/scene/exploration.mjs", "--url", "https://p.vercel.app", "--max", "8", "--pages-cliquees", "8", "--vault", vault, "--site", "site-essai", "--sortie", join(folder, "exploration"),
      "--pr", "https://github.com/o/d/pull/7", "--vitrine"],
  ]);
  // A PR that touches no screen of the vault: the exploration of the site still runs.
  const explored = [];
  const none = await jouerPr({ pr: { ...pr, tete: "autre000000" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie, exploration: { max: 3, pagesCliquees: 1 } }, async (args) => explored.push(args[0]));
  assert.deepEqual([none.etat, none.parcours.etat, explored], ["termine", "aucun-test", ["automatisation/scene/exploration.mjs"]]);
  const ticketArgs = [];
  await jouerPr({ pr: { ...pr, tete: "ticket123" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie, depot: "o/d" }, async (args) => ticketArgs.push(args));
  assert.deepEqual(ticketArgs[0].slice(-4), ["--depot", "o/d", "--commit", "ticket123"]);
  // Without the exploration and without a test: nothing runs.
  const nothing = await jouerPr({ pr: { ...pr, tete: "rien0000000" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie, exploration: null }, async () => assert.fail("scène lancée"));
  assert.equal(nothing.etat, "aucun-test");
  // A scene that fails is written down, the other one still runs, nothing is thrown.
  const failing = await jouerPr({ pr: { ...pr, tete: "echec000000" }, fichiers: ["src/data/programmes.ts"], vault, logiciel: "site-essai", sortie }, async (args) => {
    if (args[0].endsWith("parcours.mjs")) throw new Error("automatisation/scene/parcours.mjs : sortie 1");
  });
  assert.deepEqual([failing.etat, failing.parcours.etat, failing.parcours.erreur, failing.exploration.etat], ["echec", "echec", "automatisation/scene/parcours.mjs : sortie 1", "termine"]);
  assert.equal(JSON.parse(readFileSync(join(sortie, "pr-7-echec00", "reveil.json"), "utf8")).etat, "echec");
});

test("à blanc : PR, prévisualisation (source, accès sans connexion), fichiers et tests rejoués, sans rien jouer", async (t) => {
  const vault = vaultEssai(t);
  const pr = { numero: 7, adresse: "u", titre: "Durée", base: "b", tete: "abcdef123" };
  const prete = { prs: () => [pr], previsualisation: () => ({ etat: "success", adresse: "https://p.vercel.app", source: "statut et commentaire de Vercel" }), fichiers: () => ["src/data/home.ts"] };
  const ouverte = async () => ({ ouverte: true, code: 200 });
  assert.deepEqual(await aBlanc(prete, { vault, logiciel: "site-essai", ouverte }), [
    "PR #7 (abcdef1) « Durée » : prévisualisation prête (statut et commentaire de Vercel), https://p.vercel.app, répond sans connexion (code 200).",
    "  1 fichier(s) : src/data/home.ts",
    "  tests rejoués : voir-accueil ; écartés : voir-programmes",
  ]);
  const protegee = async () => ({ ouverte: false, raison: "la prévisualisation demande une connexion Vercel (code 302)" });
  assert.equal((await aBlanc(prete, { vault, logiciel: "site-essai", ouverte: protegee }))[0],
    "PR #7 (abcdef1) « Durée » : prévisualisation prête (statut et commentaire de Vercel), https://p.vercel.app, pas jouable : la prévisualisation demande une connexion Vercel (code 302).");
  const rien = { prs: () => [], previsualisation: () => null, fichiers: () => [] };
  assert.deepEqual(await aBlanc(rien, { vault, logiciel: "site-essai", ouverte }), ["Aucune PR ouverte."]);
  const sans = { ...prete, previsualisation: () => null };
  assert.equal((await aBlanc(sans, { vault, logiciel: "site-essai", ouverte }))[0], "PR #7 (abcdef1) « Durée » : pas de prévisualisation pour ce commit (ni déploiement GitHub, ni statut Vercel).");
  const enCours = { ...prete, previsualisation: () => ({ etat: "pending", adresse: null, source: "statut et commentaire de Vercel" }) };
  assert.equal((await aBlanc(enCours, { vault, logiciel: "site-essai", ouverte }))[0], "PR #7 (abcdef1) « Durée » : prévisualisation « pending », pas encore jouable.");
});

// The comment of the Vercel bot as it was on the PR #11 of the clone (18/11): a hidden line with the JSON in base64,
// then a table with a « Preview » link. Same shape, made-up project.
const vercelComment = (previewUrl) => `[vc]: #abc123=:${Buffer.from(JSON.stringify({ isMonorepo: true, type: "github", projects: [{ name: "site", previewUrl, nextCommitStatus: "DEPLOYED" }] })).toString("base64")}
The latest updates on your projects.
| Project | Deployment | Actions | Updated |
| :--- | :----- | :------ | :------ |
| [site](https://vercel.com/o/site) | Ready | [Preview](https://site-git-branche-o.vercel.app) | Nov 18 |`;

test("commentaire du bot Vercel : l'adresse de la ligne cachée, sinon le lien « Preview »", () => {
  assert.equal(adresseCommentaireVercel(vercelComment("site-git-branche-o.vercel.app")), "https://site-git-branche-o.vercel.app");
  assert.equal(adresseCommentaireVercel("| [Preview](https://autre-git-b-o.vercel.app) |"), "https://autre-git-b-o.vercel.app");
  assert.equal(adresseCommentaireVercel("Rien ici."), null);
  assert.equal(adresseCommentaireVercel(undefined), null);
});

test("GitHub sans déploiement : statut Vercel du commit, puis l'adresse dans le commentaire du bot", () => {
  const answers = {
    "repos/o/d/deployments?sha=h1&per_page=100": [],
    "repos/o/d/commits/h1/status": [{ state: "success", statuses: [{ context: "Devin Review", state: "success" }, { context: "Vercel", state: "success", target_url: "https://vercel.com/o/site/Eu59" }] }],
    "repos/o/d/issues/11/comments?per_page=100": [{ user: { login: "devin-ai-integration[bot]" }, body: "[Preview](https://faux.vercel.app)" }, { user: { login: "vercel[bot]" }, body: vercelComment("site-git-branche-o.vercel.app") }],
    "repos/o/d/deployments?sha=h2&per_page=100": [],
    "repos/o/d/commits/h2/status": [{ state: "pending", statuses: [{ context: "Vercel", state: "pending" }] }],
    "repos/o/d/deployments?sha=h3&per_page=100": [],
    "repos/o/d/commits/h3/status": [{ state: "success", statuses: [{ context: "Devin Review", state: "success" }] }],
  };
  const lecteur = lecteurGithub("o/d", (path) => answers[path] ?? []);
  assert.deepEqual(lecteur.previsualisation("h1", 11), { etat: "success", adresse: "https://site-git-branche-o.vercel.app", source: "statut et commentaire de Vercel" });
  assert.deepEqual(lecteur.previsualisation("h2", 11), { etat: "pending", adresse: null, source: "statut de Vercel" });
  assert.equal(lecteur.previsualisation("h3", 11), null);
  // Ready but nothing played without an address.
  assert.deepEqual(aJouer({ prs: () => [{ numero: 11, adresse: "u", base: "b", tete: "h1" }], previsualisation: lecteur.previsualisation }, new Set()).map((pr) => pr.previsualisation), ["https://site-git-branche-o.vercel.app"]);
});

test("prévisualisation protégée par Vercel, ouverte, ou muette", async () => {
  const answer = (status, location) => async () => ({ status, headers: new Headers(location ? { location } : {}) });
  assert.deepEqual(await ouverteSansConnexion("https://p.vercel.app", answer(302, "https://vercel.com/sso-api?url=x")), { ouverte: false, raison: "la prévisualisation demande une connexion Vercel (code 302)" });
  assert.deepEqual(await ouverteSansConnexion("https://p.vercel.app", answer(401)), { ouverte: false, raison: "la prévisualisation demande une connexion Vercel (code 401)" });
  assert.deepEqual(await ouverteSansConnexion("https://p.vercel.app", answer(200)), { ouverte: true, code: 200 });
  assert.deepEqual(await ouverteSansConnexion("https://p.vercel.app", answer(308, "/admissions")), { ouverte: true, code: 308 });
  const muette = await ouverteSansConnexion("https://p.vercel.app", async () => { throw new Error("fetch failed"); });
  assert.deepEqual(muette, { ouverte: false, raison: "la prévisualisation ne répond pas (fetch failed)" });
});

// The same vault, its notes declaring the language of their page.
function vaultEnFrancais(t) {
  const vault = vaultEssai(t);
  for (const ecran of ["accueil", "programmes"]) {
    const file = join(vault, "site-essai", "produit", `${ecran}.md`);
    writeFileSync(file, readFileSync(file, "utf8").replace("vues: []", "vues: []\nlangue: fr"));
  }
  return vault;
}

test("langue d'une page : la première partie de <html lang>, en minuscules, ou null", async () => {
  const page = (html) => async () => ({ text: async () => html });
  assert.equal(await langueDePage("https://p", page('<!doctype html><html lang="de-DE"><body>')), "de");
  assert.equal(await langueDePage("https://p", page("<html class='x' lang=FR>")), "fr");
  assert.equal(await langueDePage("https://p", page("<html><body>")), null);
  assert.equal(await langueDePage("https://p", async () => { throw new Error("fetch failed"); }), null);
});

test("langue changée sur la prévisualisation : tests de la documentation écartés, l'exploration seule tourne", async (t) => {
  const vault = vaultEnFrancais(t);
  const asked = [];
  const german = async (url) => (asked.push(url), "de");
  const impact = impactDePr({ pr: { base: "b", tete: "h", adresse: "u" }, fichiers: ["src/data/home.ts", "src/data/programmes.ts"], vault, logiciel: "site-essai" });
  const filtered = await ecarterLangue(impact, { vault, logiciel: "site-essai", base: "https://p.vercel.app", langue: german });
  assert.deepEqual(filtered.ids, []);
  assert.deepEqual(filtered.ecartes.map((e) => [e.id, e.raison]), [
    ["voir-accueil", "langue du site changée (fr → de) : tests de la documentation non joués"],
    ["voir-programmes", "langue du site changée (fr → de) : tests de la documentation non joués"],
  ]);
  assert.deepEqual(asked.sort(), ["https://p.vercel.app/", "https://p.vercel.app/programmes"]);
  // Same language, or a page that does not say it: kept.
  assert.deepEqual((await ecarterLangue(impact, { vault, logiciel: "site-essai", base: "https://p", langue: async () => "fr" })).ids, ["voir-accueil", "voir-programmes"]);
  assert.deepEqual((await ecarterLangue(impact, { vault, logiciel: "site-essai", base: "https://p", langue: async () => null })).ids, ["voir-accueil", "voir-programmes"]);
  // In jouerPr: the vault tests are not played, the exploration is, and reveil.json says why.
  const sortie = mkdtempSync(join(tmpdir(), "horama-pr-sortie-"));
  t.after(() => rmSync(sortie, { recursive: true, force: true }));
  const calls = [];
  const report = await jouerPr({ pr: { numero: 9, adresse: "u", base: "b", tete: "allemand000", previsualisation: "https://p.vercel.app" }, fichiers: ["src/data/home.ts"], vault, logiciel: "site-essai", sortie, langue: german }, async (args) => calls.push(args[0]));
  assert.deepEqual(calls, ["automatisation/scene/exploration.mjs"]);
  assert.deepEqual([report.etat, report.parcours.etat, report.langue], ["termine", "aucun-test", "langue du site changée (fr → de) : tests de la documentation non joués"]);
  // The dry run says it too.
  const lecteur = { prs: () => [{ numero: 9, adresse: "u", titre: "Deutsch", base: "b", tete: "allemand000" }], previsualisation: () => ({ etat: "success", adresse: "https://p.vercel.app", source: "faux" }), fichiers: () => ["src/data/home.ts"] };
  const lines = await aBlanc(lecteur, { vault, logiciel: "site-essai", ouverte: async () => ({ ouverte: true, code: 200 }), langue: german });
  assert.deepEqual(lines.slice(2), ["  tests rejoués : aucun ; écartés : voir-programmes, voir-accueil", "  langue du site changée (fr → de) : tests de la documentation non joués (voir-accueil)"]);
});

test("--commenter : une seule réponse sur la PR, la partie des tests du vault puis celle de l'exploration", async (t) => {
  const vault = vaultEssai(t);
  const sortie = mkdtempSync(join(tmpdir(), "horama-pr-sortie-"));
  t.after(() => rmSync(sortie, { recursive: true, force: true }));
  const pr = { numero: 7, adresse: "https://github.com/o/d/pull/7", base: "b1", tete: "aaaaaaa0000", previsualisation: "https://p.vercel.app" };
  // The scenes write their part where they write it for real.
  const scenes = async (args) => {
    const out = args[args.indexOf("--sortie") + 1];
    mkdirSync(out, { recursive: true });
    if (args[0].endsWith("parcours.mjs")) writeFileSync(join(out, "passage.json"), JSON.stringify({ commentaire_corps: "## Horama : passage P1\n\nTests." }));
    else writeFileSync(join(out, "scene.json"), JSON.stringify({ commentaire: { corps: "### Exploration de tout le site de la prévisualisation\n\nSite." } }));
  };
  const posted = [];
  const publier = async (adresse, corps) => (posted.push([adresse, corps]), { status: "publie", url: `${adresse}#issuecomment-1` });
  const report = await jouerPr({ pr, fichiers: ["src/data/programmes.ts"], vault, logiciel: "site-essai", sortie, commenter: true, publier }, scenes);
  assert.deepEqual(posted, [["https://github.com/o/d/pull/7", "## Horama : passage P1\n\nTests.\n### Exploration de tout le site de la prévisualisation\n\nSite."]]);
  assert.deepEqual(report.commentaire, { status: "publie", url: "https://github.com/o/d/pull/7#issuecomment-1" });
  // No vault test touched: a heading says it, then the exploration.
  posted.length = 0;
  await jouerPr({ pr: { ...pr, tete: "bbbbbbb0001" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie, commenter: true, publier }, scenes);
  assert.equal(posted[0][1], "## Horama : PR #7 (bbbbbbb)\n\nTests de la documentation : aucun touché par cette PR.\n\n### Exploration de tout le site de la prévisualisation\n\nSite.");
  // Nothing written by the scenes: nothing posted, said.
  posted.length = 0;
  const silent = await jouerPr({ pr: { ...pr, tete: "ccccccc0002" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie, commenter: true, publier }, async () => {});
  assert.deepEqual([posted.length, silent.commentaire.status], [0, "INCONCLUSIVE"]);
  // Without --commenter, nothing is posted.
  await jouerPr({ pr: { ...pr, tete: "ddddddd0003" }, fichiers: ["src/data/programmes.ts"], vault, logiciel: "site-essai", sortie, publier }, scenes);
  assert.equal(posted.length, 0);
});

test("contrôle « Vercel Preview Comments » du commit : l'adresse de la prévisualisation, même sans commentaire du bot", () => {
  // Its summary on the PR #14 of the clone (18/11), the address changed.
  const summary = "💬 0 unresolved, 0 resolved. [Go to feedback](https://vercel.live/open-feedback/site-git-branche-e9c30e-o.vercel.app?via=pr-comment-feedback-link)";
  assert.equal(adresseControleVercel(summary), "https://site-git-branche-e9c30e-o.vercel.app");
  assert.equal(adresseControleVercel("✅ No unresolved feedback"), null);
  const answers = {
    "repos/o/d/deployments?sha=h4&per_page=100": [],
    "repos/o/d/commits/h4/status": [{ statuses: [{ context: "Vercel", state: "success" }] }],
    "repos/o/d/commits/h4/check-runs?per_page=100": [{ total_count: 2, check_runs: [{ app: { slug: "github-actions" }, output: { summary: null } }, { app: { slug: "vercel" }, name: "Vercel Preview Comments", output: { summary } }] }],
    "repos/o/d/issues/14/comments?per_page=100": [],
  };
  const lecteur = lecteurGithub("o/d", (path) => answers[path] ?? []);
  assert.deepEqual(lecteur.previsualisation("h4", 14), { etat: "success", adresse: "https://site-git-branche-e9c30e-o.vercel.app", source: "statut et contrôle de Vercel" });
});

test("capture poussée sur une branche du dépôt cible : branche créée au besoin, adresse de l'image au commit, échec rendu", async (t) => {
  const folder = mkdtempSync(join(tmpdir(), "horama-capture-"));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const fichier = join(folder, "c1.png");
  writeFileSync(fichier, Buffer.from([137, 80, 78, 71]));
  const calls = [];
  const fake = (files = {}) => async ([method, path], body) => {
    calls.push([method, path, body && (body.content ? { ...body, content: Buffer.from(body.content, "base64").length } : body)]);
    if (method === "GET" && path === "repos/o/clone/git/ref/heads/horama/captures") { if (!files.branche) throw new Error("HTTP 404"); return { object: { sha: "b0" } }; }
    if (method === "GET" && path === "repos/o/clone") return { default_branch: "main" };
    if (method === "GET" && path === "repos/o/clone/git/ref/heads/main") return { object: { sha: "m0" } };
    if (method === "POST") return {};
    if (method === "GET" && path.startsWith("repos/o/clone/contents/")) { if (!files.existe) throw new Error("HTTP 404"); return { sha: "f0" }; }
    if (method === "PUT") return { commit: { sha: "c0mmit" } };
    throw new Error(`inattendu ${method} ${path}`);
  };
  const args = { depot: "o/clone", branche: "horama/captures", chemin: "pr-14/0b4112f/c1.png", fichier, message: "Horama : capture c1" };
  assert.deepEqual(await televerserCapture(args, fake()), { url: "https://raw.githubusercontent.com/o/clone/c0mmit/pr-14/0b4112f/c1.png" });
  assert.deepEqual(calls.map(([method, path]) => `${method} ${path}`), [
    "GET repos/o/clone/git/ref/heads/horama/captures", "GET repos/o/clone", "GET repos/o/clone/git/ref/heads/main", "POST repos/o/clone/git/refs",
    "GET repos/o/clone/contents/pr-14/0b4112f/c1.png?ref=horama%2Fcaptures", "PUT repos/o/clone/contents/pr-14/0b4112f/c1.png",
  ]);
  assert.deepEqual(calls[3][2], { ref: "refs/heads/horama/captures", sha: "m0" });
  assert.deepEqual(calls[5][2], { message: "Horama : capture c1", branch: "horama/captures", content: 4 });
  // Branch already there, file already there (same commit played again): its sha is given, no branch created.
  calls.length = 0;
  await televerserCapture(args, fake({ branche: true, existe: true }));
  assert.deepEqual([calls.length, calls.at(-1)[2].sha], [3, "f0"]);
  // A refusal is returned, never thrown.
  assert.deepEqual(await televerserCapture(args, async () => { throw new Error("gh: Resource not accessible\nHTTP 403"); }), { raison: "HTTP 403" });
});

test("--captures-sur-branche : les captures entourées de l'exploration poussées, puis montrées dans la réponse", async (t) => {
  const vault = vaultEssai(t);
  const sortie = mkdtempSync(join(tmpdir(), "horama-pr-sortie-"));
  t.after(() => rmSync(sortie, { recursive: true, force: true }));
  const anneau = "site-pr/passages/P9/accueil--controle--1.png";
  mkdirSync(join(vault, "site-pr/passages/P9"), { recursive: true });
  writeFileSync(join(vault, anneau), Buffer.from([137, 80, 78, 71]));
  const item = (id, extra) => ({ id, chemin: "/", texte: "Le texte dépasse la boîte de son conteneur.", preuve: "Mesuré : 245×44 > 184×44. Attendu : le contenu tient dans sa boîte.", zone: { x: 40, y: 209, largeur: 184, hauteur: 44 }, capture: null, ...extra });
  const elements = { adresse: "https://p.vercel.app", bilan: { aucune: false, nonVisitees: [] }, totaux: { pages_visitees: 2, pages_trouvees: 2 }, decisions: [{ ecart_id: "accueil--controle--1", decision: "bug" }],
    prouves: [item("accueil--controle--1", { anneau }), item("programme--controle--1", { anneau: null })], doutes: [], dejaVoulus: [], note: "vault-horama/site-pr/passages/P9.md" };
  const scenes = async (args) => {
    const out = args[args.indexOf("--sortie") + 1];
    mkdirSync(out, { recursive: true });
    if (args[0].endsWith("exploration.mjs")) writeFileSync(join(out, "scene.json"), JSON.stringify({ commentaire: { corps: "texte seul", elements } }));
  };
  const sent = [];
  const televerser = async (args) => (sent.push(args), { url: `https://raw.githubusercontent.com/o/clone/c0mmit/${args.chemin}` });
  const posted = [];
  const indexed = [];
  const report = await jouerPr({ pr: { numero: 14, adresse: "https://github.com/o/clone/pull/14", base: "b", tete: "0b4112f0000", previsualisation: "https://p.vercel.app" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie,
    commenter: true, publier: async (adresse, corps) => (posted.push(corps), { status: "publie", url: "u" }), captures: { depot: "o/clone", branche: "horama/captures" }, televerser,
    indexer: async (args) => (indexed.push(args), { url: "https://raw.githubusercontent.com/o/clone/horama/captures/index.json", passages: 1 }) }, scenes);
  assert.deepEqual(sent.map(({ depot, branche, chemin, fichier }) => [depot, branche, chemin, fichier]), [["o/clone", "horama/captures", "pr-14/0b4112f/accueil--controle--1.png", join(vault, anneau)]]);
  assert.deepEqual(report.captures, { branche: "horama/captures", poussees: 1 });
  assert.match(posted[0], /- \/ : Le texte dépasse la boîte de son conteneur\. .*décision : bug\)\n\n  !\[\/ : Le texte dépasse la boîte de son conteneur\.\]\(https:\/\/raw\.githubusercontent\.com\/o\/clone\/c0mmit\/pr-14\/0b4112f\/accueil--controle--1\.png\)/);
  // The finding without a capture ringed stays in text.
  assert.equal((posted[0].match(/!\[/g) ?? []).length, 1);
  assert.doesNotMatch(posted[0], /texte seul/);
  // The index of the passages, after the answer: on the branch of the captures, with the address of the answer.
  assert.deepEqual(indexed.map(({ depot, branche, entree }) => [depot, branche, entree.pr.numero, entree.reponse, entree.constats.length]), [["o/clone", "horama/captures", 14, "u", 2]]);
  assert.equal(report.index.passages, 1);
});

// The index of the passages (#149): one entry per PR and commit, built from scene.json and the wake-up; published as
// index.json on the public branch of the captures, the same PR and commit replaced, the latest first.
test("index des passages : entrée d'un passage, publiée sur la branche des captures", async () => {
  const pr = { numero: 16, adresse: "https://github.com/o/clone/pull/16", titre: "Allemand", tete: "998767b0000", previsualisation: "https://p.vercel.app" };
  const scene = { passage_id: "2026-11-19-10h55-4163",
    decisions: [{ fichier: "x", decision: { ecart_id: "accueil--controle--1", decision: "bug", par: "Nathan", le: "2026-11-19T10:00:00Z" } }],
    commentaire: { elements: { totaux: { defauts: 1, doutes: 1, pages_visitees: 8 },
      prouves: [{ id: "accueil--controle--1", chemin: "/", texte: "Le texte dépasse la boîte de son conteneur.", preuve: "Mesuré : 158×35 > 120×35.", zone: { x: 32, y: 432, largeur: 120, hauteur: 35 } }],
      doutes: [{ id: "admissions--holo--1", chemin: "/admissions", texte: "Un texte semble coupé.", zone: null }] } } };
  const report = { recu_le: "2026-11-19T10:55:10Z", commentaire: { status: "publie", url: "https://github.com/o/clone/pull/16#issuecomment-1" }, exploration: { etat: "termine" } };
  const entree = entreeIndex({ pr, logiciel: "eugenia-clone", report, scene, images: { "accueil--controle--1": "https://raw.githubusercontent.com/o/clone/c1/pr-16/998767b/accueil--controle--1.png" } });
  assert.equal(entree.passage, "2026-11-19-10h55-4163");
  assert.deepEqual(entree.pr, { numero: 16, adresse: pr.adresse, titre: "Allemand" });
  assert.equal(entree.reponse, report.commentaire.url);
  assert.deepEqual(entree.constats.map(({ id, statut, capture, decision }) => [id, statut, Boolean(capture), decision?.choix ?? null]),
    [["accueil--controle--1", "VERIFIED_FAIL", true, "bug"], ["admissions--holo--1", "SUSPECTED", false, null]]);

  // An index already there with an older passage and the same PR and commit played before: replaced, the latest first.
  const old = { format: "horama-passages-1", depot: "o/clone", passages: [{ pr: { numero: 16 }, commit: "998767b0000", date: "2026-11-19T09:00:00Z" }, { pr: { numero: 14 }, commit: "aaa", date: "2026-11-18T09:00:00Z" }] };
  const calls = [];
  const fake = async ([method, path], body) => {
    calls.push([method, path, body]);
    if (method === "GET") return { sha: "s0", content: Buffer.from(JSON.stringify(old)).toString("base64") };
    return { commit: { sha: "c2" } };
  };
  const sent = await publierIndex({ depot: "o/clone", branche: "horama/captures", entree }, fake);
  assert.deepEqual(sent, { url: "https://raw.githubusercontent.com/o/clone/horama/captures/index.json", commit: "c2", passages: 2 });
  assert.deepEqual(calls.map(([method, path]) => `${method} ${path}`), ["GET repos/o/clone/contents/index.json?ref=horama%2Fcaptures", "PUT repos/o/clone/contents/index.json"]);
  const written = JSON.parse(Buffer.from(calls[1][2].content, "base64").toString("utf8"));
  assert.equal(calls[1][2].sha, "s0");
  assert.deepEqual(written.passages.map(({ pr: { numero }, date }) => [numero, date]), [[16, "2026-11-19T10:55:10Z"], [14, "2026-11-18T09:00:00Z"]]);
  // No index yet: a new one.
  const fresh = await publierIndex({ depot: "o/clone", branche: "horama/captures", entree }, async ([method]) => (method === "GET" ? null : { commit: { sha: "c3" } }));
  assert.equal(fresh.passages, 1);
  // An index there but unreadable (corrupt, or over 1 MB: empty content): no PUT, a reason (review of #211).
  for (const content of [Buffer.from("{ pas du JSON").toString("base64"), "", Buffer.from(JSON.stringify({ format: "x" })).toString("base64")]) {
    const puts = [];
    const refused = await publierIndex({ depot: "o/clone", branche: "horama/captures", entree }, async ([method], body) => (method === "GET" ? { sha: "s9", content } : (puts.push(body), { commit: { sha: "c4" } })));
    assert.match(refused.raison, /index\.json illisible/);
    assert.deepEqual(puts, [], "aucune écriture sur un index illisible");
  }
  // GitHub refuses: a reason, never a throw.
  assert.ok((await publierIndex({ depot: "o/clone", branche: "b", entree }, async () => { throw new Error("HTTP 403"); })).raison);
});
