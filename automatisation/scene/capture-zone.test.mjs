// captureZone (scene.mjs), called as the explorer calls the hook capturerZone (PR #85): a real Chrome, a local page that
// declares a smooth scroll (« scroll-behavior: smooth », as eugeniaschool.com) with a red block far below the first screen, the
// Horama layer and its mascot shown. Needs Chrome (CHROME_BIN), no network, no H.
// Run from this folder: node --test capture-zone.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import { captureZone, closeChrome, connectTab, evaluate, fitViewport, installLayer, layer, navigate, openChrome } from "./scene.mjs";

const PAGE = `<!doctype html><html style="scroll-behavior: smooth"><body style="margin:0;background:#fff;height:6000px">
<div id="cible" style="position:absolute;left:100px;top:3000px;width:300px;height:40px;background:#f00"></div></body></html>`;
const PORT = 9334;
const MASCOT = { left: 1160, top: 780, right: 1256, bottom: 876 }; // its first corner in a 1280 × 900 page (couche-horama.js)

const pixel = (image, x, y) => [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)];
const whiteIn = (image, { left, top, right, bottom }) => {
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixel(image, x, y).some((value) => value < 250)) return false;
  return true;
};

test("captureZone : un seul défilement doux jusqu'à la zone, zone au milieu de l'image, couche masquée, la page reste là", async () => {
  const server = createServer((request, response) => response.end(PAGE)).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-capture-zone-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const page = await connectTab(PORT);
  try {
    await installLayer(page, () => {}, { passage: "essai-capture-zone", titre: "Horama" });
    const area = await fitViewport(page);
    assert.deepEqual([area.largeur, area.hauteur], [1280, 900]);
    await navigate(page, `http://127.0.0.1:${server.address().port}/`);
    await layer(page, "etat", "repos"); // the layer is there
    await evaluate(page, `scrollTo({ top: 500, behavior: "instant" })`);
    // Without hiding, the mascot is in its corner: the check below means something.
    const shown = PNG.sync.read(Buffer.from((await page.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    assert.equal(whiteIn(shown, MASCOT), false, "la mascotte devrait être visible avant la capture");

    const zone = await evaluate(page, `(() => { const r = document.getElementById("cible").getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, largeur: r.width, hauteur: r.height }; })()`);
    // The scroll positions while captureZone runs, read every 50 ms: smooth means several positions between start and end.
    await evaluate(page, `window.__positions = []; window.__suivi = setInterval(() => window.__positions.push(scrollY), 50)`);
    const result = await captureZone(page, zone);
    const positions = await evaluate(page, `(clearInterval(window.__suivi), window.__positions)`);
    const image = PNG.sync.read(result.png);

    assert.deepEqual([image.width, image.height], [1280, 900]);
    assert.ok(result.zone, "zone dans l'image");
    // Centred: the middle of the zone at the middle of the screen, once the smooth scroll has ended.
    assert.ok(Math.abs(result.zone.y + result.zone.hauteur / 2 - 450) <= 1, `zone centrée (y = ${result.zone.y})`);
    assert.deepEqual(result.defilement, [0, 3020 - 450]);
    assert.deepEqual(pixel(image, result.zone.x + 10, result.zone.y + 10), [255, 0, 0], "le bloc rouge est dans la zone");
    assert.ok(whiteIn(image, MASCOT), "ni mascotte ni curseur sur la capture");
    // One smooth scroll, down only: intermediate positions, never back up to where it started.
    assert.ok(positions.some((y) => y > 500 && y < 2570), `défilement doux (positions : ${positions.join(", ")})`);
    assert.ok(positions.every((y, index) => index === 0 || y >= positions[index - 1]), "aucun aller-retour");
    // Afterwards: the page stays on the zone, the layer is shown again.
    assert.deepEqual(await evaluate(page, "[scrollX, scrollY]"), [0, 2570]);
    const after = PNG.sync.read(Buffer.from((await page.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    assert.equal(whiteIn(after, MASCOT), false, "la couche est remontrée après la capture");
  } finally {
    page.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
