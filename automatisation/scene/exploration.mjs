// The public mode in the scene (issue #69, point 5): any site, no test written. The explorer of agent/ finds the pages
// and has the H agent visit them in the scene's Chrome; its checks write horama-exploration-1
// (docs/decisions/2026-11-17-format-exploration.md). The scene gives it the Chrome, the bridge and our captures (layer
// hidden), reads that file as it grows and, at the moment a page is checked, draws a line around each defect and doubt
// of the page, without a word, while the mascot changes its look. At the end, the same summary as the development mode
// (recapitulatif.mjs): every defect and doubt with its capture ringed, then « bug » or « voulu », written as a decision
// in the memory of the site. Nothing here is particular to a site.
//
// Usage: node [--env-file=<.env.local>] automatisation/scene/exploration.mjs --url <adresse> [--site <dossier du vault>] [--max 15] [--pages-cliquees 4] [--sans-agent]
//          [--sans-holo] [--sans-base | --avec-base] [--choix bug,voulu,...] [--repeter-choix] [--sans-fin] [--par <nom>] [--rythme <s>]
//          [--vault <dir>] [--sortie <dir>] [--temoins <dir>] [--port 9333] [--profil <dir>] [--fermer-chrome]
//          [--captures-instantanees]
// The captures of proof of the explorer scroll smoothly to their zone (option doux of #179): the scene is on the screen,
// a jump would be seen. --captures-instantanees goes back to the instant scroll.
// Env: HAI_API_KEY (H and Holo), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CHROME_BIN, HOLO_BIN.
// Exit: 0 the exploration ended « fini » and nothing failed, 1 otherwise, 2 something is missing, 130 Ctrl+C.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BaseMemoire, creerBaseSupabase, creerSessionH } from "../../agent/index.ts";
import { explorer, exclusionLabel } from "../../agent/src/exploration/explorer.ts";
import { libelleAction } from "../../agent/src/session.ts";
import { ecrireDecision, lireDecisions } from "../../memoire/index.ts";
import { findHolo, startBridge, stopIfMissing } from "./agent-h.mjs";
import { creerEcrivainMemoire, creerEcrivainSupabase } from "./decisions.mjs";
import { completerNote } from "./note-passage.mjs";
import { bilanExploration, dejaVoulu, lisible, phraseDe, revoir, selecteursDe, sizeOf } from "./recapitulatif.mjs";
import { ecrireSectionExploration, publierCommentaire } from "../pr-doc/commentaire.mjs";
import { ouvrirVitrine } from "./vitrine.mjs";
import { HEIGHT, WIDTH, capture, captureZone, closeChrome, connectTab, evaluate, fitViewport, flag, installLayer, layer, navigate, openChrome, option, say, sleep } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SANS_AGENT = flag("sans-agent");
const URL_SITE = option("url", "");
const MAX = Number(option("max", 15));
// The folder of the site in the vault (PR #157): stable between previews of one repository, whose host names differ.
// Without it, the explorer names the site after the host of --url.
const SITE = option("site", "");
// How many pages after the page of departure the H agent reaches by a real click on a visible link (issue #91, PR #93).
const CLICKED = Number(option("pages-cliquees", 4));
const VAULT = resolve(option("vault", join(HERE, "../../vault-horama")));
const PORT = Number(option("port", 9333));
const PROFILE = resolve(option("profil", "/Users/nathan/Code/projet/horama/.orchestrateur/chrome-agent"));
const ID = `${new Date().toLocaleString("sv-SE").slice(0, 16).replace(" ", "-").replace(":", "h")}-${randomUUID().slice(0, 4)}`;
const OUT = resolve(option("sortie", `/Users/nathan/Code/projet/horama/.orchestrateur/exploration/${ID}`));
const WITNESSES = option("temoins") ? resolve(option("temoins")) : null;
const CHOICES = flag("choix") ? option("choix").split(",") : [];
// --repeter-choix: --choix taken again from the start (S9, filmed passages). It writes as many decisions as there are
// questions, chosen in advance: on a temporary vault and without the shared base only.
const REPEAT = flag("repeter-choix");
const PAR = option("par", "Nathan");
const RYTHME = Number(option("rythme", 2));
const CHROME_BIN = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FILE = join(OUT, "exploration.json");

const missing = [];
try {
  if (!/^https?:$/.test(new URL(URL_SITE).protocol)) throw new Error();
} catch {
  missing.push("--url attend l'adresse HTTP(S) d'un site.");
}
if (flag("site") && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(SITE)) missing.push("--site attend un identifiant de dossier (lettres, chiffres, tirets, soulignés).");
if (!Number.isSafeInteger(MAX) || MAX < 1) missing.push("--max attend un entier positif.");
if (!Number.isSafeInteger(CLICKED) || CLICKED < 0) missing.push("--pages-cliquees attend un entier positif ou nul.");
if (CHOICES.some((choix) => choix !== "bug" && choix !== "voulu")) missing.push("--choix attend une liste de « bug » et de « voulu », séparés par des virgules.");
const REPO_VAULT = resolve(HERE, "../../vault-horama");
if (REPEAT && (VAULT === REPO_VAULT || VAULT.startsWith(`${REPO_VAULT}/`))) missing.push("--repeter-choix demande un vault temporaire (--vault), jamais vault-horama/ du dépôt.");
if (REPEAT && !flag("sans-base")) missing.push("--repeter-choix demande --sans-base (aucune décision choisie d'avance dans la base partagée).");
if (REPEAT && !CHOICES.length) missing.push("--repeter-choix demande --choix.");
if (flag("temoins") && !option("temoins")) missing.push("--temoins demande un dossier.");
if (flag("sans-base") && flag("avec-base")) missing.push("--sans-base et --avec-base s'excluent.");
if (!flag("sans-holo") && !process.env.HAI_API_KEY) missing.push("Holo demande HAI_API_KEY (sans Holo : --sans-holo).");
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

mkdirSync(OUT, { recursive: true });
if (WITNESSES) mkdirSync(WITNESSES, { recursive: true });
const chrome = await openChrome({ bin: CHROME_BIN, port: PORT, profile: PROFILE });
say(chrome.started ? `Chrome dédié lancé (${chrome.version}, port ${PORT}).` : `Un Chrome écoute déjà sur le port ${PORT} : réutilisé.`);
const page = await connectTab(PORT);
let chosen = null;
await installLayer(page, () => {}, { passage: ID, titre: "Horama", onChoice: (choice) => chosen?.(choice) });
const area = await fitViewport(page);
if (area.largeur !== WIDTH || area.hauteur !== HEIGHT || area.densite !== 1) {
  say(`Zone de page ${area.largeur} × ${area.hauteur} à la densité ${area.densite} au lieu de ${WIDTH} × ${HEIGHT} à la densité 1 : exploration non jouée.`);
  process.exit(2);
}
const mascot = (command, ...args) => layer(page, command, ...args);
// The showcase (--vitrine): the scene enlarged to a whole screen in a separate Chrome; this page stays 1280 × 900.
const vitrine = flag("vitrine") ? await ouvrirVitrine(page, { chromeBin: CHROME_BIN, profil: resolve(option("profil-vitrine", "/Users/nathan/Code/projet/horama/.orchestrateur/chrome-vitrine")),
  debugPort: flag("vitrine-debug") ? Number(option("vitrine-debug")) : null, say }) : null;
// The page of departure at once, the mascot reading: what the audience sees while the pages are found and the H agent
// starts (about 20 s measured on 18/11, 11 h 45), instead of a blank page.
await navigate(page, URL_SITE);
await mascot("etat", "observe").catch(() => {});
// While the agent starts, the mascot gets ready in the middle of the page and looks it over, until the first gesture of
// the mouse of H; the arrow shows only then (couche-horama.js, preparer).
await mascot("preparer", true).catch(() => {});
let witnesses = 0;
let capturing = false;
async function witness(label) {
  if (!WITNESSES || capturing) return;
  const image = await Promise.race([page.send("Page.captureScreenshot", { format: "png" }).then(({ data }) => Buffer.from(data, "base64"), () => null), sleep(300).then(() => null)]);
  if (image) writeFileSync(join(WITNESSES, `${String(++witnesses).padStart(2, "0")}-${label}.png`), image);
}

// ---------- What the explorer is given: our Chrome, our captures (layer hidden), the bridge of each H session ----------
const bridges = new Set();
const runtime = {
  // beforeCapture: the recheck of the cookie banner by the explorer (PR #102), just before the screenshot.
  async relever(_ecran, _vue, beforeCapture) {
    capturing = true;
    const shot = await capture(page, beforeCapture).finally(() => (capturing = false));
    return { png: new Uint8Array(shot.png), texte: shot.texte_page, url_page: shot.url_page, largeur: shot.largeur, hauteur: shot.hauteur, defilement: shot.defilement, phrase: "Capture enregistrée. Continue le parcours." };
  },
  async navigateur() {
    // The page stays where it is (the page of departure at first): the agent opens it again by its go_to.
    const channel = randomUUID();
    const bridge = startBridge({ holo, port: PORT, channel, logFile: join(OUT, "pont-holo.log") });
    bridges.add(bridge);
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
  },
  // The capture of a defect out of the first screen, for captures/<id>.png (hook validated by Ali on PR #85): scrolled
  // at once, layer hidden, scroll put back. On failure the explorer falls back on its own capture.
  async capturerZone(zone) {
    capturing = true;
    try {
      return await captureZone(page, zone);
    } finally {
      capturing = false;
    }
  },
  close() {
    for (const bridge of bridges) bridge.stop();
  },
};
// Without H: the script opens each page of the course and calls the tools as the agent would, one step per gesture.
async function scriptedSession({ consigne, onCreated, onStep, onTool }) {
  const id = `script-${ID}`;
  let etapes = 0;
  const gesture = (name) => onStep({ horodatage: new Date().toISOString(), etape: ++etapes, action: libelleAction([name]), etat_session: "en_cours" });
  await onCreated(id);
  const fin = (async () => {
    for (const step of consigne.course) {
      await gesture("go_to");
      await navigate(page, step.address);
      await sleep(RYTHME * 1000);
      await gesture("relever");
      say(`relever(${step.ecran}) : ${(await onTool("relever", { ecran: step.ecran, vue: "defaut" })).split("\n")[0]}`);
      // The agent takes a step before its next gesture (8 to 10 s with H): the page stays while its lines are drawn.
      await sleep(RYTHME * 1000);
    }
    await gesture("terminer");
    await onTool("terminer", { etat: "reussi" });
  })().then(() => ({ id, muted: false, cout_usd: null, etapes }), (error) => ({ id, muted: false, cout_usd: null, etapes, erreur: error.message }));
  return { id, fin };
}
const session = SANS_AGENT ? scriptedSession : creerSessionH({ navigateur: runtime.navigateur, settle_s: 1.2, key: process.env.HAI_API_KEY, signaler: say });
// --sans-holo: no look by Holo, at no cost; the checks by the code still run.
const noHolo = async () => ({ status: "SUSPECTED", findings: [], model: "holo4-27b", durationMs: 0 });

// ---------- While the agent works: the file is read every 250 ms, each page checked gets its lines ----------
const read = () => {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return null;
  }
};
const GENRE = { VERIFIED_FAIL: "defaut", SUSPECTED: "doute" };
const LOOK = { VERIFIED_FAIL: "trouve", SUSPECTED: "doute", INCONCLUSIVE: "observe", PASS: "observe" };
const shown = new Set(); // pages whose findings were handed to the mascot
const drawnOn = new Map(); // finding id -> drawn on the live page
const visibleTexts = new Map(); // finding id -> visible texts of the elements it groups, read on the live page
let queue = Promise.resolve();
const sameAddress = (a, b) => {
  const [x, y] = [new URL(a), new URL(b)];
  return x.origin === y.origin && x.pathname.replace(/\/+$/, "") === y.pathname.replace(/\/+$/, "") && x.search === y.search;
};
// Where a finding is on the live page: its element (CSS selector of the check), else its displayed texts, else its
// zone of the capture of the page (taken at the top of the page, so in page coordinates).
async function rectsOf(constat, pageEntry) {
  const selector = constat.preuve?.element;
  if (selector) {
    const rects = await mascot("element", selector);
    if (rects.length) return rects;
  }
  for (const text of constat.textes_a_surligner ?? []) {
    const rects = await mascot("trouver", text);
    if (rects.length) return rects;
  }
  if (constat.zone && constat.capture === pageEntry.capture?.fichier) {
    const [dx, dy] = pageEntry.capture.defilement ?? [0, 0];
    return [{ ...constat.zone, x: constat.zone.x + dx, y: constat.zone.y + dy }];
  }
  return [];
}
function showPage(pageEntry, constats) {
  queue = queue.then(async () => {
    const mine = constats.filter((constat) => constat.ecran === pageEntry.ecran && !constat.explique_par);
    await mascot("etat", "observe");
    const live = await evaluate(page, "location.href").catch(() => "");
    if (live && sameAddress(live, pageEntry.url)) {
      const address = await evaluate(page, "location.pathname + location.search");
      // The visible texts of the elements a grouped finding cites, while their page is on the screen (for the end).
      for (const constat of mine) {
        const selectors = selecteursDe(constat.description);
        if (selectors.length) visibleTexts.set(constat.id, await Promise.all(selectors.map((selector) => mascot("texte", selector).catch(() => ""))));
      }
      for (const constat of mine.filter((candidate) => GENRE[candidate.statut])) {
        // Never around nothing: a zone under 4 px in one dimension is not drawn (S7, Louvre 19/11: rings around 1 px).
        const rects = (await rectsOf(constat, pageEntry)).filter((rect) => rect.largeur >= 4 && rect.hauteur >= 4);
        if (!rects.length) continue;
        const drawing = mascot("surligner", address, rects, GENRE[constat.statut], constat.id, null, true);
        await sleep(300);
        await witness("trait-pendant-agent");
        await drawing;
        drawnOn.set(constat.id, rects);
        await witness(`trait-${GENRE[constat.statut]}`);
      }
    }
    // A stroke drawn: the layer has put the expression before it and keeps it until the next gesture of H (S3). Without
    // a stroke (no zone on the live page), the expression of the page for 1.2 s, as before.
    if (mine.some((constat) => drawnOn.has(constat.id))) return;
    const worst = ["VERIFIED_FAIL", "SUSPECTED", "INCONCLUSIVE"].find((statut) => mine.some((constat) => constat.statut === statut)) ?? "PASS";
    await mascot("etat", LOOK[worst]);
    await sleep(1200);
    await mascot("etat", "observe");
  }).catch((error) => say(`Mascotte : ${error.message}`));
}
let watching = true;
const watch = (async () => {
  while (watching) {
    const report = read();
    for (const entry of report?.pages ?? []) {
      if (entry.etat !== "visitee" || shown.has(entry.ecran)) continue;
      shown.add(entry.ecran);
      showPage(entry, report.constats);
    }
    await sleep(250);
  }
})();

// ---------- The exploration ----------
const arret = new AbortController();
process.on("SIGINT", () => {
  say("Interrompu : arrêt de l'exploration.");
  arret.abort(new Error("Passage annulé par Ctrl+C."));
});
const errors = [];
let report = null;
try {
  report = await explorer({ url: URL_SITE, max: MAX, pagesCliquees: CLICKED, sortie: OUT, vault: VAULT, port: PORT, ...(SITE ? { site: SITE } : {}), doux: !flag("captures-instantanees") }, { base, runtime, session, signal: arret.signal, log: say, ...(flag("sans-holo") ? { holo: noHolo } : {}) });
} catch (error) {
  errors.push(error.message);
  say(`Échec : ${error.message}`);
}
watching = false;
await watch;
report = read() ?? report;
await queue;

// ---------- The end: the summary, then bug or voulu for each defect and doubt ----------
const count = (number, one, many) => `${number} ${number > 1 ? many : one}`;
const decisions = [];
// The PR that woke the exploration (réveil par PR, #122): its part of the answer is written in scene.json, and posted
// with --commenter (the wake-up posts one answer for both scenes instead).
const PR = option("pr", null);
let commentaire = null;
if (report?.format === "horama-exploration-1") {
  const { totaux, trouvees, constats } = report;
  // What a human already said « voulu » for, on an earlier course of this site, is not asked again.
  let past = [];
  try {
    past = lireDecisions(VAULT, report.site);
  } catch (error) {
    errors.push(`Décisions passées : ${error.message}`);
  }
  const accepted = [];
  const toDecide = [...constats.filter((constat) => constat.statut === "VERIFIED_FAIL"), ...constats.filter((constat) => constat.statut === "SUSPECTED" && !constat.explique_par)]
    .filter((constat) => (dejaVoulu(constat, past) ? (accepted.push(constat), false) : true));
  if (accepted.length) say(`Déjà déclarés voulus, non redemandés : ${accepted.map((constat) => constat.id).join(", ")}.`);
  const review = flag("sans-fin") ? [] : toDecide;
  const pathOf = (ecran) => {
    const entry = report.pages.find((candidate) => candidate.ecran === ecran);
    return entry ? new URL(entry.url).pathname : ecran;
  };
  // How the H agent reached each page, when the engine says it (optional field arrivee, decided in #69 for #91).
  const ARRIVAL = { depart: "page de départ", clic: "atteinte par un clic de l'agent", adresse: "ouverte par son adresse" };
  const arrivalOf = (ecran) => ARRIVAL[report.pages.find((candidate) => candidate.ecran === ecran)?.arrivee] ?? null;
  const arrivals = report.pages.filter((entry) => ARRIVAL[entry.arrivee]);
  const byClick = arrivals.filter((entry) => entry.arrivee === "clic").length;
  const byAddress = arrivals.filter((entry) => entry.arrivee === "adresse").length;
  const fromStart = arrivals.filter((entry) => entry.arrivee === "depart").length;
  const proof = (constat) => (constat.source === "controle"
    ? `Prouvé par le code. Mesuré : ${constat.preuve.mesure}. Attendu : ${constat.preuve.attendu}`
    : constat.source === "holo" ? "Doute du regard de Holo, le modèle visuel de H : rien n'est prouvé." : "Écart d'image avec la capture du passage précédent.");
  const items = toDecide.map((constat) => {
    const png = readFileSync(join(OUT, constat.capture));
    const said = lisible(phraseDe(constat), visibleTexts.get(constat.id));
    return { id: constat.id, genre: GENRE[constat.statut], etat: LOOK[constat.statut], texte: `${pathOf(constat.ecran)} : ${said}`, selecteurs: selecteursDe(constat.description), png, zones: constat.zone ? [constat.zone] : [], page: constat.page ?? sizeOf(png),
      mesure: constat.source === "controle" && constat.preuve?.mesure ? `mesuré : ${constat.preuve.mesure}` : null,
      textes: [`Page ${pathOf(constat.ecran)}${arrivalOf(constat.ecran) ? ` (${arrivalOf(constat.ecran)})` : ""} : ${said}`, proof(constat)], question: "C'est un bug, ou c'est voulu ?" };
  });
  const excluded = Object.entries(trouvees.exclues.reduce((all, { raison }) => ({ ...all, [raison]: (all[raison] ?? 0) + 1 }), {})).map(([raison, n]) => `${exclusionLabel(raison)} (${n})`);
  const bilan = bilanExploration(report);
  // No page visited (site that blocks robots, address not found, login asked): the reason, no empty list, no « 0 défaut ».
  // The card of the charter: « J'ai fini. », the address in mono, three figures (proven, to decide, visited), one line per
  // finding; the details of the pages in small at the end.
  const proven = toDecide.filter((constat) => constat.statut === "VERIFIED_FAIL").length;
  const toSettle = toDecide.filter((constat) => constat.statut === "SUSPECTED").length;
  const recap = bilan.aucune ? { titre: "Je n'ai pas pu entrer.", site: report.adresse, lignes: [bilan.phrase] } : {
    titre: "J'ai fini.",
    site: report.adresse,
    chiffres: [
      { valeur: proven, libelle: proven > 1 ? "défauts prouvés" : "défaut prouvé", genre: "defaut" },
      { valeur: toSettle, libelle: "à trancher", genre: "doute" },
      { valeur: totaux.pages_visitees, libelle: `${totaux.pages_visitees > 1 ? "pages visitées" : "page visitée"} sur ${totaux.pages_trouvees}` },
    ],
    lignes: [
      ...(report.etat === "fini" ? [] : ["Passage interrompu : les pages non visitées sont listées plus bas."]),
      ...(totaux.sans_conclusion ? [`${count(totaux.sans_conclusion, "point non vérifié", "points non vérifiés")}.`] : []),
    ],
    selection: { titre: "Pages", lignes: [`Trouvées par ${trouvees.par === "sitemap" ? "le plan du site" : "les liens"}, ${trouvees.plafond} au plus.`,
      // Every visited page counted once, the page of departure too, so that the sum is the figure of the pages visited.
      ...(arrivals.length ? [`${count(fromStart, "page de départ", "pages de départ")}, ${count(byClick, "page atteinte par un clic de l'agent", "pages atteintes par un clic de l'agent")}, ${count(byAddress, "ouverte par son adresse", "ouvertes par leur adresse")}.`] : []),
      ...(excluded.length ? [`Écartées : ${excluded.join(", ")}.`] : []),
      ...(accepted.length ? [`${count(accepted.length, "constat déjà déclaré voulu, non redemandé", "constats déjà déclarés voulus, non redemandés")}.`] : []),
      ...bilan.nonVisitees.map(({ chemin, raison }) => `Non visitée : ${chemin}${raison ? `, ${raison.charAt(0).toLowerCase()}${raison.slice(1).replace(/\.+$/, "")}` : ""}.`)] },
  };
  say(`Récapitulatif : ${[recap.titre, ...(recap.chiffres ?? []).map(({ valeur, libelle }) => `${valeur} ${libelle}`), ...recap.lignes].join(" ")}`);
  // The course stopped for a reason (site that blocks robots, address not found): the mascot says it, the summary keeps it.
  if (bilan.aucune) await mascot("etat", "bloquee").catch(() => {});
  try {
    const made = await revoir({ mascot, recap, items: items.filter((item) => review.some((constat) => constat.id === item.id)), choix: CHOICES, repeter: REPEAT, presentation: true, witness, say }, () => new Promise((resolve) => (chosen = resolve)));
    const le = new Date().toISOString();
    for (const { item, choix } of made) {
      const constat = review.find((candidate) => candidate.id === item.id);
      // The decision of the development mode (C5), for a page of the site: test exploration--<ecran>.
      const decision = { id: `${le.slice(0, 10)}-${constat.id}`, passage_id: report.passage_id, test_id: `exploration--${constat.ecran}`, ecart_id: constat.id, decision: choix, logiciel: report.site,
        ecran: constat.ecran, vue: "defaut", ecart: constat.description, ...(constat.zone ? { zone: constat.zone } : {}), version: report.version, portee: "cet ecart, cet ecran, cette version", par: PAR, le };
      decisions.push({ fichier: ecrireDecision(VAULT, decision), decision });
    }
    if (made.length) {
      const tally = [["bug", "bug à corriger", "bugs à corriger"], ["voulu", "changement validé", "changements validés"]].map(([choix, one, many]) => [made.filter((entry) => entry.choix === choix).length, one, many]).filter(([n]) => n).map(([n, one, many]) => count(n, one, many)).join(", ");
      await mascot("fin", { titre: "C'est rangé.", compte: tally, legende: "Écrit dans la mémoire du site :", fichiers: decisions.map(({ fichier }) => fichier) });
      await sleep(900);
      await witness("fin");
      say(`${tally}. ${count(decisions.length, "décision écrite", "décisions écrites")} dans ${VAULT} : ${decisions.map(({ fichier }) => fichier).join(", ")}.`);
    }
  } catch (error) {
    errors.push(`Fin du parcours : ${error.message}`);
  }
  // The report the runner wrote in the memory of the site, completed after the choices (issue #71, point 2).
  let notePath = null;
  try {
    const visited = report.pages.filter((entry) => entry.etat === "visitee").map((entry) => `${new URL(entry.url).pathname}${ARRIVAL[entry.arrivee] ? ` (${ARRIVAL[entry.arrivee]})` : ""}`);
    const reasonOf = (ecran) => constats.find((constat) => constat.ecran === ecran && constat.raison)?.raison;
    const notVisited = report.pages.filter((entry) => entry.etat !== "visitee").map((entry) => `${new URL(entry.url).pathname}${reasonOf(entry.ecran) ? ` : ${reasonOf(entry.ecran)}` : ""}`);
    notePath = completerNote({ vault: VAULT, logiciel: report.site, passage: report.passage_id, tests: { titre: "Pages", lignes: [...visited.map((path) => `Visitée : ${path}`), ...notVisited.map((line) => `Non visitée : ${line}`), ...(excluded.length ? [`Écartées à la découverte : ${excluded.join(", ")}`] : [])] }, items, decisions });
    say(notePath ? `Note du passage complétée : ${join(VAULT, notePath)}.` : `Aucune note du passage ${report.passage_id} : rien à compléter.`);
  } catch (error) {
    errors.push(`Note du passage : ${error.message}`);
  }
  // The part of the answer on the PR (text only: page, zone, proof; the captures ringed stay in the note).
  if (PR) {
    // The comment on the PR (read by the jury): the readable text first; the selectors of a grouped finding folded.
    const entry = (constat) => ({ id: constat.id, chemin: pathOf(constat.ecran), texte: lisible(phraseDe(constat), visibleTexts.get(constat.id)), selecteurs: selecteursDe(constat.description), zone: constat.zone ?? null, capture: constat.capture ?? null,
      preuve: constat.source === "controle" && constat.preuve?.mesure ? `Mesuré : ${String(constat.preuve.mesure).replace(/\.+$/, "")}. Attendu : ${String(constat.preuve.attendu).replace(/\.+$/, "")}.` : null });
    const corps = ecrireSectionExploration({ adresse: report.adresse, bilan: bilanExploration(report), totaux, decisions: decisions.map(({ decision }) => decision),
      prouves: toDecide.filter((constat) => constat.statut === "VERIFIED_FAIL").map(entry), doutes: toDecide.filter((constat) => constat.statut === "SUSPECTED").map(entry),
      dejaVoulus: accepted.map(entry), note: `vault-horama/${notePath ?? `${report.site}/passages/${report.passage_id}.md`}` });
    // The elements too, with the capture ringed of each finding (written by completerNote), for the wake-up: it can put
    // them on a branch of the target repository and write the part again with the images (--captures-sur-branche).
    const ringedOf = (item) => ({ ...item, anneau: notePath && existsSync(join(VAULT, report.site, "passages", report.passage_id, `${item.id}.png`)) ? `${report.site}/passages/${report.passage_id}/${item.id}.png` : null });
    const elements = { adresse: report.adresse, bilan: bilanExploration(report), totaux, decisions: decisions.map(({ decision }) => decision),
      prouves: toDecide.filter((constat) => constat.statut === "VERIFIED_FAIL").map(entry).map(ringedOf), doutes: toDecide.filter((constat) => constat.statut === "SUSPECTED").map(entry).map(ringedOf),
      dejaVoulus: accepted.map(entry), note: `vault-horama/${notePath ?? `${report.site}/passages/${report.passage_id}.md`}` };
    commentaire = { corps, elements, publication: null };
    if (flag("commenter")) {
      commentaire.publication = await publierCommentaire(PR, corps);
      say(commentaire.publication.status === "publie" ? `Commentaire publié sur la PR : ${commentaire.publication.url}` : `Commentaire non publié sur la PR : ${commentaire.publication.reason}`);
    }
  }
  // The decisions in the base, then the passage « verifie », as in the development mode.
  try {
    for (const { decision } of decisions) await ecrivain.ecrireDecision(decision);
    await ecrivain.marquerVerifie(report.passage_id);
  } catch (error) {
    errors.push(`Base : ${error.message}`);
  }
} else errors.push(`${FILE} absent ou illisible.`);

// The end stays on the screen before Chrome and the showcase close (S9: a filmed passage sees the summary or « C'est
// rangé »); before the showcase stops, which closes its window with --fermer-chrome.
if (flag("fermer-chrome")) await sleep(8000);
const showcase = vitrine?.mesures() ?? null;
if (showcase) say(`Vitrine : ${showcase.images_recues} images reçues, ${showcase.images_affichees} affichées, ${showcase.images_par_seconde} par seconde ; délai de l'image dessinée à l'image affichée : médiane ${showcase.delai_total_ms.mediane} ms, p95 ${showcase.delai_total_ms.p95} ms.`);
await vitrine?.stop({ fermer: flag("fermer-chrome") });
writeFileSync(join(OUT, "scene.json"), `${JSON.stringify({ id: ID, passage_id: report?.passage_id ?? null, adresse: URL_SITE, mode: SANS_AGENT ? "sans agent" : "agent H", holo: !flag("sans-holo"), traits: Object.fromEntries(drawnOn), decisions, pr: PR, commentaire, vitrine: showcase, erreurs: errors }, null, 2)}\n`);
for (const line of errors) say(`Erreur : ${line}`);
runtime.close();
page.close();
if (flag("fermer-chrome")) await closeChrome({ port: PORT, pid: chrome.pid });
else say(`Chrome laissé ouvert (port ${PORT}).`);
process.exit(errors.length || report?.etat !== "fini" ? 1 : 0);
