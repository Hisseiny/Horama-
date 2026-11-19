// The real data of the tower of control (#149, #238), and nothing else: no example, no figure written here.
// - First source: the service Horama, GET <service>/tour/donnees (contract of #238): the public index of the passages
//   (entry by a PR), the notes of the vault of the clone, the recent explorations of the service (entry by an address)
//   and the state of the agent, read by the service on GitHub with its key (no limit of 60 per hour, no cache of 5 min).
//   The service is the Railway one (accueil/service.js); ?service=<url> replaces it, for the local fake service
//   (faux-service.mjs), and only with a local address or the Railway one.
// - Fallback, when the service does not answer (or answers 404 while the route is not online yet): the index on
//   raw.githubusercontent.com (at the commit ?index=<sha> when given, which escapes the cache of 5 min of the branch),
//   and the vault by the list of its files written at build time (public/vault-manifeste.json, scripts/manifeste-vault.mjs)
//   then each note on raw, on the branch horama/vault first (where the service writes the tests and the notes, never on
//   dev: decision of 19/11 in #238), then on dev when the note is not there.
// - The list of the files of the vault (the same manifest) is read in both cases: it alone says which reference
//   captures exist (the service gives the notes only).
// - Entry by an address, in both cases: the explorations sent from the page of welcome, kept in this browser
//   (localStorage « horama-explorations », written by accueil/envoye.js), plus those the service lists, without
//   duplicate by id; each one read again from its service (horama-exploration-1).
// All become one list of passages, the latest first. A source that does not answer says so; it never fills in.

const PARAMS = new URLSearchParams(window.location.search);
export const SERVICE_RAILWAY = "https://explorations-production-70bf5b38.up.railway.app";
const serviceDemande = PARAMS.get("service")?.replace(/\/+$/, "") ?? null;
const serviceAccepte = serviceDemande !== null && (serviceDemande === SERVICE_RAILWAY || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(serviceDemande));
export const SERVICE = serviceAccepte ? serviceDemande! : SERVICE_RAILWAY;
const INDEX_SHA = /^[0-9a-f]{7,40}$/i.test(PARAMS.get("index") ?? "") ? PARAMS.get("index") : null;
export const INDEX_URL = `https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/${INDEX_SHA ?? "horama/captures"}/index.json`;
export const HISTORY_KEY = "horama-explorations";
const VAULT_PREFIX = "vault-horama/eugenia-clone/";

export type Genre = "defaut" | "doute";
export type Zone = { x: number; y: number; largeur: number; hauteur: number };
export type Decision = { choix: "bug" | "voulu"; par: string | null; le: string | null };
export type Constat = {
  id: string;
  genre: Genre;
  page: string; // path of the page (« / », « /ecole »)
  texte: string;
  preuve: string | null;
  zone: Zone | null;
  taille: { largeur: number; hauteur: number } | null; // size of the capture, when known
  capture: string | null; // address of the image
  entouree: boolean; // the capture already carries the stroke (entry by a PR) or not (entry by an address)
  decision: Decision | null;
};
export type Passage = {
  cle: string; // unique key, for the address of the report: dev:<passage> or public:<id>
  mode: "dev" | "public";
  passage: string | null; // the field « passage » of the entry of the index (what POST /tour/decision names); null for an address
  service: string | null; // the service that keeps an exploration (entry by an address); null for a PR
  date: string; // ISO
  titre: string; // the PR (« PR #16 : … ») or the address explored
  site: string;
  lien: string | null; // the PR, or the page of report of the service
  reponse: string | null; // the answer of Horama on the PR
  commit: string | null;
  pages: { visitees: number | null; trouvees: number | null };
  defauts: number;
  doutes: number;
  duree_s: number | null;
  cout_usd: number | null;
  etat: string | null;
  constats: Constat[];
};
export type Note = { chemin: string; contenu: string }; // a note of the vault, its path under vault-horama/eugenia-clone/
export type Chargement = {
  passages: Passage[];
  erreurs: string[];
  source: "service" | "github" | null; // where the index came from; null when nothing could be read
  vault: Note[] | null; // null: unreadable
  vaultSource: string | null; // where the notes came from, in words; null when unreadable
  manifeste: Manifeste | null; // the list of the files of the vault on dev, written at build time; null when unreadable
  // As the service gives it (the fake service says « file », the real one « file_attente »); null without the service.
  agent: { disponible?: boolean; file?: number; file_attente?: number } | null;
};
export type Manifeste = { depot: string; branche: string; commit: string; genere_le: string; fichiers: string[] };

type IndexConstat = { id: string; statut: string; genre?: string; page?: string; texte?: string; preuve?: string | null; zone?: Zone | null; capture?: string | null;
  decision?: { choix: "bug" | "voulu"; par?: string | null; le?: string | null } | null };
type IndexPassage = { passage: string | null; date: string; site: string; previsualisation?: string; pr: { numero: number; adresse: string; titre?: string | null };
  commit: string; reponse: string | null; etat: string | null; duree_s?: number | null; cout_usd?: number | null; totaux?: { pages_visitees?: number; pages_trouvees?: number; defauts?: number; doutes?: number } | null;
  constats: IndexConstat[] };

// The language check written by its measure in passages published before 19/11 (« 1 bloc en français ; … ; page
// déclarée de »): said as a sentence, as automatisation/scene/recapitulatif.mjs does since.
const LANGUES: Record<string, string> = { de: "allemand", fr: "français", en: "anglais", es: "espagnol", it: "italien", nl: "néerlandais", pt: "portugais" };
export function phrase(texte: string): string {
  const mesure = /^(\d+) blocs? en ([a-zàâçéèêëîïôûùüÿœ]+) ; .*page déclarée ([a-z]{2})\b/i.exec(texte);
  if (!mesure) return texte;
  const [, blocs, langue, code] = mesure;
  return `${Number(blocs) > 1 ? `${blocs} blocs sont restés` : "Un bloc est resté"} en ${langue} sur une page déclarée en ${LANGUES[code.toLowerCase()] ?? code}.`;
}
// The same measure, kept as the proof (« Mesuré : … ; page déclarée de. Attendu : … »): the code of language at its end
// said as a word.
const preuveLisible = (preuve: string) => preuve.replace(/page déclarée ([a-z]{2})(?=\.|$)/, (_, code: string) => `page déclarée en ${LANGUES[code] ?? code}`);

function fromIndex(item: IndexPassage): Passage {
  const constats: Constat[] = (item.constats ?? []).map((c) => ({
    id: c.id, genre: c.statut === "VERIFIED_FAIL" ? "defaut" : "doute", page: c.page ?? "", texte: phrase(c.texte ?? ""), preuve: c.preuve ? preuveLisible(c.preuve) : null,
    zone: c.zone ?? null, taille: null, capture: c.capture ?? null, entouree: true,
    decision: c.decision ? { choix: c.decision.choix, par: c.decision.par ?? null, le: c.decision.le ?? null } : null,
  }));
  return {
    cle: `dev:${item.passage ?? `${item.pr.numero}-${item.commit}`}`, mode: "dev", passage: item.passage, service: null, date: item.date,
    titre: `PR #${item.pr.numero}${item.pr.titre ? ` : ${item.pr.titre}` : ""}`, site: item.site, lien: item.pr.adresse, reponse: item.reponse, commit: item.commit,
    pages: { visitees: item.totaux?.pages_visitees ?? null, trouvees: item.totaux?.pages_trouvees ?? null },
    defauts: constats.filter((c) => c.genre === "defaut").length, doutes: constats.filter((c) => c.genre === "doute").length,
    duree_s: item.duree_s ?? null, cout_usd: item.cout_usd ?? null, etat: item.etat, constats,
  };
}

type Envoi = { id: string; service: string; adresse: string; date: string };
type Exploration = { format: string; adresse: string; site?: string; etat: string; debut?: string; duree_s?: number | null; cout_usd?: number | null;
  pages?: { ecran: string; url: string; etat: string; capture?: { largeur: number; hauteur: number } | null }[];
  constats?: { id: string; ecran: string; statut: string; description?: string; zone?: Zone | null; page?: { largeur: number; hauteur: number } | null;
    capture?: string | null; source?: string; preuve?: { mesure?: string; attendu?: string } | null; explique_par?: string | null }[];
  totaux?: { pages_visitees?: number; pages_trouvees?: number } };

export function historique(): Envoi[] {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((e) => e && typeof e.id === "string" && /^https?:\/\//.test(e.service ?? "")) : [];
  } catch {
    return [];
  }
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

function fromExploration(envoi: Envoi, report: Exploration): Passage {
  const pageOf = (ecran: string) => report.pages?.find((p) => p.ecran === ecran);
  const constats: Constat[] = (report.constats ?? [])
    .filter((c) => (c.statut === "VERIFIED_FAIL" || c.statut === "SUSPECTED") && !c.explique_par)
    .map((c) => {
      const page = pageOf(c.ecran);
      return {
        id: c.id, genre: c.statut === "VERIFIED_FAIL" ? "defaut" : "doute", page: page ? pathOf(page.url) : c.ecran, texte: c.description ?? "",
        preuve: c.source === "controle" && c.preuve?.mesure ? `Mesuré : ${c.preuve.mesure}.${c.preuve.attendu ? ` Attendu : ${c.preuve.attendu}` : ""}` : c.source === "holo" ? "Doute du regard de Holo : rien n'est prouvé." : null,
        zone: c.zone ?? null, taille: c.page ?? (page?.capture ? { largeur: page.capture.largeur, hauteur: page.capture.hauteur } : null),
        capture: c.capture ? `${envoi.service}/explorations/${encodeURIComponent(envoi.id)}/${c.capture}` : null, entouree: false, decision: null,
      };
    });
  return {
    cle: `public:${envoi.id}`, mode: "public", passage: null, service: envoi.service, date: report.debut ?? envoi.date, titre: report.adresse ?? envoi.adresse, site: report.site ?? "",
    lien: `../rapport/?id=${encodeURIComponent(envoi.id)}&service=${encodeURIComponent(envoi.service)}`, reponse: null, commit: null,
    pages: { visitees: report.totaux?.pages_visitees ?? null, trouvees: report.totaux?.pages_trouvees ?? null },
    defauts: constats.filter((c) => c.genre === "defaut").length, doutes: constats.filter((c) => c.genre === "doute").length,
    duree_s: report.duree_s ?? null, cout_usd: report.cout_usd ?? null, etat: report.etat, constats,
  };
}

// The service, or null when it does not answer or does not have the route (404 while it is not online yet).
type Donnees = { index: { passages?: IndexPassage[] }; vault?: Note[]; explorations?: { id: string; url?: string; date?: string }[]; agent?: Chargement["agent"] };
async function lireService(): Promise<Donnees | null> {
  try {
    const response = await fetch(`${SERVICE}/tour/donnees`, { cache: "no-store" });
    if (!response.ok) return null;
    const body = await response.json();
    return body && typeof body.index === "object" && body.index ? body : null;
  } catch {
    return null;
  }
}

// The list of the files of the vault on dev, written at build time; null when it cannot be read.
async function lireManifeste(): Promise<Manifeste | null> {
  try {
    const response = await fetch("vault-manifeste.json", { cache: "no-store" });
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body?.fichiers) ? body : null;
  } catch {
    return null;
  }
}

// The fallback of the vault: each note of the manifest on raw (no limit per hour there), on horama/vault first, then on
// dev when it is not there (404: the branch does not exist yet, or the note came after it). Says which branches served.
async function lireVaultGithub(manifeste: Manifeste | null): Promise<{ notes: Note[]; branches: Set<string> } | null> {
  if (!manifeste) return null;
  const branches = new Set<string>();
  const lire = async (branche: string, f: string) => fetch(`https://raw.githubusercontent.com/${manifeste.depot}/${branche}/${f}`, { cache: "no-store" });
  try {
    const notes = await Promise.all(manifeste.fichiers.filter((f) => f.endsWith(".md")).map(async (f) => {
      let branche = "horama/vault";
      let note = await lire(branche, f);
      if (note.status === 404) note = await lire((branche = manifeste.branche), f);
      if (!note.ok) throw new Error(`HTTP ${note.status}`);
      branches.add(branche);
      return { chemin: f.slice(VAULT_PREFIX.length), contenu: await note.text() };
    }));
    return { notes, branches };
  } catch {
    return null;
  }
}

export async function charger(): Promise<Chargement> {
  const erreurs: string[] = [];
  const passages: Passage[] = [];
  if (serviceDemande !== null && !serviceAccepte) erreurs.push(`Service ${serviceDemande} refusé : seuls une adresse locale et le service Horama sont acceptés. Le service Horama est lu à sa place.`);
  const [donnees, manifeste] = await Promise.all([lireService(), lireManifeste()]);
  let source: Chargement["source"] = null;
  let vault: Note[] | null = null;
  let vaultSource: string | null = null;
  if (donnees) {
    source = "service";
    passages.push(...(donnees.index.passages ?? []).map(fromIndex));
    // The contract does not say whether « chemin » keeps the folder of the vault: it is taken off when present.
    vault = Array.isArray(donnees.vault) ? donnees.vault.map((n) => ({ chemin: n.chemin.replace(VAULT_PREFIX, ""), contenu: n.contenu })) : null;
    // The service does not say which branch it read: the contract (#238) says horama/vault when it exists, else dev.
    if (vault) vaultSource = "service Horama (branche horama/vault, ou dev si elle n'existe pas)";
  } else {
    const [index, lu] = await Promise.all([
      fetch(INDEX_URL, { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }).catch(() => null),
      lireVaultGithub(manifeste),
    ]);
    vault = lu?.notes ?? null;
    if (lu && manifeste) vaultSource = `branche${lu.branches.size > 1 ? "s" : ""} ${[...lu.branches].join(" et ")} (liste des fichiers de ${manifeste.branche} au ${new Date(manifeste.genere_le).toLocaleDateString("fr-FR")})`;
    if (index) {
      source = "github";
      passages.push(...(index.passages ?? []).map(fromIndex));
    } else erreurs.push("Index des passages déclenchés par une PR illisible : ni le service Horama ni le dépôt ne répondent, rechargez la page.");
  }
  // The explorations of this browser, then those the service lists that this browser did not send.
  const locales = historique();
  const envois = [...locales, ...(donnees?.explorations ?? [])
    .filter((e) => e && typeof e.id === "string" && !locales.some((l) => l.id === e.id))
    .map((e) => ({ id: e.id, service: SERVICE, adresse: e.url ?? e.id, date: e.date ?? "" }))];
  // Only a 404 means the service no longer keeps an exploration; a service asleep, in error or answering something
  // else is said otherwise (review of #222).
  let injoignables = 0;
  const lus = await Promise.all(envois.map(async (envoi) => {
    try {
      const response = await fetch(`${envoi.service}/explorations/${encodeURIComponent(envoi.id)}`, { cache: "no-store" });
      if (response.status === 404) return null; // the service no longer keeps it
      const body = await response.json();
      // Waiting in the queue, the service answers { id, etat: "en_file", place } without the format yet.
      if (body.format === "horama-exploration-1" || body.etat === "en_file") return fromExploration(envoi, body);
    } catch {}
    injoignables++;
    return undefined;
  }));
  // A lost exploration is named once, then leaves the history of this browser: the next visit no longer repeats it.
  const perdues = locales.filter((_, i) => lus[i] === null);
  if (perdues.length) {
    const s = perdues.length > 1;
    erreurs.push(`${s ? "Les explorations" : "L'exploration"} de ${perdues.map((e) => e.adresse).join(", ")}, envoyée${s ? "s" : ""} depuis ce navigateur, ${s ? "ne sont plus gardées" : "n'est plus gardée"} par le service : ${s ? "elles ne seront plus listées" : "elle ne sera plus listée"} ici.`);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historique().filter((e) => !perdues.some((perdue) => perdue.id === e.id))));
    } catch {}
  }
  if (injoignables) erreurs.push(`${injoignables} exploration${injoignables > 1 ? "s" : ""} illisible${injoignables > 1 ? "s" : ""} : le service ne répond pas, réessayez dans un instant.`);
  passages.push(...lus.filter((item): item is Passage => !!item));
  passages.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { passages, erreurs, source, vault, vaultSource, manifeste, agent: donnees?.agent ?? null };
}

// The connection of the team account (#238): POST <service>/tour/session gives a token of 12 h, kept in sessionStorage
// (the tab only). An expired token is taken off when read. Every change is announced by the event SESSION_EVENT.
export type Session = { jeton: string; expire_le: string; nom: string };
const SESSION_KEY = "horama-tour-session";
export const SESSION_EVENT = "horama-tour-session";

// The raw text of the session (a string, so that React compares it by value), or null.
export function sessionBrute(): string | null {
  try {
    const brute = sessionStorage.getItem(SESSION_KEY);
    if (brute && Date.parse(JSON.parse(brute).expire_le) > Date.now()) return brute;
    if (brute) sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  return null;
}

export function oublierSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// "ok", or the error to say on the screen.
export async function connecter(email: string, motDePasse: string): Promise<"ok" | string> {
  let response: Response;
  try {
    response = await fetch(`${SERVICE}/tour/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, mot_de_passe: motDePasse }) });
  } catch {
    return "Le service ne répond pas, réessayez dans un instant.";
  }
  if (response.status === 401) return "Adresse ou mot de passe incorrect.";
  if (response.status === 429) return "Trop d'essais, réessayez dans une minute.";
  const corps = await response.json().catch(() => null);
  if (!response.ok || typeof corps?.jeton !== "string") return "Le service n'a pas pu ouvrir la session, réessayez dans un instant.";
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ jeton: corps.jeton, expire_le: corps.expire_le, nom: corps.nom }));
  } catch {
    return "Ce navigateur refuse de garder la session : autorisez le stockage du site puis réessayez.";
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
  return "ok";
}

// POST <service>/tour/test or /tour/doc: the HTTP status (0 when the service does not answer) and the « erreur » of its
// answer, as the service wrote it (the 501 of /tour/doc is shown so).
export async function ecrire(session: Session, route: "test" | "doc", corps: Record<string, string>): Promise<{ statut: number; erreur: string | null }> {
  try {
    const response = await fetch(`${SERVICE}/tour/${route}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.jeton}` },
      body: JSON.stringify(corps) });
    const reponse = await response.json().catch(() => null);
    return { statut: response.status, erreur: typeof reponse?.erreur === "string" ? reponse.erreur : null };
  } catch {
    return { statut: 0, erreur: null };
  }
}

// POST <service>/tour/decision: the HTTP status, or 0 when the service does not answer.
export async function trancher(session: Session, passage: string, constat: string, decision: "bug" | "voulu"): Promise<number> {
  try {
    const response = await fetch(`${SERVICE}/tour/decision`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.jeton}` },
      body: JSON.stringify({ passage, constat, decision }) });
    return response.status;
  } catch {
    return 0;
  }
}

// A note of the vault read: the fields of its front matter as written (comments skipped, quotes of a quoted value taken
// off), its body, and its title (its first « # » line).
export type NoteLue = { chemin: string; champs: Record<string, string>; corps: string; titre: string };
export function lireNote(note: Note): NoteLue {
  const texte = note.contenu.replace(/\r\n/g, "\n");
  const tete = /^---\n([\s\S]*?)\n---\n?/.exec(texte);
  const champs: Record<string, string> = {};
  for (const ligne of tete ? tete[1].split("\n") : []) {
    const i = ligne.indexOf(":");
    if (/^\s*#/.test(ligne) || i < 1 || /^\s/.test(ligne)) continue;
    const valeur = ligne.slice(i + 1).trim();
    champs[ligne.slice(0, i).trim()] = /^"(.*)"$/.exec(valeur)?.[1] ?? /^'(.*)'$/.exec(valeur)?.[1] ?? valeur;
  }
  const corps = tete ? texte.slice(tete[0].length) : texte;
  return { chemin: note.chemin, champs, corps, titre: /^# (.+)$/m.exec(corps)?.[1].trim() ?? note.chemin };
}

// The sections « ## <titre> » of a body, in order, each with its text.
export function sections(corps: string): { titre: string; texte: string }[] {
  return corps.split(/^## /m).slice(1).map((bloc) => {
    const fin = bloc.indexOf("\n");
    return { titre: (fin < 0 ? bloc : bloc.slice(0, fin)).trim(), texte: fin < 0 ? "" : bloc.slice(fin + 1).trim() };
  });
}

// The tests of the vault (tests/*.md), and the notes of its product (produit/*.md), read.
export const testsDuVault = (vault: Note[] | null) => (vault ?? []).filter((n) => /^tests\/[^/]+\.md$/.test(n.chemin)).map(lireNote);
export const notesProduit = (vault: Note[] | null) => (vault ?? []).filter((n) => /^produit\/[^/]+\.md$/.test(n.chemin)).map(lireNote);
// The screens a test reads (« releves: [{ ecran: accueil, vue: defaut }, …] »).
export const ecransReleves = (test: NoteLue) => [...(test.champs.releves ?? "").matchAll(/ecran:\s*([\w-]+)/g)].map((m) => m[1]);
// A test waits for a human while it is neither accepted nor refused (statut « propose », contrats/types.ts).
export const enAttente = (test: NoteLue) => test.champs.statut !== "accepte" && test.champs.statut !== "refuse";
