// The expression of the mascot at a stroke (S3, videos of 19/11: the stroke drawn while the mascot kept « observe », or
// its expression one second after; on albertschool.com, the mascot far from the zone). The expression comes before the
// stroke, the mascot stands near the zone (within 260 px of it, never on it), and the expression stays until the next
// gesture of H, 3 s at least. A real Chrome, a local page, no network, no H.
// Run from this folder: node --test trait-expression.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { clickAt, closeChrome, connectTab, evaluate, fitViewport, installLayer, layer, navigate, openChrome, sleep } from "./scene.mjs";

const PORT = 9341;
const text = "Un paragraphe de texte autour de la zone, pour que la mascotte ait du texte à côté d'elle. ";
const PAGE = `<!doctype html><html lang="fr"><body style="margin:0;font:18px/1.5 sans-serif;padding:40px">
<h1>Une page</h1><p>${text.repeat(4)}</p><p id="cible" style="width:300px;margin:30px 0">Le texte qui déborde.</p><p>${text.repeat(4)}</p>
<p id="autre" style="width:300px;margin:30px 0 0 600px">Un autre texte douteux.</p></body></html>`;
const stored = (page) => evaluate(page, `JSON.parse(sessionStorage.getItem("horama"))`);

test("l'expression vient avant le trait, la mascotte se pose près de la zone, l'expression reste jusqu'au geste suivant", async () => {
  const server = createServer((request, response) => response.end(PAGE)).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-trait-expression-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const page = await connectTab(PORT);
  try {
    await installLayer(page, () => {}, { passage: "essai-trait-expression", titre: "Horama" });
    await fitViewport(page);
    await navigate(page, `http://127.0.0.1:${server.address().port}/`);
    await clickAt(page, { x: 900, y: 120 }); // a first gesture of H, far from the zone
    await sleep(1500);
    await layer(page, "etat", "observe");
    const [zone] = await layer(page, "element", "#cible");
    const drawing = layer(page, "surligner", "/", [zone], "defaut", "cible", null, false);
    await sleep(150);
    assert.equal((await stored(page)).etat, "trouve", "l'expression est posée avant le trait");
    await drawing;
    const drawnAt = Date.now();
    const { mascot } = await stored(page);
    const [mx, my] = [mascot.x + 48, mascot.y + 48];
    const gap = Math.hypot(Math.max(zone.x - mx, 0, mx - (zone.x + zone.largeur)), Math.max(zone.y - my, 0, my - (zone.y + zone.hauteur)));
    assert.ok(gap <= 260, `la mascotte se pose près de la zone (${Math.round(gap)} px de son bord)`);
    const onZone = Math.min(mascot.x + 96, zone.x + zone.largeur) > Math.max(mascot.x, zone.x) && Math.min(mascot.y + 96, zone.y + zone.hauteur) > Math.max(mascot.y, zone.y);
    assert.equal(onZone, false, "jamais sur la zone");
    await sleep(800);
    assert.equal((await stored(page)).etat, "trouve", "l'expression reste sans geste de H");
    // Once the stroke is drawn, no text under the mascot (the permission to cover a nearby text ends with the stroke).
    const onText = await evaluate(page, `(() => { const m = JSON.parse(sessionStorage.getItem("horama")).mascot; const range = document.createRange();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const hits = [];
      for (let n; (n = walker.nextNode()); ) { if (!n.nodeValue.trim()) continue; range.selectNodeContents(n);
        for (const b of range.getClientRects()) if (Math.min(m.x + 96, b.right) > Math.max(m.x, b.left) && Math.min(m.y + 96, b.bottom) > Math.max(m.y, b.top)) hits.push(n.nodeValue.trim().slice(0, 20)); }
      return hits; })()`);
    assert.deepEqual(onText, [], "après le trait, la mascotte ne couvre aucun texte");
    await clickAt(page, { x: 900, y: 120 }); // the next gesture of H, before the 3 s
    await sleep(400);
    assert.equal((await stored(page)).etat, "trouve", "gardée 3 s au moins");
    await sleep(Math.max(0, 3000 - (Date.now() - drawnAt)) + 400);
    assert.equal((await stored(page)).etat, "observe", "puis « observe » après le geste de H");

    // Two strokes in a row (review of #190): a gesture of H after stroke A arms a reset; stroke B, drawn before that reset,
    // keeps its own expression for its own 3 s.
    await layer(page, "surligner", "/", [zone], "defaut", "cible-2", null, false);
    const strokeA = Date.now();
    await clickAt(page, { x: 900, y: 120 });
    await sleep(700);
    const [autre] = await layer(page, "element", "#autre");
    await layer(page, "surligner", "/", [autre], "doute", "autre", null, false);
    await sleep(Math.max(0, 3000 - (Date.now() - strokeA)) + 500);
    assert.equal((await stored(page)).etat, "doute", "le délai armé après le trait A n'efface pas l'expression du trait B");

    // A zone that fills the screen: no place free of it, the mascot does not fly onto it.
    const before = (await stored(page)).mascot;
    await layer(page, "surligner", "/", [{ x: 0, y: 0, largeur: 1280, hauteur: 900 }], "defaut", "plein-ecran", null, false);
    assert.deepEqual((await stored(page)).mascot, before, "pas de vol vers une zone qui remplit l'écran");
  } finally {
    page.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
