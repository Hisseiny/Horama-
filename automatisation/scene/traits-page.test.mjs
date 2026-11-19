// A stroke belongs to its page and to what it surrounds (S6, passage on louvre.fr of 19/11: the rings of the home page
// stayed over the menu « Visiter » and came back on other pages, the site changing page without a new document). A
// local site with its own router (history.pushState) and a menu that opens over the zone: the stroke hides under the
// menu and comes back when it closes; it goes when the address changes, and comes back with its address. The stroke is
// found on screenshots by its colour (miltos, #B8321F). A real Chrome, no network, no H.
// Run from this folder: node --test traits-page.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import { closeChrome, connectTab, evaluate, fitViewport, installLayer, layer, navigate, openChrome, sleep } from "./scene.mjs";

const PORT = 9349;
const PAGE = `<!doctype html><html lang="fr"><body style="margin:0;font:20px sans-serif;background:#fff">
<main id="contenu" style="padding:60px"><h1>Accueil</h1><p id="cible" style="width:420px">Un texte qui déborde de sa boîte, entouré.</p></main>
<div id="menu" style="display:none;position:fixed;left:0;top:0;right:0;height:400px;background:#fff;border-bottom:1px solid #ccc;padding:60px">Le menu ouvert</div>
<script>
  window.ouvrirMenu = (on) => (document.getElementById("menu").style.display = on ? "block" : "none");
  window.allerA = (path) => { history.pushState({}, "", path); document.getElementById("contenu").innerHTML = path === "/" ? '<h1>Accueil</h1><p id="cible" style="width:420px">Un texte qui déborde de sa boîte, entouré.</p>' : "<h1>Une autre page</h1>"; };
</script></body></html>`;
// Pixels of the miltos stroke in the band around the zone.
const miltos = async (page) => {
  const image = PNG.sync.read(Buffer.from((await page.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  let n = 0;
  for (let y = 60; y < 260; y++) for (let x = 20; x < 560; x++) {
    const i = (y * image.width + x) * 4;
    // Close around miltos (184, 50, 31): the fringes of black text smoothed on Linux must not count (review of #189).
    if (image.data[i] > 170 && image.data[i + 1] < 70 && image.data[i + 2] < 60) n++;
  }
  return n;
};

test("un trait se cache sous un menu, part au changement d'adresse et revient avec elle", async () => {
  const server = createServer((request, response) => response.end(PAGE)).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-traits-page-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const page = await connectTab(PORT);
  try {
    await installLayer(page, () => {}, { passage: "essai-traits-page", titre: "" });
    await fitViewport(page);
    await navigate(page, `http://127.0.0.1:${server.address().port}/`);
    const zone = await layer(page, "element", "#cible");
    await layer(page, "surligner", "/", zone, "defaut", "cible", null, false);
    await sleep(500);
    const drawn = await miltos(page);
    assert.ok(drawn > 50, `le trait est dessiné (${drawn} px)`);
    await evaluate(page, "ouvrirMenu(true)");
    await sleep(600);
    assert.ok((await miltos(page)) < 5, "le trait se cache sous le menu");
    await evaluate(page, "ouvrirMenu(false)");
    await sleep(600);
    assert.ok((await miltos(page)) > 50, "le trait revient quand le menu se ferme");
    // The page draws the surrounded element again (same place, a new node): the stroke stays.
    await evaluate(page, `document.getElementById("contenu").innerHTML = document.getElementById("contenu").innerHTML`);
    await sleep(600);
    assert.ok((await miltos(page)) > 50, "le trait reste quand la page redessine l'élément entouré");
    await evaluate(page, `allerA("/autre")`);
    await sleep(600);
    assert.ok((await miltos(page)) < 5, "le trait part au changement d'adresse");
    await evaluate(page, `allerA("/")`);
    await sleep(600);
    assert.ok((await miltos(page)) > 50, "le trait revient avec son adresse");
  } finally {
    page.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
