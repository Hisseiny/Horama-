// The live scene (docs/decisions/2026-11-16-scene-en-direct.md): the accepted tests of the vault become one course on
// the tested software, in a visible local Chrome. The H agent clicks; the Horama mascot lands where it clicks, says
// what it checks, highlights what it finds and never makes the agent wait. At each relever: our capture (layer
// hidden), the check (jugement/verification when it exists), then the reactions of the mascot, played in a queue.
// Starts from the T7 probe (sonde-t7.mjs): same Chrome, same bridge, same session, same rules given to the agent.
//
// Usage: node [--env-file=<.env.local>] automatisation/scene/parcours.mjs [--sans-agent] [--rythme <s>]
//          [--vault <dir>] [--logiciel facturo] [--version 13] [--reference 12] [--tests a,b,c] [--r <ids>]
//          [--verification <file>] [--ecrire-references] [--temoins <dir>] [--sortie <dir>] [--port 9333]
//          [--profil <dir>] [--fermer-chrome]
// Env: HAI_API_KEY, FAUX_SAAS_URL, CHROME_BIN, HOLO_BIN, HAI_AGENT_MODEL, HAI_AGENT_REASONING.
// Exit: 0 every relevé taken and nothing failed, 1 otherwise, 2 something is missing, 130 Ctrl+C.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ecrireReference, lireDecisions, lireNotes, lireReferences, lireTestsAcceptes } from "../../memoire/index.ts";
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

let verifierReleve = null;
if (existsSync(CHECK_FILE)) {
  try {
    ({ verifierReleve } = await import(pathToFileURL(CHECK_FILE)));
    if (typeof verifierReleve !== "function") throw new Error("le fichier n'exporte pas verifierReleve");
  } catch (error) {
    missing.push(`La vérification ne se charge pas (${CHECK_FILE}) : ${error.message.split("\n")[0]}`);
  }
} else if (flag("verification")) missing.push(`Fichier de vérification introuvable : ${CHECK_FILE}`);
if (flag("rythme") && !(RYTHME > 0)) missing.push("--rythme doit être un nombre de secondes positif.");
if (flag("temoins") && !option("temoins")) missing.push("--temoins demande un dossier.");
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

// ---------- What the mascot says: sentences of the notes, of the tests and of the findings ----------
const noteTitles = Object.fromEntries(notes.map((note) => [note.chemin.split("/").pop().replace(/\.md$/, ""), note.titre]));
const plain = (phrase) => phrase.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
  const name = noteTitles[target];
  return alias ?? (name ? name[0].toLowerCase() + name.slice(1) : target.replaceAll("-", " "));
});
// The sentence of the rule in its note; failing that, the line of the Verification section of its test.
function docSays(regle) {
  const phrase = notes.flatMap((note) => note.regles).find((rule) => rule.regle && same(rule.regle, regle))?.phrase;
  if (phrase) return `La doc dit : ${plain(phrase)}`;
  for (const test of tests) {
    const line = section(test, "Verification").split("\n").filter((text) => text.startsWith("- "))[test.regles.findIndex((rule) => same(rule, regle))];
    if (line) return `Le test dit : ${line.slice(2).replace(/^FAIL if /, "échec si ")}`;
  }
  return null;
}
const screenName = (step) => notes.find((note) => note.entete.ecran === step.ecran)?.titre ?? step.ecran;
const count = (number, one, many) => `${number} ${number > 1 ? many : one}`;

// ---------- Scene ----------
mkdirSync(join(OUT, "releves"), { recursive: true });
if (WITNESSES) mkdirSync(WITNESSES, { recursive: true });
writeFileSync(join(OUT, "consigne.md"), `# Consigne du passage ${ID}\n\n## Instructions\n\n${INSTRUCTIONS}\n\n## Tâche\n\n${TASK}\n`);
for (const { id, raison } of dropped) say(`Test écarté : ${id} (${raison}).`);
say(`Passage ${ID} : ${count(tests.length, "test", "tests")} (${tests.map((test) => test.id).join(", ")}), ${count(course.length, "relevé", "relevés")}, version ${VERSION}. ${verifierReleve ? `Vérification : ${relative(process.cwd(), CHECK_FILE)}.` : "Vérification non branchée : la mascotte annonce les règles, sans verdict."}`);
const chrome = await openChrome({ bin: CHROME_BIN, port: PORT, profile: PROFILE });
say(chrome.started ? `Chrome dédié lancé (${chrome.version}, port ${PORT}, profil ${PROFILE}).` : `Un Chrome écoute déjà sur le port ${PORT} (${chrome.version}) : réutilisé.`);
let page = null;
const stop = async () => {
  await stopAgent();
  page?.close();
  if (!flag("fermer-chrome")) return say(`Chrome laissé ouvert (port ${PORT}) : la mascotte et les zones restent à l'écran. Pour le fermer à la fin : --fermer-chrome.`);
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
const constats = [];
const clics = [];
const refus = [];
const totals = { conformes: 0, defauts: 0, doutes: 0, inconclus: 0 };
const decisions = lireDecisions(VAULT, LOGICIEL);
const references = WRITE_REFERENCES ? [] : lireReferences(VAULT, LOGICIEL).filter((reference) => reference.version === REFERENCE);
const coral = {}; // per page address, the rectangles highlighted as proven defects
const announced = new Set();
let capturing = false;

// Captures with the layer visible, for the eye: one at each reaction of the mascot and three after each press.
let witnesses = 0;
async function witness(label) {
  if (!WITNESSES || capturing) return;
  try {
    const etat = await evaluate(page, "window.__horama.etatAffiche()");
    const { data } = await page.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(WITNESSES, `${String(++witnesses).padStart(2, "0")}-${etat}-${label}.png`), Buffer.from(data, "base64"));
  } catch {
    // The page is being replaced: this one is skipped.
  }
}
function onPress(press) {
  clics.push(press);
  if (WITNESSES) for (const ms of [200, 560, 1300]) setTimeout(() => witness("geste"), ms);
}

// The reactions of the mascot are played one after the other, beside the course: the agent never waits for them.
let queue = Promise.resolve();
const react = (play) => {
  queue = queue.then(play).catch((error) => errors.push(`Mascotte : ${error.message}`));
};
const mascot = (command, ...args) => layer(page, command, ...args);
async function speak(sentence, genre, label, step) {
  // The agent may already be on another screen: the sentence then starts with the name of the screen it is about.
  const elsewhere = step && !(await evaluate(page, step.here).catch(() => true));
  const text = elsewhere ? `${screenName(step)} : ${sentence[0].toLowerCase()}${sentence.slice(1)}` : sentence;
  const ms = Math.max(2500, text.length * 35);
  await mascot("bulle", text, genre, ms);
  await sleep(350);
  await witness(label);
  await sleep(ms - 350);
}
const counter = () => mascot("compteur", totals.conformes, totals.defauts, totals.doutes);
const overlaps = (a, b) => a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur && b.y < a.y + a.hauteur;

async function playRule(constat, doc, step) {
  if (doc) {
    await mascot("etat", "verification");
    await speak(doc, "", "doc");
  }
  if (constat.statut === "PASS") {
    totals.conformes++;
    await counter();
    await mascot("etat", "conforme");
    await sleep(350);
    await witness("conforme");
    await sleep(650);
  } else if (constat.statut === "VERIFIED_FAIL") {
    totals.defauts++;
    await counter();
    await mascot("etat", "defaut");
    await speak(constat.calcul ?? constat.description, "defaut", "defaut", step);
  } else await playInconclusive(constat, step);
}
async function playInconclusive(constat, step) {
  totals.inconclus++;
  await mascot("etat", "repos");
  await speak(`Je ne peux pas conclure : ${constat.raison ?? constat.description}`, "", "sans-conclusion", step);
}
async function playDoubt(around, step) {
  totals.doutes++;
  await counter();
  await mascot("etat", "interrogation");
  await speak(around ? `Ça a changé ici, autour de « ${around} ». Bug ou voulu ?` : "Ça a changé ici. Bug ou voulu ?", "doute", "doute", step);
}
async function playDecided(constat, step) {
  await mascot("etat", "conforme");
  await speak(`Déjà validé : ${constat.decision_id}`, "conforme", "deja-valide", step);
}

// What is found on the screen just taken, and the reactions it gives. The zones are highlighted at once, while the
// page is still this screen (the agent leaves it within seconds); what the mascot says about them is played later.
async function check(step, releve) {
  const address = await evaluate(page, "location.pathname + location.search");
  let found = [];
  if (verifierReleve) {
    const reference = references.find((candidate) => candidate.ecran === step.ecran && candidate.vue === step.vue);
    try {
      found = await verifierReleve({
        releve,
        releves: [...taken.values()],
        regles: tests.flatMap((test) => test.regles),
        ...(reference ? { reference: new Uint8Array(readFileSync(join(VAULT, reference.chemin))), version_reference: REFERENCE } : {}),
        decisions,
      });
    } catch (error) {
      errors.push(`Vérification de ${step.key} : ${error.message}`);
      found = [{ genre: "regle", statut: "INCONCLUSIVE", valeurs: {}, description: "", textes_a_surligner: [], raison: `la vérification a échoué (${error.message})` }];
    }
  }
  const plays = [];
  // Rules first: a visual finding at the place of a proven defect of this screen is not shown a second time.
  for (const constat of [...found].sort((a, b) => (a.genre === "regle" ? 0 : 1) - (b.genre === "regle" ? 0 : 1))) {
    const entry = { releve: step.key, ...constat };
    constats.push(entry);
    if (constat.genre === "regle") {
      const doc = constat.regle ? docSays(constat.regle) : null;
      if (constat.statut === "VERIFIED_FAIL") {
        for (const text of constat.textes_a_surligner) (coral[address] ??= []).push(...(await mascot("surlignerTexte", text, "defaut")));
      }
      plays.push(() => playRule(constat, doc, step));
    } else if (constat.statut === "SUSPECTED" && constat.zone) {
      if ((coral[address] ?? []).some((rect) => overlaps(rect, constat.zone))) entry.remarque = "même endroit qu'un défaut prouvé";
      else {
        const around = await mascot("autour", constat.zone);
        entry.zone_numero = await mascot("surligner", constat.zone, "doute");
        plays.push(() => playDoubt(around, step));
      }
    } else if (constat.statut === "PASS" && constat.decision_id) plays.push(() => playDecided(constat, step));
    else if (constat.statut === "INCONCLUSIVE") plays.push(() => playInconclusive(constat, step));
  }
  if (!verifierReleve) {
    // No check yet: the mascot still says what the doc says, for the rules of the tests this relevé completes.
    const complete = tests.filter((test) => test.releves.some((releve) => keyOf(releve) === step.key) && test.releves.every((releve) => taken.has(keyOf(releve))));
    for (const regle of complete.flatMap((test) => test.regles)) {
      const doc = docSays(regle);
      if (!doc || announced.has(doc)) continue;
      announced.add(doc);
      plays.push(() => speak(doc, "", "doc"));
    }
  }
  react(async () => {
    await mascot("etat", "verification");
    if (!plays.length) await sleep(1200);
    for (const play of plays) await play();
    await mascot("etat", "repos");
  });
}

// Answers the tool relever(ecran, vue): the sentence returned is what the agent reads.
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
  await check(step, releve);
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
    await clickAt(page, await evaluate(page, point));
    await sleep(300);
    await waitFor(page, `document.readyState === "complete"`, 10_000);
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
  await installLayer(page, onPress, { passage: ID, titre: `Horama vérifie la version ${VERSION}` });
  const area = await fitViewport(page);
  if (area.largeur !== WIDTH || area.hauteur !== HEIGHT || area.densite !== 1) {
    throw new Error(`zone de page ${area.largeur} × ${area.hauteur} à la densité ${area.densite} au lieu de ${WIDTH} × ${HEIGHT} à la densité 1 (écran trop petit, zoom de page, ou Chrome lancé sans --force-device-scale-factor=1) : parcours non joué`);
  }
  if (SANS_AGENT) await scriptedCourse();
  else {
    await agentPass(pass, {
      page, holo, port: PORT, logFile: join(OUT, "pont-holo.log"), task: TASK, instructions: INSTRUCTIONS, tools: TOOLS, relever, say,
      agent: { name: "horama-scene", description: `Horama, la scène : joue les tests acceptés de ${LOGICIEL} dans un Chrome local.` },
    });
  }
} catch (error) {
  pass.etat ??= "échec";
  errors.push(error.message);
  say(`Échec : ${error.message}`);
}
errors.push(...refus.map((line) => `Relevé ${line}`));

// ---------- End of the course: the summary stays on the screen, the file of the passage is written ----------
await queue;
const complete = course.every((step) => taken.has(step.key));
const summary = [
  complete ? "" : `Parcours incomplet : ${count(taken.size, "relevé pris", "relevés pris")} sur ${course.length}. `,
  verifierReleve
    ? `J'ai vérifié ${count(totals.conformes + totals.defauts, "règle", "règles")} : ${count(totals.conformes, "conforme", "conformes")}, ${count(totals.defauts, "défaut prouvé", "défauts prouvés")}, ${count(totals.doutes, "doute", "doutes")} à trancher${totals.inconclus ? `, ${totals.inconclus} sans conclusion` : ""}.`
    : `Parcours terminé : ${count(taken.size, "relevé pris", "relevés pris")}, vérification non branchée.`,
].join("");
if (page) {
  try {
    await mascot("bulle", summary, "");
    await sleep(350);
    await witness("bilan");
  } catch (error) {
    errors.push(`Mascotte : ${error.message}`);
  }
}
writeFileSync(join(OUT, "passage.json"), `${JSON.stringify({
  id: ID,
  logiciel: LOGICIEL,
  version: VERSION,
  reference: REFERENCE,
  mode: SANS_AGENT ? "sans agent (clics du script par CDP)" : "agent H",
  depart: START,
  verification: verifierReleve ? CHECK_FILE : null,
  tests: tests.map((test) => test.id),
  tests_ecartes: dropped,
  releves: course.map((step) => ({ ecran: step.ecran, vue: step.vue, pris: taken.has(step.key), url: taken.get(step.key)?.url ?? null, capture: `releves/${step.key}.png`, texte: `releves/${step.key}.txt` })),
  constats,
  bilan: summary,
  compteur: totals,
  clics,
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
say(summary);
say(`Passage écrit : ${join(OUT, "passage.json")} (${taken.size} relevé(s) sur ${course.length}, ${clics.length} clic(s) vus, durée ${pass.dureeS === null ? "à mesurer" : `${pass.dureeS.toFixed(1).replace(".", ",")} s`}).`);
for (const line of errors) say(`Erreur : ${line}`);
await stop();
process.exit(complete && !errors.length ? 0 : 1);
