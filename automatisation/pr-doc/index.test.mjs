import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { ouvrirPrDoc } from "./index.mjs";

const execute = promisify(execFile);
const repository = "example/horama-doc-trial";
const fichier = "produit/accueil.md";
const avant = "Le bouton affiche « Candidater ».";
const apres = "Le bouton affiche « Apply $& ».";
const passage_id = "essai-documentation";
const note = `# Accueil\n\n${avant}\n\nUne autre règle reste intacte.\n`;
const notePath = `vault-demo/eugenia/${fichier}`;
const decision = {
  id: "decision-essai", passage_id, test_id: "bouton-candidater", ecart_id: "ecart-essai",
  decision: "voulu", logiciel: "eugenia", ecran: "accueil", vue: "defaut", ecart: "Le bouton passe en anglais.",
  version: "2", portee: "cet ecart, cet ecran, cette version", pourquoi: "Traduction validée.",
  par: "Humain d'essai", le: "2026-11-17T17:00:00Z",
  correction_de_note: { fichier, avant, apres, statut: "acceptee" },
};
const input = { passage_id, fichier, avant, apres, decision };
const options = { repository, vaultPath: "vault-demo/eugenia", passageUrl: `https://example.test/passages/${passage_id}` };
const expectedBody = [
  "Test : bouton-candidater",
  "Écart : Le bouton passe en anglais.",
  "Décision humaine : voulu, correction acceptée par Humain d'essai. Traduction validée.",
  `Note : ${notePath}`,
  `Passage : ${options.passageUrl}`, "",
].join("\n");

// Only filesystem operations are real here; no process and no network are started.
function stub({ content = note, fail } = {}) {
  const calls = [];
  let checkout, body, corrected;
  const run = async (command, args, settings) => {
    calls.push([command, args, settings]);
    if (fail?.(command, args)) throw new Error("Refus simulé du service distant");
    if (command === "git" && args[0] === "clone") {
      checkout = args.at(-1);
      await mkdir(dirname(join(checkout, notePath)), { recursive: true });
      await writeFile(join(checkout, notePath), content);
    }
    if (command === "gh") {
      body = await readFile(args[args.indexOf("--body-file") + 1], "utf8");
      corrected = await readFile(join(checkout, notePath), "utf8");
      return { stdout: `https://github.com/${repository}/pull/1\n` };
    }
    return { stdout: "" };
  };
  return { run, calls, get checkout() { return checkout; }, get body() { return body; }, get corrected() { return corrected; } };
}

test("texte exact et commandes explicites : une branche neuve, un commit, une PR", async () => {
  const fake = stub();
  const result = await ouvrirPrDoc(input, { ...options, run: fake.run });
  assert.equal(result.status, "opened");
  assert.equal(result.url, `https://github.com/${repository}/pull/1`);
  assert.match(result.branch, /^docs\/note-[\da-f-]+$/);
  assert.equal(fake.body, expectedBody);
  assert.equal(fake.corrected, note.replace(avant, () => apres));
  assert.deepEqual(fake.calls.map(([command, args]) => [command, args]), [
    ["git", ["clone", "--single-branch", "--branch", "dev", "--no-tags", "--", `https://github.com/${repository}.git`, fake.checkout]],
    ["git", ["switch", "--create", result.branch]],
    ["git", ["ls-files", "--error-unmatch", "--", notePath]],
    ["git", ["add", "--", notePath]],
    ["git", ["commit", "-m", `docs : correction acceptée du passage ${passage_id}`, "--", notePath]],
    ["git", ["push", "origin", `HEAD:refs/heads/${result.branch}`]],
    ["gh", ["pr", "create", "--repo", repository, "--base", "dev", "--head", result.branch,
      "--title", "Documentation : correction du test bouton-candidater", "--body-file", join(dirname(fake.checkout), "pr.md")]],
  ]);
  for (const [, , settings] of fake.calls.slice(1)) assert.equal(settings.cwd, fake.checkout);
  await assert.rejects(access(fake.checkout), { code: "ENOENT" });
});

test("refuse une correction non acceptée ou différente du C5 avant toute commande", async () => {
  for (const changed of [
    { decision: { ...decision, decision: "bug" } },
    { decision: { ...decision, passage_id: "autre-passage" } },
    ...["proposee", "refusee"].map((statut) => ({ decision: { ...decision, correction_de_note: { ...decision.correction_de_note, statut } } })),
    { apres: "Correction non validée" },
  ]) {
    const fake = stub();
    await assert.rejects(ouvrirPrDoc({ ...input, ...changed }, { ...options, run: fake.run }), /acceptée/);
    assert.equal(fake.calls.length, 0);
  }
});

test("branche cible configurable et suppression de texte acceptée", async () => {
  const fake = stub();
  const result = await ouvrirPrDoc({ ...input, apres: "", decision: {
    ...decision, pourquoi: undefined, correction_de_note: { ...decision.correction_de_note, apres: "" },
  } }, { ...options, base: "documentation", run: fake.run });
  assert.equal(result.status, "opened");
  assert.equal(fake.calls[0][1][3], "documentation");
  assert.equal(fake.calls.at(-1)[1][5], "documentation");
  assert.equal(fake.corrected, note.replace(avant, ""));
  assert.match(fake.body, /correction acceptée par Humain d'essai\.\nNote/);
});

test("exige le dépôt et le lien et refuse de sortir du vault", async () => {
  for (const changed of [{ repository: undefined }, { passageUrl: "file:///tmp/passage" }, { vaultPath: "../vault" }, { vaultPath: "/tmp/vault" }]) {
    const fake = stub();
    await assert.rejects(ouvrirPrDoc(input, { ...options, ...changed, run: fake.run }));
    assert.equal(fake.calls.length, 0);
  }
});

test("un texte absent ou ambigu ne crée ni commit ni poussée ni PR", async () => {
  for (const content of ["Note divergente", `${note}\n${avant}`]) {
    const fake = stub({ content });
    const result = await ouvrirPrDoc(input, { ...options, run: fake.run });
    assert.equal(result.status, "INCONCLUSIVE");
    assert.match(result.reason, /une seule attendue/);
    assert.equal(fake.calls.length, 3);
    await assert.rejects(access(fake.checkout), { code: "ENOENT" });
  }
});

test("un refus de poussée ou de GitHub reste INCONCLUSIVE, sans retry ni succès inventé", async () => {
  for (const stage of ["clone", "push", "gh"]) {
    const fake = stub({ fail: (command, args) => command === stage || args[0] === stage });
    const result = await ouvrirPrDoc(input, { ...options, run: fake.run });
    assert.equal(result.status, "INCONCLUSIVE");
    assert.equal(result.reason, "Refus simulé du service distant");
    assert.equal(result.url, undefined);
    assert.equal(fake.calls.at(-1)[0] === "gh" ? "gh" : fake.calls.at(-1)[1][0], stage);
    if (fake.checkout) await assert.rejects(access(fake.checkout), { code: "ENOENT" });
  }
});

test("vrai git vers un dépôt nu : un seul commit de note, bases et vault vivant inchangés", async () => {
  const folder = await mkdtemp(join(tmpdir(), "horama-pr-doc-test-"));
  const seed = join(folder, "seed");
  const remote = join(folder, "trial.git");
  const git = async (args, cwd = seed) => (await execute("git", args, { cwd, encoding: "utf8" })).stdout.trim();
  try {
    await mkdir(seed);
    await git(["init", "--initial-branch=dev"]);
    await mkdir(dirname(join(seed, notePath)), { recursive: true });
    await writeFile(join(seed, notePath), note);
    await writeFile(join(seed, "autre.md"), "Intact\n");
    await git(["add", "."]);
    await git(["commit", "-m", "Prépare le vault d'essai"]);
    await git(["branch", "main"]);
    await git(["clone", "--bare", seed, remote]);
    const original = await git(["rev-parse", "HEAD"]);
    // J5a has already applied the correction in the live vault; it must stay untouched.
    await writeFile(join(seed, notePath), note.replace(avant, () => apres));
    await writeFile(join(seed, "autre.md"), "Modification locale à préserver\n");
    const beforeStatus = await git(["status", "--porcelain"]);
    const branches = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await ouvrirPrDoc(input, { ...options, remote, run: async (command, args, settings) => {
        if (command !== "gh") return execute(command, args, settings);
        assert.equal(await readFile(args.at(-1), "utf8"), expectedBody);
        assert.deepEqual(args.slice(0, 8), ["pr", "create", "--repo", repository, "--base", "dev", "--head", args[7]]);
        return { stdout: `https://github.com/${repository}/pull/${attempt + 1}\n` };
      } });
      assert.equal(result.status, "opened"); // Only gh is stubbed; no GitHub success is claimed by this test.
      branches.push(result.branch);
      assert.equal(await git(["show", `${result.branch}:${notePath}`], remote), note.replace(avant, () => apres).trim());
      assert.equal(await git(["diff", "--name-only", `dev...${result.branch}`], remote), notePath);
      assert.equal(await git(["rev-list", "--count", `dev..${result.branch}`], remote), "1");
    }
    assert.notEqual(branches[0], branches[1]);
    for (const base of ["main", "dev"]) assert.equal(await git(["rev-parse", base], remote), original);
    assert.equal(await git(["branch", "--show-current"]), "dev");
    assert.equal(await git(["status", "--porcelain"]), beforeStatus);
    assert.equal(await readFile(join(seed, notePath), "utf8"), note.replace(avant, () => apres));
    assert.equal(await readFile(join(seed, "autre.md"), "utf8"), "Modification locale à préserver\n");
    const refs = (await git(["for-each-ref", "--format=%(refname:short)", "refs/heads"], remote)).split("\n");
    assert.deepEqual(refs.sort(), [...branches, "dev", "main"].sort());
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
