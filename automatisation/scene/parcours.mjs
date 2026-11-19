// The live scene (docs/decisions/2026-11-16-scene-en-direct.md): the accepted tests of the vault become one course on
// the tested software, in a visible local Chrome. The H agent clicks: a cursor travels to each click, held until it
// arrives. At each relever: our capture (layer hidden) and the check (jugement/verification), then the agent gets its
// answer at once. Meanwhile, without a word, the mascot reacts and the lines are drawn on the page. At the end the
// mascot sums up: it goes back over each defect and each doubt, explains it, a human says « bug » or « voulu », and
// each choice is written in the vault as a decision, then in the base, then the passage is marked « verifie ».
// The passage is run by Ali's runner (agent/index.ts): it creates the H session (or plays the scripted one), relaunches
// a mute session, writes passages, evenements and captures in the base and the report in the vault. The scene gives it
// the Chrome and its bridge (navigateur) and the relevé hook; the Chrome and the bridge come from the T7 probe.
//
// Usage: node [--env-file=<.env.local>] automatisation/scene/parcours.mjs [--sans-agent] [--sans-base | --avec-base]
//          [--rythme <s>] [--sans-presentation] [--clic-direct] [--choix bug,voulu,...] [--sans-fin] [--par <nom>]
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
import { appliquerCorrection, ecrireDecision, ecrireReference, lireDecisions, lireNotes, lireReferences, refuserCorrection } from "../../memoire/index.ts";
import { findHolo, startBridge, stopIfMissing } from "./agent-h.mjs";
import { creerEcrivainMemoire, creerEcrivainSupabase } from "./decisions.mjs";
import { ecrireCommentaire, publierCommentaire } from "../pr-doc/commentaire.mjs";
import { ouvrirPrDoc } from "../pr-doc/index.mjs";
import { completerNote } from "./note-passage.mjs";
import { revoir, sizeOf } from "./recapitulatif.mjs";
import { ouvrirVitrine } from "./vitrine.mjs";
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
// For continuous integration: the same course, without the spoken summary nor the reading pauses of the end.
const SANS_PRESENTATION = flag("sans-presentation");
const CHOICES = flag("choix") ? option("choix").split(",") : [];
const PAR = option("par", "Nathan");
const CHECK_FILE = resolve(option("verification", join(HERE, "../../jugement/verification/index.ts")));
const CORRECTION_FILE = resolve(option("correction", join(HERE, "../../jugement/correction/index.ts")));
const CORRECTION_CHOICE = option("correction-choix");
// The PR whose deployment woke the passage (given by the wake-up), written in the report of the passage.
const PR = option("pr", null);
// The PR of documentation for each accepted correction of a note (automatisation/pr-doc/): only with --pr-doc
// <propriétaire/dépôt>, the repository of the documentation. --pr-doc-remote: another remote (a local bare repository
// for a trial), --pr-doc-base: its branch, --pr-doc-vault: the folder of this software in it, --lien-passage: the link
// to the passage written in the PR (default: the interface in local).
const PR_DOC = option("pr-doc", null);
const PR_DOC_CONFIG = PR_DOC && {
  repository: PR_DOC,
  base: option("pr-doc-base", "dev"),
  vaultPath: option("pr-doc-vault", `vault-horama/${LOGICIEL}`),
  passageUrl: option("lien-passage", `http://localhost:3000/passages/${ID}`),
  ...(flag("pr-doc-remote") ? { remote: option("pr-doc-remote") } : {}),
};
const prDoc = []; // per accepted correction: { label, url } for the note of the passage
// The choice of the tests made from a change (docs/decisions/2026-11-17-format-impact.md): shown before the course,
// and, without --tests, the tests the scene plays.
const IMPACT_FILE = option("impact") ? resolve(option("impact")) : null;
const CHROME_BIN = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = option("base-url", process.env.FAUX_SAAS_URL || "https://facturo-demo.vercel.app").replace(/\/$/, "");

// ---------- The course: the one the runner gives H ----------
// construireConsigne (agent/) turns the accepted tests of the vault into one course: screens, named views, addresses
// and how to recognise each page. The scene plays that same course, so what is particular to the tested software
// (views, version in the address, entrance) is written in one place only.
const missing = [];
let impact = null;
if (IMPACT_FILE) {
  try {
    impact = JSON.parse(readFileSync(IMPACT_FILE, "utf8"));
    if (impact.format !== "horama-impact-1" || !Array.isArray(impact.retenus) || !Array.isArray(impact.ecartes)) throw new Error("ce n'est pas un fichier horama-impact-1");
    if (impact.logiciel !== LOGICIEL) throw new Error(`il porte sur ${impact.logiciel}, pas sur ${LOGICIEL}`);
  } catch (error) {
    missing.push(`--impact ${IMPACT_FILE} illisible : ${error.message}`);
    impact = null;
  }
}
const REGRESSIONS = flag("r") ? option("r").split(",") : undefined;
let consigne = null;
try {
  consigne = construireConsigne({ vault: VAULT, logiciel: LOGICIEL, version: VERSION, ids: flag("tests") ? option("tests").split(",") : impact?.retenus.map(({ id }) => id), baseUrl: BASE, regressions: REGRESSIONS });
} catch (error) {
  missing.push(`La consigne du coureur ne se construit pas : ${error.message}`);
}
const tests = consigne?.tests ?? [];
// Zones of a screen that change at each visit (a rotating photo), declared in its note: not compared to the reference.
const IGNORED = new Map(lireNotes(VAULT, LOGICIEL).map((note) => [note.entete.ecran, note.entete.zones_ignorees ?? []]));
const ignored = (ecran) => IGNORED.get(ecran) ?? [];
const dropped = consigne?.dropped ?? [];
const course = consigne?.course ?? [];

const keyOf = ({ ecran, vue }) => `${ecran}--${vue}`;
const call = ({ ecran, vue }) => `relever(ecran="${ecran}", vue="${vue}")`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const versioned = (test, path) => path.replaceAll(`/v${test.version_cible}/`, `/v${VERSION}/`);
const section = (test, name) => (new RegExp(`^## ${name}[ \\t]*\\n([\\s\\S]*?)(?=^## |^\`\`\`)`, "m").exec(test.markdown)?.[1] ?? "").trim();

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
const holo = SANS_AGENT ? null : findHolo();
stopIfMissing({ port: PORT, chromeBin: CHROME_BIN, sansAgent: SANS_AGENT, holo }, missing);
// Each step of the passage, as the runner writes it in the base, is also said here.
const writeEvent = base.insererEvenement.bind(base);
base.insererEvenement = (event) => {
  say(`étape ${event.etape} : ${event.action}`);
  return writeEvent(event);
};

const START = consigne.start;

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
let vitrine = null; // the showcase (--vitrine, vitrine.mjs): the scene enlarged to a whole screen in a separate Chrome
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
// The hook bound by the runner (PR #22): 45 s. Relever no longer waits for the mascot; the bound stays for a page that
// does not answer.
const HOOK_TIMEOUT_MS = 45_000;
// Time H waits after a gesture before its next observation (PR #26): the scene holds each click 620 to 922 ms (measured
// on 2026-11-17), and at 0,5 s the agent clicked « Factures » twice on the course of 15 h 11.
const SETTLE_S = 1.2;
const releverMs = []; // duration of each relever, from the tool call to the answer given to the agent
const answered = new Map(); // per relevé, when relever answered the agent
let answeredAt = null; // when the last relever answered the agent

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
const zoneTexts = new Map(); // per visual finding id, every text shown inside its zone when it was taken
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
// The mascot only speaks at the end of the course.
async function speak(text, label) {
  if (SANS_PRESENTATION) return;
  await mascot("bulle", text);
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
  // A doubt already shown that this defect explains is no longer a doubt: its line takes the colour of a defect.
  for (const doubt of consolidated.filter((candidate) => candidate.explique_par === constat.id && revealed.has(candidate.id))) {
    await mascot("requalifier", doubt.id, "defaut");
    await witness("doute-devenu-probleme");
  }
}

// What a screen shows once its relevé is taken, while the agent goes on: the mascot reads, the line around each new
// finding is drawn, then the mascot takes the look of the worst one (a proven defect, else a doubt, else nothing it
// could conclude, else all good) with a jump, and rests. Not a word, no counter. Queued, never awaited by relever: a
// screen the agent has already left keeps its lines for its address (surligner).
let queue = Promise.resolve();
function show(step, units) {
  queue = queue.then(async () => {
    await mascot("etat", "verification");
    if (!units.some((constat) => marks.has(constat.id))) await hold(800);
    for (const constat of units) {
      const mark = marks.get(constat.id);
      if (mark) {
        const drawing = mascot("surligner", mark.address, mark.rects, mark.genre, constat.id, mark.avant);
        await sleep(STROKE_MS * 0.3);
        if (WITNESSES) say(`Témoin trait-pendant-agent : ${constat.id}, relevé ${step.key} rendu à l'agent depuis ${Date.now() - answered.get(step.key)} ms.`);
        await witness("trait-pendant-agent");
        await drawing;
        await witness(`trait-${mark.genre}${mark.avant ? "-deplacement" : ""}`);
      }
      await reveal(constat);
    }
    const worst = ["VERIFIED_FAIL", "SUSPECTED", "INCONCLUSIVE"].find((statut) => units.some((constat) => constat.statut === statut)) ?? "PASS";
    const [etat] = KIND[worst];
    await mascot("etat", etat, etat !== "repos");
    if (etat === "defaut") {
      await sleep(150);
      await witness("mascotte-defaut-sans-bulle");
    }
    await hold(1200);
    await mascot("etat", "repos");
  }).catch((error) => errors.push(`Mascotte : ${error.message}`));
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
      zones_ignorees: ignored(step.ecran),
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
      const { texte, cadre, textes } = await mascot("autour", constat.zone);
      constat.texte_zone = texte;
      frames.set(constat.id, cadre);
      zoneTexts.set(constat.id, textes);
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
// and the sentence the agent reads, given as soon as the capture is taken and checked. What the screen shows (show) is
// drawn afterwards, while the agent goes on. On another page nothing is checked nor shown: the capture carries the real
// address and the runner refuses the relevé itself.
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
  show(step, await findings(step, releve));
  answered.set(step.key, Date.now());
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
    // The page the test starts from: after the entrance of Facturo (?suite=), else the departure address itself.
    const departure = new URL(test.url_depart, BASE);
    const start = versioned(test, departure.searchParams.get("suite") ?? `${departure.pathname}${departure.search}`);
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
  // The page of the scene stays 1280 × 900; the showcase only retransmits it. If it fails, the scene goes on.
  if (flag("vitrine")) vitrine = await ouvrirVitrine(page, { chromeBin: CHROME_BIN, profil: resolve(option("profil-vitrine", "/Users/nathan/Code/projet/horama/.orchestrateur/chrome-vitrine")), debugPort: flag("vitrine-debug") ? Number(option("vitrine-debug")) : null, say });
  if (FILM) film();
  // What the change asks to replay: said in the terminal now, shown in the summary at the end (nothing on screen
  // before the agent starts).
  if (impact) say(`Sélection : retenus ${impact.retenus.map(({ id, raisons }) => `${id} (${(raisons ?? []).join(" ; ")})`).join(", ")}. Écartés : ${impact.ecartes.map(({ id, raison }) => `${id} (${raison})`).join(", ") || "aucun"}.`);
  const coureur = creerCoureur({
    vault: VAULT, base, baseUrl: BASE, identifiant: () => ID, signaler: say, hookTimeoutMs: HOOK_TIMEOUT_MS, signal: arret.signal,
    relever: async (ecran, vue) => {
      const from = Date.now();
      try { return await relever(ecran, vue); } finally { releverMs.push({ releve: `${ecran}--${vue}`, ms: (answeredAt = Date.now()) - from }); }
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

// ---------- End of the course: the mascot speaks at last. Each defect and each doubt in turn, explained, and a human
// decides ----------
await queue;
const complete = course.every((step) => taken.has(step.key));
const final = totals();
const kept = consolidated.filter((constat) => revealed.has(constat.id) && open(constat));
const toDecide = [...kept.filter((constat) => constat.statut === "VERIFIED_FAIL"), ...kept.filter((constat) => constat.statut === "SUSPECTED")];
const review = flag("sans-fin") ? [] : toDecide;
const sentences = (parts) => parts.filter(Boolean).map((part) => (part.endsWith(".") ? part : `${part}.`)).join(" ");
const outcome = [
  [final.problemes && count(final.problemes, "problème", "problèmes"), final.doutes && count(final.doutes, "doute", "doutes")].filter(Boolean).join(" et ") || (complete && !final.sans_conclusion ? "Tout est bon" : ""),
  final.sans_conclusion ? `${count(final.sans_conclusion, "point", "points")} que je n'ai pas pu vérifier` : "",
];
const summary = sentences([complete ? "J'ai fini." : "Je n'ai pas pu finir le parcours.", ...outcome]);
say(`Bilan : ${summary}`);
let finMs = null; // from the last relevé to the end screen (to the summary when there is nothing to decide)
// The test a finding belongs to: the one that carries its rule, failing that the first one that asks for its screen.
const testOf = (constat) => (tests.find((test) => constat.regle && test.regles.some((rule) => same(rule, constat.regle))) ?? tests[course.find((step) => step.ecran === constat.ecran && step.vue === constat.vue).part - 1]).id;
// What the summary shows of a finding: its capture (the relevé, layer hidden) with the zones that were ringed on the
// page, what was checked and found, and the question. A result the question repeats word for word is not said twice.
const itemOf = (constat) => {
  const { annonce, question, resultat } = formuler(constat);
  const text = question ?? resultat;
  const { png } = taken.get(`${constat.ecran}--${constat.vue}`);
  const [etat, genre] = KIND[constat.statut];
  return { id: constat.id, genre, etat, texte: resultat, png, zones: marks.get(constat.id)?.rects ?? (constat.zone ? [constat.zone] : []), page: sizeOf(png),
    textes: [annonce, !text.startsWith(resultat) && resultat].filter(Boolean), question: text };
};
// The choice of the tests: the change and its reasons (--impact), else the tests played.
const selection = impact
  ? { titre: `Tests choisis pour ce changement${impact.vers ? ` (${String(impact.vers).slice(0, 7)})` : ""}`,
    lignes: [...impact.retenus.map(({ id, raisons }) => `${id} : rejoué${raisons?.length ? `, ${raisons.join(" ; ")}` : ""}`), ...impact.ecartes.map(({ id, raison }) => `${id} : écarté${raison ? `, ${raison}` : ""}`)] }
  : { titre: "Tests joués", lignes: tests.map((test) => test.id) };
const items = new Map(toDecide.filter((constat) => taken.has(`${constat.ecran}--${constat.vue}`)).map((constat) => [constat.id, itemOf(constat)]));
if (page) {
  try {
    // The card of the charter: the title, the address in mono, three figures (proven, to decide, tests played), the
    // choice of the tests in small at the end.
    const recap = { titre: complete ? "J'ai fini." : "Je n'ai pas pu finir le parcours.", site: BASE,
      chiffres: [
        { valeur: final.problemes ?? 0, libelle: (final.problemes ?? 0) > 1 ? "défauts prouvés" : "défaut prouvé", genre: "defaut" },
        { valeur: final.doutes ?? 0, libelle: "à trancher", genre: "doute" },
        { valeur: tests.length, libelle: tests.length > 1 ? "tests rejoués" : "test rejoué" },
      ],
      lignes: final.sans_conclusion ? [`${count(final.sans_conclusion, "point", "points")} que je n'ai pas pu vérifier.`] : [], selection };
    say(`Récapitulatif : ${summary}`);
    const choices = (await revoir({ mascot, recap, items: review.map((constat) => items.get(constat.id)), choix: CHOICES, presentation: !SANS_PRESENTATION, witness, say }, () => new Promise((resolve) => (chosen = resolve))))
      .map(({ item, choix }) => {
        const constat = review.find((candidate) => candidate.id === item.id);
        return { constat, choix, question: formuler(constat).question };
      });
    if (!review.length && answeredAt) finMs = Date.now() - answeredAt;
    if (review.length) {
      // Each choice becomes a decision of the vault, read again once written.
      await mascot("etat", "repos");
      await speak("Je range tout ça.", "rangement");
      const le = new Date().toISOString();
      for (const { constat, choix, question } of choices) {
        let decision = versDecision(constat, choix, { passage_id: ID, test_id: testOf(constat), logiciel: LOGICIEL, version: VERSION, par: PAR, le });
        let file;
        if (choix === "voulu") {
          // A correction that cannot be proposed, applied or refused leaves the decision as versDecision made it.
          const plain = decision;
          let failure = null;
          let proposal = null;
          try {
            // A visual doubt says where, not what: the texts the zone shows now, when the note does not cite them yet,
            // give the model the state since the change. Texts the note already cites say nothing new (a colour changed).
            const noteText = (lireNotes(VAULT, LOGICIEL).find(({ entete }) => entete.ecran === constat.ecran)?.texte ?? "").toUpperCase();
            const shown = (zoneTexts.get(constat.id) ?? []).filter((text) => !noteText.includes(text.toUpperCase()));
            const indices = [...(question ? [question] : []), ...(shown.length ? [`Textes affichés aujourd'hui dans la zone qui a changé, lus sur la page : ${shown.map((text) => `« ${text} »`).join(", ")}. La note ne les cite nulle part : la phrase de la note qui décrit l'élément de cette zone porte encore le texte d'avant le changement.`] : [])];
            if (shown.length) say(`Textes de la zone donnés au modèle de correction : ${shown.join(" | ")}`);
            proposal = await proposerCorrection(VAULT, decision, { indices });
            decision = proposal.decision;
          } catch (error) {
            failure = error;
          }
          if (decision.correction_de_note) {
            const answer = new Promise((resolve) => (chosen = resolve));
            const correction = decision.correction_de_note;
            await mascot("correction", { id: decision.id, file: correction.fichier, before: correction.avant, after: correction.apres });
            say(`Correction proposée pour ${correction.fichier} : ${correction.avant} → ${correction.apres}`);
            await witness("correction-proposee");
            if (CORRECTION_CHOICE) sleep(SANS_PRESENTATION ? 0 : reading(correction.avant + correction.apres)).then(() => mascot("chooseCorrection", CORRECTION_CHOICE, decision.id)).catch(() => {});
            const { choix: correctionChoice } = await answer;
            try {
              decision = correctionChoice === "accepter" ? appliquerCorrection(VAULT, decision) : refuserCorrection(VAULT, decision);
              // The memory operation already wrote this final decision; do not overwrite it with an earlier version.
              file = `${decision.logiciel}/decisions/${decision.id}.md`;
            } catch (error) {
              failure = error;
              decision = plain;
            }
            if (!failure) {
              await mascot("correctionResult", decision.correction_de_note.statut);
              say(`Correction ${decision.correction_de_note.statut} : ${correction.fichier}.`);
              await hold(900);
              await witness(`correction-${decision.correction_de_note.statut}`);
            }
            await mascot("bulle", null);
            // The accepted correction goes to the documentation as a PR. A failure is said and the scene goes on.
            if (!failure && PR_DOC_CONFIG && decision.correction_de_note?.statut === "acceptee") {
              const { fichier, avant, apres } = decision.correction_de_note;
              let opened;
              try {
                opened = await ouvrirPrDoc({ passage_id: ID, fichier, avant, apres, decision }, PR_DOC_CONFIG);
              } catch (error) {
                opened = { status: "INCONCLUSIVE", reason: error.message };
              }
              if (opened.status === "opened") {
                prDoc.push({ label: `PR de documentation (${fichier})`, url: opened.url });
                say(`PR de documentation ouverte : ${opened.url}`);
                await speak("J'ai ouvert la PR de documentation.", "pr-doc-ouverte");
              } else {
                // In the note, the last line of the error (git's « fatal: … »); the whole message in the terminal.
                prDoc.push({ label: `PR de documentation non ouverte (${fichier})`, url: opened.reason.trim().split("\n").at(-1) });
                say(`PR de documentation non ouverte : ${opened.reason}${opened.branch ? ` (branche ${opened.branch})` : ""}`);
                await speak("Je n'ai pas pu ouvrir la PR de documentation : la note est corrigée ici, pas encore dans le dépôt.", "pr-doc-echec");
              }
            }
          } else if (proposal) {
            say(proposal.raison);
            await speak(proposal.raison, "correction-absente");
          }
          if (failure) {
            say(`Correction de note impossible, décision gardée sans correction : ${failure.message}`);
            await speak("Je n'ai pas pu corriger la note : je garde ta décision sans correction.", "correction-impossible");
          }
        }
        decisions.push({ fichier: file ?? ecrireDecision(VAULT, decision), decision });
      }
      const written = lireDecisions(VAULT, LOGICIEL);
      for (const { fichier, decision } of decisions) if (!written.some((candidate) => same(candidate, decision))) errors.push(`Décision écrite mais pas relue à l'identique : ${fichier}`);
      const made = (choix) => decisions.filter(({ decision }) => decision.decision === choix).length;
      const tally = [made("bug") && count(made("bug"), "bug à corriger", "bugs à corriger"), made("voulu") && count(made("voulu"), "changement validé", "changements validés")].filter(Boolean).join(", ");
      await mascot("fin", { titre: "C'est rangé.", compte: tally, legende: "Écrit dans la documentation :", fichiers: decisions.map(({ fichier }) => fichier) });
      if (answeredAt) finMs = Date.now() - answeredAt;
      await hold(900);
      await witness("fin");
      say(`${tally}. ${count(decisions.length, "décision écrite", "décisions écrites")} dans ${VAULT} : ${decisions.map(({ fichier }) => fichier).join(", ")}.`);
    }
  } catch (error) {
    errors.push(`Fin du parcours : ${error.message}`);
  }
}
// The report the runner wrote in the vault, completed with what only the scene knows (issue #71, point 2): the tests
// replayed and set aside, each defect and doubt with its capture ringed, the decision of the human, the PR.
const rejoues = impact ? impact.retenus.map(({ id, raisons }) => `${id}${raisons?.length ? ` (${raisons.join(" ; ")})` : ""}`) : tests.map((test) => test.id);
const ecartes = [...(impact?.ecartes ?? []), ...dropped].map(({ id, raison }) => `${id}${raison ? ` (${raison})` : ""}`);
let notePath = null;
if (report) {
  try {
    const note = notePath = completerNote({ vault: VAULT, logiciel: LOGICIEL, passage: ID, tests: { titre: "Tests", lignes: [...rejoues.map((line) => `Rejoué : ${line}`), ...ecartes.map((line) => `Écarté : ${line}`)] }, items: [...items.values()], decisions, pr: [...(PR ? [{ label: "PR qui a déclenché le passage", url: PR }] : []), ...prDoc] });
    say(note ? `Note du passage complétée : ${join(VAULT, note)}.` : `Aucune note du coureur pour ${ID} : rien à compléter.`);
  } catch (error) {
    errors.push(`Note du passage : ${error.message}`);
  }
}
// The answer on the PR that woke the passage (with --pr): written in passage.json (commentaire_corps, the wake-up puts
// it in one answer with the exploration of the site), posted with gh only with --commenter. A failure is said, the
// scene goes on and its exit does not change.
let commentaire = null;
let commentaireCorps = null;
if (PR && report) {
  const entry = (constat) => ({ id: constat.id, ecran: constat.ecran, texte: formuler(constat).resultat });
  commentaireCorps = ecrireCommentaire({ passage: ID, rejoues, ecartes, prouves: toDecide.filter((constat) => constat.statut === "VERIFIED_FAIL").map(entry),
    doutes: toDecide.filter((constat) => constat.statut === "SUSPECTED").map(entry), decisions: decisions.map(({ decision }) => decision),
    note: `vault-horama/${notePath ?? `${LOGICIEL}/passages/${ID}.md`}`, complet: complete });
  if (flag("commenter")) {
    commentaire = await publierCommentaire(PR, commentaireCorps);
    say(commentaire.status === "publie" ? `Commentaire publié sur la PR : ${commentaire.url}` : `Commentaire non publié sur la PR : ${commentaire.reason}`);
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
const showcase = vitrine?.mesures() ?? null;
if (showcase) say(`Vitrine : ${showcase.images_recues} images reçues, ${showcase.images_affichees} affichées, ${showcase.images_par_seconde} par seconde ; délai de l'image dessinée à l'image affichée : médiane ${showcase.delai_total_ms.mediane} ms, p95 ${showcase.delai_total_ms.p95} ms.`);
await vitrine?.stop({ fermer: flag("fermer-chrome") });
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
  sans_presentation: SANS_PRESENTATION,
  impact: impact && { fichier: IMPACT_FILE, depuis: impact.depuis ?? null, vers: impact.vers ?? null, retenus: impact.retenus.map(({ id }) => id), ecartes: impact.ecartes },
  relever_ms: releverMs,
  relever_max_ms: releverMs.length ? Math.max(...releverMs.map(({ ms }) => ms)) : null,
  delai_crochet_ms: HOOK_TIMEOUT_MS,
  settle_s: SANS_AGENT ? null : SETTLE_S,
  fin_s: finMs === null ? null : finMs / 1000,
  film: FILM ? { dossier: FILM, images, duree_s: filmedMs / 1000 } : null,
  vitrine: showcase,
  commentaire,
  commentaire_corps: commentaireCorps,
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
if (finMs !== null) say(`Fin du parcours : ${(finMs / 1000).toFixed(1).replace(".", ",")} s, du dernier relevé jusqu'${review.length ? "à l'écran de fin" : "au récapitulatif"}.`);
if (releverMs.length) say(`Relevé le plus long : ${Math.max(...releverMs.map(({ ms }) => ms))} ms (délai du crochet : ${HOOK_TIMEOUT_MS} ms).`);
if (delays.length) say(`Retard ajouté par clic retenu : de ${Math.min(...delays)} à ${Math.max(...delays)} ms (${delays.length} clics).`);
if (FILM) say(`Film : ${images} images sur ${(filmedMs / 1000).toFixed(1).replace(".", ",")} s, dans ${FILM}.`);
for (const line of errors) say(`Erreur : ${line}`);
await stop();
process.exit(complete && !errors.length && report?.passage.etat === "joue" ? 0 : 1);
