import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { aBlanc, aJouer, adresseCommentaireVercel, impactDePr, jouerPr, lecteurGithub, ouverteSansConnexion } from "./pr.mjs";

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
    ["automatisation/scene/exploration.mjs", "--url", "https://p.vercel.app", "--max", "8", "--pages-cliquees", "4", "--vault", vault, "--sortie", join(folder, "exploration"), "--vitrine"],
  ]);
  // A PR that touches no screen of the vault: the exploration of the site still runs.
  const explored = [];
  const none = await jouerPr({ pr: { ...pr, tete: "autre000000" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie, exploration: { max: 3, pagesCliquees: 1 } }, async (args) => explored.push(args[0]));
  assert.deepEqual([none.etat, none.parcours.etat, explored], ["termine", "aucun-test", ["automatisation/scene/exploration.mjs"]]);
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
  assert.deepEqual(lecteur.previsualisation("h2", 11), { etat: "pending", adresse: null, source: "statut et commentaire de Vercel" });
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
