// Preview of the theme (theme-horama.js) on the real layer (couche-horama.js), without touching either file:
// the few lines that wire the theme into the layer (see THEME.md) are applied in memory, then a short scripted visit is
// played on a page and captured. If the layer changed and a wiring point is no longer found, the script stops and says
// which one.
// Usage: node automatisation/scene/apercu-theme.mjs <url> <outDir> [--facturo]
//   default visit: the live site of Eugenia School; --facturo: the fake SaaS (total of the invoice list).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, outDir] = process.argv.slice(2);
const FACTURO = process.argv.includes("--facturo");
if (!url || !outDir) {
  console.error("Usage : node apercu-theme.mjs <url> <dossier> [--facturo]");
  process.exit(2);
}
const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

// ---------- The wiring, applied in memory (the same lines are proposed to the owner of the layer in THEME.md) ----------
export const WIRING = [
  ["signature", "(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate)", "(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate, THEME = {})"],
  ["sprites, mots et logo", "  const LOGO = ", "  Object.assign(SPRITES, THEME.sprites ?? {});\n  Object.assign(STAMPS, THEME.stamps ?? {});\n  const LOGO = THEME.logo ?? "],
  ["styles", "\n  </style>", "\n    ${THEME.css ?? \"\"}\n  </style>"],
  ["haut de l'écran libre", "const top = TITLE ? 72 : 8;", "const top = TITLE && THEME.banniere !== \"bas\" ? 72 : 8;\n    const floor = innerHeight - (TITLE && THEME.banniere === \"bas\" ? 84 : 8);"],
  ["bas de l'écran réservé (1)", "for (let y = top; y <= innerHeight - M - 8; y += 20)", "for (let y = top; y <= floor - M; y += 20)"],
  ["bas de l'écran réservé (2)", "Math.min(y + M / 2 - height / 2, innerHeight - height - 8)", "Math.min(y + M / 2 - height / 2, floor - height)"],
  ["lettre de la trouvaille", "element(\"b\", \"\", zone.n)", "element(\"b\", \"\", THEME.numero ? THEME.numero(zone.n) : zone.n)"],
  ["récapitulatif", "      end.replaceChildren(Object.assign(element(\"div\", \"logo\")", "      if (THEME.recap) THEME.recap(end, { titre, compte, legende, fichiers });\n      else end.replaceChildren(Object.assign(element(\"div\", \"logo\")"],
];
export function wire(layer) {
  let out = layer;
  for (const [name, from, to] of WIRING) {
    if (!out.includes(from)) throw new Error(`Point de branchement introuvable dans couche-horama.js : ${name}`);
    out = out.replace(from, to);
  }
  return out;
}

const source = `(() => {\n${read("./node_modules/rough-notation/lib/rough-notation.iife.js")};\n${wire(read("./couche-horama.js"))}("apercu-theme", "Horama vérifie le site", {}, RoughNotation.annotate, ${read("./theme-horama.js")}());\n})();`;

// ---------- Chrome over CDP ----------
const CHROME = process.env.CHROME ?? (process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const PORT = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), `horama-theme-${Date.now()}`)}`, "--window-size=1600,1000", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let ws;
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((done, fail) => {
  const n = ++id;
  pending.set(n, { done, fail });
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
};
mkdirSync(outDir, { recursive: true });
let shot = 0;
const capture = async (name) => {
  await sleep(900);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const file = join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(file);
};
// The rectangle (page coordinates) of the highest visible element whose text starts with `text` (the shortest one on a tie).
const rectOf = (text, selector = "a, button, h1, h2, h3, p, span, td, div") => evaluate(`(() => {
  const want = ${JSON.stringify(text.toLowerCase())};
  const all = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => (e.innerText || "").trim().toLowerCase().startsWith(want) && e.offsetParent);
  const el = all.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.innerText.length - b.innerText.length)[0];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), largeur: Math.round(r.width), hauteur: Math.round(r.height) };
})()`);

try {
  let targets;
  for (let i = 0; i < 60 && !targets?.length; i++) {
    try {
      targets = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter((t) => t.type === "page");
    } catch {}
    await sleep(250);
  }
  ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((done) => (ws.onopen = done));
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.error ? waiter.fail(new Error(message.error.message)) : waiter.done(message.result);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source });
  await send("Page.navigate", { url });
  for (let i = 0; i < 80 && !(await evaluate("!!window.__horama && document.readyState === 'complete'").catch(() => false)); i++) await sleep(250);
  await sleep(1500);
  const here = await evaluate("location.pathname + location.search");
  const H = (call) => evaluate(`window.__horama.${call}`);

  if (FACTURO) {
    // The total: the last cell of the last row of the invoice table.
    const total = await evaluate(`(() => { const c = [...document.querySelectorAll("tr")].pop()?.lastElementChild; if (!c) return null; const r = c.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), largeur: Math.round(r.width), hauteur: Math.round(r.height) }; })()`);
    const exporter = await rectOf("Exporter", "a, button");
    await H(`etat("verification")`);
    await capture("lecture");
    if (total) await H(`surligner(${JSON.stringify(here)}, [${JSON.stringify(total)}], "defaut", "total")`);
    await H(`compteur(1, 1, 0)`);
    await H(`etat("defaut", true)`);
    await capture("defaut");
    if (exporter) await H(`surligner(${JSON.stringify(here)}, [${JSON.stringify(exporter)}], "doute", "exporter")`);
    await H(`compteur(1, 1, 1)`);
    await H(`etat("interrogation")`);
    await capture("doute");
    await H(`question({ id: "total", texte: "La ligne « Total » affiche 1 400,00 €, l'addition fait 1 420,00 €. Bug, ou voulu ?", rang: "Question 1 sur 2", etat: "defaut" })`);
    await capture("question");
    await H(`choisir("bug")`);
    await capture("reponse-bug");
  } else {
    const titre = await rectOf("l’école de l’ia") ?? await rectOf("l'école de l'ia");
    const candidater = await rectOf("candidater", "a, button");
    const bachelor = await rectOf("découvrir le bachelor");
    await H(`etat("verification")`);
    await capture("lecture");
    if (titre) await H(`surligner(${JSON.stringify(here)}, [${JSON.stringify(titre)}], "defaut", "titre")`);
    await H(`compteur(1, 1, 0)`);
    await H(`etat("defaut", true)`);
    await capture("defaut");
    if (candidater) await H(`surligner(${JSON.stringify(here)}, [${JSON.stringify(candidater)}], "doute", "candidater", ${JSON.stringify(bachelor && { ...bachelor, y: bachelor.y + 70 })})`);
    await H(`compteur(1, 1, 1)`);
    await H(`etat("interrogation")`);
    await capture("doute");
    await H(`question({ id: "candidater", texte: "Le bouton « Candidater » a changé depuis la dernière version. Bug, ou voulu ?", rang: "Question 1 sur 2", etat: "interrogation" })`);
    await capture("question");
    await H(`choisir("voulu")`);
    await capture("reponse-voulu");
  }
  await H(`fin({ titre: "Tout est tranché.", compte: "2 conformes · 1 défaut · 0 à trancher", legende: "Valeurs d'exemple : aperçu du thème, pas un vrai passage.", fichiers: ["vault-horama/decisions/2026-11-18-exemple-1.md", "vault-horama/decisions/2026-11-18-exemple-2.md"] })`);
  await capture("recapitulatif");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
}
