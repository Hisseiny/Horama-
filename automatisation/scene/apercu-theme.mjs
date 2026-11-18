// Preview of the theme (theme-horama.js) on the real layer (couche-horama.js), without touching either file: the few
// lines that wire the theme into the layer (see THEME.md) are applied in memory, then a short scripted course is
// played on a page and captured. If the layer changed and a wiring point is no longer found, the script stops and says
// which one.
// Usage: node automatisation/scene/apercu-theme.mjs <url> <outDir> [--facturo]
//   THEME_FILE=./theme-collage-nuit.js to preview the second proposal instead of theme-horama.js.
//   default course: the live site of Eugenia School; --facturo: the fake SaaS (total of the invoice list).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

// ---------- The wiring, applied in memory (the same lines are proposed to the owner of the layer in THEME.md) ----------
export const WIRING = [
  ["signature", "(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate)", "(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate, THEME = {})"],
  ["couleurs et mots", "  const STAMPS = { bug: \"Bug noté\", voulu: \"Voulu\" };", "  const STAMPS = { bug: \"Bug noté\", voulu: \"Voulu\" };\n  Object.assign(COLORS, THEME.colors ?? {});\n  Object.assign(STAMPS, THEME.stamps ?? {});"],
  ["mascotte", "\n  // ---------- Sizes and times ----------", "\n  Object.assign(SPRITES, THEME.sprites ?? {});\n\n  // ---------- Sizes and times ----------"],
  ["styles", "\n  </style>", "\n    ${THEME.css ?? \"\"}\n  </style>"],
];
export function wire(layer) {
  let out = layer;
  for (const [name, from, to] of WIRING) {
    if (!out.includes(from)) throw new Error(`Point de branchement introuvable dans couche-horama.js : ${name}`);
    out = out.replace(from, to);
  }
  return out;
}

const [url, outDir] = process.argv.slice(2);
const FACTURO = process.argv.includes("--facturo");
if (!url || !outDir) {
  console.error("Usage : node apercu-theme.mjs <url> <dossier> [--facturo]");
  process.exit(2);
}
const source = `(() => {\n${read("./node_modules/rough-notation/lib/rough-notation.iife.js")};\n${wire(read("./couche-horama.js"))}("apercu-theme", "Horama vérifie le site", {}, RoughNotation.annotate, ${read(process.env.THEME_FILE ?? "./theme-horama.js")}());\n})();`;

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
  await sleep(1200);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const file = join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(file);
};
// The capture of the screen as the layer's panel shows it: a data: address, taken with the layer hidden.
const still = async () => {
  await evaluate("window.__horama.masquer()");
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
  await evaluate("window.__horama.montrer()");
  return `data:image/jpeg;base64,${data}`;
};
// The rectangle (page coordinates) of the highest visible element whose text starts with `text` (the shortest one on a
// tie), among the elements the selector finds.
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
  const page = { largeur: 1600, hauteur: 1000 };
  const H = (call) => evaluate(`window.__horama.${call}`);
  const J = JSON.stringify;

  // The two findings of the course: a proven defect and a doubt (with where the thing used to be).
  let defect;
  let doubt;
  let before = null;
  let texts;
  if (FACTURO) {
    // The total: the last cell of the last row of the invoice table.
    defect = await evaluate(`(() => { const c = [...document.querySelectorAll("tr")].pop()?.lastElementChild; if (!c) return null; const r = c.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), largeur: Math.round(r.width), hauteur: Math.round(r.height) }; })()`);
    doubt = await rectOf("Exporter", "a, button");
    texts = { defaut: "La ligne « Total » affiche 1 400,00 €, l'addition fait 1 420,00 €.", doute: "« Exporter » a changé de place depuis la version 12." };
  } else {
    defect = (await rectOf("l’école de l’ia")) ?? (await rectOf("l'école de l'ia"));
    doubt = await rectOf("candidater", "a, button");
    const bachelor = await rectOf("découvrir le bachelor", "a, button");
    before = bachelor && { ...bachelor, y: bachelor.y + 70 };
    texts = { defaut: "Le titre de la page d'accueil n'est plus celui de la documentation.", doute: "Le bouton « Candidater » a changé depuis la dernière version." };
  }

  await H(`etat("verification")`);
  await capture("lecture");
  if (defect) await H(`surligner(${J(here)}, [${J(defect)}], "defaut", "defaut-1")`);
  await H(`etat("defaut", true)`);
  await capture("defaut");
  if (doubt) await H(`surligner(${J(here)}, [${J(doubt)}], "doute", "doute-1", ${J(before)})`);
  await H(`etat("interrogation")`);
  await capture("doute");

  // The panel shows captures of the screen: zones in pixels of the capture (the viewport).
  const scroll = await evaluate("scrollY");
  const image = await still();
  const view = (rect) => (rect ? [{ ...rect, y: rect.y - scroll }] : []);
  const items = [
    { id: "defaut-1", genre: "defaut", texte: texts.defaut, image, zones: view(defect), page },
    { id: "doute-1", genre: "doute", texte: texts.doute, image, zones: view(doubt), page },
  ];
  await H(`recap({ titre: "Horama a parcouru le site.", lignes: ["Valeurs d'exemple : aperçu du thème, pas un vrai passage."], items: ${J(items)} })`);
  await capture("recapitulatif");
  await H(`examen({ id: "doute-1", rang: "Question 1 sur 2", genre: "doute", etat: "interrogation", image: ${J(image)}, zones: ${J(view(doubt))}, page: ${J(page)}, textes: [${J(texts.doute)}], question: "Est-ce un bug, ou est-ce voulu ?" })`);
  await capture("question");
  await H(`choisir("voulu")`);
  await capture("reponse-voulu");
  await H(`panneau()`);
  await H(`correction({ id: "doute-1", file: "vault-horama/eugenia/produit/accueil.md", before: "Le bouton « Candidater » est en rouge, sous le titre.", after: "Le bouton « Candidater » est dans le menu, en haut à droite." })`);
  await capture("correction");
  await H(`fin({ titre: "Tout est tranché.", compte: "1 bug à corriger, 1 changement voulu, la note mise à jour.", legende: "Écrit dans le vault (valeurs d'exemple)", fichiers: ["vault-horama/eugenia/decisions/2026-11-18-exemple-1.md", "vault-horama/eugenia/decisions/2026-11-18-exemple-2.md"] })`);
  await capture("fin");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
}
