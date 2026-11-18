"use server";

import type { Decision, TestPropose } from "@horama/contrats";
import { redirect } from "next/navigation";
import { LOGICIEL } from "../lib/config";
import {
  accepterTest, appliquerCorrection, ecrireDecision, lancerPassage, lireFil, lirePassage, lireResultats, listerEcrans,
} from "../lib/donnees";
import { screenshot } from "../lib/screenshots";

// "Lancer un passage" and "Rejouer le passage": play the accepted tests of the vault, then follow the passage live.
export async function launch() {
  const l = await listerEcrans(LOGICIEL);
  const { passage_id } = await lancerPassage({
    logiciel: LOGICIEL,
    version_testee: l.version_testee,
    version_reference: l.version_reference,
    tests: l.tests.map((t) => t.id),
  });
  redirect(`/passages/${passage_id}/direct`);
}

// Live thread: the events that arrived since index `depuis`.
export async function follow(id: string, depuis: number) {
  const [passage, evenements] = await Promise.all([lirePassage(id), lireFil(id, depuis)]);
  return { passage, evenements, images: evenements.flatMap((e) => (e.capture_url ? [screenshot(e.capture_url)] : [])) };
}

export const accept = async (test: TestPropose, reponses: Record<string, string>) => accepterTest(test, reponses);

// "C'est un bug" / "C'est voulu" on a case of the review queue.
export async function decide(passage_id: string, test_id: string, ecart_id: string | undefined, decision: Decision["decision"]) {
  const [passage, resultats] = await Promise.all([lirePassage(passage_id), lireResultats(passage_id)]);
  const resultat = resultats.find((r) => r.test_id === test_id)!;
  const ecart = resultat.ecarts_visuels.find((e) => e.id === ecart_id);
  return ecrireDecision({
    id: `${new Date().toISOString().slice(0, 10)}-${ecart_id ?? test_id}`,
    passage_id,
    test_id,
    ecart_id,
    decision,
    logiciel: passage!.logiciel,
    ecran: ecart?.ecran ?? resultat.ecrans[0],
    vue: ecart?.vue ?? "defaut",
    ecart: ecart?.description ?? resultat.calcul ?? test_id,
    zone: ecart?.zone,
    version: resultat.version_testee,
    portee: "cet ecart, cet ecran, cette version",
    par: "relecture",
    le: new Date().toISOString(),
  });
}

export const applyCorrection = async (decision: Decision) => appliquerCorrection(decision);

// "Laisser la note telle quelle": the decision stays, its note correction is refused.
export const refuseCorrection = async (decision: Decision) =>
  ecrireDecision({ ...decision, correction_de_note: decision.correction_de_note && { ...decision.correction_de_note, statut: "refusee" } });
