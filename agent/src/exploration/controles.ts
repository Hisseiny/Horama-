import type { EcartVisuel } from "@horama/contrats";

// Zone of `horama-exploration-1`, in document pixels (those of a full-page capture at DPR 1).
export type Zone = EcartVisuel["zone"];

export interface CdpClient {
  send(method: string, params?: object): Promise<any>;
  on(event: string, listener: (params: any) => void): void;
}

export interface Defaut {
  // SUSPECTED: the measure is real but does not prove a defect for a visitor (raison says why); a human settles it.
  statut: "VERIFIED_FAIL" | "SUSPECTED";
  sorte: "page_en_erreur" | "image_cassee" | "defilement_horizontal" | "debordement" | "texte_rogne" | "lien_casse" | "texte_erreur" | "erreur_console" | "texte_non_traduit";
  message: string;
  selecteur?: string;
  zone?: Zone;
  valeur?: string | number;
  raison?: string;
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
  const add = (sorte: Defaut["sorte"], message: string, valeur: string | number, element?: Element, raison?: string) => {
    defects.push({ statut: raison ? "SUSPECTED" : "VERIFIED_FAIL", sorte, message, valeur, ...(element ? proof(element) : {}), ...(raison ? { raison } : {}) });
  };
  // Text a visitor cannot see on purpose: screen-reader only, clipped, or inside a box of one pixel that hides its overflow.
  const masked = (element: Element) => {
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const css = getComputedStyle(ancestor);
      const box = ancestor.getBoundingClientRect();
      if (ancestor.matches(".sr-only,.visually-hidden") || css.clip !== "auto" || css.clipPath !== "none"
        || (["hidden", "clip"].includes(css.overflowX) && box.width <= 1) || (["hidden", "clip"].includes(css.overflowY) && box.height <= 1)) return true;
    }
    return false;
  };
  // Slides of a carousel overflow on purpose; the overflow is real but a visitor may never see it as a defect.
  const carousel = (element: Element) => {
    for (let ancestor: Element | null = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      if (ancestor.matches('[aria-roledescription="carousel" i],[aria-roledescription="carrousel" i],[aria-roledescription="slide" i]')
        || /(^|[-_\s])(carousel|carrousel|slider|swiper|slick|splide|glide|flickity|owl)([-_\s]|$)/i.test(String(ancestor.getAttribute("class") ?? ""))
        || getComputedStyle(ancestor).scrollSnapType !== "none"
        || (["auto", "scroll"].includes(getComputedStyle(ancestor).overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1)) return true;
    }
    return false;
  };
  const status = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.responseStatus;
  if (status && status >= 400) add("page_en_erreur", "Le document renvoie une erreur HTTP.", status);
  const root = document.documentElement;
  const functionWords = {
    fr: new Set("le la les des du de un une et est sont pour avec dans sur qui que nous vous au aux ce cette ces ses leur mais ou par en".split(" ")),
    de: new Set("der die das den dem des ein eine einer einem einen und ist sind für mit im auf von zu zum zur wir sie sich nicht auch als bei aus oder".split(" ")),
    en: new Set("the and is are for with of to from we you your our their that this these those which who not by".split(" ")),
  };
  const names = { fr: "français", de: "allemands", en: "anglais" };
  type Language = keyof typeof functionWords;
  const declared = root.lang.toLowerCase().split("-")[0] as Language;
  if (Object.hasOwn(functionWords, declared)) {
    const blocks = new Map<Element, string[]>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest("code,pre,kbd,samp,var,script,style,noscript,template") || !node.textContent?.trim()) continue;
      let block: Element = parent;
      while (block.parentElement && block !== document.body && ["inline", "contents"].includes(getComputedStyle(block).display) && !block.hasAttribute("lang")) block = block.parentElement;
      let boxed: Element = parent;
      while (boxed.parentElement && getComputedStyle(boxed).display === "contents") boxed = boxed.parentElement;
      if (!visible(boxed)) continue;
      let clippedText = false;
      for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.clip !== "auto" || style.clipPath !== "none" || style.visibility !== "visible" || Number(style.opacity) === 0 || style.contentVisibility === "hidden") clippedText = true;
      }
      if (clippedText) continue;
      const language = parent.closest("[lang]");
      if (language && language !== root && block.contains(language)) block = language;
      const words = blocks.get(block) ?? [];
      words.push(...(node.textContent.match(/\p{L}+/gu) ?? []));
      blocks.set(block, words);
    }
    const foreignBlocks: Array<{ block: Element; length: number; language: Language; measure: string }> = [];
    for (const [block, original] of blocks) {
      if (original.length < 8 || original.every(word => /^\p{Lu}/u.test(word))) continue;
      const words = original.map(word => word.toLowerCase());
      const counts = (Object.keys(functionWords) as Language[]).map(language => ({ language, words: words.filter(word => functionWords[language].has(word) && !Object.entries(functionWords).some(([other, list]) => other !== language && list.has(word))) }));
      const total = counts.reduce((sum, count) => sum + count.words.length, 0);
      const foreign = counts.find(count => count.language !== declared && count.words.length >= 3 && new Set(count.words).size >= 2 && count.words.length > total / 2);
      if (!foreign) continue;
      if (block.closest("[lang]")?.getAttribute("lang")?.toLowerCase().split("-")[0] === foreign.language) continue;
      const measure = `${words.length} mots, ${foreign.words.length} mots outils ${names[foreign.language]}, ${counts.find(count => count.language === declared)!.words.length} ${names[declared]} ; page déclarée ${declared}`;
      foreignBlocks.push({ block, length: words.length, language: foreign.language, measure });
    }
    const largest = foreignBlocks.sort((a, b) => b.length - a.length)[0];
    if (largest) {
      const languages = { fr: "français", de: "allemand", en: "anglais" };
      const summary = (Object.keys(languages) as Language[]).flatMap(language => {
        const count = foreignBlocks.filter(block => block.language === language).length;
        return count ? [`${count} bloc${count > 1 ? "s" : ""} en ${languages[language]}`] : [];
      }).join(", ");
      const measure = `${summary} ; le plus long : ${largest.measure}`;
      let element = largest.block;
      while (element.parentElement && getComputedStyle(element).display === "contents") element = element.parentElement;
      add("texte_non_traduit", measure, measure, element);
    }
  }
  const clipped = [root, document.body].some(element => ["hidden", "clip"].includes(getComputedStyle(element).overflowX));
  if (!clipped && root.scrollWidth > root.clientWidth) add("defilement_horizontal", "La page dépasse la largeur du document.", `${root.scrollWidth} > ${root.clientWidth}`, root);
  for (const image of document.images) {
    const rect = image.getBoundingClientRect();
    if (visible(image) && image.complete && image.naturalWidth === 0 && (image.currentSrc || image.src) && !(image.loading === "lazy" && (rect.top >= innerHeight || rect.bottom <= 0 || rect.left >= innerWidth || rect.right <= 0))) {
      add("image_cassee", "Une image chargée ne peut pas être décodée.", image.currentSrc || image.src, image);
    }
  }
  // Union of the in-flow text of an element: clipped text (screen-reader only) and text placed on purpose
  // (absolute or fixed position, transform, SVG) inside the element are ignored.
  const textBounds = (element: Element, descendantClipping = false) => {
    let bounds: { left: number; right: number; top: number; bottom: number } | undefined;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      let shown = parent;
      while (shown && shown !== element && getComputedStyle(shown).display === "contents") shown = shown.parentElement;
      if (!parent || !shown || !(node.textContent ?? "").trim() || getComputedStyle(parent).visibility !== "visible" || !visible(shown)) continue;
      let hidden = false;
      for (let ancestor: Element | null = parent; ancestor && !hidden; ancestor = ancestor === element ? null : ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        hidden = style.clip !== "auto" || style.clipPath !== "none" || (ancestor !== element && (ancestor instanceof SVGElement || style.position === "absolute" || style.position === "fixed" || style.transform !== "none"));
      }
      if (hidden) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        let { left, right, top, bottom } = rect;
        if (descendantClipping) {
          for (let ancestor: Element | null = parent; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (style.display === "inline" || style.display === "contents") continue;
            const box = ancestor.getBoundingClientRect();
            const scaleX = box.width / (ancestor as HTMLElement).offsetWidth || 1, scaleY = box.height / (ancestor as HTMLElement).offsetHeight || 1;
            const x = box.left + ancestor.clientLeft * scaleX, y = box.top + ancestor.clientTop * scaleY;
            if (style.overflowX !== "visible") { left = Math.max(left, x); right = Math.min(right, x + ancestor.clientWidth * scaleX); }
            if (style.overflowY !== "visible") { top = Math.max(top, y); bottom = Math.min(bottom, y + ancestor.clientHeight * scaleY); }
          }
        }
        if (right <= left || bottom <= top) continue;
        bounds = bounds ? { left: Math.min(bounds.left, left), right: Math.max(bounds.right, right), top: Math.min(bounds.top, top), bottom: Math.max(bounds.bottom, bottom) } : { left, right, top, bottom };
      }
    }
    return bounds;
  };
  const truncations: Element[] = [];
  const truncationOwner = (element: Element) => {
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const css = getComputedStyle(ancestor);
      if ((css.textOverflow === "ellipsis" && css.overflowX !== "visible")
        || (Number(css.webkitLineClamp) > 0 && css.webkitBoxOrient === "vertical" && ["-webkit-box", "-webkit-inline-box", "flow-root"].includes(css.display))) return ancestor;
    }
    return undefined;
  };
  const pattern = /(?<![\p{L}\p{N}_])(?:undefined|NaN|null|lorem\s+ipsum)(?![\p{L}\p{N}_])|\{\{/iu;
  for (const element of [document.body, ...document.body.querySelectorAll("*")]) {
    if (!visible(element) || element.matches("script,style,noscript,template")) continue;
    const text = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim();
    const match = element.closest("code,pre,kbd,samp,var") ? null : text.match(pattern);
    // Proven only where a value is shown (alone, or after ":" or "="); inside written text ("The Null Object", "the behaviour is undefined") it may be meant.
    const value = match && (/lorem|\{\{/i.test(match[0]) || text === match[0] || /[:=]\s*$/.test(text.slice(0, match.index)));
    if (match) add("texte_erreur", "Un texte d’erreur est affiché.", match[0], element, value ? undefined : "Le mot technique est dans un texte rédigé (phrase ou titre) : il peut s'agir du texte voulu.");
    if (!(element.textContent ?? "").trim()) continue;
    const style = getComputedStyle(element);
    const owner = truncationOwner(element);
    if (owner) {
      if (owner !== element || masked(element) || element.clientWidth <= 1 || element.clientHeight <= 1) continue;
      const ink = textBounds(element);
      const box = element.getBoundingClientRect();
      const scaleX = box.width / (element as HTMLElement).offsetWidth || 1, scaleY = box.height / (element as HTMLElement).offsetHeight || 1;
      const left = box.left + element.clientLeft * scaleX, top = box.top + element.clientTop * scaleY;
      const right = left + element.clientWidth * scaleX, bottom = top + element.clientHeight * scaleY;
      if (ink && box.width > 1 && box.height > 1 && right + scrollX > 0 && bottom + scrollY > 0
        && ink.right > left && ink.left < right && ink.bottom > top && ink.top < bottom
        && (ink.right > right + scaleX || ink.bottom > bottom + scaleY)) truncations.push(element);
      continue;
    }
    const clippedX = ["hidden", "clip"].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
    const clippedY = ["hidden", "clip"].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
    const lineClamped = Number(style.webkitLineClamp) > 0 && style.webkitBoxOrient === "vertical" && ["-webkit-box", "-webkit-inline-box", "flow-root"].includes(style.display);
    if ((clippedX || clippedY) && style.textOverflow !== "ellipsis" && !lineClamped && element.clientWidth > 1 && element.clientHeight > 1) {
      let excluded = masked(element) || carousel(element);
      for (let ancestor: Element | null = element; ancestor && !excluded; ancestor = ancestor.parentElement) {
        const css = getComputedStyle(ancestor);
        excluded = [css.overflowX, css.overflowY].some(value => ["auto", "scroll"].includes(value));
      }
      const ink = excluded ? undefined : textBounds(element, true);
      const box = element.getBoundingClientRect();
      const indent = parseFloat(style.textIndent) || 0;
      const scaleX = box.width / (element as HTMLElement).offsetWidth || 1, scaleY = box.height / (element as HTMLElement).offsetHeight || 1;
      const left = box.left + element.clientLeft * scaleX, top = box.top + element.clientTop * scaleY;
      // Text pushed entirely out of the clipping boxes (image replacement, negative indent) is hidden on purpose, not cut.
      let view = ink && { left: ink.left, top: ink.top, right: ink.right, bottom: ink.bottom };
      for (let ancestor: Element | null = element; ancestor && view; ancestor = ancestor.parentElement) {
        const css = getComputedStyle(ancestor), clip = ancestor.getBoundingClientRect();
        if (["hidden", "clip"].includes(css.overflowX)) view = { ...view, left: Math.max(view.left, clip.left), right: Math.min(view.right, clip.right) };
        if (["hidden", "clip"].includes(css.overflowY)) view = { ...view, top: Math.max(view.top, clip.top), bottom: Math.min(view.bottom, clip.bottom) };
        if (view.right <= view.left || view.bottom <= view.top) view = undefined;
      }
      if (ink && view && !(indent < 0 && ink.right <= box.left) && box.right + scrollX > 0 && box.bottom + scrollY > 0
        && ((clippedX && (ink.right > left + (element.clientWidth + 1) * scaleX || ink.left < left - scaleX))
          || (clippedY && (ink.bottom > top + (element.clientHeight + 1) * scaleY || ink.top < top - scaleY)))) {
        add("texte_rogne", "Le texte est rogné par son conteneur.", `${element.scrollWidth}×${element.scrollHeight} > ${element.clientWidth}×${element.clientHeight}`, element);
      }
    }
    if (element.children.length && !element.matches("button,a")) continue;
    if ([style.overflowX, style.overflowY].some(value => ["hidden", "clip", "auto", "scroll"].includes(value)) || style.textOverflow === "ellipsis" || lineClamped) continue;
    if (element.clientWidth <= 1 || element.clientHeight <= 1 || (element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)) continue;
    if (masked(element)) continue;
    let clampedAncestor = false;
    for (let ancestor = element.parentElement; ancestor && !clampedAncestor; ancestor = ancestor.parentElement) clampedAncestor = Number(getComputedStyle(ancestor).webkitLineClamp) > 0;
    if (clampedAncestor) continue;
    const box = element.getBoundingClientRect();
    if (box.right + scrollX <= 0 || box.bottom + scrollY <= 0) continue;
    const ink = textBounds(element);
    if (!ink) continue;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    // Padding box, in CSS pixels of the element (rectangles are scaled by transformed ancestors).
    const scaleX = box.width / (element as HTMLElement).offsetWidth || 1, scaleY = box.height / (element as HTMLElement).offsetHeight || 1;
    const left = box.left + element.clientLeft * scaleX, top = box.top + element.clientTop * scaleY;
    const across = (Math.max(0, left - ink.left) + Math.max(0, ink.right - left - element.clientWidth * scaleX)) / scaleX;
    const down = (Math.max(0, top - ink.top) + Math.max(0, ink.bottom - top - element.clientHeight * scaleY)) / scaleY;
    if (across > 3 || down > Math.max(3, lineHeight / 2)) {
      add("debordement", "Le texte dépasse la boîte de son conteneur.", `${element.scrollWidth}×${element.scrollHeight} > ${element.clientWidth}×${element.clientHeight}`, element,
        carousel(element) ? "Le texte est dans un carrousel ou un bandeau défilant, dont les éléments débordent volontairement."
          : element.closest('[aria-hidden="true"]') ? "Le texte est décoratif (aria-hidden) : son débordement peut être voulu." : undefined);
    }
  }
  const repeated = new Map<Element, Map<string, Element[]>>();
  const paths = new Map<Element, Element[][]>();
  for (const element of truncations) {
    const candidates: Element[][] = [];
    let path = "";
    for (let node: Element | null = element; node?.parentElement && node !== document.body; node = node.parentElement) {
      const parent = node.parentElement;
      const groups = repeated.get(parent) ?? new Map<string, Element[]>();
      repeated.set(parent, groups);
      const key = `${node.localName}/${path}`;
      const group = groups.get(key) ?? [];
      groups.set(key, group); group.push(element); candidates.push(group);
      path = `${node.localName}:nth-child(${Array.from(parent.children).indexOf(node) + 1})/${path}`;
    }
    paths.set(element, candidates);
  }
  const emitted = new Set<Element>();
  for (const element of truncations) {
    if (emitted.has(element)) continue;
    const group = paths.get(element)?.find(items => items.length > 1) ?? [element];
    const elements = group.filter(item => !emitted.has(item));
    for (const item of elements) emitted.add(item);
    const selectors = elements.map(selector);
    defects.push({ statut: "SUSPECTED", sorte: "texte_rogne",
      message: `${elements.length} texte${elements.length > 1 ? "s" : ""} coupé${elements.length > 1 ? "s" : ""} par troncature CSS. Éléments : ${selectors.join(", ")}.`,
      valeur: elements.map(item => `${item.scrollWidth}×${item.scrollHeight} > ${item.clientWidth}×${item.clientHeight}`).join(" ; "),
      ...proof(element), selecteur: selectors.join(", "),
      raison: "Texte coupé par des points de suspension ou une limite de lignes : sans doute voulu, à confirmer." });
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
  // Clicks the links answering an error as a visitor would; without it, or without "navigue", a link in error is only a doubt.
  verifierClic?: (urls: string[]) => Promise<Map<string, "navigue" | "intercepte" | "introuvable">>;
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
  const broken: Array<{ link: (typeof links)[number]; message: string; valeur: string }> = [];
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
      broken.push({ link, message, valeur: `${link.url} : ${final.status}` });
    } catch { /* Une absence de réponse ne prouve pas un lien cassé. */ }
  }
  let clicks = new Map<string, "navigue" | "intercepte" | "introuvable">();
  if (broken.length && options.verifierClic) {
    try { clicks = await options.verifierClic(broken.map(item => item.link.url)); } catch { /* Clic non vérifié : doute. */ }
  }
  const reasons = { intercepte: "Un script prend en charge le clic : un visiteur qui clique n'est pas envoyé vers cette adresse.",
    introuvable: "Le lien n'a pas été retrouvé pour vérifier le clic d'un visiteur.", absent: "Le clic d'un visiteur sur ce lien n'a pas pu être vérifié." };
  return broken.map(({ link, message, valeur }): Defaut => {
    const click = clicks.get(link.url);
    return { statut: click === "navigue" ? "VERIFIED_FAIL" : "SUSPECTED", sorte: "lien_casse", message, selecteur: link.selecteur, zone: link.zone, valeur,
      ...(click === "navigue" ? {} : { raison: reasons[click ?? "absent"] }) };
  });
}
