import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import axe from "axe-core";
import { PNG } from "pngjs";
import { auditAccessibility } from "./src/exploration/accessibility.ts";
import { connecterCdp } from "./src/exploration/cdp.ts";

const chrome = process.env.CHROME_BIN ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const available = !spawnSync(chrome, ["--version"]).error;
const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";

test("axe-core sur l’onglet existant, preuves PNG, sans requête ni défilement ajouté", { skip: !available && `Chrome absent : ${chrome}`, timeout: 60_000 }, async t => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url!);
    if (request.url === "/favicon.ico" || request.url === "/lazy.gif") { response.writeHead(404).end(); return; }
    const body = request.url === "/broken" ? `<button id="nameless" style="width:40px;height:40px"></button>
      <p><img id="no-alt" src="${pixel}" width="32" height="32"></p>
      <p id="faint" style="color:#aaa;background:#fff">Texte au contraste insuffisant</p>
      <button id="hidden-label" style="display:none"></button>
      <div style="height:4500px"></div>
      <button id="below" style="width:40px;height:40px"></button>
      <img src="/lazy.gif" loading="lazy" alt="" width="32" height="32">`
      : request.url === "/incomplete" ? '<p id="uncertain" style="color:#555;background-image:linear-gradient(white,#aaa)">Contraste sur un dégradé</p>'
      : request.url === "/keyboard" ? '<div id="scroller" style="overflow:auto;width:120px"><p style="width:500px">Contenu à faire défiler.</p></div>'
      : '<button>Continuer</button><p>Une page lisible.</p>';
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html lang="fr"><title>Essai axe-core</title><body style="color:#111;background:#fff">
      <main><h1>Contrôle d’accessibilité</h1>${body}</main></body></html>`);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const profile = await mkdtemp(join(tmpdir(), "horama-axe-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-background-networking", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "--window-size=1280,900", "--force-device-scale-factor=1", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const exit = once(browser, "exit");
  t.after(async () => { browser.kill(); await exit; await rm(profile, { recursive: true, force: true, maxRetries: 5 }); });
  const port = await new Promise<number>((resolve, reject) => {
    browser.stderr.on("data", chunk => {
      const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/.exec(String(chunk));
      if (match) resolve(Number(match[1]));
    });
    browser.once("exit", code => reject(new Error(`Chrome terminé : ${code}`)));
  });
  const client = await connecterCdp(port, "about:blank");
  t.after(() => client.close());
  await client.send("Page.enable");
  const open = async (path: string) => {
    const loaded = new Promise(resolve => client.on("Page.loadEventFired", resolve));
    const url = base + path;
    await client.send("Page.navigate", { url });
    await loaded;
    return url;
  };
  const evaluate = async (expression: string) => (await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

  const broken = await open("/broken");
  await evaluate("new Promise(resolve => setTimeout(resolve, 150))"); // Requête initiale du favicon.
  const before = [...requests];
  const captures: Buffer[] = [];
  const save = (png: Buffer) => { captures.push(png); return `captures/${captures.length}.png`; };
  const result = await auditAccessibility(client, broken, save);
  assert.equal(result.statut, "analyse", result.raison ?? "");
  assert.deepEqual(result.violations.map(item => [item.regle, item.element]).sort(), [
    ["button-name", "#below"], ["button-name", "#nameless"], ["color-contrast", "#faint"], ["image-alt", "#no-alt"],
  ]);
  assert.equal(result.graves_sans_preuve, 0);
  assert.ok(result.violations.every(item => item.statut === "VERIFIED_FAIL" && item.html.includes(item.element.slice(1)) && item.capture));
  for (const capture of captures) {
    const { data } = PNG.sync.read(capture);
    assert.ok(data.indexOf(Buffer.from([255, 42, 104, 255])) >= 0);
  }
  assert.deepEqual(requests, before);
  assert.equal(await evaluate("scrollY"), 0);
  assert.equal(await evaluate("typeof window.axe"), "undefined");

  const healthy = await auditAccessibility(client, await open("/healthy"), save);
  assert.equal(healthy.statut, "analyse", healthy.raison ?? "");
  assert.deepEqual(healthy.violations, []);
  assert.equal(healthy.mineures_moderees + healthy.graves_sans_preuve, 0);

  const incomplete = await open("/incomplete");
  await evaluate(axe.source);
  assert.ok(await evaluate("axe.run().then(result => result.incomplete.some(rule => rule.id === 'color-contrast' && rule.nodes.some(node => node.target.includes('#uncertain'))))"));
  const unchecked = await auditAccessibility(client, incomplete, save);
  assert.equal(unchecked.statut, "analyse", unchecked.raison ?? "");
  assert.deepEqual(unchecked.violations, []);
  assert.equal(unchecked.graves_sans_preuve, 0);

  const keyboard = await open("/keyboard");
  await evaluate(axe.source);
  assert.ok(await evaluate("axe.run().then(result => result.violations.some(rule => rule.id === 'scrollable-region-focusable' && rule.nodes.some(node => node.target.includes('#scroller'))))"));
  const review = await auditAccessibility(client, keyboard, save);
  assert.equal(review.statut, "analyse", review.raison ?? "");
  assert.deepEqual(review.violations, []);
  assert.equal(review.graves_sans_preuve, 1);
});
