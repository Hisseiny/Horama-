import type { Decision, EcartVisuel, Regle, Statut } from "@horama/contrats";
import { decisionQuiNeutralise } from "@horama/memoire";
import { comparerImages } from "./images.ts";
import { checkRule } from "./rules.ts";
import { key, releverValeurs } from "./values.ts";
import type { ScreenValues } from "./values.ts";

export { comparerImages } from "./images.ts";
export type { ImageComparison, ImageZone } from "./images.ts";
export { releverValeurs } from "./values.ts";
export type { ScreenValues, Table } from "./values.ts";

export interface ReleveCapture {
  ecran: string;
  vue: string;
  version: string;
  png: Uint8Array;
  texte: string;
  url: string;
}

export interface EntreeVerification {
  releve: ReleveCapture; // the one just taken
  releves: ReleveCapture[]; // all those of the run so far, this one included
  regles: Regle[]; // every rule of the tests of the run
  reference?: Uint8Array; // PNG of the same (ecran, vue) in the reference version, if there is one
  version_reference?: string;
  decisions: Decision[]; // memory: decisions already taken
}

export interface Constat {
  genre: "regle" | "visuel";
  statut: Statut;
  regle?: Regle;
  valeurs: Record<string, string>; // same shape as ResultatVerification.valeurs
  calcul?: string; // spelled out, in French
  description: string; // one short French sentence, said by the mascot
  textes_a_surligner: string[]; // texts as displayed on the current screen, to highlight (faulty value, faulty row)
  zone?: { x: number; y: number; largeur: number; hauteur: number }; // for a visual finding
  pixels?: number; // differing pixels in the zone
  decision_id?: string; // when a « voulu » decision neutralises the gap
  raison?: string; // for INCONCLUSIVE
}

function visualFindings({ releve, reference, version_reference, decisions }: EntreeVerification & { reference: Uint8Array }): Constat[] {
  const { sameSize, size, referenceSize, zones } = comparerImages(releve.png, reference);
  if (!sameSize) {
    const raison = `tailles différentes : ${size.width} × ${size.height} contre ${referenceSize.width} × ${referenceSize.height} pour la référence`;
    return [{ genre: "visuel", statut: "INCONCLUSIVE", valeurs: {}, description: `Je n'ai pas pu comparer l'image : ${raison}.`, textes_a_surligner: [], raison }];
  }
  const description = `Cette zone a changé depuis la version ${version_reference ?? "de référence"}.`;
  return zones.map(({ pixels, ...zone }, index) => {
    const ecart: EcartVisuel = { id: `${releve.ecran}--${releve.vue}--${index + 1}`, ecran: releve.ecran, vue: releve.vue, description, zone, statut: "SUSPECTED" };
    const decision = decisionQuiNeutralise(ecart, releve.version, decisions);
    return {
      genre: "visuel",
      statut: decision ? "PASS" : "SUSPECTED",
      valeurs: {},
      description,
      textes_a_surligner: [],
      zone,
      pixels,
      ...(decision && { decision_id: decision.id }),
    };
  });
}

export function verifierReleve(entree: EntreeVerification): Constat[] {
  const { releve, releves, regles, reference } = entree;
  const read = new Map<ReleveCapture, ScreenValues>();
  const valuesOf = (capture: ReleveCapture) => read.get(capture) ?? read.set(capture, releverValeurs(capture.texte)).get(capture)!;
  const index = releves.map((capture) => capture.ecran === releve.ecran && capture.vue === releve.vue).lastIndexOf(true);
  const before = index === -1 ? releves : releves.slice(0, index);

  // The capture a rule reads on each of its screens: for a filter rule, the latest one whose active filter is the filter of the rule;
  // for the others, the latest one of the view « defaut » (no filter). null while a screen is missing.
  const pick = (regle: Regle, captures: ReleveCapture[]) => {
    const picked = new Map<string, ReleveCapture>();
    for (const ecran of regle.type === "egalite" ? [regle.a.ecran, regle.b.ecran] : [regle.ecran]) {
      const capture = captures
        .filter((candidate) => candidate.ecran === ecran && (regle.type === "filtre" ? key(valuesOf(candidate).filter ?? "") === key(regle.filtre) : candidate.vue === "defaut"))
        .at(-1);
      if (!capture) return null;
      picked.set(ecran, capture);
    }
    return picked;
  };

  const constats: Constat[] = [];
  // A rule is judged once, on the capture that makes it decidable: this capture is read by the rule, and the rule was not decidable before.
  for (const regle of new Map(regles.map((rule) => [JSON.stringify(rule), rule])).values()) {
    const picked = pick(regle, [...before, releve]);
    if (!picked || ![...picked.values()].includes(releve) || pick(regle, before)) continue;
    constats.push(checkRule(regle, new Map([...picked].map(([ecran, capture]) => [ecran, valuesOf(capture)])), releve.ecran));
  }
  if (reference) constats.push(...visualFindings({ ...entree, reference }));
  return constats;
}
