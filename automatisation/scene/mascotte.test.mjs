// The mascot of Inès in the layer (docs/da/mascotte/, PR #116): six expressions, same size and same place, the
// names of the first skeleton still understood, « hesite » while the arrow travels to a click of the agent, « fini » when
// the summary opens, « bloquee » kept by it. A real Chrome, a local page, no network, no H.
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
const CORNER = { left: 1140, top: 760, right: 1276, bottom: 896 }; // around the first corner of the mascot (1160, 780, 96 px)
const OUT = process.env.MASCOTTE_CAPTURES;

const shot = async (page) => PNG.sync.read(Buffer.from((await page.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
// The box of the drawing in the corner: pixels that are not the white of the page.
const drawn = (image) => {
  let left = 1e9, top = 1e9, right = -1, bottom = -1;
  for (let y = CORNER.top; y < CORNER.bottom; y++) for (let x = CORNER.left; x < CORNER.right; x++) {
    const i = (y * image.width + x) * 4;
    if (image.data[i] < 245 || image.data[i + 1] < 245 || image.data[i + 2] < 245) [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
  }
  return { left, top, right, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
};
const crop = (image) => {
  const out = new PNG({ width: CORNER.right - CORNER.left, height: CORNER.bottom - CORNER.top });
  PNG.bitblt(image, out, CORNER.left, CORNER.top, out.width, out.height, 0, 0);
  return PNG.sync.write(out);
};
const etat = (page) => evaluate(page, `JSON.parse(sessionStorage.getItem("horama")).etat`);

test("les six expressions d'Inès : même taille, même place ; anciens noms ; hésite au clic ; fini ou bloquée au récapitulatif", async () => {
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
      boxes[name] = drawn(image);
      images[name] = crop(image);
      if (OUT) writeFileSync(join(OUT, `${name}.png`), images[name]);
    }
    // Six different drawings, all in the corner, the centre of each within 6 px of the one of « observe »: no jump.
    assert.equal(new Set(Object.values(images).map((png) => png.toString("base64"))).size, 6);
    for (const name of EXPRESSIONS) {
      assert.ok(boxes[name].right > 0, `${name} dessinée dans le coin`);
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
    const first = crop(await shot(page));
    await sleep(240);
    assert.notEqual(crop(await shot(page)).toString("base64"), first.toString("base64"), "la mascotte bouge");

    // The pupil follows the arrow: animations stopped, the arrow far on the left then far up; only the eye changes.
    await page.send("Animation.setPlaybackRate", { playbackRate: 0 });
    const clickAndWait = async (x, y) => {
      for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
      await sleep(1300);
      return PNG.sync.read(crop(await shot(page)));
    };
    const left = await clickAndWait(40, 830);
    const up = await clickAndWait(1208, 40);
    let changed = 0, outside = 0;
    for (let y = 0; y < left.height; y++) for (let x = 0; x < left.width; x++) {
      const i = (y * left.width + x) * 4;
      if (left.data[i] !== up.data[i] || left.data[i + 1] !== up.data[i + 1] || left.data[i + 2] !== up.data[i + 2]) {
        changed++;
        // The box of the mascot starts at (20, 20) in the crop; its eye, a circle of radius 20 around (48, 48).
        if (Math.hypot(x - 20 - 48, y - 20 - 48) > 22) outside++;
      }
    }
    assert.ok(changed > 20, `la pupille a bougé (${changed} pixels)`);
    assert.equal(outside, 0, "seul l'œil change");
    await page.send("Animation.setPlaybackRate", { playbackRate: 1 });

    // A click of the agent: « hesite » while the arrow travels, then back to « observe ».
    await layer(page, "etat", "observe");
    await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 900, y: 600, button: "left", clickCount: 1 });
    await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 900, y: 600, button: "left", clickCount: 1 });
    await sleep(80);
    assert.equal(await etat(page), "hesite", "pendant le trajet de la flèche jusqu'au clic");
    if (OUT) writeFileSync(join(OUT, "hesite-au-clic.png"), PNG.sync.write(await shot(page)));
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
