// Typed examples of every contract (demo data, faux SaaS "Facturo"). the JSON copies in contrats/exemples/ are generated from this file
// writes them as JSON into contrats/exemples/. Each lane builds its mocks from these, never from its own copy.
import type {
  TestPropose, TestAccepte, Passage, EvenementFil, Capture, RapportPassage,
  ResultatVerification, Decision, NotificationRelecture, LigneMesure, Regle,
} from "./types";

const TEST_MD = `---
id: liste-factures-filtre-echeance
logiciel: facturo
source: notes-de-version/v13.md
releves: [{ ecran: liste-des-factures, vue: filtre-echeance }]
url_depart: /v13/entrer?suite=/v13/factures
version_cible: "13"
timeout_s: 180
statut: accepte
accepte_par: Léa
accepte_le: 2026-11-18
---

# Liste des factures : filtre « Échéance dépassée »

## Setup
Connecté avec le compte de démo, sur la liste des factures, filtre sur « Toutes ».

## Task
1. Ouvrir le menu des filtres et choisir « Échéance dépassée ».
2. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Seules les factures dont l'échéance est antérieure à aujourd'hui sont affichées.

## Verification
- FAIL if une ligne affichée a une échéance égale ou postérieure à aujourd'hui.

\`\`\`regles
[{ "type": "filtre", "ecran": "liste-des-factures", "filtre": "Échéance dépassée", "colonne": "Échéance", "condition": "< aujourd_hui" }]
\`\`\`
`;

export const c1TestPropose: TestPropose = {
  id: "liste-factures-filtre-echeance",
  logiciel: "facturo",
  source: "notes-de-version/v13.md",
  passages_de_la_source: ["il n'affiche que les factures dont la date d'échéance est passée"],
  releves: [{ ecran: "liste-des-factures", vue: "filtre-echeance" }],
  test_markdown: TEST_MD,
  regles_calculables: [{ type: "filtre", ecran: "liste-des-factures", filtre: "Échéance dépassée", colonne: "Échéance", condition: "< aujourd_hui" }],
  questions: [{ texte: "« Échéance passée » inclut-elle le jour même ?", choix: ["Oui", "Non"] }],
  statut: "propose",
  modele: "à choisir (T4)",
};

export const c2TestAccepte: TestAccepte = {
  id: "liste-factures-filtre-echeance",
  logiciel: "facturo",
  source: "notes-de-version/v13.md",
  releves: [{ ecran: "liste-des-factures", vue: "filtre-echeance" }],
  url_depart: "/v13/entrer?suite=/v13/factures",
  version_cible: "13",
  timeout_s: 180,
  markdown: TEST_MD,
  regles: c1TestPropose.regles_calculables,
};

export const c3Passage: Passage = {
  id: "2026-11-18-14h02-a1b2",
  logiciel: "facturo",
  version_testee: "13",
  version_reference: "12",
  etat: "joue",
  debut: "2026-11-18T14:02:00Z",
  fin: "2026-11-18T14:05:40Z",
  duree_s: 220,
  cout_usd: null,
};

export const c3Evenement: EvenementFil = {
  passage_id: c3Passage.id,
  test_id: "ca-du-mois-egal-total",
  session_id: "ses_demo_1",
  horodatage: "2026-11-18T14:02:19Z",
  etape: 3,
  action: "Ouvre « Factures »",
  capture_url: "https://example.supabase.co/storage/v1/object/public/captures/2026-11-18-14h02-a1b2/ca-du-mois-egal-total/etape-3.png",
  etat_session: "en_cours",
};

export const c3Capture: Capture = {
  passage_id: c3Passage.id,
  test_id: "ca-du-mois-egal-total",
  session_id: "ses_demo_1",
  ecran: "liste-des-factures",
  vue: "defaut",
  version: "13",
  chemin: "2026-11-18-14h02-a1b2/ca-du-mois-egal-total/liste-des-factures--defaut.png",
  url: "https://example.supabase.co/storage/v1/object/public/captures/2026-11-18-14h02-a1b2/ca-du-mois-egal-total/liste-des-factures--defaut.png",
  largeur: 1280,
  hauteur: 900,
  defilement: [0, 0],
  texte_page: "| Numéro | Client | Échéance | Montant TTC |\n| F-118 | Atelier Brun | 05/11/2026 | 320,00 € |\n…\n| Total | | | 1 420,00 € |",
  url_page: "https://facturo-demo.vercel.app/v13/factures",
  etape: 5,
  prise_le: "2026-11-18T14:02:41Z",
};

export const c6Rapport: RapportPassage = {
  passage: c3Passage,
  tests: [{
    test_id: "ca-du-mois-egal-total",
    session_id: "ses_demo_1",
    etat: "termine",
    ecrans_releves: ["tableau-de-bord", "liste-des-factures"],
    replay_url: "https://platform.hcompany.ai/share/…",
    duree_s: 96,
    cout_usd: null,
    etapes: 10,
  }],
};

export const c4Resultat: ResultatVerification = {
  passage_id: c3Passage.id,
  test_id: "ca-du-mois-egal-total",
  version_testee: "13",
  version_reference: "12",
  statut: "VERIFIED_FAIL",
  regle: { type: "egalite", a: { ecran: "tableau-de-bord", champ: "CA du mois" }, b: { ecran: "liste-des-factures", champ: "Total" } },
  ecrans: ["tableau-de-bord", "liste-des-factures"],
  version_reference_capture: "12",
  valeurs: { "tableau-de-bord.CA du mois": "1240.00", "liste-des-factures.Total": "1420.00" },
  calcul: "1240.00 != 1420.00, écart 180.00",
  niveau_de_preuve: "releve + calcul",
  ecarts_visuels: [{
    id: "ecart-1",
    ecran: "liste-des-factures",
    vue: "defaut",
    description: "Bouton « Exporter » déplacé du bas du tableau vers le haut à droite",
    zone: { x: 1060, y: 96, largeur: 140, hauteur: 44 },
    statut: "SUSPECTED",
  }],
  pixels_bruts: { zones: 0, image_url: "à calculer" },
  captures: [c3Capture.url],
};

export const c5Decision: Decision = {
  id: "2026-11-18-bouton-exporter",
  passage_id: c3Passage.id,
  test_id: "ca-du-mois-egal-total",
  ecart_id: "ecart-1",
  decision: "voulu",
  logiciel: "facturo",
  ecran: "liste-des-factures",
  vue: "defaut",
  ecart: "Bouton « Exporter » déplacé en haut à droite",
  zone: { x: 1060, y: 96, largeur: 140, hauteur: 44 },
  version: "13",
  portee: "cet ecart, cet ecran, cette version",
  pourquoi: "Refonte de la barre d'actions (note de version v13)",
  par: "Léa",
  le: "2026-11-18T14:09:00Z",
  correction_de_note: {
    fichier: "produit/liste-des-factures.md",
    avant: "Le bouton « Exporter » se trouve en bas du tableau.",
    apres: "Le bouton « Exporter » se trouve en haut à droite du tableau (depuis la version 13).",
    statut: "proposee",
  },
};

export const c7Notification: NotificationRelecture = {
  passage_id: c3Passage.id,
  logiciel: "facturo",
  version_testee: "13",
  a_relire: 2,
  defauts_prouves: 1,
  suspects: 1,
  lien: "http://localhost:3000/relecture",
};

export const c8Mesure: LigneMesure = {
  passage_id: c3Passage.id,
  test_id: "ca-du-mois-egal-total",
  cas_banc: "ca-mois",
  verite: "bug",
  statut: "VERIFIED_FAIL",
  duree_s: 96,
  cout_usd: null,
  etapes: 10,
  le: "2026-11-18T14:05:40Z",
};

// D7 section 3 ("etat" rule, contrats-v2): the dark-mode toggle of the demo scenario, judged on the texte_page of (ecran, vue).
export const regleEtat: Regle = {
  type: "etat",
  ecran: "tableau-de-bord",
  vue: "mode-sombre",
  texte_present: ["Revenir au mode clair", "Thème sombre"],
};
