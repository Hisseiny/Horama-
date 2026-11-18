import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { captureDefect, prepareCapture, refuseCookies } from "./src/exploration/cdp.ts";
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
  t.diagnostic("Chrome : refus FR/EN vérifiés, aucune acceptation ni soumission.");

  const surface = { ...client, close() {} };
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
    assert.equal(expressions.at(-1), "window.scrollTo(0, 200)");
  }
});
