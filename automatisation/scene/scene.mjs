// Scene shared by the T7 probe (sonde-t7.mjs) and the live course (parcours.mjs): the agent's dedicated Chrome, CDP
// over Node's native WebSocket, the Horama layer, our captures.
// From Nami (tag demo-oral-2026-11-08): the Chrome flags and the reuse of a Chrome already listening on the port
// (scripts/lancer-demo.sh), the request/response CDP client (lib/chrome-cdp.ts), Runtime.evaluate in the agent's tab
// (lib/local-chrome.ts). New here: exact page area, layer injected by CDP, captures by Page.captureScreenshot.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

export const WIDTH = 1280;
export const HEIGHT = 900;
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const flag = (name) => process.argv.includes(`--${name}`);
export const option = (name, fallback) => (flag(name) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
const t0 = Date.now();
export const say = (text) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(3)} s] ${text}`);

const http = (port, path, init) => fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(2000), ...init });
const chromeVersion = (port) => http(port, "/json/version").then((response) => response.json(), () => null);

export const CHROME_FLAGS = [
  // Retina: without it, H's clicks land at twice their coordinates (measured on Nami, 2026-11-07).
  "--force-device-scale-factor=1",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-background-timer-throttling",
  "--disable-features=Translate",
  "--no-first-run",
  "--no-default-browser-check",
  // Not in Nami. A visible Chrome converts colours to the profile of its screen: measured on 2026-11-16, 251561 to
  // 298754 pixels differ from the headless references without this flag, 0 with it.
  "--force-color-profile=srgb",
];

// Starts the dedicated Chrome, or reuses the one already listening on the port.
export async function openChrome({ bin, port, profile }) {
  let version = await chromeVersion(port);
  if (version) return { started: false, pid: null, version: version.Browser };
  const child = spawn(bin, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, ...CHROME_FLAGS, "about:blank"], { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 40 && !version; i++) {
    await sleep(500);
    version = await chromeVersion(port);
  }
  if (!version) throw new Error(`Chrome n'a pas ouvert le port ${port}`);
  return { started: true, pid: child.pid, version: version.Browser };
}

export async function closeChrome({ port, pid }) {
  const version = await chromeVersion(port);
  if (version) {
    const browser = await connect(version.webSocketDebuggerUrl);
    await browser.send("Browser.close").catch(() => {});
    browser.close();
  }
  for (let i = 0; i < 20 && (await chromeVersion(port)); i++) await sleep(500);
  if (pid && (await chromeVersion(port))) process.kill(pid, "SIGTERM");
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error("Connexion CDP refusée"));
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id === undefined) return void listeners.get(message.method)?.(message.params);
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry?.reject(new Error(`CDP : ${message.error.message}`));
    else entry?.resolve(message.result);
  };
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => pending.delete(id) && reject(new Error(`CDP sans réponse : ${method}`)), 15_000);
      pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      socket.send(JSON.stringify({ id, method, params }));
    }),
    on: (method, listener) => listeners.set(method, listener),
    close: () => socket.close(),
  };
}

// Keeps a single tab (the agent works in the one tab that is open) and connects to it.
export async function connectTab(port) {
  let tabs = (await (await http(port, "/json")).json()).filter((tab) => tab.type === "page");
  if (!tabs.length) tabs = [await (await http(port, "/json/new?about:blank", { method: "PUT" })).json()];
  for (const tab of tabs.slice(1)) await http(port, `/json/close/${tab.id}`);
  const page = await connect(tabs[0].webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Page.bringToFront");
  return page;
}

export async function evaluate(page, expression) {
  const { result, exceptionDetails } = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

// True as soon as the expression is true in the page. An evaluation that fails (page being replaced) is tried again.
export async function waitFor(page, expression, timeoutMs) {
  const end = Date.now() + timeoutMs;
  do {
    if (await evaluate(page, expression).catch(() => false)) return true;
    await sleep(100);
  } while (Date.now() < end);
  return false;
}

export async function navigate(page, url) {
  await page.send("Page.navigate", { url });
  await waitFor(page, `document.readyState === "complete"`, 15_000);
}

const measure = (page) => evaluate(page, "({ largeur: innerWidth, hauteur: innerHeight, densite: devicePixelRatio })");

// Resizes the real window until the page area is WIDTH x HEIGHT. A window cannot be taller than its screen: when the
// area is not reached, the window is moved to a screen that fits. Then the area is imposed by
// Emulation.setDeviceMetricsOverride whatever the screen (the Mac screen alone only gives 1280 x 862), so that every
// screen gives the same pages and the same captures. The override holds as long as this CDP connection is open, across
// page changes, and is lost when it closes. Its effect on the clicks of H is still to measure.
export async function fitViewport(page) {
  const { windowId } = await page.send("Browser.getWindowForTarget");
  const resize = async () => {
    for (let i = 0; i < 5; i++) {
      const area = await measure(page);
      if (area.largeur === WIDTH && area.hauteur === HEIGHT) break;
      const { bounds } = await page.send("Browser.getWindowForTarget");
      await page.send("Browser.setWindowBounds", {
        windowId,
        bounds: { width: bounds.width + WIDTH - area.largeur, height: bounds.height + HEIGHT - area.hauteur },
      });
      await sleep(400);
    }
    return measure(page);
  };
  await page.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
  const area = await resize();
  if (area.largeur !== WIDTH || area.hauteur !== HEIGHT) {
    const { bounds } = await page.send("Browser.getWindowForTarget");
    const need = { width: bounds.width + WIDTH - area.largeur, height: bounds.height + HEIGHT - area.hauteur };
    const { screenInfos = [] } = await page.send("Emulation.getScreenInfos").catch(() => ({}));
    const screen = screenInfos.find((s) => s.availWidth >= need.width && s.availHeight >= need.height);
    if (screen) {
      await page.send("Browser.setWindowBounds", { windowId, bounds: { left: screen.availLeft, top: screen.availTop, ...need } });
      await sleep(600);
      await resize();
    }
  }
  await page.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  return measure(page);
}

// Puts the Horama layer (couche-horama.js) in every page to come, with the code of rough-notation beside it (nothing
// is fetched by the page). onPress receives what the layer reports at each press of the agent, and again when a held
// click is given back to the page ({ rejoue, retard_ms }); onChoice receives { id, choix } at the end of the course.
// `passage` names the course (the layer forgets what another course left in the tab), `titre` is its banner, `direct`
// leaves the clicks alone instead of holding them while the cursor travels.
export async function installLayer(page, onPress, { passage = "", titre = "", direct = false, onChoice } = {}) {
  await page.send("Runtime.addBinding", { name: "horamaPress" });
  await page.send("Runtime.addBinding", { name: "horamaChoix" });
  page.on("Runtime.bindingCalled", ({ name, payload }) => (name === "horamaPress" ? onPress : name === "horamaChoix" ? onChoice : null)?.(JSON.parse(payload)));
  const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {\n${read("./node_modules/rough-notation/lib/rough-notation.iife.js")};\n${read("./couche-horama.js")}(${JSON.stringify(passage)}, ${JSON.stringify(titre)}, ${JSON.stringify({ direct })}, RoughNotation.annotate);\n})();`,
  });
}

// Calls a command of the layer in the page (window.__horama, see couche-horama.js) and returns what it returns. Tried
// again for a few seconds: the agent may be changing page at that moment.
export async function layer(page, command, ...args) {
  const expression = `window.__horama.${command}(${args.map((arg) => JSON.stringify(arg) ?? "undefined").join(", ")})`;
  for (const end = Date.now() + 5000; ; await sleep(100)) {
    try {
      return await evaluate(page, expression);
    } catch (error) {
      if (Date.now() > end) throw error;
    }
  }
}

// Our own capture of the page, layer hidden. Field names follow Capture of contrats/types.ts.
export async function capture(page) {
  try {
    const seen = await evaluate(page, `(async () => {
      scrollTo(0, 0);
      window.__horama?.masquer();
      await new Promise((done) => { requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 300); });
      return { texte_page: document.body.innerText, url_page: location.href, defilement: [scrollX, scrollY] };
    })()`);
    const { data } = await page.send("Page.captureScreenshot", { format: "png" });
    const png = Buffer.from(data, "base64");
    return { png, largeur: png.readUInt32BE(16), hauteur: png.readUInt32BE(20), ...seen, prise_le: new Date().toISOString() };
  } finally {
    await evaluate(page, "window.__horama?.montrer()").catch(() => {});
  }
}

// A real mouse click at a point of the page, as the agent does (mode --sans-agent only).
export async function clickAt(page, point) {
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  for (const type of ["mousePressed", "mouseReleased"]) {
    await page.send("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
  }
}

// The same click at the centre of an element.
export async function clickCentre(page, selector) {
  const centre = `(() => {
    const box = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
    return box && box.width > 0 && box.height > 0 ? { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) } : null;
  })()`;
  if (!(await waitFor(page, centre, 10_000))) throw new Error(`élément introuvable dans la page : ${selector}`);
  await clickAt(page, await evaluate(page, centre));
}
