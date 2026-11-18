import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { resolvePublic } from "../src/exploration/reseau.ts";

const hour = 3_600_000;
const addressError = "Adresse refusée : indique l’adresse HTTP(S) d’un site public, sans identifiants.";
const fullError = "Le service est complet : réessaie dans quelques minutes.";
const rateError = "Trop de demandes en une heure : réessaie plus tard.";
const runError = "L’exploration a été interrompue avant de produire un rapport complet.";

function send(response, status, body) {
  const type = Buffer.isBuffer(body) ? "image/png" : "application/json; charset=utf-8";
  response.writeHead(status, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Cache-Control": "no-store", "Content-Type": type,
    "X-Content-Type-Options": "nosniff" });
  response.end(status === 204 ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readAddress(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > 4096) {
      request.resume();
      throw new Error();
    }
    chunks.push(chunk);
  }
  const { url } = JSON.parse(Buffer.concat(chunks).toString());
  if (typeof url !== "string") throw new Error();
  const address = new URL(url);
  if (!/^https?:$/.test(address.protocol) || address.username || address.password) throw new Error();
  address.hash = "";
  return address;
}

export function createExplorationService({ data, run, resolveAddress = resolvePublic, now = Date.now,
  pendingLimit = 5, hourlyLimit = 12, clientHourlyLimit = 4 }) {
  const jobs = new Map();
  const waiting = [];
  const admissions = [];
  let active;
  let validating = 0;
  let available = true;

  function startNext() {
    if (active || !available || !waiting.length) return;
    const job = waiting.shift();
    active = job;
    job.controller = new AbortController();
    job.running = Promise.resolve().then(() => run(job, job.controller.signal)).catch(() => {}).finally(() => {
      job.finished = now();
      active = undefined;
      startNext();
    });
  }

  function prune() {
    const cutoff = now() - hour;
    while (admissions.length && admissions[0].at <= cutoff) admissions.shift();
    for (const [id, job] of jobs) {
      if (job.finished !== undefined && job.finished <= cutoff) {
        jobs.delete(id);
        void rm(job.directory, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  async function handle(request, response) {
    const { pathname } = new URL(request.url, "http://localhost");
    if (request.method === "OPTIONS") return send(response, 204);
    if (request.method === "GET" && pathname === "/sante") return send(response, available ? 200 : 503, { ok: available });
    prune();
    if (request.method === "POST" && pathname === "/explorations") {
      let address;
      try { address = await readAddress(request); }
      catch { return send(response, 400, { erreur: addressError }); }
      const ip = request.socket.remoteAddress;
      const limited = () => admissions.length >= hourlyLimit || admissions.filter(entry => entry.ip === ip).length >= clientHourlyLimit;
      if (limited()) return send(response, 429, { erreur: rateError });
      if (!available || waiting.length >= pendingLimit || validating >= 3) return send(response, 503, { erreur: fullError });
      validating++;
      try { await resolveAddress(address.hostname); }
      catch { return send(response, 400, { erreur: addressError }); }
      finally { validating--; }
      if (limited()) return send(response, 429, { erreur: rateError });
      if (!available || waiting.length >= pendingLimit) return send(response, 503, { erreur: fullError });
      const id = randomUUID();
      const job = { id, url: address.href, directory: join(data, id) };
      admissions.push({ ip, at: now() });
      jobs.set(id, job);
      waiting.push(job);
      startNext();
      return send(response, 202, { id, place: waiting.indexOf(job) + 1 });
    }
    const match = /^\/explorations\/([a-f0-9-]+)(?:\/captures\/([a-z0-9-]+\.png))?$/.exec(pathname);
    const job = match && jobs.get(match[1]);
    if (request.method !== "GET" || !job) return send(response, 404, { erreur: "Exploration inconnue." });
    if (match[2]) {
      const capture = await readFile(join(job.directory, "captures", match[2])).catch(() => null);
      return capture ? send(response, 200, capture) : send(response, 404, { erreur: "Capture introuvable." });
    }
    const finished = job.finished !== undefined;
    const report = await readFile(join(job.directory, "exploration.json"), "utf8")
      .then(JSON.parse).catch(() => null);
    if (report?.format === "horama-exploration-1" && (report.etat !== "en_cours" || !finished)) {
      return send(response, 200, report);
    }
    if (finished) return send(response, 503, { erreur: runError });
    return send(response, 200, { id: job.id, etat: "en_file", place: waiting.indexOf(job) + 1 });
  }

  const server = createServer({ requestTimeout: 10_000, headersTimeout: 10_000 }, (request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent && !response.destroyed) send(response, 503, { erreur: "Service indisponible." });
    });
  });
  return { server, async stop() {
    available = false;
    active?.controller.abort();
    await active?.running;
  } };
}
