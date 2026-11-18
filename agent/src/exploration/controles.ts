import type { EcartVisuel } from "@horama/contrats";

// Zone of `horama-exploration-1`, in document pixels (those of a full-page capture at DPR 1).
export type Zone = EcartVisuel["zone"];

export interface CdpClient {
  send(method: string, params?: object): Promise<any>;
  on(event: string, listener: (params: any) => void): void;
}

export interface Defaut {
  statut: "VERIFIED_FAIL";
  sorte: "page_en_erreur" | "image_cassee" | "defilement_horizontal" | "debordement" | "lien_casse" | "texte_erreur" | "erreur_console";
  message: string;
  selecteur?: string;
  zone?: Zone;
  valeur?: string | number;
}

function inspectDocument() {
  const defects: Defaut[] = [];
  const visible = (element: Element): boolean => {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || !element.getClientRects().length) return false;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0 || style.contentVisibility === "hidden") return false;
      if (node !== element) {
        const bounds = node.getBoundingClientRect();
        if (style.overflowX !== "visible" && (box.right <= bounds.left || box.left >= bounds.right || bounds.width === 0)) return false;
        if (style.overflowY !== "visible" && (box.bottom <= bounds.top || box.top >= bounds.bottom || bounds.height === 0)) return false;
      }
    }
    return true;
  };
  const selector = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts: string[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      parts.unshift(node.parentElement ? `${node.localName}:nth-child(${Array.from(node.parentElement.children).indexOf(node) + 1})` : node.localName);
    }
    return parts.join(" > ");
  };
  const proof = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return { selecteur: selector(element), zone: { x: rect.x + scrollX, y: rect.y + scrollY, largeur: rect.width, hauteur: rect.height } };
  };
  const add = (sorte: Defaut["sorte"], message: string, valeur: string | number, element?: Element) => {
    defects.push({ statut: "VERIFIED_FAIL", sorte, message, valeur, ...(element ? proof(element) : {}) });
  };
  const status = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.responseStatus;
  if (status && status >= 400) add("page_en_erreur", "Le document renvoie une erreur HTTP.", status);
  const root = document.documentElement;
  const clipped = [root, document.body].some(element => ["hidden", "clip"].includes(getComputedStyle(element).overflowX));
  if (!clipped && root.scrollWidth > root.clientWidth) add("defilement_horizontal", "La page dépasse la largeur du document.", `${root.scrollWidth} > ${root.clientWidth}`, root);
  for (const image of document.images) {
    const rect = image.getBoundingClientRect();
    if (visible(image) && image.complete && image.naturalWidth === 0 && (image.currentSrc || image.src) && !(image.loading === "lazy" && (rect.top >= innerHeight || rect.bottom <= 0 || rect.left >= innerWidth || rect.right <= 0))) {
      add("image_cassee", "Une image chargée ne peut pas être décodée.", image.currentSrc || image.src, image);
    }
  }
  const pattern = /(?<![\p{L}\p{N}_])(?:undefined|NaN|null|lorem\s+ipsum)(?![\p{L}\p{N}_])|\{\{/iu;
  for (const element of [document.body, ...document.body.querySelectorAll("*")]) {
    if (!visible(element) || element.matches("script,style,noscript,template")) continue;
    const text = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim();
    const match = text.match(pattern);
    if (match) add("texte_erreur", "Un texte d’erreur est affiché.", match[0], element);
    if (!(element.textContent ?? "").trim()) continue;
    if (element.children.length && !element.matches("button,a")) continue;
    const style = getComputedStyle(element);
    if ([style.overflowX, style.overflowY].some(value => ["hidden", "clip", "auto", "scroll"].includes(value)) || style.textOverflow === "ellipsis") continue;
    const lineHeight = style.lineHeight === "normal" ? parseFloat(style.fontSize) * 1.2 : parseFloat(style.lineHeight);
    if (element.clientWidth > 0 && element.clientHeight > 0 && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight - element.clientHeight > lineHeight / 2)) {
      add("debordement", "Le texte dépasse la boîte de son conteneur.", `${element.scrollWidth}×${element.scrollHeight} > ${element.clientWidth}×${element.clientHeight}`, element);
    }
  }
  const rank = (link: Element) => link.closest("main,[role=main]") ? 0 : link.closest("header,nav,footer,aside,[role=banner],[role=navigation],[role=contentinfo]") ? 2 : 1;
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).filter(link => {
    if (!URL.canParse(link.href, location.href)) return false;
    const url = new URL(link.href, location.href);
    return visible(link) && url.origin === location.origin && /^https?:$/.test(url.protocol) && !(url.pathname === location.pathname && url.search === location.search);
  }).map(link => { const url = new URL(link.href); url.hash = ""; return { url: url.href, rang: rank(link), ...proof(link) }; })
    .sort((a, b) => a.rang - b.rang);
  return { defects, links };
}

// Records console errors and uncaught exceptions in the page, for a caller's connection whose listeners must stay untouched.
const CONSOLE_JOURNAL = `(() => {
  const key = Symbol.for("horama.console");
  if (globalThis[key]) return;
  const journal = [];
  Object.defineProperty(globalThis, key, { value: journal });
  const text = value => { try { return value instanceof Error ? value.stack || String(value) : String(value); } catch { return Object.prototype.toString.call(value); } };
  const error = console.error;
  console.error = function (...args) { journal.push(args.map(text).join(" ")); return error.apply(this, args); };
  addEventListener("error", event => { if (event instanceof ErrorEvent) journal.push(text(event.error ?? event.message)); }, true);
  addEventListener("unhandledrejection", event => journal.push(text(event.reason)));
})()`;

export async function installerJournalConsole(client: CdpClient): Promise<void> {
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: CONSOLE_JOURNAL });
  await client.send("Runtime.evaluate", { expression: CONSOLE_JOURNAL });
}

export interface ControleOptions {
  maxLiens?: number;
  delaiLiensMs?: number;
  maxSauts?: number;
  fetch?: typeof fetch;
  // Caller's connection: no Runtime.disable/enable, no listener replaced; console errors come from installerJournalConsole.
  connexionAppelant?: boolean;
}

// Without connexionAppelant, use a dedicated CDP connection: Runtime is disabled then enabled again and listeners are replaced.
export async function controlerPage(client: CdpClient, options: ControleOptions = {}): Promise<Defaut[]> {
  const consoleDefects: Defaut[] = [];
  const record = (value: string) => {
    if (!consoleDefects.some(defect => defect.valeur === value)) consoleDefects.push({ statut: "VERIFIED_FAIL", sorte: "erreur_console", message: "Une erreur JavaScript est présente dans la console.", valeur: value });
  };
  const shared = options.connexionAppelant === true;
  if (!shared) {
    await client.send("Runtime.disable");
    client.on("Runtime.exceptionThrown", event => record(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text));
    client.on("Runtime.consoleAPICalled", event => {
      if (event.type === "error") record(event.args.map((arg: any) => arg.value === undefined ? arg.description ?? arg.type : String(arg.value)).join(" "));
    });
  }
  try {
    if (!shared) await client.send("Runtime.enable");
    const result = await client.send("Runtime.evaluate", { expression: `(${inspectDocument.toString()})()`, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`Contrôle CDP impossible : ${result.exceptionDetails.text}`);
    const { defects, links } = result.result.value as ReturnType<typeof inspectDocument>;
    if (shared) {
      const journal = await client.send("Runtime.evaluate", { expression: `(() => { const key = Symbol.for("horama.console"), out = []; const walk = view => { try { out.push(...(view[key] ?? [])); } catch {} for (let i = 0; i < view.frames.length; i++) walk(view.frames[i]); }; walk(globalThis); return out; })()`, returnByValue: true });
      for (const value of journal.result?.value ?? []) record(String(value));
    }
    defects.push(...await checkLinks(links, options));
    return [...defects, ...consoleDefects];
  } finally {
    if (!shared) {
      client.on("Runtime.exceptionThrown", () => {});
      client.on("Runtime.consoleAPICalled", () => {});
    }
  }
}

// Links of the main area first, then the rest of the page, then header, navigation and footer; in series, within a time budget per page.
async function checkLinks(links: ReturnType<typeof inspectDocument>["links"], options: ControleOptions): Promise<Defaut[]> {
  const request = options.fetch ?? fetch;
  const limit = Math.max(0, Math.floor(options.maxLiens ?? 100));
  const maxHops = Math.max(0, Math.floor(options.maxSauts ?? 5));
  const deadline = Date.now() + (options.delaiLiensMs ?? 15_000);
  const follow = async (start: string, method: string) => {
    let address = start;
    for (let hops = 0; hops <= maxHops; hops++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return undefined;
      const response = await request(address, { method, redirect: "manual", signal: AbortSignal.timeout(Math.min(10_000, remaining)) });
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) return { status: response.status, url: address, hops };
      if (!URL.canParse(location, address)) return undefined;
      const next = new URL(location, address);
      // Only the inspected site's host is requested: a redirect elsewhere proves nothing and could reach a private network.
      if (next.hostname !== new URL(start).hostname) return undefined;
      address = next.href;
    }
    return undefined;
  };
  const defects: Defaut[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (seen.has(link.url)) continue;
    if (seen.size >= limit || Date.now() >= deadline) break;
    seen.add(link.url);
    try {
      let final = await follow(link.url, "HEAD");
      // A HEAD refused or failed is confirmed by GET: only the page a visitor gets proves a broken link.
      if (final && final.status >= 400) final = await follow(link.url, "GET");
      // No answer, too many redirects or rate limiting prove nothing about the link.
      if (!final || final.status < 400 || final.status === 429) continue;
      const message = final.hops
        ? `Le lien interne mène, après ${final.hops} redirection${final.hops > 1 ? "s" : ""}, à ${final.url} qui renvoie HTTP ${final.status}.`
        : `Le lien interne renvoie HTTP ${final.status}.`;
      defects.push({ statut: "VERIFIED_FAIL", sorte: "lien_casse", message, selecteur: link.selecteur, zone: link.zone, valeur: `${link.url} : ${final.status}` });
    } catch { /* Une absence de réponse ne prouve pas un lien cassé. */ }
  }
  return defects;
}
