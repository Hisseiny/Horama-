// No cookie banner for the whole visit (#208): a real local Chrome (CHROME_BIN), local pages, no network, no H.
// The banner reproduces the one of hcompany.ai (Axeptio, 19/11): an open shadow root, a fixed box of height 0, the
// card in it in position absolute with role="dialog", « No, thanks » whose aria-label says « without accepting ».
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { refuseCookies } from "./src/exploration/cdp.ts";
import { garderSansConsentement, hideConsentForGood } from "./src/exploration/consentement.ts";

const chrome = process.env.CHROME_BIN ?? "google-chrome";
const available = !spawnSync(chrome, ["--version"]).error;

const card = (refusal: boolean) => `<div class="card" role="dialog" style="position:absolute;left:20px;bottom:80px;width:420px;height:253px;background:#fff">
  <h2>We're the cookies</h2><p>We use cookies to measure our audience.</p>
  <div>${refusal ? '<button id="dismiss" aria-label="No, thanks - Close without accepting cookies">No, thanks</button>' : ""}<button id="choose">Let me choose</button><button id="ok">OK!</button></div></div>`;
const banner = (refusal: boolean) => `<div id="overlay" class="axeptio_mount"></div><script>
  const root = document.querySelector("#overlay").attachShadow({ mode: "open" });
  root.innerHTML = '<div class="box" style="position:fixed;left:0;bottom:0;width:100%;height:0">' + ${JSON.stringify(card(refusal))} + "</div>";
  window.clicked = [];
  root.querySelectorAll("button").forEach(button => button.onclick = () => { window.clicked.push(button.id); if (button.id !== "choose") root.querySelector(".box").remove(); });
  document.body.style.overflow = "hidden";
</script>`;
const pages: Record<string, string> = {
  "/refus": `<main><h1>Page</h1></main>${banner(true)}`,
  "/sans-refus": `<main><h1>Page</h1></main>${banner(false)}`,
  "/plateforme": `<main><h1>Page</h1></main><script src="/axeptio/sdk.js"></script>`,
  "/axeptio/sdk.js": "window.platformLoaded = true;",
  "/pied": `<main><h1>Page</h1></main><footer><p>Cookies et vie privée</p><button>Cookie settings</button></footer>
    <header style="position:sticky;top:0"><button>Accept invitation</button></header>`,
};

test("aucun bandeau de cookies pendant tout le passage, sur un vrai Chrome local", { skip: !available && `Chrome absent : ${chrome}`, timeout: 60_000 }, async t => {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://local").pathname;
    response.setHeader("Content-Type", path.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8");
    response.end(path.endsWith(".js") ? pages[path] ?? "" : `<!doctype html><html><body>${pages[path] ?? ""}</body></html>`);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const profile = await mkdtemp(join(tmpdir(), "horama-consentement-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1280,900", "--force-device-scale-factor=1", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  t.after(async () => {
    browser.kill();
    await once(browser, "exit");
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  const endpoint = await new Promise<string>((resolve, reject) => {
    let output = "";
    browser.stderr.on("data", chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) resolve(match[1]); });
    browser.once("exit", code => reject(new Error(`Chrome terminé : ${code}`)));
  });
  const port = Number(new URL(endpoint).port);
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl: string }>).find(item => item.type === "page");
  assert.ok(target);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, "open");
  t.after(() => socket.close());
  let sequence = 0;
  const pending = new Map<number, (value: any) => void>();
  socket.addEventListener("message", event => { const value = JSON.parse(String(event.data)); pending.get(value.id)?.(value.result); pending.delete(value.id); });
  const send = (method: string, params: object = {}) => new Promise<any>(resolve => { const id = ++sequence; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression: string) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  const open = async (path: string) => { await send("Page.navigate", { url: base + path }); await new Promise(resolve => setTimeout(resolve, 600)); };
  const cardShown = `(() => { const card = document.querySelector("#overlay")?.shadowRoot?.querySelector(".card"); if (!card) return false; const box = card.getBoundingClientRect(); return box.width > 0 && box.height > 0; })()`;
  await send("Page.enable");

  await t.test("« No, thanks » dit « without accepting » : c'est un refus, et c'est lui qui est cliqué", async () => {
    await open("/refus");
    assert.equal(await evaluate(cardShown), true);
    assert.equal(await evaluate(`(${refuseCookies.toString()})()`), true);
    assert.deepEqual(await evaluate("window.clicked"), ["dismiss"]);
  });

  await t.test("sans bouton de refus : la carte est masquée pour de bon, le défilement rendu, rien n'est cliqué", async () => {
    await open("/sans-refus");
    assert.equal(await evaluate(`(${refuseCookies.toString()})()`), false);
    assert.equal(await evaluate(`(${hideConsentForGood.toString()})()`), 1);
    assert.equal(await evaluate(cardShown), false);
    assert.equal(await evaluate("getComputedStyle(document.body).overflowY"), "auto");
    assert.deepEqual(await evaluate("window.clicked"), []);
    assert.equal(await evaluate(`(${hideConsentForGood.toString()})()`), 0, "déjà masquée");
  });

  await t.test("un pied de page qui parle de cookies et un en-tête collant sans consentement restent affichés", async () => {
    await open("/pied");
    assert.equal(await evaluate(`(${hideConsentForGood.toString()})()`), 0);
    assert.equal(await evaluate("[...document.querySelectorAll('footer, header')].every(node => getComputedStyle(node).display !== 'none')"), true);
  });

  await t.test("la garde du passage : plateformes bloquées par le réseau, carte retirée dans la seconde sur chaque nouvelle page", async () => {
    const stop = await garderSansConsentement(port);
    t.after(stop);
    await open("/plateforme");
    assert.equal(await evaluate("window.platformLoaded === true"), false, "le script d'une plateforme de consentement ne se charge pas");
    for (const path of ["/sans-refus", "/refus"]) {
      await open(path);
      await new Promise(resolve => setTimeout(resolve, 1600));
      assert.equal(await evaluate(cardShown), false, path);
      assert.equal(await evaluate("window.__horamaConsentement === true"), true, path);
    }
    assert.deepEqual(await evaluate("window.clicked"), ["dismiss"], "sur /refus, le refus est cliqué, jamais OK");
  });
});
