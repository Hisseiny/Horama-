import type { Decision } from "@horama/contrats";
import type { Constat } from "./index.ts";
import { normalize, plainCents, readCents } from "./values.ts";
import { formuler } from "./wording.ts";

// All the findings of a run, in order. A visual doubt whose text is one of the values of a proven defect, on the same screen,
// is explained by this defect: it gets `explique_par`. Nothing is removed.
export function consoliderConstats(constats: Constat[]): Constat[] {
  const defects = constats.filter((constat) => constat.genre === "regle" && constat.statut === "VERIFIED_FAIL");
  return constats.map((constat) => {
    if (constat.genre !== "visuel" || constat.statut !== "SUSPECTED" || !constat.texte_zone) return constat;
    // The text read as an amount (the way `valeurs` writes it) and as a text.
    const amount = readCents(constat.texte_zone);
    const read = [normalize(constat.texte_zone), ...(amount === null ? [] : [plainCents(amount)])];
    const defect = defects.find(({ valeurs }) => Object.entries(valeurs).some(([name, value]) => name.startsWith(`${constat.ecran}.`) && read.includes(value)));
    return defect ? { ...constat, explique_par: defect.id } : constat;
  });
}

const kebab = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// A short word that tells the findings of a screen apart: the text under the zone, or what the rule is about.
function word({ regle, texte_zone, nature, id }: Constat): string {
  if (regle?.type === "egalite") return regle.a.champ;
  if (regle?.type === "somme") return `somme ${regle.cible}`;
  if (regle?.type === "filtre") return `filtre ${regle.filtre}`;
  if (regle?.type === "format") return `format ${regle.colonne}`;
  if (regle?.type === "presence") return `${regle.colonne} vide`;
  return kebab(texte_zone ?? "") ? texte_zone! : `${nature ?? "image"} ${id.split("--").at(-1)}`;
}

// The human decision on a finding, ready for `ecrireDecision` of @horama/memoire.
// For a visual doubt, `zone` is the one of the finding (the new place of a moved element): a « voulu » neutralises it on the next run.
export function versDecision(
  constat: Constat,
  choix: "bug" | "voulu",
  contexte: { passage_id: string; test_id: string; logiciel: string; version: string; par: string; le: string },
): Decision {
  return {
    id: `${contexte.le.slice(0, 10)}-${constat.ecran}-${kebab(word(constat))}`,
    passage_id: contexte.passage_id,
    test_id: contexte.test_id,
    ecart_id: constat.id,
    decision: choix,
    logiciel: contexte.logiciel,
    ecran: constat.ecran,
    vue: constat.vue,
    ecart: formuler(constat).resultat,
    ...(constat.genre === "visuel" && constat.zone && { zone: constat.zone }),
    version: contexte.version,
    portee: "cet ecart, cet ecran, cette version",
    par: contexte.par,
    le: contexte.le,
  };
}
