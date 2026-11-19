// A link of the menu toward another origin that opens another tab (target=_blank), clicked for real as H clicks, with
// the layer of the scene installed (the click held, then given back): no second tab is ever created, the address opens
// in the tab of the scene, and the layer is there on the other origin. Case of the passage on albertschool.com (19/11):
// « Entreprises partenaires » → https://partners.albertschool.com/ in a new tab; the scene closed it, the bridge of H
// lost its tab, its session became invalid. A real Chrome, two local origins, no network, no H.
// Run from this folder: node --test lien-autre-origine.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { clickAt, closeChrome, connectTab, evaluate, fitViewport, installLayer, layer, navigate, openChrome, sleep, waitFor } from "./scene.mjs";

const PORT = 9345;
const serve = (body) => createServer((request, response) => response.end(body)).listen(0, "127.0.0.1");

test("un lien du menu vers une autre origine en target=_blank s'ouvre dans l'onglet de la scène, sans second onglet", async () => {
  const partners = serve(`<!doctype html><html><head><title>Partners</title></head><body><h1>Build the future with us</h1></body></html>`);
  await new Promise((done) => partners.once("listening", done));
  const other = `http://localhost:${partners.address().port}/`; // another origin than 127.0.0.1
  const site = serve(`<!doctype html><html><body style="margin:0;font:20px sans-serif"><nav style="padding:20px">
<a id="menu" href="${other}" target="_blank" style="display:inline-block;width:260px;height:40px">Entreprises partenaires</a></nav><h1>Le site</h1></body></html>`);
  await new Promise((done) => site.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-autre-origine-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const tab = await connectTab(PORT);
  // Every page target created by Chrome, as the browser announces it: a second tab, even closed at once, is seen.
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const browser = new WebSocket(webSocketDebuggerUrl);
  await new Promise((done) => (browser.onopen = done));
  const created = [];
  browser.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Target.targetCreated" && message.params.targetInfo.type === "page") created.push(message.params.targetInfo.url);
  };
  browser.send(JSON.stringify({ id: 1, method: "Target.setDiscoverTargets", params: { discover: true } }));
  try {
    await installLayer(tab, () => {}, { passage: "essai-autre-origine", titre: "Horama" });
    await fitViewport(tab);
    await navigate(tab, `http://127.0.0.1:${site.address().port}/`);
    await sleep(500);
    created.length = 0; // the targets announced at the start (the tab of the scene) do not count
    const centre = await evaluate(tab, `(() => { const r = document.getElementById("menu").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await clickAt(tab, centre);
    assert.ok(await waitFor(tab, `location.origin === ${JSON.stringify(other.slice(0, -1))} && document.readyState === "complete"`, 10_000), "l'autre origine s'ouvre dans l'onglet de la scène");
    await sleep(500);
    assert.deepEqual(created, [], `aucun second onglet créé (${created.join(", ")})`);
    // The layer is there on the other origin: a command answers.
    await layer(tab, "etat", "trouve");
    assert.equal(await evaluate(tab, `JSON.parse(sessionStorage.getItem("horama") ?? "null")?.etat ?? "absente"`), "trouve", "la couche répond sur l'autre origine");
  } finally {
    browser.close();
    tab.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    site.close();
    partners.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
