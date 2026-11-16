// Horama contracts v1: the only shared surface between the two lanes (Ali: agent, Nathan: memory and proof).
// Frozen at git tag `contrats-v1`. Never add, rename or retype a field without a decision written in docs/decisions/
// and agreed by Nathan and Ali. Mirrors base/migrations/001_init.sql.

export type Statut = "PASS" | "SUSPECTED" | "VERIFIED_FAIL" | "INCONCLUSIVE";
export type IdEcran = string; // e.g. "tableau-de-bord", "liste-des-factures", "detail-facture"
export type Version = string; // e.g. "12", "13"
export type Vue = string; // named state of a screen, e.g. "defaut" (no filter, top of page), "filtre-echeance"
export interface Releve { ecran: IdEcran; vue: Vue } // one screen state the agent must capture with relever(ecran, vue)

// ---------- Calculable rules (written in notes, carried by tests) ----------

export type Regle =
  | { type: "somme"; ecran: IdEcran; colonne: string; cible: string }
  | { type: "egalite"; a: { ecran: IdEcran; champ: string }; b: { ecran: IdEcran; champ: string } }
  | { type: "filtre"; ecran: IdEcran; filtre: string; colonne: string; condition: "< aujourd_hui" | "<= aujourd_hui" | "= valeur"; valeur?: string }
  | { type: "format"; ecran: IdEcran; colonne: string; motif: "montant-fr" | "date-fr" }
  | { type: "presence"; ecran: IdEcran; colonne: string };

// ---------- C1 Proposed test (Nathan: generation) ----------

export interface QuestionAmbiguite {
  texte: string;
  choix: string[];
  reponse?: string;
}

export interface TestPropose {
  id: string; // kebab-case, unique per software
  logiciel: string; // vault folder, e.g. "facturo"
  source: string; // vault-relative path of the source note, e.g. "notes-de-version/v13.md"
  passages_de_la_source: string[]; // exact sentences of the note the test comes from (for highlighting)
  releves: Releve[]; // screen states the agent must capture, in order
  test_markdown: string; // full C2 markdown (front matter and the final relever sentence are added by code, never by the model)
  regles_calculables: Regle[];
  questions: QuestionAmbiguite[];
  statut: "propose" | "accepte" | "refuse";
  modele: string; // Hugging Face model id used
}

// ---------- C2 Accepted test file (Nathan writes, Ali reads) ----------
// File: vault-horama/<logiciel>/tests/<id>.md
// Front matter (YAML):
//   id, logiciel, source, releves: [{ecran, vue}..], url_depart (path relative to FAUX_SAAS_URL, already authenticated, e.g. /v13/entrer?suite=/v13/factures),
//   version_cible, timeout_s, statut: accepte, accepte_par, accepte_le
// Body sections, in this order: "## Setup", "## Task", "## Expected Result", "## Verification",
// then a fenced block ```regles  [ ...Regle JSON... ] ```.
// The Task section ends with (added by code): "Pour chaque relevé listé dans releves, une fois l'écran dans cet état,
// la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>."

export interface TestAccepte {
  id: string;
  logiciel: string;
  source: string;
  releves: Releve[];
  url_depart: string;
  version_cible: Version;
  timeout_s: number;
  markdown: string; // whole file content
  regles: Regle[];
}

// ---------- C3 Passage, live events and captures (Ali writes) ----------

export interface LancementPassage {
  logiciel: string;
  version_testee: Version;
  version_reference: Version;
  tests: string[]; // test ids to play (files in vault-horama/<logiciel>/tests/)
  regressions?: string[]; // faux SaaS ?r= ids, for the bench only
  cle?: "dev" | "demo"; // which H key, default "dev"
}

export interface Passage {
  id: string; // e.g. "2026-11-18-14h02-a1b2"
  logiciel: string;
  version_testee: Version;
  version_reference: Version;
  etat: "en_cours" | "joue" | "verifie" | "echec"; // Ali writes en_cours/joue/echec, Nathan writes verifie
  debut: string; // ISO
  fin?: string;
  duree_s?: number;
  cout_usd?: number | null; // null = unknown, shown as "inconnu" and counted as a failure of acceptance criterion 7
}

export interface EvenementFil {
  passage_id: string;
  test_id: string;
  session_id: string;
  horodatage: string; // ISO, from H event timestamp
  etape: number;
  action: string; // short French label, e.g. "Ouvre « Factures »"
  capture_url?: string; // public URL in Supabase storage, if a screenshot exists
  etat_session: "en_attente" | "en_cours" | "attente_outil" | "terminee" | "echec" | "abandonnee";
}

export interface Capture {
  passage_id: string;
  test_id: string;
  session_id: string;
  ecran: IdEcran;
  vue: Vue;
  version: Version;
  chemin: string; // storage path in bucket "captures": <passage_id>/<test_id>/<ecran>--<vue>.png
  url: string; // public URL
  largeur: number;
  hauteur: number;
  defilement: [number, number];
  texte_page: string; // observation metadata.text (visible page as markdown)
  url_page: string; // observation metadata.url; the capture is rejected if it does not match the screen
  etape: number;
  prise_le: string; // ISO
}

export interface RapportPassage {
  passage: Passage;
  tests: Array<{
    test_id: string;
    session_id: string;
    etat: "termine" | "non_concluant";
    raison?: string; // when non_concluant: "session muette", "ecran non atteint"...
    ecrans_releves: IdEcran[];
    replay_url?: string; // public share link
    duree_s: number;
    cout_usd: number | null;
    etapes: number;
  }>;
}

// Function surface of @horama/agent (Ali)
export interface CoureurAgent {
  // Runs inside the detached passage process (H custom tools are only served while this process follows the sessions).
  lancerPassage(input: LancementPassage): Promise<{ passage_id: string }>; // returns once sessions are created
  attendreFin(passage_id: string): Promise<RapportPassage>; // resolves when every session is terminal
}

// ---------- C4 Verification result (Nathan writes) ----------

export interface EcartVisuel {
  id: string;
  ecran: IdEcran;
  vue: Vue;
  description: string;
  zone: { x: number; y: number; largeur: number; hauteur: number };
  statut: "SUSPECTED" | "PASS"; // PASS when neutralised by a "voulu" decision (memory): decision_id is then set
  decision_id?: string;
}

export interface ResultatVerification {
  passage_id: string;
  test_id: string;
  version_testee: Version;
  version_reference: Version;
  statut: Statut;
  regle?: Regle;
  ecrans: IdEcran[];
  version_reference_capture?: Version; // version of the reference capture used for the visual comparison
  valeurs: Record<string, string>; // e.g. { "tableau-de-bord.CA du mois": "1240.00", "liste-des-factures.Total": "1420.00" }
  calcul?: string; // e.g. "1240.00 != 1420.00, écart 180.00"
  niveau_de_preuve: "aucun" | "releve" | "releve + calcul" | "deux lecteurs";
  ecarts_visuels: EcartVisuel[];
  pixels_bruts?: { zones: number; image_url: string };
  captures: string[]; // Capture.url
  replay_url?: string;
  raison?: string; // for INCONCLUSIVE
}

// Function surface of @horama/jugement (Nathan)
export interface Verificateur {
  verifierPassage(passage_id: string): Promise<ResultatVerification[]>;
}

// ---------- C5 Human decision and note correction (Nathan) ----------

export interface Decision {
  id: string;
  passage_id: string;
  test_id: string;
  ecart_id?: string;
  decision: "bug" | "voulu";
  logiciel: string;
  ecran: IdEcran;
  vue: Vue;
  ecart: string;
  zone?: { x: number; y: number; largeur: number; hauteur: number };
  version: Version;
  portee: "cet ecart, cet ecran, cette version";
  pourquoi?: string;
  par: string;
  le: string; // ISO
  correction_de_note?: {
    fichier: string; // vault-relative, e.g. "produit/liste-des-factures.md"
    avant: string;
    apres: string;
    statut: "proposee" | "acceptee" | "refusee";
  };
}

// ---------- C6 Report: see RapportPassage ----------

// ---------- C7 n8n notification (Nathan) ----------

export interface NotificationRelecture {
  passage_id: string;
  logiciel: string;
  version_testee: Version;
  a_relire: number;
  defauts_prouves: number;
  suspects: number;
  lien: string; // URL of /relecture
}

// ---------- C8 Measurement row (Nathan) ----------

export interface LigneMesure {
  passage_id: string;
  test_id: string;
  cas_banc?: string; // faux SaaS regression id when played on the bench
  verite?: "bug" | "voulu" | "aucun";
  statut: Statut;
  duree_s: number;
  cout_usd: number | null;
  etapes: number;
  modele_generation?: string;
  le: string;
}
