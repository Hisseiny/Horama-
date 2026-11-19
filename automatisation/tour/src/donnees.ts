// The real data of the tower of control (#149), and nothing else: no example, no figure written here.
// - Entry by a PR: the public index of the passages, published by the wake-up on the branch of the captures of the
//   clone (automatisation/reveil/README.md, « L'index des passages »).
// - Entry by an address: the explorations sent from the page of welcome, kept in this browser (localStorage
//   « horama-explorations », written by accueil/envoye.js), each read again from its service (horama-exploration-1).
// Both become one list of passages, the latest first. A source that does not answer says so; it never fills in.

export const INDEX_URL = "https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/horama/captures/index.json";
export const HISTORY_KEY = "horama-explorations";

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
export type Chargement = { passages: Passage[]; erreurs: string[] };

type IndexConstat = { id: string; statut: string; genre?: string; page?: string; texte?: string; preuve?: string | null; zone?: Zone | null; capture?: string | null;
  decision?: { choix: "bug" | "voulu"; par?: string | null; le?: string | null } | null };
type IndexPassage = { passage: string | null; date: string; site: string; previsualisation?: string; pr: { numero: number; adresse: string; titre?: string | null };
  commit: string; reponse: string | null; etat: string | null; totaux?: { pages_visitees?: number; pages_trouvees?: number; defauts?: number; doutes?: number } | null;
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

function fromIndex(item: IndexPassage): Passage {
  const constats: Constat[] = (item.constats ?? []).map((c) => ({
    id: c.id, genre: c.statut === "VERIFIED_FAIL" ? "defaut" : "doute", page: c.page ?? "", texte: phrase(c.texte ?? ""), preuve: c.preuve ?? null,
    zone: c.zone ?? null, taille: null, capture: c.capture ?? null, entouree: true,
    decision: c.decision ? { choix: c.decision.choix, par: c.decision.par ?? null, le: c.decision.le ?? null } : null,
  }));
  return {
    cle: `dev:${item.passage ?? `${item.pr.numero}-${item.commit}`}`, mode: "dev", date: item.date,
    titre: `PR #${item.pr.numero}${item.pr.titre ? ` : ${item.pr.titre}` : ""}`, site: item.site, lien: item.pr.adresse, reponse: item.reponse, commit: item.commit,
    pages: { visitees: item.totaux?.pages_visitees ?? null, trouvees: item.totaux?.pages_trouvees ?? null },
    defauts: constats.filter((c) => c.genre === "defaut").length, doutes: constats.filter((c) => c.genre === "doute").length,
    duree_s: null, cout_usd: null, etat: item.etat, constats,
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
        preuve: c.source === "controle" && c.preuve?.mesure ? `Mesuré : ${c.preuve.mesure}. Attendu : ${c.preuve.attendu ?? ""}` : c.source === "holo" ? "Doute du regard de Holo : rien n'est prouvé." : null,
        zone: c.zone ?? null, taille: c.page ?? (page?.capture ? { largeur: page.capture.largeur, hauteur: page.capture.hauteur } : null),
        capture: c.capture ? `${envoi.service}/explorations/${encodeURIComponent(envoi.id)}/${c.capture}` : null, entouree: false, decision: null,
      };
    });
  return {
    cle: `public:${envoi.id}`, mode: "public", date: report.debut ?? envoi.date, titre: report.adresse ?? envoi.adresse, site: report.site ?? "",
    lien: `../rapport/?id=${encodeURIComponent(envoi.id)}&service=${encodeURIComponent(envoi.service)}`, reponse: null, commit: null,
    pages: { visitees: report.totaux?.pages_visitees ?? null, trouvees: report.totaux?.pages_trouvees ?? null },
    defauts: constats.filter((c) => c.genre === "defaut").length, doutes: constats.filter((c) => c.genre === "doute").length,
    duree_s: report.duree_s ?? null, cout_usd: report.cout_usd ?? null, etat: report.etat, constats,
  };
}

export async function charger(): Promise<Chargement> {
  const erreurs: string[] = [];
  const passages: Passage[] = [];
  try {
    const response = await fetch(INDEX_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const index = await response.json();
    passages.push(...(index.passages ?? []).map(fromIndex));
  } catch (error) {
    erreurs.push(`Index des passages déclenchés par une PR illisible (${(error as Error).message}).`);
  }
  const envois = historique();
  // Only a 404 means the service no longer keeps an exploration; a service asleep, in error or answering something
  // else is said otherwise (review of #222).
  let injoignables = 0;
  const lus = await Promise.all(envois.map(async (envoi) => {
    try {
      const response = await fetch(`${envoi.service}/explorations/${encodeURIComponent(envoi.id)}`, { cache: "no-store" });
      if (response.status === 404) return null; // the service no longer keeps it
      const body = await response.json();
      if (body.format === "horama-exploration-1") return fromExploration(envoi, body);
    } catch {}
    injoignables++;
    return undefined;
  }));
  const perdues = lus.filter((item) => item === null).length;
  if (perdues) erreurs.push(`${perdues} exploration${perdues > 1 ? "s" : ""} envoyée${perdues > 1 ? "s" : ""} depuis ce navigateur ${perdues > 1 ? "ne sont plus gardées" : "n'est plus gardée"} par le service.`);
  if (injoignables) erreurs.push(`${injoignables} exploration${injoignables > 1 ? "s" : ""} illisible${injoignables > 1 ? "s" : ""} : le service ne répond pas, réessayez dans un instant.`);
  passages.push(...lus.filter((item): item is Passage => !!item));
  passages.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { passages, erreurs };
}
