import type { Regle, Statut } from "@horama/contrats";

// The state of a verifiable sentence. It drives the highlight, the same everywhere for the same rule.
export type EtatRegle = "defaut" | "a_trancher" | "non_concluant" | "acceptee" | "non_testee" | "conforme";

// Most serious first.
export const GRAVITE: EtatRegle[] = ["defaut", "a_trancher", "non_concluant", "acceptee", "non_testee", "conforme"];
export const parGravite = (a: EtatRegle, b: EtatRegle) => GRAVITE.indexOf(a) - GRAVITE.indexOf(b);

export const ETAT_DU_STATUT: Record<Statut, EtatRegle> = {
  PASS: "conforme",
  SUSPECTED: "a_trancher",
  VERIFIED_FAIL: "defaut",
  INCONCLUSIVE: "non_concluant",
};

export const LIBELLE_ETAT: Record<EtatRegle, string> = {
  defaut: "Défaut prouvé",
  a_trancher: "À trancher",
  non_concluant: "Non concluant",
  acceptee: "Test accepté, pas encore joué",
  non_testee: "Règle écrite, pas testée",
  conforme: "Conforme",
};

export const LIBELLE_STATUT: Record<Statut, string> = {
  PASS: "Conforme",
  SUSPECTED: "Suspect",
  VERIFIED_FAIL: "Défaut prouvé",
  INCONCLUSIVE: "Non concluant",
};

// Two rules are the same rule when their fields are equal, whatever the key order.
const CHAMPS = ["a", "b", "champ", "cible", "colonne", "condition", "ecran", "filtre", "motif", "type", "valeur"];
export const cleRegle = (regle: Regle) => JSON.stringify(regle, CHAMPS);
