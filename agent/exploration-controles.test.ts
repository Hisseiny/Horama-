import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { controlerPage, installerJournalConsole } from "./src/exploration/controles.ts";
import type { CdpClient } from "./src/exploration/controles.ts";

const chrome = process.env.CHROME_BIN ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const available = !spawnSync(chrome, ["--version"]).error;

test("contrôles mécaniques sur de vraies pages Chrome locales", { skip: !available && `Chrome absent : ${chrome}`, timeout: 60_000 }, async t => {
  const requests: string[] = [];
  const server = createServer(async (request, response) => {
    requests.push(`${request.method} ${request.url}`);
    if (request.url === "/healthy" || request.url === "/broken") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(await readFile(new URL(`./scripts/exploration-pages-essai/${request.url.slice(1)}.html`, import.meta.url)));
    } else if (request.url === "/overflow-cases") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><meta charset="utf-8"><body style="font:16px/20px sans-serif">
<nav><button id="icon" style="position:relative;width:120px;height:22px;padding:0;border:0;background:none;white-space:nowrap;font:inherit">Activités<span style="position:absolute;left:122px;top:5px;width:12px;height:12px;background:#333"></span></button></nav>
<a id="card" href="#" style="display:block;width:300px;height:168px;line-height:0"><div style="height:173px;background:#ccc"></div><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">s’ouvre dans un nouvel onglet</span></a>
<div id="few" style="height:20px;white-space:nowrap">Deux pixels de trop</div>
<div id="offscreen" style="position:absolute;left:-9999px;width:40px;white-space:nowrap">Texte beaucoup trop long pour la boîte</div>
<div id="hidden" style="visibility:hidden;width:40px;white-space:nowrap">Texte beaucoup trop long pour la boîte</div>
<div id="empty" style="width:0;height:0;white-space:nowrap">Texte beaucoup trop long pour la boîte</div>
<div id="ellipsis" style="width:40px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Texte beaucoup trop long pour la boîte</div>
<button id="ring" style="position:relative;width:61px;height:61px;border-radius:50%;border:0;margin:40px">▶${[..."En savoir plus"].map((c, i) => `<span style="position:absolute;left:26px;top:-16px;height:46px;transform-origin:4px 46px;transform:rotate(${i * 18 - 120}deg)">${c}</span>`).join("")}</button>
<button id="svg" style="width:61px;height:61px;border:0;padding:0"><svg width="61" height="61" overflow="visible"><text x="-20" y="-6">Texte sur un cercle</text></svg></button>
<button id="contents" style="width:60px;height:24px;padding:0;white-space:nowrap"><span style="display:contents">Texte beaucoup trop long</span></button>
<button id="contents-hidden" style="width:60px;height:24px;padding:0;white-space:nowrap"><span style="display:contents;visibility:hidden">Texte beaucoup trop long</span></button>
<div id="border" style="display:inline-block;border:8px solid #000;height:20px;white-space:nowrap">Texte qui touche la bordure</div>
<div style="transform:scale(.5);transform-origin:0 0"><button id="scaled" style="width:120px;height:24px;font-size:16px;line-height:20px;padding:0">Première ligne<br>Deuxième ligne</button></div>
<div id="real" style="width:60px;height:20px;white-space:nowrap;background:#eee">Texte beaucoup trop long pour la boîte</div>
<script>const few = document.getElementById("few"), range = document.createRange(); range.selectNodeContents(few); few.style.width = (range.getBoundingClientRect().width - 2) + "px"; const border = document.getElementById("border"); range.selectNodeContents(border); border.style.width = (range.getBoundingClientRect().width - 7) + "px";</script></body>`);
    } else if (request.url === "/many") {
      const links = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => `<a href="/ok-${from + i}">Lien ${from + i}</a>`).join("");
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><meta charset="utf-8"><nav>${links(0, 30)}<a href="/loop">Boucle</a></nav><main>${links(30, 55)}<a href="/redirect-dead">Journée portes ouvertes</a><a href="/away">Ailleurs</a></main>`);
    } else if (request.url === "/redirect" || request.url === "/fallback-redirect") {
      if (request.url === "/fallback-redirect" && request.method === "HEAD") response.writeHead(405).end();
      else response.writeHead(302, { Location: "/redirect-ok" }).end();
    } else if (request.url === "/redirect-dead" || request.url === "/hop" || request.url === "/loop") {
      response.writeHead(request.url === "/hop" ? 302 : 301, { Location: { "/redirect-dead": "/hop", "/hop": `${base}/gone`, "/loop": "/loop" }[request.url] }).end();
    } else if (request.url === "/away") {
      response.writeHead(302, { Location: base.replace("127.0.0.1", "localhost") + "/gone" }).end();
    } else if (request.url === "/redirect-ok" || request.url?.startsWith("/ok-")) {
      response.end("OK");
    } else if (request.url === "/fallback") {
      response.writeHead(request.method === "HEAD" ? 405 : 200).end("OK");
    } else response.writeHead(request.url === "/error" ? 500 : 404).end("Introuvable");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const profile = await mkdtemp(join(tmpdir(), "horama-controles-"));
  const process = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1280,900", "--force-device-scale-factor=1", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  t.after(async () => {
    process.kill();
    await once(process, "exit");
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  const endpoint = await new Promise<string>((resolve, reject) => {
    let output = "";
    process.stderr.on("data", chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) resolve(match[1]);
    });
    process.once("exit", code => reject(new Error(`Chrome terminé : ${code}`)));
  });
  const port = new URL(endpoint).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const target = targets.find(target => target.type === "page");
  assert.ok(target);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, "open");
  t.after(() => socket.close());
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const listeners = new Map<string, (value: any) => void>();
  socket.addEventListener("message", event => {
    const value = JSON.parse(String(event.data));
    if (value.id) {
      const promise = pending.get(value.id);
      pending.delete(value.id);
      if (value.error) promise?.reject(new Error(value.error.message));
      else promise?.resolve(value.result);
    } else listeners.get(value.method)?.(value.params);
  });
  const client: CdpClient = {
    send(method, params) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); },
    on(event, listener) { listeners.set(event, listener); },
  };
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  const navigate = async (path: string) => {
    const loaded = new Promise<void>(resolve => client.on("Page.loadEventFired", () => resolve()));
    await client.send("Page.navigate", { url: `${base}${path}` });
    await loaded;
  };
  t.diagnostic("Chrome connecté ; navigation locale.");
  await navigate("/healthy");
  const french = "Les étudiants travaillent avec les entreprises pour apprendre et découvrir le monde.";
  for (const [label, lang, html, count] of [
    ["français", "de-DE", `<p id="foreign">Les <strong>étudiants</strong> travaillent avec les entreprises pour apprendre et découvrir le monde.</p>`, 1],
    ["display contents", "de", `<p><span style="display:contents">${french}</span></p>`, 1],
    ["display contents autour du paragraphe", "de", `<span style="display:contents"><p>${french}</p></span>`, 1],
    ["display contents caché", "de", `<p><span style="display:contents;opacity:0">${french}</span></p>`, 0],
    ["display contents avec langue", "de", `<p><span style="display:contents" lang="fr">${french}</span></p>`, 0],
    ["display contents langue de", "de", `<p><span style="display:contents" lang="de">${french}</span></p>`, 1],
    ["display contents langue erronée", "de", `<p><span style="display:contents" lang="en">${french}</span></p>`, 1],
    ["allemand", "de", "<p>Die Studierenden lernen mit den Unternehmen und entdecken die Welt für ihre Zukunft.</p>", 0],
    ["on a français", "fr", "<p>On a travaillé, on a discuté, on a beaucoup appris ensemble.</p>", 0],
    ["in an allemand", "de", "<p>In Berlin arbeiten Studierende an Projekten, in Hamburg an Prototypen.</p>", 0],
    ["or français", "fr", "<p>Or on a travaillé, or on a discuté ensemble.</p>", 0],
    ["lang explicite", "de", `<section lang="fr"><p>${french}</p></section>`, 0],
    ["phrase courte", "de", "<p>Les étudiants et les entreprises.</p>", 0],
    ["code", "de", `<code>${french}</code><pre>${french}</pre>`, 0],
    ["caché", "de", `<p hidden>${french}</p><p style="display:none">${french}</p>`, 0],
    ["lecteur d'écran", "de", `<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${french}</span>`, 0],
    ["ambigu", "de", "<p>Paris Berlin London Madrid Rome Lisbon Oslo et Stockholm.</p>", 0],
    ["noms propres", "de", "<p>Le Havre La Rochelle Le Mans La Baule</p>", 0],
    ["lang incorrect", "de", `<p lang="en">${french}</p>`, 1],
    ["vide", "de", "<p></p>", 0],
    ["langue absente", "", `<p>${french}</p>`, 0],
    ["langue inconnue", "es", `<p>${french}</p>`, 0],
    ["anglais", "fr", "<p>The students are working with the companies for their future and their careers.</p>", 1],
  ] as const) {
    await client.send("Runtime.evaluate", { expression: `document.documentElement.lang = ${JSON.stringify(lang)}; document.body.innerHTML = ${JSON.stringify(html)}` });
    const defects = (await controlerPage(client, { maxLiens: 0 })).filter(defect => defect.sorte === "texte_non_traduit");
    assert.equal(defects.length, count, label);
    if (count) assert.ok(defects[0].zone && defects[0].zone.largeur > 0 && defects[0].zone.hauteur > 0, label);
    if (label === "français") {
      assert.equal(defects[0].statut, "VERIFIED_FAIL");
      assert.equal(defects[0].selecteur, "#foreign");
      assert.equal(defects[0].valeur, "1 bloc en français ; le plus long : 12 mots, 6 mots outils français, 0 allemands ; page déclarée de");
      assert.ok(defects[0].zone);
    }
  }
  await client.send("Runtime.evaluate", { expression: `document.documentElement.lang = 'de'; document.body.innerHTML = ${JSON.stringify(`<p>${french}</p><p id="largest">${french} ${french}</p><p>The students are working with the companies for their future and their careers.</p>`)}` });
  const grouped = (await controlerPage(client, { maxLiens: 0 })).filter(defect => defect.sorte === "texte_non_traduit");
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].selecteur, "#largest");
  assert.equal(grouped[0].message, "2 blocs en français, 1 bloc en anglais ; le plus long : 24 mots, 12 mots outils français, 0 allemands ; page déclarée de");
  assert.equal(grouped[0].valeur, grouped[0].message);
  assert.ok(grouped[0].zone);
  await navigate("/healthy");
  assert.deepEqual(await controlerPage(client), []);
  await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = '<main>' + ['code', 'pre', 'kbd', 'samp', 'var'].map(tag => '<' + tag + '>null <span>undefined <span>NULL</span></span></' + tag + '>').join('') + '</main>'` });
  assert.ok(!(await controlerPage(client, { maxLiens: 0 })).some(defect => defect.sorte === "texte_erreur"));
  await client.send("Runtime.evaluate", { expression: `document.querySelector('main').insertAdjacentHTML('beforeend', '<p id="error">Erreur : undefined</p>')` });
  assert.deepEqual((await controlerPage(client, { maxLiens: 0 })).filter(defect => defect.sorte === "texte_erreur").map(defect => [defect.selecteur, defect.valeur]), [["#error", "undefined"]]);
  await client.send("Runtime.evaluate", { expression: "document.body.innerHTML = ''" });
  assert.ok(!(await controlerPage(client, { maxLiens: 0 })).some(defect => defect.sorte === "texte_erreur"));
  await navigate("/broken");
  const defects = await controlerPage(client);
  t.diagnostic(`Page défectueuse : ${defects.map(defect => defect.sorte).join(", ")}`);
  for (const kind of ["debordement", "image_cassee", "lien_casse", "texte_erreur", "erreur_console", "defilement_horizontal"]) assert.ok(defects.some(defect => defect.sorte === kind), kind);
  assert.ok(defects.some(defect => defect.valeur === "Erreur de démonstration"));
  assert.ok(defects.some(defect => String(defect.valeur).includes("Exception de démonstration")));
  assert.equal(defects.filter(defect => defect.sorte === "lien_casse").length, 1);
  assert.deepEqual(requests.filter(value => value.endsWith(" /redirect")), ["HEAD /redirect"]);
  assert.ok(requests.includes("HEAD /redirect-ok"));
  assert.deepEqual(requests.filter(value => value.endsWith(" /fallback-redirect")), ["HEAD /fallback-redirect", "GET /fallback-redirect"]);
  assert.ok(requests.includes("GET /redirect-ok"));
  assert.deepEqual(requests.filter(value => value.endsWith(" /fallback")), ["HEAD /fallback", "GET /fallback"]);
  assert.ok(defects.find(defect => defect.sorte === "debordement")?.zone);
  assert.ok(defects.some(defect => defect.sorte === "debordement" && defect.selecteur === "#overflow"));
  assert.ok(defects.some(defect => defect.sorte === "debordement" && defect.selecteur === "#vertical-overflow"));
  for (const tag of ["html", "body"]) {
    for (const overflow of ["hidden", "clip"]) {
      await client.send("Runtime.evaluate", { expression: `document.querySelector('${tag}').style.overflowX = '${overflow}'` });
      assert.ok(!(await controlerPage(client, { maxLiens: 0 })).some(defect => defect.sorte === "defilement_horizontal"), `${tag} overflow-x: ${overflow}`);
      await client.send("Runtime.evaluate", { expression: `document.querySelector('${tag}').style.overflowX = ''` });
    }
  }
  let active = 0;
  let count = 0;
  await controlerPage(client, { maxLiens: 1, fetch: async () => {
    assert.equal(active++, 0); count++; await Promise.resolve(); active--;
    throw new Error("Réseau indisponible");
  } });
  assert.equal(count, 1);
  await client.send("Runtime.evaluate", { expression: `document.body.append(' undefined '); for (let i = 0; i < 25; i++) { const a = document.createElement('a'); a.href = '/extra-' + i; a.textContent = 'Lien'; document.body.append(a); }` });
  count = 0;
  const limited = await controlerPage(client, { maxLiens: 100, fetch: async () => {
    assert.equal(active++, 0); count++; await Promise.resolve(); active--;
    return new Response(null, { status: 200 });
  } });
  assert.equal(count, 29);
  assert.ok(limited.some(defect => defect.sorte === "texte_erreur" && defect.selecteur === "html > body:nth-child(2)"));
  let started = Date.now();
  count = 0;
  await controlerPage(client, { delaiLiensMs: 200, fetch: async () => { count++; await new Promise(resolve => setTimeout(resolve, 60)); return new Response(null, { status: 200 }); } });
  t.diagnostic(`Budget de 200 ms : ${count} liens, ${Date.now() - started} ms`);
  assert.ok(count >= 2 && count <= 5, String(count));
  assert.ok(Date.now() - started < 2000);
  await navigate("/overflow-cases");
  const overflows = (await controlerPage(client, { maxLiens: 0 })).filter(defect => defect.sorte === "debordement");
  t.diagnostic(`Débordements : ${overflows.map(defect => `${defect.selecteur} ${defect.valeur}`).join(", ")}`);
  assert.deepEqual(overflows.map(defect => defect.selecteur), ["#contents", "#border", "#scaled", "#real"]);
  const before = await client.send("Runtime.evaluate", { returnByValue: true, expression: "['icon', 'card', 'few', 'ring', 'svg'].map(id => { const e = document.getElementById(id); return e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1; })" });
  assert.deepEqual(before.result.value, [true, true, true, true, true], "l'ancienne règle les aurait signalés");
  await client.send("Runtime.evaluate", { expression: `document.body.innerHTML = \`
    <style>button { width:80px; height:28px; white-space:nowrap; overflow:hidden; font:16px/20px sans-serif; padding:0; border:0 }</style>
    <button id="german">Krankenversicherungsunternehmen</button>
    <button id="ellipsis" style="text-overflow:ellipsis">Krankenversicherungsunternehmen</button>
    <button id="fits">Hallo</button>
    <button id="hidden" style="display:none">Krankenversicherungsunternehmen</button>
    <button id="transparent" style="opacity:0">Krankenversicherungsunternehmen</button>
    <button id="screen-reader" class="sr-only">Krankenversicherungsunternehmen</button>
    <button id="replacement" style="text-indent:-9999px;background:red">Krankenversicherungsunternehmen</button>
    <button id="clip-one" style="position:absolute;width:1px;height:1px;clip:rect(0,0,0,0)">Krankenversicherungsunternehmen</button>
    <div aria-roledescription="carousel"><button>Krankenversicherungsunternehmen</button></div>
    <div style="overflow-x:auto;width:100px"><button>Krankenversicherungsunternehmen</button></div>
    <div id="multiline" style="overflow:clip;width:120px;height:20px;font:16px/20px sans-serif"><span>Erste Zeile<br>Zweite Zeile</span></div>
    <div id="image-only" style="overflow:hidden;width:40px;height:20px"><span style="display:block;width:200px;height:40px;background:red"></span></div>
    <p id="line-clamp" style="width:100px;font:16px/20px sans-serif;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden">Erste Zeile zweite Zeile dritte Zeile vierte Zeile fünfte Zeile</p>
    <div id="ellipsis-card" style="overflow:hidden;width:100px;height:80px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Krankenversicherungsunternehmen</div><img width="200" height="20" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='20'/%3E"></div>
    <div id="clipping-parent" style="overflow:hidden;width:100px;height:80px"><div style="width:400px;overflow:hidden;white-space:nowrap"><span>Krankenversicherungsunternehmen</span></div></div>
    <div id="inline-clipping-parent" style="overflow:hidden;width:100px;height:80px;white-space:nowrap"><span style="overflow:hidden">Krankenversicherungsunternehmen</span></div>
  \`` });
  const clippedText = (await controlerPage(client, { maxLiens: 0 })).filter(defect => defect.sorte === "texte_rogne");
  t.diagnostic(`Textes rognés : ${clippedText.map(defect => defect.selecteur).join(", ")}`);
  assert.deepEqual(clippedText.map(defect => defect.selecteur), ["#german", "#multiline", "#clipping-parent", "#inline-clipping-parent"]);
  assert.ok(clippedText.every(defect => defect.zone && defect.statut === "VERIFIED_FAIL"));
  await navigate("/many");
  started = Date.now();
  const many = await controlerPage(client);
  t.diagnostic(`56 liens et une boucle : ${Date.now() - started} ms`);
  const dead = many.filter(defect => defect.sorte === "lien_casse");
  assert.equal(dead.length, 1);
  assert.equal(dead[0].valeur, `${base}/redirect-dead : 404`);
  assert.match(dead[0].message, new RegExp(`après 2 redirections, à ${base}/gone qui renvoie HTTP 404`));
  assert.ok(dead[0].zone && dead[0].selecteur);
  assert.equal(requests.filter(value => value === "HEAD /loop").length, 6);
  assert.equal(requests.filter(value => value.endsWith(" /gone")).length, 2, "la redirection vers un autre hôte n'est pas suivie");
  requests.length = 0;
  const first = await controlerPage(client, { maxLiens: 26 });
  assert.equal(first.filter(defect => defect.sorte === "lien_casse").length, 1);
  assert.ok(!requests.some(value => /\/ok-([0-9]|[12][0-9]) |\/loop/.test(`${value} `)), "liens de la zone principale d'abord");
  await navigate("/error");
  assert.ok((await controlerPage(client)).some(defect => defect.sorte === "page_en_erreur" && defect.valeur === 500));
  await navigate("/healthy");
  assert.deepEqual(await controlerPage(client), []);

  const sent: string[] = [];
  const callerEvents: string[] = [];
  const caller: CdpClient = {
    send(method, params) { sent.push(method); return client.send(method, params); },
    on() { throw new Error("Les listeners de l'appelant ne doivent pas être remplacés."); },
  };
  client.on("Runtime.consoleAPICalled", event => callerEvents.push(event.args.map((arg: any) => arg.value).join(" ")));
  await installerJournalConsole(caller);
  await navigate("/broken");
  await client.send("Runtime.evaluate", { expression: "console.error(Object.create(null)); const frame = document.createElement('iframe'); frame.srcdoc = '<script>console.error(\"Erreur du cadre\")<\\/script>'; document.body.append(frame); new Promise(resolve => frame.onload = resolve)", awaitPromise: true });
  const shared = await controlerPage(caller, { connexionAppelant: true });
  t.diagnostic(`Connexion de l'appelant : ${shared.map(defect => defect.sorte).join(", ")}`);
  assert.ok(!sent.includes("Runtime.disable") && !sent.includes("Runtime.enable"));
  for (const kind of ["debordement", "image_cassee", "lien_casse", "texte_erreur", "erreur_console"]) assert.ok(shared.some(defect => defect.sorte === kind), kind);
  assert.ok(shared.some(defect => defect.valeur === "Erreur de démonstration"));
  assert.ok(shared.some(defect => defect.valeur === "Erreur du cadre"));
  assert.ok(shared.some(defect => defect.valeur === "[object Object]"));
  assert.ok(shared.some(defect => String(defect.valeur).includes("Exception de démonstration")));
  await client.send("Runtime.evaluate", { expression: "console.error('Après le contrôle')" });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(callerEvents.includes("Erreur de démonstration") && callerEvents.includes("Après le contrôle"));
  await navigate("/healthy");
  assert.deepEqual(await controlerPage(caller, { connexionAppelant: true }), []);
});
