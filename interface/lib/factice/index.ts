// Mock sources (USE_MOCKS=1). Everything is built on contrats/exemples.ts and on the real vault.
// Fake values are the ones of the fake SaaS Facturo; nothing is written anywhere.
import type {
  Capture, Decision, EvenementFil, LancementPassage, Passage, RapportPassage, ResultatVerification, TestAccepte, TestPropose,
} from "@horama/contrats";
import {
  c1TestPropose, c2TestAccepte, c3Capture, c3Evenement, c3Passage, c4Resultat, c5Decision, c6Rapport,
} from "@horama/contrats/exemples";
import type { EcranDocumente, FichierVault, Logiciel, Note, Reference, RegleDocumentee, TestDuVault } from "../donnees";
import { plainText } from "../markdown";
import { cleRegle, ETAT_DU_STATUT, type EtatRegle } from "../states";
import { latestFiles, latestVersion, readNote, readProductNotes, readTests, vaultName } from "./vault";

const T_CA = c4Resultat.test_id;
const T_FILTRE = c1TestPropose.id;
const T_DETAIL = "detail-facture-total-egal-liste";
const [S_CA, S_FILTRE, S_DETAIL] = [c3Evenement.session_id, "ses_demo_2", "ses_demo_3"];
const LISTE = "liste-des-factures";

// Screenshots Nathan drops in public/factice/ (real captures of the fake SaaS, 1280 x 900).
const image = (ecran: string, vue: string, version: string) => `/factice/${ecran}--${vue}--v${version}.png`;

// ---------- Proposed tests for the v13 release note ----------

const testsProposes: TestPropose[] = [
  c1TestPropose,
  {
    ...c1TestPropose,
    id: "liste-factures-bouton-exporter",
    passages_de_la_source: ["le bouton « Exporter » passe en haut à droite"],
    releves: [{ ecran: LISTE, vue: "defaut" }],
    test_markdown: `---
id: liste-factures-bouton-exporter
logiciel: ${c1TestPropose.logiciel}
source: ${c1TestPropose.source}
releves: [{ ecran: ${LISTE}, vue: defaut }]
url_depart: ${c2TestAccepte.url_depart}
version_cible: "${c2TestAccepte.version_cible}"
timeout_s: ${c2TestAccepte.timeout_s}
statut: propose
---

# Liste des factures : bouton « Exporter » en haut à droite

## Setup
Connecté avec le compte de démo, sur la liste des factures, filtre sur « Toutes ».

## Task
1. La liste des factures est affichée, avec sa barre d'actions : c'est le relevé ecran=${LISTE}, vue=defaut.
2. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Le bouton « Exporter » se trouve en haut à droite du tableau.

## Verification
- FAIL if le bouton « Exporter » n'est pas en haut à droite du tableau.

\`\`\`regles
[]
\`\`\`
`,
    regles_calculables: [],
    questions: [],
  },
];

export const proposerTests = (logiciel: string, version: string) =>
  testsProposes.filter((t) => t.logiciel === logiciel && t.source.endsWith(`v${version}.md`));

export const accepterTest = (test: TestPropose, _reponses: Record<string, string>): TestAccepte =>
  test.id === c2TestAccepte.id
    ? c2TestAccepte
    : { ...c2TestAccepte, id: test.id, source: test.source, releves: test.releves, markdown: test.test_markdown, regles: test.regles_calculables };

// ---------- The recorded passage and its live thread ----------

const STEP_S = 9; // seconds between two steps of the agent
const at = (seconds: number) => new Date(Date.parse(c3Passage.debut) + seconds * 1000).toISOString();
const step = (
  test_id: string, session_id: string, etape: number, action: string,
  etat_session: EvenementFil["etat_session"], capture_url?: string,
): EvenementFil => ({ ...c3Evenement, test_id, session_id, etape, horodatage: at(etape * STEP_S), action, etat_session, capture_url });

const filEnregistre: EvenementFil[] = [
  step(T_FILTRE, S_FILTRE, 1, "Ouvre la liste des factures", "en_cours", image(LISTE, "defaut", "13")),
  step(T_FILTRE, S_FILTRE, 2, "Ouvre le menu « Filtrer »", "en_cours"),
  step(T_FILTRE, S_FILTRE, 3, "Choisit « Échéance dépassée »", "en_cours", image(LISTE, "filtre-echeance", "13")),
  step(T_FILTRE, S_FILTRE, 4, "Appelle relever (liste-des-factures, filtre-echeance)", "attente_outil", image(LISTE, "filtre-echeance", "13")),
  step(T_FILTRE, S_FILTRE, 5, "Répond", "terminee"),
  { ...c3Evenement, capture_url: image(LISTE, "defaut", "13") },
  { ...c3Evenement, etape: c6Rapport.tests[0].etapes, horodatage: at(c6Rapport.tests[0].duree_s), action: "Répond", capture_url: undefined, etat_session: "terminee" as const },
  step(T_DETAIL, S_DETAIL, 2, "Ouvre la facture F-119", "en_cours", image("detail-facture", "defaut", "13")),
].sort((a, b) => a.horodatage.localeCompare(b.horodatage));

// Fake runner: "Lancer un passage" replays the recorded thread at its recorded pace.
// Until a passage is launched, the recorded passage is shown as it ended.
const run = globalThis as { __horamaLaunchedAt?: number };
const shift = () => (run.__horamaLaunchedAt ? run.__horamaLaunchedAt - Date.parse(c3Passage.debut) : 0);
const shifted = (iso: string) => new Date(Date.parse(iso) + shift()).toISOString();

export function lancerPassage(_lancement: LancementPassage) {
  run.__horamaLaunchedAt = Date.now();
  return { passage_id: c3Passage.id };
}

export function lirePassage(id: string): Passage | undefined {
  if (id !== c3Passage.id) return undefined;
  const debut = shifted(c3Passage.debut);
  const running = run.__horamaLaunchedAt !== undefined && Date.now() < Date.parse(debut) + c3Passage.duree_s! * 1000;
  return running ? { ...c3Passage, debut, etat: "en_cours", fin: undefined, duree_s: undefined } : { ...c3Passage, debut, fin: shifted(c3Passage.fin!) };
}

export const lireFil = (id: string, depuis: number): EvenementFil[] =>
  id !== c3Passage.id
    ? []
    : filEnregistre
        .map((e) => ({ ...e, horodatage: shifted(e.horodatage) }))
        .filter((e) => run.__horamaLaunchedAt === undefined || Date.parse(e.horodatage) <= Date.now())
        .slice(depuis);

// ---------- Captures, references, results, report ----------

// Page text of the list, as the agent reads it (the example stops after the first row).
const TEXTE_LISTE = [
  "| Numéro | Client | Échéance | Montant TTC |",
  "| F-118 | Atelier Brun | 05/11/2026 | 320,00 € |",
  "| F-119 | Studio Lune | 12/11/2026 | 480,00 € |",
  "| F-120 | Café Mira | 30/11/2026 | 180,00 € |",
  "| F-121 | Garage Vélo | 10/11/2026 | 440,00 € |",
  "| Total | | | 1 420,00 € |",
].join("\n");

const capture = (test_id: string, session_id: string, ecran: string, vue: string, texte_page = ""): Capture => ({
  ...c3Capture, test_id, session_id, ecran, vue, texte_page,
  chemin: `${c3Passage.id}/${test_id}/${ecran}--${vue}.png`,
  url: image(ecran, vue, c3Passage.version_testee),
});

const captures: Capture[] = [
  capture(T_CA, S_CA, "tableau-de-bord", "defaut"),
  capture(T_CA, S_CA, LISTE, "defaut", TEXTE_LISTE),
  capture(T_FILTRE, S_FILTRE, LISTE, "filtre-echeance"),
  capture(T_DETAIL, S_DETAIL, LISTE, "defaut", TEXTE_LISTE),
  capture(T_DETAIL, S_DETAIL, "detail-facture", "defaut"),
];

export const lireCaptures = (id: string) => (id === c3Passage.id ? captures : []);

export const lireReferences = (_logiciel: string): Reference[] =>
  ["tableau-de-bord", LISTE, "detail-facture"].map((ecran) => ({
    ecran, vue: "defaut", version: c3Passage.version_reference, url: image(ecran, "defaut", c3Passage.version_reference),
  }));

export function lireResultats(id: string): ResultatVerification[] {
  if (id !== c3Passage.id) return [];
  const urls = (test_id: string) => captures.filter((c) => c.test_id === test_id).map((c) => c.url);
  return [
    // The example as it is, except the zone of the moved button: the one of the example does not fall on the button
    // of the real captures, this one is the position measured on the fake SaaS (faux-saas/positions.json, "export-haut").
    { ...c4Resultat, ecarts_visuels: c4Resultat.ecarts_visuels.map((e) => ({ ...e, zone: { x: 1128, y: 136, largeur: 120, hauteur: 36 } })) },
    {
      ...c4Resultat,
      test_id: T_FILTRE,
      regle: c1TestPropose.regles_calculables[0],
      ecrans: [LISTE],
      version_reference_capture: undefined,
      valeurs: { "F-120, échéance": "30/11/2026", "aujourd'hui": "18/11/2026" },
      calcul: "30/11/2026 n'est pas antérieure au 18/11/2026",
      ecarts_visuels: [],
      pixels_bruts: undefined,
      captures: urls(T_FILTRE),
    },
    {
      ...c4Resultat,
      test_id: T_DETAIL,
      statut: "PASS",
      regle: readTests(c3Passage.logiciel).find((t) => t.id === T_DETAIL)?.regles[0],
      ecrans: [LISTE, "detail-facture"],
      valeurs: { "detail-facture.Total TTC": "480.00", "liste-des-factures.Montant TTC de F-119": "480.00" },
      calcul: "480.00 = 480.00",
      ecarts_visuels: [],
      pixels_bruts: undefined,
      captures: urls(T_DETAIL),
    },
  ];
}

export function lireRapport(id: string): RapportPassage | undefined {
  const passage = lirePassage(id);
  if (!passage) return undefined;
  const [ca] = c6Rapport.tests;
  // Duration and steps of the filter test come from its recorded thread; the detail test has no complete thread: 0 = to be measured.
  const fin = filEnregistre.find((e) => e.test_id === T_FILTRE && e.etat_session === "terminee")!;
  return {
    passage,
    tests: [
      ca,
      { ...ca, test_id: T_FILTRE, session_id: S_FILTRE, ecrans_releves: [LISTE], duree_s: (Date.parse(fin.horodatage) - Date.parse(c3Passage.debut)) / 1000, etapes: fin.etape },
      { ...ca, test_id: T_DETAIL, session_id: S_DETAIL, ecrans_releves: [LISTE, "detail-facture"], duree_s: 0, etapes: 0 },
    ],
  };
}

// ---------- Decisions ----------

// The example decision (button "Exporter", "voulu") with its proposed note correction.
export const lireDecisions = (id: string): Decision[] => (id === c5Decision.passage_id ? [c5Decision] : []);

// A new "voulu" on the moved button comes back as the example decision, which carries the proposed note correction.
export const ecrireDecision = (decision: Decision): Decision =>
  !decision.correction_de_note && decision.ecart_id === c5Decision.ecart_id && decision.decision === c5Decision.decision ? c5Decision : decision;

export const appliquerCorrection = (decision: Decision): Decision => ({
  ...decision,
  correction_de_note: decision.correction_de_note && { ...decision.correction_de_note, statut: "acceptee" },
});

// ---------- The vault, read for real, with the state of each rule ----------

export const lireNote = (logiciel: string, chemin: string): Note => readNote(logiciel, chemin);
export const derniersFichiersVault = (n: number): FichierVault[] => latestFiles(n);

export function listerEcrans(logiciel: string): Logiciel {
  const notes = readProductNotes(logiciel);
  const vaultTests = readTests(logiciel);
  const resultats = lireResultats(c3Passage.id);

  const tests: TestDuVault[] = vaultTests.map((t) => {
    const resultat = resultats.find((r) => r.test_id === t.id);
    // The sentence of the documentation this test verifies: the note rule of its first rule, else the sentence it was proposed from.
    const noteRules = notes.flatMap((n) => n.regles);
    const rule = t.regles.map((tr) => noteRules.find((r) => r.regle && cleRegle(r.regle) === cleRegle(tr))).find(Boolean);
    const proposed = testsProposes.find((p) => p.id === t.id);
    return {
      id: t.id, titre: t.titre, source: t.source, releves: t.releves, regles: t.regles,
      phrase: plainText(rule?.phrase ?? proposed?.passages_de_la_source[0] ?? t.attendu),
      etat: resultat ? ETAT_DU_STATUT[resultat.statut] : "acceptee",
    };
  });

  const documented = (r: (typeof notes)[number]["regles"][number]): RegleDocumentee => {
    const carriers = r.regle ? tests.filter((t) => t.regles.some((tr) => cleRegle(tr) === cleRegle(r.regle!))) : [];
    const own = resultats.find((res) => r.regle && res.regle && cleRegle(res.regle) === cleRegle(r.regle));
    const etat: EtatRegle = own ? ETAT_DU_STATUT[own.statut] : carriers[0]?.etat ?? "non_testee";
    return { ...r, phrase: plainText(r.phrase), etat, tests: carriers.map((t) => t.id) };
  };

  const names = (r: RegleDocumentee) => (r.regle?.type === "egalite" ? [r.regle.a.ecran, r.regle.b.ecran] : []);
  const between = notes.filter((n) => !n.ecran).flatMap((n) => n.regles.map(documented));
  const ecrans: EcranDocumente[] = notes
    .filter((n) => n.ecran)
    .map((n) => ({
      id: n.ecran!,
      titre: n.titre,
      note: n.chemin,
      regles: [...n.regles.map(documented), ...between.filter((r) => names(r).includes(n.ecran!))],
      tests: tests.filter((t) => t.releves.some((r) => r.ecran === n.ecran)).map((t) => t.id),
    }));

  return {
    logiciel,
    nom: logiciel[0].toUpperCase() + logiciel.slice(1),
    vault: `${vaultName()}/${logiciel}`,
    version_testee: latestVersion(logiciel),
    version_reference: c3Passage.version_reference,
    passage_id: c3Passage.id,
    ecrans,
    regles: notes.flatMap((n) => n.regles.map(documented)),
    tests,
  };
}
