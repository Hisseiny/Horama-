import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { afterEach, beforeEach, test } from "node:test";
import { ecrireDecision } from "@horama/memoire";
import { BaseMemoire } from "./src/base.ts";
import { explorer } from "./src/exploration/explorer.ts";
import type { ExplorerDependencies } from "./src/exploration/explorer.ts";
import { lireArguments } from "./src/exploration/cli.ts";
import type { Session } from "./src/session.ts";

const original = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAI0lEQVR4nGP4P8gBw0A7gBAYdSClYNSBlIJRB1IKRh1IKQAAxLY6GzXsph8AAAAASUVORK5CYII=", "base64");
const changed = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAALElEQVR4nGP4P8gBw0A7gBCAO5CBgQErHmgw8C4gAEYdSCkYdSClYNSBlAIA8KcoLbZ8MT8AAAAASUVORK5CYII=", "base64");
function smallPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
    size.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([original.subarray(0, 8), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0, 0, 0, 0, 255]))), chunk("IEND", Buffer.alloc(0))]);
}
let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "horama-explorer-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));

async function run({ png = original, skip = "", refuse = false, failure = false, earlyEnd = false, deps = {} }: { png?: Buffer; skip?: string; refuse?: boolean; failure?: boolean; earlyEnd?: boolean; deps?: Partial<ExplorerDependencies> } = {}) {
  let address = "https://example.org/";
  const base = new BaseMemoire();
  const session: Session = async input => {
    await input.onCreated("session-1");
    const fin = (async () => {
      if (earlyEnd) {
        const last = input.consigne.course.at(-1)!;
        address = last.address;
        const captured = await input.onTool("relever", { ecran: last.ecran, vue: "defaut" });
        assert.match(captured, /1\/2 pages relevées/);
        assert.match(captured, /Ouvre https:\/\/example.org\//);
        const response = await input.onTool("terminer", { etat: "reussi" });
        assert.match(response, /Fin refusée/);
        assert.match(response, /ecran="accueil"/);
      }
      for (const step of input.consigne.course) {
        if (earlyEnd && step === input.consigne.course.at(-1)) continue;
        if (step.ecran === skip) continue;
        address = step.address + (new URL(step.address).pathname !== "/" ? "/" : "");
        if (refuse) address = "https://example.org/wrong";
        await input.onStep({ etape: step.part, horodatage: new Date().toISOString(), action: "Ouvre une page", etat_session: "en_cours" });
        const response = await input.onTool("relever", { ecran: step.ecran, vue: "defaut" });
        assert.match(response, refuse ? /refusé/ : /Capture/);
      }
      await input.onTool("terminer", { etat: failure ? "echec" : "reussi", raison: "Arrêt demandé." });
      return { id: "session-1", muted: false, cout_usd: 0.12, etapes: input.consigne.course.length, replay_url: "https://replay.example/1" };
    })();
    return { id: "session-1", fin };
  };
  const result = await explorer({ url: "https://example.org", max: 15, vault: join(root, "vault"), sortie: join(root, "out"), port: 9333 }, {
    base, session, runtime: { relever: async () => ({ png, texte: "Page", url_page: address, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture enregistrée." }),
      navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    fetch: async input => {
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/faq</loc></url></urlset>" : "<html>Page</html>", { headers: { "Content-Type": path === "/robots.txt" ? "text/plain" : path === "/sitemap.xml" ? "application/xml" : "text/html" } });
    },
    connecter: async () => ({ send: async () => ({ result: { value: 200 } }), on() {}, close() {} }),
    controler: async () => [], holo: async () => ({ status: "SUSPECTED", model: "holo4-27b", durationMs: 3, findings: [] }), log() {}, ...deps,
  });
  return { result, base };
}

test("shape atomique, totaux, un C4 par page et première mémoire sans écraser une note", async () => {
  const product = join(root, "vault/example-org/produit"); mkdirSync(product, { recursive: true });
  const note = "---\necran: faq\nurl: https://example.org/faq\nzones_ignorees: []\n---\n# À conserver\n";
  writeFileSync(join(product, "existing.md"), note);
  const { result, base } = await run();
  assert.equal(result.format, "horama-exploration-1"); assert.equal(result.etat, "fini");
  assert.equal(result.site, "example-org"); assert.equal(result.version, "1"); assert.equal(result.version_reference, null);
  assert.equal(result.trouvees.par, "sitemap");
  assert.deepEqual(result.totaux, { pages_trouvees: 2, pages_visitees: 2, defauts: 0, doutes: 0, sans_conclusion: 0, par_sorte: {} });
  assert.deepEqual(JSON.parse(readFileSync(join(root, "out/exploration.json"), "utf8")), result);
  assert.equal(existsSync(join(root, "out/exploration.json.tmp")), false);
  assert.equal(result.agents.length, 1); assert.equal(result.agents[0].session_id, "session-1");
  assert.equal(result.cout_usd, 0.12); assert.ok(result.duree_s! >= 0);
  assert.match(result.passage_id, /^\d{4}-\d\d-\d\d-\d\dh\d\d-[a-f0-9]{4}$/);
  assert.equal(base.resultats.length, 2);
  for (const page of result.pages) {
    const c4 = base.resultats.find(item => item.test_id === `exploration--${page.ecran}`)!;
    assert.equal(c4.statut, "PASS"); assert.equal(c4.version_testee, "1"); assert.equal(c4.version_reference, "1");
    assert.deepEqual(c4.ecrans, [page.ecran]); assert.deepEqual(c4.valeurs, {}); assert.equal(c4.calcul, "");
    assert.equal(c4.niveau_de_preuve, "aucun"); assert.deepEqual(c4.ecarts_visuels, []); assert.equal(c4.captures.length, 1);
    assert.equal(c4.replay_url, "https://replay.example/1");
    assert.equal(page.http, 200); assert.equal(page.holo?.etat, "fait");
    assert.ok(readFileSync(join(root, `vault/example-org/references/${page.ecran}/defaut--v1.png`)).equals(original));
  }
  assert.equal(readFileSync(join(product, "existing.md"), "utf8"), note);
  assert.equal(existsSync(join(product, "faq.md")), false);
  assert.equal(readFileSync(join(product, "accueil.md"), "utf8"), '---\necran: "accueil"\nurl: "https://example.org/"\nzones_ignorees: []\n---\n');
});

test("une page non visitée reste INCONCLUSIVE en JSON et C4", async () => {
  const { result, base } = await run({ skip: "faq" });
  assert.equal(result.pages[1].etat, "non_visitee"); assert.equal(result.pages[1].statut, "INCONCLUSIVE");
  assert.equal(result.etat, "interrompu");
  assert.equal(result.totaux.pages_visitees, 1); assert.equal(result.totaux.sans_conclusion, 1);
  assert.equal(base.resultats.length, 2); assert.equal(base.resultats[1].statut, "INCONCLUSIVE"); assert.ok(base.resultats[1].raison);
  assert.equal(existsSync(join(root, "vault/example-org/references/faq/defaut--v1.png")), false);
});

test("navigateur sur la dernière page : une fin prématurée est refusée et les relevés reprennent", async () => {
  await run();
  const { result, base } = await run({ earlyEnd: true });
  assert.equal(result.version, "2"); assert.equal(result.etat, "fini");
  assert.equal(result.totaux.pages_visitees, 2); assert.equal(result.totaux.sans_conclusion, 0);
  assert.equal(base.resultats.length, 2);
  assert.equal(result.constats.filter(item => item.source === "comparaison").length, 0);
});

test("relevé refusé : aucun contrôle, constat acquis ou référence", async () => {
  let calls = 0;
  const { result, base } = await run({ refuse: true, deps: { controler: async () => { calls++; return []; } } });
  assert.equal(calls, 0); assert.equal(result.totaux.pages_visitees, 0); assert.equal(base.captures.size, 0);
  assert.ok(result.constats.every(item => item.statut === "INCONCLUSIVE"));
  assert.equal(existsSync(join(root, "vault/example-org/references")), false);
});

test("second passage identique, puis changé et masqué par zones_ignorees", async () => {
  await run();
  const second = await run();
  assert.equal(second.result.version, "2"); assert.equal(second.result.version_reference, "1");
  assert.equal(second.result.constats.filter(item => item.source === "comparaison").length, 0);
  const third = await run({ png: changed });
  const findings = third.result.constats.filter(item => item.source === "comparaison");
  assert.equal(findings.length, 2); assert.ok(findings.every(item => item.statut === "SUSPECTED" && item.zone));
  assert.equal(third.base.resultats[0].ecarts_visuels.length, 1);
  for (const page of third.result.pages) writeFileSync(join(root, `vault/example-org/produit/${page.ecran}.md`), `---\necran: ${page.ecran}\nzones_ignorees: [{ x: 2, y: 2, largeur: 6, hauteur: 1 }]\n---\n`);
  const fourth = await run({ png: changed });
  assert.equal(fourth.result.constats.filter(item => item.source === "comparaison").length, 0);
});

test("comparaison neutralisée par une décision voulu de la version", async () => {
  await run();
  const preview = await run({ png: changed });
  const item = preview.result.constats.find(item => item.source === "comparaison")!;
  ecrireDecision(join(root, "vault"), { id: "voulu", logiciel: "example-org", passage_id: "p", test_id: "exploration--accueil", ecart_id: item.id, decision: "voulu", ecran: item.ecran, vue: "defaut", ecart: "Changement voulu", zone: item.zone, version: "3", portee: "cet ecart, cet ecran, cette version", par: "test", le: new Date().toISOString() });
  const next = await run({ png: changed });
  const neutralized = next.result.constats.find(candidate => candidate.source === "comparaison" && candidate.ecran === item.ecran && candidate.decision_id);
  assert.equal(neutralized?.statut, "PASS"); assert.equal(neutralized?.decision_id, "voulu");
});

test("contrôle prouvé explique Holo, hors capture et sans zone comptés honnêtement", async () => {
  const { result, base } = await run({ deps: {
    connecter: async () => ({ send: async method => method === "Page.captureScreenshot" ? { data: original.toString("base64") } : { result: { value: 200 } }, on() {}, close() {} }),
    controler: async () => [{ statut: "VERIFIED_FAIL", sorte: "debordement", message: "Le texte dépasse.", selecteur: "button", valeur: "200 > 100", zone: { x: 10, y: 10, largeur: 100, hauteur: 30 } },
      { statut: "VERIFIED_FAIL", sorte: "texte_erreur", message: "Un texte d'erreur est affiché.", valeur: "undefined", zone: { x: 20, y: 1200, largeur: 80, hauteur: 20 } }],
    holo: async () => ({ status: "SUSPECTED", model: "holo4-27b", durationMs: 2, findings: [
      { status: "SUSPECTED", kind: "cut-off-text", sentence: "Clipped.", zone: { x: 10, y: 10, width: 100, height: 30 } },
      { status: "INCONCLUSIVE", kind: "cut-off-text", sentence: "No box.", zone: null, message: "Invalid" },
    ] }),
  } });
  assert.equal(result.totaux.defauts, 4); assert.equal(result.totaux.doutes, 0);
  const visual = result.constats.find(item => item.source === "holo")!;
  assert.equal(visual.statut, "SUSPECTED"); assert.equal(visual.explique_par, "accueil--controle--1");
  assert.deepEqual(visual.preuve, { modele: "holo4-27b", phrase: "Clipped." });
  assert.equal(result.pages[0].holo?.ecartes_sans_zone, 1);
  const outside = result.constats.find(item => item.id === "accueil--controle--2")!;
  assert.equal(outside.capture, "captures/accueil--controle--2.png"); assert.equal(outside.zone?.y, 0);
  assert.ok(existsSync(join(root, "out", outside.capture)));
  const c4 = base.resultats[0]; assert.equal(c4.statut, "VERIFIED_FAIL"); assert.equal(c4.niveau_de_preuve, "releve");
  assert.deepEqual(c4.valeurs, { "accueil.debordement 1": "200 > 100", "accueil.texte-erreur 2": "undefined" });
  assert.equal(c4.calcul, "Le texte dépasse. ; Un texte d'erreur est affiché."); assert.deepEqual(c4.ecarts_visuels, []);
});

test("contrôle en échec, Holo hors délai et session interrompue", async () => {
  const { result, base } = await run({ failure: true, deps: { controler: async () => { throw new Error("CDP"); },
    holo: async () => ({ status: "INCONCLUSIVE", model: "holo4-35b-a3b", durationMs: 16000, findings: [], message: "Both Holo models timed out" }) } });
  assert.equal(result.etat, "interrompu"); assert.equal(result.agents[0].etat, "tombe");
  assert.equal(result.pages[0].holo?.etat, "hors_delai"); assert.equal(result.totaux.sans_conclusion, 4);
  assert.ok(base.resultats.every(item => item.statut === "INCONCLUSIVE" && item.raison));
});

test("découverte vide ne crée aucune session", async () => {
  const { result, base } = await run({ deps: { fetch: async () => new Response("User-agent: *\nDisallow: /"), session: async () => { throw new Error("Ne doit pas démarrer"); } } });
  assert.equal(result.etat, "fini"); assert.equal(result.pages.length, 0); assert.equal(base.resultats.length, 0);
});

test("échec de création de session : JSON interrompu et C4 non concluants", async () => {
  const { result, base } = await run({ deps: { session: async () => { throw new Error("Session indisponible"); } } });
  assert.equal(result.etat, "interrompu"); assert.equal(result.totaux.pages_visitees, 0);
  assert.equal(base.resultats.length, 2); assert.ok(base.resultats.every(item => item.statut === "INCONCLUSIVE"));
  assert.ok(result.pages.every(page => page.etat === "non_visitee"));
});

test("Holo en échec reste non concluant et sa raison arrive au C4", async () => {
  const { result, base } = await run({ deps: { holo: async () => { throw new Error("Réseau"); } } });
  assert.equal(result.pages[0].holo?.etat, "echec");
  assert.equal(result.pages[0].statut, "INCONCLUSIVE");
  assert.equal(base.resultats[0].raison, "Le regard visuel n'a pas pu se faire.");
});

test("des tailles de référence différentes donnent un constat non conclu", async () => {
  await run();
  const onePixel = smallPng();
  const { result, base } = await run({ png: onePixel });
  const item = result.constats.find(item => item.source === "comparaison")!;
  assert.equal(item.statut, "INCONCLUSIVE"); assert.equal(item.sorte, "non-conclu");
  assert.match(item.raison!, /tailles différentes/); assert.equal(base.resultats[0].statut, "INCONCLUSIVE");
});

test("identifiants normalisés, dédoublonnés et tronqués", async () => {
  const paths = ["/école/", "/ecole/", "/" + "a".repeat(90)];
  const { result } = await run({ deps: { fetch: async input => {
    const path = new URL(String(input)).pathname;
    return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? `<urlset>${paths.map(path => `<url><loc>https://example.org${path}</loc></url>`).join("")}</urlset>` : "<html>Page</html>", { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
  } } });
  assert.deepEqual(result.pages.map(page => page.ecran), ["accueil", "ecole", "ecole-2", "a".repeat(60)]);
});

test("arguments, aide, valeurs par défaut et erreurs", () => {
  assert.equal(lireArguments(["--", "--help"]), null);
  const options = lireArguments(["--url", "https://example.org", "--sans-base"])!;
  assert.equal(options.max, 15); assert.equal(options.port, 9333); assert.equal(options.sansBase, true);
  assert.match(options.sortie, /\.orchestrateur\/exploration$/); assert.match(options.vault, /vault-horama$/);
  for (const args of [[], ["--url", "file:///x"], ["--url", "https://u:p@example.org"], ["--url", "https://example.org", "--max", "-1"], ["--url", "https://example.org", "--chrome-port", "0"], ["--url", "https://example.org", "--url", "https://example.org"], ["--url"]]) assert.throws(() => lireArguments(args));
});
