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
  const stopGuard = await oneTab(port, tabs[0].id, page);
  const close = page.close;
  page.close = () => {
    stopGuard();
    close();
  };
  return page;
}

// One tab only. A link with target=_blank, or window.open, clicked in the tab of the scene would open a second tab in
// front: the tab of the scene goes to the background, where Chrome answers its input and its captures late or not at
// all (measured on 18/11 on an article of albertschool.com: 5,7 s per capture instead of 0,14 s, and up to the 15 s
// limit of CDP in a real passage, issue #91). Such a tab is closed as soon as its address is known, and the address
// opens in the tab of the scene, put back in front. Tabs opened otherwise (by CDP) are left alone.
async function oneTab(port, tabId, page) {
  const version = await chromeVersion(port);
  if (!version?.webSocketDebuggerUrl) return () => {};
  const browser = await connect(version.webSocketDebuggerUrl);
  const handled = new Set();
  const follow = async ({ targetInfo: info }) => {
    if (info.type !== "page" || info.openerId !== tabId || handled.has(info.targetId)) return;
    if (!/^https?:/.test(info.url)) return; // about:blank first: the address comes with Target.targetInfoChanged
    handled.add(info.targetId);
    await browser.send("Target.closeTarget", { targetId: info.targetId }).catch(() => {});
    await page.send("Page.navigate", { url: info.url }).catch(() => {});
    await page.send("Page.bringToFront").catch(() => {});
  };
  browser.on("Target.targetCreated", (params) => void follow(params));
  browser.on("Target.targetInfoChanged", (params) => void follow(params));
  await browser.send("Target.setDiscoverTargets", { discover: true });
  return () => browser.close();
}

async function run(page, expression, context = {}) {
  const { result, exceptionDetails } = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, ...context });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

// Evaluates in the main world of the page, the one of the tested software.
export const evaluate = (page, expression) => run(page, expression);

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

const WORLD = "horama";
const worlds = new WeakMap(); // per tab: its main frame and the id of the world of the layer in its current page

// Puts the Horama layer (couche-horama.js) in every page to come, with the code of rough-notation beside it (nothing
// is fetched by the page). onPress receives what the layer reports at each press of the agent, and again when a held
// click is given back to the page ({ rejoue, retard_ms }); onChoice receives { id, choix } at the end of the course.
// `passage` names the course (the layer forgets what another course left in the tab), `titre` is its banner, `direct`
// leaves the clicks alone instead of holding them while the cursor travels.
// The layer and its two bindings live in an isolated world of the page, named WORLD, as the content script of an
// extension: same DOM (it draws in the page and sees the trusted clicks of the agent), but the code of the tested
// software sees neither window.__horama nor horamaPress nor horamaChoix, so it cannot answer in place of the human.
export async function installLayer(page, onPress, { passage = "", titre = "", direct = false, onChoice } = {}) {
  const { frameTree } = await page.send("Page.getFrameTree");
  const world = { frame: frameTree.frame.id, id: null };
  worlds.set(page, world);
  // The world of the layer is created anew with each document of the main frame: its id is followed here.
  page.on("Runtime.executionContextCreated", ({ context }) => {
    if (context.name === WORLD && context.auxData?.frameId === world.frame) world.id = context.id;
  });
  page.on("Runtime.executionContextDestroyed", ({ executionContextId }) => {
    if (executionContextId === world.id) world.id = null;
  });
  page.on("Runtime.executionContextsCleared", () => (world.id = null));
  for (const name of ["horamaPress", "horamaChoix"]) await page.send("Runtime.addBinding", { name, executionContextName: WORLD });
  page.on("Runtime.bindingCalled", ({ name, payload }) => (name === "horamaPress" ? onPress : name === "horamaChoix" ? onChoice : null)?.(JSON.parse(payload)));
  const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {\n${read("./node_modules/rough-notation/lib/rough-notation.iife.js")};\n${read("./couche-horama.js")}(${JSON.stringify(passage)}, ${JSON.stringify(titre)}, ${JSON.stringify({ direct })}, RoughNotation.annotate, ${JSON.stringify(mascotte())});\n})();`,
    worldName: WORLD,
  });
}

// The five states of the mascot of the charter (docs/da/mascotte/, PR #130), as inline SVG for the layer. Drawn at
// 512 × 512 in the units of mascotte.js (the eye of radius 20 at 48, 48, wings from 2 to 94): shown with the frame
// 0 0 96 96 in the 96 px box of the layer, the eye keeps the size and the place it had.
export const EXPRESSIONS = ["observe", "trouve", "doute", "bloquee", "fini"];
export function mascotte(folder = new URL("../../docs/da/mascotte/", import.meta.url)) {
  return Object.fromEntries(EXPRESSIONS.map((name) => [name, readFileSync(new URL(`${name}.svg`, folder), "utf8")
    .replace(/<\?xml[^>]*>\s*/, "").replace(/<title>[^<]*<\/title>\s*/, "")
    .replace(/<svg\b[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">')]));
}

// Evaluates in the world of the layer, in the current page of the main frame.
const inLayer = (page, expression) => {
  const id = worlds.get(page)?.id;
  if (!id) return Promise.reject(new Error("couche Horama absente de la page"));
  return run(page, expression, { contextId: id });
};

// Calls a command of the layer (window.__horama of its world, see couche-horama.js) and returns what it returns. Tried
// again for a few seconds: the agent may be changing page at that moment.
export async function layer(page, command, ...args) {
  const expression = `window.__horama.${command}(${args.map((arg) => JSON.stringify(arg) ?? "undefined").join(", ")})`;
  for (const end = Date.now() + 5000; ; await sleep(100)) {
    try {
      return await inLayer(page, expression);
    } catch (error) {
      if (Date.now() > end) throw error;
    }
  }
}

// Our own capture of the page, layer hidden. Field names follow Capture of contrats/types.ts.
// beforeCapture (optional, 3rd argument of relever since PR #102): called once the page is still, just before the
// screenshot, layer still hidden; the explorer rechecks the cookie banner there. The text is read again after it.
export async function capture(page, beforeCapture) {
  try {
    await inLayer(page, "window.__horama?.masquer()").catch(() => {});
    // No hover in a capture: the pointer left on a button (last click, or the real mouse over the window) would colour
    // it. Outside the page nothing is hovered (checked on the 7 pages of Eugenia on 17/11); left by the side, not the
    // top, which « exit intent » pop-ups watch. The agent sends the point of each action with it, so the pointer is not
    // put back. Then the transitions (hover, top of page) run out, 1 s at most, collected once they have started.
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: -10, y: 450 }).catch(() => {});
    const seen = await evaluate(page, `(async () => {
      scrollTo(0, 0);
      const frames = () => new Promise((done) => { requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 300); });
      await frames();
      const transitions = document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished.catch(() => {}));
      await Promise.race([Promise.all(transitions), new Promise((done) => setTimeout(done, 1000))]);
      await frames();
      return { texte_page: document.body.innerText, url_page: location.href, defilement: [scrollX, scrollY] };
    })()`);
    if (beforeCapture) {
      await beforeCapture();
      Object.assign(seen, await evaluate(page, "({ texte_page: document.body.innerText, url_page: location.href, defilement: [scrollX, scrollY] })"));
    }
    const { data } = await page.send("Page.captureScreenshot", { format: "png" });
    const png = Buffer.from(data, "base64");
    return { png, largeur: png.readUInt32BE(16), hauteur: png.readUInt32BE(20), ...seen, prise_le: new Date().toISOString() };
  } finally {
    await inLayer(page, "window.__horama?.montrer()").catch(() => {});
  }
}

// The capture of a zone out of the first screen (hook capturerZone of the explorer, PR #85): the page scrolls once,
// smoothly, as the audience sees it, until the zone is in the middle of the screen (the end of the scroll is awaited,
// 1,5 s at most, whatever « scroll-behavior » the site declares); then the layer is hidden and the pointer put out for
// the capture only, and the page stays there: the line around the defect is drawn at that place, with no jump back.
// zone: pixels of the document. Returns the PNG, the zone in pixels of the capture (absent when it is not in the image)
// and the scroll.
export async function captureZone(page, zone) {
  const defilement = await evaluate(page, `(async () => {
    const root = document.documentElement;
    const top = Math.round(Math.max(0, Math.min(${zone.y + zone.hauteur / 2} - innerHeight / 2, root.scrollHeight - innerHeight)));
    scrollTo({ left: 0, top, behavior: "smooth" });
    for (const end = performance.now() + 1500; performance.now() < end && Math.abs(scrollY - top) >= 1; ) await new Promise((done) => setTimeout(done, 50));
    if (Math.abs(scrollY - top) >= 1) scrollTo({ left: 0, top, behavior: "instant" });
    await new Promise((done) => { requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 300); });
    return [scrollX, scrollY];
  })()`);
  try {
    await inLayer(page, "window.__horama?.masquer()").catch(() => {});
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: -10, y: 450 }).catch(() => {});
    await evaluate(page, "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))");
    const { data } = await page.send("Page.captureScreenshot", { format: "png" });
    const png = Buffer.from(data, "base64");
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    const x = Math.max(0, zone.x - defilement[0]);
    const y = Math.max(0, zone.y - defilement[1]);
    const largeur = Math.min(width, zone.x - defilement[0] + zone.largeur) - x;
    const hauteur = Math.min(height, zone.y - defilement[1] + zone.hauteur) - y;
    return { png, ...(largeur > 0 && hauteur > 0 ? { zone: { x, y, largeur, hauteur } } : {}), defilement };
  } finally {
    await inLayer(page, "window.__horama?.montrer()").catch(() => {});
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
