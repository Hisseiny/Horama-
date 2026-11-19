import type { CdpClient } from "./controles.ts";

export interface ExplorationCdp extends CdpClient { close(): void }

export function maskConsentBanners() {
  const saved: Array<{ element: HTMLElement; value: string; priority: string }> = [];
  for (const element of document.querySelectorAll<HTMLElement>("body *")) {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    if (!["fixed", "sticky"].includes(style.position) || style.visibility !== "visible" || Number(style.opacity) === 0
      || rect.width <= 0 || rect.height <= 0 || rect.height > innerHeight * 0.6 || rect.right <= 0 || rect.left >= innerWidth
      || rect.bottom <= 0 || rect.top >= innerHeight || Math.abs(rect.top) > 48 && Math.abs(rect.bottom - innerHeight) > 48) continue;
    if (!/cookie|consent|privacy|confidentialit|datenschutz|einwilligung/i.test(element.innerText || element.textContent || "")) continue;
    const controls = element.querySelectorAll<HTMLElement>('button, [role="button"], a');
    if (![...controls].some(control => /\b(?:accepter|refuser|parametrer|personnaliser|autoriser|j['’]accepte|accept|reject|decline|manage|customize|preferences|allow|agree|no,?\s+thanks|non\s+merci|nein\s+danke|akzeptieren|ablehnen|einstellungen|zustimmen|erlauben)\b/i.test(
      [control.innerText || control.textContent, control.getAttribute("aria-label"), control.getAttribute("title")].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) continue;
    saved.push({ element, value: element.style.getPropertyValue("visibility"), priority: element.style.getPropertyPriority("visibility") });
    element.style.setProperty("visibility", "hidden", "important");
  }
  return { count: saved.length, restore() {
    for (const { element, value, priority } of saved) {
      if (value) element.style.setProperty("visibility", value, priority);
      else element.style.removeProperty("visibility");
    }
  } };
}

export async function hideCaptureOverlays(client: ExplorationCdp, log: (message: string) => void = () => {}) {
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  const result = await client.send("Runtime.evaluate", { expression: `(${maskConsentBanners.toString()})()` });
  if (result.exceptionDetails) throw new Error("Masquage du consentement impossible.");
  const objectId = result.result?.objectId;
  const restore = async () => {
    if (!objectId) return;
    try { await client.send("Runtime.callFunctionOn", { objectId, functionDeclaration: "function() { this.restore(); }" }); }
    finally { await client.send("Runtime.releaseObject", { objectId }); }
  };
  try {
    if (objectId) {
      const count = await client.send("Runtime.callFunctionOn", { objectId, functionDeclaration: "function() { return this.count; }", returnByValue: true });
      if (count.result?.value > 0) log(`${count.result.value} bandeau(x) de consentement masqué(s) temporairement pour la capture Holo, sans clic.`);
    }
    return restore;
  } catch (error) { await restore(); throw error; }
}

export function refuseCookies(): boolean {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  const refusals = new Set(["tout refuser", "refuser", "refuser tout", "continuer sans accepter", "reject all", "reject", "decline", "deny", "no, thanks", "no thanks", "non merci", "nein danke", "only necessary", "necessary only", "necessaires uniquement", "uniquement les necessaires", "reject all cookies", "refuser tous les cookies", "ablehnen", "alle ablehnen", "nur notwendige", "nur notwendige cookies"]);
  for (const element of document.querySelectorAll<HTMLElement>('button, [role="button"], a')) {
    const text = normalize(element.innerText || element.textContent || "");
    const labels = [text, normalize(element.getAttribute("aria-label") ?? ""), normalize(element.getAttribute("title") ?? "")];
    if (labels.some(label => /accept|autoriser|allow|agree|akzeptier|zustimm/.test(label.replace("continuer sans accepter", "")))) continue;
    if (!labels.some(label => refusals.has(label))) continue;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || style.visibility !== "visible" || style.display === "none") continue;
    let visible = true;
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      if (Number(getComputedStyle(ancestor).opacity) === 0) visible = false;
    }
    if (!visible) continue;
    if (element.matches('[type="submit"]') && "form" in element && element.form) continue;
    if (element instanceof HTMLButtonElement && element.type === "submit" && element.form) continue;
    const ambiguous = labels.some(label => ["no, thanks", "no thanks", "non merci", "nein danke"].includes(label));
    let parent = element.parentElement;
    if (ambiguous) {
      for (let ancestor = parent; ancestor && ancestor !== document.body && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
        if (["fixed", "sticky"].includes(getComputedStyle(ancestor).position) || ancestor.matches('[role="dialog"], [role="alertdialog"]')) {
          parent = ancestor;
          break;
        }
      }
    }
    while (parent && parent !== document.body && parent !== document.documentElement) {
      if (/cookie|consent|rgpd|gdpr|privacy|confidentialit|datenschutz|einwilligung/.test(normalize([parent.textContent, parent.id, parent.className, parent.getAttribute("aria-label")].join(" ")))) {
        element.click();
        return true;
      }
      if (ambiguous) break;
      parent = parent.parentElement;
    }
  }
  return false;
}

export async function dismissCookies(client: ExplorationCdp): Promise<boolean> {
  const result = await client.send("Runtime.evaluate", {
    expression: `(async () => {
      const clicked = (${refuseCookies.toString()})();
      if (clicked) await new Promise(resolve => setTimeout(resolve, 500));
      return clicked;
    })()`, awaitPromise: true, returnByValue: true,
  });
  return result.result?.value === true;
}

export async function waitForVisibleStable(): Promise<void> {
  const deadline = Date.now() + 10000;
  const visible = (element: Element) => {
    for (let parent: Element | null = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  let previous = "";
  while (Date.now() < deadline) {
    try {
      const body = document.body;
      const roots = body ? [...body.children].filter(element => !["SCRIPT", "STYLE", "LINK"].includes(element.tagName)) : [];
      const largest = roots.sort((a, b) => {
        const left = a.getBoundingClientRect(), right = b.getBoundingClientRect();
        return right.width * right.height - left.width * left.height;
      })[0];
      const mains = [...document.querySelectorAll("main, [role=main]")];
      const elements = body ? [body, ...[...body.querySelectorAll("*")].slice(0, 250)] : [];
      const content = elements.filter(element => visible(element) && (element.textContent?.trim() || element.matches("img, svg, canvas, video")));
      const ready = body && visible(body) && (!largest || visible(largest)) && (!mains.length || mains.some(visible)) && content.length > 0;
      const signature = ready ? JSON.stringify([document.documentElement.scrollHeight, body.innerText.slice(0, 4000), body.getElementsByTagName("*").length,
        content.slice(0, 40).map(element => { const rect = element.getBoundingClientRect(); return [element.tagName, Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)]; })]) : "";
      if (signature && signature === previous) return;
      previous = signature;
    } catch { previous = ""; }
    await new Promise(resolve => setTimeout(resolve, Math.min(500, Math.max(0, deadline - Date.now()))));
  }
}

export async function prepareCapture(client: ExplorationCdp): Promise<"refusee" | "aucune"> {
  const result = await client.send("Runtime.evaluate", {
    expression: `(async () => {
      const deadline = Date.now() + 15000;
      while (document.readyState !== "complete" && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      let clicked = (${refuseCookies.toString()})();
      if (clicked) await new Promise(resolve => setTimeout(resolve, 500));
      await (${waitForVisibleStable.toString()})();
      if ((${refuseCookies.toString()})()) {
        clicked = true;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return clicked;
    })()`, awaitPromise: true, returnByValue: true,
  });
  return result.result?.value === true ? "refusee" : "aucune";
}

export interface PageLink { texte: string; href: string; visible: boolean }
export function pageLinks(): PageLink[] {
  const links: PageLink[] = [];
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const texte = (anchor.innerText || anchor.textContent || anchor.getAttribute("aria-label") || anchor.title || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!texte || !/^https?:/.test(anchor.href)) continue;
    const rect = anchor.getBoundingClientRect();
    links.push({ texte, href: anchor.href, visible: rect.width > 0 && rect.height > 0 && getComputedStyle(anchor).visibility === "visible" });
  }
  return links.slice(0, 500);
}
export async function readLinks(client: ExplorationCdp): Promise<PageLink[]> {
  const result = await client.send("Runtime.evaluate", { expression: `(${pageLinks.toString()})()`, returnByValue: true });
  return Array.isArray(result.result?.value) ? result.result.value : [];
}

async function scrollSmooth(left: number, top: number): Promise<void> {
  window.scrollTo({ left, top, behavior: "smooth" });
  const deadline = Date.now() + 5000;
  let previous = [window.scrollX, window.scrollY], stable = 0;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const current = [window.scrollX, window.scrollY];
    stable = current.every((value, index) => Math.abs(value - previous[index]) < 0.5) ? stable + 1 : 0;
    if (stable >= 4) return;
    previous = current;
  }
  throw new Error("Le défilement doux ne s'est pas stabilisé en 5 secondes.");
}

export async function captureDefect(client: ExplorationCdp, zone: { x: number; y: number; largeur: number; hauteur: number }, scroll: [number, number], options: { doux?: boolean } = {}) {
  const evaluate = async (expression: string) => {
    const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (options.doux && result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  };
  try {
    if (options.doux) {
      await evaluate(`(${scrollSmooth.toString()})(Math.max(0, Math.min(${JSON.stringify(zone.x + zone.largeur / 2 - 640)}, document.documentElement.scrollWidth - 1280)), Math.max(0, Math.min(${JSON.stringify(zone.y + zone.hauteur / 2 - 450)}, document.documentElement.scrollHeight - 900)))`);
    } else await evaluate(`(async () => {
      window.scrollTo({ left: Math.max(0, Math.min(${JSON.stringify(zone.x + zone.largeur / 2 - 640)}, document.documentElement.scrollWidth - 1280)),
        top: Math.max(0, Math.min(${JSON.stringify(zone.y + zone.hauteur / 2 - 450)}, document.documentElement.scrollHeight - 900)), behavior: "instant" });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 300));
    })()`);
    const actual = await evaluate("[window.scrollX, window.scrollY]");
    if (!Array.isArray(actual) || actual.length !== 2 || !actual.every(Number.isFinite)) throw new Error("Position de capture inconnue.");
    const image = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    const x = Math.max(0, zone.x - actual[0]), y = Math.max(0, zone.y - actual[1]);
    const largeur = Math.min(1280, zone.x - actual[0] + zone.largeur) - x;
    const hauteur = Math.min(900, zone.y - actual[1] + zone.hauteur) - y;
    return { png: Buffer.from(image.data, "base64"), zone: largeur > 0 && hauteur > 0 ? { x, y, largeur, hauteur } : undefined };
  } finally {
    if (options.doux) await evaluate(`(${scrollSmooth.toString()})(${JSON.stringify(scroll[0])}, ${JSON.stringify(scroll[1])})`);
    else await evaluate(`window.scrollTo({ left: ${JSON.stringify(scroll[0])}, top: ${JSON.stringify(scroll[1])}, behavior: "instant" })`);
  }
}

export async function connecterCdp(port: number, address: string): Promise<ExplorationCdp> {
  const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Liste des onglets CDP inaccessible.");
  const tabs = await response.json() as Array<{ type: string; url: string; webSocketDebuggerUrl: string }>;
  const tab = tabs.find(tab => tab.type === "page" && tab.url === address)
    ?? (tabs.filter(tab => tab.type === "page").length === 1 ? tabs.find(tab => tab.type === "page") : undefined);
  if (!tab) throw new Error("Onglet du relevé introuvable.");
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map<number, { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  const listeners = new Map<string, (params: any) => void>();
  let id = 0;
  const fail = () => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error("Connexion CDP fermée.")); } pending.clear(); };
  socket.addEventListener("close", fail);
  socket.addEventListener("error", fail);
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id); clearTimeout(item.timer);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    } else listeners.get(message.method)?.(message.params);
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error("Connexion CDP hors délai.")); }, 5000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Connexion CDP impossible.")); }, { once: true });
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const key = ++id;
        const timer = setTimeout(() => { pending.delete(key); reject(new Error(`CDP hors délai : ${method}`)); }, 30_000);
        pending.set(key, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: key, method, params }));
      });
    },
    on(event, listener) { listeners.set(event, listener); },
    close() { fail(); socket.close(); },
  };
}

export type IssueClic = "navigue" | "intercepte" | "introuvable";

// Clicks each link in a hidden tab of a separate browser context (the visitor's tab and profile stay untouched) and reports
// whether the click really requests its address. Navigations are aborted before any request leaves Chrome.
export async function verifierClics(port: number, pageUrl: string, urls: string[], { delaiMs = 20_000, attenteMs = 2_000, signal }: { delaiMs?: number; attenteMs?: number; signal?: AbortSignal } = {}): Promise<Map<string, IssueClic>> {
  const deadline = Date.now() + delaiMs;
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(5000) })).json() as { webSocketDebuggerUrl: string };
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  const pending = new Map<number, { resolve(value: any): void; reject(error: Error): void }>();
  const listeners = new Map<string, (params: any) => void>();
  let id = 0;
  const fail = () => { for (const item of pending.values()) item.reject(new Error("Connexion CDP fermée.")); pending.clear(); };
  socket.addEventListener("close", fail);
  socket.addEventListener("error", fail);
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item?.reject(new Error(message.error.message)); else item?.resolve(message.result);
    } else listeners.get(`${message.sessionId ?? ""} ${message.method}`)?.(message.params);
  });
  const send = (method: string, params: object = {}, sessionId?: string) => new Promise<any>((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0 || signal?.aborted) { reject(new Error("Vérification des clics hors délai.")); return; }
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`CDP hors délai : ${method}`)); }, remaining);
    pending.set(key, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(ms, deadline - Date.now()))));
  const strip = (address: string) => { try { const url = new URL(address); url.hash = ""; return url.href; } catch { return address; } };
  const results = new Map<string, IssueClic>();
  signal?.addEventListener("abort", () => socket.close(), { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Connexion CDP impossible.")), { once: true });
    });
    const { browserContextId } = await send("Target.createBrowserContext", { disposeOnDetach: true });
    const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId, hidden: true, background: true })
      .catch(() => send("Target.createTarget", { url: "about:blank", browserContextId, background: true }));
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const tab = (method: string, params: object = {}) => send(method, params, sessionId);
    await tab("Page.enable");
    const loaded = new Promise(resolve => listeners.set(`${sessionId} Page.loadEventFired`, resolve));
    await tab("Page.navigate", { url: pageUrl });
    await Promise.race([loaded, wait(10_000)]);
    await wait(1000);
    const main = (await tab("Page.getFrameTree")).frameTree.frame.id;
    const requested: string[] = [];
    listeners.set(`${sessionId} Fetch.requestPaused`, params => {
      if (params.frameId === main) requested.push(params.request.url);
      tab("Fetch.failRequest", { requestId: params.requestId, errorReason: "Aborted" }).catch(() => {});
    });
    listeners.set(`${sessionId} Page.frameRequestedNavigation`, params => { if (params.frameId === main) requested.push(params.url); });
    listeners.set(`${sessionId} Page.windowOpen`, params => requested.push(params.url));
    await tab("Fetch.enable", { patterns: [{ urlPattern: "*", resourceType: "Document", requestStage: "Request" }] });
    for (const url of urls) {
      if (deadline - Date.now() < attenteMs) break;
      // Every visible link to the address must lead there: a hidden twin that navigates proves nothing for the link a visitor sees.
      const count = await tab("Runtime.evaluate", { returnByValue: true, expression: `(globalThis.__horamaLinks = [...document.querySelectorAll("a[href]")].filter(link => {
        if (!URL.canParse(link.href)) return false;
        const url = new URL(link.href); url.hash = "";
        const style = getComputedStyle(link);
        return url.href === ${JSON.stringify(url)} && link.getClientRects().length > 0 && style.visibility !== "hidden" && style.display !== "none";
      }).slice(0, 5)).length` });
      const links = Number(count.result?.value) || 0;
      if (!links) { results.set(url, "introuvable"); continue; }
      let outcome: IssueClic = "navigue";
      for (let index = 0; index < links && outcome === "navigue"; index++) {
        if (deadline - Date.now() < attenteMs) { outcome = "introuvable"; break; }
        requested.length = 0;
        await tab("Runtime.evaluate", { expression: `globalThis.__horamaLinks[${index}]?.click()` });
        const end = Math.min(deadline, Date.now() + attenteMs);
        while (Date.now() < end && !requested.length) await wait(100);
        if (!requested.some(address => strip(address) === url)) outcome = "intercepte";
      }
      results.set(url, outcome);
    }
    await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  } finally { socket.close(); }
  return results;
}
