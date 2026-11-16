// The live scene (docs/decisions/2026-11-16-scene-en-direct.md): the accepted tests of the vault become one course on
// the tested software, in a visible local Chrome. The H agent clicks: a cursor travels to each click, held until it
// arrives. At each relever: our capture (layer hidden), the check (jugement/verification), then the mascot presents
// what was found on this screen, one thing at a time, and the agent only gets its answer once it has finished (or at
// the cap). At the end the course goes back over each defect and each doubt, a human says « bug » or « voulu », and
// each choice is written in the vault as a decision.
// Starts from the T7 probe (sonde-t7.mjs): same Chrome, same bridge, same session, same rules given to the agent.
//
// Usage: node [--env-file=<.env.local>] automatisation/scene/parcours.mjs [--sans-agent] [--rythme <s>]
//          [--plafond <s>] [--clic-direct] [--choix bug,voulu,...] [--sans-fin] [--par <nom>]
//          [--vault <dir>] [--logiciel facturo] [--version 13] [--reference 12] [--tests a,b,c] [--r <ids>]
//          [--verification <file>] [--ecrire-references] [--temoins <dir>] [--film <dir>] [--sortie <dir>]
//          [--port 9333] [--profil <dir>] [--fermer-chrome]
// Env: HAI_API_KEY, FAUX_SAAS_URL, CHROME_BIN, HOLO_BIN, HAI_AGENT_MODEL, HAI_AGENT_REASONING.
// Exit: 0 every relevé taken and nothing failed, 1 otherwise, 2 something is missing, 130 Ctrl+C.
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ecrireDecision, ecrireReference, lireDecisions, lireNotes, lireReferences, lireTestsAcceptes } from "../../memoire/index.ts";
import { COURSE_RULES, END_TOOL, agentPass, findHolo, stopAgent, stopIfMissing } from "./agent-h.mjs";
import { HEIGHT, WIDTH, capture, clickAt, closeChrome, connectTab, evaluate, fitViewport, flag, installLayer, layer, navigate, openChrome, option, say, sleep, waitFor } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SANS_AGENT = flag("sans-agent");
const VAULT = resolve(option("vault", join(HERE, "../../vault-horama")));
const LOGICIEL = option("logiciel", "facturo");
const VERSION = option("version", "13");
const REFERENCE = option("reference", "12");
const RYTHME = Number(option("rythme", 0));
const WRITE_REFERENCES = flag("ecrire-references");
const PORT = Number(option("port", 9333));
const PROFILE = resolve(option("profil", "/Users/nathan/Code/projet/horama/.orchestrateur/chrome-agent"));
const ID = `${new Date().toLocaleString("sv-SE").slice(0, 16).replace(" ", "-").replace(":", "h")}-${randomUUID().slice(0, 4)}`;
const OUT = resolve(option("sortie", `/Users/nathan/Code/projet/horama/.orchestrateur/passages/${ID}`));
const WITNESSES = option("temoins") ? resolve(option("temoins")) : null;
const FILM = option("film") ? resolve(option("film")) : null;
const DIRECT = flag("clic-direct");
const CAP_MS = Number(option("plafond", 12)) * 1000;
const CHOICES = flag("choix") ? option("choix").split(",") : [];
const PAR = option("par", "Nathan");
const CHECK_FILE = resolve(option("verification", join(HERE, "../../jugement/verification/index.ts")));
const CHROME_BIN = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = (process.env.FAUX_SAAS_URL || "https://facturo-demo.vercel.app").replace(/\/$/, "");

// The named views of a screen: value of the `filtre` parameter of the address, and first version that has the view
// (docs/decisions/2026-11-16-url-faux-saas.md). The path of a screen comes from its note in the vault (field `url`).
const VIEWS = { defaut: { filtre: null }, "filtre-echeance": { filtre: "echeance-depassee", since: 13 } };

// ---------- The course, from the accepted tests of the vault ----------
const missing = [];
const notes = lireNotes(VAULT, LOGICIEL);
const accepted = lireTestsAcceptes(VAULT, LOGICIEL);
const wanted = flag("tests") ? option("tests").split(",") : accepted.map((test) => test.id);
const unknown = wanted.filter((id) => !accepted.some((test) => test.id === id));
if (unknown.length) missing.push(`Test accepté introuvable dans ${join(VAULT, LOGICIEL, "tests")} : ${unknown.join(", ")}.`);
const dropped = [];
const tests = wanted.flatMap((id) => accepted.filter((test) => test.id === id)).filter((test) => {
  const late = test.releves.find(({ vue }) => VIEWS[vue]?.since > Number(VERSION));
  if (late) dropped.push({ id: test.id, raison: `la vue « ${late.vue} » n'existe pas en version ${VERSION}` });
  return !late;
});
if (!unknown.length && !tests.length) missing.push("Aucun test à jouer.");

const keyOf = ({ ecran, vue }) => `${ecran}--${vue}`;
const call = ({ ecran, vue }) => `relever(ecran="${ecran}", vue="${vue}")`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const versioned = (test, path) => path.replaceAll(`/v${test.version_cible}/`, `/v${VERSION}/`);
const section = (test, name) => (new RegExp(`^## ${name}[ \\t]*\\n([\\s\\S]*?)(?=^## |^\`\`\`)`, "m").exec(test.markdown)?.[1] ?? "").trim();
const title = (test) => /^# (.+)$/m.exec(test.markdown)?.[1] ?? test.id;

// The relevés of every test, in order, each one once; `part` is the first test that asks for it.
const course = [];
tests.forEach((test, index) => {
  for (const { ecran, vue } of test.releves) {
    if (course.some((step) => step.ecran === ecran && step.vue === vue)) continue;
    const url = notes.find((note) => note.entete.ecran === ecran)?.entete.url;
    if (typeof url !== "string") missing.push(`Aucune note de ${LOGICIEL} ne donne l'adresse de l'écran « ${ecran} » (champ url de son en-tête).`);
    if (!VIEWS[vue]) missing.push(`Vue « ${vue} » inconnue : son adresse est à ajouter dans VIEWS (parcours.mjs).`);
    const path = `/v${VERSION}${url}`;
    const pattern = `^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^/]+")}$`;
    const filtre = VIEWS[vue]?.filtre ?? null;
    course.push({
      ecran, vue, key: keyOf({ ecran, vue }), part: index + 1,
      address: `${path}${filtre ? `?filtre=${filtre}` : ""}`,
      here: `new RegExp(${JSON.stringify(pattern)}).test(location.pathname) && new URLSearchParams(location.search).get("filtre") === ${JSON.stringify(filtre)}`,
    });
  }
});

// The check, its sentences and its decisions all come from one module (interface: see README).
let check = {};
try {
  check = await import(pathToFileURL(CHECK_FILE));
  for (const name of ["verifierReleve", "consoliderConstats", "formuler", "versDecision"]) if (typeof check[name] !== "function") throw new Error(`le fichier n'exporte pas ${name}`);
} catch (error) {
  missing.push(`La vérification ne se charge pas (${CHECK_FILE}) : ${error.message.split("\n")[0]}`);
}
const { verifierReleve, consoliderConstats, formuler, versDecision } = check;
if (flag("rythme") && !(RYTHME > 0)) missing.push("--rythme doit être un nombre de secondes positif.");
if (!(CAP_MS > 0)) missing.push("--plafond doit être un nombre de secondes positif.");
if (CHOICES.some((choix) => choix !== "bug" && choix !== "voulu")) missing.push("--choix attend une liste de « bug » et de « voulu », séparés par des virgules.");
for (const name of ["temoins", "film"]) if (flag(name) && !option(name)) missing.push(`--${name} demande un dossier.`);
const holo = SANS_AGENT ? null : findHolo();
stopIfMissing({ port: PORT, chromeBin: CHROME_BIN, sansAgent: SANS_AGENT, holo }, missing);

const START = `${BASE}${versioned(tests[0], tests[0].url_depart)}${flag("r") ? `&r=${option("r")}` : ""}`;
const INSTRUCTIONS = [`Tu joues un parcours de test sur le logiciel ${LOGICIEL}, dans le seul onglet ouvert du navigateur.`, ...COURSE_RULES].join("\n");
const TASK = [
  `Ouvre ${START} dans l'onglet courant avec go_to, sans chercher ni changer d'onglet. Puis joue ${tests.length > 1 ? `les ${tests.length} parties ci-dessous, dans l'ordre` : "la partie ci-dessous"}. Ne rouvre jamais cette adresse : on passe d'une partie à la suivante par les menus et les liens du logiciel.`,
  ...tests.flatMap((test, index) => [
    "",
    `Partie ${index + 1} : ${title(test)}`,
    `État de départ, à atteindre sans recharger la page : ${section(test, "Setup")}`,
    section(test, "Task"),
    `Relevés de cette partie : ${test.releves.map((releve) => {
      const { part } = course.find((step) => step.key === keyOf(releve));
      return `${call(releve)}${part <= index ? ` (déjà pris en partie ${part} : ne le refais pas)` : ""}`;
    }).join(" ; ")}.`,
  ]),
  "",
  'Un relevé déjà pris ne se refait pas. Quand tous les relevés sont pris, appelle terminer(etat="reussi"). Si une étape reste impossible après 2 essais, appelle terminer(etat="echec", raison=...).',
].join("\n");
const TOOLS = [
  {
    name: "relever",
    description: "Enregistre l'écran affiché (capture et texte), une fois la page chargée. À appeler à chaque écran demandé. Le résultat dit quoi faire ensuite.",
    input_schema: {
      type: "object",
      properties: { ecran: { type: "string", enum: [...new Set(course.map((step) => step.ecran))] }, vue: { type: "string", enum: [...new Set(course.map((step) => step.vue))] } },
      required: ["ecran", "vue"],
    },
  },
  END_TOOL,
];

const count = (number, one, many) => `${number} ${number > 1 ? many : one}`;
// A bubble stays at least this long: 2.5 s, plus 50 ms per character.
const reading = (text) => 2500 + 50 * text.length;
// State of the mascot and colour of its bubble, per status of a finding.
const KIND = { PASS: ["conforme", "conforme"], VERIFIED_FAIL: ["defaut", "defaut"], SUSPECTED: ["interrogation", "doute"], INCONCLUSIVE: ["repos", ""] };
const STROKE_MS = 800; // time the layer takes to draw a line (STROKE in couche-horama.js)

// ---------- Scene ----------
mkdirSync(join(OUT, "releves"), { recursive: true });
for (const folder of [WITNESSES, FILM]) if (folder) mkdirSync(folder, { recursive: true });
writeFileSync(join(OUT, "consigne.md"), `# Consigne du passage ${ID}\n\n## Instructions\n\n${INSTRUCTIONS}\n\n## Tâche\n\n${TASK}\n`);
for (const { id, raison } of dropped) say(`Test écarté : ${id} (${raison}).`);
say(`Passage ${ID} : ${count(tests.length, "test", "tests")} (${tests.map((test) => test.id).join(", ")}), ${count(course.length, "relevé", "relevés")}, version ${VERSION}. Vérification : ${relative(process.cwd(), CHECK_FILE)}.`);
const chrome = await openChrome({ bin: CHROME_BIN, port: PORT, profile: PROFILE });
say(chrome.started ? `Chrome dédié lancé (${chrome.version}, port ${PORT}, profil ${PROFILE}).` : `Un Chrome écoute déjà sur le port ${PORT} (${chrome.version}) : réutilisé.`);
let page = null;
let filming = false;
const stop = async () => {
  filming = false;
  await stopAgent();
  page?.close();
  if (!flag("fermer-chrome")) return say(`Chrome laissé ouvert (port ${PORT}) : la scène reste à l'écran. Pour le fermer à la fin : --fermer-chrome.`);
  await closeChrome({ port: PORT, pid: chrome.pid });
  say("Chrome fermé.");
};
process.on("SIGINT", () => {
  say("Interrompu : arrêt du pont.");
  stop().finally(() => process.exit(130));
});

const started = new Date();
const errors = [];
const pass = { sessions: [], relances: 0, dureeS: null, etapes: null, etapesH: null, dureesEtapes: [], coutUsd: null, etat: null };
const taken = new Map();
const clics = [];
const refus = [];
const memory = lireDecisions(VAULT, LOGICIEL);
const references = WRITE_REFERENCES ? [] : lireReferences(VAULT, LOGICIEL).filter((reference) => reference.version === REFERENCE);
const constats = []; // every finding of the course, as verifierReleve gave it
let consolidated = []; // what consoliderConstats makes of them: what is shown, counted and asked at the end
const queued = new Set(); // ids of the findings given to the mascot
const revealed = new Set(); // ids of the findings the mascot has shown
const marks = new Map(); // per finding id, what is drawn on the page: { address, rects, genre, avant }
const frames = new Map(); // per visual finding id, the rectangle that holds its zone and the text at its centre
const presentations = []; // per screen, how long the mascot took and what it said
const decisions = [];
let capturing = false;

// A capture of the page as the audience sees it, layer included. One asked while the page is being replaced never
// answers: given up after 300 ms (null).
const snap = (options) => Promise.race([page.send("Page.captureScreenshot", options).then(({ data }) => Buffer.from(data, "base64"), () => null), sleep(300).then(() => null)]);
// Captures for the eye (--temoins): named by what they show.
let witnesses = 0;
async function witness(label) {
  const image = WITNESSES && !capturing && (await snap({ format: "png" }));
  if (image) writeFileSync(join(WITNESSES, `${String(++witnesses).padStart(2, "0")}-${label}.png`), image);
}
// The whole course as the audience sees it (--film): one image every 200 ms.
let images = 0;
let filmedMs = 0;
async function film() {
  const from = Date.now();
  for (filming = true; filming; ) {
    const at = Date.now();
    const image = await snap({ format: "jpeg", quality: 85 });
    if (image) writeFileSync(join(FILM, `${String(++images).padStart(5, "0")}-${String((filmedMs = at - from)).padStart(6, "0")}ms.jpg`), image);
    await sleep(Math.max(0, 200 - (Date.now() - at)));
  }
}

// What the layer reports: each press of the agent, then the moment its held click is given back to the page.
let replayed = null;
function onPress(press) {
  if (press.rejoue) {
    const click = clics.find((candidate) => candidate.heure === press.rejoue);
    if (click) click.retard_ms = press.retard_ms;
    return void replayed?.();
  }
  clics.push(press);
  if (!WITNESSES) return;
  setTimeout(() => witness("curseur-a-mi-trajet"), press.trajet_ms / 2);
  setTimeout(() => witness("curseur-pose"), press.trajet_ms + 60);
}
let chosen = null;

const mascot = (command, ...args) => layer(page, command, ...args);
async function speak(text, genre, cible, label) {
  await mascot("bulle", text, genre, cible);
  await witness(label);
  await sleep(reading(text));
  await mascot("bulle", null);
}

// Counted: what the mascot has shown, minus the doubts that a defect it has shown explains.
const open = (constat) => !constat.explique_par || !revealed.has(constat.explique_par);
function totals() {
  const shown = consolidated.filter((constat) => revealed.has(constat.id) && open(constat));
  const number = (statut) => shown.filter((constat) => constat.statut === statut).length;
  return { bons: number("PASS"), problemes: number("VERIFIED_FAIL"), doutes: number("SUSPECTED"), sans_conclusion: number("INCONCLUSIVE") };
}
async function reveal(constat) {
  revealed.add(constat.id);
  // A doubt already shown that this defect explains is no longer a doubt: its line turns coral.
  for (const doubt of consolidated.filter((candidate) => candidate.explique_par === constat.id && revealed.has(candidate.id))) {
    await mascot("requalifier", doubt.id, "defaut");
    await witness("doute-devenu-probleme");
  }
  const { bons, problemes, doutes } = totals();
  await mascot("compteur", bons, problemes, doutes);
}

// One finding, one thing at a time: what is checked, the line drawn around what was found, then the result.
// `quiet`: the cap of this screen is passed, the finding is drawn and counted without a word (the end comes back to it).
async function play(constat, quiet) {
  const mark = marks.get(constat.id);
  const { annonce, resultat } = formuler(constat);
  const cible = mark?.rects[0] ?? constat.zone ?? null;
  const [etat, genre] = KIND[constat.statut];
  say(`Mascotte, ${constat.id} : ${quiet ? `montré sans phrase (plafond de ${CAP_MS / 1000} s)` : [annonce, resultat].filter(Boolean).join(" ")}`);
  await mascot("etat", "verification");
  if (annonce && !quiet) await speak(annonce, "", cible, "annonce");
  if (mark) {
    const drawing = mascot("surligner", mark.address, mark.rects, mark.genre, constat.id, mark.avant);
    await sleep(STROKE_MS * 0.3);
    await witness(`trait-a-moitie-${mark.genre}`);
    await drawing;
    await witness(`trait-${mark.genre}${mark.avant ? "-deplacement" : ""}`);
  }
  await mascot("etat", etat);
  await reveal(constat);
  if (!quiet) await speak(resultat, genre, cible, `resultat-${genre || "sans-conclusion"}`);
}

// The mascot presents the findings of a screen one after the other. Resolves when it has finished, or at the cap: a
// finding it has started is played to its end, the next ones are only drawn and counted.
let queue = Promise.resolve();
async function present(step, units) {
  let capped = false;
  const measure = { releve: step.key, duree_s: null, dits: 0, sans_phrase: 0 };
  presentations.push(measure);
  queue = queue.then(async () => {
    const from = Date.now();
    if (!units.length) {
      await mascot("etat", "verification");
      await sleep(1200);
    }
    for (const unit of units) {
      measure[capped ? "sans_phrase" : "dits"]++;
      await play(unit, capped);
    }
    await mascot("etat", "repos");
    measure.duree_s = (Date.now() - from) / 1000;
  }).catch((error) => errors.push(`Mascotte : ${error.message}`));
  await Promise.race([queue, sleep(CAP_MS).then(() => (capped = true))]);
}

// What is found on the screen just taken (the page is still this screen): the findings, consolidated with those of
// the whole course, and where each new one is on the page. Returns the findings to present, in order.
async function findings(step, releve) {
  const address = await evaluate(page, "location.pathname + location.search");
  const reference = references.find((candidate) => candidate.ecran === step.ecran && candidate.vue === step.vue);
  let found;
  try {
    found = await verifierReleve({
      releve,
      releves: [...taken.values()],
      regles: tests.flatMap((test) => test.regles),
      ...(reference ? { reference: new Uint8Array(readFileSync(join(VAULT, reference.chemin))), version_reference: REFERENCE } : {}),
      decisions: memory,
    });
  } catch (error) {
    errors.push(`Vérification de ${step.key} : ${error.message}`);
    found = [{ id: `${step.key}--verification`, ecran: step.ecran, vue: step.vue, genre: "regle", statut: "INCONCLUSIVE", valeurs: {}, description: "", textes_a_surligner: [], raison: `la vérification a échoué (${error.message})` }];
  }
  const onScreen = (constat) => constat.ecran === step.ecran && constat.vue === step.vue;
  // formuler needs the text of the element at the centre of a zone: read here, in the page.
  const nameZones = async (list) => {
    for (const constat of list) {
      if (constat.genre !== "visuel" || !constat.zone || constat.texte_zone !== undefined || !onScreen(constat)) continue;
      const { texte, cadre } = await mascot("autour", constat.zone);
      constat.texte_zone = texte;
      frames.set(constat.id, cadre);
    }
  };
  await nameZones(found);
  constats.push(...found);
  consolidated = consoliderConstats(constats);
  await nameZones(consolidated);
  // What a decision already settles first (one short sentence), then the rules, then what the image shows.
  const order = (constat) => (constat.decision_id ? 0 : constat.genre === "regle" ? 1 : 2);
  const units = consolidated.filter((constat) => onScreen(constat) && !queued.has(constat.id) && !constat.explique_par).sort((a, b) => order(a) - order(b));
  for (const constat of units) {
    queued.add(constat.id);
    const rects = constat.statut === "VERIFIED_FAIL" ? (await Promise.all(constat.textes_a_surligner.map((text) => mascot("trouver", text)))).flat() : constat.statut === "SUSPECTED" && constat.zone ? [frames.get(constat.id) ?? constat.zone] : [];
    if (rects.length) marks.set(constat.id, { address, rects, genre: constat.statut === "SUSPECTED" ? "doute" : "defaut", avant: constat.zone_avant ?? null });
  }
  return units;
}

// Answers the tool relever(ecran, vue): the sentence returned is what the agent reads. It is only sent once the mascot
// has presented this screen (or at the cap): meanwhile the page does not move and the audience reads.
async function relever(ecran, vue) {
  const step = course.find((candidate) => candidate.ecran === ecran && candidate.vue === vue);
  if (!step) return `Relevé inconnu. Les relevés attendus sont, dans l'ordre : ${course.map(call).join(", ")}.`;
  const next = () => {
    const todo = course.find((candidate) => !taken.has(candidate.key));
    return todo ? `Continue sans recharger la page. Relevé suivant : ${call(todo)} (partie ${todo.part}).` : 'Tous les relevés sont pris : appelle terminer(etat="reussi").';
  };
  if (taken.has(step.key)) return `Déjà relevé, rien de nouveau. ${next()}`;
  if (!(await waitFor(page, `document.readyState === "complete" && ${step.here}`, 5000))) {
    const url = await evaluate(page, "location.href").catch(() => "inconnue");
    refus.push(`${step.key} refusé, adresse de la page : ${url}`);
    return `Relevé refusé : la page affichée (${url}) n'est pas cet écran (adresse attendue : ${step.address}). Regarde la page avec wait_web (1 seconde), va sur cet écran par les menus et les liens, puis appelle de nouveau ${call(step)}.`;
  }
  capturing = true;
  const shot = await capture(page).finally(() => (capturing = false));
  const file = join(OUT, "releves", step.key);
  writeFileSync(`${file}.png`, shot.png);
  writeFileSync(`${file}.txt`, shot.texte_page);
  const releve = { ecran, vue, version: VERSION, png: new Uint8Array(shot.png), texte: shot.texte_page, url: shot.url_page };
  taken.set(step.key, releve);
  if (WRITE_REFERENCES) say(`Référence écrite : ${ecrireReference(VAULT, LOGICIEL, ecran, vue, VERSION, shot.png)}`);
  await present(step, await findings(step, releve));
  return `Relevé pris. ${next()}`;
}

// The course played by the script through CDP, at the pace of an agent: proof of the scene without H. It reads the
// tests as the agent would: a step that names its relevé takes it, the quoted labels of the other steps are clicked.
async function scriptedCourse() {
  const from = Date.now();
  const pause = () => sleep(RYTHME ? RYTHME * 1000 : 2000 + Math.random() * 2000);
  const norm = '(text) => (text ?? "").replace(/\\s+/g, " ").trim()';
  // Clicks the middle of the text of the first visible element the expression finds, as an agent aims at a label.
  const click = async (name, find) => {
    const point = `(() => {
      const norm = ${norm};
      const seen = [...document.querySelectorAll("a, button, summary")].filter((element) => element.getClientRects().length);
      const element = (${find})(seen, norm);
      if (!element) return null;
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
    })()`;
    await pause();
    if (!(await waitFor(page, point, 10_000))) throw new Error(`le script ne trouve pas où cliquer : ${name}`);
    // A held click only reaches the page once the cursor has arrived.
    const given = DIRECT ? null : new Promise((resolve) => (replayed = resolve));
    await clickAt(page, await evaluate(page, point));
    await Promise.race([given, sleep(2000)]);
    await sleep(300);
    await waitFor(page, `document.readyState === "complete"`, 10_000);
    await witness("apres-le-clic");
  };
  const take = async ({ ecran, vue }) => {
    if (taken.has(keyOf({ ecran, vue }))) return;
    await pause();
    const answer = await relever(ecran, vue);
    say(`relever(${ecran}, ${vue}) : ${answer}`);
    if (!answer.startsWith("Relevé pris")) throw new Error(answer);
  };
  await navigate(page, START);
  for (const test of tests) {
    const start = versioned(test, new URL(test.url_depart, BASE).searchParams.get("suite"));
    if ((await evaluate(page, "location.pathname + location.search")) !== start) {
      await click(`le lien vers ${start}`, `(seen) => seen.find((element) => element.getAttribute("href") === ${JSON.stringify(start)})`);
    }
    for (const line of section(test, "Task").split("\n").filter((text) => /^\d+\. /.test(text))) {
      const named = /c'est le relevé ecran=([\w-]+), vue=([\w-]+)/.exec(line);
      if (named) await take({ ecran: named[1], vue: named[2] });
      else if (line.includes("Pour chaque relevé listé dans releves")) for (const releve of test.releves) await take(releve);
      else {
        for (const [, label] of line.matchAll(/«\s*([^»]+?)\s*»/g)) {
          await click(`« ${label} »`, `(seen, norm) => seen.find((element) => norm(element.innerText) === ${JSON.stringify(label)}) ?? seen.find((element) => norm(element.innerText).startsWith(${JSON.stringify(label)}))`);
        }
      }
    }
  }
  pass.dureeS = (Date.now() - from) / 1000;
  pass.etat = "joué par le script";
}

try {
  page = await connectTab(PORT);
  await installLayer(page, onPress, { passage: ID, titre: "Horama vérifie la nouvelle version", direct: DIRECT, onChoice: (choice) => chosen?.(choice) });
  const area = await fitViewport(page);
  if (area.largeur !== WIDTH || area.hauteur !== HEIGHT || area.densite !== 1) {
    throw new Error(`zone de page ${area.largeur} × ${area.hauteur} à la densité ${area.densite} au lieu de ${WIDTH} × ${HEIGHT} à la densité 1 (écran trop petit, zoom de page, ou Chrome lancé sans --force-device-scale-factor=1) : parcours non joué`);
  }
  if (FILM) film();
  if (SANS_AGENT) await scriptedCourse();
  else {
    await agentPass(pass, {
      page, holo, port: PORT, logFile: join(OUT, "pont-holo.log"), task: TASK, instructions: INSTRUCTIONS, tools: TOOLS, relever, say, settleS: 1.0,
      agent: { name: "horama-scene", description: `Horama, la scène : joue les tests acceptés de ${LOGICIEL} dans un Chrome local.` },
    });
  }
} catch (error) {
  pass.etat ??= "échec";
  errors.push(error.message);
  say(`Échec : ${error.message}`);
}
errors.push(...refus.map((line) => `Relevé ${line}`));

// ---------- End of the course: the summary, then each defect and each doubt in turn, and a human decides ----------
await queue;
const complete = course.every((step) => taken.has(step.key));
const final = totals();
const kept = consolidated.filter((constat) => revealed.has(constat.id) && open(constat));
const review = flag("sans-fin") ? [] : [...kept.filter((constat) => constat.statut === "VERIFIED_FAIL"), ...kept.filter((constat) => constat.statut === "SUSPECTED")];
const summary = [
  complete ? "J'ai fini." : "Je n'ai pas pu finir le parcours.",
  [final.problemes && count(final.problemes, "problème", "problèmes"), final.doutes && count(final.doutes, "doute", "doutes")].filter(Boolean).join(" et ") || (complete && !final.sans_conclusion ? "Tout est bon" : ""),
  final.sans_conclusion ? `${count(final.sans_conclusion, "point", "points")} que je n'ai pas pu vérifier` : "",
  review.length > 1 ? "On les regarde ensemble." : review.length ? "On le regarde ensemble." : "",
].filter(Boolean).map((part) => (part.endsWith(".") ? part : `${part}.`)).join(" ");
say(summary);
// The test a finding belongs to: the one that carries its rule, failing that the first one that asks for its screen.
const testOf = (constat) => (tests.find((test) => constat.regle && test.regles.some((rule) => same(rule, constat.regle))) ?? tests[course.find((step) => step.ecran === constat.ecran && step.vue === constat.vue).part - 1]).id;
if (page) {
  try {
    await mascot("bulle", summary, "", null);
    await sleep(350);
    await witness("bilan");
    if (review.length) {
      await sleep(reading(summary));
      await mascot("bulle", null);
      await mascot("revue", true);
      const choices = [];
      for (const [index, constat] of review.entries()) {
        await navigate(page, taken.get(`${constat.ecran}--${constat.vue}`).url);
        const { question, resultat } = formuler(constat);
        const text = question ?? resultat;
        const answer = new Promise((resolve) => (chosen = resolve));
        await mascot("question", { id: constat.id, texte: text, rang: `${index + 1} sur ${review.length}`, etat: KIND[constat.statut][0] });
        await witness(`question-${index + 1}`);
        // --choix answers by itself, after the time it takes to read the question.
        if (CHOICES[index]) sleep(reading(text)).then(() => mascot("choisir", CHOICES[index])).catch(() => {});
        const { choix } = await answer;
        say(`Question ${index + 1} sur ${review.length} : ${text} Réponse : ${choix}${CHOICES[index] ? " (--choix)" : ""}.`);
        choices.push({ constat, choix });
        await sleep(900);
        await witness(`reponse-${index + 1}`);
        await mascot("bulle", null);
      }
      // Each choice becomes a decision of the vault, read again once written.
      await mascot("revue", true);
      await mascot("etat", "repos");
      await speak("Je range tout ça.", "", null, "rangement");
      const le = new Date().toISOString();
      for (const { constat, choix } of choices) {
        const decision = versDecision(constat, choix, { passage_id: ID, test_id: testOf(constat), logiciel: LOGICIEL, version: VERSION, par: PAR, le });
        decisions.push({ fichier: ecrireDecision(VAULT, decision), decision });
      }
      const written = lireDecisions(VAULT, LOGICIEL);
      for (const { fichier, decision } of decisions) if (!written.some((candidate) => same(candidate, decision))) errors.push(`Décision écrite mais pas relue à l'identique : ${fichier}`);
      const made = (choix) => decisions.filter(({ decision }) => decision.decision === choix).length;
      const tally = [made("bug") && count(made("bug"), "bug à corriger", "bugs à corriger"), made("voulu") && count(made("voulu"), "changement validé", "changements validés")].filter(Boolean).join(", ");
      await mascot("fin", { titre: "C'est rangé.", compte: tally, legende: "Écrit dans la documentation :", fichiers: decisions.map(({ fichier }) => fichier) });
      await sleep(900);
      await witness("fin");
      say(`${tally}. ${count(decisions.length, "décision écrite", "décisions écrites")} dans ${VAULT} : ${decisions.map(({ fichier }) => fichier).join(", ")}.`);
    }
  } catch (error) {
    errors.push(`Fin du parcours : ${error.message}`);
  }
}
filming = false;
const delays = clics.map((click) => click.retard_ms).filter((ms) => ms !== undefined);
writeFileSync(join(OUT, "passage.json"), `${JSON.stringify({
  id: ID,
  logiciel: LOGICIEL,
  version: VERSION,
  reference: REFERENCE,
  mode: SANS_AGENT ? "sans agent (clics du script par CDP)" : "agent H",
  depart: START,
  verification: CHECK_FILE,
  tests: tests.map((test) => test.id),
  tests_ecartes: dropped,
  releves: course.map((step) => ({ ecran: step.ecran, vue: step.vue, pris: taken.has(step.key), url: taken.get(step.key)?.url ?? null, capture: `releves/${step.key}.png`, texte: `releves/${step.key}.txt` })),
  constats: consolidated,
  bilan: summary,
  compteur: final,
  decisions,
  clics,
  clic_retenu: !DIRECT,
  retard_par_clic_ms: delays.length ? { min: Math.min(...delays), max: Math.max(...delays), moyenne: Math.round(delays.reduce((sum, ms) => sum + ms, 0) / delays.length) } : null,
  plafond_s: CAP_MS / 1000,
  presentations,
  film: FILM ? { dossier: FILM, images, duree_s: filmedMs / 1000 } : null,
  debut: started.toISOString(),
  fin: new Date().toISOString(),
  duree_s: pass.dureeS,
  etapes: pass.etapes,
  etapes_h: pass.etapesH,
  cout_usd: pass.coutUsd,
  session_h: pass.sessions.at(-1) ?? null,
  sessions_h: pass.sessions,
  relances: pass.relances,
  etat: pass.etat,
  erreurs: errors,
}, null, 2)}\n`);
say(`Passage écrit : ${join(OUT, "passage.json")} (${taken.size} relevé(s) sur ${course.length}, ${clics.length} clic(s) vus, durée ${pass.dureeS === null ? "à mesurer" : `${pass.dureeS.toFixed(1).replace(".", ",")} s`}).`);
for (const { releve, duree_s, dits, sans_phrase } of presentations) say(`Présentation de ${releve} : ${duree_s === null ? "interrompue" : `${duree_s.toFixed(1).replace(".", ",")} s`}, ${count(dits, "constat dit", "constats dits")}${sans_phrase ? `, ${sans_phrase} montré(s) sans phrase (plafond de ${CAP_MS / 1000} s)` : ""}.`);
if (delays.length) say(`Retard ajouté par clic retenu : de ${Math.min(...delays)} à ${Math.max(...delays)} ms (${delays.length} clics).`);
if (FILM) say(`Film : ${images} images sur ${(filmedMs / 1000).toFixed(1).replace(".", ",")} s, dans ${FILM}.`);
for (const line of errors) say(`Erreur : ${line}`);
await stop();
process.exit(complete && !errors.length ? 0 : 1);
