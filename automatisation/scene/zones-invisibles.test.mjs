// Never a stroke around nothing (S7, passage on louvre.fr of 19/11: rings around texts kept for screen readers, 1 px
// wide): the layer finds no zone for an element that is not seen (sr-only, transparent, hidden) and draws nothing for a
// zone under 4 px; a visible element still gets its stroke. A real Chrome, a local page, no network, no H.
// Run from this folder: node --test zones-invisibles.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { closeChrome, connectTab, evaluate, fitViewport, installLayer, layer, navigate, openChrome } from "./scene.mjs";

const PORT = 9346;
const PAGE = `<!doctype html><html lang="fr"><body style="margin:0;font:20px sans-serif;padding:40px">
<h1 id="visible">Un titre visible</h1>
<span id="lecteur" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">Texte pour les lecteurs d'écran</span>
<p id="transparent" style="opacity:0">Un paragraphe transparent</p>
<p id="cache" style="visibility:hidden">Un paragraphe caché</p></body></html>`;

test("aucun trait autour d'une zone invisible ou de moins de 4 px", async () => {
  const server = createServer((request, response) => response.end(PAGE)).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-zones-invisibles-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const page = await connectTab(PORT);
  try {
    await installLayer(page, () => {}, { passage: "essai-zones-invisibles", titre: "Horama" });
    await fitViewport(page);
    await navigate(page, `http://127.0.0.1:${server.address().port}/`);
    for (const id of ["lecteur", "transparent", "cache"]) assert.deepEqual(await layer(page, "element", `#${id}`), [], `${id} : pas de zone`);
    const visible = await layer(page, "element", "#visible");
    assert.equal(visible.length, 1, "le titre visible a sa zone");
    // A zone of 1 px (as the check of the explorer gives for a text cut for screen readers): nothing is kept nor drawn.
    await layer(page, "surligner", "/", [{ x: 651, y: 438, largeur: 1, hauteur: 22 }], "defaut", "un-pixel", null, false);
    await layer(page, "surligner", "/", visible, "defaut", "titre", null, false);
    const zones = await evaluate(page, `JSON.parse(sessionStorage.getItem("horama")).zones["/"] ?? []`);
    assert.deepEqual(zones.map((zone) => zone.id), ["titre"], "seul le titre visible est entouré");
  } finally {
    page.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
