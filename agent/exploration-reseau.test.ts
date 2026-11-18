import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { createSocket } from "node:dgram";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { connecterCdp } from "./src/exploration/cdp.ts";
import { lireArguments } from "./src/exploration/cli.ts";
import { createPublicFetch, fetchPublic, isPrivateAddress, publicProxyChromeFlags, startPublicProxy, writePublicChromePreferences } from "./src/exploration/reseau.ts";
import type { Lookup } from "./src/exploration/reseau.ts";

// Names resolved without any DNS server: a public-looking name that points at loopback, as a rebinding attacker would.
const names: Record<string, string> = { "rebind.test": "127.0.0.1", "site-public.test": "127.0.0.1", "metadata.test": "169.254.169.254" };
const lookup: Lookup = (hostname, _options, callback) => names[hostname]
  ? callback(null, [{ address: names[hostname], family: 4 }])
  : callback(Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: "ENOTFOUND" }), []);
// Positive cases only: this loopback server plays the public site.
const loopbackIsPublic = (address: string) => address !== "127.0.0.1" && isPrivateAddress(address);

async function listen(handler: Parameters<typeof createServer>[1]) {
  const hits: string[] = [];
  const server = createServer((req, res) => { hits.push(`${req.method} ${req.url}`); handler?.(req, res); });
  server.on("upgrade", (req, socket) => { hits.push(`UPGRADE ${req.url}`); socket.destroy(); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, hits, port: (server.address() as { port: number }).port };
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}

test("private, loopback, link-local, metadata and internal addresses are recognised", () => {
  for (const address of ["127.0.0.1", "127.8.9.10", "0.0.0.0", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a9fe:a9fe", "not-an-ip"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  for (const address of ["8.8.8.8", "93.184.215.14", "172.32.0.1", "172.15.255.255", "2606:4700:4700::1111", "2a00:1450:4007:80e::200e"]) {
    assert.equal(isPrivateAddress(address), false, address);
  }
});

test("public fetch refuses private addresses, names resolving to them and redirects to them, without any request", async () => {
  const secret = await listen((_req, res) => res.end("secret"));
  const site = await listen((req, res) => {
    if (req.url === "/to-metadata") { res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" }).end(); return; }
    if (req.url === "/to-rebind") { res.writeHead(301, { location: `http://rebind.test:${secret.port}/` }).end(); return; }
    if (req.url === "/moved") { res.writeHead(302, { location: "/gzip" }).end(); return; }
    res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" }).end(gzipSync("<main>Public</main>"));
  });
  try {
    const guarded = createPublicFetch({ lookup });
    for (const address of [`http://127.0.0.1:${secret.port}/`, `http://[::1]:${secret.port}/`, `http://2130706433:${secret.port}/`, `http://0x7f.1:${secret.port}/`,
      `http://localhost:${secret.port}/`, `http://app.railway.internal:${secret.port}/`, `http://rebind.test:${secret.port}/`, "http://169.254.169.254/latest/meta-data/",
      "http://metadata.test/", `https://rebind.test:${secret.port}/`]) {
      await assert.rejects(guarded(address), /Adresse privée refusée/, address);
    }
    await assert.rejects(fetchPublic(`http://127.0.0.1:${secret.port}/`), /Adresse privée refusée/);
    const publicSite = createPublicFetch({ lookup, blocked: loopbackIsPublic });
    const page = await publicSite(`http://site-public.test:${site.port}/moved`);
    assert.equal(page.status, 200);
    assert.equal(page.url, `http://site-public.test:${site.port}/gzip`);
    assert.equal(await page.text(), "<main>Public</main>");
    const manual = await publicSite(`http://site-public.test:${site.port}/to-metadata`, { method: "HEAD", redirect: "manual" });
    assert.equal(manual.status, 302);
    assert.equal(manual.ok, false);
    await assert.rejects(publicSite(`http://site-public.test:${site.port}/to-metadata`), /Adresse privée refusée : 169\.254\.169\.254/);
    await assert.rejects(createPublicFetch({ lookup })(`http://site-public.test:${site.port}/to-rebind`), /résolu en 127\.0\.0\.1/);
    assert.deepEqual(secret.hits, []);
    assert.deepEqual(site.hits, ["GET /moved", "GET /gzip", "HEAD /to-metadata", "GET /to-metadata"]);
  } finally { await close(secret.server); await close(site.server); }
});

test("the explorer option is explicit and off by default", () => {
  assert.equal(lireArguments(["--url", "http://localhost:3100"])!.reseauPublic, false);
  assert.equal(lireArguments(["--url", "https://example.test", "--reseau-public"])!.reseauPublic, true);
  assert.throws(() => lireArguments(["--url", "https://example.test", "--reseau-public", "oui"]));
});

function proxied(port: number, request: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, "127.0.0.1", () => socket.write(request));
    let data = "";
    socket.on("data", chunk => { data += chunk; if (/\r\n\r\n/.test(data) && /^HTTP\/1\.1 (?:403|200 Connection)/.test(data)) socket.end(); });
    socket.on("end", () => resolve(data));
    socket.on("close", () => resolve(data));
    socket.on("error", reject);
  });
}

test("the proxy forwards public sites and refuses private targets for plain HTTP and CONNECT", async () => {
  const secret = await listen((_req, res) => res.end("secret"));
  const refused: string[] = [];
  const guard = await startPublicProxy({ lookup, log: message => refused.push(message) });
  const open = await startPublicProxy({ lookup, blocked: loopbackIsPublic });
  try {
    for (const request of [`GET http://127.0.0.1:${secret.port}/ HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n`, "GET http://169.254.169.254/latest/meta-data/ HTTP/1.1\r\nHost: 169.254.169.254\r\n\r\n",
      `GET http://rebind.test:${secret.port}/ HTTP/1.1\r\nHost: rebind.test\r\n\r\n`, `CONNECT 127.0.0.1:${secret.port} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n`,
      `CONNECT rebind.test:${secret.port} HTTP/1.1\r\n\r\n`, `CONNECT [::1]:${secret.port} HTTP/1.1\r\n\r\n`, `GET http://[::ffff:127.0.0.1]:${secret.port}/ HTTP/1.1\r\nHost: x\r\n\r\n`]) {
      assert.match(await proxied(guard.port, request), /^HTTP\/1\.1 403/, request);
    }
    assert.equal(refused.length, 7);
    assert.match(refused.join("\n"), /rebind\.test.*résolu en 127\.0\.0\.1/);
    assert.deepEqual(secret.hits, []);
    assert.match(await proxied(open.port, `GET http://site-public.test:${secret.port}/page HTTP/1.1\r\nHost: site-public.test:${secret.port}\r\nConnection: close\r\n\r\n`), /^HTTP\/1\.1 200[\s\S]*secret$/);
    assert.match(await proxied(open.port, `CONNECT site-public.test:${secret.port} HTTP/1.1\r\n\r\n`), /^HTTP\/1\.1 200 Connection Established/);
    assert.deepEqual(secret.hits, ["GET /page"]);
  } finally { await guard.close(); await open.close(); await close(secret.server); }
});

async function visit(secretPort: number, udpPort: number, flags: string[]) {
  const profile = mkdtempSync(join(tmpdir(), "horama-reseau-chrome-"));
  if (flags.length) writePublicChromePreferences(profile);
  const chrome = spawn(process.env.CHROME_BIN ?? "google-chrome", ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", ...flags, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  let chromePort: number | undefined;
  const local = `127.0.0.1:${secretPort}`;
  const page = `<main>Public</main>
    <img src="http://${local}/img"><script src="http://${local}/script.js"></script><link rel="stylesheet" href="http://169.254.169.254/style.css">
    <iframe src="http://${local}/frame"></iframe><iframe src="http://rebind.test:${secretPort}/frame-rebind"></iframe>
    <script>
      window.results = (async () => {
        const attempt = async (name, run) => { try { return [name, String(await run())]; } catch (error) { return [name, "refusé : " + error.name]; } };
        const socket = url => new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.onopen = () => resolve("ouvert"); ws.onerror = () => reject(new Error("ws")); });
        const xhr = url => new Promise((resolve, reject) => { const request = new XMLHttpRequest(); request.open("GET", url); request.onload = () => resolve(request.status); request.onerror = () => reject(new Error("xhr")); request.send(); });
        const rtc = async () => {
          const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:127.0.0.1:${udpPort}" }] });
          peer.createDataChannel("x"); await peer.setLocalDescription(await peer.createOffer());
          await new Promise(resolve => setTimeout(resolve, 2500)); peer.close(); return "fini";
        };
        return Promise.all([
          attempt("fetch-loopback", () => fetch("http://${local}/fetch").then(r => r.text())),
          attempt("fetch-metadata", () => fetch("http://169.254.169.254/latest/meta-data/").then(r => r.text())),
          attempt("fetch-rebind", () => fetch("http://rebind.test:${secretPort}/fetch-rebind").then(r => r.text())),
          attempt("fetch-ipv6", () => fetch("http://[::1]:${secretPort}/fetch-ipv6").then(r => r.text())),
          attempt("xhr-loopback", () => xhr("http://${local}/xhr")),
          attempt("ws-loopback", () => socket("ws://${local}/ws")),
          attempt("ws-rebind", () => socket("ws://rebind.test:${secretPort}/ws-rebind")),
          attempt("beacon", () => navigator.sendBeacon("http://${local}/beacon", "x")),
          attempt("webrtc", rtc),
        ]);
      })();
    </script>`;
  try {
    chromePort = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Chrome indisponible")), 8000);
      chrome.once("error", error => { clearTimeout(timer); reject(error); });
      chrome.stderr.on("data", chunk => {
        const match = String(chunk).match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      });
    });
    const client = await connecterCdp(chromePort, "about:blank");
    try {
      // The visited page itself is served by CDP, not by the network: only its own requests reach the proxy.
      client.on("Fetch.requestPaused", event => void client.send("Fetch.fulfillRequest", { requestId: event.requestId, responseCode: event.request.url === "http://site-public.test/" ? 200 : 404,
        responseHeaders: [{ name: "content-type", value: "text/html; charset=utf-8" }], body: Buffer.from(event.request.url === "http://site-public.test/" ? page : "").toString("base64") }).catch(() => {}));
      await client.send("Fetch.enable", { patterns: [{ urlPattern: "http://site-public.test/*" }] });
      await client.send("Page.enable");
      await client.send("Page.navigate", { url: "http://site-public.test/" });
      const result = await client.send("Runtime.evaluate", { expression: "(async () => { while (!window.results) await new Promise(r => setTimeout(r, 50)); return await window.results; })()", awaitPromise: true, returnByValue: true });
      const navigation = await client.send("Page.navigate", { url: `http://${local}/navigation` });
      await new Promise(resolve => setTimeout(resolve, 500));
      const shown = await client.send("Runtime.evaluate", { expression: "document.body?.innerText ?? ''", returnByValue: true });
      return { results: Object.fromEntries(result.result.value as Array<[string, string]>), navigation: (navigation.errorText as string | undefined) ?? String(shown.result.value) };
    } finally { try { await client.send("Browser.close"); } catch { /* Chrome already closing. */ } client.close(); }
  } finally {
    if (!chromePort) chrome.kill();
    await new Promise<void>(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once("exit", () => resolve()); });
    rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

test("Chrome behind the proxy: a page's requests to loopback, metadata or a name resolving to loopback get nothing", async () => {
  const secret = await listen((_req, res) => res.end("secret"));
  const udp = createSocket("udp4");
  const stun: number[] = [];
  udp.on("message", message => stun.push(message.length));
  await new Promise<void>(resolve => udp.bind(0, "127.0.0.1", resolve));
  const refused: string[] = [];
  const proxy = await startPublicProxy({ lookup, log: message => refused.push(message) });
  try {
    const { results, navigation } = await visit(secret.port, udp.address().port, publicProxyChromeFlags(proxy.port));
    assert.deepEqual(secret.hits, [], "Aucune requête n'atteint le serveur local.");
    assert.deepEqual(stun, [], "Aucun paquet WebRTC vers le réseau local.");
    for (const name of ["fetch-loopback", "fetch-metadata", "fetch-rebind", "fetch-ipv6", "xhr-loopback", "ws-loopback", "ws-rebind"]) assert.match(results[name], /^refusé/, name);
    assert.match(navigation, /Adresse refusée par Horama|ERR_/, "La navigation vers l'adresse locale affiche le refus.");
    for (const target of [`127.0.0.1:${secret.port}`, "169.254.169.254", `rebind.test:${secret.port}`]) assert.ok(refused.some(line => line.includes(target)), target);
  } finally { await proxy.close(); udp.close(); await close(secret.server); }
});
