import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { controlerPage } from "./src/exploration/controles.ts";
import type { CdpClient } from "./src/exploration/controles.ts";

const chrome = process.env.CHROME_BIN ?? "google-chrome";
const available = !spawnSync(chrome, ["--version"]).error;

test("contrôles mécaniques sur de vraies pages Chrome locales", { skip: !available && `Chrome absent : ${chrome}`, timeout: 60_000 }, async t => {
  const requests: string[] = [];
  const server = createServer(async (request, response) => {
    requests.push(`${request.method} ${request.url}`);
    if (request.url === "/healthy" || request.url === "/broken") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(await readFile(new URL(`./scripts/exploration-pages-essai/${request.url.slice(1)}.html`, import.meta.url)));
    } else if (request.url === "/fallback") {
      response.writeHead(request.method === "HEAD" ? 405 : 200).end("OK");
    } else response.writeHead(request.url === "/error" ? 500 : 404).end("Introuvable");
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
  t.diagnostic("Chrome connecté ; navigation locale.");
  await navigate("/healthy");
  assert.deepEqual(await controlerPage(client), []);
  await navigate("/broken");
  const defects = await controlerPage(client);
  t.diagnostic(`Page défectueuse : ${defects.map(defect => defect.sorte).join(", ")}`);
  for (const kind of ["debordement", "image_cassee", "lien_casse", "texte_erreur", "erreur_console", "defilement_horizontal"]) assert.ok(defects.some(defect => defect.sorte === kind), kind);
  assert.ok(defects.some(defect => defect.valeur === "Erreur de démonstration"));
  assert.ok(defects.some(defect => String(defect.valeur).includes("Exception de démonstration")));
  assert.equal(defects.filter(defect => defect.sorte === "lien_casse").length, 1);
  assert.deepEqual(requests.filter(value => value.endsWith(" /fallback")), ["HEAD /fallback", "GET /fallback"]);
  assert.ok(defects.find(defect => defect.sorte === "debordement")?.zone);
  assert.ok(defects.some(defect => defect.sorte === "debordement" && defect.selecteur === "#overflow"));
  assert.ok(defects.some(defect => defect.sorte === "debordement" && defect.selecteur === "#vertical-overflow"));
  for (const tag of ["html", "body"]) {
    for (const overflow of ["hidden", "clip"]) {
      await client.send("Runtime.evaluate", { expression: `document.querySelector('${tag}').style.overflowX = '${overflow}'` });
      assert.ok(!(await controlerPage(client, { maxLiens: 0 })).some(defect => defect.sorte === "defilement_horizontal"), `${tag} overflow-x: ${overflow}`);
      await client.send("Runtime.evaluate", { expression: `document.querySelector('${tag}').style.overflowX = ''` });
    }
  }
  let active = 0;
  let count = 0;
  await controlerPage(client, { maxLiens: 1, fetch: async () => {
    assert.equal(active++, 0); count++; await Promise.resolve(); active--;
    throw new Error("Réseau indisponible");
  } });
  assert.equal(count, 1);
  await client.send("Runtime.evaluate", { expression: `document.body.append(' undefined '); for (let i = 0; i < 25; i++) { const a = document.createElement('a'); a.href = '/extra-' + i; a.textContent = 'Lien'; document.body.append(a); }` });
  count = 0;
  const limited = await controlerPage(client, { maxLiens: 100, fetch: async () => {
    assert.equal(active++, 0); count++; await Promise.resolve(); active--;
    return new Response(null, { status: 200 });
  } });
  assert.equal(count, 20);
  assert.ok(limited.some(defect => defect.sorte === "texte_erreur" && defect.selecteur === "html > body:nth-child(2)"));
  await navigate("/error");
  assert.ok((await controlerPage(client)).some(defect => defect.sorte === "page_en_erreur" && defect.valeur === 500));
  await navigate("/healthy");
  assert.deepEqual(await controlerPage(client), []);
});
