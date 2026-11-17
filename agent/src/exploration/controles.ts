export interface CdpClient {
  send(method: string, params?: object): Promise<any>;
  on(event: string, listener: (params: any) => void): void;
}

export interface Defaut {
  statut: "VERIFIED_FAIL";
  sorte: "page_en_erreur" | "image_cassee" | "defilement_horizontal" | "debordement" | "lien_casse" | "texte_erreur" | "erreur_console";
  message: string;
  selecteur?: string;
  zone?: { x: number; y: number; largeur: number; hauteur: number };
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
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).filter(link => {
    if (!URL.canParse(link.href, location.href)) return false;
    const url = new URL(link.href, location.href);
    return visible(link) && url.origin === location.origin && /^https?:$/.test(url.protocol) && !(url.pathname === location.pathname && url.search === location.search);
  }).map(link => { const url = new URL(link.href); url.hash = ""; return { url: url.href, ...proof(link) }; });
  return { defects, links };
}

// Utiliser une connexion CDP dédiée : Runtime désactivé puis réactivé, listeners remplacés.
export async function controlerPage(client: CdpClient, options: { maxLiens?: number; fetch?: typeof fetch } = {}): Promise<Defaut[]> {
  const consoleDefects: Defaut[] = [];
  const record = (value: string) => {
    if (!consoleDefects.some(defect => defect.valeur === value)) consoleDefects.push({ statut: "VERIFIED_FAIL", sorte: "erreur_console", message: "Une erreur JavaScript est présente dans la console.", valeur: value });
  };
  await client.send("Runtime.disable");
  client.on("Runtime.exceptionThrown", event => record(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text));
  client.on("Runtime.consoleAPICalled", event => {
    if (event.type === "error") record(event.args.map((arg: any) => arg.value === undefined ? arg.description ?? arg.type : String(arg.value)).join(" "));
  });
  try {
    await client.send("Runtime.enable");
    const result = await client.send("Runtime.evaluate", { expression: `(${inspectDocument.toString()})()`, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`Contrôle CDP impossible : ${result.exceptionDetails.text}`);
    const { defects, links } = result.result.value as ReturnType<typeof inspectDocument>;
    const request = options.fetch ?? fetch;
    const limit = Math.min(20, Math.max(0, Math.floor(options.maxLiens ?? 20)));
    const seen = new Set<string>();
    for (const link of links) {
      if (seen.has(link.url)) continue;
      if (seen.size >= limit) break;
      seen.add(link.url);
      try {
        let response = await request(link.url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(10_000) });
        if (response.status === 405) {
          await response.body?.cancel();
          response = await request(link.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(10_000) });
        }
        await response.body?.cancel();
        if (response.type !== "opaqueredirect" && response.status >= 400) defects.push({ statut: "VERIFIED_FAIL", sorte: "lien_casse", message: `Le lien interne renvoie HTTP ${response.status}.`, selecteur: link.selecteur, zone: link.zone, valeur: `${link.url} : ${response.status}` });
      } catch { /* Une absence de réponse ne prouve pas un lien cassé. */ }
    }
    return [...defects, ...consoleDefects];
  } finally {
    client.on("Runtime.exceptionThrown", () => {});
    client.on("Runtime.consoleAPICalled", () => {});
  }
}
