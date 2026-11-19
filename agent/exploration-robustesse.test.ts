import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { captureDefect, hideCaptureOverlays, prepareCapture, refuseCookies } from "./src/exploration/cdp.ts";
import type { ExplorationCdp } from "./src/exploration/cdp.ts";
import type { CdpClient } from "./src/exploration/controles.ts";
import { controlerPage } from "./src/exploration/controles.ts";

const chrome = process.env.CHROME_BIN ?? "google-chrome";
const available = !spawnSync(chrome, ["--version"]).error;

test("refus des cookies sur de vraies pages Chrome locales", { skip: !available && `Chrome absent : ${chrome}`, timeout: 60_000 }, async t => {
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end("<!doctype html><html><body>Local page</body></html>");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const profile = await mkdtemp(join(tmpdir(), "horama-controles-"));
  const process = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1280,900", "--force-device-scale-factor=1", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  t.after(async () => {
    process.kill();
    await once(process, "exit");
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  const endpoint = await new Promise<string>((resolve, reject) => {
    let output = "";
    process.stderr.on("data", chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) resolve(match[1]);
    });
    process.once("exit", code => reject(new Error(`Chrome terminé : ${code}`)));
  });
  const port = new URL(endpoint).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const target = targets.find(target => target.type === "page");
  assert.ok(target);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, "open");
  t.after(() => socket.close());
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const listeners = new Map<string, (value: any) => void>();
  socket.addEventListener("message", event => {
    const value = JSON.parse(String(event.data));
    if (value.id) {
      const promise = pending.get(value.id);
      pending.delete(value.id);
      if (value.error) promise?.reject(new Error(value.error.message));
      else promise?.resolve(value.result);
    } else listeners.get(value.method)?.(value.params);
  });
  const client: CdpClient = {
    send(method, params) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); },
    on(event, listener) { listeners.set(event, listener); },
  };
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  const navigate = async (path: string) => {
    const loaded = new Promise<void>(resolve => client.on("Page.loadEventFired", () => resolve()));
    await client.send("Page.navigate", { url: `${base}${path}` });
    await loaded;
  };

  await navigate("/");
  const cases = [
    { html: '<section aria-label="Cookies"><button type="button"> TOUT REFUSER </button><button>Accepter</button></section>', clicked: true },
    { html: '<section class="privacy"><button>Continuer sans accepter</button></section>', clicked: true },
    { html: '<section id="consent"><button>Nécessaires uniquement</button></section>', clicked: true },
    { html: '<section class="gdpr"><a href="#refused">Reject all</a></section>', clicked: true },
    { html: '<section id="cookies"><button>Accept all</button></section>', clicked: false },
    { html: '<section id="cookies"><form><button type="submit">Reject all</button></form></section>', clicked: false },
    { html: '<section id="cookies"><form><button>Refuser</button></form></section>', clicked: false },
    { html: '<main><button>Refuser</button></main>', clicked: false },
    { html: '<main>Welcome</main>', clicked: false },
    { html: '<section id="cookies"><button style="display:none">Refuser</button></section>', clicked: false },
    { html: '<section><p>Stockage de cookies</p><button aria-label="Fermer"></button><button>Autoriser tous les cookies</button></section>', clicked: false },
    { html: '<section aria-label="Consentement"><button title="Close banner"></button></section>', clicked: false },
    { html: '<section><p>Cookies</p><button><span>×</span></button></section>', clicked: false },
    { html: '<section><p>Cookies</p><a href="#">✕</a></section>', clicked: false },
    { html: '<main><button aria-label="Fermer">×</button></main>', clicked: false },
    { html: '<div><nav><button aria-label="Fermer">×</button></nav><main>Page</main><section><p>Cookies</p><button>Autoriser tous les cookies</button></section></div>', clicked: false },
    { html: '<section><p>Cookies</p><button aria-label="Fermer la bannière de consentement"></button></section>', clicked: false },
    { html: '<section><p>Cookies</p><button aria-label="Fermer">Autoriser tous les cookies</button></section>', clicked: false },
    { html: '<section><p>Cookies</p><button title="Accept all cookies">×</button></section>', clicked: false },
    { html: '<section style="opacity:0"><p>Cookies</p><button>×</button></section>', clicked: false },
    { html: '<section><p>Cookies</p><form><button aria-label="Fermer">×</button></form></section>', clicked: false },
    { html: '<section><p>Datenschutz und Einwilligung</p><button>Ablehnen</button><button>Akzeptieren</button></section>', clicked: true },
    { html: '<section><p>Datenschutz</p><button>Akzeptieren</button></section>', clicked: false },
  ];
  for (const entry of cases) {
    await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(entry.html)};
      window.clicks = 0; window.submits = 0;
      document.querySelectorAll("button,a").forEach(element => element.addEventListener("click", event => { window.clicks++; event.preventDefault(); }));
      document.querySelectorAll("form").forEach(form => form.addEventListener("submit", event => { window.submits++; event.preventDefault(); }));` });
    const result = await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true });
    assert.equal(result.result.value, entry.clicked, entry.html);
    const counts = await client.send("Runtime.evaluate", { expression: "[window.clicks, window.submits]", returnByValue: true });
    assert.deepEqual(counts.result.value, [entry.clicked ? 1 : 0, 0]);
  }
  t.diagnostic("Chrome : refus FR/EN/DE vérifiés, aucune acceptation, fermeture ambiguë ni soumission.");

  await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<section><p>Cookies</p><button id="close">×</button><button id="reject">Refuser</button></section>'; window.selected = ''; document.querySelectorAll('button').forEach(button => button.onclick = () => { window.selected = button.id; });` });
  await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()` });
  assert.equal((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, "reject");

  await t.test("fermeture arrêtée par une fenêtre newsletter distincte de la bannière cookies", async () => {
    for (const [tag, boundary] of [["section", 'style="position:fixed"'], ["section", 'style="position:sticky"'], ["section", 'role="dialog"'], ["section", 'role="alertdialog"'], ["section", 'aria-modal="true"'], ["dialog", "open"]]) {
      for (const withCookieClose of [true, false]) {
        const html = `<div><${tag} ${boundary} aria-label="Newsletter"><div><button id="newsletter-close" aria-label="Fermer"><span>×</span></button></div><input type="email"><button>S'inscrire</button></${tag}><section aria-label="Cookies"><p>Stockage de cookies</p>${withCookieClose ? '<div><button id="cookie-close" title="Close">✕</button></div>' : ''}<button>Autoriser tous les cookies</button></section></div>`;
        await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(html)}; window.selected = ''; document.querySelectorAll('button').forEach(button => button.onclick = () => { window.selected = button.id || 'other'; });` });
        const result = await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true });
        assert.equal(result.result.value, false);
        assert.equal((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, "");
      }
    }
  });

  await t.test("croix dans un en-tête Préférences sans texte de consentement", async () => {
    await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<section style="position:fixed"><header><button>Préférences</button><button id="close" aria-label="Fermer">×</button></header><p>Stockage de cookies</p><button>Autoriser tous les cookies</button></section>'; window.selected = ''; document.querySelectorAll('button').forEach(button => button.onclick = () => { window.selected = button.id || 'other'; });` });
    const result = await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true });
    assert.equal(result.result.value, false);
    assert.equal((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, "");
  });

  const surface = { ...client, close() {} };
  await t.test("racines d'ombre ouvertes imbriquées : refus et masquage réversible sans acceptation", async () => {
    for (const fixedHost of [true, false]) {
      for (const refusal of [true, false]) {
        const setup = await client.send("Runtime.evaluate", { expression: `(() => { document.body.innerHTML = '<div id="host"></div>'; window.selected = [];
          const host = document.querySelector('#host');
          host.style.cssText = ${JSON.stringify(fixedHost ? 'position:fixed;bottom:20px;left:20px;width:400px;height:200px' : '')};
          const root = host.attachShadow({mode:'open'});
          root.innerHTML = '<div id="nested"></div>';
          const nested = root.querySelector('#nested').attachShadow({mode:'open'});
          nested.innerHTML = ${JSON.stringify(`<aside id="banner" style="${fixedHost ? '' : 'position:fixed;bottom:20px;left:20px;'}width:400px;height:200px"><p>Cookies</p><button id="ok">OK</button><button id="choose">Let me choose</button>${refusal ? '<button id="reject">No, thanks</button>' : ''}</aside>`)};
          nested.querySelectorAll('button').forEach(button => button.onclick = () => window.selected.push(button.id));
          window.shadowBanner = nested.querySelector('#banner'); })()` });
        assert.equal(setup.exceptionDetails, undefined, JSON.stringify(setup.exceptionDetails));
        assert.equal((await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true })).result.value, refusal, `fixedHost=${fixedHost}, refusal=${refusal}`);
        assert.deepEqual((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, refusal ? ["reject"] : []);
        const restore = await hideCaptureOverlays(surface);
        assert.equal((await client.send("Runtime.evaluate", { expression: "getComputedStyle(window.shadowBanner).visibility", returnByValue: true })).result.value, "hidden");
        await restore();
        assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[getComputedStyle(window.shadowBanner).visibility, window.selected]", returnByValue: true })).result.value, ["visible", refusal ? ["reject"] : []]);
      }
    }
  });
  await t.test("refus ambigus : ne pas confondre newsletter et consentement voisin", async () => {
    for (const label of ["No, thanks", "No thanks", "Non merci", "Nein danke"]) {
      for (const container of ['style="position:fixed;top:100px"', 'style="position:sticky;top:100px"', 'role="dialog"', 'role="alertdialog"', '']) {
        for (const cookies of [true, false]) {
          await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(`<main><section ${container}><p>Newsletter</p><div><button id="newsletter">${label}</button></div></section>${cookies ? '<aside style="position:fixed;bottom:20px"><p>Cookies</p><button id="cookies">Refuser</button></aside>' : ''}</main>`)};
            window.selected = []; document.querySelectorAll('button').forEach(button => button.onclick = () => { window.selected.push(button.id); button.parentElement.remove(); });` });
          assert.equal((await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true })).result.value, cookies, `${label}, ${container}, cookies=${cookies}`);
          assert.deepEqual((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, cookies ? ["cookies"] : []);
        }
      }
    }
    assert.equal(await prepareCapture(surface), "aucune");
  });
  await t.test("carte cookies à 20 px du bord : refus explicite puis masquage de repli réversible", async () => {
    for (const label of ["No, thanks", "No thanks", "Non merci", "Nein danke"]) {
      await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(`<aside id="banner" style="position:fixed;bottom:20px;left:20px;width:400px;height:200px;visibility:visible!important"><p>We're the cookies</p><button id="choose">Let me choose</button><button id="ok">OK</button><button id="accept">Accept</button><button id="reject">${label}</button></aside>`)};
        window.selected = []; document.querySelectorAll('button').forEach(button => button.onclick = () => window.selected.push(button.id));` });
      assert.equal((await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true })).result.value, true, label);
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, ["reject"], label);
      const restore = await hideCaptureOverlays(surface);
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[getComputedStyle(document.querySelector('#banner')).visibility, window.selected]", returnByValue: true })).result.value, ["hidden", ["reject"]], label);
      await restore();
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[document.querySelector('#banner').style.getPropertyValue('visibility'), document.querySelector('#banner').style.getPropertyPriority('visibility'), window.selected]", returnByValue: true })).result.value, ["visible", "important", ["reject"]], label);
    }
    await client.send("Runtime.evaluate", { expression: "document.querySelector('#reject').remove(); window.selected = [];" });
    assert.equal((await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true })).result.value, false);
    assert.deepEqual((await client.send("Runtime.evaluate", { expression: "window.selected", returnByValue: true })).result.value, []);
    for (const margin of [48, 49]) {
      await client.send("Runtime.evaluate", { expression: `document.querySelector('#banner').style.bottom = '${margin}px';` });
      const restore = await hideCaptureOverlays(surface);
      assert.equal((await client.send("Runtime.evaluate", { expression: "getComputedStyle(document.querySelector('#banner')).visibility", returnByValue: true })).result.value, margin === 48 ? "hidden" : "visible");
      await restore();
    }
  });
  await t.test("masquage générique réversible sans clic et fermeture du menu par Échap", async () => {
    for (const [position, edge, text] of [["fixed", "bottom:0", "Cookies and privacy"], ["sticky", "top:0", "Consentement et confidentialité"], ["fixed", "top:0", "Datenschutz und Einwilligung"]]) {
      await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(`<div id="banner" style="position:${position};${edge};height:80px;width:100%;visibility:visible!important">${text}<form><button>Accept all</button></form></div><main>Privacy policy in the page</main><div id="newsletter" style="position:fixed;bottom:0;right:0">Newsletter</div><div id="middle" style="position:fixed;top:200px">Cookies</div><div id="menu">Menu</div>`)};
        window.clicked = 0; document.onclick = () => window.clicked++;
        document.onkeydown = event => { if (event.key === 'Escape') document.querySelector('#menu').hidden = true; };` });
      const logs: string[] = [];
      const restore = await hideCaptureOverlays(surface, message => logs.push(message));
      const state = await client.send("Runtime.evaluate", { expression: "[getComputedStyle(document.querySelector('#banner')).visibility, getComputedStyle(document.querySelector('main')).visibility, getComputedStyle(document.querySelector('#newsletter')).visibility, getComputedStyle(document.querySelector('#middle')).visibility, document.querySelector('#menu').hidden, window.clicked]", returnByValue: true });
      assert.deepEqual(state.result.value, ["hidden", "visible", "visible", "visible", true, 0]);
      assert.equal(logs.length, 1);
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      assert.ok(shot.data.length > 100);
      await restore();
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[document.querySelector('#banner').style.getPropertyValue('visibility'), document.querySelector('#banner').style.getPropertyPriority('visibility'), window.clicked]", returnByValue: true })).result.value, ["visible", "important", 0]);
    }
    for (const control of ['<button>Tout accepter</button>', '<a href="#">Paramétrer</a>', '<div role="button">Personnaliser</div>', '<button aria-label="Reject all"></button>', '<button>Decline</button>', '<a href="#">Manage cookies</a>', '<button>Akzeptieren</button>', '<button>Ablehnen</button>', '<button>Einstellungen</button>']) {
      await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(`<aside id="banner" style="position:fixed;bottom:0">Cookies et consentement ${control}</aside>`)};` });
      const restore = await hideCaptureOverlays(surface);
      assert.equal((await client.send("Runtime.evaluate", { expression: "getComputedStyle(document.querySelector('#banner')).visibility", returnByValue: true })).result.value, "hidden", control);
      await restore();
    }
    await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<header style="position:sticky;top:0"><a href="#">Products</a> <a href="#">Pricing</a> <a href="#">Privacy</a></header><footer style="position:fixed;bottom:0"><a href="#">Datenschutz</a></footer>'; window.clicked = 0; document.onclick = () => window.clicked++;` });
    const restoreNavigation = await hideCaptureOverlays(surface, () => assert.fail("La navigation ne doit pas être masquée"));
    assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[...document.querySelectorAll('header,footer')].map(element => getComputedStyle(element).visibility)", returnByValue: true })).result.value, ["visible", "visible"]);
    await restoreNavigation();
    assert.equal((await client.send("Runtime.evaluate", { expression: "window.clicked", returnByValue: true })).result.value, 0);
    await client.send("Runtime.evaluate", { expression: "document.body.innerHTML = '<main>Page sans bandeau</main>'" });
    const restore = await hideCaptureOverlays(surface, () => assert.fail("Aucun bandeau à journaliser"));
    await restore();
  });
  await t.test("bandeaux d'acceptation seule : masquage sans refus ni clic", async () => {
    for (const label of ["Autoriser", "Tout autoriser", "Allow", "Allow all", "Agree", "I agree", "J'accepte", "Zustimmen", "Erlauben", "Alle erlauben"]) {
      await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(`<aside id="banner" style="position:fixed;bottom:0">Cookies <button>${label}</button></aside>`)}; window.clicked = 0; document.onclick = () => window.clicked++;` });
      assert.equal((await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true })).result.value, false, label);
      const restore = await hideCaptureOverlays(surface);
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[getComputedStyle(document.querySelector('#banner')).visibility, window.clicked]", returnByValue: true })).result.value, ["hidden", 0], label);
      await restore();
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[getComputedStyle(document.querySelector('#banner')).visibility, window.clicked]", returnByValue: true })).result.value, ["visible", 0], label);
    }
  });
  await t.test("carte à 20 px : choix de consentement masqué sans clic, OK seul ignoré", async () => {
    for (const label of ["Let me choose", "Laissez-moi choisir", "Cookie settings", "Paramètres des cookies", "Gérer les cookies", "Choisir", "Options", ""]) {
      await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = ${JSON.stringify(`<aside id="banner" style="position:fixed;bottom:20px;left:20px">Cookies <button>OK</button>${label ? `<button>${label}</button>` : ''}</aside>`)}; window.clicked = 0; document.onclick = () => window.clicked++;` });
      assert.equal((await client.send("Runtime.evaluate", { expression: `(${refuseCookies.toString()})()`, returnByValue: true })).result.value, false, label);
      const restore = await hideCaptureOverlays(surface);
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[getComputedStyle(document.querySelector('#banner')).visibility, window.clicked]", returnByValue: true })).result.value, [["", "Choisir", "Options"].includes(label) ? "visible" : "hidden", 0], label);
      await restore();
      assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[getComputedStyle(document.querySelector('#banner')).visibility, window.clicked]", returnByValue: true })).result.value, ["visible", 0], label);
    }
    await client.send("Runtime.evaluate", { expression: "document.body.innerHTML = '<header style=\"position:sticky;top:0\"><a href=\"#\">Privacy</a><button>Options</button></header>';" });
    const restore = await hideCaptureOverlays(surface, () => assert.fail("La navigation ne doit pas être masquée"));
    assert.equal((await client.send("Runtime.evaluate", { expression: "getComputedStyle(document.querySelector('header')).visibility", returnByValue: true })).result.value, "visible");
    await restore();
  });
  await t.test("bannière apparue pendant la stabilisation : fermeture avant la capture", async () => {
    await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<main>Page locale</main>'; window.accepted = 0; setTimeout(() => {
      document.body.insertAdjacentHTML('beforeend', '<section id="late"><p>Stockage de cookies</p><button>Refuser</button><button id="accept">Autoriser tous les cookies</button></section>');
      document.querySelector('#late button').onclick = () => document.querySelector('#late').remove();
      document.querySelector('#accept').onclick = () => { window.accepted++; };
    }, 200);` });
    assert.equal(await prepareCapture(surface), "refusee");
    assert.deepEqual((await client.send("Runtime.evaluate", { expression: "[!!document.querySelector('#late'), window.accepted]", returnByValue: true })).result.value, [false, 0]);
    const capture = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    assert.ok(Buffer.from(capture.data, "base64").length > 100);
  });
  await t.test("body invisible pendant 3 s : contrôles et capture après apparition", async () => {
    await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<main><h1>Contenu prêt</h1><p>Page locale visible après chargement.</p></main>';
      document.body.style.opacity = '0'; setTimeout(() => { document.body.style.opacity = '1'; }, 3000);` });
    const started = Date.now();
    await prepareCapture(surface);
    assert.ok(Date.now() - started >= 3000);
    const inspect = async () => {
      const state = await client.send("Runtime.evaluate", { expression: "getComputedStyle(document.body).opacity", returnByValue: true });
      assert.equal(state.result.value, "1");
    };
    await inspect();
    await controlerPage(client, { fetch: async () => new Response("", { status: 200 }) });
    await inspect();
    const capture = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    assert.ok(Buffer.from(capture.data, "base64").length > 100);
  });
  await t.test("contenu toujours instable : poursuite après la borne de 10 s", async () => {
    await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<main>Changement</main>';
      window.changes = 0; window.changing = setInterval(() => { document.querySelector('main').textContent = 'Changement ' + (++window.changes); }, 100);` });
    const started = Date.now();
    try {
      await prepareCapture(surface);
      const elapsed = Date.now() - started;
      assert.ok(elapsed >= 10000 && elapsed < 13000, `Durée : ${elapsed} ms`);
      await controlerPage(client, { fetch: async () => new Response("", { status: 200 }) });
      const capture = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      assert.ok(Buffer.from(capture.data, "base64").length > 100);
    } finally {
      await client.send("Runtime.evaluate", { expression: "clearInterval(window.changing)" });
    }
  });
  t.diagnostic("Chrome : apparition différée et borne de stabilité vérifiées avant contrôles et capture.");
  await t.test("capture contextuelle avec scroll-behavior smooth : zone dans l'image et restauration immédiate", async () => {
    await client.send("Runtime.evaluate", { expression: `document.documentElement.style.scrollBehavior = 'smooth';
      document.body.innerHTML = '<main style="height:12000px;position:relative"><div id="defect" style="position:absolute;top:9000px;left:30px;width:100px;height:40px;background:red">Défaut</div></main>';
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' });` });
    const bounds = await client.send("Runtime.evaluate", { expression: "(() => { const r = document.querySelector('#defect').getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, largeur: r.width, hauteur: r.height }; })()", returnByValue: true });
    const capture = await captureDefect(surface, bounds.result.value, [0, 0]);
    assert.ok(capture.zone, "la capture doit contenir une zone");
    assert.ok(capture.zone.x >= 0 && capture.zone.x + capture.zone.largeur <= 1280);
    assert.ok(capture.zone.y >= 0 && capture.zone.y + capture.zone.hauteur <= 900);
    const scroll = await client.send("Runtime.evaluate", { expression: "[scrollX, scrollY]", returnByValue: true });
    assert.deepEqual(scroll.result.value, [0, 0]);
  });
  await t.test("capture douce : positions intermédiaires à l'aller et au retour, zone cadrée", async () => {
    await client.send("Runtime.evaluate", { expression: `window.scrollTo({top:0,left:0,behavior:'instant'});
      window.positions = []; window.addEventListener('scroll', () => window.positions.push(scrollY));` });
    const bounds = await client.send("Runtime.evaluate", { expression: "(() => { const r = document.querySelector('#defect').getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, largeur: r.width, hauteur: r.height }; })()", returnByValue: true });
    const capture = await captureDefect(surface, bounds.result.value, [0, 0], { doux: true });
    assert.ok(capture.png.length > 100);
    assert.ok(capture.zone && capture.zone.y >= 0 && capture.zone.y + capture.zone.hauteur <= 900);
    const state = (await client.send("Runtime.evaluate", { expression: "({ y: scrollY, positions: window.positions })", returnByValue: true })).result.value;
    assert.equal(state.y, 0);
    const peak = Math.max(...state.positions);
    const middle = state.positions.indexOf(peak);
    assert.ok(peak > 8000);
    assert.ok(state.positions.slice(0, middle).some((y: number) => y > 0 && y < peak));
    assert.ok(state.positions.slice(middle + 1).some((y: number) => y > 0 && y < peak));
  });
});

test("capture douce : position stable, borne d'attente et retour même en échec", async () => {
  for (const mode of ["stable", "capture-error", "unstable"] as const) {
    let clock = 0, moves = 0, screenshots = 0;
    let scroll = [0, 0];
    const client: ExplorationCdp = { on() {}, close() {}, async send(method, params) {
      if (method === "Page.captureScreenshot") {
        screenshots++;
        if (mode === "capture-error") throw new Error("Capture impossible");
        return { data: Buffer.from("png").toString("base64") };
      }
      const value = await runInNewContext(String((params as Record<string, unknown>)?.expression), {
        Date: { now: () => clock },
        setTimeout: (callback: () => void, ms: number) => { clock += ms; callback(); },
        document: { documentElement: { scrollWidth: 1280, scrollHeight: 900 } },
        window: {
          scrollTo({ left, top, behavior }: { left: number; top: number; behavior: string }) { assert.equal(behavior, "smooth"); moves++; scroll = [left, top]; },
          get scrollX() { return scroll[0]; },
          get scrollY() { return mode === "unstable" && moves === 1 ? ++scroll[1] : scroll[1]; },
        },
      });
      return { result: { value } };
    } };
    const result = captureDefect(client, { x: 10, y: 10, largeur: 100, hauteur: 40 }, [0, 0], { doux: true });
    if (mode === "stable") assert.ok((await result).zone);
    else await assert.rejects(result, mode === "unstable" ? /stabilisé/ : /Capture impossible/);
    assert.equal(moves, 2);
    assert.deepEqual(scroll, [0, 0]);
    assert.equal(screenshots, mode === "unstable" ? 0 : 1);
    assert.equal(clock, mode === "unstable" ? 5200 : 400);
  }
});

test("capture douce : exception CDP de défilement propagée sans capture", async () => {
  let evaluations = 0;
  const client: ExplorationCdp = { on() {}, close() {}, async send(method) {
    assert.equal(method, "Runtime.evaluate");
    return ++evaluations === 1 ? { exceptionDetails: { text: "Défilement interrompu" } } : { result: { value: undefined } };
  } };
  await assert.rejects(captureDefect(client, { x: 0, y: 2000, largeur: 100, hauteur: 40 }, [0, 0], { doux: true }), /Défilement interrompu/);
  assert.equal(evaluations, 2);
});

test("préparation : attend complete ou 15 secondes, puis continue", async () => {
  for (const completeAt of [300, Infinity]) {
    let clock = 0;
    const client: ExplorationCdp = { on() {}, close() {}, async send(_method, params) {
      assert.equal((params as Record<string, unknown> | undefined)?.awaitPromise, true);
      const value = await runInNewContext(String((params as Record<string, unknown> | undefined)?.expression), {
        Date: { now: () => clock },
        setTimeout: (resolve: () => void, ms: number) => { clock += ms; resolve(); },
        document: { get readyState() { return clock >= completeAt ? "complete" : "loading"; }, querySelectorAll: () => [] },
      });
      return { result: { value } };
    } };
    assert.equal(await prepareCapture(client), "aucune");
    assert.equal(clock, (Number.isFinite(completeAt) ? completeAt : 15000) + 10000);
  }
});

test("capture contextuelle : défilement réel, viewport et restauration même en échec", async () => {
  for (const fail of [false, true]) {
    const expressions: string[] = [];
    const client: ExplorationCdp = { on() {}, close() {}, async send(method, params) {
      if (method === "Page.captureScreenshot") {
        assert.equal((params as Record<string, unknown> | undefined)?.captureBeyondViewport, false);
        assert.equal((params as Record<string, unknown> | undefined)?.clip, undefined);
        if (fail) throw new Error("Capture impossible");
        return { data: Buffer.from("png").toString("base64") };
      }
      expressions.push(String((params as Record<string, unknown> | undefined)?.expression));
      return { result: { value: (params as Record<string, unknown> | undefined)?.expression === "[window.scrollX, window.scrollY]" ? [0, 4200] : undefined } };
    } };
    const result = captureDefect(client, { x: 10, y: 4583, largeur: 100, hauteur: 40 }, [0, 200]);
    if (fail) await assert.rejects(result, /Capture impossible/);
    else assert.deepEqual((await result).zone, { x: 10, y: 383, largeur: 100, hauteur: 40 });
    assert.match(expressions[0], /requestAnimationFrame/);
    assert.equal(expressions.at(-1), 'window.scrollTo({ left: 0, top: 200, behavior: "instant" })');
  }
});

test("capture contextuelle : défaut à droite centré horizontalement", async () => {
  let scroll: [number, number] = [0, 0];
  const document = { documentElement: { scrollWidth: 4000, scrollHeight: 2000 } };
  const client: ExplorationCdp = { on() {}, close() {}, async send(method, params) {
    if (method === "Page.captureScreenshot") return { data: Buffer.from("png").toString("base64") };
    const expression = String((params as Record<string, unknown> | undefined)?.expression);
    const value = await runInNewContext(expression, {
      document, window: { scrollTo({ left, top, behavior }: { left: number; top: number; behavior: string }) {
        assert.equal(behavior, "instant"); scroll = [left, top];
      },
        get scrollX() { return scroll[0]; }, get scrollY() { return scroll[1]; } },
      requestAnimationFrame: (callback: () => void) => callback(),
      setTimeout: (callback: () => void) => callback(),
    });
    return { result: { value } };
  } };
  const result = await captureDefect(client, { x: 2500, y: 600, largeur: 100, hauteur: 40 }, [20, 30]);
  assert.deepEqual(result.zone, { x: 590, y: 430, largeur: 100, hauteur: 40 });
  assert.deepEqual(scroll, [20, 30]);
});
