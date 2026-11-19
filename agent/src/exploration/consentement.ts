// No cookie banner for the whole visit, in the direct as on the captures (#208, hcompany.ai on 19/11: an Axeptio card
// stayed open on every page and made 10 doubts of Holo out of 11). Three layers, from the surest to the most fragile:
// 1. the scripts of the common consent platforms are blocked by the network on every tab (they never load);
// 2. in every page, about every second: the explicit refusal (refuseCookies of cdp.ts);
// 3. if no refusal worked: the banner is hidden for good (display:none, through open shadow roots) and the scroll
//    the site locked behind it is given back.
// Nothing particular to a site: a list of platforms, and the vocabulary of consent.
import { refuseCookies } from "./cdp.ts";

// Hosts or paths of consent platforms (CDP wildcard patterns): Axeptio, OneTrust (cookielaw, cookiepro), Didomi,
// Cookiebot, Usercentrics, Quantcast Choice and InMobi, TrustArc, Sirdata, Iubenda, Osano, CookieYes, Complianz,
// Termly, consentmanager, CookieFirst, tarteaucitron.
export const BLOCKED_CONSENT_URLS = [
  "*axept.io*", "*axeptio*", "*cookielaw.org*", "*onetrust.com*", "*cookiepro.com*", "*didomi.io*", "*privacy-center.org*",
  "*cookiebot.com*", "*cookiebot.eu*", "*usercentrics.eu*", "*usercentrics.com*", "*quantcast.mgr.consensu.org*", "*cmp.quantcast.com*",
  "*cmp.inmobi.com*", "*trustarc.com*", "*truste.com*", "*consentframework.com*", "*sirdata.com*", "*iubenda.com*", "*osano.com*",
  "*cookieyes.com*", "*complianz*", "*termly.io*", "*consentmanager.net*", "*cookiefirst.com*", "*tarteaucitron*",
];

// Hides for good the consent banners of the page: from each control of consent (accept, refuse, choose…) up to the
// first box that speaks of cookies or consent, then up to the widest wrapper that holds nothing else (same text),
// shadow hosts included; only under something fixed or sticky (a banner, not a footer or a page of settings), never
// body. Returns how many were hidden; gives back the scroll locked on html or body once one is hidden.
export function hideConsentForGood(): number {
  const descendants = (root: Document | ShadowRoot | Element): HTMLElement[] => [...("shadowRoot" in root && root.shadowRoot ? descendants(root.shadowRoot) : []), ...[...root.querySelectorAll<HTMLElement>("*")].flatMap(element => [element, ...(element.shadowRoot ? descendants(element.shadowRoot) : [])])];
  const parentOf = (element: Element): Element | null => element.parentElement ?? (element.getRootNode() instanceof ShadowRoot ? (element.getRootNode() as ShadowRoot).host : null);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const text = (element: Element) => normalize([element, ...descendants(element)].map(node => node.shadowRoot ? `${node.textContent} ${node.shadowRoot.textContent}` : "").join(" ") + " " + element.textContent);
  const control = /\b(?:accepter|refuser|tout refuser|parametrer|personnaliser|autoriser|j['’]accepte|accept|accept all|reject|decline|deny|manage|customize|preferences|allow|agree|ok!?|let me choose|laissez-moi choisir|cookie settings|parametres des cookies|gerer les cookies|no,? thanks|non merci|nein danke|akzeptieren|ablehnen|einstellungen|zustimmen|erlauben)\b/;
  const consent = /cookie|consent|einwilligung|rgpd|gdpr|traceurs/;
  let hidden = 0;
  for (const button of descendants(document).filter(node => node.matches('button, [role="button"], a'))) {
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height || !control.test(normalize([button.innerText || button.textContent, button.getAttribute("aria-label"), button.getAttribute("title")].join(" ")))) continue;
    const chain: Element[] = [];
    for (let node = parentOf(button); node && node !== document.body && node !== document.documentElement; node = parentOf(node)) chain.push(node);
    if (!chain.some(node => ["fixed", "sticky"].includes(getComputedStyle(node).position))) continue;
    const start = chain.findIndex(node => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.height <= innerHeight * 0.9 && consent.test(text(node));
    });
    if (start < 0) continue;
    let box = chain[start];
    const inside = text(box);
    for (const node of chain.slice(start + 1)) {
      if (text(node) !== inside) break;
      box = node;
    }
    if (!(box instanceof HTMLElement) || box.style.getPropertyValue("display") === "none") continue;
    box.style.setProperty("display", "none", "important");
    box.setAttribute("data-horama-consentement", "masque");
    hidden++;
  }
  if (hidden) {
    for (const root of [document.documentElement, document.body]) {
      if (root && ["hidden", "clip"].includes(getComputedStyle(root).overflowY)) root.style.setProperty("overflow", "auto", "important");
    }
  }
  return hidden;
}

// The script put in every document: refuse, and hide what a refusal did not remove (after two clicks that changed
// nothing, the banner is hidden anyway). About every second until the page goes.
export function consentLoopSource(interval = 1000): string {
  return `(() => {
  if (window.__horamaConsentement) return;
  window.__horamaConsentement = true;
  const refuse = (${refuseCookies.toString()});
  const hide = (${hideConsentForGood.toString()});
  let clicks = 0;
  const tick = () => {
    try {
      if (!document.body) return;
      if (refuse() && ++clicks <= 2) return;
      hide();
    } catch {}
  };
  setInterval(tick, ${interval});
  if (document.readyState !== "loading") tick(); else addEventListener("DOMContentLoaded", tick, { once: true });
})()`;
}

// Layers 1 to 3 on every tab of the Chrome of the passage, the ones open now and the ones to come: a connection to the
// browser, auto-attached to each page. Never fails the passage: a Chrome without this connection keeps the old way
// (refusal and masking at the capture). Returns the stop.
export async function garderSansConsentement(port: number, log: (message: string) => void = () => {}): Promise<() => void> {
  try {
    const version = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(3000) }).then(response => response.json()) as { webSocketDebuggerUrl?: string };
    if (!version.webSocketDebuggerUrl) return () => {};
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("hors délai")), 3000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("connexion impossible")); }, { once: true });
    });
    let id = 0;
    const replies = new Map<number, () => void>();
    // Each command answered (or the socket gone): the tab is guarded before the passage goes on.
    const send = (method: string, params: object = {}, sessionId?: string) => new Promise<void>(resolve => {
      replies.set(++id, resolve);
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    socket.addEventListener("close", () => { for (const resolve of replies.values()) resolve(); replies.clear(); });
    const source = consentLoopSource();
    const setups: Promise<unknown>[] = [];
    let guarded = 0;
    socket.addEventListener("message", event => {
      const message = JSON.parse(String(event.data));
      if (message.id) { replies.get(message.id)?.(); replies.delete(message.id); return; }
      if (message.method !== "Target.attachedToTarget") return;
      const { sessionId, targetInfo } = message.params;
      if (!["page", "iframe"].includes(targetInfo.type)) { void send("Runtime.runIfWaitingForDebugger", {}, sessionId); return; }
      setups.push(Promise.all([
        send("Network.enable", {}, sessionId),
        send("Network.setBlockedURLs", { urls: BLOCKED_CONSENT_URLS }, sessionId),
        send("Page.enable", {}, sessionId), // without it, the script is not put in the next documents
        send("Page.addScriptToEvaluateOnNewDocument", { source }, sessionId),
        send("Runtime.evaluate", { expression: source }, sessionId),
        send("Runtime.runIfWaitingForDebugger", {}, sessionId),
      ]));
      if (targetInfo.type === "page" && ++guarded === 1) log("Bandeaux de consentement : plateformes bloquées, refus puis masquage pendant tout le passage.");
    });
    await Promise.race([send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }), new Promise(resolve => setTimeout(resolve, 3000))]);
    await Promise.race([Promise.all(setups), new Promise(resolve => setTimeout(resolve, 3000))]);
    return () => socket.close();
  } catch {
    return () => {};
  }
}
