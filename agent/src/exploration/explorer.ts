import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EcartVisuel, ResultatVerification, Statut } from "@horama/contrats";
import { verifierReleve } from "@horama/jugement";
import { ecrireReference, lireDecisions, lireNotes, lireReferences } from "@horama/memoire";
import type { BasePassages } from "../base.ts";
import type { BrowserRuntime } from "../browser.ts";
import { COURSE_RULES, END_TOOL } from "../consigne.ts";
import type { Consigne } from "../consigne.ts";
import { creerCoureur } from "../coureur.ts";
import type { ReleveCapture } from "../coureur.ts";
import type { Session } from "../session.ts";
import { connecterCdp } from "./cdp.ts";
import type { ExplorationCdp } from "./cdp.ts";
import { controlerPage } from "./controles.ts";
import { askHolo } from "./holo.ts";
import { discoverPages } from "./pages.ts";

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
  holo: { etat: string; modele: string | null; duree_ms: number; ecartes_sans_zone: number } | null;
  statut: Statut | null;
}
export interface ExplorerOptions { url: string; max: number; sortie: string; vault: string; port: number }
export interface ExplorerDependencies {
  base: BasePassages; runtime: BrowserRuntime; session: Session; signal?: AbortSignal;
  fetch?: typeof fetch; controler?: typeof controlerPage; holo?: typeof askHolo;
  connecter?: (port: number, address: string) => Promise<ExplorationCdp>;
  log?: (message: string) => void;
}

export function construireExploration(pages: Array<{ ecran: string; url: string }>, site: string, version: string): Consigne {
  const tests = pages.map(page => ({ id: `exploration--${page.ecran}`, logiciel: site, source: "exploration", releves: [{ ecran: page.ecran, vue: "defaut" }],
    url_depart: page.url, version_cible: version, timeout_s: 600, markdown: "", regles: [] }));
  const course = pages.map((page, index) => ({ ecran: page.ecran, vue: "defaut", key: `${page.ecran}--defaut`, part: index + 1,
    test_id: tests[index].id, address: page.url, here: `location.href === ${JSON.stringify(page.url)}` }));
  return { tests, course, dropped: [], start: pages[0].url,
    instructions: [...COURSE_RULES, "Simple visiteur : ne remplis et ne soumets aucun formulaire, ne te connecte jamais. N'ouvre aucun onglet ni fenêtre."].join("\n"),
    task: ["Nouveau passage : aucune page n'a encore été relevée dans cette session. La page déjà ouverte ne prouve aucun avancement. Commence à la partie 1, même si le navigateur affiche une partie ultérieure.", ...pages.map((page, index) => `Partie ${index + 1} : ouvre ${page.url} avec go_to dans l'onglet courant, attends le chargement puis appelle relever(ecran="${page.ecran}", vue="defaut").`),
      'Après toutes les pages, appelle terminer(etat="reussi"). Si une page est inaccessible, continue les autres.'].join("\n"),
    tools: [{ name: "relever", description: "Enregistre la page chargée.", input_schema: { type: "object", properties: { ecran: { type: "string", enum: pages.map(page => page.ecran) }, vue: { type: "string", enum: ["defaut"] } }, required: ["ecran", "vue"] } }, END_TOOL] };
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
const sorts = { page_en_erreur: "page-erreur", image_cassee: "image-cassee", defilement_horizontal: "defilement-horizontal", debordement: "debordement", lien_casse: "lien-casse", texte_erreur: "texte-erreur", erreur_console: "erreur-console" };
const expected = { page_en_erreur: "Une réponse HTTP inférieure à 400.", image_cassee: "Une image décodable.", defilement_horizontal: "La page tient dans la largeur du document.", debordement: "Le contenu tient dans sa boîte.", lien_casse: "Une réponse HTTP inférieure à 400.", texte_erreur: "Aucun texte d'erreur affiché.", erreur_console: "Aucune erreur JavaScript." };

export async function explorer(options: ExplorerOptions, deps: ExplorerDependencies) {
  const { url, max, vault, sortie, port } = options;
  const { base, runtime, session, signal, log = console.log } = deps;
  const started = Date.now();
  const site = new URL(url).hostname.replace(/^www\./, "").replaceAll(".", "-");
  const folder = join(vault, site, "passages");
  const version = String((existsSync(folder) ? readdirSync(folder).filter(name => name.endsWith(".md")).length : 0) + 1);
  const references = lireReferences(vault, site).filter(ref => ref.vue === "defaut" && Number(ref.version) < Number(version)).sort((a, b) => Number(b.version) - Number(a.version));
  const versionReference = references[0]?.version ?? null;
  const notes = lireNotes(vault, site);
  const decisions = lireDecisions(vault, site);
  let sitemap = false;
  const request: typeof fetch = async (address, init) => {
    const response = await (deps.fetch ?? fetch)(address, { ...init, ...(signal ? { signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal } : {}) });
    if (response.ok && /<(?:[\w-]+:)?(?:urlset|sitemapindex)\b/i.test(await response.clone().text())) sitemap = true;
    return response;
  };
  const discovery = await discoverPages(url, { max, fetch: request });
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
  const id = `${new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}-${randomUUID().slice(0, 4)}`;
  const agent = { agent: 1, session_id: null as string | null, etat: "en_attente", pages: [] as string[], replay_url: null as string | null, duree_s: null as number | null, cout_usd: null as number | null, raison: null as string | null };
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
  const consigne = pages.length ? construireExploration(pages, site, version) : null;
  const acquired = new Map<string, ReleveCapture>();
  const pending = new Map<string, { findings: Finding[]; http: number | null; holo: ExplorationPage["holo"] }>();
  const finding = (page: ExplorationPage, source: Finding["source"], findings: Finding[], fields: Partial<Finding>): Finding => ({
    id: `${page.ecran}--${source}--${findings.filter(item => item.source === source).length + 1}`, ecran: page.ecran, vue: "defaut", source,
    sorte: "non-conclu", statut: "INCONCLUSIVE", description: "La vérification n'a pas pu se faire.", textes_a_surligner: [], preuve: {}, capture: `captures/${page.ecran}.png`, agent: 1, page: { largeur: 1280, hauteur: 900 }, ...fields });
  const inconclusive = (page: ExplorationPage, source: Finding["source"], findings: Finding[], raison: string) => findings.push(finding(page, source, findings, { raison, description: raison }));
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
      const page = pages.find(page => page.ecran === capture.ecran)!;
      const data = pending.get(page.ecran)!;
      agent.session_id = capture.session_id;
      Object.assign(page, { etat: "visitee", fin: capture.prise_le, http: data.http, holo: data.holo,
        capture: { fichier: `captures/${page.ecran}.png`, url: capture.url, largeur: capture.largeur, hauteur: capture.hauteur, defilement: capture.defilement } });
      report.constats.push(...data.findings);
      page.statut = pageStatus(data.findings); save();
    },
    async enregistrerResultat(result) { await base.enregistrerResultat(result); save(); },
    async terminerPassage(result) {
      await base.terminerPassage(result);
      agent.duree_s = result.passage.duree_s ?? null; agent.cout_usd = result.passage.cout_usd ?? null;
      agent.replay_url = result.tests.find(test => test.replay_url)?.replay_url ?? null;
      agent.session_id ??= result.tests[0]?.session_id ?? null;
      agent.etat = result.passage.etat === "joue" ? "fini" : "tombe";
      agent.raison = result.tests.find(test => test.raison)?.raison ?? null;
      report.cout_usd = agent.cout_usd; save();
    },
  };
  try {
    if (!consigne) {
      const failed = signal?.aborted || discovery.errors.length > 0;
      report.etat = failed ? "interrompu" : "fini"; agent.etat = failed ? "tombe" : "fini";
      if (discovery.errors.length) {
        agent.raison = discovery.errors.map(error => `${error.url} : ${error.message}`).join(" ; ");
        log(`Découverte impossible : ${agent.raison}`);
      }
      return report;
    }
    const trackedSession: Session = input => session({ ...input, async onTool(name, args) {
      const next = () => pages.find(page => page.etat !== "visitee");
      const remaining = () => {
        const page = next();
        return page ? `${pages.filter(page => page.etat === "visitee").length}/${pages.length} pages relevées dans ce passage. Ouvre ${page.url} avec go_to puis appelle relever(ecran="${page.ecran}", vue="defaut"). Ne termine pas avant les relevés restants.` : 'Tous les relevés sont acquis. Appelle terminer(etat="reussi").';
      };
      if (name === "terminer" && args.etat === "reussi" && next()) return `Fin refusée : des pages restent à visiter. ${remaining()}`;
      const response = await input.onTool(name, args);
      return name === "relever" ? `${response}\n${remaining()}` : response;
    } });
    const runner = creerCoureur({ vault, base: wrapped, session: trackedSession, signal, consigne, identifiant: () => id, hookTimeoutMs: 550_000,
      async relever(ecran, vue, hookSignal) {
        const page = pages.find(page => page.ecran === ecran)!;
        page.etat = "en_cours"; page.debut = new Date().toISOString(); agent.etat = "en_cours";
        if (!agent.pages.includes(ecran)) agent.pages.push(ecran);
        save();
        const capture = await runtime.relever(ecran, vue);
        hookSignal?.throwIfAborted();
        const actual = new URL(capture.url_page), expected = new URL(page.url);
        if (actual.origin !== expected.origin || actual.pathname.replace(/\/+$/, "") !== expected.pathname.replace(/\/+$/, "")) return capture;
        if (![...expected.searchParams].every(([key, value]) => actual.searchParams.get(key) === value)
          || actual.searchParams.get("filtre") !== expected.searchParams.get("filtre")) return capture;
        consigne.course.find(step => step.ecran === ecran)!.address = capture.url_page;
        acquired.set(ecran, capture);
        writeFileSync(join(sortie, `captures/${ecran}.png`), capture.png);
        const findings: Finding[] = [];
        const controlZones = new Map<string, Zone>();
        let client: ExplorationCdp | undefined, http: number | null = null;
        const close = () => client?.close();
        hookSignal?.addEventListener("abort", close, { once: true });
        const hookFetch: typeof fetch = (address, init) => fetch(address, { ...init, ...(hookSignal ? { signal: init?.signal ? AbortSignal.any([hookSignal, init.signal]) : hookSignal } : {}) });
        try {
          client = await (deps.connecter ?? connecterCdp)(port, capture.url_page);
          hookSignal?.throwIfAborted();
          const status = await client.send("Runtime.evaluate", { expression: "performance.getEntriesByType('navigation')[0]?.responseStatus || null", returnByValue: true });
          http = status.result.value;
          const defects = await (deps.controler ?? controlerPage)(client, { fetch: hookFetch });
          for (const defect of defects) {
            const item = finding(page, "controle", findings, { sorte: sorts[defect.sorte], statut: "VERIFIED_FAIL", description: defect.message,
              preuve: { ...(defect.selecteur ? { element: defect.selecteur } : {}), mesure: String(defect.valeur ?? defect.message), attendu: expectedText(defect.sorte),
                ...(["image_cassee", "lien_casse"].includes(defect.sorte) ? { url: String(defect.valeur).replace(/ : \d+$/, "") } : {}),
                ...(defect.sorte === "erreur_console" ? { console: String(defect.valeur).slice(0, 300) } : {}) },
              textes_a_surligner: defect.sorte === "texte_erreur" ? [String(defect.valeur)] : [],
              ...(!["page_en_erreur", "erreur_console", "defilement_horizontal"].includes(defect.sorte) && defect.zone ? { zone: defect.zone } : {}) });
            if (item.zone) controlZones.set(item.id, item.zone);
            if (item.zone && (item.zone.x < 0 || item.zone.y < 0 || item.zone.x + item.zone.largeur > 1280 || item.zone.y + item.zone.hauteur > 900)) {
              const zone = item.zone;
              const clip = { x: Math.max(0, zone.x), y: Math.max(0, zone.y), width: Math.ceil(zone.largeur), height: Math.ceil(zone.hauteur), scale: 1 };
              const image = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip });
              item.capture = `captures/${item.id}.png`;
              item.zone = { x: Math.max(0, zone.x - clip.x), y: Math.max(0, zone.y - clip.y), largeur: zone.largeur, hauteur: zone.hauteur };
              item.page = { largeur: clip.width, hauteur: clip.height };
              writeFileSync(join(sortie, item.capture), Buffer.from(image.data, "base64"));
            }
            findings.push(item);
          }
        } catch { inconclusive(page, "controle", findings, "Les contrôles de la page n'ont pas pu se terminer."); }
        finally { hookSignal?.removeEventListener("abort", close); client?.close(); }
        hookSignal?.throwIfAborted();
        let holo: NonNullable<ExplorationPage["holo"]> = { etat: "non_lance", modele: null, duree_ms: 0, ecartes_sans_zone: 0 };
        try {
          const result = await (deps.holo ?? askHolo)(Buffer.from(capture.png), { url: capture.url_page, fetch: hookFetch });
          holo = { etat: result.status === "INCONCLUSIVE" ? /timeout|timed|délai/i.test(result.message) ? "hors_delai" : "echec" : "fait", modele: result.model, duree_ms: result.durationMs, ecartes_sans_zone: 0 };
          if (result.status === "INCONCLUSIVE") inconclusive(page, "holo", findings, `Le regard visuel n'a pas abouti : ${result.message}`);
          for (const visual of result.findings) {
            if (!visual.zone) { holo.ecartes_sans_zone++; continue; }
            const zone = { x: visual.zone.x, y: visual.zone.y, largeur: visual.zone.width, hauteur: visual.zone.height };
            const explained = findings.find(item => item.source === "controle" && item.statut === "VERIFIED_FAIL" && controlZones.has(item.id) && overlap(zone, controlZones.get(item.id)!));
            findings.push(finding(page, "holo", findings, { sorte: kinds[visual.kind], statut: "SUSPECTED", description: descriptions[visual.kind], zone,
              preuve: { modele: result.model, phrase: visual.sentence }, ...(explained ? { explique_par: explained.id } : {}) }));
          }
        } catch { holo.etat = "echec"; inconclusive(page, "holo", findings, "Le regard visuel n'a pas pu se faire."); }
        pending.set(ecran, { findings, http, holo });
        return capture;
      },
      verifier({ test, acquired: captures, passageId, replayUrl }) {
        const page = pages.find(page => `exploration--${page.ecran}` === test.id)!;
        const entry = captures.find(item => item.capture.ecran === page.ecran);
        if (!entry) {
          report.constats = report.constats.filter(item => item.ecran !== page.ecran);
          page.capture = null;
          page.etat = "non_visitee"; page.fin = new Date().toISOString();
          inconclusive(page, "controle", report.constats, "Cette page n'a pas été visitée.");
        } else {
          try {
            const reference = references.find(ref => ref.ecran === page.ecran);
            if (reference) {
              const releve = { ecran: page.ecran, vue: "defaut", version, png: entry.png, texte: entry.capture.texte_page, url: entry.capture.url_page };
              const compared = verifierReleve({ releve, releves: [releve], regles: [], decisions,
                reference: readFileSync(join(vault, reference.chemin)), version_reference: reference.version,
                zones_ignorees: (notes.find(note => note.entete.ecran === page.ecran)?.entete.zones_ignorees ?? []) as Zone[] });
              for (const item of compared) report.constats.push(finding(page, "comparaison", report.constats, { ...item, id: `${page.ecran}--comparaison--${compared.indexOf(item) + 1}`, sorte: item.statut === "INCONCLUSIVE" ? "non-conclu" : item.nature ?? "changement", preuve: { reference: page.reference!.fichier } }));
            }
          } catch { inconclusive(page, "comparaison", report.constats, "La comparaison avec la référence n'a pas pu se faire."); }
        }
        const result = markResult(page, passageId, replayUrl); save(); return result;
      },
    });
    const launched = await runner.lancerPassage({ logiciel: site, version_testee: version, version_reference: versionReference ?? version, tests: consigne.tests.map(test => test.id), cle: "dev" });
    const result = await runner.attendreFin(launched.passage_id);
    report.etat = signal?.aborted || result.passage.etat !== "joue" || pages.some(page => page.etat !== "visitee") ? "interrompu" : "fini";
    if (pages.some(page => page.etat !== "visitee")) { agent.etat = "tombe"; agent.raison ??= "Des pages n'ont pas été visitées."; }
  } catch {
    report.etat = "interrompu"; agent.etat = "tombe"; agent.raison ??= "Le passage a été interrompu.";
  } finally {
    for (const page of pages) {
      if (page.etat !== "visitee" && page.etat !== "non_visitee") {
        page.etat = "non_visitee"; page.fin = new Date().toISOString();
        inconclusive(page, "controle", report.constats, "Cette page n'a pas été visitée.");
        await base.enregistrerResultat(markResult(page, id));
      }
      if (page.etat === "visitee") {
        try {
          const capture = acquired.get(page.ecran)!;
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
  }
  return report;
}

const expectedText = (kind: keyof typeof expected) => expected[kind];
