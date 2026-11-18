import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { aBlanc, aJouer, impactDePr, jouerPr, lecteurGithub } from "./pr.mjs";

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
  assert.deepEqual(lecteur.previsualisation("h1"), { etat: "success", adresse: "https://eugenia-git-pr-7.vercel.app" });
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

test("une PR jouée : impact écrit, puis la scène sur la prévisualisation avec la PR et les options transmises", async (t) => {
  const vault = vaultEssai(t);
  const sortie = mkdtempSync(join(tmpdir(), "horama-pr-sortie-"));
  t.after(() => rmSync(sortie, { recursive: true, force: true }));
  const calls = [];
  const pr = { numero: 7, adresse: "https://github.com/o/d/pull/7", base: "b1", tete: "h1234567890", previsualisation: "https://p.vercel.app" };
  const report = await jouerPr({ pr, fichiers: ["src/data/programmes.ts"], vault, logiciel: "site-essai", sortie, sceneArgs: ["--vitrine"] }, async (args) => calls.push(args));
  assert.equal(report.etat, "termine");
  const folder = join(sortie, "pr-7-h123456");
  assert.deepEqual(JSON.parse(readFileSync(join(folder, "impact.json"), "utf8")).ids, ["voir-programmes"]);
  assert.deepEqual(calls, [["automatisation/scene/parcours.mjs", "--impact", join(folder, "impact.json"), "--base-url", "https://p.vercel.app", "--logiciel", "site-essai", "--vault", vault,
    "--pr", "https://github.com/o/d/pull/7", "--sortie", join(folder, "scene"), "--vitrine"]]);
  // A PR that touches no screen: said, the scene is not started.
  const none = await jouerPr({ pr: { ...pr, tete: "autre000000" }, fichiers: ["README.md"], vault, logiciel: "site-essai", sortie }, async () => assert.fail("scène lancée"));
  assert.equal(none.etat, "aucun-test");
});

test("à blanc : PR, prévisualisation, fichiers et tests rejoués, sans rien jouer ; dépôt sans Vercel signalé", (t) => {
  const vault = vaultEssai(t);
  const pr = { numero: 7, adresse: "u", titre: "Durée", base: "b", tete: "abcdef123" };
  const relie = { deploiementsPreview: () => 1, prs: () => [pr], previsualisation: () => ({ etat: "success", adresse: "https://p.vercel.app" }), fichiers: () => ["src/data/home.ts"] };
  assert.deepEqual(aBlanc(relie, { vault, logiciel: "site-essai" }), [
    "1 déploiement(s) Preview sur le dépôt.",
    "PR #7 (abcdef1) « Durée » : prévisualisation prête, https://p.vercel.app.",
    "  1 fichier(s) : src/data/home.ts",
    "  tests rejoués : voir-accueil ; écartés : voir-programmes",
  ]);
  const seul = { deploiementsPreview: () => 0, prs: () => [], previsualisation: () => null, fichiers: () => [] };
  assert.deepEqual(aBlanc(seul, { vault, logiciel: "site-essai" }), ["Aucun déploiement Preview sur le dépôt : Vercel n'y est pas encore relié.", "Aucune PR ouverte."]);
  const enAttente = { ...relie, deploiementsPreview: () => 0, previsualisation: () => null };
  assert.equal(aBlanc(enAttente, { vault, logiciel: "site-essai" })[1], "PR #7 (abcdef1) « Durée » : pas de déploiement Preview pour ce commit.");
});
