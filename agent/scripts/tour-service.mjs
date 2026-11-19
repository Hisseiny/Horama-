import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { promisify } from "node:util";
import { createTourGitHub, missingToken } from "./tour-github.mjs";
import { recordDecision, updateTestMarkdown } from "./tour-vault.mjs";

const deriveKey = promisify(scrypt);
const minute = 60_000;
const sessionLifetime = 12 * 60 * minute;
const authError = { erreur: "Identifiants ou jeton invalides." };
const unavailable = { erreur: "Service de la tour indisponible." };
const missingAccount = { erreur: "Compte d’équipe non configuré sur le service (variables TOUR_EMAIL, TOUR_NOM, TOUR_MOT_DE_PASSE_HASH, TOUR_SECRET)." };
const badBody = { erreur: "Données de la tour invalides." };
const routes = new Map([
  ["/tour/session", "POST"], ["/tour/donnees", "GET"], ["/tour/decision", "POST"],
  ["/tour/test", "POST"], ["/tour/doc", "POST"],
]);

export function tourOrigin(origin) {
  return origin === "https://horama-gold.vercel.app" || /^http:\/\/127\.0\.0\.1(?::\d{1,5})?$/.test(origin ?? "");
}

function clientIP(request, railway) {
  const realIP = request.headers["x-real-ip"];
  // Railway documents X-Real-IP as the client address added by its public edge.
  return railway && typeof realIP === "string" && isIP(realIP) ? realIP : request.socket.remoteAddress;
}

function credentials(env) {
  const hash = /^scrypt:([a-f\d]{32}):([a-f\d]{128})$/i.exec(env.TOUR_MOT_DE_PASSE_HASH ?? "");
  if (!env.TOUR_EMAIL || !env.TOUR_NOM || Buffer.byteLength(env.TOUR_SECRET ?? "") < 32 || !hash) return null;
  return { email: env.TOUR_EMAIL, name: env.TOUR_NOM, secret: env.TOUR_SECRET,
    salt: Buffer.from(hash[1], "hex"), key: Buffer.from(hash[2], "hex") };
}

const sign = (secret, value) => createHmac("sha256", secret).update(value).digest("base64url");
function validToken(authorization, secret, now) {
  const match = /^Bearer (\d{1,16}\.[\w-]{22})\.([\w-]{43})$/i.exec(authorization ?? "");
  if (!secret || !match || Number(match[1].split(".")[0]) <= now()) return false;
  return timingSafeEqual(Buffer.from(match[2]), Buffer.from(sign(secret, match[1])));
}

const isIdentifier = value => typeof value === "string" && value.length > 0 && value.length <= 256;
const isSection = value => typeof value === "string" && value.trim() && !/^\s*(?:##\s|\x60\x60\x60|~~~)/m.test(value);

export function createTourService({ env = process.env, now, readJson, runtimeData, fetchGitHub }) {
  const account = credentials(env);
  const github = createTourGitHub({ token: env.GITHUB_TOKEN_TOUR, fetchGitHub, now });
  const attempts = new Map();
  let nextSweep = 0;
  let checking = 0;

  function allowAttempt(ip) {
    const at = now();
    if (at >= nextSweep) {
      for (const [address, times] of attempts) {
        if (times.at(-1) <= at - minute) attempts.delete(address);
      }
      nextSweep = at + minute;
    }
    const recent = (attempts.get(ip) ?? []).filter(time => time > at - minute);
    if (recent.length >= 5 || checking >= 4) return false;
    attempts.set(ip, [...recent, at]);
    return true;
  }

  return async function handleTour(path, request, send) {
    if (!routes.has(path)) return send(404, { erreur: "Route de la tour inconnue." });
    if (request.headers.origin && !tourOrigin(request.headers.origin)) return send(403, { erreur: "Origine refusée." });
    if (request.method === "OPTIONS") return send(204);
    if (request.method !== routes.get(path)) return send(405, { erreur: "Méthode refusée." }, { Allow: `${routes.get(path)}, OPTIONS` });
    if (path === "/tour/donnees") {
      if (!env.GITHUB_TOKEN_TOUR) return send(503, { erreur: missingToken, ...await runtimeData() });
      try {
        const [snapshot, live] = await Promise.all([github.data(), runtimeData()]);
        return send(200, { ...snapshot, ...live });
      } catch {
        return send(503, unavailable);
      }
    }
    if (path === "/tour/session") {
      if (!allowAttempt(clientIP(request, Boolean(env.RAILWAY_ENVIRONMENT_ID)))) {
        return send(429, { erreur: "Trop de tentatives de connexion." }, { "Retry-After": "60" });
      }
      if (!account) return send(503, missingAccount);
      const body = await readJson(request, 4096).catch(() => null);
      const { email, mot_de_passe: password } = body ?? {};
      if (typeof email !== "string" || typeof password !== "string" || !password || password.length > 1024) return send(401, authError);
      if (checking >= 4) return send(429, { erreur: "Trop de tentatives de connexion." }, { "Retry-After": "60" });
      checking++;
      let key;
      try {
        key = await deriveKey(password, account.salt, account.key.length);
      } finally {
        checking--;
      }
      if (!timingSafeEqual(key, account.key) || email !== account.email) return send(401, authError);
      const expires = now() + sessionLifetime;
      const payload = `${expires}.${randomBytes(16).toString("base64url")}`;
      return send(200, { jeton: `${payload}.${sign(account.secret, payload)}`, expire_le: new Date(expires).toISOString(), nom: account.name });
    }
    if (!account) return send(503, missingAccount);
    if (!validToken(request.headers.authorization, account.secret, now)) return send(401, authError);
    if (path === "/tour/doc") return send(501, { erreur: "La correction des notes n’est pas encore disponible." });

    const body = await readJson(request, 16_384).catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return send(400, badBody);
    if (path === "/tour/test") {
      const { test, action, task, verification } = body;
      if (!isIdentifier(test) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(test) ||
          !["accepter", "refuser", "modifier"].includes(action) ||
          (action === "modifier" && ((task === undefined && verification === undefined) ||
            (task !== undefined && !isSection(task)) || (verification !== undefined && !isSection(verification))))) {
        return send(400, badBody);
      }
      try {
        const found = await github.updateTest(test, text => updateTestMarkdown(text, body, account.name, now));
        return found ? send(200, { ok: true }) : send(404, { erreur: "Test introuvable." });
      } catch {
        return send(503, unavailable);
      }
    }

    const { passage, constat, decision } = body;
    if (!isIdentifier(passage) || !isIdentifier(constat) || !["bug", "voulu"].includes(decision)) return send(400, badBody);
    try {
      const result = await github.updateIndex(index => recordDecision(index, body, account.name, now));
      if (result.status === 404) return send(404, { erreur: "Passage ou constat introuvable." });
      if (result.note) await github.createDecisionNote(result.note.id, result.note.content);
      if (result.status === 409) return send(409, { erreur: "Ce constat a déjà été tranché." });
      return send(200, { decision: result.verdict.decision, par: result.verdict.par, le: result.verdict.le });
    } catch {
      return send(503, unavailable);
    }
  };
}
