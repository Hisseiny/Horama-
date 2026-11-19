import { detecterBlocage } from "./blocage.ts";
import { prepareCapture, withBackgroundTab } from "./cdp.ts";
import type { CdpClient, Defaut, Zone } from "./controles.ts";
import { allowsRenderResource, allowsRobotsPath } from "./pages.ts";

export interface TranslationOptions {
  port: number;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  unavailable?: (reason: string) => void;
}

function readLanguages() {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement | HTMLAnchorElement>("link[rel~='alternate'][hreflang][href], a[hreflang][href], a[lang][href]"));
  return {
    url: location.href, lang: document.documentElement.lang, viewport: [innerWidth, innerHeight, devicePixelRatio],
    links: links.filter(link => link instanceof HTMLLinkElement || (!link.closest("form") && link.getClientRects().length > 0 && getComputedStyle(link).visibility === "visible"))
      .map(link => ({ url: link.href, lang: (link.hreflang || link.lang).toLowerCase().trim(), metadata: link instanceof HTMLLinkElement })),
  };
}

function language(tag: string) {
  return /^[a-z]{2,8}(?:-[a-z\d]{1,8})*$/i.test(tag) && tag.toLowerCase().split("-")[0];
}

function announcedReference(page: ReturnType<typeof readLanguages>) {
  const current = new URL(page.url);
  current.hash = "";
  if (!/^https?:$/.test(current.protocol) || !language(page.lang)) return;
  const candidates = page.links.flatMap(link => {
    if (!URL.canParse(link.url)) return [];
    const url = new URL(link.url);
    url.hash = "";
    if (url.origin !== current.origin || url.username || url.password
      || /(?:^|[^a-z])(log-?in|sign-?in|sign-?up|connexion|auth|logout|register|inscription|submit)(?:[^a-z]|$)/i.test(url.pathname + url.search)) return [];
    return [{ ...link, url: url.href }];
  });
  const defaultUrls = new Set(candidates.filter(link => link.metadata && link.lang === "x-default").map(link => link.url));
  if (defaultUrls.has(current.href)) return;
  const alternates = candidates.filter(link => link.url !== current.href && language(link.lang) && language(link.lang) !== language(page.lang));
  const preferred = alternates.filter(link => defaultUrls.has(link.url));
  const pool = preferred.length ? preferred : alternates;
  const unique = new Set(pool.map(link => JSON.stringify([link.url, language(link.lang)])));
  return unique.size === 1 ? pool.find(link => link.metadata) ?? pool[0] : undefined;
}

function inspectComponents() {
  const excludedText = "code,pre,kbd,samp,var,address,[lang]";
  const hidden = new Map<Element, boolean>();
  const visible = (element: Element): boolean => {
    const known = hidden.get(element);
    if (known !== undefined) return known;
    const css = getComputedStyle(element);
    const result = css.display !== "none" && css.visibility === "visible" && Number(css.opacity) !== 0
      && css.contentVisibility !== "hidden" && css.clip === "auto" && css.clipPath === "none"
      && !element.matches(".sr-only,.visually-hidden,[aria-hidden=true]")
      && (!element.parentElement || visible(element.parentElement));
    hidden.set(element, result);
    return result;
  };
  const fragments = new Map<HTMLElement, string[]>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!(parent instanceof HTMLElement) || !node.textContent?.trim() || !visible(parent)
      || parent.closest(`:is(${excludedText}):not(html),script,style,noscript,template,form,textarea,select`)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (![...range.getClientRects()].some(rect => rect.width > 1 && rect.height > 1 && rect.right + scrollX > 0 && rect.bottom + scrollY > 0)) continue;
    let block = parent;
    while (block.parentElement && block !== document.body && !block.matches("a,button,label,[role=button]") && ["inline", "contents"].includes(getComputedStyle(block).display)) block = block.parentElement;
    const parts = fragments.get(block) ?? [];
    parts.push(node.textContent);
    fragments.set(block, parts);
  }

  const paths = new Map<Element, string>();
  const path = (element: Element): string => {
    if (element === document.body) return "body";
    const cached = paths.get(element);
    if (cached) return cached;
    const parent = element.parentElement!;
    for (const name of ["id", "data-testid", "data-test", "data-qa", "data-i18n", "data-l10n-id"]) {
      const value = element.getAttribute(name);
      if (value && document.querySelectorAll(`[${name}="${CSS.escape(value)}"]`).length === 1) {
        const key = JSON.stringify([element.localName, name, value]);
        paths.set(element, key);
        return key;
      }
    }
    const signature = (node: Element) => JSON.stringify([node.localName, [...node.classList].sort(), node.getAttribute("role")]);
    const shape = signature(element);
    const siblings = [...parent.children].filter(node => signature(node) === shape);
    const key = `${path(parent)}/${JSON.stringify([shape, siblings.indexOf(element), siblings.length])}`;
    paths.set(element, key);
    return key;
  };
  const selector = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      parts.unshift(node.parentElement ? `${node.localName}:nth-child(${[...node.parentElement.children].indexOf(node) + 1})` : node.localName);
    }
    return parts.join(" > ");
  };
  return [...fragments].flatMap(([element, parts]) => {
    if (element === document.body) return [];
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1 || rect.right + scrollX <= 0 || rect.bottom + scrollY <= 0) return [];
    for (let ancestor: HTMLElement | null = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const box = ancestor.getBoundingClientRect(), css = getComputedStyle(ancestor);
      if ((css.overflowX !== "visible" && (rect.right <= box.left || rect.left >= box.right))
        || (css.overflowY !== "visible" && (rect.bottom <= box.top || rect.top >= box.bottom))) return [];
    }
    const css = getComputedStyle(element);
    const zone = { x: rect.x + scrollX, y: rect.y + scrollY, largeur: rect.width, hauteur: rect.height };
    return [{ key: path(element), selector: selector(element), zone, text: parts.join(" ").normalize("NFC").replace(/\s+/g, " ").trim(),
      hasExcludedText: !!element.querySelector(excludedText),
      fits: element.clientWidth > 1 && element.clientHeight > 1 && element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1,
      style: [css.fontFamily, css.fontSize, css.fontWeight, css.writingMode, css.whiteSpace, css.overflowX, css.overflowY].join("|") }];
  });
}

type Component = ReturnType<typeof inspectComponents>[number];

function comparableText(text: string) {
  const streetAddress = /(?:\b\d+[a-z]?\s+(?:rue|avenue|boulevard|street|road)\b|\b[\p{L}-]*(?:straße|strasse|weg|platz)\s+\d+[a-z]?\b)[^.!?;]*/giu;
  const contactAddress = /(?:https?:\/\/|www\.)\S+|[\p{L}\p{M}\p{N}_.%'’+-]+@(?:[\p{L}\p{M}\p{N}-]+\.)+[\p{L}\p{M}\p{N}-]+/giu;
  return text.replace(streetAddress, " ").replace(contactAddress, " ").replace(/\s+/g, " ").trim();
}

function wordsToCompare(text: string) {
  const words = text.match(/\p{L}+(?:['’\u2010-]\p{L}+)*/gu) ?? [];
  // Names without any sentence context are ambiguous. A single capitalized word is still only a doubt.
  if (words.length > 1 && words.every(word => /^\p{Lu}/u.test(word))) return [];
  return words;
}

async function evaluate<T>(client: CdpClient, expression: string): Promise<T> {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails || !result.result || !("value" in result.result)) throw new Error("Lecture du navigateur impossible.");
  return result.result.value as T;
}

async function pairedCapture(current: CdpClient, original: CdpClient, before: Zone, after: Zone) {
  const capture = async (tab: CdpClient, zone: Zone, label: string) => {
    const { cssContentSize, cssLayoutViewport } = await tab.send("Page.getLayoutMetrics");
    const width = Math.min(cssContentSize.width, cssLayoutViewport.clientWidth);
    const height = Math.min(cssContentSize.height, cssLayoutViewport.clientHeight);
    const x = Math.round(Math.max(0, Math.min(zone.x + zone.largeur / 2 - width / 2, cssContentSize.width - width)));
    const y = Math.round(Math.max(0, Math.min(zone.y + zone.hauteur / 2 - height / 2, cssContentSize.height - height)));
    const image = await tab.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true,
      clip: { x, y, width, height, scale: 1 } });
    return { png: image.data as string, zone: { ...zone, x: zone.x - x, y: zone.y - y }, label };
  };
  const pair = await Promise.all([capture(original, before, "Version de référence"), capture(current, after, "Version traduite")]);
  const { frameTree } = await original.send("Page.getFrameTree");
  const { executionContextId } = await original.send("Page.createIsolatedWorld", { frameId: frameTree.frame.id, worldName: "horama-translation-proof" });
  const compose = async (pair: { png: string; zone: Zone; label: string }[]) => {
    const images = await Promise.all(pair.map(item => createImageBitmap(new Blob([Uint8Array.from(atob(item.png), char => char.charCodeAt(0))], { type: "image/png" }))));
    const canvas = document.createElement("canvas");
    canvas.width = images[0].width + images[1].width;
    canvas.height = Math.max(...images.map(image => image.height)) + 40;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#172132"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "20px sans-serif";
    let x = 0;
    for (const [index, image] of images.entries()) {
      const { label, zone } = pair[index];
      ctx.fillStyle = "#fff"; ctx.fillText(label, x + 15, 27);
      ctx.drawImage(image, x, 40);
      ctx.lineWidth = 3; ctx.strokeStyle = index === 0 ? "#187a42" : "#c02625";
      ctx.strokeRect(x + zone.x, 40 + zone.y, zone.largeur, zone.hauteur);
      x += image.width;
    }
    return canvas.toDataURL("image/png").split(",")[1];
  };
  const result = await original.send("Runtime.evaluate", { contextId: executionContextId, expression: `(${compose.toString()})(${JSON.stringify(pair)})`, awaitPromise: true, returnByValue: true });
  if (!result.result?.value) throw new Error("Assemblage des deux captures impossible.");
  return Buffer.from(result.result.value, "base64");
}

export async function compareTranslation(client: CdpClient, defects: Defaut[], options: TranslationOptions): Promise<Defaut[]> {
  try {
    const page = await evaluate<ReturnType<typeof readLanguages>>(client, `(${readLanguages.toString()})()`);
    const alternate = announcedReference(page);
    if (!alternate) return defects;
    const address = new URL(alternate.url);
    const timeout = AbortSignal.timeout(5000);
    const request = options.fetch ?? fetch;
    const robots = await request(new URL("/robots.txt", address), { redirect: "manual", signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout });
    if ((!robots.ok && ![404, 410].includes(robots.status)) || robots.ok && !allowsRobotsPath(await robots.text(), address)) {
      await robots.body?.cancel().catch(() => {});
      throw new Error("Version de référence inaccessible selon robots.txt.");
    }
    if (!robots.ok) await robots.body?.cancel();
    const expression = `(${inspectComponents.toString()})()`;
    const translated = await evaluate<Component[]>(client, expression);
    return await withBackgroundTab(options.port, async original => {
      const [width, height, deviceScaleFactor] = page.viewport;
      await original.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });
      const { frameTree } = await original.send("Page.getFrameTree");
      original.on("Fetch.requestPaused", event => {
        const { request, resourceType, frameId, requestId } = event;
        const allowed = ["GET", "HEAD"].includes(request.method) && allowsRenderResource(request.url, alternate.url)
          && (resourceType !== "Document" || (frameId === frameTree.frame.id && request.url === alternate.url));
        void original.send(allowed ? "Fetch.continueRequest" : "Fetch.failRequest", { requestId, ...(allowed ? {} : { errorReason: "BlockedByClient" }) }).catch(() => {});
      });
      await original.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
      const navigation = await original.send("Page.navigate", { url: alternate.url });
      if (navigation.errorText) throw new Error("Navigation vers la version annoncée impossible.");
      await prepareCapture(original);
      const reference = await evaluate<ReturnType<typeof readLanguages>>(original, `(${readLanguages.toString()})()`);
      const response = await evaluate<{ status: number; html: string }>(original, "({ status: performance.getEntriesByType('navigation')[0]?.responseStatus, html: document.documentElement.outerHTML })");
      const restriction = detecterBlocage(response.html, response.status);
      if (restriction || (response.status && response.status >= 400) || language(reference.lang) !== language(alternate.lang) || reference.url !== alternate.url)
        throw new Error(restriction ?? "La version annoncée ne rend pas la page attendue dans la langue indiquée.");
      const current = new URL(page.url);
      current.hash = "";
      if (!alternate.metadata && !reference.links.some(link => URL.canParse(link.url) && new URL(link.url).href.split("#")[0] === current.href
        && language(link.lang) === language(page.lang))) throw new Error("Le sélecteur ne confirme pas que les deux liens mènent à la même page.");

      const referenceComponents = new Map((await evaluate<Component[]>(original, expression)).map(component => [component.key, component]));
      const existing = new Map(defects.flatMap((defect, index) => defect.sorte === "texte_non_traduit" ? [[defect.selecteur, index] as const] : []));
      const compared = [...defects];
      for (const component of translated) {
        const before = referenceComponents.get(component.key);
        if (!before) continue;
        const { selector, zone } = component;
        const text = comparableText(component.text);
        if (text === comparableText(before.text)) {
          const words = wordsToCompare(text);
          if (!words.length) continue;
          const measure = `« ${text.slice(0, 240)} » (${words.length} mot${words.length === 1 ? "" : "s"}, ${reference.lang} / ${page.lang})`;
          const baseline = existing.get(selector);
          if (baseline !== undefined) {
            compared[baseline] = { ...defects[baseline], valeur: `${defects[baseline].valeur} ; texte identique : ${measure}`, comparaison: { url: reference.url } };
            continue;
          }
          compared.push({ statut: words.length === 1 ? "SUSPECTED" : "VERIFIED_FAIL", sorte: "texte_non_traduit",
            message: "Le même texte visible figure dans les deux versions.", valeur: measure,
            selecteur: selector, zone, comparaison: { url: reference.url },
            ...(words.length === 1 ? { raison: "Un mot isolé peut être commun aux deux langues ou désigner un nom propre." } : {}) });
          continue;
        }
        const index = defects.findIndex(defect => defect.selecteur === selector && defect.statut === "VERIFIED_FAIL"
          && (defect.sorte === "debordement" || defect.sorte === "texte_rogne"));
        if (index < 0 || !before.fits || before.style !== component.style || before.hasExcludedText || component.hasExcludedText) continue;
        try {
          const image = await pairedCapture(client, original, before.zone, zone);
          compared[index] = { ...defects[index], sorte: "debordement_traduction",
            message: "Le texte déborde dans la version traduite et tient dans le même composant de la version de référence.",
            valeur: `${defects[index].valeur} sur la page ${page.lang} ; le texte tient sur la page ${reference.lang}.`,
            comparaison: { url: reference.url, image } };
        } catch (error) { options.unavailable?.(`Capture côte à côte indisponible : ${error instanceof Error ? error.message : String(error)}`); }
      }
      return compared;
    }, { timeoutMs: 22_000, signal: options.signal, render: true });
  } catch (error) {
    options.unavailable?.(error instanceof Error ? error.message : String(error));
    return defects;
  }
}
