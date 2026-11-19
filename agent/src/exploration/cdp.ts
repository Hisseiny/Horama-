import type { CdpClient } from "./controles.ts";

export interface ExplorationCdp extends CdpClient { close(): void }

export function refuseCookies(): boolean {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  const refusals = new Set(["tout refuser", "refuser", "refuser tout", "continuer sans accepter", "reject all", "reject", "decline", "deny", "only necessary", "necessary only", "necessaires uniquement", "uniquement les necessaires", "reject all cookies", "refuser tous les cookies"]);
  const candidates: Array<{ element: HTMLElement; refusal: boolean }> = [];
  for (const element of document.querySelectorAll<HTMLElement>('button, [role="button"], a')) {
    const text = normalize(element.innerText || element.textContent || "");
    const labels = [text, normalize(element.getAttribute("aria-label") ?? ""), normalize(element.getAttribute("title") ?? "")];
    if (labels.some(label => /accept|autoriser|allow|agree/.test(label.replace("continuer sans accepter", "")))) continue;
    const refusal = labels.some(label => refusals.has(label));
    const closure = /^(?:fermer|close|×|✕)$/.test(text) || labels.slice(1).some(label => /\b(?:fermer|close)\b/.test(label));
    if (!refusal && !closure) continue;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || style.visibility !== "visible" || style.display === "none") continue;
    let visible = true;
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      if (Number(getComputedStyle(ancestor).opacity) === 0) visible = false;
    }
    if (!visible) continue;
    if (element.matches('[type="submit"]') && "form" in element && element.form) continue;
    if (element instanceof HTMLButtonElement && element.type === "submit" && element.form) continue;
    let parent = element.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      if (!refusal && (parent.matches('main,nav,[role="main"],[role="navigation"]') || parent.querySelector('main,nav,[role="main"],[role="navigation"]'))) break;
      if (/cookie|consent|rgpd|gdpr|privacy|confidentialit/.test(normalize([parent.textContent, parent.id, parent.className, parent.getAttribute("aria-label")].join(" ")))) {
        candidates.push({ element, refusal });
        break;
      }
      if (!refusal && (parent.matches('dialog,[role="dialog"],[role="alertdialog"],[aria-modal="true"]') || ["fixed", "sticky"].includes(getComputedStyle(parent).position))) break;
      parent = parent.parentElement;
    }
  }
  const candidate = candidates.find(item => item.refusal) ?? candidates[0];
  candidate?.element.click();
  return !!candidate;
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

export async function captureDefect(client: ExplorationCdp, zone: { x: number; y: number; largeur: number; hauteur: number }, scroll: [number, number]) {
  const evaluate = async (expression: string) => (await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
  try {
    await evaluate(`(async () => {
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
    await evaluate(`window.scrollTo({ left: ${JSON.stringify(scroll[0])}, top: ${JSON.stringify(scroll[1])}, behavior: "instant" })`);
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
