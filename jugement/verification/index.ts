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
export { formuler } from "./wording.ts";
export { consoliderConstats, versDecision } from "./review.ts";

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

type Zone = EcartVisuel["zone"];

export interface Constat {
  id: string; // stable within a run: <ecran>--<vue>--<genre>--<n>
  ecran: string; // the capture the finding comes out on
  vue: string;
  genre: "regle" | "visuel";
  statut: Statut;
  regle?: Regle;
  valeurs: Record<string, string>; // same shape as ResultatVerification.valeurs
  calcul?: string; // spelled out, in French
  description: string; // one short French sentence, said by the mascot
  textes_a_surligner: string[]; // texts as displayed on the current screen, to highlight (faulty value, faulty row)
  zone?: Zone; // for a visual finding; for a moved element, its new place
  pixels?: number; // differing pixels in the zone
  decision_id?: string; // when a « voulu » decision neutralises the gap
  raison?: string; // for INCONCLUSIVE
  nature?: "deplacement" | "changement"; // for a visual finding with a zone
  zone_avant?: Zone; // for a moved element, its old place
  page?: { largeur: number; hauteur: number }; // size of the compared image, to say where a zone is
  texte_zone?: string; // filled by the scene: the text of the element at the centre of the zone
  explique_par?: string; // id of the proven defect that explains this doubt (consoliderConstats)
}

// Where a finding comes out: the capture just taken, and its rank among the findings of its kind on this capture.
const situate = ({ ecran, vue }: ReleveCapture, genre: Constat["genre"], n: number) => ({ id: `${ecran}--${vue}--${genre}--${n}`, ecran, vue, genre });

function visualFindings({ releve, reference, version_reference, decisions }: EntreeVerification & { reference: Uint8Array }): Constat[] {
  const { sameSize, size, referenceSize, zones } = comparerImages(releve.png, reference);
  if (!sameSize) {
    const raison = `tailles différentes : ${size.width} × ${size.height} contre ${referenceSize.width} × ${referenceSize.height} pour la référence`;
    return [{ ...situate(releve, "visuel", 1), statut: "INCONCLUSIVE", valeurs: {}, description: `Je n'ai pas pu comparer l'image : ${raison}.`, textes_a_surligner: [], raison }];
  }
  const description = `Cette zone a changé depuis la version ${version_reference ?? "de référence"}.`;
  return zones.map(({ pixels, zone_avant, ...zone }, index) => {
    const place = situate(releve, "visuel", index + 1);
    // One finding for a moved element: a decision on its new place settles the old place with it.
    const decision = decisionQuiNeutralise({ ...place, description, zone, statut: "SUSPECTED" }, releve.version, decisions);
    return {
      ...place,
      statut: decision ? "PASS" : "SUSPECTED",
      valeurs: {},
      description,
      textes_a_surligner: [],
      zone,
      pixels,
      ...(decision && { decision_id: decision.id }),
      nature: zone_avant ? "deplacement" : "changement",
      ...(zone_avant && { zone_avant }),
      page: { largeur: size.width, hauteur: size.height },
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
  // for a rule « etat », the latest one of its view (D7, condition 3); for the others, the latest one of the view « defaut » (no filter).
  // null while a screen is missing.
  const pick = (regle: Regle, captures: ReleveCapture[]) => {
    const picked = new Map<string, ReleveCapture>();
    for (const ecran of regle.type === "egalite" ? [regle.a.ecran, regle.b.ecran] : [regle.ecran]) {
      const capture = captures
        .filter(
          (candidate) =>
            candidate.ecran === ecran &&
            (regle.type === "filtre" ? key(valuesOf(candidate).filter ?? "") === key(regle.filtre) : candidate.vue === (regle.type === "etat" ? regle.vue : "defaut")),
        )
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
    constats.push({ ...situate(releve, "regle", constats.length + 1), ...checkRule(regle, new Map([...picked].map(([ecran, capture]) => [ecran, valuesOf(capture)])), releve.ecran) });
  }
  if (reference) constats.push(...visualFindings({ ...entree, reference }));
  return constats;
}
