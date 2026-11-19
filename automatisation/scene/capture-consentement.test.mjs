// capture() with the 3rd argument of relever (PR #102): the explorer rechecks the cookie banner just before the
// screenshot. A real Chrome, a local page with a banner fixed at the bottom: removed first by a plain beforeCapture,
// then by the real recheck of the explorer (dismissCookies of agent/src/exploration/cdp.ts). Needs Chrome
// (CHROME_BIN), no network, no H.
// Run from this folder: node --test capture-consentement.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import { connecterCdp, dismissCookies } from "../../agent/src/exploration/cdp.ts";
import { capture, closeChrome, connectTab, evaluate, fitViewport, installLayer, navigate, openChrome } from "./scene.mjs";

const PAGE = `<!doctype html><html><body style="margin:0;background:#fff;height:3000px"><p>Contenu de la page</p>
<div id="bandeau" style="position:fixed;left:0;right:0;bottom:0;height:120px;background:#f00">Nous utilisons des cookies <button onclick="this.parentElement.remove()">Tout refuser</button></div></body></html>`;
const PORT = 9336;
const pixel = (png, x, y) => {
  const image = PNG.sync.read(png);
  return [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)];
};

test("capture : beforeCapture est appelé page immobile, juste avant l'image, et le texte est relu après lui", async () => {
  const server = createServer((request, response) => response.end(PAGE)).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-capture-consentement-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const page = await connectTab(PORT);
  try {
    await installLayer(page, () => {}, { passage: "essai-consentement", titre: "Horama" });
    await fitViewport(page);
    await navigate(page, `http://127.0.0.1:${server.address().port}/`);

    // Without the 3rd argument: the banner is in the text and on the image (the check below means something).
    const before = await capture(page);
    assert.match(before.texte_page, /Nous utilisons des cookies/);
    assert.deepEqual(pixel(before.png, 640, 850), [255, 0, 0]);

    await evaluate(page, "scrollTo(0, 800)");
    const calls = [];
    const shot = await capture(page, async () => {
      calls.push(await evaluate(page, "scrollY"));
      await evaluate(page, `document.getElementById("bandeau").remove()`);
    });
    assert.deepEqual(calls, [0], "appelé une fois, page déjà remontée en haut");
    assert.doesNotMatch(shot.texte_page, /cookies/, "texte relu après la revérification");
    assert.match(shot.texte_page, /Contenu de la page/);
    assert.deepEqual(pixel(shot.png, 640, 850), [255, 255, 255], "plus de bandeau sur l'image");
    assert.deepEqual(shot.defilement, [0, 0]);

    // As the explorer passes it (agent/src/exploration/explorer.ts): its own CDP client on the tab, dismissCookies.
    const address = `http://127.0.0.1:${server.address().port}/`;
    await navigate(page, address);
    const client = await connecterCdp(PORT, address);
    try {
      let refused = null;
      const real = await capture(page, async () => { refused = await dismissCookies(client); });
      assert.equal(refused, true, "le refus du moteur a cliqué « Tout refuser »");
      assert.doesNotMatch(real.texte_page, /cookies/);
      assert.deepEqual(pixel(real.png, 640, 850), [255, 255, 255]);
    } finally {
      client.close();
    }
  } finally {
    page.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
