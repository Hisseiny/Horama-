import assert from "node:assert/strict";
import { test } from "node:test";
import { discoverPages } from "./src/exploration/pages.ts";

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
  assert.deepEqual(setup.calls, ["/robots.txt", "/sitemap.xml", "/", "/second", "/first", "/html-only", "/nested"].map((path) => origin + path));
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
  const targets = ["/candidature", "/brochure-bachelor", "/contact", "/apply/now", "/hubspot/form", "/hsforms/123", "/formulaire", "/admission", "/login", "/sign-in", "/connexion", "/auth/callback", "/file.PDF", "/picture.png?x=1", "/archive.zip", "https://other.test/x", "https://blog.example.test/x", "https://example.test:8443/x", "mailto:test@example.test", "tel:123", "javascript:alert(1)", "https://user:password@example.test/secret"];
  const setup = fixture({ "/": link(...targets) + '<form action="/submit"><input name="email"></form><a download href="/download">Fichier</a>' });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/"]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.excluded.filter((item) => item.reason === "form").length, 9);
  assert.equal(result.excluded.filter((item) => item.reason === "login").length, 4);
  assert.equal(result.excluded.filter((item) => item.reason === "file").length, 4);
  assert.equal(result.excluded.filter((item) => item.reason === "external").length, 3);
  assert.equal(result.excluded.filter((item) => item.reason === "scheme").length, 3);
  assert.ok(!JSON.stringify(result).includes("password"));
  assert.deepEqual(setup.calls, ["/robots.txt", "/sitemap.xml", "/"].map((path) => origin + path));
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
    "/to-form": redirect("/contact"), "/to-private": redirect("/private"), "/to-external": redirect("https://other.test/"), "/to-good": redirect("/good"), "/good": "",
  });
  const result = await discoverPages(origin, setup);
  assert.deepEqual(result.pages, [origin + "/", origin + "/good"]);
  assert.ok(!setup.calls.some((url) => url === origin + "/contact" || url === origin + "/private" || url.includes("other.test")));
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
