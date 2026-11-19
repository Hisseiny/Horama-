// FAKE local service, not the real one. It imitates the contract of issue #238 (Leon's service, routes /tour/*) so the
// tour interface can be developed before the real service exists. Nothing is written to GitHub or to disk: decisions and
// test changes live in memory and vanish when the process stops. The test account is a fake one (FAUX_TOUR_EMAIL,
// FAUX_TOUR_MOT_DE_PASSE, FAUX_TOUR_NOM), not a real secret.
//
// Usage: node automatisation/tour/faux-service.mjs [--port 8788] [--index <index.json>] [--vault <folder>] [--explorations <file.json>]
// Listens on 127.0.0.1 only. Defaults: the public index copied in faux-service/index.json and the vault vault-horama/eugenia-clone/.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ORIGINE_PROD = "https://horama-gold.vercel.app";
const DUREE_JETON_MS = 12 * 3600 * 1000;

const b64 = (x) => Buffer.from(x).toString("base64url");
const egal = (a, b) => a.length === b.length && timingSafeEqual(a, b);

function lireVault(dossier) {
  const out = [];
  const parcourir = (rel) => {
    for (const e of readdirSync(join(dossier, rel), { withFileTypes: true })) {
      const chemin = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) parcourir(chemin);
      else if (e.name.endsWith(".md")) out.push({ chemin, contenu: readFileSync(join(dossier, chemin), "utf8") });
    }
  };
  parcourir("");
  return out.sort((a, b) => a.chemin.localeCompare(b.chemin));
}

// Sets (or adds) keys of the front matter of a note.
function majFrontMatter(contenu, champs) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(contenu);
  let lignes = m ? m[1].split("\n") : [];
  for (const [cle, val] of Object.entries(champs)) {
    const ligne = `${cle}: ${val}`;
    const i = lignes.findIndex((l) => l.startsWith(`${cle}:`));
    if (i >= 0) lignes[i] = ligne; else lignes.push(ligne);
  }
  return `---\n${lignes.join("\n")}\n---\n${m ? contenu.slice(m[0].length) : contenu}`;
}

// Replaces the body of a `## <titre>` section, up to the next `## `, the block of rules (kept, as the real service of
// #238 keeps it) or the end.
function remplacerSection(contenu, titre, texte) {
  const re = new RegExp(`(^## ${titre}[^\\n]*\\n)[\\s\\S]*?(?=^## |^\`\`\`regles|(?![\\s\\S]))`, "m");
  return re.test(contenu) ? contenu.replace(re, (_, tete) => `${tete}${texte.trim()}\n\n`) : `${contenu.trimEnd()}\n\n## ${titre}\n${texte.trim()}\n`;
}

export function creerFauxService({ maintenant = Date.now, index, vault, explorations = [] } = {}) {
  const email = process.env.FAUX_TOUR_EMAIL ?? "equipe@horama.test";
  const mdp = process.env.FAUX_TOUR_MOT_DE_PASSE ?? "essai-local";
  const nom = process.env.FAUX_TOUR_NOM ?? "Équipe Horama";
  const sel = randomBytes(16);
  const hashMdp = scryptSync(mdp, sel, 32);
  const secret = randomBytes(32);
  const essais = new Map(); // ip -> timestamps (ms) of the last minute
  const notes = new Map(vault.map((n) => [n.chemin, n.contenu]));

  const signer = (p) => b64(createHmac("sha256", secret).update(p).digest());
  const jetonValide = (req) => {
    const m = /^Bearer (.+)\.(.+)$/.exec(req.headers.authorization ?? "");
    if (!m || !egal(Buffer.from(signer(m[1])), Buffer.from(m[2]))) return null;
    try {
      const p = JSON.parse(Buffer.from(m[1], "base64url").toString());
      return typeof p.exp === "number" && p.exp > maintenant() ? p : null;
    } catch { return null; }
  };

  const cors = (req, res) => {
    const o = req.headers.origin ?? "";
    if (o === ORIGINE_PROD || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(o)) res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  };
  const repondre = (res, code, corps) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(corps));
  };
  const lireCorps = (req) => new Promise((ok) => {
    let s = "";
    req.on("data", (c) => { s += c; });
    req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch { ok(null); } });
  });

  async function traiter(req, res) {
    cors(req, res);
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    const { pathname } = new URL(req.url, "http://x");

    if (req.method === "GET" && pathname === "/tour/donnees") {
      return repondre(res, 200, { index, vault: [...notes].map(([chemin, contenu]) => ({ chemin, contenu })), explorations, agent: { disponible: true, file: 0 } });
    }
    if (req.method !== "POST" || !["/tour/session", "/tour/decision", "/tour/test", "/tour/doc"].includes(pathname)) return repondre(res, 404, { erreur: "Route inconnue." });

    if (pathname === "/tour/session") {
      const ip = req.socket.remoteAddress ?? "";
      const t = maintenant();
      const recents = (essais.get(ip) ?? []).filter((x) => t - x < 60000);
      essais.set(ip, recents);
      if (recents.length >= 5) return repondre(res, 429, { erreur: "Trop d'essais, réessayez dans une minute." });
      recents.push(t);
      const corps = await lireCorps(req);
      const bon = corps && typeof corps.email === "string" && typeof corps.mot_de_passe === "string"
        && egal(scryptSync(corps.mot_de_passe, sel, 32), hashMdp) && corps.email === email;
      if (!bon) return repondre(res, 401, { erreur: "Identifiants incorrects." });
      const exp = t + DUREE_JETON_MS;
      const payload = b64(JSON.stringify({ nom, exp }));
      return repondre(res, 200, { jeton: `${payload}.${signer(payload)}`, expire_le: new Date(exp).toISOString(), nom });
    }

    const jeton = jetonValide(req);
    if (!jeton) return repondre(res, 401, { erreur: "Connexion requise." });
    const c = await lireCorps(req);
    if (!c || typeof c !== "object") return repondre(res, 400, { erreur: "Corps invalide." });

    // /tour/doc as agent/scripts/tour-service.mjs: `correction` names a decision of decisions/ that carries a proposal
    // (correction_de_note { fichier, avant, apres, statut: "proposee" }); accepted, the note is corrected.
    if (pathname === "/tour/doc") {
      if (typeof c.note !== "string" || typeof c.correction !== "string" || !/^[\w-][\w.-]*$/.test(c.correction) || !["accepter", "refuser"].includes(c.action)) return repondre(res, 400, { erreur: "Données de la tour invalides." });
      const chemin = `decisions/${c.correction}.md`;
      const texte = notes.get(chemin);
      const bloc = texte ? /^```decision[ \t]*\n([\s\S]*?)^```[ \t]*$/m.exec(texte) : null;
      const decision = bloc ? JSON.parse(bloc[1]) : null;
      const proposition = decision?.correction_de_note;
      if (proposition?.fichier !== c.note) return repondre(res, 404, { erreur: "Correction de note introuvable." });
      if (proposition.statut !== "proposee") return repondre(res, 409, { erreur: "Cette correction a déjà été tranchée." });
      if (c.action === "accepter") {
        const cible = notes.get(c.note);
        if (cible === undefined) return repondre(res, 404, { erreur: "Note introuvable." });
        if (cible.split(proposition.avant).length - 1 !== 1) return repondre(res, 409, { erreur: "Le texte à remplacer n'apparaît pas une seule fois dans la note." });
        notes.set(c.note, cible.replace(proposition.avant, () => proposition.apres));
      }
      const statut = c.action === "accepter" ? "acceptee" : "refusee";
      decision.correction_de_note = { ...proposition, statut };
      notes.set(chemin, texte.replace(bloc[0], () => `\`\`\`decision\n${JSON.stringify(decision, null, 2)}\n\`\`\``));
      return repondre(res, 200, { statut });
    }

    if (pathname === "/tour/decision") {
      if (typeof c.passage !== "string" || typeof c.constat !== "string" || !["bug", "voulu"].includes(c.decision)) return repondre(res, 400, { erreur: "Champs invalides." });
      const constat = index.passages.find((p) => p.passage === c.passage)?.constats?.find((x) => x.id === c.constat);
      if (!constat) return repondre(res, 404, { erreur: "Passage ou constat inconnu." });
      if (constat.decision) return repondre(res, 409, { erreur: "Constat déjà tranché." });
      // As recordDecision of agent/scripts/tour-vault.mjs: choix and decision, who, when, and the date of the index.
      constat.decision = { choix: c.decision, decision: c.decision, par: jeton.nom, le: new Date(maintenant()).toISOString() };
      index.maj = constat.decision.le;
      return repondre(res, 200, { decision: c.decision, par: jeton.nom, le: constat.decision.le });
    }

    // /tour/test
    if (typeof c.test !== "string" || !["accepter", "refuser", "modifier"].includes(c.action)) return repondre(res, 400, { erreur: "Champs invalides." });
    const chemin = `tests/${c.test}.md`;
    let note = notes.get(chemin);
    if (note === undefined) return repondre(res, 404, { erreur: "Test inconnu." });
    const le = new Date(maintenant()).toISOString();
    if (c.action === "accepter") note = majFrontMatter(note, { statut: "accepte", accepte_par: jeton.nom, accepte_le: le });
    else if (c.action === "refuser") note = majFrontMatter(note, { statut: "refuse", refuse_par: jeton.nom, refuse_le: le });
    else {
      // As the real service: task, verification or both.
      if ((c.task === undefined && c.verification === undefined) || (c.task !== undefined && typeof c.task !== "string") || (c.verification !== undefined && typeof c.verification !== "string")) return repondre(res, 400, { erreur: "Champs invalides." });
      if (c.task !== undefined) note = remplacerSection(note, "Task", c.task);
      if (c.verification !== undefined) note = remplacerSection(note, "Verification", c.verification);
      note = majFrontMatter(note, { statut: "accepte", accepte_par: jeton.nom, accepte_le: le });
    }
    notes.set(chemin, note);
    return repondre(res, 200, { ok: true });
  }

  return createServer((req, res) => { traiter(req, res).catch(() => repondre(res, 500, { erreur: "Erreur interne." })); });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: o } = parseArgs({ options: { port: { type: "string", default: "8788" }, index: { type: "string" }, vault: { type: "string" }, explorations: { type: "string" } } });
  const index = JSON.parse(readFileSync(o.index ?? join(HERE, "faux-service/index.json"), "utf8"));
  const vault = lireVault(o.vault ?? join(HERE, "../../vault-horama/eugenia-clone"));
  const explorations = o.explorations ? JSON.parse(readFileSync(o.explorations, "utf8")) : [];
  creerFauxService({ index, vault, explorations }).listen(Number(o.port), "127.0.0.1", () => console.log(`Faux service du tour sur http://127.0.0.1:${o.port}`));
}
