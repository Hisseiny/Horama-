// A fake Horama service, for the extension while the real one (issue #68, step 2, Ali) is not there: same contract,
// no H, no Holo, no dependency. It replays a real recorded exploration (horama-exploration-1 and its captures) page by
// page, whatever address is posted: the address it replays is the recorded one, said in the terminal.
//
// Usage: node extension/faux-service/serveur.mjs [--port 8787] [--dossier <sortie d'une exploration>] [--rythme 2]
//          [--file 1] [--plafond 20] [--refuser 429|503] [--direct <dossier d'images> | --sans-direct]
//   --direct: the images of the direct (issue #164), <ordre>-<n>.jpg, made by enregistrer-direct.mjs; by default
//   direct-enregistre/ beside this file when it exists. Without images (or --sans-direct): no direct, /direct answers 404.
//   --rythme: seconds per page; --file: places in the queue before the start (one --rythme each); --plafond: demands
//   per hour and per address IP, then 429; --refuser: every POST answers that code (to try the window of the extension).
// Contract (points 1 to 6 of #68, to confirm by the real service): CORS « * » on every route, OPTIONS included;
// POST /explorations { url } → 202 { id, place }, 400 / 429 / 503 { erreur }; GET /explorations/:id → { id, etat:
// "en_file", place } then horama-exploration-1, 404 { erreur }; GET /explorations/:id/<capture> → the image.
// Direct (#164): GET /explorations/:id/direct → 200 image/jpeg, the last image of the page in visit (404 before the
// first, 410 once the exploration is over); `direct: true` in GET /explorations/:id while images come.
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const option = (name, fallback) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
const PORT = Number(option("port", 8787));
const FOLDER = resolve(option("dossier", fileURLToPath(new URL("rapport-enregistre", import.meta.url))));
const PACE = Number(option("rythme", 2)) * 1000;
const QUEUE = Number(option("file", 1));
const CAP = Number(option("plafond", 20));
const REFUSE = option("refuser", null);
const DIRECT = process.argv.includes("--sans-direct") ? null : resolve(option("direct", fileURLToPath(new URL("direct-enregistre", import.meta.url))));
// The images of each page of the direct, by its order: ordre -> [image 0, image 1, ...].
const FRAMES = new Map();
for (const name of DIRECT && existsSync(DIRECT) ? readdirSync(DIRECT).sort((a, b) => a.localeCompare(b, "en", { numeric: true })) : []) {
  const found = /^(\d+)-(\d+)\.jpg$/.exec(name);
  if (found) (FRAMES.get(Number(found[1])) ?? FRAMES.set(Number(found[1]), []).get(Number(found[1])))[Number(found[2])] = join(DIRECT, name);
}
const RECORD = JSON.parse(readFileSync(join(FOLDER, "exploration.json"), "utf8"));
if (RECORD.format !== "horama-exploration-1") throw new Error(`${FOLDER}/exploration.json n'est pas un fichier horama-exploration-1`);

const explorations = new Map(); // id -> moment of the demand
const demands = new Map(); // address IP -> moments of its demands in the last hour
const REFUSALS = {
  429: "Trop de demandes en une heure : réessaie plus tard.",
  503: "Le service est complet (3 explorations à la fois au plus) : réessaie dans quelques minutes.",
};

// The recorded exploration as it was after `visited` pages: those pages and their findings, the next one in progress.
function replay(visited) {
  if (visited >= RECORD.pages.length) return RECORD;
  const pages = [...RECORD.pages].sort((a, b) => a.ordre - b.ordre).map((page, index) => (index < visited ? page
    : { ...page, etat: index === visited ? "en_cours" : "a_visiter", http: null, debut: null, fin: null, capture: null, holo: null, statut: null }));
  const done = new Set(pages.filter((page) => page.etat === "visitee" || page.etat === "non_visitee").map((page) => page.ecran));
  const constats = RECORD.constats.filter((constat) => done.has(constat.ecran));
  const counted = constats.filter((constat) => !constat.explique_par);
  const number = (statut) => counted.filter((constat) => constat.statut === statut).length;
  return {
    ...RECORD, etat: "en_cours", fin: null, duree_s: null, cout_usd: null, pages, constats,
    agents: RECORD.agents.map((agent) => ({ ...agent, etat: "en_cours", pages: pages.filter((page) => page.etat !== "a_visiter").map((page) => page.ecran) })),
    totaux: { ...RECORD.totaux, pages_visitees: pages.filter((page) => page.etat === "visitee").length, defauts: number("VERIFIED_FAIL"), doutes: number("SUSPECTED"), sans_conclusion: number("INCONCLUSIVE"),
      par_sorte: counted.reduce((all, constat) => ({ ...all, [constat.sorte]: (all[constat.sorte] ?? 0) + 1 }), {}) },
  };
}

const send = (response, status, body, type = "application/json; charset=utf-8") => {
  response.writeHead(status, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Content-Type": type, "Cache-Control": "no-store" });
  response.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  if (request.method === "OPTIONS") return send(response, 204, "", "text/plain");
  if (request.method === "POST" && pathname === "/explorations") {
    let body = "";
    for await (const chunk of request) body += chunk;
    let url;
    try {
      url = new URL(JSON.parse(body).url);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error();
    } catch {
      return send(response, 400, { erreur: "Adresse refusée : il faut l'adresse HTTP(S) d'un site, sans identifiants." });
    }
    if (REFUSE) return send(response, Number(REFUSE), { erreur: REFUSALS[REFUSE] ?? "Refusé." });
    const ip = request.socket.remoteAddress;
    const recent = (demands.get(ip) ?? []).filter((at) => Date.now() - at < 3_600_000);
    if (recent.length >= CAP) return send(response, 429, { erreur: REFUSALS[429] });
    demands.set(ip, [...recent, Date.now()]);
    const id = randomUUID();
    explorations.set(id, Date.now());
    console.log(`Exploration ${id} demandée pour ${url.href} : rejoue ${RECORD.adresse} (${FOLDER}).`);
    return send(response, 202, { id, place: QUEUE });
  }
  const match = /^\/explorations\/([\w-]+)(?:\/(.+))?$/.exec(pathname);
  if (request.method === "GET" && match && explorations.has(match[1])) {
    const elapsed = Date.now() - explorations.get(match[1]);
    const waiting = QUEUE - Math.floor(elapsed / PACE);
    const visited = Math.floor((elapsed - QUEUE * PACE) / PACE);
    if (match[2] === "direct") {
      // The last image of the page in visit, as the screencast of the real service keeps it.
      if (visited >= RECORD.pages.length) return send(response, 410, { erreur: "Exploration finie : plus de direct." });
      const frames = waiting > 0 ? null : FRAMES.get([...RECORD.pages].sort((a, b) => a.ordre - b.ordre)[visited].ordre)?.filter(Boolean);
      if (!frames?.length) return send(response, 404, { erreur: "Pas encore d'image." });
      const within = (elapsed - QUEUE * PACE - visited * PACE) / PACE;
      return send(response, 200, readFileSync(frames[Math.min(frames.length - 1, Math.floor(within * frames.length))]), "image/jpeg");
    }
    if (match[2]) {
      // A capture, by the path the file gives it (captures/…), never outside the recorded folder.
      const file = normalize(join(FOLDER, decodeURIComponent(match[2])));
      if (!file.startsWith(FOLDER + sep) || !existsSync(file)) return send(response, 404, { erreur: "Capture introuvable." });
      return send(response, 200, readFileSync(file), "image/png");
    }
    if (waiting > 0) return send(response, 200, { id: match[1], etat: "en_file", place: waiting });
    const report = replay(visited);
    return send(response, 200, report.etat === "en_cours" && FRAMES.size ? { ...report, direct: true } : report);
  }
  return send(response, 404, { erreur: "Exploration inconnue." });
}).listen(PORT, "127.0.0.1", () => console.log(`Faux service Horama sur http://127.0.0.1:${PORT} : ${RECORD.pages.length} pages de ${RECORD.adresse}, ${PACE / 1000} s par page, ${FRAMES.size ? `direct : ${FRAMES.size} pages d'images (${DIRECT})` : "sans direct"}.`));
