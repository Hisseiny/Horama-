// T7 probe (docs/decisions/2026-11-16-scene-en-direct.md): the H agent plays a course on Facturo in a visible local
// Chrome, a cursor in the page follows its clicks, our own captures are taken by CDP at each screen, and a report of
// measures is written. Throwaway feasibility probe, not a product.
// From Nami (tag demo-oral-2026-11-08): the course driven by a script that follows the session and answers its tools
// (scripts/passage-evoa.mjs), the wording of the task (lib/agent-task.ts: one tab, never refresh, look with wait_web).
// The pixel comparison follows faux-saas/scripts/browser.mjs.
//
// Usage: node [--env-file=<.env.local>] automatisation/scene/sonde-t7.mjs [--sans-agent] [--passes 3] [--port 9333]
//          [--profil <dir>] [--sortie <dir>] [--rapport <file.md>] [--garder-chrome]
// Env: HAI_API_KEY, FAUX_SAAS_URL, CHROME_BIN, HOLO_BIN, HAI_AGENT_MODEL, HAI_AGENT_REASONING.
// Exit: 0 criterion held (with --sans-agent: the rig works), 1 not held, 2 something is missing, 130 Ctrl+C.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { COURSE_RULES, END_TOOL, MUTE_MS, REST_MS, SETTINGS, agentPass, findHolo, stopAgent, stopIfMissing } from "./agent-h.mjs";
import { CHROME_FLAGS, HEIGHT, WIDTH, capture, clickCentre, closeChrome, connectTab, evaluate, fitViewport, flag, installLayer, navigate, openChrome, option, say, sleep, waitFor } from "./scene.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SANS_AGENT = flag("sans-agent");
const PASSES = Number(option("passes", 3));
const PORT = Number(option("port", 9333));
const PROFILE = resolve(option("profil", "/Users/nathan/Code/projet/horama/.orchestrateur/chrome-agent"));
const OUT = resolve(option("sortie", join(ROOT, "docs/captures/2026-11-16-t7")));
const REPORT = resolve(option("rapport", join(ROOT, "docs/tests/2026-11-16-t7-navigateur-local.md")));
const REFERENCES = join(ROOT, "docs/captures/2026-11-16-n2-faux-saas");
const CHROME_BIN = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = (process.env.FAUX_SAAS_URL || "https://facturo-demo.vercel.app").replace(/\/$/, "");
const START = `${BASE}/v13/entrer?suite=/v13/tableau-de-bord`;
const BRIDGE_LOG = join(OUT, "pont-holo.log");
const TARGET_S = 120;

// The clicks of the course: how --sans-agent finds each one, what the page shows once it is done, and how to
// recognise it in what the cursor layer reports.
const CLICKS = {
  factures: {
    nom: "lien « Factures »",
    selector: '.sidebar a[href="/v13/factures"]',
    then: 'location.pathname === "/v13/factures" && !location.search',
    seen: (c) => c.balise === "a" && c.href === "/v13/factures" && c.texte === "Factures",
  },
  filtrer: {
    nom: "menu « Filtrer »",
    selector: ".filter summary",
    then: 'document.querySelector(".filter")?.open === true',
    seen: (c) => c.balise === "summary" && c.texte.startsWith("Filtrer"),
  },
  echeance: {
    nom: "option « Échéance dépassée »",
    selector: '.filter-menu a[href="/v13/factures?filtre=echeance-depassee"]',
    then: 'location.search === "?filtre=echeance-depassee"',
    seen: (c) => c.balise === "a" && c.href === "/v13/factures?filtre=echeance-depassee",
  },
  toutes: {
    nom: "option « Toutes »",
    selector: '.filter-menu a[href="/v13/factures"]',
    then: 'location.pathname === "/v13/factures" && !location.search',
    seen: (c) => c.balise === "a" && c.href === "/v13/factures" && c.texte === "Toutes",
  },
  f119: {
    nom: "lien « F-119 »",
    selector: 'td a[href="/v13/factures/F-119"]',
    then: 'location.pathname === "/v13/factures/F-119"',
    seen: (c) => c.balise === "a" && c.href === "/v13/factures/F-119",
  },
};

// The screens to capture, in order, with their address (docs/decisions/2026-11-16-url-faux-saas.md).
const STEPS = [
  { ecran: "tableau-de-bord", vue: "defaut", path: "/v13/tableau-de-bord", filtre: null, clicks: [], consigne: "le tableau de bord est affiché" },
  { ecran: "liste-des-factures", vue: "defaut", path: "/v13/factures", filtre: null, clicks: ["factures"], consigne: "clique « Factures » dans le menu de gauche" },
  { ecran: "liste-des-factures", vue: "filtre-echeance", path: "/v13/factures", filtre: "echeance-depassee", clicks: ["filtrer", "echeance"], consigne: "ouvre le menu « Filtrer » et choisis « Échéance dépassée »" },
  { ecran: "detail-facture", vue: "defaut", path: "/v13/factures/F-119", filtre: null, clicks: ["filtrer", "toutes", "f119"], consigne: "rouvre le menu « Filtrer », choisis « Toutes », puis clique sur le numéro « F-119 » dans le tableau" },
];
const keyOf = (step) => `${step.ecran}--${step.vue}`;
const call = (step) => `relever(ecran="${step.ecran}", vue="${step.vue}")`;

const INSTRUCTIONS = [
  "Tu joues un parcours de test sur le logiciel de facturation Facturo, dans le seul onglet ouvert du navigateur.",
  ...COURSE_RULES,
].join("\n");
const TASK = [
  `Ouvre ${START} dans l'onglet courant avec go_to, sans chercher ni changer d'onglet. Puis, dans l'ordre :`,
  ...STEPS.map((step, index) => `${"abcd"[index]}) ${step.consigne} : appelle ${call(step)} ;`),
  'e) appelle terminer(etat="reussi"). Si une étape reste impossible après 2 essais, appelle terminer(etat="echec", raison=...).',
].join("\n");
const TOOLS = [
  {
    name: "relever",
    description: "Enregistre l'écran affiché (capture et texte), une fois la page chargée. À appeler à chaque écran demandé. Le résultat dit quoi faire ensuite.",
    input_schema: {
      type: "object",
      properties: { ecran: { type: "string", enum: [...new Set(STEPS.map((step) => step.ecran))] }, vue: { type: "string", enum: [...new Set(STEPS.map((step) => step.vue))] } },
      required: ["ecran", "vue"],
    },
  },
  END_TOOL,
];

// ---------- What is missing, said before anything is started ----------
const holo = SANS_AGENT ? null : findHolo();
stopIfMissing({ port: PORT, chromeBin: CHROME_BIN, sansAgent: SANS_AGENT, holo }, Number.isInteger(PASSES) && PASSES >= 1 ? [] : ["--passes doit être un entier d'au moins 1."]);

// ---------- Scene ----------
mkdirSync(OUT, { recursive: true });
mkdirSync(dirname(REPORT), { recursive: true });
const chrome = await openChrome({ bin: CHROME_BIN, port: PORT, profile: PROFILE });
say(chrome.started ? `Chrome dédié lancé (${chrome.version}, port ${PORT}, profil ${PROFILE}).` : `Un Chrome écoute déjà sur le port ${PORT} (${chrome.version}) : réutilisé.`);
let page = null;
const stop = async () => {
  await stopAgent();
  page?.close();
  if (flag("garder-chrome")) say(`Chrome laissé ouvert (port ${PORT}).`);
  else {
    await closeChrome({ port: PORT, pid: chrome.pid });
    say("Chrome fermé.");
  }
};
process.on("SIGINT", () => {
  say("Interrompu : arrêt du pont et du Chrome.");
  stop().finally(() => process.exit(130));
});

const errors = [];
const passes = [];
let current = null;
let area = null;

async function relever(pass, ecran, vue) {
  const index = STEPS.findIndex((step) => step.ecran === ecran && step.vue === vue);
  if (index === -1) return `Relevé inconnu. Les relevés attendus sont, dans l'ordre : ${STEPS.map(call).join(", ")}.`;
  const step = STEPS[index];
  const next = STEPS[index + 1];
  const then = next
    ? `Continue sans recharger la page. Étape suivante : ${next.consigne}, puis appelle ${call(next)}.`
    : 'Tous les relevés sont pris : appelle terminer(etat="reussi").';
  if (pass.captures[keyOf(step)]) return `Déjà relevé, rien de nouveau. ${then}`;
  const expected = `document.readyState === "complete" && location.pathname === ${JSON.stringify(step.path)} && new URLSearchParams(location.search).get("filtre") === ${JSON.stringify(step.filtre)}`;
  if (!(await waitFor(page, expected, 5000))) {
    const url = await evaluate(page, "location.href").catch(() => "inconnue");
    pass.refus.push(`${keyOf(step)} refusé, adresse de la page : ${url}`);
    return `Relevé refusé : la page affichée (${url}) n'est pas cet écran. Pour y arriver : ${step.consigne}. Regarde la page avec wait_web (1 seconde), fais-le, puis appelle de nouveau ${call(step)}.`;
  }
  const shot = await capture(page);
  const file = join(OUT, `passe-${pass.n}`, keyOf(step));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.png`, shot.png);
  writeFileSync(`${file}.txt`, shot.texte_page);
  pass.captures[keyOf(step)] = { largeur: shot.largeur, hauteur: shot.hauteur, url_page: shot.url_page, prise_le: shot.prise_le };
  return `Relevé pris. ${then}`;
}

// The clicks of the course done by the script through CDP, as the agent would: proof of the rig without H.
async function scriptedPass(pass) {
  const started = Date.now();
  await navigate(page, START);
  for (const step of STEPS) {
    for (const id of step.clicks) {
      await sleep(500);
      await clickCentre(page, CLICKS[id].selector);
      if (!(await waitFor(page, `document.readyState === "complete" && ${CLICKS[id].then}`, 10_000))) throw new Error(`le clic sur ${CLICKS[id].nom} n'a pas eu l'effet attendu`);
    }
    const answer = await relever(pass, step.ecran, step.vue);
    if (!answer.startsWith("Relevé pris")) throw new Error(answer);
  }
  pass.dureeS = (Date.now() - started) / 1000;
}

try {
  page = await connectTab(PORT);
  await installLayer(page, (press) => current?.clics.push(press), { passage: new Date().toISOString() });
  area = await fitViewport(page);
  say(`Zone de page mesurée : ${area.largeur} × ${area.hauteur}, densité de pixels ${area.densite}.`);
  if (area.largeur !== WIDTH || area.hauteur !== HEIGHT || area.densite !== 1) {
    throw new Error(`zone de page ${area.largeur} × ${area.hauteur} à la densité ${area.densite} au lieu de ${WIDTH} × ${HEIGHT} à la densité 1 (écran trop petit, zoom de page, ou Chrome lancé sans --force-device-scale-factor=1) : aucune passe jouée`);
  }
  for (let n = 1; n <= PASSES; n++) {
    current = { n, captures: {}, clics: [], refus: [], sessions: [], relances: 0, dureeS: null, etapes: null, etapesH: null, dureesEtapes: [], coutUsd: null, etat: null };
    passes.push(current);
    say(`Passe ${n} sur ${PASSES}.`);
    try {
      await (SANS_AGENT
        ? scriptedPass(current)
        : agentPass(current, { page, holo, port: PORT, logFile: BRIDGE_LOG, task: TASK, instructions: INSTRUCTIONS, tools: TOOLS, relever: (ecran, vue) => relever(current, ecran, vue), say }));
      current.etat ??= "jouée par le script";
    } catch (error) {
      current.etat = "échec";
      errors.push(`Passe ${n} : ${error.message}`);
      say(`Passe ${n} en échec : ${error.message}`);
    }
    errors.push(...current.refus.map((line) => `Passe ${n} : relevé ${line}`));
    say(`Passe ${n} : ${Object.keys(current.captures).length} capture(s) sur ${STEPS.length}, ${current.clics.length} clic(s) vus par la couche, durée ${current.dureeS === null ? "à mesurer" : `${num(current.dureeS)} s`}.`);
  }
} catch (error) {
  errors.push(error.message);
  say(`Échec : ${error.message}`);
}
await stop();

// ---------- Comparisons and report ----------
function num(value, digits = 1) {
  return value === null || value === undefined ? "à mesurer" : value.toFixed(digits).replace(".", ",");
}

function compare(fileA, fileB) {
  if (!existsSync(fileA) || !existsSync(fileB)) return null;
  const a = PNG.sync.read(readFileSync(fileA));
  const b = PNG.sync.read(readFileSync(fileB));
  if (a.width !== b.width || a.height !== b.height) return { sizes: `${a.width} × ${a.height} contre ${b.width} × ${b.height}` };
  let pixels = 0;
  for (let i = 0; i < a.data.length; i += 4) if (a.data.readUInt32LE(i) !== b.data.readUInt32LE(i)) pixels++;
  return { pixels, sizes: `${a.width} × ${a.height}` };
}
const shot = (n, step) => join(OUT, `passe-${n}`, `${keyOf(step)}.png`);
const told = (result, same = "") => (!result ? "à mesurer (capture absente)" : result.pixels === undefined ? `dimensions différentes (${result.sizes})` : `${same}${result.pixels} pixel(s) différent(s)`);
const againstFirst = passes.slice(1).map((pass) => STEPS.map((step) => compare(shot(pass.n, step), shot(1, step))));
const againstReference = STEPS.map((step) => compare(shot(1, step), join(REFERENCES, `${keyOf(step)}--v13.png`)));

const total = passes.length;
const complete = passes.filter((pass) => STEPS.every((step) => pass.captures[keyOf(step)])).length;
const clicked = passes.filter((pass) => Object.values(CLICKS).every((click) => pass.clics.some(click.seen))).length;
const identical = againstFirst.filter((results) => results.every((result) => result?.pixels === 0)).length;
const timed = passes.filter((pass) => pass.dureeS !== null);
const areaOk = area?.largeur === WIDTH && area?.hauteur === HEIGHT && area?.densite === 1;
const points = [
  ["L'agent atteint les écrans demandés", total === PASSES && complete === total, `${complete} passe(s) sur ${PASSES} avec les ${STEPS.length} écrans relevés, adresse vérifiée`],
  ["Le curseur tombe sur l'élément cliqué", total === PASSES && clicked === total, `${clicked} passe(s) sur ${PASSES} où la couche a signalé les ${Object.keys(CLICKS).length} clics attendus avec le bon élément dessous`],
  ["Deux passages donnent des captures identiques au pixel près", identical >= 1, `${identical} passe(s) sur ${Math.max(PASSES - 1, 0)} identique(s) à la passe 1 sur les ${STEPS.length} captures`],
  [`La durée du parcours complet est mesurée (cible : sous ${TARGET_S} s)`, timed.length === PASSES && timed.every((pass) => pass.dureeS < TARGET_S), `durées : ${passes.map((pass) => `${num(pass.dureeS)}${pass.dureeS === null ? "" : " s"}`).join(" ; ") || "à mesurer"}`],
];
const held = areaOk && points.every(([, ok]) => ok);
const rigOk = areaOk && total === PASSES && complete === total && clicked === total && identical === PASSES - 1;
const verdict = (ok) => (SANS_AGENT ? `à mesurer avec l'agent (montage seul : ${ok ? "oui" : "non"})` : ok ? "tenu" : "non tenu");
const cell = (value) => String(value ?? "").replaceAll("|", "/");

const lines = [
  "# T7 : preuve du navigateur local",
  "",
  "Rapport écrit par `automatisation/scene/sonde-t7.mjs`. Aucun chiffre n'est saisi à la main ; une valeur absente s'écrit « à mesurer ».",
  "",
  `- Date : ${new Date().toLocaleString("fr-FR")} (${new Date().toISOString()})`,
  `- Commande : \`${["node", ...process.execArgv, relative(process.cwd(), process.argv[1]), ...process.argv.slice(2)].join(" ")}\``,
  `- Mode : ${SANS_AGENT ? "sans agent (les clics du parcours sont faits par le script, par CDP ; H n'est pas appelé)" : "avec l'agent H (API REST, navigateur local servi par `holo local browser`)"}`,
  `- Logiciel testé : ${BASE}, version 13, départ \`/v13/entrer?suite=/v13/tableau-de-bord\``,
  `- Chrome : ${chrome.version}, ${chrome.started ? `lancé par le script avec \`${CHROME_FLAGS.join(" ")}\`` : "déjà ouvert et réutilisé (options de lancement inconnues)"}, port ${PORT}, profil \`${PROFILE}\``,
  `- Zone de page mesurée : ${area ? `${area.largeur} × ${area.hauteur}` : "à mesurer"} (demandé : ${WIDTH} × ${HEIGHT}) ; densité de pixels mesurée : ${area?.densite ?? "à mesurer"} (demandé : 1)`,
  ...(SANS_AGENT ? [] : [
    `- Session H : modèle ${SETTINGS.model}, effort de raisonnement ${SETTINGS.reasoning_effort}, settle_s ${num(SETTINGS.settle_s)}, max_time_s ${SETTINGS.max_time_s}, max_steps ${SETTINGS.max_steps}, queue false`,
    `- Une session à la fois, ${REST_MS / 1000} s de pause entre deux sessions, abandon sans action ${MUTE_MS / 1000} s après le départ puis une relance`,
    `- Journal du pont : \`${relative(process.cwd(), BRIDGE_LOG)}\``,
  ]),
  `- Captures : \`${relative(process.cwd(), OUT)}/passe-<n>/<ecran>--<vue>.png\` et \`.txt\``,
  `- Passes demandées : ${PASSES} ; passes lancées : ${total}`,
  "",
  "## Passes",
  "",
  SANS_AGENT ? "Mode sans agent : la durée est celle des clics du script, pas celle de l'agent. Étapes et coût de l'agent : à mesurer." : "Durée : de la création de la session H à l'appel de `terminer`. Étapes : actions de l'agent vues dans les événements, et compteur de H entre parenthèses.",
  "",
  "| Passe | Écrans relevés | Taille des captures | Durée du parcours (s) | Étapes | Durée par étape (s) | Coût (USD) | Relances | État |",
  "|---|---|---|---|---|---|---|---|---|",
  ...passes.map((pass) => `| ${[
    pass.n,
    `${Object.keys(pass.captures).length} sur ${STEPS.length}`,
    [...new Set(Object.values(pass.captures).map((shot) => `${shot.largeur} × ${shot.hauteur}`))].join(", ") || "à mesurer",
    num(pass.dureeS),
    pass.etapes === null ? "à mesurer" : `${pass.etapes} (H : ${pass.etapesH ?? "à mesurer"})`,
    pass.dureesEtapes.length ? `moyenne ${num(pass.dureesEtapes.reduce((sum, value) => sum + value, 0) / pass.dureesEtapes.length)} ; détail ${pass.dureesEtapes.map((value) => num(value)).join(" ; ")}` : "à mesurer",
    num(pass.coutUsd, 4),
    SANS_AGENT ? "sans objet" : pass.relances,
    cell(pass.etat),
  ].join(" | ")} |`),
  "",
  ...(SANS_AGENT ? [] : [`Sessions H : ${passes.map((pass) => `passe ${pass.n} : ${pass.sessions.join(", ") || "aucune"}`).join(" ; ")}.`, ""]),
  "## Clics vus par la couche du curseur",
  "",
  "Chaque ligne est un appui de souris signalé par la couche posée dans la page : le point, et ce qu'il y a dessous (`elementFromPoint`).",
  "",
  ...passes.flatMap((pass) => [
    `### Passe ${pass.n}`,
    "",
    "| Heure | x | y | Balise | Texte | data-zone | href |",
    "|---|---|---|---|---|---|---|",
    ...pass.clics.map((c) => `| ${[new Date(c.heure).toISOString().slice(11, 23), c.x, c.y, c.balise, cell(c.texte), c.zone ?? "", c.href ?? ""].join(" | ")} |`),
    ...(pass.clics.length ? [] : ["| aucun clic vu | | | | | | |"]),
    "",
  ]),
  "### Clics attendus",
  "",
  `| Clic attendu | ${passes.map((pass) => `Passe ${pass.n}`).join(" | ")} |`,
  `|---|${passes.map(() => "---").join("|")}|`,
  ...Object.values(CLICKS).map((click) => `| ${click.nom} | ${passes.map((pass) => (pass.clics.some(click.seen) ? "vu" : "non vu")).join(" | ")} |`),
  "",
  "## Comparaisons des captures",
  "",
  "Pixel par pixel (pngjs). La référence est la capture prise par Playwright sans tête (`docs/captures/2026-11-16-n2-faux-saas/`, version 13) : c'est une mesure, pas un critère.",
  "",
  `| Capture | ${passes.slice(1).map((pass) => `Passe ${pass.n} contre passe 1`).join(" | ")}${passes.length > 1 ? " | " : ""}Passe 1 contre la référence |`,
  `|---|${passes.slice(1).map(() => "---|").join("")}---|`,
  ...STEPS.map((step, index) => `| ${[keyOf(step), ...againstFirst.map((results) => told(results[index])), told(againstReference[index], againstReference[index]?.pixels === undefined ? "" : `mêmes dimensions (${againstReference[index].sizes}), `)].join(" | ")} |`),
  "",
  "## Critère de la décision, point par point",
  "",
  "Critère : `docs/decisions/2026-11-16-scene-en-direct.md`, « tenu si, sur 3 passages de suite ».",
  "",
  "| Point | Résultat | Détail |",
  "|---|---|---|",
  `| Zone de page ${WIDTH} × ${HEIGHT}, densité 1 (condition du montage) | ${areaOk ? "oui" : "non"} | mesuré : ${area ? `${area.largeur} × ${area.hauteur}, densité ${area.densite}` : "à mesurer"} |`,
  ...points.map(([label, ok, detail]) => `| ${label} | ${verdict(ok)} | ${detail} |`),
  "",
  SANS_AGENT
    ? `**Critère de la décision : à mesurer** (ce rapport vient du mode sans agent). Montage : ${rigOk ? "il marche" : "il ne marche pas"} sur ${PASSES} passe(s).`
    : `**Critère de la décision : ${held ? "tenu" : "non tenu"}** sur ${PASSES} passe(s)${PASSES === 3 ? "" : " (le critère en demande 3)"}.`,
  "",
  "## Ce qui a échoué",
  "",
  ...(errors.length ? errors.map((line) => `- ${line}`) : ["Rien."]),
  "",
];
writeFileSync(REPORT, lines.join("\n"));
say(`Rapport écrit : ${REPORT}`);
say(SANS_AGENT ? `Montage sans agent : ${rigOk ? "il marche" : "il ne marche pas"}.` : `Critère de la décision : ${held ? "tenu" : "non tenu"}.`);
process.exit((SANS_AGENT ? rigOk : held) ? 0 : 1);
