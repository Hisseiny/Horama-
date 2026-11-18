import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverPages, renderPage } from "./src/exploration/pages.ts";

const origin = "https://www.example.test";
type Reply = string | Error | (() => Response);

function fixture(routes: Record<string, Reply>) {
  const calls: string[] = [];
  let active = false;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    assert.equal(active, false, "Les requêtes doivent être en série.");
    assert.equal(init?.redirect, "manual");
    assert.ok(init?.signal);
    active = true;
    const url = String(input);
    calls.push(url);
    await Promise.resolve();
    active = false;
    const path = url.slice(origin.length);
    const reply = routes[url] ?? routes[path];
    if (reply instanceof Error) throw reply;
    if (typeof reply === "function") return reply();
    if (reply === undefined) return new Response("Absent", { status: 404 });
    return new Response(reply, { headers: { "content-type": path === "/robots.txt" ? "text/plain" : /\.xml$/.test(path) ? "application/xml" : "text/html; charset=utf-8" } });
  };
  return { calls, fetch };
}

const sitemap = (...urls: string[]) => `<urlset>${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`;
const link = (...urls: string[]) => urls.map((url) => `<a href="${url}">Page</a>`).join("");
const redirect = (location: string) => () => new Response(null, { status: 302, headers: { location } });

test("repli rendu : seuil, erreurs visibles et budget partagé", async () => {
  const setup = fixture({ "/": '<div id="root"></div>' });
  const calls: string[] = [];
  const result = await discoverPages(origin, { ...setup, max: 4, render: async url => {
    calls.push(url);
    throw new Error("Chrome absent");
  } });
  assert.deepEqual(result.pages, [origin + "/"]);
  assert.deepEqual(calls, [origin + "/"]);
  assert.match(result.errors[0].message, /Rendu.*Chrome absent/);
  const enough = fixture({ "/": link("/one", "/two"), "/one": "", "/two": "" });
  await discoverPages(origin, { ...enough, render: async () => { assert.fail("Pas de repli au seuil"); } });
  const empty = fixture({ "/robots.txt": "User-agent: *\nDisallow: /" });
  assert.deepEqual((await discoverPages(origin, { ...empty, render: async () => { assert.fail("Robots"); } })).pages, []);
  const budget = fixture({ "/": "" });
  const limited = await discoverPages(origin, { ...budget, max: 2, render: async url => ({ url, body: link(...Array.from({ length: 20 }, (_, i) => `/missing-${i}`)) }) });
  assert.equal(budget.calls.length, 7);
  assert.ok(limited.excluded.some(item => item.reason === "request-limit"));
  const chain = fixture({ "/": "", "/next": "", "/end": "" });
  const continued = await discoverPages(origin, { ...chain, max: 6, render: async url => ({
    url: url.endsWith("/next") ? origin + "/final" : url,
    body: url.endsWith("/next") ? link("/end") : url.endsWith("/end") ? "" : link("/next"),
  }) });
  assert.deepEqual(continued.pages, ["/", "/final", "/end"].map(path => origin + path));
  const unavailable = fixture({ "/": "" });
  assert.match((await discoverPages(origin, { ...unavailable, render: async () => undefined })).errors[0].message, /Rendu indisponible/);
});

test("Chrome réel découvre une page JS locale sans clic ni soumission et ferme ses onglets", { timeout: 30000 }, async () => {
  const requests: string[] = [];
  const html = '<div id="root"></div><script>setTimeout(() => { document.getElementById("root").innerHTML = ' + JSON.stringify('<nav><a href="/about">About</a><a href="/contact">Contact</a><a href="/private">Private</a><a href="/file.pdf">PDF</a><a href="/login">Login</a><a href="/send">Send</a><a href="/redirect">Redirect</a></nav><form action="/send"><input></form>') + '; }, 50)</script>';
  const server = createServer((req, res) => {
    requests.push(req.url!);
    if (req.url === "/robots.txt") { res.end("User-agent: *\nDisallow: /private"); return; }
    if (req.url === "/sitemap.xml") { res.writeHead(404); res.end(); return; }
    if (req.url === "/redirect") { res.writeHead(302, { location: "/private" }); res.end(); return; }
    res.setHeader("content-type", "text/html");
    res.end(req.url === "/" ? html : '<main>Page<form><input></form></main>');
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const profile = mkdtempSync(join(tmpdir(), "horama-pages-chrome-"));
  const chrome = spawn("google-chrome", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--force-device-scale-factor=1", "--window-size=1280,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Chrome indisponible")), 8000);
      chrome.once("error", error => { clearTimeout(timer); reject(error); });
      chrome.stderr.on("data", chunk => {
        const match = String(chunk).match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      });
    });
    const before = await discoverPages(base, { max: 8 });
    assert.deepEqual(before.pages, [base + "/"]);
    const result = await discoverPages(base, { max: 8, render: (url, allowed) => renderPage(port, url, allowed) });
    assert.deepEqual(result.pages, ["/", "/about", "/contact"].map(path => base + path));
    assert.deepEqual(result.errors, []);
    for (const reason of ["robots", "file", "login", "form"]) assert.ok(result.excluded.some(item => item.reason === reason));
    assert.ok(!requests.some(path => /private|file\.pdf|login|send/.test(path)));
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json() as Array<{ type: string }>;
    assert.equal(tabs.filter(tab => tab.type === "page").length, 1);
    await assert.rejects(renderPage(port, base + "/redirect", url => !url.endsWith("/private")), /ERR_BLOCKED/);
    assert.ok(!requests.includes("/private"));
  } finally {
    chrome.kill();
    await new Promise<void>(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once("exit", () => resolve()); });
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(profile, { recursive: true, force: true });
  }
});

test("la locale et un préfixe majoritaire ne sont pas des sections répétitives", async () => {
  for (const prefix of ["/fr", "/products"]) {
    const paths = ["/about", "/services", "/team", "/help"].map((path) => prefix + path);
    const setup = fixture({
      "/": "",
      [prefix + "/"]: `<nav>${link(...paths)}</nav>`,
      ...Object.fromEntries(paths.map((path) => [path, ""])),
    });
    const result = await discoverPages(origin + prefix + "/", setup);
    assert.deepEqual(result.pages, [prefix, "/", ...paths].map((path) => origin + path));
    assert.ok(!result.excluded.some((item) => item.reason === "section-limit"));
  }
});

test("la requête initiale utilise l'adresse normalisée autorisée par robots", async () => {
  const setup = fixture({ "/robots.txt": "User-agent: *\nDisallow: /?utm_source=", "/": "" });
  const result = await discoverPages(origin + "/?utm_source=blocked", setup);
  assert.deepEqual(result.pages, [origin + "/"]);
  assert.ok(!setup.calls.some((url) => url.includes("utm_source")));
  assert.deepEqual(result.errors, []);
});

test("actions de formulaires globales : sitemap et candidats déjà en file ne déclenchent aucun GET", async () => {
  for (const onHomepage of [true, false]) {
    const action = '<form action="/application/"><input name="email"></form>';
    const setup = fixture({
      "/": `<nav>${link("/form-page", "/application")}</nav>` + (onHomepage ? action : ""),
      "/sitemap.xml": sitemap("/application", "/safe"),
      "/form-page": onHomepage ? "" : action,
      "/safe": "", "/application": "",
    });
    const result = await discoverPages(origin, setup);
    assert.deepEqual(result.pages, ["/", "/form-page", "/safe"].map((path) => origin + path));
    assert.ok(!setup.calls.some((url) => /\/application\/?$/.test(url)));
    assert.ok(result.excluded.some((item) => item.url === origin + "/application" && item.reason === "form"));
    assert.deepEqual(result.errors, []);
  }
});

test("garde le départ profond en premier sans consommer le plafond ni la réservation de sa section", async () => {
  const paths = ["/news/a", "/news/b", "/news/c", "/events/a", "/events/b", "/events/c", "/other"];
  for (const failed of [false, true]) {
    const setup = fixture({
      "/": "",
      "/news/start": `<footer>${link("/menu")}</footer>`, "/menu": "",
      "/sitemap.xml": sitemap(...paths),
      ...Object.fromEntries(paths.map((path) => [path, ""])),
      ...(failed ? { "/events/a": () => new Response("Erreur", { status: 503 }) } : {}),
    });
    const result = await discoverPages(origin + "/news/start?utm_source=test#top", { ...setup, max: 4, sectionMax: 1 });
    assert.equal(result.pages[0], origin + "/news/start");
    assert.equal(result.pages[1], origin + "/");
    assert.deepEqual(result.pages, ["/news/start", "/", "/news/a", failed ? "/events/b" : "/events/a"].map((path) => origin + path));
    assert.equal(result.errors.length, failed ? 1 : 0);
    assert.equal(result.pages.filter((url) => url.includes("/news/")).length, 2);
    assert.ok(!setup.calls.includes(origin + "/news/b"));
  }
  const alone = fixture({ "/news/start": "", "/sitemap.xml": sitemap(...paths), ...Object.fromEntries(paths.map((path) => [path, ""])) });
  assert.deepEqual((await discoverPages(origin + "/news/start", { ...alone, max: 1, sectionMax: 1 })).pages, [origin + "/news/start"]);
});

test("racine en deuxième avant le nav et hors locale, sauf robots ou erreur HTTP", async () => {
  for (const mode of ["normal", "blocked", "error"]) {
    const setup = fixture({
      "/robots.txt": mode === "blocked" ? "User-agent: *\nDisallow: /$" : "",
      "/en/article": `<nav>${link("/en/about")}</nav>`, "/en/about": "",
      "/": mode === "error" ? () => new Response("Erreur", { status: 503 }) : "",
    });
    const result = await discoverPages(origin + "/en/article", { ...setup, max: 3 });
    assert.equal(result.pages[0], origin + "/en/article");
    assert.deepEqual(result.pages, (mode === "normal" ? ["/en/article", "/", "/en/about"] : ["/en/article", "/en/about"]).map((path) => origin + path));
    assert.equal(result.errors.length, mode === "error" ? 1 : 0);
    if (mode === "blocked") {
      assert.ok(!setup.calls.includes(origin + "/"));
      assert.ok(result.excluded.some((item) => item.url === origin + "/" && item.reason === "robots"));
    }
  }
});

test("réserve sur le footer, garde l'ordre sitemap dans chaque section", async () => {
  const menu = Array.from({ length: 8 }, (_, index) => `/menu-${index}`);
  const articles = ["/journal/z", "/journal/a", "/journal/m"];
  const events = ["/agenda/three", "/agenda/one", "/agenda/two"];
  const routes: Record<string, Reply> = {
    "/": `<footer>${link(...menu)}</footer>`,
    "/sitemap.xml": sitemap(...articles, ...events),
    ...Object.fromEntries([...menu, ...articles, ...events].map((path) => [path, ""])),
  };
  const setup = fixture(routes);
  const result = await discoverPages(origin, { ...setup, max: 5 });
  assert.deepEqual(result.pages, ["/", ...menu.slice(0, 2), articles[0], events[0]].map((path) => origin + path));
  assert.deepEqual(result.errors, []);
  const roomy = fixture(routes);
  const full = await discoverPages(origin, { ...roomy, max: 15 });
  assert.deepEqual(full.pages.filter((url) => url.includes("/journal/")), articles.slice(0, 2).map((path) => origin + path));
  assert.deepEqual(full.pages.filter((url) => url.includes("/agenda/")), events.slice(0, 2).map((path) => origin + path));
  assert.equal(full.excluded.filter((item) => item.reason === "section-limit").length, 2);
});

test("réservation bornée par max, remplace une erreur par le candidat suivant", async () => {
  const paths = ["/news/z", "/news/a", "/news/b", "/events/z", "/events/a", "/events/b"];
  const routes: Record<string, Reply> = {
    "/": `<footer>${link("/about", "/help")}</footer>`, "/about": "", "/help": "",
    "/sitemap.xml": sitemap(...paths),
    ...Object.fromEntries(paths.map((path) => [path, ""])),
    "/news/z": () => new Response("Erreur", { status: 503 }),
  };
  const setup = fixture(routes);
  const result = await discoverPages(origin, { ...setup, max: 3 });
  assert.deepEqual(result.pages, ["/", "/news/a", "/events/z"].map((path) => origin + path));
  assert.deepEqual(result.errors.map((error) => error.message), ["HTTP 503"]);
  const tiny = fixture(routes);
  assert.deepEqual((await discoverPages(origin, { ...tiny, max: 2 })).pages, [origin + "/", origin + "/news/a"]);
  const empty = fixture({ "/": "" });
  assert.deepEqual((await discoverPages(origin, { ...empty, max: 1 })).pages, [origin + "/"]);
});

test("protège le nav et réserve les places restantes sur footer et sitemap", async () => {
  const paths = ["/news/z", "/news/a", "/news/b", "/events/z", "/events/a", "/events/b"];
  for (const mode of ["normal", "full", "error", "empty"]) {
    const setup = fixture({
      "/": `<nav>${mode === "empty" ? "" : link("/about#top", "/help")}</nav><footer>${link("/legal", "/contact")}</footer>`,
      "/sitemap.xml": sitemap("/about", "/help", "/map-only", ...paths),
      ...Object.fromEntries(["/about", "/help", "/legal", "/contact", "/map-only", ...paths].map((path) => [path, ""])),
      ...(mode === "error" ? { "/about": () => new Response("Erreur", { status: 503 }) } : {}),
    });
    const max = mode === "full" ? 3 : mode === "error" || mode === "empty" ? 4 : 5;
    const result = await discoverPages(origin, { ...setup, max });
    const expected = mode === "full" ? ["/", "/about", "/help"]
      : mode === "error" ? ["/", "/help", "/news/z", "/events/z"]
      : mode === "empty" ? ["/", "/legal", "/news/z", "/events/z"]
      : ["/", "/about", "/help", "/news/z", "/events/z"];
    assert.deepEqual(result.pages, expected.map((path) => origin + path));
    assert.equal(result.errors.length, mode === "error" ? 1 : 0);
  }
});

test("préfère les pages de la locale initiale, même aux liens de menu internationaux", async () => {
  for (const locale of ["/fr/fr", "/fr", "/en", "/pt-BR"]) {
    const start = locale === "/fr/fr" ? locale + ".html" : locale + "/";
    const paths = ["/other/en/page", locale + "/services", locale + "/products", locale + "ance/other"];
    const setup = fixture({
      "/": "",
      [start]: `<nav>${link(paths[0], paths[1])}</nav>`,
      "/sitemap.xml": sitemap(paths[3], paths[2]),
      [paths[1]]: link(locale + "/details"),
      [locale + "/details"]: "", [paths[2]]: "", [paths[0]]: "", [paths[3]]: "",
    });
    const result = await discoverPages(origin + start, { ...setup, max: 5, sectionMax: 10 });
    assert.deepEqual(result.pages, [start.replace(/\/$/, ""), "/", paths[1], paths[2], locale + "/details"].map((path) => origin + path));
    assert.ok(!setup.calls.includes(origin + paths[0]));
    assert.deepEqual(result.errors, []);
  }
});

test("locale sans autre page disponible : conserve le repli hors locale", async () => {
  const setup = fixture({ "/": "", "/en/": link("/shared"), "/shared": "" });
  const result = await discoverPages(origin + "/en/", setup);
  assert.deepEqual(result.pages, [origin + "/en", origin + "/", origin + "/shared"]);
  assert.deepEqual(result.errors, []);
});

test("menu et footer anglais avant sitemap, sections répétitives plafonnées sans mots-clés", async () => {
  const paths = ["/en/stories/one", "/en/stories/two", "/en/stories/three", "/en/stories/four"];
  const setup = fixture({
    "/": link("/body") + `<header><nav>${link("/about", ...paths)}</nav></header><footer>${link("/help")}</footer>`,
    "/sitemap.xml": sitemap(...paths, "/map"),
    "/about": "", "/help": "", "/body": "", "/map": "",
    ...Object.fromEntries(paths.map((path) => [path, ""])),
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, ["/", "/about", ...paths.slice(0, 2), "/help", "/map", "/body"].map((path) => origin + path));
  assert.equal(result.excluded.filter((item) => item.reason === "section-limit").length, 2);
  assert.ok(!setup.calls.includes(origin + paths[2]));
  assert.deepEqual(result.errors, []);
  const other = ["/about", "/help", "/team", "/products", "/services"];
  const custom = fixture({ "/": `<nav>${link(...paths, ...other)}</nav>`, ...Object.fromEntries([...paths, ...other].map((path) => [path, ""])) });
  assert.equal((await discoverPages(origin, { ...custom, sectionMax: 1 })).pages.filter((url) => url.includes("/stories/")).length, 1);
});

test("sans sitemap, garde les pages informatives d'admission et les formulaires visitables", async () => {
  const paths = ["/processus-admission", "/guide-de-candidature", "/contact", "/apply", "/admission"];
  const setup = fixture({ "/": `<nav>${link(...paths)}</nav>`, ...Object.fromEntries(paths.map((path) => [path, '<form action="/submit"><input name="email"></form>'])) });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, ["/", ...paths].map((path) => origin + path));
  assert.deepEqual(result.errors, []);
  assert.ok(!setup.calls.includes(origin + "/submit"));
  for (const sectionMax of [0, -1, 1.5, NaN]) await assert.rejects(discoverPages(origin, { ...setup, sectionMax }), /sectionMax/);
});

test("répartit le budget entre sous-menus, y compris leurs derniers liens", async () => {
  const groups = [["/courses/one", "/courses/two", "/courses/three"], ["/about", "/campus", "/team", "/jobs"], ["/processus-admission", "/funding", "/apply", "/faq"]];
  const setup = fixture({ "/": `<nav><ul>${groups.map((group) => `<li><ul>${link(...group)}</ul></li>`).join("")}</ul></nav>`, ...Object.fromEntries(groups.flat().map((path) => [path, ""])) });
  const result = await discoverPages(origin, { ...setup, max: 9, sectionMax: 3 });
  for (const path of ["/courses/one", "/courses/two", "/about", "/campus", "/processus-admission", "/faq"]) assert.ok(result.pages.includes(origin + path));
  assert.deepEqual(result.errors, []);
});

test("accueil, sitemap puis liens HTML, ordre stable et requêtes séquentielles", async () => {
  const setup = fixture({
    "/robots.txt": "User-agent: *\nDisallow:",
    "/sitemap.xml": sitemap("/second", "/first", "/second/"),
    "/": link("/html-only", "/first"),
    "/second": link("/nested"), "/first": "", "/html-only": "", "/nested": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, ["/", "/second", "/first", "/html-only", "/nested"].map((path) => origin + path));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(setup.calls, ["/robots.txt", "/", "/sitemap.xml", "/second", "/first", "/html-only", "/nested"].map((path) => origin + path));
});

test("index de sitemaps imbriqué, cycle, namespace, CDATA et entités XML", async () => {
  const setup = fixture({
    "/robots.txt": "Sitemap: /extra.xml\nSitemap: http://[invalid",
    "/sitemap.xml": "<sitemapindex><sitemap><loc>/a.xml</loc></sitemap><sitemap><loc>/b.xml</loc></sitemap></sitemapindex>",
    "/a.xml": "<sm:sitemapindex><sm:sitemap><sm:loc>/inner.xml</sm:loc></sm:sitemap><sm:sitemap><sm:loc>/sitemap.xml</sm:loc></sm:sitemap></sm:sitemapindex>",
    "/inner.xml": "<sm:urlset><sm:url><sm:loc><![CDATA[/first?a=1&b=2]]></sm:loc></sm:url></sm:urlset>",
    "/b.xml": sitemap("/second?a=2&amp;b=3"), "/extra.xml": sitemap("/third"),
    "/": "", "/first?a=1&b=2": "", "/second?a=2&b=3": "", "/third": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, ["/", "/first?a=1&b=2", "/second?a=2&b=3", "/third"].map((path) => origin + path));
  assert.deepEqual(result.errors, []);
  assert.equal(setup.calls.filter((url) => url.endsWith("/sitemap.xml")).length, 1);
  assert.ok(result.excluded.some((item) => item.reason === "invalid-url"));
});

test("normalise www, protocole, fragments, suivi, slash final et ordre des paramètres", async () => {
  const setup = fixture({
    "/": link("https://example.test/course/?utm_source=x&gclid=y&fbclid=z#top", "/course?UTM_medium=x&msclkid=y", "/course/", "/search?b=2&amp;a=1&_ga=x&_gl=y&mc_cid=z&_hsenc=x&hsa_ad=y", "/search?a=1&#38;b=2", "http://example.test/course/#other"),
    "/course": "", "/search?a=1&b=2": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/course", origin + "/search?a=1&b=2"]);
  assert.deepEqual(result.errors, []);
});

test("les image:loc sans extension ne consomment pas le budget des pages HTML", async () => {
  for (const prefix of ["", "sm:"]) {
    const images = Array.from({ length: 12 }, (_, i) => `<image:image><image:loc>/asset-${i}</image:loc></image:image>`).join("");
    const routes: Record<string, Reply> = {
      "/sitemap.xml": `<${prefix}urlset><${prefix}url><${prefix}loc>/first</${prefix}loc>${images}</${prefix}url><${prefix}url><${prefix}loc>/second</${prefix}loc></${prefix}url></${prefix}urlset>`,
      "/": "", "/first": "", "/second": "",
    };
    for (let i = 0; i < 12; i++) routes[`/asset-${i}`] = () => new Response("Image", { headers: { "content-type": "image/png" } });
    const setup = fixture(routes);
    const result = await discoverPages(origin, { ...setup, max: 3 });
    assert.deepEqual(result.pages, ["/", "/first", "/second"].map((path) => origin + path));
    assert.deepEqual(result.errors, []);
    assert.ok(!setup.calls.some((url) => url.includes("/asset-")));
    assert.ok(!result.excluded.some((item) => item.reason === "request-limit"));
  }
});

test("robots * avant tout GET, groupes multiples, Allow spécifique, wildcard et fin de chaîne", async () => {
  const setup = fixture({
    "/robots.txt": "User-agent: OtherBot\nDisallow: /public\n\nUser-agent: *\nDisallow: /private\nAllow: /private/open\nDisallow: /*?secret=*$\nDisallow: /exact$\n\nUser-agent: *\nDisallow: /second\n\nUser-agent: AnotherBot\nDisallow: /",
    "/sitemap.xml": sitemap("/private", "/private/open", "/public", "/page?secret=1", "/exact", "/exactly", "/second", "/%70rivate/hidden"),
    "/": "", "/private/open": "", "/public": "", "/exactly": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, ["/", "/private/open", "/public", "/exactly"].map((path) => origin + path));
  assert.equal(result.excluded.filter((item) => item.reason === "robots").length, 5);
  assert.ok(!setup.calls.some((url) => /secret|second|hidden/.test(url)));
  assert.deepEqual(result.errors, []);
});

test("robots bloque aussi les sitemaps et le slash avant normalisation", async () => {
  const setup = fixture({
    "/robots.txt": "User-agent: *\nDisallow: /sitemap.xml\nDisallow: /blocked/",
    "/": link("/blocked/", "/safe"), "/safe": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/safe"]);
  assert.ok(!setup.calls.some((url) => url.includes("sitemap") || url.includes("blocked")));
});

test("adresse initiale interdite : ne la lit pas, conserve les candidats du sitemap", async () => {
  const setup = fixture({ "/robots.txt": "User-agent: *\nDisallow: /private", "/sitemap.xml": sitemap("/safe"), "/safe": "" });
  const result = await discoverPages(origin + "/private", setup);
  assert.deepEqual(result.pages, [origin + "/safe"]);
  assert.ok(!setup.calls.includes(origin + "/private"));
  assert.deepEqual(result.errors, []);
});

test("robots compare les encodages équivalents des chemins et priorise Allow à égalité", async () => {
  const setup = fixture({
    "/robots.txt": "User-agent: *\nDisallow: /%70rivate\nDisallow: /caf%C3%A9\nDisallow: /a%2fb\nDisallow: /open\nAllow: /open",
    "/sitemap.xml": sitemap("/private", "/caf%C3%A9", "/a%2Fb", "/open"), "/": "", "/open": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/open"]);
  assert.equal(result.excluded.filter((item) => item.reason === "robots").length, 3);
  assert.deepEqual(result.errors, []);
});

test("exclut formulaires, fichiers, connexions, sous-domaines et protocoles non HTTP", async () => {
  const targets = ["/submit", "https://forms.gle/123", "https://demo.typeform.com/to/123", "/login", "/sign-in", "/connexion", "/auth/callback", "/file.PDF", "/picture.png?x=1", "/archive.zip", "https://other.test/x", "https://blog.example.test/x", "https://example.test:8443/x", "mailto:test@example.test", "tel:123", "javascript:alert(1)", "https://user:password@example.test/secret"];
  const setup = fixture({ "/": link(...targets) + '<form action="/submit"><input name="email"></form><a download href="/download">Fichier</a>' });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/"]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.excluded.filter((item) => item.reason === "form").length, 3);
  assert.equal(result.excluded.filter((item) => item.reason === "login").length, 4);
  assert.equal(result.excluded.filter((item) => item.reason === "file").length, 4);
  assert.equal(result.excluded.filter((item) => item.reason === "external").length, 3);
  assert.equal(result.excluded.filter((item) => item.reason === "scheme").length, 3);
  assert.ok(!JSON.stringify(result).includes("password"));
  assert.deepEqual(setup.calls, ["/robots.txt", "/", "/sitemap.xml"].map((path) => origin + path));
});

test("HTML relatif, base, area, attribut non cité, commentaires/scripts ignorés et entités numériques", async () => {
  const setup = fixture({
    "/": '<base href="/directory/"><!-- <a href="/comment"> --><script>const x = \'<a href="/script">\'</script><style>/* <a href="/style"> */</style><a data-href="/wrong" href=child>Enfant</a><area href="../map&#x3f;x=1&#38;y=2"><a href=\'../other\'>Autre</a>',
    "/directory/child": "", "/map?x=1&y=2": "", "/other": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, ["/", "/directory/child", "/map?x=1&y=2", "/other"].map((path) => origin + path));
  assert.deepEqual(result.errors, []);
});

test("base externe ne transforme pas ses liens relatifs en pages internes", async () => {
  const setup = fixture({ "/": '<base href="https://other.test/"><a href="relative">Externe</a>' });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/"]);
  assert.equal(result.excluded[0].reason, "external");
});

test("plafond par défaut 15, configurable, exclusions du surplus sans GET", async () => {
  const routes: Record<string, Reply> = { "/sitemap.xml": sitemap(...Array.from({ length: 20 }, (_, i) => `/page-${i}`)), "/": "" };
  for (let i = 0; i < 20; i++) routes[`/page-${i}`] = "";
  const setup = fixture(routes), result = await discoverPages(origin, setup);
  assert.equal(result.pages.length, 15);
  assert.equal(result.excluded.filter((item) => item.reason === "limit").length, 6);
  assert.equal(setup.calls.length, 17);
  const small = fixture(routes), reduced = await discoverPages(origin, { ...small, max: 2 });
  assert.deepEqual(reduced.pages, [origin + "/", origin + "/page-0"]);
  assert.equal(small.calls.length, 4);
  const zero = fixture({});
  assert.deepEqual(await discoverPages(origin, { ...zero, max: 0 }), { pages: [], excluded: [], errors: [] });
  assert.deepEqual(zero.calls, []);
});

test("robots indisponible : arrêt fermé ; absence 404 : repli sur les liens HTML", async () => {
  for (const reply of [new Error("Réseau coupé"), () => new Response("Indisponible", { status: 503 })]) {
    const setup = fixture({ "/robots.txt": reply, "/": "" });
    const result = await discoverPages(origin, setup);
    assert.deepEqual(result.pages, []);
    assert.equal(result.errors.length, 1);
    assert.ok(result.excluded.some((item) => item.reason === "robots-unavailable"));
    assert.deepEqual(setup.calls, [origin + "/robots.txt"]);
  }
  const setup = fixture({ "/": link("/fallback"), "/fallback": "" });
  assert.deepEqual((await discoverPages(origin, setup)).pages, [origin + "/", origin + "/fallback"]);
});

test("erreurs HTTP/réseau visibles, type de contenu non HTML exclu, découverte poursuivie", async () => {
  const setup = fixture({
    "/sitemap.xml": sitemap("/http-error", "/network-error", "/document", "/good"), "/": "",
    "/http-error": () => new Response("Erreur", { status: 500 }), "/network-error": new Error("Déconnecté"),
    "/document": () => new Response("PDF", { headers: { "content-type": "application/pdf" } }), "/good": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/good"]);
  assert.deepEqual(result.errors.map((item) => item.message), ["HTTP 500", "Déconnecté"]);
  assert.ok(result.excluded.some((item) => item.reason === "content-type"));
});

test("redirections validées avant GET : robots, domaine et formulaires", async () => {
  const setup = fixture({
    "/robots.txt": "User-agent: *\nDisallow: /private",
    "/sitemap.xml": sitemap("/to-form", "/to-private", "/to-external", "/to-good"), "/": "",
    "/to-form": redirect("/submit"), "/to-private": redirect("/private"), "/to-external": redirect("https://other.test/"), "/to-good": redirect("/good"), "/good": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/good"]);
  assert.ok(!setup.calls.some((url) => url === origin + "/submit" || url === origin + "/private" || url.includes("other.test")));
  assert.deepEqual(result.errors, []);
});

test("redirections slash et www suivies sans boucle, URL finale normalisée et dédoublonnée", async () => {
  const setup = fixture({
    "/sitemap.xml": sitemap("/course", "/alias"), "/": "",
    "/course": redirect("https://example.test/course/"),
    "https://example.test/course/": link("child"),
    "/alias": redirect("https://example.test/course/"), "/course/child": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/course", origin + "/course/child"]);
  assert.equal(setup.calls.filter((url) => url === "https://example.test/course/").length, 1);
  assert.deepEqual(result.errors, []);
});

test("robots valide aussi la cible brute d'une redirection avant le retrait du suivi", async () => {
  const setup = fixture({
    "/robots.txt": "User-agent: *\nDisallow: /safe?utm_source=",
    "/": link("/to-tracked", "/loop"),
    "/to-tracked": redirect("/safe?utm_source=blocked"), "/loop": redirect("/loop"),
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/"]);
  assert.ok(!setup.calls.some((url) => url.includes("/safe")));
  assert.ok(result.excluded.some((item) => item.url.endsWith("/loop") && item.reason === "redirect"));
  assert.ok(result.excluded.some((item) => item.reason === "robots"));
});

test("sitemap mal formé et redirection robots externe ne sont pas des réussites silencieuses", async () => {
  const setup = fixture({ "/sitemap.xml": "<html>Erreur</html>", "/": "" });
  const result = await discoverPages(origin, setup);
  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.pages, [origin + "/"]);
  const blocked = fixture({ "/robots.txt": redirect("https://other.test/robots.txt"), "/": "" });
  const stopped = await discoverPages(origin, blocked);
  assert.deepEqual(stopped.pages, []);
  assert.ok(stopped.excluded.some((item) => item.reason === "robots-unavailable"));
  assert.equal(blocked.calls.length, 1);
});

test("sitemap redirigé vers l'accueil HTML ne consomme pas la lecture de la page et de ses liens", async () => {
  const setup = fixture({ "/sitemap.xml": redirect("/"), "/": link("/second"), "/second": "" });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/second"]);
  assert.equal(result.errors.length, 1);
  assert.equal(setup.calls.filter((url) => url === origin + "/").length, 2);
});

test("borne les tentatives de pages et d'index de sitemaps", async () => {
  const setup = fixture({ "/sitemap.xml": sitemap(...Array.from({ length: 20 }, (_, i) => `/missing-${i}`)) });
  const result = await discoverPages(origin, { ...setup, max: 2 });
  assert.deepEqual(result.pages, []);
  assert.equal(setup.calls.length, 8);
  assert.ok(result.excluded.some((item) => item.reason === "request-limit"));
  const maps = fixture({ "/sitemap.xml": `<sitemapindex>${Array.from({ length: 35 }, (_, i) => `<sitemap><loc>/map-${i}.xml</loc></sitemap>`).join("")}</sitemapindex>`, "/": "" });
  const limited = await discoverPages(origin, maps);
  assert.equal(maps.calls.filter((url) => url.endsWith(".xml")).length, 30);
  assert.equal(limited.excluded.filter((item) => item.reason === "sitemap-limit").length, 6);
});

test("options invalides rejetées avant tout réseau", async () => {
  const setup = fixture({});
  for (const max of [-1, 1.5, NaN, Infinity]) await assert.rejects(discoverPages(origin, { ...setup, max }), /max/);
  await assert.rejects(discoverPages("file:///tmp/local", setup), /HTTP/);
  await assert.rejects(discoverPages("https://user:password@example.test", setup), /identifiants/);
  assert.deepEqual(setup.calls, []);
});
