import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EcartVisuel, ResultatVerification, Statut } from "@horama/contrats";
import { verifierReleve } from "@horama/jugement";
import { ecrireRapportPassage, ecrireReference, lireDecisions, lireNotes, lireReferences } from "@horama/memoire";
import type { BasePassages } from "../base.ts";
import type { BrowserRuntime } from "../browser.ts";
import { COURSE_RULES, END_TOOL } from "../consigne.ts";
import type { Consigne } from "../consigne.ts";
import { creerCoureur } from "../coureur.ts";
import type { ReleveCapture } from "../coureur.ts";
import type { ResultatSession, Session, SessionEnCours } from "../session.ts";
import { captureDefect, connecterCdp, dismissCookies, prepareCapture } from "./cdp.ts";
import type { ExplorationCdp } from "./cdp.ts";
import { controlerPage } from "./controles.ts";
import { askHolo } from "./holo.ts";
import { discoverPages, normalizePageQuery, renderPage } from "./pages.ts";
import { fetchPublic } from "./reseau.ts";
import { detecterBlocage } from "./blocage.ts";

type Zone = EcartVisuel["zone"];
export interface Finding {
  id: string; ecran: string; vue: string; source: "controle" | "holo" | "comparaison";
  sorte: string; statut: Statut; description: string; textes_a_surligner: string[];
  zone?: Zone; zone_avant?: Zone; nature?: string; pixels?: number; decision_id?: string;
  preuve: Record<string, unknown>; capture: string; agent: number;
  page: { largeur: number; hauteur: number }; explique_par?: string; raison?: string;
}
interface ExplorationPage {
  ecran: string; url: string; ordre: number; trouvee_par: string; agent: number;
  etat: "a_visiter" | "en_cours" | "visitee" | "non_visitee";
  http: number | null; debut: string | null; fin: string | null;
  capture: { fichier: string; url: string | null; largeur: number; hauteur: number; defilement: [number, number] } | null;
  reference: { fichier: string; version: string } | null;
  holo: { etat: string; modele: string | null; duree_ms: number; ecartes_sans_zone: number; jetons: { entree: number; sortie: number } | null; cout_usd: number | null } | null;
  statut: Statut | null;
  cookies?: "refusee" | "aucune"; url_finale?: string; raison?: string;
  arrivee?: "depart" | "clic" | "adresse";
}
export interface ExplorerOptions { url: string; max: number; sortie: string; vault: string; port: number; pagesCliquees?: number; reseauPublic?: boolean; site?: string; doux?: boolean }
export interface ExplorerDependencies {
  base: BasePassages; runtime: BrowserRuntime; session: Session; signal?: AbortSignal;
  fetch?: typeof fetch; controler?: typeof controlerPage; holo?: typeof askHolo;
  connecter?: (port: number, address: string) => Promise<ExplorationCdp>;
  render?: import("./pages.ts").DiscoveryOptions["render"];
  log?: (message: string) => void;
  urlCourante?: () => Promise<string | null>;
  onglets?: () => Promise<Array<{ type: string; url: string }>>;
}

const clickedCount = (pageCount: number, clicked: number) => Math.min(clicked, Math.max(0, pageCount - 1));
export const explorationTimeBudget = (maxSteps: number) => Math.min(1800, Math.max(240, 8 * maxSteps));
export const explorationStepBudget = (pageCount: number, clicked = 0) => 12 * pageCount + 13 + 3 * clickedCount(pageCount, clicked);

export function explorationPassageId(date: Date): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}h${parts.minute}-${randomUUID().slice(0, 4)}`;
}

export const exclusionLabel = (reason: string) => reason === "section-limit" ? "limite de pages par rubrique atteinte" : reason;

function readingInstruction(): string {
  return "Après relever, sur CHAQUE page (départ, clic ou adresse, dernière page comprise) : fais au plus 5 petits scroll_web vers le bas (direction down, num_pixels environ 450, soit une demi-hauteur d'écran, scroll_element null). Arrête ces petits pas dès le bas atteint ou si la page ne bouge plus. Si le bas reste hors vue, fais ensuite UN seul grand scroll_web jusqu'en bas (direction down, num_pixels 100000). Fais ensuite UN geste de visiteur facultatif si la page en propose un visible : menu déroulant, accordéon, onglet ou question FAQ, jamais un formulaire ni une connexion. N'ajoute pas de scrolls pour chercher un contrôle. Remonte vers le menu par UN seul grand scroll_web vers le haut (direction up, num_pixels 100000), jamais par petits pas. Aucun aller-retour supplémentaire, ni répétition à une extrémité sans déplacement. Ne répète pas la lecture déjà faite sur la page courante.";
}

function clickInstruction(pages: Array<{ ecran: string; url: string }>): string {
  return `${readingInstruction()} Puis sans go_to clique un lien visible de la page courante (menu, corps ou pied de page) vers une page pas encore relevée de cette liste : ${pages.map(page => `${page.ecran} : ${page.url}`).join(" ; ")}. Attends le chargement puis appelle relever avec l'ecran de la page atteinte. Si aucun lien visible ne mène à une page de la liste, même après avoir examiné le menu : en dernier recours seulement, ouvre ${pages[0]?.url} avec go_to puis appelle relever(ecran="${pages[0]?.ecran}", vue="defaut", raison_go_to="explique quel lien manque ou est inutilisable").`;
}

export function construireExploration(pages: Array<{ ecran: string; url: string }>, site: string, version: string, pagesCliquees = 4): Consigne {
  const clicked = clickedCount(pages.length, pagesCliquees);
  const tests = pages.map(page => ({ id: `exploration--${page.ecran}`, logiciel: site, source: "exploration", releves: [{ ecran: page.ecran, vue: "defaut" }],
    url_depart: page.url, version_cible: version, timeout_s: 600, markdown: "", regles: [] }));
  const course = pages.map((page, index) => ({ ecran: page.ecran, vue: "defaut", key: `${page.ecran}--defaut`, part: index + 1,
    test_id: tests[index].id, address: page.url, here: `location.href === ${JSON.stringify(page.url)}` }));
  return { tests, course, dropped: [], start: pages[0].url,
    instructions: [...COURSE_RULES, "Si une bannière de cookies apparaît, refuse-la (Refuser / Tout refuser / Continuer sans accepter / Reject all), ne l’accepte jamais.", "Simple visiteur : ne remplis et ne soumets aucun formulaire, ne te connecte jamais. N'ouvre aucun onglet ni fenêtre."].join("\n"),
    task: ["Nouveau passage : aucune page n'a encore été relevée dans cette session. La page déjà ouverte ne prouve aucun avancement. Commence à la partie 1, même si le navigateur affiche une partie ultérieure.", ...pages.map((page, index) => `Partie ${index + 1} : ${index === 0
      ? `si l'onglet n'affiche pas ${page.url}, ouvre cette adresse avec go_to et note raison_go_to="page de départ absente de l'onglet" au relevé. Appelle relever(ecran="${page.ecran}", vue="defaut"). ${readingInstruction()}`
      : index <= clicked ? clickInstruction(pages.slice(1))
      : `ouvre ${page.url} avec go_to dans l'onglet courant, attends le chargement puis appelle relever(ecran="${page.ecran}", vue="defaut", raison_go_to="page hors quota de clics demandé"). ${readingInstruction()}`}`),
      'Après toutes les pages, appelle terminer(etat="reussi"). Si une page est inaccessible, continue les autres.'].join("\n"),
    tools: [{ name: "relever", description: "Enregistre la page chargée.", input_schema: { type: "object", properties: { ecran: { type: "string", enum: pages.map(page => page.ecran) }, vue: { type: "string", enum: ["defaut"] }, raison_go_to: { type: "string", description: "Seulement après go_to : raison concrète du recours à une adresse plutôt qu'à un lien." } }, required: ["ecran", "vue"] } }, END_TOOL] };
}

function overlap(a: Zone, b: Zone): boolean {
  const width = Math.max(0, Math.min(a.x + a.largeur, b.x + b.largeur) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.hauteur, b.y + b.hauteur) - Math.max(a.y, b.y));
  return 2 * width * height > Math.min(a.largeur * a.hauteur, b.largeur * b.hauteur);
}
function pageStatus(findings: Finding[]): Statut {
  return (["VERIFIED_FAIL", "SUSPECTED", "INCONCLUSIVE"] as Statut[]).find(status => findings.some(finding => !finding.explique_par && finding.statut === status)) ?? "PASS";
}
const kinds = { "cut-off-text": "texte-coupe", "overlapping-text": "chevauchement", "misaligned-element": "decalage", "distorted-image": "image-deformee", "unreadable-contrast": "contraste-illisible" };
const descriptions = { "cut-off-text": "Un texte semble coupé.", "overlapping-text": "Des textes semblent se chevaucher.", "misaligned-element": "Un élément semble décalé.", "distorted-image": "Une image semble déformée.", "unreadable-contrast": "Un texte semble difficile à lire." };
const sorts = { page_en_erreur: "page-erreur", image_cassee: "image-cassee", defilement_horizontal: "defilement-horizontal", debordement: "debordement", texte_rogne: "texte-rogne", lien_casse: "lien-casse", texte_erreur: "texte-erreur", erreur_console: "erreur-console", texte_non_traduit: "texte-non-traduit" };
const expected = { page_en_erreur: "Une réponse HTTP inférieure à 400.", image_cassee: "Une image décodable.", defilement_horizontal: "La page tient dans la largeur du document.", debordement: "Le contenu tient dans sa boîte.", texte_rogne: "Le texte reste lisible sans être rogné.", lien_casse: "Une réponse HTTP inférieure à 400.", texte_erreur: "Aucun texte d'erreur affiché.", erreur_console: "Aucune erreur JavaScript.", texte_non_traduit: "Le texte respecte la langue déclarée de la page ou du bloc." };

export async function explorer(options: ExplorerOptions, deps: ExplorerDependencies) {
  const { url, max, vault, sortie, port } = options;
  const { base, runtime, session, signal, log = console.log } = deps;
  const navigation = { arrivees: {} as Record<string, "clic" | "adresse" | "depart">, clics: 0, defilements: 0, goTo: 0, defilementsDepart: 0 };
  let clickedPages = 0, hadClick = false, hadGoTo = false, currentScreen: string | undefined;
  const onglets = deps.onglets ?? (async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Liste des onglets CDP inaccessible.");
    return await response.json() as Array<{ type: string; url: string }>;
  });
  const urlCourante = deps.urlCourante ?? (async () => {
    const tabs = (await onglets()).filter(tab => tab.type === "page");
    return tabs.length === 1 ? tabs[0].url : null;
  });
  const diagnosticReleve = async (ecran: string, action: () => Promise<ReleveCapture>) => {
    try { return await action(); }
    catch (error) {
      const page = pages.find(page => page.ecran === ecran);
      if (page) {
        page.etat = "non_visitee"; page.statut = "INCONCLUSIVE"; page.fin = new Date().toISOString();
        page.raison = error instanceof Error ? error.message : String(error);
        save();
      }
      let context = "URL et nombre d'onglets page CDP indisponibles";
      try {
        const tabs = (await onglets()).filter(tab => tab.type === "page");
        context = `${tabs.length} onglet(s) page CDP ; URL : ${JSON.stringify(tabs.map(tab => tab.url))}`;
      } catch { /* Le diagnostic CDP ne doit pas masquer l'exception du relevé. */ }
      log(`Relevé ${ecran} : ${context} ; exception : ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      throw error;
    }
  };
  const normalized = (address: string, query = false) => {
    const parsed = new URL(address);
    normalizePageQuery(parsed);
    return parsed.origin + parsed.pathname.replace(/\/$/, "") + (query ? parsed.search : "");
  };
  const started = Date.now();
  const site = options.site ?? new URL(url).hostname.replace(/^www\./, "").replaceAll(".", "-");
  if (options.site !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(site)) throw new Error("Site invalide : utiliser lettres, chiffres, tirets ou soulignements.");
  const folder = join(vault, site, "passages");
  const version = String((existsSync(folder) ? readdirSync(folder).filter(name => name.endsWith(".md")).length : 0) + 1);
  const references = lireReferences(vault, site).filter(ref => ref.vue === "defaut" && Number(ref.version) < Number(version)).sort((a, b) => Number(b.version) - Number(a.version));
  const versionReference = references[0]?.version ?? null;
  const notes = lireNotes(vault, site);
  const decisions = lireDecisions(vault, site);
  let sitemap = false;
  const loginUrl = (address: string) => /\/(?:log-?in|sign-?in|connexion|auth)(?:\/|$)/i.test(new URL(address, url).pathname);
  const startAddresses = new Set([normalized(url, true)]);
  const antiRobot = (reason: string) => reason.startsWith("ce site bloque les robots");
  let blocage: string | null = loginUrl(url) ? "Connexion demandée (adresse de connexion)." : null;
  const siteFetch = deps.fetch ?? (options.reseauPublic ? fetchPublic : fetch);
  const request: typeof fetch = async (address, init) => {
    if (blocage) throw new Error(blocage);
    const response = await siteFetch(address, { ...init, ...(signal ? { signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal } : {}) });
    const body = await response.clone().text();
    const metadata = !new Headers(init?.headers).get("Accept")?.includes("text/html");
    const start = !metadata && startAddresses.has(normalized(String(address), true));
    const login = response.status >= 300 && response.status < 400 && response.headers.get("location");
    const reason = login && loginUrl(login) ? "Connexion demandée (redirection vers la connexion)." : metadata && [404, 410].includes(response.status) ? null : detecterBlocage(body, response.status);
    if (start && login) startAddresses.add(normalized(new URL(login, String(address)).href, true));
    if (reason && (start || (metadata && antiRobot(reason)))) blocage = reason;
    if (reason && (!metadata || antiRobot(reason))) throw new Error(reason);
    if (response.ok && /<(?:[\w-]+:)?(?:urlset|sitemapindex)\b/i.test(body)) sitemap = true;
    return response;
  };
  const render = deps.render ?? (deps.fetch ? undefined : (address: string, allowed: (url: string) => boolean) => renderPage(port, address, allowed));
  const discovery = await discoverPages(url, { max, fetch: request, render: render ? async (address, allowed) => {
    if (blocage) return;
    const document = await render(address, allowed);
    const reason = document && detecterBlocage(document.body);
    if (reason) {
      if (startAddresses.has(normalized(address, true)) || antiRobot(reason)) blocage = reason;
      throw new Error(reason);
    }
    return document;
  } : undefined });
  for (const error of discovery.errors) if (error.message.startsWith("Rendu :")) log(`${error.url} — ${error.message}`);
  if (blocage && !discovery.pages.length) discovery.pages.push(url);
  const used = new Set<string>();
  const pages: ExplorationPage[] = discovery.pages.map((address, index) => {
    const path = decodeURIComponent(new URL(address).pathname).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "accueil";
    let ecran = path, n = 1;
    while (used.has(ecran)) { const suffix = `-${++n}`; ecran = path.slice(0, 60 - suffix.length) + suffix; }
    used.add(ecran);
    const reference = references.find(ref => ref.ecran === ecran);
    return { ecran, url: address, ordre: index + 1, trouvee_par: new URL(address).pathname === "/" ? "adresse" : sitemap ? "sitemap" : "lien", agent: 1,
      etat: "a_visiter", http: null, debut: null, fin: null, capture: null, reference: reference ? { fichier: join(vault, reference.chemin), version: reference.version } : null, holo: null, statut: null };
  });
  const id = explorationPassageId(new Date(started));
  const createAgent = (number: number) => ({ agent: number, session_id: null as string | null, etat: "en_attente", pages: [] as string[], replay_url: null as string | null, duree_s: null as number | null, cout_usd: null as number | null, raison: null as string | null });
  let agent = createAgent(1);
  const report = { format: "horama-exploration-1", etat: "en_cours", passage_id: id, adresse: url, site, version, version_reference: versionReference,
    le: new Date(started).toISOString(), fin: null as string | null, duree_s: null as number | null, cout_usd: null as number | null,
    trouvees: { par: sitemap ? "sitemap" : "liens", plafond: max, nombre: pages.length, exclues: discovery.excluded.map(item => ({ url: item.url, raison: ({ form: "formulaire", file: "pdf", login: "connexion", robots: "robots.txt", external: "autre domaine", limit: "au-delà du plafond" } as Record<string, string>)[item.reason] ?? item.reason })) },
    agents: [agent], pages, constats: [] as Finding[], totaux: { pages_trouvees: pages.length, pages_visitees: 0, defauts: 0, doutes: 0, sans_conclusion: 0, par_sorte: {} as Record<string, number> } };
  mkdirSync(join(sortie, "captures"), { recursive: true });
  const save = () => {
    const counted = report.constats.filter(finding => !finding.explique_par);
    report.totaux = { pages_trouvees: pages.length, pages_visitees: pages.filter(page => page.etat === "visitee").length,
      defauts: counted.filter(finding => finding.statut === "VERIFIED_FAIL").length, doutes: counted.filter(finding => finding.statut === "SUSPECTED").length,
      sans_conclusion: counted.filter(finding => finding.statut === "INCONCLUSIVE").length,
      par_sorte: counted.reduce((totals, finding) => { totals[finding.sorte] = (totals[finding.sorte] ?? 0) + 1; return totals; }, {} as Record<string, number>) };
    writeFileSync(join(sortie, "exploration.json.tmp"), JSON.stringify(report, null, 2));
    renameSync(join(sortie, "exploration.json.tmp"), join(sortie, "exploration.json"));
  };
  save();
  log(`${pages.length} pages trouvées.`);
  const clickTarget = clickedCount(pages.length, options.pagesCliquees ?? 4);
  const consigne = pages.length ? construireExploration(pages, site, version, clickTarget) : null;
  const attempts = new Map<string, number>();
  const finalUrls = new Map<string, string | null>();
  const resolveFinal = async (page: ExplorationPage, requestSignal?: AbortSignal) => {
    if (!finalUrls.has(page.url)) {
      try {
        const response = await siteFetch(page.url, { redirect: "follow", signal: requestSignal });
        finalUrls.set(page.url, response.url && new URL(response.url).origin === new URL(page.url).origin ? response.url : null);
      } catch { finalUrls.set(page.url, null); }
    }
    return finalUrls.get(page.url);
  };
  const acquired = new Map<string, ReleveCapture>();
  const pending = new Map<string, { findings: Finding[]; http: number | null; holo: ExplorationPage["holo"] }>();
  const finding = (page: Pick<ExplorationPage, "ecran">, source: Finding["source"], findings: Finding[], fields: Partial<Finding>): Finding => ({
    id: `${page.ecran}--${source}--${findings.filter(item => item.source === source).length + 1}`, ecran: page.ecran, vue: "defaut", source,
    sorte: "non-conclu", statut: "INCONCLUSIVE", description: "La vérification n'a pas pu se faire.", textes_a_surligner: [], preuve: {}, capture: `captures/${page.ecran}.png`, agent: pages.find(candidate => candidate.ecran === page.ecran)?.agent ?? agent.agent, page: { largeur: 1280, hauteur: 900 }, ...fields });
  const inconclusive = (page: Pick<ExplorationPage, "ecran">, source: Finding["source"], findings: Finding[], raison: string) => findings.push(finding(page, source, findings, { raison, description: raison }));
  const markUnvisited = (page: ExplorationPage, reason: string) => {
    page.etat = "non_visitee"; page.raison = reason; page.statut = "INCONCLUSIVE"; page.fin = new Date().toISOString();
    if (!report.constats.some(item => item.ecran === page.ecran)) inconclusive(page, "controle", report.constats, reason);
    save();
  };
  const markBlocked = (reason: string) => {
    blocage = reason;
    agent.raison = reason;
    for (const page of pages.filter(page => page.etat !== "visitee")) {
      markUnvisited(page, reason);
    }
    save();
  };
  const markRenderedBlock = (page: ExplorationPage | undefined, reason: string) => {
    if (antiRobot(reason) || (page && startAddresses.has(normalized(page.url, true)))) markBlocked(reason);
    else if (page) markUnvisited(page, reason);
  };
  const renderedBlock = async (client: ExplorationCdp) => {
    const result = await client.send("Runtime.evaluate", { expression: "({ html: document.documentElement.outerHTML, status: performance.getEntriesByType('navigation')[0]?.responseStatus || null })", returnByValue: true });
    const value = result.result?.value;
    return typeof value?.html === "string" ? detecterBlocage(value.html, value.status) : null;
  };
  const markResult = (page: ExplorationPage, passageId: string, replayUrl?: string): ResultatVerification => {
    const findings = report.constats.filter(item => item.ecran === page.ecran);
    page.statut = pageStatus(findings);
    const controls = findings.filter(item => item.source === "controle" && item.statut === "VERIFIED_FAIL");
    const reason = findings.find(item => item.statut === "INCONCLUSIVE")?.raison;
    return { passage_id: passageId, test_id: `exploration--${page.ecran}`, version_testee: version, version_reference: versionReference ?? version,
      statut: page.statut, ecrans: [page.ecran], valeurs: Object.fromEntries(controls.map((item, index) => [`${page.ecran}.${item.sorte} ${index + 1}`, String(item.preuve.mesure)])),
      calcul: controls.map(item => item.description).join(" ; "), niveau_de_preuve: controls.length ? "releve" : "aucun",
      ecarts_visuels: findings.flatMap(item => item.source !== "controle" && !item.explique_par && item.zone && (item.statut === "PASS" || item.statut === "SUSPECTED") ? [{ id: item.id, ecran: item.ecran, vue: item.vue, description: item.description, zone: item.zone, statut: item.statut, ...(item.decision_id ? { decision_id: item.decision_id } : {}) }] : []),
      captures: page.capture?.url ? [page.capture.url] : [], ...(replayUrl ? { replay_url: replayUrl } : {}), ...(reason ? { raison: reason } : {}) };
  };
  const wrapped: BasePassages = {
    async insererPassage(passage) { await base.insererPassage(passage); save(); },
    async insererEvenement(event) { agent.session_id = event.session_id; agent.etat = "en_cours"; save(); await base.insererEvenement(event); },
    deposerPng: (path, png) => base.deposerPng(path, png),
    async enregistrerCapture(capture) {
      await base.enregistrerCapture(capture);
      const page = pages.find(page => page.ecran === capture.ecran);
      if (!page) return;
      const data = pending.get(page.ecran);
      if (!data) {
        page.etat = "non_visitee"; page.raison = "La capture n'a pas pu être vérifiée.";
        inconclusive(page, "controle", report.constats, page.raison); save(); return;
      }
      agent.session_id = capture.session_id;
      Object.assign(page, { etat: "visitee", fin: capture.prise_le, http: data.http, holo: data.holo,
        capture: { fichier: `captures/${page.ecran}.png`, url: capture.url, largeur: capture.largeur, hauteur: capture.hauteur, defilement: capture.defilement } });
      report.constats.push(...data.findings);
      page.statut = pageStatus(data.findings); save();
    },
    async enregistrerResultat(result) { await base.enregistrerResultat(result); save(); },
    async terminerPassage(result) {
      await base.terminerPassage(result);
      const costs = [...report.agents.flatMap(item => item.cout_usd === null ? [] : [item.cout_usd]),
        ...report.pages.flatMap(page => page.holo?.cout_usd == null ? [] : [page.holo.cout_usd])];
      report.cout_usd = costs.length ? costs.reduce((sum, cost) => sum + cost, 0) : null; save();
    },
  };
  const returned = { ...report, navigation };
  let finalizationFailure: string | null = null;
  try {
    if (blocage) {
      markBlocked(blocage); report.etat = "fini"; agent.etat = "fini"; report.cout_usd = 0;
      const passage = { id, logiciel: site, version_testee: version, version_reference: versionReference ?? version,
        etat: "en_cours" as const, debut: new Date(started).toISOString() };
      try {
        await base.insererPassage(passage);
        for (const page of pages) await base.enregistrerResultat(markResult(page, id));
        await base.terminerPassage({ passage: { ...passage, etat: "echec", fin: new Date().toISOString(), duree_s: (Date.now() - started) / 1000, cout_usd: 0 },
          tests: pages.map(page => ({ test_id: `exploration--${page.ecran}`, session_id: "", etat: "non_concluant", raison: page.raison,
            ecrans_releves: [], duree_s: 0, cout_usd: 0, etapes: 0 })) });
      } catch {
        finalizationFailure = "Le bilan du blocage n'a pas pu être enregistré en base.";
        log(finalizationFailure);
      }
      return returned;
    }
    if (!consigne) {
      const failed = signal?.aborted || discovery.errors.length > 0;
      report.etat = failed ? "interrompu" : "fini"; agent.etat = failed ? "tombe" : "fini";
      if (discovery.errors.length) {
        agent.raison = discovery.errors.map(error => `${error.url} : ${error.message}`).join(" ; ");
        log(`Découverte impossible : ${agent.raison}`);
      }
      return returned;
    }
    let launches = 0;
    const unfinished = () => pages.filter(page => page.etat !== "visitee" && page.etat !== "non_visitee");
    const trackedSession: Session = async input => {
      let active: SessionEnCours | undefined;
      let stopped = false;
      let completed = false;
      let sessionStarted = Date.now();
      const launch = async (plan: Consigne) => {
        launches++; completed = false; sessionStarted = Date.now();
        hadClick = false; hadGoTo = false; currentScreen = undefined;
        const clicked = launches === 1 ? clickTarget : 0;
        try {
          const maxSteps = explorationStepBudget(plan.course.length, clicked);
          active = await session({ ...input, consigne: plan, maxSteps, maxTimeS: explorationTimeBudget(maxSteps),
            async onStep(step) {
              for (const action of step.action.split(/\s*,\s*/)) {
                if (action === "Clique") { navigation.clics++; hadClick = true; }
                if (action === "Ouvre une page") { navigation.goTo++; hadGoTo = true; }
                if (action === "Défile") {
                  navigation.defilements++;
                  if (currentScreen === pages[0]?.ecran && !hadClick && !hadGoTo) navigation.defilementsDepart++;
                }
              }
              await input.onStep(step);
            },
            async onCreated(sessionId) {
              agent.session_id = sessionId; agent.etat = "en_cours"; save();
              await input.onCreated(sessionId);
            },
            async onTool(name, args) {
              if (blocage) return input.onTool("terminer", { etat: "echec", raison: blocage });
              const remaining = () => {
                const page = unfinished()[0];
                if (page && clickedPages < clicked) return `${pages.filter(page => page.etat === "visitee").length}/${pages.length} pages relevées dans ce passage. ${clickInstruction(unfinished())} Ne termine pas avant les relevés restants.`;
                return page ? `${pages.filter(page => page.etat === "visitee").length}/${pages.length} pages relevées dans ce passage. ${readingInstruction()} Ouvre ${page.url} avec go_to puis appelle relever(ecran="${page.ecran}", vue="defaut", raison_go_to="page hors quota de clics demandé"). Ne termine pas avant les relevés restants.` : `Tous les relevés sont acquis. ${readingInstruction()} Puis appelle terminer(etat="reussi").`;
              };
              if (name === "terminer" && args.etat === "reussi" && unfinished().length) return `Fin refusée : des pages restent à visiter. ${remaining()}`;
              if (name === "relever") {
                let address: string | null = null;
                try { address = await urlCourante(); } catch { /* Le hook contrôle le relevé si l'onglet est illisible. */ }
                if (address) {
                  let matched: ExplorationPage | undefined;
                  try {
                    const addresses = (page: ExplorationPage) => [page.url, ...(page.url_finale ? [page.url_finale] : [])];
                    matched = pages.find(page => addresses(page).some(url => normalized(url, true) === normalized(address!, true)));
                    if (!matched) {
                      const candidates = pages.filter(page => addresses(page).some(url => normalized(url) === normalized(address!)));
                      if (candidates.length === 1) matched = candidates[0];
                    }
                  } catch { /* Adresse hors liste. */ }
                  if (!matched) {
                    const requested = unfinished().find(page => page.ecran === args.ecran);
                    if (requested) {
                      const final = await resolveFinal(requested, signal);
                      if (final && normalized(final, true) === normalized(address, true)) matched = requested;
                    }
                  }
                  if (!matched) {
                    let client: ExplorationCdp | undefined;
                    try {
                      client = await (deps.connecter ?? connecterCdp)(port, address);
                      const reason = await renderedBlock(client);
                      if (reason) {
                        markRenderedBlock(pages.find(page => page.ecran === args.ecran), reason);
                        if (blocage) return input.onTool("terminer", { etat: "echec", raison: reason });
                        return `${reason}\nContinue les autres relevés. ${remaining()}`;
                      }
                    } catch { /* Adresse hors liste sans preuve de blocage. */ }
                    finally { client?.close(); }
                    log(`Adresse hors liste : ${address}`);
                    const next = unfinished()[0];
                    return `Cette adresse n'est pas dans la liste : ${address}. ${next ? `Ouvre ${next.url} avec go_to puis appelle relever(ecran="${next.ecran}", vue="defaut").` : remaining()}`;
                  }
                  if (matched.etat !== "visitee" && matched.etat !== "non_visitee") args = { ...args, ecran: matched.ecran };
                }
              }
              const skipped = pages.find(page => page.ecran === args.ecran && page.etat === "non_visitee");
              if (name === "relever" && skipped) return `${skipped.raison}\n${remaining()}`;
              const response = await input.onTool(name, args);
              if (blocage) return input.onTool("terminer", { etat: "echec", raison: blocage });
              const inaccessible = pages.find(page => page.ecran === args.ecran && page.etat === "non_visitee");
              if (name === "relever" && inaccessible) return `${inaccessible.raison}\nContinue les autres relevés. ${remaining()}`;
              const accepted = pages.find(page => page.ecran === args.ecran && page.etat === "visitee");
              if (name === "relever" && accepted && !navigation.arrivees[accepted.ecran]) {
                const mode = accepted === pages[0] && launches === 1 ? "depart" : hadGoTo ? "adresse" : hadClick ? "clic" : "adresse";
                navigation.arrivees[accepted.ecran] = mode;
                accepted.arrivee = mode;
                save();
                if (mode === "clic") clickedPages++;
                log(`${accepted.ecran} : ${mode}`);
                if (hadGoTo) log(`${accepted.ecran} : raison go_to : ${typeof args.raison_go_to === "string" && args.raison_go_to.trim() ? args.raison_go_to.trim() : "à mesurer (raison non fournie par H)"}`);
                currentScreen = accepted.ecran; hadClick = false; hadGoTo = false;
              }
              if (name === "terminer") completed = args.etat === "reussi";
              return name === "relever" ? `${response}\n${remaining()}` : response;
            },
          });
          return active;
        } catch {
          agent.etat = "tombe"; agent.raison = "La session n'a pas pu être créée."; save();
          throw new Error(agent.raison);
        }
      };
      const first = await launch(input.consigne);
      return {
        id: first.id,
        async stop() { stopped = true; await active?.stop?.(); },
        fin: (async () => {
          let totalCost: number | null = 0, steps = 0;
          for (;;) {
            let result: ResultatSession;
            let closeFailed = false;
            const running = active;
            try {
              if (!running) throw new Error("Session absente.");
              result = await running.fin;
            } catch {
              result = { id: running?.id ?? "", muted: false, cout_usd: null, etapes: 0, erreur: "La session a été interrompue." };
            } finally {
              try { await running?.stop?.(); await running?.confirmStopped?.(); }
              catch { closeFailed = true; finalizationFailure = "La fermeture de la session n'a pas pu être confirmée."; agent.raison = finalizationFailure; }
            }
            totalCost = totalCost === null || result.cout_usd === null ? null : totalCost + result.cout_usd;
            steps += result.etapes;
            agent.cout_usd = result.cout_usd; agent.duree_s = (Date.now() - sessionStarted) / 1000;
            agent.replay_url = result.replay_url ?? null;
            agent.etat = completed && !result.erreur && !result.muted ? "fini" : "tombe";
            if (agent.etat === "tombe") agent.raison ??= result.erreur ?? (result.muted ? "La session est restée sans réponse." : "Session arrêtée avant la fin des visites (budget d'étapes ou erreur).");
            save();
            const remaining = unfinished();
            if (!remaining.length || signal?.aborted || stopped || closeFailed || launches >= 2) {
              for (const page of remaining) page.raison ??= signal?.aborted ? "Le passage a été annulé."
                : closeFailed ? "Page non atteinte : la fermeture de la session précédente n'est pas confirmée."
                : "Page non atteinte après deux sessions (budget d'étapes ou erreur).";
              if (!remaining.length && !closeFailed) {
                const { erreur: _erreur, ...visited } = result;
                return { ...visited, muted: false, cout_usd: totalCost, etapes: steps };
              }
              return { ...result, muted: false, cout_usd: totalCost, etapes: steps,
                ...(closeFailed ? { erreur: "La fermeture de la session n'a pas pu être confirmée." } : {}),
                ...(result.muted ? { erreur: "La session est restée sans réponse." } : {}) };
            }
            agent = createAgent(report.agents.length + 1); report.agents.push(agent);
            for (const page of remaining) { page.agent = agent.agent; page.etat = "a_visiter"; }
            log(`Relance unique pour ${remaining.length} pages restantes.`); save();
            try { await launch(construireExploration(remaining, site, version, 0)); }
            catch {
              for (const page of remaining) page.raison ??= "La relance n'a pas pu démarrer ; page non atteinte.";
              return { ...result, muted: false, erreur: "La relance n'a pas pu démarrer.", cout_usd: totalCost, etapes: steps };
            }
          }
        })(),
      };
    };
    const runner = creerCoureur({ vault, base: wrapped, session: trackedSession, signal, consigne, identifiant: () => id, hookTimeoutMs: 550_000,
      writeReport(target, passage, results) {
        for (const test of passage.tests) {
          const page = pages.find(page => test.test_id === `exploration--${page.ecran}`);
          const owner = report.agents.find(item => item.agent === page?.agent);
          if (owner) {
            test.session_id = owner.session_id ?? "";
            delete test.replay_url;
            if (owner.replay_url) test.replay_url = owner.replay_url;
          }
        }
        return ecrireRapportPassage(target, passage, results);
      },
      relever: (ecran, vue, hookSignal) => diagnosticReleve(ecran, async () => {
        const page = pages.find(page => page.ecran === ecran);
        if (!page) {
          inconclusive({ ecran }, "controle", report.constats, "Page inconnue dans le parcours.");
          save();
          return runtime.relever(ecran, vue);
        }
        page.etat = "en_cours"; page.debut = new Date().toISOString(); agent.etat = "en_cours";
        if (!agent.pages.includes(ecran)) agent.pages.push(ecran);
        save();
        let client: ExplorationCdp | undefined;
        const close = () => client?.close();
        hookSignal?.addEventListener("abort", close, { once: true });
        page.cookies = "aucune";
        let inaccessible: string | null = null;
        try {
          const connect = deps.connecter ?? connecterCdp;
          try { client = await connect(port, page.url_finale ?? finalUrls.get(page.url) ?? page.url); }
          catch {
            const final = await resolveFinal(page, hookSignal);
            client = await connect(port, final ?? page.url);
          }
          const reason = await renderedBlock(client);
          if (reason) { inaccessible = reason; markRenderedBlock(page, reason); throw new Error(reason); }
          page.cookies = await prepareCapture(client);
        } catch { /* Les contrôles signalent une connexion indisponible. */ }
        if (inaccessible) { hookSignal?.removeEventListener("abort", close); close(); throw new Error(inaccessible); }
        let capture: ReleveCapture;
        let consentFailed = false;
        try { capture = await runtime.relever(ecran, vue, async () => {
          try { if (client && await dismissCookies(client)) page.cookies = "refusee"; }
          catch { consentFailed = true; }
        }); }
        catch (error) { hookSignal?.removeEventListener("abort", close); close(); throw error; }
        hookSignal?.throwIfAborted();
        const matches = (address: string) => {
          try {
            const actual = new URL(capture.url_page), expected = new URL(address);
            return actual.origin === expected.origin && actual.pathname.replace(/\/+$/, "") === expected.pathname.replace(/\/+$/, "")
              && [...expected.searchParams].every(([key, value]) => actual.searchParams.get(key) === value)
              && actual.searchParams.get("filtre") === expected.searchParams.get("filtre");
          } catch { return false; }
        };
        let accepted = matches(page.url);
        let reason: string | undefined;
        try {
          const actual = new URL(capture.url_page);
          if (!/^https?:$/.test(actual.protocol)) reason = "La page n'a pas pu être chargée.";
          else if (actual.origin !== new URL(page.url).origin) reason = `La page redirige vers un autre site : ${capture.url_page}`;
        } catch { reason = "La page n'a pas pu être chargée."; }
        if (!accepted && !reason) {
          const final = await resolveFinal(page, hookSignal);
          if (final && matches(final)) { accepted = true; page.url_finale = final; }
        }
        if (!accepted || reason) {
          hookSignal?.removeEventListener("abort", close); close();
          const count = (attempts.get(ecran) ?? 0) + 1; attempts.set(ecran, count);
          if (reason || count >= 2) {
            page.etat = "non_visitee"; page.fin = new Date().toISOString();
            page.raison = reason ?? `Page non atteinte après 2 essais : ${page.url}`;
            save();
          }
          return capture;
        }
        const step = consigne.course.find(step => step.ecran === ecran);
        if (step) step.address = capture.url_page;
        acquired.set(ecran, capture);
        writeFileSync(join(sortie, `captures/${ecran}.png`), capture.png);
        const findings: Finding[] = [];
        if (consentFailed) inconclusive(page, "controle", findings, "La revérification du consentement avant capture a échoué.");
        const controlZones = new Map<string, Zone>();
        let http: number | null = null;
        const hookFetch: typeof fetch = (address, init) => (deps.fetch ?? fetch)(address, { ...init, ...(hookSignal ? { signal: init?.signal ? AbortSignal.any([hookSignal, init.signal]) : hookSignal } : {}) });
        const linkFetch: typeof fetch = (address, init) => siteFetch(address, { ...init, ...(hookSignal ? { signal: init?.signal ? AbortSignal.any([hookSignal, init.signal]) : hookSignal } : {}) });
        const visualAnalysis = Promise.resolve().then(() => (deps.holo ?? askHolo)(Buffer.from(capture.png), { url: capture.url_page, fetch: hookFetch }))
          .then(result => ({ result }), error => ({ error }));
        try {
          if (!client) throw new Error("Connexion CDP indisponible.");
          hookSignal?.throwIfAborted();
          const status = await client.send("Runtime.evaluate", { expression: "performance.getEntriesByType('navigation')[0]?.responseStatus || null", returnByValue: true });
          http = status.result.value;
          const defects = await (deps.controler ?? controlerPage)(client, { fetch: linkFetch });
          for (const defect of defects) {
            const item = finding(page, "controle", findings, { sorte: sorts[defect.sorte], statut: "VERIFIED_FAIL", description: defect.message,
              preuve: { ...(defect.selecteur ? { element: defect.selecteur } : {}), mesure: String(defect.valeur ?? defect.message), attendu: expectedText(defect.sorte),
                ...(["image_cassee", "lien_casse"].includes(defect.sorte) ? { url: String(defect.valeur).replace(/ : \d+$/, "") } : {}),
                ...(defect.sorte === "erreur_console" ? { console: String(defect.valeur).slice(0, 300) } : {}) },
              textes_a_surligner: defect.sorte === "texte_erreur" ? [String(defect.valeur)] : [],
              ...(!["page_en_erreur", "erreur_console", "defilement_horizontal"].includes(defect.sorte) && defect.zone ? { zone: defect.zone } : {}) });
            if (item.zone) {
              const documentZone = item.zone;
              const zone = { ...documentZone, x: documentZone.x - capture.defilement[0], y: documentZone.y - capture.defilement[1] };
              controlZones.set(item.id, zone);
              item.zone = zone;
              if (zone.x < 0 || zone.y < 0 || zone.x + zone.largeur > 1280 || zone.y + zone.hauteur > 900) {
                delete item.zone;
                try {
                  let extra: { png: Buffer; zone?: Zone } | undefined;
                  if (runtime.capturerZone) {
                    try {
                      const captured = await runtime.capturerZone(documentZone);
                      const zone = captured.zone;
                      if (zone && [zone.x, zone.y, zone.largeur, zone.hauteur].every(Number.isFinite)
                        && zone.x >= 0 && zone.y >= 0 && zone.largeur > 0 && zone.hauteur > 0
                        && zone.x + zone.largeur <= 1280 && zone.y + zone.hauteur <= 900) extra = captured;
                    } catch { /* Repli sur la capture CDP. */ }
                  }
                  extra ??= await captureDefect(client, documentZone, capture.defilement, { doux: options.doux });
                  const file = `captures/${item.id}.png`;
                  writeFileSync(join(sortie, file), extra.png);
                  item.capture = file; item.zone = extra.zone;
                } catch { /* Le constat reste prouvé sans zone hors image. */ }
              }
            }
            findings.push(item);
          }
        } catch { inconclusive(page, "controle", findings, "Les contrôles de la page n'ont pas pu se terminer."); }
        finally { hookSignal?.removeEventListener("abort", close); client?.close(); }
        hookSignal?.throwIfAborted();
        let holo: NonNullable<ExplorationPage["holo"]> = { etat: "non_lance", modele: null, duree_ms: 0, ecartes_sans_zone: 0, jetons: null, cout_usd: null };
        try {
          const analysis = await visualAnalysis;
          if (!("result" in analysis)) throw analysis.error;
          const result = analysis.result;
          holo = { etat: result.status === "INCONCLUSIVE" ? /timeout|timed|délai/i.test(result.message) ? "hors_delai" : "echec" : "fait", modele: result.model, duree_ms: result.durationMs, ecartes_sans_zone: 0,
            jetons: result.usage ? { entree: result.usage.prompt_tokens, sortie: result.usage.completion_tokens } : null, cout_usd: result.cost_usd };
          if (result.status === "INCONCLUSIVE") inconclusive(page, "holo", findings, `Le regard visuel n'a pas abouti : ${result.message}`);
          for (const visual of result.findings) {
            if (!visual.zone) { holo.ecartes_sans_zone++; continue; }
            const zone = visual.zone;
            const explained = findings.find(item => item.source === "controle" && item.statut === "VERIFIED_FAIL" && controlZones.has(item.id) && overlap(zone, controlZones.get(item.id) ?? zone));
            findings.push(finding(page, "holo", findings, { sorte: kinds[visual.kind], statut: "SUSPECTED", description: descriptions[visual.kind], zone,
              preuve: { modele: result.model, phrase: visual.sentence }, ...(explained ? { explique_par: explained.id } : {}) }));
          }
        } catch { holo.etat = "echec"; inconclusive(page, "holo", findings, "Le regard visuel n'a pas pu se faire."); }
        pending.set(ecran, { findings, http, holo });
        return capture;
      }),
      verifier({ test, acquired: captures, passageId, replayUrl }) {
        const page = pages.find(page => `exploration--${page.ecran}` === test.id);
        if (!page) return { passage_id: passageId, test_id: test.id, version_testee: version, version_reference: versionReference ?? version,
          statut: "INCONCLUSIVE", ecrans: [], valeurs: {}, niveau_de_preuve: "aucun", ecarts_visuels: [], captures: [], raison: "Page inconnue dans le parcours." };
        const entry = captures.find(item => item.capture.ecran === page.ecran);
        if (!entry) {
          report.constats = report.constats.filter(item => item.ecran !== page.ecran);
          page.capture = null;
          page.etat = "non_visitee"; page.fin = new Date().toISOString();
          page.raison ??= "Cette page n'a pas été visitée.";
          inconclusive(page, "controle", report.constats, page.raison ?? "Cette page n'a pas été visitée.");
        } else {
          try {
            const reference = references.find(ref => ref.ecran === page.ecran);
            if (reference) {
              const releve = { ecran: page.ecran, vue: "defaut", version, png: entry.png, texte: entry.capture.texte_page, url: entry.capture.url_page };
              const compared = verifierReleve({ releve, releves: [releve], regles: [], decisions,
                reference: readFileSync(join(vault, reference.chemin)), version_reference: reference.version,
                zones_ignorees: (notes.find(note => note.entete.ecran === page.ecran)?.entete.zones_ignorees ?? []) as Zone[] });
              for (const item of compared) report.constats.push(finding(page, "comparaison", report.constats, { ...item, id: `${page.ecran}--comparaison--${compared.indexOf(item) + 1}`, sorte: item.statut === "INCONCLUSIVE" ? "non-conclu" : item.nature ?? "changement", preuve: { reference: page.reference?.fichier ?? join(vault, reference.chemin) } }));
            }
          } catch { inconclusive(page, "comparaison", report.constats, "La comparaison avec la référence n'a pas pu se faire."); }
        }
        const result = markResult(page, passageId, report.agents.find(item => item.agent === page.agent)?.replay_url ?? replayUrl); save(); return result;
      },
    });
    const launched = await runner.lancerPassage({ logiciel: site, version_testee: version, version_reference: versionReference ?? version, tests: consigne.tests.map(test => test.id), cle: "dev" });
    const result = await runner.attendreFin(launched.passage_id);
    report.etat = blocage && !signal?.aborted && !finalizationFailure ? "fini" : signal?.aborted || finalizationFailure || result.passage.etat !== "joue" || pages.some(page => page.etat !== "visitee") ? "interrompu" : "fini";
    if (pages.some(page => page.etat !== "visitee")) { agent.etat = "tombe"; agent.raison ??= "Des pages n'ont pas été visitées."; }
  } catch {
    report.etat = "interrompu"; agent.etat = "tombe"; agent.raison ??= "Le passage a été interrompu.";
  } finally {
    if (blocage) log(blocage);
    if (finalizationFailure) { report.etat = "interrompu"; agent.etat = "tombe"; agent.raison = finalizationFailure; }
    else if (blocage) { agent.raison = blocage; agent.etat = "fini"; }
    for (const page of pages) {
      if (page.etat !== "visitee" && page.etat !== "non_visitee") {
        page.etat = "non_visitee"; page.fin = new Date().toISOString();
        page.raison ??= "Cette page n'a pas été visitée.";
        inconclusive(page, "controle", report.constats, page.raison ?? "Cette page n'a pas été visitée.");
        await base.enregistrerResultat(markResult(page, id));
      }
      if (page.etat === "visitee") {
        try {
          const capture = acquired.get(page.ecran);
          if (!capture) {
            page.etat = "non_visitee"; report.etat = "interrompu";
            page.raison = "La capture de cette page est indisponible.";
            inconclusive(page, "controle", report.constats, "La capture de cette page est indisponible.");
            await base.enregistrerResultat(markResult(page, id)); continue;
          }
          if (!references.some(ref => ref.ecran === page.ecran)) ecrireReference(vault, site, page.ecran, "defaut", version, capture.png);
          if (!notes.some(note => note.entete.ecran === page.ecran)) {
            const product = join(vault, site, "produit"); mkdirSync(product, { recursive: true });
            const file = join(product, `${page.ecran}.md`);
            if (!existsSync(file)) writeFileSync(file, `---\necran: ${JSON.stringify(page.ecran)}\nurl: ${JSON.stringify(page.url)}\nzones_ignorees: []\n---\n`, { flag: "wx" });
          }
        } catch { report.etat = "interrompu"; log(`Mémoire du site non écrite pour ${page.ecran}.`); }
      }
    }
    report.fin = new Date().toISOString(); report.duree_s = (Date.now() - started) / 1000; save();
    log(`${report.totaux.pages_visitees} pages visitées ; durée ${report.duree_s} s ; coût ${report.cout_usd ?? "inconnu"} USD.\n${JSON.stringify(report.totaux.par_sorte)}`);
    log(`Navigation : ${clickedPages} pages par clic, ${Object.values(navigation.arrivees).filter(mode => mode === "adresse").length} par adresse ; ${navigation.clics} clics, ${navigation.defilements} défilements, ${navigation.goTo} go_to ; départ : ${navigation.defilementsDepart} défilements.`);
    Object.assign(returned, report);
  }
  return returned;
}

const expectedText = (kind: keyof typeof expected) => expected[kind];
