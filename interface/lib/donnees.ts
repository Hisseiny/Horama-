// The only door to data. Screens import from here, never from ./factice.
// With USE_MOCKS=1 every function answers from ./factice; the next tasks plug the real sources behind the same names.
import type {
  Capture, Decision, EvenementFil, IdEcran, LancementPassage, Passage, RapportPassage, Regle, Releve,
  ResultatVerification, TestAccepte, TestPropose, Version, Vue,
} from "@horama/contrats";
import type { EtatRegle } from "./states";

export const FACTICE = process.env.USE_MOCKS === "1";

export interface RegleDocumentee {
  phrase: string; // the sentence of the note, wiki links shown as plain names
  ligne?: string; // its "regle: ..." line, when the rule is calculable
  regle?: Regle;
  note: string; // vault-relative path inside the software folder
  etat: EtatRegle;
  tests: string[];
}

export interface TestDuVault {
  id: string;
  titre: string;
  source: string;
  phrase: string; // the sentence of the documentation this test verifies
  releves: Releve[];
  regles: Regle[];
  etat: EtatRegle;
}

export interface EcranDocumente {
  id: IdEcran;
  titre: string;
  note: string;
  regles: RegleDocumentee[]; // its own rules, then the rules between screens that name it
  tests: string[];
}

export interface Logiciel {
  logiciel: string;
  nom: string;
  vault: string; // folder shown to the user
  version_testee: Version;
  version_reference: Version;
  passage_id?: string; // last passage
  ecrans: EcranDocumente[];
  regles: RegleDocumentee[]; // every rule of the documentation, once
  tests: TestDuVault[];
}

export interface Note { chemin: string; contenu: string; modifie_le: string }
export interface Reference { ecran: IdEcran; vue: Vue; version: Version; url: string }
export interface FichierVault { chemin: string; modifie_le: string }

async function source() {
  if (!FACTICE) throw new Error("Non branché : seul le mode USE_MOCKS=1 existe pour l'instant.");
  return import("./factice");
}

export const listerEcrans = async (logiciel: string): Promise<Logiciel> => (await source()).listerEcrans(logiciel);
export const lireNote = async (logiciel: string, chemin: string): Promise<Note> => (await source()).lireNote(logiciel, chemin);
export const proposerTests = async (logiciel: string, version: Version): Promise<TestPropose[]> => (await source()).proposerTests(logiciel, version);
export const accepterTest = async (test: TestPropose, reponses: Record<string, string>): Promise<TestAccepte> => (await source()).accepterTest(test, reponses);
export const lancerPassage = async (lancement: LancementPassage): Promise<{ passage_id: string }> => (await source()).lancerPassage(lancement);
export const lirePassage = async (id: string): Promise<Passage | undefined> => (await source()).lirePassage(id);
export const lireFil = async (id: string, depuis = 0): Promise<EvenementFil[]> => (await source()).lireFil(id, depuis);
export const lireCaptures = async (id: string): Promise<Capture[]> => (await source()).lireCaptures(id);
export const lireResultats = async (id: string): Promise<ResultatVerification[]> => (await source()).lireResultats(id);
export const lireRapport = async (id: string): Promise<RapportPassage | undefined> => (await source()).lireRapport(id);
export const lireReferences = async (logiciel: string): Promise<Reference[]> => (await source()).lireReferences(logiciel);
// Not in the first list of functions: the "dérive" screen needs to read the decision it shows.
export const lireDecisions = async (id: string): Promise<Decision[]> => (await source()).lireDecisions(id);
export const ecrireDecision = async (decision: Decision): Promise<Decision> => (await source()).ecrireDecision(decision);
export const appliquerCorrection = async (decision: Decision): Promise<Decision> => (await source()).appliquerCorrection(decision);
export const derniersFichiersVault = async (n: number): Promise<FichierVault[]> => (await source()).derniersFichiersVault(n);
