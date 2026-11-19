// The mascot of the charter in the layer (docs/da/mascotte/, PR #130): five states, same size and same place, the
// names of the first skeleton still understood, « observe » kept while the arrow travels to a click of the agent (no
// « hesite » in the charter), « fini » when the summary opens, « bloquee » kept by it. A real Chrome, a local page, no
// network, no H.
// Run from this folder: node --test mascotte.test.mjs (MASCOTTE_CAPTURES=<dossier> also writes a capture per expression).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PNG } from "pngjs";
import { EXPRESSIONS, closeChrome, connectTab, evaluate, fitViewport, installLayer, layer, mascotte, navigate, openChrome, sleep } from "./scene.mjs";

const PORT = 9344;
const PAGE = `<!doctype html><html><body style="margin:0;background:#fff;height:2000px;font:20px sans-serif">
<button id="bouton" style="position:absolute;left:200px;top:200px;width:200px;height:60px">Un bouton</button></body></html>`;
// Around the mascot where it stands (96 px, 20 px of margin): it keeps beside the arrow, its place is the one the layer
// keeps in the session of the tab.
const around = async (page) => {
  const { x, y } = JSON.parse(await evaluate(page, `sessionStorage.getItem("horama")`)).mascot;
  // Kept inside the page of 1280 × 900: the mascot may stand 8 px from an edge.
  const [left, top] = [Math.max(0, Math.min(x - 20, 1280 - 136)), Math.max(0, Math.min(y - 20, 900 - 136))];
  return { left, top, right: left + 136, bottom: top + 136 };
};
const OUT = process.env.MASCOTTE_CAPTURES;

const shot = async (page) => PNG.sync.read(Buffer.from((await page.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
// The box of the drawing around the mascot: pixels that are not the white of the page.
const drawn = (image, CORNER) => {
  let left = 1e9, top = 1e9, right = -1, bottom = -1;
  for (let y = CORNER.top; y < CORNER.bottom; y++) for (let x = CORNER.left; x < CORNER.right; x++) {
    const i = (y * image.width + x) * 4;
    if (image.data[i] < 245 || image.data[i + 1] < 245 || image.data[i + 2] < 245) [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
  }
  return { left, top, right, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
};
const crop = (image, CORNER) => {
  const out = new PNG({ width: CORNER.right - CORNER.left, height: CORNER.bottom - CORNER.top });
  PNG.bitblt(image, out, CORNER.left, CORNER.top, out.width, out.height, 0, 0);
  return PNG.sync.write(out);
};
const etat = (page) => evaluate(page, `JSON.parse(sessionStorage.getItem("horama")).etat`);

test("les cinq états de la mascotte de la charte : même taille, même place ; anciens noms ; observe au clic ; fini ou bloquée au récapitulatif", async () => {
  const server = createServer((request, response) => response.end(PAGE)).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const profile = mkdtempSync(join(tmpdir(), "horama-mascotte-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const page = await connectTab(PORT);
  if (OUT) mkdirSync(OUT, { recursive: true });
  try {
    assert.deepEqual(Object.keys(mascotte()), EXPRESSIONS);
    await installLayer(page, () => {}, { passage: "essai-mascotte", titre: "Horama" });
    await fitViewport(page);
    await navigate(page, `http://127.0.0.1:${server.address().port}/`);
    await sleep(1500); // the mascot comes beside the arrow
    // The animations of the page and of the layer stop: the frame of each expression is compared still.
    await page.send("Animation.enable");
    await page.send("Animation.setPlaybackRate", { playbackRate: 0 });
    const boxes = {};
    const images = {};
    for (const name of EXPRESSIONS) {
      await layer(page, "etat", name);
      await sleep(300);
      assert.equal(await etat(page), name);
      const image = await shot(page);
      const where = await around(page);
      boxes[name] = drawn(image, where);
      images[name] = crop(image, where);
      if (OUT) writeFileSync(join(OUT, `${name}.png`), images[name]);
    }
    // Five different drawings, all at the same place, the centre of each within 6 px of the one of « observe »: no jump.
    assert.equal(new Set(Object.values(images).map((png) => png.toString("base64"))).size, 5);
    for (const name of EXPRESSIONS) {
      assert.ok(boxes[name].right > 0, `${name} dessinée à sa place`);
      assert.ok(Math.abs(boxes[name].cx - boxes.observe.cx) <= 6 && Math.abs(boxes[name].cy - boxes.observe.cy) <= 6, `${name} ne saute pas (${JSON.stringify(boxes[name])})`);
      assert.ok(boxes[name].right - boxes[name].left <= 96 && boxes[name].bottom - boxes[name].top <= 96, `${name} tient dans les 96 px`);
    }
    // The names of the first skeleton: same drawings.
    for (const [old, name] of [["repos", "observe"], ["verification", "observe"], ["interrogation", "doute"], ["defaut", "trouve"], ["conforme", "fini"]]) {
      await layer(page, "etat", old);
      await sleep(200);
      assert.equal(await etat(page), name, `${old} → ${name}`);
    }
    await page.send("Animation.setPlaybackRate", { playbackRate: 1 });

    // It moves (wings, eye, floating): two captures 240 ms apart differ around the mascot.
    await layer(page, "etat", "observe");
    await sleep(500);
    const still = await around(page);
    const first = crop(await shot(page), still);
    await sleep(240);
    assert.notEqual(crop(await shot(page), still).toString("base64"), first.toString("base64"), "la mascotte bouge");

    // The pupil follows the arrow: animations stopped, the arrow far on the left then far up; the mascot flies beside it
    // each time; seen from the mascot, only the eye changes.
    await page.send("Animation.setPlaybackRate", { playbackRate: 0 });
    const clickAndWait = async (x, y) => {
      for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
      await sleep(2400);
      return PNG.sync.read(crop(await shot(page), await around(page)));
    };
    const left = await clickAndWait(40, 830);
    const up = await clickAndWait(1208, 40);
    // The changed pixels all lie in one disc of the size of the eye (radius 20, 22 with its edge), around their centre:
    // the floating of the mascot, frozen at any moment, moves the eye a few px up or down in the crop.
    const moved = [];
    for (let y = 0; y < left.height; y++) for (let x = 0; x < left.width; x++) {
      const i = (y * left.width + x) * 4;
      if (left.data[i] !== up.data[i] || left.data[i + 1] !== up.data[i + 1] || left.data[i + 2] !== up.data[i + 2]) moved.push([x, y]);
    }
    const changed = moved.length;
    const [cx, cy] = [moved.reduce((sum, [x]) => sum + x, 0) / (changed || 1), moved.reduce((sum, [, y]) => sum + y, 0) / (changed || 1)];
    const outside = moved.filter(([x, y]) => Math.hypot(x - cx, y - cy) > 22).length;
    assert.ok(changed > 20, `la pupille a bougé (${changed} pixels)`);
    assert.equal(outside, 0, `seul l'œil change (${outside} hors du disque, ${changed} changés)`);
    await page.send("Animation.setPlaybackRate", { playbackRate: 1 });

    // A click of the agent: no « hesite » in the charter, the mascot keeps observing while the arrow travels.
    await layer(page, "etat", "observe");
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 900, y: 600, button: "left", clickCount: 1 });
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 900, y: 600, button: "left", clickCount: 1 });
    await sleep(80);
    assert.equal(await etat(page), "observe", "pendant le trajet de la flèche jusqu'au clic");
    if (OUT) writeFileSync(join(OUT, "observe-au-clic.png"), PNG.sync.write(await shot(page)));
    await sleep(1200);
    assert.equal(await etat(page), "observe", "le clic donné");

    // The summary opens: « fini »; after « bloquee », the summary keeps « bloquee ».
    await layer(page, "recap", { titre: "Récapitulatif", lignes: ["Essai."] });
    assert.equal(await etat(page), "fini");
    if (OUT) writeFileSync(join(OUT, "fini-recapitulatif.png"), PNG.sync.write(await shot(page)));
    await layer(page, "panneau");
    await layer(page, "revue", false);
    await layer(page, "etat", "bloquee");
    await layer(page, "recap", { titre: "Récapitulatif", lignes: ["Horama n'a pas pu visiter ce site : ce site bloque les robots."] });
    assert.equal(await etat(page), "bloquee");
    if (OUT) writeFileSync(join(OUT, "bloquee-recapitulatif.png"), PNG.sync.write(await shot(page)));
  } finally {
    page.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
