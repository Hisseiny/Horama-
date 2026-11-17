import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Capture, ResultatVerification, TestAccepte } from "@horama/contrats";
import { verifierReleve } from "@horama/jugement";
import type { Constat, ReleveCapture } from "@horama/jugement";
import { lireDecisions, lireReferences } from "@horama/memoire";

export interface AcquiredCapture { capture: Capture; png: Uint8Array }

export function verifierTest({ vault, logiciel, test, acquired, passageId, version, referenceVersion, sessionFailed, replayUrl, verify = verifierReleve }: {
  vault: string; logiciel: string; test: TestAccepte; acquired: AcquiredCapture[]; passageId: string;
  version: string; referenceVersion: string; sessionFailed: boolean; replayUrl?: string; verify?: typeof verifierReleve;
}): ResultatVerification {
  const captures = acquired.filter(({ capture }) => test.releves.some(({ ecran, vue }) => capture.ecran === ecran && capture.vue === vue));
  const output: ResultatVerification = {
    passage_id: passageId, test_id: test.id, version_testee: version, version_reference: referenceVersion,
    statut: "INCONCLUSIVE", ecrans: [...new Set(captures.map(({ capture }) => capture.ecran))],
    valeurs: {}, niveau_de_preuve: "aucun", ecarts_visuels: [], captures: captures.map(({ capture }) => capture.url),
    ...(test.regles.length === 1 ? { regle: test.regles[0] } : {}), ...(replayUrl ? { replay_url: replayUrl } : {}),
  };
  if (sessionFailed) return { ...output, raison: "La session du test a échoué." };
  if (test.releves.some(({ ecran, vue }) => !captures.some(({ capture }) => capture.ecran === ecran && capture.vue === vue))) {
    return { ...output, raison: "Une capture requise est manquante." };
  }
  try {
    const decisions = lireDecisions(vault, logiciel);
    const references = lireReferences(vault, logiciel).filter((candidate) => candidate.version === referenceVersion);
    const previous: ReleveCapture[] = [];
    const findings: Constat[] = [];
    for (const { capture, png } of captures) {
      const releve = { ecran: capture.ecran, vue: capture.vue, version: capture.version, png, texte: capture.texte_page, url: capture.url_page };
      previous.push(releve);
      const reference = references.find((candidate) => candidate.ecran === capture.ecran && candidate.vue === capture.vue);
      findings.push(...verify({ releve, releves: [...previous], regles: test.regles, decisions,
        ...(reference ? { reference: new Uint8Array(readFileSync(join(vault, reference.chemin))), version_reference: referenceVersion } : {}) }));
      if (reference) output.version_reference_capture = referenceVersion;
    }
    const rules = findings.filter((finding) => finding.genre === "regle");
    const missing = test.regles.some((rule) => !rules.some((finding) => JSON.stringify(finding.regle) === JSON.stringify(rule)));
    output.valeurs = Object.assign({}, ...rules.map((finding) => finding.valeurs));
    const calculations = rules.flatMap((finding) => finding.calcul ? [finding.calcul] : []);
    if (calculations.length) output.calcul = calculations.join(" ; ");
    output.niveau_de_preuve = calculations.length ? "releve + calcul" : captures.length ? "releve" : "aucun";
    output.ecarts_visuels = findings.flatMap((finding) => finding.genre === "visuel" && finding.zone && (finding.statut === "PASS" || finding.statut === "SUSPECTED")
      ? [{ id: finding.id, ecran: finding.ecran, vue: finding.vue, description: finding.description, zone: finding.zone, statut: finding.statut, ...(finding.decision_id ? { decision_id: finding.decision_id } : {}) }] : []);
    if (rules.some((finding) => finding.statut === "VERIFIED_FAIL" && finding.calcul && Object.keys(finding.valeurs).length)) {
      return { ...output, statut: "VERIFIED_FAIL" };
    }
    const incomplete = findings.find((finding) => finding.statut === "INCONCLUSIVE");
    if (missing || incomplete) return { ...output, raison: incomplete?.raison ?? "Une règle du test n’a pas été évaluée." };
    if (findings.some((finding) => finding.statut === "SUSPECTED")) output.statut = "SUSPECTED";
    else if (test.regles.length && rules.every((finding) => finding.statut === "PASS" && finding.calcul && Object.keys(finding.valeurs).length)) output.statut = "PASS";
    else output.raison = "Aucune preuve calculée complète pour ce test.";
    return output;
  } catch {
    return { ...output, statut: "INCONCLUSIVE", raison: "La vérification ou la lecture de ses références et décisions a échoué." };
  }
}
