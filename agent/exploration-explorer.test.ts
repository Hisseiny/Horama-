import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { afterEach, beforeEach, test } from "node:test";
import { ecrireDecision } from "@horama/memoire";
import { BaseMemoire } from "./src/base.ts";
import { construireExploration, exclusionLabel, explorer, explorationPassageId, explorationStepBudget, explorationTimeBudget } from "./src/exploration/explorer.ts";
import type { ExplorerDependencies } from "./src/exploration/explorer.ts";
import { lireArguments } from "./src/exploration/cli.ts";
import { libelleAction } from "./src/session.ts";
import type { Session } from "./src/session.ts";

const original = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAI0lEQVR4nGP4P8gBw0A7gBAYdSClYNSBlIJRB1IKRh1IKQAAxLY6GzXsph8AAAAASUVORK5CYII=", "base64");
const noise = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAALElEQVR4nGP4P8gBw0A7gBCAO5CBgQErHmgw8C4gAEYdSCkYdSClYNSBlAIA8KcoLbZ8MT8AAAAASUVORK5CYII=", "base64");
const changed = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAIklEQVR42mP4P8gBw5BxIAMDA1Y86sBRB45mklEHDnMHAgAgmfJUP+N1BQAAAABJRU5ErkJggg==", "base64");
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

async function run({ png = original, skip = "", refuse = false, failure = false, lateError = false, earlyEnd = false, query = "", actual, retries = 1, defilement = [0, 0], deps = {}, site }: { site?: string; actual?: (url: string) => string; retries?: number; defilement?: [number, number]; png?: Buffer; skip?: string; refuse?: boolean; failure?: boolean; lateError?: boolean; earlyEnd?: boolean; query?: string; deps?: Partial<ExplorerDependencies> } = {}) {
  let address = "https://example.org/";
  const base = new BaseMemoire();
  const responses: string[] = [];
  const session: Session = async input => {
    await input.onCreated("session-1");
    const fin = (async () => {
      if (earlyEnd) {
        const last = input.consigne.course.at(-1)!;
        address = last.address;
        const captured = await input.onTool("relever", { ecran: last.ecran, vue: "defaut" });
        assert.match(captured, /1\/2 pages relevées/);
        assert.match(captured, /go_to/);
        const response = await input.onTool("terminer", { etat: "reussi" });
        assert.match(response, /Fin refusée/);
        assert.match(response, /ecran="accueil"/);
      }
      for (const step of input.consigne.course) {
        if (earlyEnd && step === input.consigne.course.at(-1)) continue;
        if (step.ecran === skip) continue;
        address = step.address + (new URL(step.address).pathname !== "/" ? "/" : "");
        address += query;
        if (actual) address = actual(address);
        if (refuse) address = "https://example.org/wrong";
        await input.onStep({ etape: step.part, horodatage: new Date().toISOString(), action: libelleAction(["go_to_web"]), etat_session: "en_cours" });
        for (let attempt = 0; attempt < retries; attempt++) {
          const response = await input.onTool("relever", { ecran: step.ecran, vue: "defaut" });
          responses.push(response);
          if (!actual) assert.match(response, refuse ? /refusé/ : /Capture/);
        }
      }
      responses.push(await input.onTool("terminer", { etat: failure ? "echec" : "reussi", raison: "Arrêt demandé." }));
      return { id: "session-1", muted: false, cout_usd: 0.12, etapes: input.consigne.course.length, replay_url: "https://replay.example/1", ...(lateError ? { erreur: "La session H est interrompue (erreur réseau ou outil)." } : {}) };
    })();
    return { id: "session-1", fin };
  };
  const result = await explorer({ url: "https://example.org", max: 15, vault: join(root, "vault"), sortie: join(root, "out"), port: 9333, site }, {
    base, session, urlCourante: async () => null, runtime: { relever: async () => ({ png, texte: "Page", url_page: address, largeur: 1280, hauteur: 900, defilement, phrase: "Capture enregistrée." }),
      navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    fetch: async input => {
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/faq</loc></url></urlset>" : "<html>Page</html>", { headers: { "Content-Type": path === "/robots.txt" ? "text/plain" : path === "/sitemap.xml" ? "application/xml" : "text/html" } });
    },
    connecter: async () => ({ send: async () => ({ result: { value: 200 } }), on() {}, close() {} }),
    controler: async () => [], holo: async () => ({ status: "SUSPECTED", model: "holo4-27b", durationMs: 3, usage: null, cost_usd: null, findings: [] }), log() {}, ...deps,
  });
  return { result, base, responses };
}

for (const context of ["plusieurs", "vide", "indisponible"]) {
  test(`exception de relevé journalisée et page écartée : CDP ${context}`, async () => {
    const messages: string[] = [];
    const { responses } = await run({ actual: address => address, deps: {
      log: message => messages.push(message),
      onglets: async () => {
        if (context === "indisponible") throw new Error("CDP déconnecté");
        return context === "vide" ? [] : [
          { type: "page", url: "https://example.org/faq/" },
          { type: "page", url: "https://example.org/" },
          { type: "service_worker", url: "https://example.org/worker.js" },
        ];
      },
      runtime: {
        relever: async () => { throw new Error("Capture CDP originale"); },
        navigateur: async () => ({ channel: "fake", stop() {} }), close() {},
      },
    } });
    assert.ok(responses.some(response => response.startsWith("Capture CDP originale\nContinue les autres relevés.")));
    const diagnostic = messages.find(message => message.startsWith("Relevé accueil :"))!;
    assert.match(diagnostic, /Error: Capture CDP originale/);
    assert.match(diagnostic, /exploration-explorer.test.ts/);
    if (context === "plusieurs") {
      assert.match(diagnostic, /2 onglet\(s\) page CDP/);
      assert.match(diagnostic, /https:\/\/example.org\/faq\//);
      assert.doesNotMatch(diagnostic, /worker.js/);
    } else if (context === "vide") {
      assert.match(diagnostic, /0 onglet\(s\) page CDP ; URL : \[\]/);
    } else {
      assert.match(diagnostic, /URL et nombre d'onglets page CDP indisponibles/);
    }
  });
}

test("exception de relevé : raison réelle immédiate, aucun retour vers la page et les autres continuent", async () => {
  let attempts = 0;
  const { result, responses } = await run({ actual: address => address, retries: 2, deps: {
    runtime: {
      relever: async ecran => {
        if (ecran === "accueil") { attempts++; throw new Error("Capture hors délai : canal fermé"); }
        return { png: original, texte: "FAQ", url_page: "https://example.org/faq", largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" };
      },
      navigateur: async () => ({ channel: "fake", stop() {} }), close() {},
    },
    onglets: async () => [],
  } });
  assert.equal(attempts, 1);
  assert.equal(result.pages[0].etat, "non_visitee");
  assert.equal(result.pages[0].raison, "Capture hors délai : canal fermé");
  assert.equal(result.pages[1].etat, "visitee");
  assert.ok(responses.slice(0, 2).every(response => response.startsWith("Capture hors délai : canal fermé")));
  assert.ok(responses.every(response => !response.includes('relever(ecran="accueil"')));
  assert.ok(responses.every(response => !response.includes("Réessaie")));
});

test("sitemap valide citant des fournisseurs : aucune protection inventée", async () => {
  const { result } = await run({ deps: {
    fetch: async address => {
      const path = new URL(String(address)).pathname;
      return new Response(path === "/robots.txt" ? "User-agent: *\n# imperva incapsula" : path === "/sitemap.xml"
        ? '<urlset><url><loc>https://example.org/partners/imperva</loc></url><url><loc>https://example.org/partners/incapsula</loc></url></urlset>' : "<html>Nos partenaires Imperva et Incapsula</html>",
      { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : path.endsWith(".txt") ? "text/plain" : "text/html" } });
    },
  } });
  assert.equal(result.etat, "fini");
  assert.equal(result.pages.length, 3);
  assert.ok(result.pages.every(page => page.etat === "visitee"));
  assert.equal(result.agents[0].raison, null);
});

test("repli JavaScript fusionné : les liens rendus restent explorés", async () => {
  const rendered: string[] = [];
  const { result } = await run({ deps: {
    render: async address => { rendered.push(address); return { url: address, body: '<html><a href="/about">About</a></html>' }; },
  } });
  assert.equal(result.etat, "fini");
  assert.ok(rendered.includes("https://example.org/"));
  assert.equal(result.pages.find(page => page.ecran === "about")?.etat, "visitee");
});

test("challenge rendu : une fermeture H non confirmée ne devient jamais une fin propre", async () => {
  for (const failClose of [false, true]) {
    let launches = 0;
    const { result } = await run({ deps: {
      onglets: async () => [],
      connecter: async () => ({ on() {}, close() {}, send: async () => ({ result: { value: { html: '<title>Verify you are human</title>', status: 403 } } }) }),
      session: async input => {
        launches++;
        await input.onCreated("challenge");
        return { id: "challenge", confirmStopped: async () => { if (failClose) throw new Error("Session toujours active"); }, fin: (async () => {
          await input.onTool("relever", { ecran: input.consigne.course[0].ecran, vue: "defaut" });
          return { id: "challenge", muted: false, cout_usd: 0, etapes: 1 };
        })() };
      },
    } });
    assert.equal(launches, 1);
    assert.equal(result.etat, failClose ? "interrompu" : "fini");
    assert.equal(result.agents[0].etat, failClose ? "tombe" : "fini");
    assert.match(result.agents[0].raison!, failClose ? /fermeture.*confirmée/ : /robots/);
    assert.ok(result.pages.every(page => page.etat === "non_visitee" && /robots/.test(page.raison!)));
  }
});

for (const rendered of [false, true]) {
  test(`sous-page indisponible en ${rendered ? "Chrome" : "découverte"} : portée limitée et poursuite des autres pages`, async () => {
    for (const item of [
      { status: 404, html: "Missing", reason: /introuvable/ },
      { status: 410, html: "Gone", reason: /introuvable/ },
      { status: 401, html: "Unauthorized", reason: /Connexion demandée/ },
      { status: 200, html: '<title>Connexion</title><input type="password">', reason: /Connexion demandée/ },
      { status: 403, html: "Forbidden", reason: /robots/ },
      { status: 200, html: '<title>Verify you are human</title><div class="h-captcha"></div>', reason: /robots/ },
    ]) {
      let current = "https://example.org/";
      const responses: string[] = [];
      const { result } = await run({ actual: address => address, deps: {
        onglets: async () => [],
        urlCourante: async () => current,
        fetch: async address => {
          const path = new URL(String(address)).pathname;
          if (path === "/robots.txt") return new Response("");
          if (path === "/sitemap.xml") return new Response('<urlset><url><loc>https://example.org/missing</loc></url><url><loc>https://example.org/healthy</loc></url></urlset>');
          return new Response(!rendered && path === "/missing" ? item.html : "<title>Accueil</title>Bienvenue", { status: !rendered && path === "/missing" ? item.status : 200, headers: { "Content-Type": "text/html" } });
        },
        session: async input => {
          await input.onCreated("scope");
          return { id: "scope", fin: (async () => {
            for (const step of input.consigne.course) {
              current = step.address;
              responses.push(await input.onTool("relever", { ecran: step.ecran, vue: "defaut" }));
            }
            await input.onTool("terminer", { etat: "reussi" });
            return { id: "scope", muted: false, cout_usd: 0, etapes: 3 };
          })() };
        },
        runtime: {
          relever: async () => ({ png: original, texte: "Page", url_page: current, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }),
          navigateur: async () => ({ channel: "fake", stop() {} }), close() {},
        },
        connecter: async () => ({ on() {}, close() {}, send: async (_method, params) => ({ result: { value: String((params as Record<string, unknown>)?.expression).includes("outerHTML")
          ? { html: current.endsWith("/missing") ? item.html : "<title>Accueil</title>Bienvenue", status: current.endsWith("/missing") ? item.status : 200 } : 200 } }) }),
      } });
      const global = rendered && item.reason.source === "robots";
      assert.equal(result.pages.find(page => page.ecran === "accueil")?.etat, "visitee");
      assert.equal(result.pages.find(page => page.ecran === "healthy")?.etat, global ? "non_visitee" : "visitee");
      if (rendered) {
        const missing = result.pages.find(page => page.ecran === "missing")!;
        assert.equal(missing.etat, "non_visitee");
        assert.match(missing.raison!, item.reason);
      } else {
        assert.equal(result.etat, "fini");
        assert.ok(!result.pages.some(page => page.ecran === "missing"));
        assert.ok(!result.agents.some(agent => /robots|introuvable|Connexion demandée/.test(agent.raison ?? "")));
      }
      assert.ok(responses.slice(1).every(response => !response.includes('relever(ecran="missing"')));
    }
  });
}

test("préparation attendue avant capture et contrôles dans explorer", async () => {
  const events: string[] = [];
  await run({ deps: {
    connecter: async () => ({ on() {}, close() {}, async send(_method, params) {
      if (String((params as Record<string, unknown> | undefined)?.expression).includes("responseStatus")) return { result: { value: 200 } };
      events.push("préparation");
      await Promise.resolve();
      events.push("prêt");
      return { result: { value: false } };
    } }),
    runtime: {
      relever: async ecran => {
        assert.equal(events.at(-1), "prêt");
        events.push("capture");
        return { png: original, texte: "Page", url_page: ecran === "accueil" ? "https://example.org/" : "https://example.org/faq", largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" };
      },
      navigateur: async () => ({ channel: "fake", stop() {} }), close() {},
    },
    controler: async () => {
      assert.equal(events.at(-1), "capture");
      events.push("contrôles");
      return [];
    },
  } });
  assert.deepEqual(events, ["préparation", "prêt", "capture", "contrôles", "préparation", "prêt", "capture", "contrôles"]);
});

test("paramètre de suivi ajouté : capture préparée et persistée normalement", async () => {
  const { result, base } = await run({ query: "?utm_source=internal" });
  assert.equal(result.etat, "fini");
  assert.equal(result.totaux.pages_visitees, 2);
  assert.equal(result.totaux.sans_conclusion, 0);
  assert.equal(base.resultats.length, 2);
  assert.ok(result.pages.every(page => page.etat === "visitee" && page.capture && page.holo?.etat === "fait"));
});

test("shape atomique, totaux, un C4 par page et première mémoire sans écraser une note", async () => {
  const product = join(root, "vault/example-org/produit"); mkdirSync(product, { recursive: true });
  const note = "---\necran: faq\nurl: https://example.org/faq\nzones_ignorees: []\n---\n# À conserver\n";
  writeFileSync(join(product, "existing.md"), note);
  const { result, base } = await run();
  assert.equal(result.format, "horama-exploration-1"); assert.equal(result.etat, "fini");
  assert.equal(result.site, "example-org"); assert.equal(result.version, "1"); assert.equal(result.version_reference, null);
  assert.equal(result.trouvees.par, "sitemap");
  assert.deepEqual(result.totaux, { pages_trouvees: 2, pages_visitees: 2, defauts: 0, doutes: 0, sans_conclusion: 0, par_sorte: {} });
  const { navigation, ...report } = result;
  assert.ok(navigation);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "out/exploration.json"), "utf8")), report);
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
  const thin = await run({ png: noise });
  assert.equal(thin.result.constats.filter(item => item.source === "comparaison").length, 0, "une bande de 1 px est du bruit de rendu");
  const third = await run({ png: changed });
  const findings = third.result.constats.filter(item => item.source === "comparaison");
  assert.equal(findings.length, 2); assert.ok(findings.every(item => item.statut === "SUSPECTED" && item.zone));
  assert.equal(third.base.resultats[0].ecarts_visuels.length, 1);
  for (const page of third.result.pages) writeFileSync(join(root, `vault/example-org/produit/${page.ecran}.md`), `---\necran: ${page.ecran}\nzones_ignorees: [{ x: 2, y: 2, largeur: 6, hauteur: 4 }]\n---\n`);
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
    connecter: async () => ({ send: async (method, params) => method === "Page.captureScreenshot" ? { data: original.toString("base64") } : { result: { value: (params as Record<string, unknown> | undefined)?.expression === "[window.scrollX, window.scrollY]" ? [0, 900] : 200 } }, on() {}, close() {} }),
    controler: async () => [{ statut: "VERIFIED_FAIL", sorte: "debordement", message: "Le texte dépasse.", selecteur: "button", valeur: "200 > 100", zone: { x: 10, y: 10, largeur: 100, hauteur: 30 } },
      { statut: "VERIFIED_FAIL", sorte: "texte_erreur", message: "Un texte d'erreur est affiché.", valeur: "undefined", zone: { x: 20, y: 1200, largeur: 80, hauteur: 20 } }],
    holo: async () => ({ status: "SUSPECTED", model: "holo4-27b", durationMs: 2, usage: null, cost_usd: null, findings: [
      { status: "SUSPECTED", kind: "cut-off-text", sentence: "Clipped.", zone: { x: 10, y: 10, largeur: 100, hauteur: 30 } },
      { status: "INCONCLUSIVE", kind: "cut-off-text", sentence: "No box.", zone: null, message: "Invalid" },
    ] }),
  } });
  assert.equal(result.totaux.defauts, 4); assert.equal(result.totaux.doutes, 0);
  const visual = result.constats.find(item => item.source === "holo")!;
  assert.equal(visual.statut, "SUSPECTED"); assert.equal(visual.explique_par, "accueil--controle--1");
  assert.deepEqual(visual.preuve, { modele: "holo4-27b", phrase: "Clipped." });
  assert.equal(result.pages[0].holo?.ecartes_sans_zone, 1);
  const outside = result.constats.find(item => item.id === "accueil--controle--2")!;
  assert.equal(outside.capture, "captures/accueil--controle--2.png"); assert.equal(outside.zone?.y, 300);
  assert.ok(existsSync(join(root, "out", outside.capture)));
  const c4 = base.resultats[0]; assert.equal(c4.statut, "VERIFIED_FAIL"); assert.equal(c4.niveau_de_preuve, "releve");
  assert.deepEqual(c4.valeurs, { "accueil.debordement 1": "200 > 100", "accueil.texte-erreur 2": "undefined" });
  assert.equal(c4.calcul, "Le texte dépasse. ; Un texte d'erreur est affiché."); assert.deepEqual(c4.ecarts_visuels, []);
});

test("lien au clic non vérifié reste un doute et un même doute Holo répété sur chaque page compte une fois", async () => {
  const options: unknown[] = [];
  const { result, base } = await run({ deps: {
    controler: async (_client, option) => { options.push(option); return [{ statut: "SUSPECTED", sorte: "lien_casse", message: "Le lien interne renvoie HTTP 404.", selecteur: "a", valeur: "https://example.org/popin : 404",
      zone: { x: 10, y: 10, largeur: 100, hauteur: 30 }, raison: "Un script prend en charge le clic : un visiteur qui clique n'est pas envoyé vers cette adresse." }]; },
    holo: async () => ({ status: "SUSPECTED", model: "holo4-27b", durationMs: 2, usage: null, cost_usd: null, findings: [
      { status: "SUSPECTED", kind: "cut-off-text", sentence: "Logo.", zone: { x: 500, y: 400, largeur: 60, hauteur: 30 } }] }),
  } });
  assert.ok(options.every(option => typeof (option as { verifierClic?: unknown }).verifierClic === "function"));
  const links = result.constats.filter(item => item.sorte === "lien-casse");
  assert.equal(links.length, 2);
  assert.ok(links.every(item => item.statut === "SUSPECTED" && /script/.test(item.raison ?? "")));
  const visuals = result.constats.filter(item => item.source === "holo");
  assert.equal(visuals.length, 2);
  assert.equal(visuals.filter(item => !item.explique_par).length, 1);
  assert.equal(visuals.find(item => item.explique_par)?.explique_par, visuals.find(item => !item.explique_par)?.id);
  assert.equal(result.totaux.defauts, 0); assert.equal(result.totaux.doutes, 3);
  assert.ok(base.resultats.every(c4 => c4.statut === "SUSPECTED" && c4.niveau_de_preuve === "aucun"));
  assert.ok(base.resultats.every(c4 => c4.ecarts_visuels.some(ecart => ecart.description.startsWith("Le lien interne"))));
  const holoOnly = await run({ deps: { controler: async () => [], holo: async () => ({ status: "SUSPECTED", model: "holo4-27b", durationMs: 2, usage: null, cost_usd: null, findings: [
    { status: "SUSPECTED", kind: "cut-off-text", sentence: "Logo.", zone: { x: 500, y: 400, largeur: 60, hauteur: 30 } }] }) } });
  assert.ok(holoOnly.result.pages.every(page => page.statut === "SUSPECTED"), "un doute rattaché à une autre page n'est pas une réussite");
});

test("contrôle en échec, Holo hors délai et session interrompue", async () => {
  const { result, base } = await run({ failure: true, deps: { controler: async () => { throw new Error("CDP"); },
    holo: async () => ({ status: "INCONCLUSIVE", model: "holo4-35b-a3b", durationMs: 16000, usage: null, cost_usd: null, findings: [], message: "Both Holo models timed out" }) } });
  assert.equal(result.etat, "interrompu"); assert.equal(result.agents[0].etat, "tombe");
  assert.equal(result.pages[0].holo?.etat, "hors_delai"); assert.equal(result.totaux.sans_conclusion, 4);
  assert.ok(base.resultats.every(item => item.statut === "INCONCLUSIVE" && item.raison));
});

test("erreur H après le dernier relevé : toutes les pages visitées, passage fini", async () => {
  const { result } = await run({ lateError: true });
  assert.equal(result.etat, "fini");
  assert.ok(result.pages.every(page => page.etat === "visitee"));
  assert.equal(result.agents[0].etat, "tombe");
  assert.match(result.agents[0].raison!, /interrompue/);
});

test("budget de temps H proportionnel aux étapes et borné", () => {
  assert.equal(explorationTimeBudget(10), 240);
  assert.equal(explorationTimeBudget(57), 456);
  assert.equal(explorationTimeBudget(200), 600);
});

test("découverte vide ne crée aucune session", async () => {
  const { result, base } = await run({ deps: { fetch: async () => new Response("User-agent: *\nDisallow: /"), session: async () => { throw new Error("Ne doit pas démarrer"); } } });
  assert.equal(result.etat, "fini"); assert.equal(result.pages.length, 0); assert.equal(base.resultats.length, 0);
});

test("découverte en échec : rapport interrompu avec raison sans démarrer H", async () => {
  const logs: string[] = [];
  const { result, base } = await run({ deps: {
    fetch: async () => new Response("Indisponible", { status: 503 }),
    session: async () => { throw new Error("Ne doit pas démarrer"); },
    log: message => logs.push(message),
  } });
  assert.equal(result.format, "horama-exploration-1");
  assert.equal(result.etat, "interrompu");
  assert.equal(result.agents[0].etat, "tombe");
  assert.equal(result.agents[0].session_id, null);
  assert.match(result.agents[0].raison!, /robots\.txt : HTTP 503/);
  assert.ok(logs.some(message => /Découverte impossible.*HTTP 503/.test(message)));
  assert.equal(result.pages.length, 0); assert.equal(base.resultats.length, 0);
  const { navigation, ...report } = result;
  assert.ok(navigation);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "out/exploration.json"), "utf8")), report);
});

test("échec de création de session : JSON interrompu et C4 non concluants", async () => {
  const { result, base } = await run({ deps: { session: async () => { throw new Error("Session indisponible"); } } });
  assert.equal(result.etat, "interrompu"); assert.equal(result.totaux.pages_visitees, 0);
  assert.equal(base.resultats.length, 2); assert.ok(base.resultats.every(item => item.statut === "INCONCLUSIVE"));
  assert.ok(result.pages.every(page => page.etat === "non_visitee" && page.raison));
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
  assert.equal(result.totaux.pages_visitees, 4);
  assert.equal(result.etat, "fini");
  assert.ok(result.pages.every(page => page.etat === "visitee" && page.capture));
});

test("site explicite : remplace l’hôte dans le résultat et le vault, défaut inchangé", async () => {
  const options = lireArguments(["--url", "https://example.org", "--site", "eugenia-clone"])!;
  const { result } = await run({ site: options.site });
  assert.equal(result.site, "eugenia-clone");
  assert.ok(existsSync(join(root, "vault/eugenia-clone/references/accueil/defaut--v1.png")));
  assert.equal(existsSync(join(root, "vault/example-org")), false);
  assert.equal(lireArguments(["--url", "https://example.org"])!.site, undefined);
  assert.equal((await run()).result.site, "example-org");
  for (const site of ["", "..", "../outside", "/outside"]) {
    assert.throws(() => lireArguments(["--url", "https://example.org", "--site", site]));
    await assert.rejects(run({ site }), /Site invalide/);
  }
});

test("arguments, aide, valeurs par défaut et erreurs", () => {
  assert.equal(lireArguments(["--", "--help"]), null);
  const options = lireArguments(["--url", "https://example.org", "--sans-base"])!;
  assert.equal(options.pagesCliquees, 4);
  for (const value of ["0", "7"]) assert.equal(lireArguments(["--url", "https://example.org", "--pages-cliquees", value])!.pagesCliquees, Number(value));
  for (const value of ["-1", "1.5", "NaN", "Infinity", "9007199254740992", "--max"]) assert.throws(() => lireArguments(["--url", "https://example.org", "--pages-cliquees", value]));
  assert.equal(options.max, 15); assert.equal(options.port, 9333); assert.equal(options.sansBase, true);
  assert.match(options.sortie, /\.orchestrateur\/exploration$/); assert.match(options.vault, /vault-horama$/);
  for (const args of [[], ["--url", "file:///x"], ["--url", "https://u:p@example.org"], ["--url", "https://example.org", "--max", "-1"], ["--url", "https://example.org", "--chrome-port", "0"], ["--url", "https://example.org", "--url", "https://example.org"], ["--url"]]) assert.throws(() => lireArguments(args));
});

test("consigne : relever, défiler puis cliquer, liste dynamique et repli", () => {
  const pages = ["accueil", "faq", "aide"].map(ecran => ({ ecran, url: `https://example.org/${ecran}` }));
  const task = construireExploration(pages, "site", "1", 99).task;
  assert.ok(task.indexOf('Appelle relever') < task.indexOf("scroll_web"));
  assert.ok(task.indexOf("scroll_web") < task.indexOf("clique un lien"));
  assert.match(task, /faq : https:\/\/example.org\/faq/);
  assert.match(task, /Si aucun lien visible.*go_to/);
  assert.equal(task.match(/sans go_to clique/g)?.length, 2);
  assert.doesNotMatch(construireExploration(pages, "site", "1", 0).task, /clique un lien/);
  assert.doesNotMatch(construireExploration(pages.slice(0, 1), "site", "1", 99).task, /clique un lien/);
  assert.match(task, /3 défilements au plus jusqu'en bas/);
  assert.match(task, /1 ou 2 défilements au plus/);
  assert.match(task, /grands défilements/);
  assert.match(task, /Ne répète pas les défilements déjà faits/);
  const addressPart = construireExploration(pages, "site", "1", 0).task.split("Partie 2")[1];
  assert.doesNotMatch(addressPart, /défile|scroll_web/);
  assert.equal(explorationStepBudget(3, 99), 31);
  assert.equal(explorationStepBudget(3, 0), 25);
  assert.equal(explorationStepBudget(8, 4), 57);
  assert.equal(explorationStepBudget(8, 4) - (4 * 8 + 3 + 3 * 4), 10);
});

test("URL courante : réécriture, refus hors liste et repli illisible", async () => {
  let address: string | null = "https://example.org/faq/?x=1";
  const messages: string[] = [];
  const logs: string[] = [];
  const { result } = await run({ deps: {
    urlCourante: async () => address,
    log: message => logs.push(message),
    runtime: { relever: async () => ({ png: original, texte: "Page", url_page: address ?? "https://example.org/", largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }), navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    session: async input => {
      await input.onCreated("urls");
      return { id: "urls", fin: (async () => {
        messages.push(await input.onTool("relever", { ecran: "accueil", vue: "defaut" }));
        address = "https://outside.example/";
        messages.push(await input.onTool("relever", { ecran: "accueil", vue: "defaut" }));
        address = null;
        messages.push(await input.onTool("relever", { ecran: "accueil", vue: "defaut" }));
        await input.onTool("terminer", { etat: "reussi" });
        return { id: "urls", muted: false, cout_usd: null, etapes: 3 };
      })() };
    },
  } });
  assert.equal(result.etat, "fini");
  assert.match(messages[0], /1\/2 pages relevées/);
  assert.match(messages[1], /n'est pas dans la liste.*go_to/);
  assert.ok(logs.some(line => line.includes("https://outside.example/")));
  assert.equal(result.pages[1].capture !== null, true);
  assert.deepEqual(result.navigation.arrivees, { faq: "adresse", accueil: "depart" });
});

test("modes d'arrivée sérialisés, compteurs des actions composées seulement en mémoire", async () => {
  let address = "https://example.org/";
  const logs: string[] = [];
  const { result } = await run({ deps: {
    log: line => logs.push(line),
    runtime: { relever: async () => ({ png: original, texte: "Page", url_page: address, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }), navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    session: async input => {
      await input.onCreated("actions");
      return { id: "actions", fin: (async () => {
        const first = await input.onTool("relever", { ecran: "accueil", vue: "defaut" });
        assert.match(first, /3 défilements au plus jusqu'en bas/);
        assert.match(first, /1 ou 2 défilements au plus/);
        assert.match(first, /Ne répète pas les défilements déjà faits/);
        await input.onStep({ etape: 1, horodatage: new Date().toISOString(), action: "Défile, Défile, Clique", etat_session: "en_cours" });
        address = "https://example.org/faq";
        const response = await input.onTool("relever", { ecran: "faq", vue: "defaut" });
        assert.match(response, /Tous les relevés/);
        await input.onTool("terminer", { etat: "reussi" });
        return { id: "actions", muted: false, cout_usd: null, etapes: 2 };
      })() };
    },
  } });
  assert.deepEqual(result.navigation, { arrivees: { accueil: "depart", faq: "clic" }, clics: 1, defilements: 2, goTo: 0, defilementsDepart: 2 });
  assert.ok(logs.includes("faq : clic"));
  const report = JSON.parse(readFileSync(join(root, "out/exploration.json"), "utf8"));
  assert.ok(!("navigation" in report));
  assert.deepEqual(report.pages.map((page: { arrivee?: string }) => page.arrivee), ["depart", "clic"]);
  for (const page of report.pages) {
    assert.deepEqual(Object.keys(page).sort(), ["ecran", "url", "ordre", "trouvee_par", "agent", "etat", "http", "debut", "fin", "capture", "reference", "holo", "statut", "cookies", "arrivee"].sort());
  }
  const ordinary = await run();
  assert.deepEqual(ordinary.result.navigation.arrivees, { accueil: "depart", faq: "adresse" });
  assert.equal(ordinary.result.navigation.goTo, 2);
  assert.deepEqual(ordinary.result.pages.map(page => page.arrivee), ["depart", "adresse"]);
  const skipped = await run({ skip: "faq" });
  const unknown = skipped.result.pages.find(page => page.ecran === "faq")!;
  assert.ok(!("arrivee" in unknown));
});

test("identifiant de passage à l'heure de Paris, hiver, été et changement de date", () => {
  for (const [date, prefix] of [
    ["2026-01-12T23:30:00Z", "2026-01-13-00h30"],
    ["2026-07-12T22:30:00Z", "2026-07-13-00h30"],
    ["2026-03-29T00:30:00Z", "2026-03-29-01h30"],
    ["2026-03-29T01:30:00Z", "2026-03-29-03h30"],
  ]) assert.match(explorationPassageId(new Date(date)), new RegExp(`^${prefix}-[a-f0-9]{4}$`));
  assert.throws(() => explorationPassageId(new Date("invalide")), RangeError);
});

test("raison de sélection traduite seulement pour le récapitulatif lisible", () => {
  const excluded = { url: "https://example.org/blog/article", raison: "section-limit" };
  assert.equal(exclusionLabel(excluded.raison), "limite de pages par rubrique atteinte");
  assert.equal(excluded.raison, "section-limit");
  assert.equal(exclusionLabel("robots.txt"), "robots.txt");
  assert.equal(exclusionLabel(""), "");
});

test("clic avant le relevé de départ : départ exclu des pages cliquées et clic remis à zéro", async () => {
  let address = "https://example.org/";
  const logs: string[] = [];
  const { result } = await run({ deps: {
    log: line => logs.push(line),
    runtime: { relever: async () => ({ png: original, texte: "Page", url_page: address, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }), navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    session: async input => {
      await input.onCreated("cookie-click");
      return { id: "cookie-click", fin: (async () => {
        await input.onStep({ etape: 1, horodatage: new Date().toISOString(), action: libelleAction(["go_to_web", "click_web"]), etat_session: "en_cours" });
        const first = await input.onTool("relever", { ecran: "accueil", vue: "defaut" });
        assert.match(first, /sans go_to clique un lien/);
        address = "https://example.org/faq";
        await input.onTool("relever", { ecran: "faq", vue: "defaut" });
        await input.onTool("terminer", { etat: "reussi" });
        return { id: "cookie-click", muted: false, cout_usd: null, etapes: 3 };
      })() };
    },
  } });
  assert.equal(result.etat, "fini");
  assert.deepEqual(result.navigation.arrivees, { accueil: "depart", faq: "adresse" });
  assert.equal(result.navigation.clics, 1);
  assert.ok(logs.includes("accueil : depart"));
  assert.ok(logs.some(line => line.startsWith("Navigation : 0 pages par clic")));
});

test("le coût total inclut Holo sans modifier le coût de la session H", async () => {
  const { result } = await run({ deps: { holo: async () => ({
    status: "SUSPECTED", model: "holo4-27b", durationMs: 3, findings: [],
    usage: { prompt_tokens: 1000, completion_tokens: 200 }, cost_usd: 0.001,
  }) } });
  assert.equal(result.agents[0].cout_usd, 0.12);
  assert.equal(result.cout_usd, 0.122);
  assert.deepEqual(result.pages[0].holo?.jetons, { entree: 1000, sortie: 200 });
  assert.equal(result.pages[0].holo?.cout_usd, 0.001);
});

test("défaut à 4583 : capture viewport dédiée et zone dans l’image ; défaut visible conservé", async () => {
  const { result } = await run({ deps: {
    connecter: async () => ({ on() {}, close() {}, async send(method, params) {
      if (method === "Page.captureScreenshot") {
        assert.equal((params as Record<string, unknown> | undefined)?.captureBeyondViewport, false);
        return { data: original.toString("base64") };
      }
      return { result: { value: (params as Record<string, unknown> | undefined)?.expression === "[window.scrollX, window.scrollY]" ? [0, 4200] : 200 } };
    } }),
    controler: async () => [
      { statut: "VERIFIED_FAIL", sorte: "debordement", message: "Texte coupé.", zone: { x: 10, y: 4583, largeur: 100, hauteur: 40 } },
      { statut: "VERIFIED_FAIL", sorte: "debordement", message: "Texte visible.", zone: { x: 20, y: 30, largeur: 100, hauteur: 40 } },
    ],
  } });
  const [outside, inside] = result.constats;
  assert.equal(outside.capture, "captures/accueil--controle--1.png");
  assert.ok(existsSync(join(root, "out", outside.capture)));
  assert.deepEqual(outside.zone, { x: 10, y: 383, largeur: 100, hauteur: 40 });
  assert.deepEqual(outside.page, { largeur: 1280, hauteur: 900 });
  assert.equal(inside.capture, "captures/accueil.png");
  assert.deepEqual(inside.zone, { x: 20, y: 30, largeur: 100, hauteur: 40 });
});

test("défilement initial soustrait aux zones des contrôles", async () => {
  const { result } = await run({ defilement: [20, 400], deps: { controler: async () => [
    { statut: "VERIFIED_FAIL", sorte: "debordement", message: "Texte coupé.", zone: { x: 50, y: 500, largeur: 100, hauteur: 40 } },
  ] } });
  assert.deepEqual(result.constats[0].zone, { x: 30, y: 100, largeur: 100, hauteur: 40 });
  assert.equal(result.constats[0].capture, "captures/accueil.png");
});

test("capture supplémentaire en échec : défaut conservé sans zone hors image", async () => {
  const { result } = await run({ deps: {
    connecter: async () => ({ on() {}, close() {}, async send(method) {
      if (method === "Page.captureScreenshot") throw new Error("Capture");
      return { result: { value: [0, 4200] } };
    } }),
    controler: async () => [{ statut: "VERIFIED_FAIL", sorte: "debordement", message: "Texte coupé.", zone: { x: 10, y: 4583, largeur: 100, hauteur: 40 } }],
  } });
  assert.equal(result.etat, "fini");
  assert.equal(result.constats[0].statut, "VERIFIED_FAIL");
  assert.equal(result.constats[0].zone, undefined);
  assert.equal(result.constats[0].capture, "captures/accueil.png");
});

test("crochet de capture : résultat valide utilisé, sinon repli CDP sans perdre le défaut", async () => {
  const documentZone = { x: 10, y: 4583, largeur: 100, hauteur: 40 };
  const goodZone = { x: 10, y: 300, largeur: 100, hauteur: 40 };
  const badZones = [undefined, { ...goodZone, x: -1 }, { ...goodZone, y: 890 },
    { ...goodZone, x: NaN }, { ...goodZone, largeur: 0 }, { ...goodZone, x: 1280 }];
  for (const mode of ["valid", "throws", "absent", "both-fail", ...badZones] as const) {
    let hooks = 0, fallbacks = 0;
    const { result } = await run({ deps: {
      runtime: {
        relever: async ecran => ({ png: original, texte: "Page", url_page: ecran === "accueil" ? "https://example.org/" : "https://example.org/faq",
          largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }),
        navigateur: async () => ({ channel: "fake", stop() {} }), close() {},
        ...(mode === "absent" ? {} : { async capturerZone(zone: typeof documentZone) {
          hooks++;
          assert.deepEqual(zone, documentZone);
          if (mode === "throws" || mode === "both-fail") throw new Error("Couche indisponible");
          return { png: changed, zone: mode === "valid" ? goodZone : typeof mode === "object" ? mode : undefined, defilement: [0, 4283] as [number, number] };
        } }),
      },
      connecter: async () => ({ on() {}, close() {}, async send(method, params) {
        if (method === "Page.captureScreenshot") {
          fallbacks++;
          if (mode === "both-fail") throw new Error("CDP indisponible");
          return { data: original.toString("base64") };
        }
        return { result: { value: (params as Record<string, unknown> | undefined)?.expression === "[window.scrollX, window.scrollY]" ? [0, 4200] : 200 } };
      } }),
      controler: async () => [{ statut: "VERIFIED_FAIL", sorte: "debordement", message: "Texte coupé.", zone: documentZone }],
    } });
    assert.equal(hooks, mode === "absent" ? 0 : 2);
    assert.equal(fallbacks, mode === "valid" ? 0 : 2);
    for (const item of result.constats) {
      assert.equal(item.statut, "VERIFIED_FAIL");
      if (mode === "both-fail") {
        assert.equal(item.zone, undefined);
        assert.equal(item.capture, `captures/${item.ecran}.png`);
      } else {
        assert.equal(item.capture, `captures/${item.id}.png`);
        assert.deepEqual(item.zone, mode === "valid" ? goodZone : { ...documentZone, y: 383 });
        assert.ok(readFileSync(join(root, "out", item.capture)).equals(mode === "valid" ? changed : original));
      }
    }
  }
});

test("cookies préparés avant capture, client partagé puis fermé", async () => {
  const calls: string[] = [];
  const { result } = await run({ deps: {
    connecter: async () => { calls.push("connect"); return { on() {}, close() { calls.push("close"); }, async send(_method, params) {
      if (String((params as Record<string, unknown> | undefined)?.expression).includes("const deadline")) { calls.push("cookies"); return { result: { value: true } }; }
      return { result: { value: 200 } };
    } }; },
    controler: async () => { calls.push("controls"); return []; },
    runtime: { relever: async () => {
      calls.push("capture");
      return { png: original, texte: "Welcome", url_page: "https://example.org/", largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" };
    }, navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
  } });
  assert.deepEqual(calls.slice(0, 5), ["connect", "cookies", "capture", "controls", "close"]);
  assert.equal(result.pages[0].cookies, "refusee");
});

test("connexion CDP indisponible : capture conservée et contrôles non conclus", async () => {
  const { result } = await run({ deps: { connecter: async () => { throw new Error("CDP"); } } });
  assert.equal(result.totaux.pages_visitees, 2);
  assert.equal(result.pages[0].cookies, "aucune");
  assert.equal(result.pages[0].statut, "INCONCLUSIVE");
});

test("bannière tardive : statut cookies mis à jour juste avant capture, repli en cas d'erreur", async () => {
  for (const fail of [false, true]) {
    const { result } = await run({ deps: {
      connecter: async () => ({ on() {}, close() {}, async send(_method, params) {
        const expression = String((params as Record<string, unknown> | undefined)?.expression);
        if (expression.includes("responseStatus")) return { result: { value: 200 } };
        if (expression.includes("const deadline")) return { result: { value: false } };
        if (fail) throw new Error("Connexion perdue");
        return { result: { value: true } };
      } }),
      runtime: { relever: async (ecran, _vue, beforeCapture) => {
        assert.ok(beforeCapture);
        await beforeCapture();
        return { png: original, texte: "Page", url_page: ecran === "accueil" ? "https://example.org/" : "https://example.org/faq", largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" };
      }, navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    } });
    assert.equal(result.totaux.pages_visitees, 2);
    assert.ok(result.pages.every(page => page.cookies === (fail ? "aucune" : "refusee")));
    assert.ok(result.pages.every(page => page.statut === (fail ? "INCONCLUSIVE" : "PASS")));
    if (fail) assert.ok(result.constats.every(finding => finding.statut === "INCONCLUSIVE" && finding.raison?.includes("consentement")));
  }
});

test("onglets multiples : prépare et contrôle l'onglet redirigé avant capture", async () => {
  let controls = 0;
  const connected: string[] = [];
  const { result } = await run({ actual: url => url.includes("/faq") ? "https://example.org/help" : url, deps: {
    connecter: async (_port, url) => {
      connected.push(url);
      if (url.includes("/faq")) throw new Error("Onglet absent parmi deux onglets");
      return { on() {}, close() {}, async send(_method, params) {
        return { result: { value: String((params as Record<string, unknown> | undefined)?.expression).includes("responseStatus") ? 200 : true } };
      } };
    },
    controler: async () => { controls++; return []; },
    fetch: async (input, init) => {
      if (init?.redirect === "follow") {
        const response = new Response("Welcome");
        Object.defineProperty(response, "url", { value: "https://example.org/help" });
        return response;
      }
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/faq</loc></url></urlset>" : "Welcome", { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
    },
  } });
  assert.equal(controls, 2);
  assert.ok(connected.includes("https://example.org/help"));
  assert.equal(result.pages[1].cookies, "refusee");
  assert.equal(result.pages[1].http, 200);
});

test("redirection de même origine acceptée après une seule résolution", async () => {
  let resolves = 0;
  const { result, responses } = await run({ actual: url => url.includes("/faq") ? "https://example.org/help" : url, deps: {
    fetch: async (input, init) => {
      if (init?.redirect === "follow") {
        resolves++;
        const response = new Response("Welcome");
        Object.defineProperty(response, "url", { value: "https://example.org/help" });
        return response;
      }
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/faq</loc></url></urlset>" : "Welcome", { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
    },
  } });
  assert.equal(result.etat, "fini");
  assert.equal(result.pages[1].url_finale, "https://example.org/help");
  assert.equal(resolves, 1);
  assert.match(responses.at(-1)!, /Parcours terminé/);
});

test("contrôle d'adresse : redirection même origine résolue avant le premier relevé", async () => {
  let resolves = 0;
  const { result, responses } = await run({ actual: url => url.includes("/faq") ? "https://example.org/help" : url, deps: {
    urlCourante: async () => "https://example.org/help",
    fetch: async (input, init) => {
      if (init?.redirect === "follow") {
        resolves++;
        const response = new Response("Welcome");
        Object.defineProperty(response, "url", { value: String(input).includes("/faq") ? "https://example.org/help" : "https://example.org/" });
        return response;
      }
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/faq</loc></url></urlset>" : "Welcome", { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
    },
  } });
  assert.match(responses[0], /n'est pas dans la liste/);
  assert.equal(result.pages[1].etat, "visitee");
  assert.equal(result.pages[1].url_finale, "https://example.org/help");
  assert.match(responses[1], /Capture/);
  assert.equal(resolves, 2);
});

for (const tracking of ["", "&utm_source=y&gclid=z"]) {
test(`contrôle d'adresse : deux pages de même chemin gardent leur query et leur ecran (suivi : ${tracking || "aucun"})`, async () => {
  let address = "https://example.org/";
  const { result } = await run({ deps: {
    urlCourante: async () => address,
    fetch: async input => {
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/p?x=1</loc></url><url><loc>https://example.org/p?x=2</loc></url></urlset>" : "Welcome", { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
    },
    runtime: { relever: async () => ({ png: original, texte: "Page", url_page: address, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }), navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
    session: async input => {
      await input.onCreated("queries");
      return { id: "queries", fin: (async () => {
        assert.equal(input.consigne.course.length, 3);
        for (const step of input.consigne.course) {
          address = step.address + (step.address.includes("?") ? tracking : "");
          assert.match(await input.onTool("relever", { ecran: step.ecran, vue: "defaut" }), /Capture/);
        }
        await input.onTool("terminer", { etat: "reussi" });
        return { id: "queries", muted: false, cout_usd: null, etapes: 3 };
      })() };
    },
  } });
  assert.equal(result.etat, "fini");
  assert.deepEqual(result.pages.map(page => [page.ecran, page.etat]), [["accueil", "visitee"], ["p", "visitee"], ["p-2", "visitee"]]);
  assert.deepEqual(result.pages.slice(1).map(page => page.url), ["https://example.org/p?x=1", "https://example.org/p?x=2"]);
});
}

for (const [actual, reason] of [
  ["https://other.example/", "La page redirige vers un autre site"],
  ["chrome-error://chromewebdata/", "La page n'a pas pu être chargée."],
  ["about:blank", "La page n'a pas pu être chargée."],
  ["https://example.org/wrong", "Page non atteinte après 2 essais"],
]) {
  test(`page ignorée sans boucle : ${actual}`, async () => {
    let resolves = 0;
    const { result, base, responses } = await run({ actual: url => new URL(url).pathname === "/" ? actual : url, retries: 2, deps: {
      fetch: async (input, init) => {
        if (init?.redirect === "follow") resolves++;
        const path = new URL(String(input)).pathname;
        return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? "<urlset><url><loc>https://example.org/faq</loc></url></urlset>" : "Welcome", { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
      },
    } });
    assert.equal(result.etat, "interrompu");
    assert.equal(result.pages[0].etat, "non_visitee");
    assert.equal(result.pages[1].etat, "visitee");
    assert.ok(result.constats.some(item => item.ecran === "accueil" && item.statut === "INCONCLUSIVE" && item.raison?.startsWith(reason)));
    assert.ok(base.resultats.find(item => item.test_id === "exploration--accueil")?.raison?.startsWith(reason));
    assert.match(responses.at(-1)!, /Parcours terminé/);
    assert.ok(resolves <= 1);
  });
}

test("site anglais sans sitemap et pages HTTP 404/500 : visite complète", async () => {
  for (const status of [404, 500]) {
    const { result } = await run({ deps: {
      fetch: async input => {
        const path = new URL(String(input)).pathname;
        return new Response(path === "/robots.txt" ? "" : path.endsWith(".xml") ? "Not found" : '<html lang="en"><a href="/faq">Help</a><p>Welcome</p></html>',
          { status: path.endsWith(".xml") ? 404 : 200, headers: { "Content-Type": "text/html" } });
      },
      connecter: async () => ({ on() {}, close() {}, send: async () => ({ result: { value: status } }) }),
      controler: async () => [{ statut: "VERIFIED_FAIL", sorte: "page_en_erreur", message: "La page est en erreur.", valeur: status }],
    } });
    assert.equal(result.trouvees.par, "liens");
    assert.equal(result.etat, "fini");
    assert.ok(result.pages.every(page => page.etat === "visitee" && page.http === status));
    assert.ok(result.constats.every(item => item.sorte === "page-erreur"));
  }
});

async function budgetRun(limits: number[], { failCreation = false, rejectFinal = false, muted = false, abort = false, failClose = false, unconfirmedClose = false } = {}) {
  const plans: string[][] = [], budgets: number[] = [], closed: string[] = [];
  const controller = new AbortController();
  let address = "https://example.org/", launches = 0;
  const { result, base } = await run({ deps: {
    signal: controller.signal,
    fetch: async input => {
      const path = new URL(String(input)).pathname;
      return new Response(path === "/robots.txt" ? "" : path === "/sitemap.xml" ? `<urlset>${Array.from({ length: 14 }, (_, index) => `<url><loc>https://example.org/page-${index + 1}</loc></url>`).join("")}</urlset>` : "<html>Welcome</html>",
        { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
    },
    runtime: {
      relever: async () => ({ png: original, texte: "Welcome", url_page: address, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture" }),
      navigateur: async () => ({ channel: "fake", stop() {} }), close() {},
    },
    session: async input => {
      const index = launches++, id = `budget-${index + 1}`;
      if (index) assert.ok(closed.includes(`budget-${index}`), "la session précédente doit être fermée");
      plans.push(input.consigne.course.map(step => step.ecran));
      budgets.push(input.maxSteps!);
      if (failCreation && index === 1) throw new Error("Création impossible");
      await input.onCreated(id);
      return { id, confirmStopped: async () => { if (unconfirmedClose) throw new Error("Fermeture non confirmée"); },
        stop: async () => { closed.push(id); if (failClose) throw new Error("Fermeture impossible"); }, fin: (async () => {
        const course = input.consigne.course.slice(0, limits[index] ?? 0);
        for (const step of course) {
          address = step.address;
          await input.onTool("relever", { ecran: step.ecran, vue: "defaut" });
        }
        const complete = course.length === input.consigne.course.length;
        if (complete) assert.match(await input.onTool("terminer", { etat: "reussi" }), /Parcours terminé/);
        if (abort) controller.abort(new Error("Annulation demandée"));
        if (rejectFinal && index === 1) throw new Error("Réseau");
        return { id, muted: muted && !complete, etapes: input.maxSteps!, cout_usd: index ? 0.02 : 0.1,
          replay_url: `https://replay.example/${id}`, ...(!complete && !muted ? { erreur: "Budget d'étapes épuisé." } : {}) };
      })() };
    },
  } });
  return { result, base, plans, budgets, closed, launches };
}

test("15 pages : budget pour navigation, relevé, attente, reprises et début/fin", async () => {
  const { result, budgets, launches } = await budgetRun([15]);
  assert.equal(explorationStepBudget(15, 4), 85);
  assert.equal(budgets[0], 85);
  assert.ok(budgets[0] >= 15 * 3 + 10);
  assert.equal(launches, 1);
  assert.equal(result.etat, "fini");
});

test("budget épuisé après 13 pages : une seule relance limitée aux 2 restantes", async () => {
  const { result, base, plans, budgets, closed } = await budgetRun([13, 2]);
  assert.equal(result.etat, "fini");
  assert.equal(result.totaux.pages_visitees, 15);
  assert.equal(result.totaux.sans_conclusion, 0);
  assert.equal(result.agents.length, 2);
  assert.deepEqual(plans[1], plans[0].slice(13));
  assert.deepEqual(budgets, [85, 21]);
  assert.equal(result.navigation.arrivees[result.pages[0].ecran], "depart");
  assert.ok(result.pages.slice(1).every(page => result.navigation.arrivees[page.ecran] === "adresse"));
  assert.deepEqual(closed, ["budget-1", "budget-2"]);
  assert.deepEqual(result.agents.map(agent => [agent.session_id, agent.etat, agent.pages.length, agent.cout_usd]),
    [["budget-1", "tombe", 13, 0.1], ["budget-2", "fini", 2, 0.02]]);
  assert.equal(result.agents[0].raison, "Budget d'étapes épuisé.");
  assert.ok(Math.abs(result.cout_usd! - 0.12) < 1e-10);
  assert.ok(result.pages.slice(0, 13).every(page => page.agent === 1));
  assert.ok(result.pages.slice(13).every(page => page.agent === 2));
  assert.equal(base.resultats[0].replay_url, "https://replay.example/budget-1");
  assert.equal(base.resultats[14].replay_url, "https://replay.example/budget-2");
  const persisted = base.rapports.get(result.passage_id)!;
  assert.equal(persisted.tests[0].session_id, "budget-1");
  assert.equal(persisted.tests[0].replay_url, "https://replay.example/budget-1");
  assert.equal(persisted.tests[14].session_id, "budget-2");
  assert.equal(persisted.tests[14].replay_url, "https://replay.example/budget-2");
});

test("deux budgets épuisés : pas de troisième session, page restante non visitée avec raison C4", async () => {
  const { result, base, launches, closed } = await budgetRun([13, 1]);
  assert.equal(launches, 2);
  assert.deepEqual(closed, ["budget-1", "budget-2"]);
  assert.equal(result.etat, "interrompu");
  assert.equal(result.totaux.pages_visitees, 14);
  assert.equal(result.pages[14].etat, "non_visitee");
  assert.equal(result.pages[14].statut, "INCONCLUSIVE");
  assert.match(result.pages[14].raison!, /après deux sessions.*budget d'étapes/);
  const finding = result.constats.find(item => item.ecran === result.pages[14].ecran)!;
  assert.match(finding.raison!, /après deux sessions.*budget d'étapes/);
  assert.equal(finding.agent, 2);
  assert.equal(base.resultats[14].raison, finding.raison);
});

test("deux sessions muettes : aucune relance supplémentaire du coureur", async () => {
  const { result, launches, closed } = await budgetRun([0, 0], { muted: true });
  assert.equal(launches, 2);
  assert.deepEqual(closed, ["budget-1", "budget-2"]);
  assert.equal(result.etat, "interrompu");
  assert.ok(result.pages.every(page => page.etat === "non_visitee" && page.statut === "INCONCLUSIVE"));
});

test("relance rejetée ou impossible à créer : rapport non concluant sans crash", async () => {
  for (const options of [{ failCreation: true }, { rejectFinal: true }]) {
    const { result, launches } = await budgetRun([13, 0], options);
    assert.equal(launches, 2);
    assert.equal(result.etat, "interrompu");
    assert.equal(result.totaux.pages_visitees, 13);
    assert.ok(result.pages.slice(13).every(page => page.etat === "non_visitee" && page.statut === "INCONCLUSIVE"));
    assert.ok(result.constats.every(item => item.raison));
  }
});

test("annulation : aucune relance", async () => {
  const { result, launches, closed } = await budgetRun([13], { abort: true });
  assert.equal(launches, 1);
  assert.ok(closed.includes("budget-1"));
  assert.equal(result.etat, "interrompu");
});

test("fermeture non confirmée : aucune relance susceptible de consommer une deuxième place", async () => {
  for (const options of [{ failClose: true }, { unconfirmedClose: true }]) {
    const { result, launches } = await budgetRun([13], options);
    assert.equal(launches, 1);
    assert.equal(result.etat, "interrompu");
    assert.ok(result.pages.slice(13).every(page => page.etat === "non_visitee" && /fermeture/.test(page.raison!)));
  }
});
