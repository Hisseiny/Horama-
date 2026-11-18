export interface DiscoveryOptions {
  max?: number;
  fetch?: typeof globalThis.fetch;
}

export interface PageDiscovery {
  pages: string[];
  excluded: Array<{ url: string; reason: string }>;
  errors: Array<{ url: string; message: string }>;
}

function decodeEntities(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, key: string) => {
    if (key.startsWith("#")) {
      const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" } as Record<string, string>)[key.toLowerCase()];
  });
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3]) : undefined;
}

function locations(xml: string, entry: "url" | "sitemap"): string[] {
  const result: string[] = [];
  const entries = new RegExp(`<((?:[\\w-]+:)?${entry})\\b[^>]*>([\\s\\S]*?)<\\/\\1\\s*>`, "gi");
  for (const match of xml.replace(/<!--[\s\S]*?-->/g, "").matchAll(entries)) {
    for (const child of match[2].matchAll(/<((?:[\w-]+:)?[\w-]+)\b[^>]*?(?:\/>|>([\s\S]*?)<\/\1\s*>)/gi)) {
      if (child[1].split(":").at(-1) === "loc" && child[2]) result.push(decodeEntities(child[2].trim()));
    }
  }
  return result;
}

interface RobotRule { pattern: RegExp; length: number; allow: boolean }

function robotPath(value: string): string {
  try { value = decodeURI(value); } catch { /* Keep malformed escapes literal. */ }
  return value.replace(/%[\da-f]{2}/gi, (part) => part.toUpperCase());
}

function robots(text: string): { rules: RobotRule[]; sitemaps: string[] } {
  const rules: RobotRule[] = [], sitemaps: string[] = [];
  let agents: string[] = [], hasRules = false;
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*$/, "").trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const name = match[1].trim().toLowerCase(), value = match[2].trim();
    if (name === "sitemap") { sitemaps.push(value); continue; }
    if (name === "user-agent") {
      if (hasRules) { agents = []; hasRules = false; }
      agents.push(value.toLowerCase());
    } else if (name === "allow" || name === "disallow") {
      hasRules = true;
      if (!agents.includes("*") || !value) continue;
      const anchored = value.endsWith("$");
      const path = robotPath(anchored ? value.slice(0, -1) : value);
      const pattern = path.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
      rules.push({ pattern: new RegExp(`^${pattern}${anchored ? "$" : ""}`), length: path.replaceAll("*", "").length, allow: name === "allow" });
    }
  }
  return { rules, sitemaps };
}

// URLs are candidates, not visual verdicts; network failures stay visible to the caller.
export async function discoverPages(url: string, { max = 15, fetch: request = globalThis.fetch }: DiscoveryOptions = {}): Promise<PageDiscovery> {
  if (!Number.isSafeInteger(max) || max < 0) throw new Error("max doit être un entier positif ou nul.");
  const start = new URL(url);
  if (!/^https?:$/.test(start.protocol) || start.username || start.password) throw new Error("Adresse HTTP(S) sans identifiants requise.");
  const result: PageDiscovery = { pages: [], excluded: [], errors: [] };
  if (max === 0) return result;
  const site = start.hostname.replace(/^www\./, "");
  const root = new URL("/", start).href;
  const exclusions = new Set<string>(), seen = new Set<string>(), fetched = new Set<string>();
  let rules: RobotRule[] = [];

  function exclude(address: string, reason: string) {
    const key = `${address}\n${reason}`;
    if (!exclusions.has(key)) { exclusions.add(key); result.excluded.push({ url: address, reason }); }
  }

  function normalize(address: string, base: string): URL | undefined {
    let parsed: URL;
    try { parsed = new URL(address, base); } catch { exclude(address, "invalid-url"); return; }
    if (!/^https?:$/.test(parsed.protocol)) { exclude(parsed.href, "scheme"); return; }
    if (parsed.username || parsed.password) {
      parsed.username = ""; parsed.password = "";
      exclude(parsed.href, "credentials"); return;
    }
    if (parsed.hostname.replace(/^www\./, "") !== site || parsed.port !== start.port) { exclude(parsed.href, "external"); return; }
    parsed.protocol = start.protocol;
    parsed.host = start.host;
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_.*|gclid|dclid|fbclid|msclkid|gbraid|wbraid|mc_cid|mc_eid|_ga|_gl|_hsenc|_hsmi|hsctatracking|hsa_.*)$/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    return parsed;
  }

  function blocked(address: URL): boolean {
    const path = robotPath(address.pathname + address.search);
    const matches = rules.filter((rule) => rule.pattern.test(path)).sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow));
    return matches[0]?.allow === false;
  }

  function permitted(address: URL): boolean {
    if (blocked(address)) { exclude(address.href, "robots"); return false; }
    return true;
  }

  function pageAddress(address: string, base: string): string | undefined {
    const parsed = normalize(address, base);
    if (!parsed || !permitted(parsed)) return;
    let path: string;
    try { path = decodeURIComponent(parsed.pathname).toLowerCase(); } catch { exclude(parsed.href, "invalid-url"); return; }
    const destination = path + parsed.search.toLowerCase();
    if (/(?:^|[^a-z])(candidatur\w*|brochures?|contacts?|hubspot|hsforms|apply|application|admissions?|postuler|formulaire\w*|forms?)(?:[^a-z]|$)/.test(destination)) { exclude(parsed.href, "form"); return; }
    if (/(?:^|[^a-z])(log-?in|sign-?in|sign-?up|connexion|auth|logout|deconnexion|register|inscription)(?:[^a-z]|$)/.test(destination)) { exclude(parsed.href, "login"); return; }
    if (/\.[a-z\d]{1,10}\/?$/i.test(path) && !/\.(?:html?|php|aspx?)\/?$/i.test(path)) { exclude(parsed.href, "file"); return; }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    if (!permitted(parsed)) return;
    return parsed.href;
  }

  async function read(address: string, kind: "robots" | "sitemap" | "page"): Promise<{ body: string; url: string } | undefined> {
    for (let hop = 0; hop <= 5; hop++) {
      const key = `${kind}\n${address}`;
      if (fetched.has(key)) { if (hop > 0) exclude(address, "redirect"); return; }
      fetched.add(key);
      try {
        const response = await request(address, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Horama/1.0", Accept: kind === "page" ? "text/html,application/xhtml+xml" : "text/plain,application/xml,text/xml" } });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location || hop === 5) throw new Error("Redirection absente ou trop longue.");
          const next = new URL(location, address);
          const accepted = kind === "page" ? pageAddress(next.href, address) : normalize(next.href, address)?.href;
          await response.body?.cancel();
          if (!accepted || (kind !== "robots" && (!permitted(next) || !permitted(new URL(accepted))))) { exclude(address, "redirect"); return; }
          next.hash = "";
          address = next.href; continue;
        }
        if ((kind === "robots" || kind === "sitemap") && response.status === 404) {
          await response.body?.cancel(); return { body: "", url: address };
        }
        if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
        const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        if (kind === "page" && contentType && !["text/html", "application/xhtml+xml"].includes(contentType)) {
          await response.body?.cancel(); exclude(address, "content-type"); return;
        }
        return { body: await response.text(), url: address };
      } catch (error) {
        result.errors.push({ url: address, message: error instanceof Error ? error.message : String(error) });
        exclude(address, "unavailable"); return;
      }
    }
  }

  const policy = await read(new URL("robots.txt", root).href, "robots");
  if (!policy) { exclude(root, "robots-unavailable"); return result; }
  const parsedRobots = robots(policy.body);
  rules = parsedRobots.rules;
  const queue: string[] = [];
  function enqueue(address: string, base: string) {
    const candidate = pageAddress(address, base);
    if (candidate && !seen.has(candidate)) { seen.add(candidate); queue.push(candidate); }
  }
  enqueue(root, root);
  const sitemaps = [new URL("sitemap.xml", root).href, ...parsedRobots.sitemaps];
  const seenMaps = new Set<string>();
  async function readSitemap(address: string, base: string): Promise<void> {
    const parsed = normalize(address, base);
    if (!parsed || !permitted(parsed) || seenMaps.has(parsed.href)) return;
    seenMaps.add(parsed.href);
    if (seenMaps.size > 30) { exclude(parsed.href, "sitemap-limit"); return; }
    const document = await read(parsed.href, "sitemap");
    if (!document?.body) return;
    if (/<(?:[\w-]+:)?sitemapindex\b/i.test(document.body)) {
      for (const location of locations(document.body, "sitemap")) await readSitemap(location, document.url);
    } else if (/<(?:[\w-]+:)?urlset\b/i.test(document.body)) {
      for (const location of locations(document.body, "url")) enqueue(location, document.url);
    } else {
      result.errors.push({ url: document.url, message: "Plan du site XML non reconnu (urlset ou sitemapindex attendu)." });
    }
  }
  for (const sitemap of sitemaps) await readSitemap(sitemap, root);
  enqueue(start.href, root);
  let attempts = 0;
  for (let index = 0; index < queue.length; index++) {
    const address = queue[index];
    if (result.pages.includes(address)) continue;
    if (result.pages.length >= max) { exclude(address, "limit"); continue; }
    if (++attempts > max * 3) { exclude(address, "request-limit"); continue; }
    const document = await read(address, "page");
    if (!document) continue;
    const final = pageAddress(document.url, document.url)!;
    if (!result.pages.includes(final)) result.pages.push(final);
    const html = document.body.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
    const baseTag = html.match(/<base\b[^>]*>/i)?.[0];
    const href = baseTag && attribute(baseTag, "href");
    let base = document.url;
    if (href) { try { base = new URL(href, base).href; } catch { /* Keep the document URL for an invalid base. */ } }
    for (const match of html.matchAll(/<(a|area|form)\b[^>]*>/gi)) {
      const tag = match[0], form = match[1].toLowerCase() === "form";
      const target = attribute(tag, form ? "action" : "href");
      if (!target) continue;
      if (form || /\sdownload(?:\s|=|>)/i.test(tag)) {
        const parsed = normalize(target, base);
        if (parsed) exclude(parsed.href, form ? "form" : "file");
      } else enqueue(target, base);
    }
  }
  return result;
}
