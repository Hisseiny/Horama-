import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { changesSince, wakeCommit } from "./wake.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "horama-wake-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "demo");
  const commit = (file, text) => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), text);
    git("add", file);
    git("commit", "-m", "Essai isolé du réveil");
    return git("rev-parse", "HEAD");
  };
  const before = commit("vault-horama/eugenia/produit/accueil.md", "note d'essai\n");
  return { root, git, commit, before, output: join(root, ".orchestrateur/reveil") };
}

test("ignore les autres dossiers, suit la branche nommée et conserve tous les commits du site", (t) => {
  const { root, git, commit, before } = fixture(t);
  const unrelated = commit("autre.md", "hors site");
  const first = commit("site-eugenia/index.html", "v1");
  const second = commit("site-eugenia/index.html", "v2");
  git("checkout", "-b", "autre-branche", before);
  assert.deepEqual(changesSince(root, before, "demo"), [
    { before, after: unrelated, siteChanged: false },
    { before: unrelated, after: first, siteChanged: true },
    { before: first, after: second, siteChanged: true },
  ]);
  assert.deepEqual(changesSince(root, second, "demo"), []);
  assert.throws(() => changesSince(root, second, "autre-branche"));
});

test("un commit de fusion touchant le site est détecté une seule fois", (t) => {
  const { root, git, commit, before } = fixture(t);
  git("checkout", "-b", "site");
  commit("site-eugenia/index.html", "v2");
  git("checkout", "demo");
  git("merge", "--no-ff", "site", "-m", "Fusion d'essai");
  assert.deepEqual(changesSince(root, before, "demo"), [{ before, after: git("rev-parse", "demo"), siteChanged: true }]);
});

const impactFor = (retained = [{ id: "accueil-vers-bachelor", raisons: ["relève accueil"] }]) => ({
  format: "horama-impact-1", logiciel: "eugenia", retenus: retained,
  ecartes: [{ id: "bachelor-vers-msc", raison: "page non touchée" }],
});

test("écrit le JSON intact avant la scène, transmet sélection/cible et protège le vault", async (t) => {
  const { root, commit, before, output } = fixture(t);
  const after = commit("site-eugenia/index.html", "v2");
  const json = `${JSON.stringify(impactFor(), null, 2)}\n`;
  let calls = 0;
  const report = await wakeCommit({ root, before, after, baseUrl: "http://localhost:3000", output, sceneArgs: ["--sans-fin"] }, async (cwd, args, capture) => {
    assert.equal(cwd, root);
    if (++calls === 1) {
      assert.deepEqual(args, ["automatisation/impact/impact.mjs", "--depuis", before, "--vers", after, "--logiciel", "eugenia", "--json"]);
      assert.equal(capture, true);
      return json;
    }
    assert.equal(args[0], "automatisation/scene/parcours.mjs");
    assert.ok(args.includes("--sans-agent") && args.includes("--sans-base"));
    assert.ok(!args.includes("--tests"));
    assert.equal(args[args.indexOf("--base-url") + 1], "http://localhost:3000");
    assert.equal(readFileSync(args[args.indexOf("--impact") + 1], "utf8"), json);
    const vault = args[args.indexOf("--vault") + 1];
    assert.equal(readFileSync(join(vault, "eugenia/produit/accueil.md"), "utf8"), "note d'essai\n");
    writeFileSync(join(vault, "eugenia/produit/accueil.md"), "écriture de scène");
    assert.equal(args.at(-1), "--sans-fin");
  });
  assert.equal(calls, 2);
  assert.equal(report.etat, "termine");
  assert.ok(report.scene_lancee_ms >= report.impact_ms);
  assert.equal(readFileSync(join(root, "vault-horama/eugenia/produit/accueil.md"), "utf8"), "note d'essai\n");
  assert.equal(JSON.parse(readFileSync(join(output, readdirSync(output)[0], "reveil.json"))).etat, "termine");
});

test("rejouer le même commit conserve les preuves mais ne recharge pas les décisions du premier passage", async (t) => {
  const { root, before, output } = fixture(t);
  const vaults = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    await wakeCommit({ root, before, after: before, output }, async (_cwd, args, capture) => {
      if (capture) return JSON.stringify(impactFor());
      const vault = args[args.indexOf("--vault") + 1];
      vaults.push(vault);
      const decision = join(vault, "eugenia/decisions/essai.md");
      assert.equal(existsSync(decision), false);
      mkdirSync(join(vault, "eugenia/decisions"), { recursive: true });
      writeFileSync(decision, "décision du passage\n");
    });
  }
  assert.notEqual(vaults[0], vaults[1]);
  assert.equal(readFileSync(join(vaults[0], "eugenia/decisions/essai.md"), "utf8"), "décision du passage\n");
});

test("un impact vide est conservé sans lancer la scène", async (t) => {
  const { root, before, output } = fixture(t);
  let calls = 0;
  const report = await wakeCommit({ root, before, after: before, output }, async () => {
    calls++;
    return JSON.stringify(impactFor([]));
  });
  assert.equal(calls, 1);
  assert.equal(report.etat, "aucun-test");
  assert.deepEqual(JSON.parse(readFileSync(join(output, readdirSync(output)[0], "impact.json"))).retenus, []);
});

test("une erreur impact, un format invalide ou une erreur scène est visible et arrête la suite", async (t) => {
  const { root, before, output } = fixture(t);
  for (const stage of ["impact", "format", "scene"]) {
    let calls = 0;
    const target = join(output, stage);
    await assert.rejects(wakeCommit({ root, before, after: before, output: target }, async () => {
      calls++;
      if (stage === "impact" || calls === 2) throw new Error("échec d'essai");
      return JSON.stringify(stage === "format" ? { ...impactFor(), format: "inconnu" } : impactFor());
    }));
    assert.equal(calls, stage === "scene" ? 2 : 1);
    const report = JSON.parse(readFileSync(join(target, readdirSync(target)[0], "reveil.json")));
    assert.equal(report.etat, "echec");
    assert.ok(report.erreur);
  }
});
