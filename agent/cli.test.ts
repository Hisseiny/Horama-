import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { RapportPassage } from "@horama/contrats";
import { BaseMemoire } from "./src/base.ts";
import type { BrowserRuntime } from "./src/browser.ts";
import { HELP, lancerCommande, lireArguments } from "./src/cli.ts";

const args = ["--logiciel", "facturo", "--version", "13", "--reference", "12"];
const report: RapportPassage = { passage: { id: "p1", logiciel: "facturo", version_testee: "13", version_reference: "12", etat: "joue", debut: "2026-11-17T12:00:00Z" }, tests: [] };

test("arguments du banc, listes, valeurs par défaut et aide sans dépendances", () => {
  assert.equal(lireArguments(["--", "--help"]), null);
  assert.match(HELP, /SUPABASE_URL/);
  const options = lireArguments(["--", ...args, "--tests", "a,b,a", "--r", "ca-mois", "--base-url", "http://localhost:3100", "--chrome-port", "9334"])!;
  assert.equal(options.cle, "dev");
  assert.equal(options.port, 9334);
  assert.deepEqual(options.tests, ["a", "b"]);
  assert.deepEqual(options.regressions, ["ca-mois"]);
  assert.match(options.vault, /vault-horama\/?$/);
  assert.equal(lireArguments(args)!.tests, undefined);
  for (const invalid of [[], [...args, "--tests", "a,"], [...args, "--tests", ""], [...args, "--cle", "inconnue"], [...args, "--r"], [...args, "--logiciel", "autre"], [...args, "--inconnu", "x"], [...args, "--chrome-port", "NaN"], [...args, "--base-url", "file:///etc/passwd"], ["--logiciel", "../autre", "--version", "13", "--reference", "12"]]) {
    assert.throws(() => lireArguments(invalid));
  }
});

for (const cle of ["dev", "demo"] as const) {
  test(`câblage du coureur et sélection explicite de la clé ${cle}`, async () => {
    const options = lireArguments([...args, "--cle", cle, "--tests", "a,b", "--r", "ca-mois"])!;
    const base = new BaseMemoire();
    const output: string[] = [];
    let closed = false;
    let waited = false;
    let selected = "";
    const capture = { png: new Uint8Array(), texte: "Texte", url_page: "http://localhost", largeur: 1280, hauteur: 900, defilement: [0, 0] as [number, number], phrase: "Continue." };
    const runtime: BrowserRuntime = { relever: async () => capture, navigateur: async () => ({ channel: "c", stop() {} }), close() { closed = true; } };
    const result = await lancerCommande(options, { base, runtime, env: { HAI_API_KEY: "dev-factice", HAI_API_KEY_DEMO: "demo-factice", FAUX_SAAS_URL: "http://localhost:3100" }, output: (line) => output.push(line),
      createSession(settings) { selected = settings!.key!; return async () => { throw new Error("Non appelée dans ce test de câblage."); }; },
      createRunner(settings) {
        assert.equal(settings.base, base);
        assert.equal(settings.baseUrl, "http://localhost:3100");
        assert.equal(settings.vault, options.vault);
        assert.match(settings.identifiant!(), /^\d{4}-\d{2}-\d{2}-\d{2}h\d{2}-[a-f0-9]{4}$/);
        return { async lancerPassage(input) {
          assert.deepEqual(input, { logiciel: "facturo", version_testee: "13", version_reference: "12", tests: ["a", "b"], regressions: ["ca-mois"], cle });
          assert.equal(await settings.relever("ecran", "defaut"), capture);
          return { passage_id: "p1" };
        }, async attendreFin(id) { assert.equal(id, "p1"); assert.deepEqual(output, ["p1"]); waited = true; return report; } };
      },
    });
    assert.equal(result, report);
    assert.equal(selected, `${cle}-factice`);
    assert.equal(waited, true);
    assert.equal(closed, true);
  });
}

test("les tests omis sont lus dans le vault et une erreur de passage ferme le navigateur", async () => {
  let closed = false;
  const options = lireArguments(args)!;
  await assert.rejects(lancerCommande(options, { base: new BaseMemoire(), session: async () => { throw new Error("Non appelée."); },
    runtime: { relever: async () => { throw new Error(); }, navigateur: async () => { throw new Error(); }, close() { closed = true; } },
    createRunner: () => ({ async lancerPassage(input) { assert.equal(input.tests.length, 3); throw new Error("Base indisponible."); }, async attendreFin() { throw new Error(); } }),
  }), /Base indisponible/);
  assert.equal(closed, true);
  await assert.rejects(lancerCommande(options, { env: {} }), /Clé H absente/);
  await assert.rejects(lancerCommande(options, { env: { HAI_API_KEY: "factice" } }), /SUPABASE_URL/);
});

test("le passage v12 rejoue les tests compatibles, dédoublonne les relevés et ne promeut aucune référence", async () => {
  const options = lireArguments(["--logiciel", "facturo", "--version", "12", "--reference", "12"])!;
  const temporary = mkdtempSync(join(tmpdir(), "horama-reference-"));
  cpSync(join(options.vault, "facturo"), join(temporary, "facturo"), { recursive: true });
  options.vault = temporary;
  const base = new BaseMemoire();
  let address = "";
  let shots = 0;
  try {
    const result = await lancerCommande(options, { base, output: () => {},
      runtime: { navigateur: async () => { throw new Error("Pas de H dans cet essai."); }, close() {},
        async relever() { shots++; return { png: new Uint8Array([137, 80, 78, 71]), texte: "Facturo v12", url_page: `http://localhost:3100${address}`, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Continue." }; } },
      env: { FAUX_SAAS_URL: "http://localhost:3100" },
      session: async ({ consigne, onCreated, onTool }) => {
        await onCreated("reference-injectee");
        assert.match(consigne.start, /\/v12\/entrer\?suite=\/v12\/tableau-de-bord/);
        assert.deepEqual(consigne.dropped.map(({ id }) => id), ["liste-factures-filtre-echeance"]);
        assert.equal(consigne.tests.length, 2);
        return { id: "reference-injectee", fin: Promise.resolve().then(async () => {
          for (const step of consigne.course) {
            assert.ok(step.address.startsWith("/v12/"));
            assert.equal(step.vue, "defaut");
            address = step.address;
            await onTool("relever", { ...step });
            await onTool("relever", { ...step });
          }
          await onTool("terminer", { etat: "reussi" });
          return { id: "reference-injectee", muted: false, cout_usd: null, etapes: 3 };
        }) };
      },
    });
    assert.equal(result.passage.etat, "joue");
    assert.equal(result.passage.version_testee, "12");
    assert.equal(result.tests.length, 2);
    assert.equal(shots, 3);
    assert.equal(base.captures.size, 3);
    assert.ok([...base.captures.values()].every(({ version, largeur, hauteur }) => version === "12" && largeur === 1280 && hauteur === 900));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
