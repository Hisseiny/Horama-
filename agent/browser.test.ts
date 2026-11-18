import assert from "node:assert/strict";
import { test } from "node:test";
import { ouvrirNavigateur } from "./src/browser.ts";
import type { Bridge, Scene } from "./src/browser.ts";

function fixture() {
  const calls: Array<[string, object | undefined]> = [];
  let closed = false;
  let stopped = 0;
  const bridge: Bridge = { failed: null, ready: async () => true, stop() { stopped++; } };
  const page = { async send(method: string, params?: object) { calls.push([method, params]); return { data: Buffer.from("png").toString("base64") }; }, close() { closed = true; } };
  const scene: Scene = {
    connectTab: async () => page,
    fitViewport: async () => ({ largeur: 1280, hauteur: 900, densite: 1 }),
    evaluate: async () => ({ texte: "Factures", url_page: "http://localhost:3100/v13/factures", largeur: 1280, hauteur: 900, densite: 1, defilement: [0, 0] }),
  };
  return { scene, calls, bridge, findHolo: () => "/holo-factice", startBridge: () => bridge, port: 9333, get closed() { return closed; }, get stopped() { return stopped; } };
}

test("capture CDP sans navigation et nouveau pont pour chaque tentative", async () => {
  const setup = fixture();
  const runtime = await ouvrirNavigateur(setup);
  const shot = await runtime.relever("factures", "defaut");
  assert.equal(shot.texte, "Factures");
  assert.equal(shot.url_page, "http://localhost:3100/v13/factures");
  assert.deepEqual(shot.png, new Uint8Array(Buffer.from("png")));
  assert.deepEqual(setup.calls, [["Input.dispatchMouseEvent", { type: "mouseMoved", x: -10, y: 450 }], ["Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false }]]);
  const first = await runtime.navigateur();
  first.stop();
  const second = await runtime.navigateur();
  assert.notEqual(first.channel, second.channel);
  setup.bridge.failed = "Pont interrompu.";
  assert.equal(second.failed!(), "Pont interrompu.");
  runtime.close();
  assert.equal(setup.stopped, 2);
  assert.equal(setup.closed, true);
});

test("revérification juste avant PNG et texte relu après fermeture", async () => {
  const setup = fixture();
  const events: string[] = [];
  setup.scene.evaluate = async () => {
    events.push("lecture");
    return { texte: events.includes("fermeture") ? "Sans bannière" : "Cookies", url_page: "https://example.org/", largeur: 1280, hauteur: 900, densite: 1, defilement: [0, 0] };
  };
  const runtime = await ouvrirNavigateur(setup);
  const result = await runtime.relever("accueil", "defaut", async () => {
    assert.ok(!setup.calls.some(([method]) => method === "Page.captureScreenshot"));
    events.push("fermeture");
  });
  assert.equal(result.texte, "Sans bannière");
  assert.deepEqual(events, ["lecture", "fermeture", "lecture"]);
  assert.equal(setup.calls.at(-1)?.[0], "Page.captureScreenshot");
  setup.calls.length = 0;
  await assert.rejects(runtime.relever("accueil", "defaut", async () => { throw new Error("Revérification indisponible"); }), /Revérification indisponible/);
  assert.ok(!setup.calls.some(([method]) => method === "Page.captureScreenshot"));
  runtime.close();
});

test("CLI absente, connexion vide, dimensions et pont invalides échouent sans fuite", async () => {
  const missing = fixture();
  await assert.rejects(ouvrirNavigateur({ ...missing, findHolo: () => null }), /holo introuvable/);
  const empty = fixture();
  empty.scene.connectTab = async () => { throw new Error("Aucun onglet CDP."); };
  await assert.rejects(ouvrirNavigateur(empty), /Aucun onglet/);
  const invalid = fixture();
  invalid.scene.fitViewport = async () => ({ largeur: 800, hauteur: 600, densite: 2 });
  await assert.rejects(ouvrirNavigateur(invalid), /1280 × 900/);
  assert.equal(invalid.closed, true);
  const failed = fixture();
  failed.bridge.ready = async () => false;
  const runtime = await ouvrirNavigateur(failed);
  await assert.rejects(runtime.navigateur(), /pont H n’est pas prêt/);
  assert.equal(failed.stopped, 1);
  failed.scene.evaluate = async () => ({ largeur: 800 });
  await assert.rejects(runtime.relever("factures", "defaut"), /Dimensions/);
  runtime.close();
  assert.equal(failed.closed, true);
});
