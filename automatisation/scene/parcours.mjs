// The live scene (docs/decisions/2026-11-16-scene-en-direct.md): the accepted tests of the vault become one course on
// the tested software, in a visible local Chrome. The H agent clicks: a cursor travels to each click, held until it
// arrives. At each relever: our capture (layer hidden), the check (jugement/verification), then the mascot presents
// what was found on this screen, one thing at a time, and the agent only gets its answer once it has finished (or at
// the cap). At the end the course goes back over each defect and each doubt, a human says « bug » or « voulu », and
// each choice is written in the vault as a decision, then in the base, then the passage is marked « verifie ».
// The passage is run by Ali's runner (agent/index.ts): it creates the H session (or plays the scripted one), relaunches
// a mute session, writes passages, evenements and captures in the base and the report in the vault. The scene gives it
// the Chrome and its bridge (navigateur) and the relevé hook; the Chrome and the bridge come from the T7 probe.
//
// Usage: node [--env-file=<.env.local>] automatisation/scene/parcours.mjs [--sans-agent] [--sans-base | --avec-base]
//          [--rythme <s>] [--plafond <s>] [--sans-presentation] [--clic-direct] [--choix bug,voulu,...] [--sans-fin] [--par <nom>]
//          [--vault <dir>] [--logiciel facturo] [--version 13] [--reference 12] [--tests a,b,c] [--r <ids>]
//          [--verification <file>] [--ecrire-references] [--temoins <dir>] [--film <dir>] [--sortie <dir>]
//          [--port 9333] [--profil <dir>] [--fermer-chrome]
// Env: HAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FAUX_SAAS_URL, CHROME_BIN, HOLO_BIN, HAI_AGENT_MODEL,
// HAI_AGENT_REASONING.
// Exit: 0 every relevé taken, passage played and nothing failed, 1 otherwise, 2 something is missing, 130 Ctrl+C.
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BaseMemoire, construireConsigne, creerBaseSupabase, creerCoureur } from "../../agent/index.ts";
import { libelleAction } from "../../agent/src/session.ts";
import { appliquerCorrection, ecrireDecision, ecrireReference, lireDecisions, lireNotes, lireReferences, lireTestsAcceptes, refuserCorrection } from "../../memoire/index.ts";
import { findHolo, startBridge, stopIfMissing } from "./agent-h.mjs";
import { creerEcrivainMemoire, creerEcrivainSupabase } from "./decisions.mjs";
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
// For continuous integration: the same course without the mascot's presentations nor the reading pauses.
const SANS_PRESENTATION = flag("sans-presentation");
const CHOICES = flag("choix") ? option("choix").split(",") : [];
const PAR = option("par", "Nathan");
const CHECK_FILE = resolve(option("verification", join(HERE, "../../jugement/verification/index.ts")));
const CORRECTION_FILE = resolve(option("correction", join(HERE, "../../jugement/correction/index.ts")));
const CORRECTION_CHOICE = option("correction-choix");
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
let proposerCorrection;
try {
  ({ proposerCorrection } = await import(pathToFileURL(CORRECTION_FILE)));
  if (typeof proposerCorrection !== "function") throw new Error("le fichier n'exporte pas proposerCorrection");
} catch (error) {
  missing.push(`La correction ne se charge pas (${CORRECTION_FILE}) : ${error.message.split("\n")[0]}`);
}
if (flag("correction-choix") && !["accepter", "refuser"].includes(CORRECTION_CHOICE)) missing.push("--correction-choix attend accepter ou refuser.");
if (flag("rythme") && !(RYTHME > 0)) missing.push("--rythme doit être un nombre de secondes positif.");
if (!(CAP_MS > 0)) missing.push("--plafond doit être un nombre de secondes positif.");
if (CHOICES.some((choix) => choix !== "bug" && choix !== "voulu")) missing.push("--choix attend une liste de « bug » et de « voulu », séparés par des virgules.");
for (const name of ["temoins", "film"]) if (flag(name) && !option(name)) missing.push(`--${name} demande un dossier.`);
// The base the runner writes in: Supabase with the agent, in memory without it (scripted passages stay out of the
// shared base), unless --sans-base or --avec-base says otherwise.
if (flag("sans-base") && flag("avec-base")) missing.push("--sans-base et --avec-base s'excluent.");
let base = null;
let ecrivain = null;
try {
  base = (SANS_AGENT ? flag("avec-base") : !flag("sans-base")) ? creerBaseSupabase() : new BaseMemoire();
  ecrivain = base instanceof BaseMemoire ? creerEcrivainMemoire(base) : creerEcrivainSupabase();
} catch (error) {
  missing.push(`${error.message} (sans base partagée : --sans-base).`);
}
const REGRESSIONS = flag("r") ? option("r").split(",") : undefined;
// What the runner gives H (instructions, task, tools): built here too, only to write it in consigne.md.
let consigne = null;
try {
  if (!missing.length) consigne = construireConsigne({ vault: VAULT, logiciel: LOGICIEL, version: VERSION, ids: tests.map((test) => test.id), baseUrl: BASE, regressions: REGRESSIONS });
} catch (error) {
  missing.push(`La consigne du coureur ne se construit pas : ${error.message}`);
}
const holo = SANS_AGENT ? null : findHolo();
stopIfMissing({ port: PORT, chromeBin: CHROME_BIN, sansAgent: SANS_AGENT, holo }, missing);
// Each step of the passage, as the runner writes it in the base, is also said here.
const writeEvent = base.insererEvenement.bind(base);
base.insererEvenement = (event) => {
  say(`étape ${event.etape} : ${event.action}`);
  return writeEvent(event);
};

const START = `${BASE}${versioned(tests[0], tests[0].url_depart)}${flag("r") ? `&r=${option("r")}` : ""}`;

const count = (number, one, many) => `${number} ${number > 1 ? many : one}`;
// A bubble stays at least this long: 2.5 s, plus 50 ms per character.
const reading = (text) => 2500 + 50 * text.length;
// A pause for the audience: none with --sans-presentation.
const hold = (ms) => (SANS_PRESENTATION ? null : sleep(ms));
// State of the mascot and colour of its bubble, per status of a finding.
const KIND = { PASS: ["conforme", "conforme"], VERIFIED_FAIL: ["defaut", "defaut"], SUSPECTED: ["interrogation", "doute"], INCONCLUSIVE: ["repos", ""] };
const STROKE_MS = 800; // time the layer takes to draw a line (STROKE in couche-horama.js)

// ---------- Scene ----------
mkdirSync(join(OUT, "releves"), { recursive: true });
for (const folder of [WITNESSES, FILM]) if (folder) mkdirSync(folder, { recursive: true });
writeFileSync(join(OUT, "consigne.md"), `# Consigne du passage ${ID}\n\n## Instructions\n\n${consigne.instructions}\n\n## Tâche\n\n${consigne.task}\n`);
for (const { id, raison } of dropped) say(`Test écarté : ${id} (${raison}).`);
say(`Passage ${ID} : ${count(tests.length, "test", "tests")} (${tests.map((test) => test.id).join(", ")}), ${count(course.length, "relevé", "relevés")}, version ${VERSION}. Vérification : ${relative(process.cwd(), CHECK_FILE)}.`);
const chrome = await openChrome({ bin: CHROME_BIN, port: PORT, profile: PROFILE });
say(chrome.started ? `Chrome dédié lancé (${chrome.version}, port ${PORT}, profil ${PROFILE}).` : `Un Chrome écoute déjà sur le port ${PORT} (${chrome.version}) : réutilisé.`);
let page = null;
let filming = false;
const bridges = new Set(); // the bridges of the sessions not yet ended
let launched = 0; // H sessions asked by the runner (one more when a mute session is relaunched)
const stop = async () => {
  filming = false;
  for (const bridge of bridges) bridge.stop();
  page?.close();
  if (!flag("fermer-chrome")) return say(`Chrome laissé ouvert (port ${PORT}) : la scène reste à l'écran. Pour le fermer à la fin : --fermer-chrome.`);
  await closeChrome({ port: PORT, pid: chrome.pid });
  say("Chrome fermé.");
};
// Ctrl+C aborts the runner (PR #22): it stops the bridge and deletes the H session. The scene waits for that, 10 s
// at most, before closing.
const arret = new AbortController();
let pending = null; // lancerPassage, then attendreFin
process.on("SIGINT", async () => {
  say("Interrompu : annulation de la session H et arrêt du pont.");
  arret.abort("Ctrl+C");
  await Promise.race([pending?.catch(() => {}), sleep(10_000)]);
  stop().finally(() => process.exit(130));
});
// The hook bound by the runner (PR #22): 45 s, well above the longest presentation measured (21,1 s on 2026-11-17).
const HOOK_TIMEOUT_MS = 45_000;
// Time H waits after a gesture before its next observation (PR #26): the scene holds each click 620 to 922 ms (measured
// on 2026-11-17), and at 0,5 s the agent clicked « Factures » twice on the course of 15 h 11.
const SETTLE_S = 1.2;
const releverMs = []; // duration of each relever, from the tool call to the answer given to the agent

const started = new Date();
const errors = [];
let report = null; // the RapportPassage of the runner
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
  if (SANS_PRESENTATION) return;
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
// `quiet`: the cap of this screen is passed (or --sans-presentation), the finding is drawn and counted without a word
// (the end comes back to it).
async function play(constat, quiet) {
  const mark = marks.get(constat.id);
  const { annonce, resultat } = formuler(constat);
  const cible = mark?.rects[0] ?? constat.zone ?? null;
  const [etat, genre] = KIND[constat.statut];
  say(`Mascotte, ${constat.id} : ${quiet ? `montré sans phrase (${SANS_PRESENTATION ? "--sans-presentation" : `plafond de ${CAP_MS / 1000} s`})` : [annonce, resultat].filter(Boolean).join(" ")}`);
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
      await hold(1200);
    }
    for (const unit of units) {
      const quiet = capped || SANS_PRESENTATION;
      measure[quiet ? "sans_phrase" : "dits"]++;
      await play(unit, quiet);
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

// The relevé hook of the runner, for the tool relever(ecran, vue): our capture (a ReleveCapture of agent/src/coureur.ts)
// and the sentence the agent reads. It is only given once the mascot has presented this screen (or at the cap):
// meanwhile the page does not move and the audience reads. On another page nothing is checked nor presented: the
// capture carries the real address and the runner refuses the relevé itself.
async function relever(ecran, vue) {
  const step = course.find((candidate) => candidate.ecran === ecran && candidate.vue === vue);
  if (!step) throw new Error(`relevé hors du parcours de la scène : ${ecran}--${vue}`);
  const next = () => {
    const todo = course.find((candidate) => !taken.has(candidate.key));
    return todo ? `Continue sans recharger la page. Relevé suivant : ${call(todo)} (partie ${todo.part}).` : 'Tous les relevés sont pris : appelle terminer(etat="reussi").';
  };
  const here = await waitFor(page, `document.readyState === "complete" && ${step.here}`, 5000);
  capturing = true;
  const shot = await capture(page).finally(() => (capturing = false));
  const result = { png: new Uint8Array(shot.png), texte: shot.texte_page, url_page: shot.url_page, largeur: shot.largeur, hauteur: shot.hauteur, defilement: shot.defilement };
  if (taken.has(step.key)) return { ...result, phrase: `Déjà relevé, rien de nouveau. ${next()}` };
  if (!here) {
    refus.push(`${step.key} refusé, adresse de la page : ${shot.url_page}`);
    return { ...result, phrase: `Relevé refusé : la page affichée (${shot.url_page}) n'est pas cet écran.` };
  }
  const file = join(OUT, "releves", step.key);
  writeFileSync(`${file}.png`, shot.png);
  writeFileSync(`${file}.txt`, shot.texte_page);
  const releve = { ecran, vue, version: VERSION, png: result.png, texte: shot.texte_page, url: shot.url_page };
  taken.set(step.key, releve);
  if (WRITE_REFERENCES) say(`Référence écrite : ${ecrireReference(VAULT, LOGICIEL, ecran, vue, VERSION, shot.png)}`);
  await present(step, await findings(step, releve));
  return { ...result, phrase: `Relevé pris. ${next()}` };
}

// The bridge of one H session (NavigateurSession of agent/src/session.ts): the tab back to about:blank, a new bridge
// on a new channel. The runner asks for one per session, again when it relaunches a mute session.
async function navigateur() {
  await navigate(page, "about:blank");
  const channel = randomUUID();
  const bridge = startBridge({ holo, port: PORT, channel, logFile: join(OUT, "pont-holo.log") });
  bridges.add(bridge);
  launched++;
  const stopBridge = () => {
    bridge.stop();
    bridges.delete(bridge);
  };
  if (!(await bridge.ready(20_000)) && !bridge.failed) say("Le pont n'a pas écrit sa ligne de départ en 20 s : la session est créée quand même.");
  if (bridge.failed) {
    stopBridge();
    throw new Error(bridge.failed);
  }
  return { channel, stop: stopBridge, failed: () => bridge.failed };
}

// The session the runner plays without H (Session of agent/src/session.ts): the script makes the gestures and calls
// the tools as the agent would, each gesture is a step.
async function scriptedSession({ onCreated, onStep, onTool }) {
  const id = `script-${ID}`;
  let etapes = 0;
  const gesture = (name) => onStep({ horodatage: new Date().toISOString(), etape: ++etapes, action: libelleAction([name]), etat_session: "en_cours" });
  const end = (erreur) => ({ id, muted: false, cout_usd: null, etapes, ...(erreur ? { erreur } : {}) });
  await onCreated(id);
  const fin = scriptedCourse(gesture, onTool).then(() => end(), (error) => {
    errors.push(error.message);
    say(`Échec : ${error.message}`);
    return end(error.message);
  });
  return { id, fin };
}

// The course played by the script through CDP, at the pace of an agent: proof of the scene without H. It reads the
// tests as the agent would: a step that names its relevé takes it, the quoted labels of the other steps are clicked.
async function scriptedCourse(gesture, onTool) {
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
    await gesture("click");
    await clickAt(page, await evaluate(page, point));
    await Promise.race([given, sleep(2000)]);
    await sleep(300);
    await waitFor(page, `document.readyState === "complete"`, 10_000);
    await witness("apres-le-clic");
  };
  const take = async ({ ecran, vue }) => {
    if (taken.has(keyOf({ ecran, vue }))) return;
    await pause();
    await gesture("relever");
    const answer = await onTool("relever", { ecran, vue });
    say(`relever(${ecran}, ${vue}) : ${answer}`);
    if (!answer.startsWith("Relevé pris")) throw new Error(answer);
  };
  await gesture("go_to");
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
  await gesture("terminer");
  await onTool("terminer", { etat: "reussi" });
}

try {
  page = await connectTab(PORT);
  await installLayer(page, onPress, { passage: ID, titre: "Horama vérifie la nouvelle version", direct: DIRECT, onChoice: (choice) => chosen?.(choice) });
  const area = await fitViewport(page);
  if (area.largeur !== WIDTH || area.hauteur !== HEIGHT || area.densite !== 1) {
    throw new Error(`zone de page ${area.largeur} × ${area.hauteur} à la densité ${area.densite} au lieu de ${WIDTH} × ${HEIGHT} à la densité 1 (émulation refusée ou zoom de page) : parcours non joué`);
  }
  if (FILM) film();
  const coureur = creerCoureur({
    vault: VAULT, base, baseUrl: BASE, identifiant: () => ID, signaler: say, hookTimeoutMs: HOOK_TIMEOUT_MS, signal: arret.signal,
    relever: async (ecran, vue) => {
      const from = Date.now();
      try { return await relever(ecran, vue); } finally { releverMs.push({ releve: `${ecran}--${vue}`, ms: Date.now() - from }); }
    },
    ...(SANS_AGENT ? { session: scriptedSession } : { h: { navigateur, settle_s: SETTLE_S, key: process.env.HAI_API_KEY, signaler: say } }),
  });
  const { passage_id } = await (pending = coureur.lancerPassage({ logiciel: LOGICIEL, version_testee: VERSION, version_reference: REFERENCE, tests: tests.map((test) => test.id), regressions: REGRESSIONS, cle: "dev" }));
  report = await (pending = coureur.attendreFin(passage_id));
  if (report.passage.etat !== "joue") {
    const reasons = [...new Set(report.tests.map((test) => test.raison).filter(Boolean))];
    errors.push(`Le coureur rend le passage en échec${reasons.length ? ` (${reasons.join(", ")})` : ""}.`);
  }
} catch (error) {
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
    if (!SANS_PRESENTATION) await mascot("bulle", summary, "", null);
    await hold(350);
    await witness("bilan");
    if (review.length) {
      await hold(reading(summary));
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
        if (CHOICES[index]) sleep(SANS_PRESENTATION ? 0 : reading(text)).then(() => mascot("choisir", CHOICES[index])).catch(() => {});
        const { choix } = await answer;
        say(`Question ${index + 1} sur ${review.length} : ${text} Réponse : ${choix}${CHOICES[index] ? " (--choix)" : ""}.`);
        choices.push({ constat, choix, question });
        await hold(900);
        await witness(`reponse-${index + 1}`);
        await mascot("bulle", null);
      }
      // Each choice becomes a decision of the vault, read again once written.
      await mascot("revue", true);
      await mascot("etat", "repos");
      await speak("Je range tout ça.", "", null, "rangement");
      const le = new Date().toISOString();
      for (const { constat, choix, question } of choices) {
        let decision = versDecision(constat, choix, { passage_id: ID, test_id: testOf(constat), logiciel: LOGICIEL, version: VERSION, par: PAR, le });
        let file;
        if (choix === "voulu") {
          const proposal = await proposerCorrection(VAULT, decision, { indices: [question] });
          decision = proposal.decision;
          if (decision.correction_de_note) {
            await navigate(page, taken.get(`${constat.ecran}--${constat.vue}`).url);
            const answer = new Promise((resolve) => (chosen = resolve));
            const correction = decision.correction_de_note;
            await mascot("correction", { id: decision.id, file: correction.fichier, before: correction.avant, after: correction.apres });
            say(`Correction proposée pour ${correction.fichier} : ${correction.avant} → ${correction.apres}`);
            await witness("correction-proposee");
            if (CORRECTION_CHOICE) sleep(SANS_PRESENTATION ? 0 : reading(correction.avant + correction.apres)).then(() => mascot("chooseCorrection", CORRECTION_CHOICE, decision.id)).catch(() => {});
            const { choix: correctionChoice } = await answer;
            decision = correctionChoice === "accepter" ? appliquerCorrection(VAULT, decision) : refuserCorrection(VAULT, decision);
            // The memory operation already wrote this final decision; do not overwrite it with an earlier version.
            file = `${decision.logiciel}/decisions/${decision.id}.md`;
            await mascot("correctionResult", decision.correction_de_note.statut);
            say(`Correction ${decision.correction_de_note.statut} : ${correction.fichier}.`);
            await hold(900);
            await witness(`correction-${decision.correction_de_note.statut}`);
            await mascot("bulle", null);
          } else {
            say(proposal.raison);
            await speak(proposal.raison, "", null, "correction-absente");
          }
        }
        decisions.push({ fichier: file ?? ecrireDecision(VAULT, decision), decision });
      }
      const written = lireDecisions(VAULT, LOGICIEL);
      for (const { fichier, decision } of decisions) if (!written.some((candidate) => same(candidate, decision))) errors.push(`Décision écrite mais pas relue à l'identique : ${fichier}`);
      const made = (choix) => decisions.filter(({ decision }) => decision.decision === choix).length;
      const tally = [made("bug") && count(made("bug"), "bug à corriger", "bugs à corriger"), made("voulu") && count(made("voulu"), "changement validé", "changements validés")].filter(Boolean).join(", ");
      await mascot("fin", { titre: "C'est rangé.", compte: tally, legende: "Écrit dans la documentation :", fichiers: decisions.map(({ fichier }) => fichier) });
      await hold(900);
      await witness("fin");
      say(`${tally}. ${count(decisions.length, "décision écrite", "décisions écrites")} dans ${VAULT} : ${decisions.map(({ fichier }) => fichier).join(", ")}.`);
    }
  } catch (error) {
    errors.push(`Fin du parcours : ${error.message}`);
  }
}
// The decisions of the human, then the state of the passage, in the base, only when the runner rendered the
// passage as played. A refused write is said (its message only gives the HTTP code), the next ones are still
// tried, and the state is not set to verifie when one was refused.
if (report?.passage.etat === "joue") {
  let refused = false;
  for (const { decision } of decisions) {
    try {
      await ecrivain.ecrireDecision(decision);
    } catch (error) {
      refused = true;
      errors.push(`Décision ${decision.id} en base : ${error.message}`);
      say(`Décision ${decision.id} en base : ${error.message}`);
    }
  }
  if (refused) say("Au moins une décision a été refusée : l'état du passage n'est pas passé à « verifie » en base.");
  else {
    try {
      await ecrivain.marquerVerifie(ID);
      say(`${decisions.length ? `${count(decisions.length, "décision écrite", "décisions écrites")} en base, ` : "Aucune décision, "}passage « verifie » en base.`);
    } catch (error) {
      errors.push(`État du passage en base : ${error.message}`);
      say(`État du passage en base : ${error.message}`);
    }
  }
} else say(`Passage ${report?.passage.etat ?? "non rendu"} : aucune décision ni état « verifie » en base.`);
filming = false;
const delays = clics.map((click) => click.retard_ms).filter((ms) => ms !== undefined);
// The totals come from rapport.passage; the steps, the session and the replay are repeated in each test entry.
const { duree_s: dureeS = null, cout_usd: coutUsd = null } = report?.passage ?? {};
const played = report?.tests[0];
const stored = base instanceof BaseMemoire ? { passages: base.passages.size, captures: base.captures.size, evenements: base.evenements.length, decisions: ecrivain.decisions.size, etat: base.passages.get(ID)?.etat ?? null } : "supabase";
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
  sans_presentation: SANS_PRESENTATION,
  relever_ms: releverMs,
  relever_max_ms: releverMs.length ? Math.max(...releverMs.map(({ ms }) => ms)) : null,
  delai_crochet_ms: HOOK_TIMEOUT_MS,
  settle_s: SANS_AGENT ? null : SETTLE_S,
  presentations,
  film: FILM ? { dossier: FILM, images, duree_s: filmedMs / 1000 } : null,
  debut: started.toISOString(),
  fin: new Date().toISOString(),
  duree_s: dureeS,
  etapes: played?.etapes ?? null,
  cout_usd: coutUsd,
  session_h: played?.session_id || null,
  replay_url: played?.replay_url ?? null,
  relances: Math.max(0, launched - 1),
  etat: report?.passage.etat ?? "echec",
  base: stored,
  erreurs: errors,
}, null, 2)}\n`);
say(`Passage écrit : ${join(OUT, "passage.json")} (${taken.size} relevé(s) sur ${course.length}, ${clics.length} clic(s) vus, durée ${dureeS === null ? "à mesurer" : `${dureeS.toFixed(1).replace(".", ",")} s`}).`);
if (stored !== "supabase") say(`Base en mémoire : ${count(stored.passages, "passage", "passages")}, ${count(stored.captures, "capture", "captures")}, ${count(stored.evenements, "événement", "événements")}, ${count(stored.decisions, "décision", "décisions")}, état « ${stored.etat} ».`);
for (const { releve, duree_s, dits, sans_phrase } of presentations) say(`Présentation de ${releve} : ${duree_s === null ? "interrompue" : `${duree_s.toFixed(1).replace(".", ",")} s`}, ${count(dits, "constat dit", "constats dits")}${sans_phrase ? `, ${sans_phrase} montré(s) sans phrase (${SANS_PRESENTATION ? "--sans-presentation" : `plafond de ${CAP_MS / 1000} s`})` : ""}.`);
if (releverMs.length) say(`Relevé le plus long : ${Math.max(...releverMs.map(({ ms }) => ms))} ms (délai du crochet : ${HOOK_TIMEOUT_MS} ms).`);
if (delays.length) say(`Retard ajouté par clic retenu : de ${Math.min(...delays)} à ${Math.max(...delays)} ms (${delays.length} clics).`);
if (FILM) say(`Film : ${images} images sur ${(filmedMs / 1000).toFixed(1).replace(".", ",")} s, dans ${FILM}.`);
for (const line of errors) say(`Erreur : ${line}`);
await stop();
process.exit(complete && !errors.length && report?.passage.etat === "joue" ? 0 : 1);
