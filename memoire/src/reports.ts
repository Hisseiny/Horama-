import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EcartVisuel, RapportPassage, ResultatVerification, Statut } from "@horama/contrats";
import { compactJson, yamlScalar } from "./files.ts";

// From the most serious to the least serious. Only PASS is a success.
const SEVERITY: Statut[] = ["VERIFIED_FAIL", "SUSPECTED", "INCONCLUSIVE", "PASS"];
const LABELS: Record<Statut, string> = {
  VERIFIED_FAIL: "défaut prouvé",
  SUSPECTED: "suspect",
  INCONCLUSIVE: "non concluant",
  PASS: "conforme",
};

const duration = (seconds?: number) =>
  seconds === undefined ? "inconnue" : seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
const cost = (usd?: number | null) => (usd == null ? "inconnu" : `${usd} $`);

function visualGap(ecart: EcartVisuel): string {
  const { x, y, largeur, hauteur } = ecart.zone;
  const outcome = ecart.statut === "PASS" ? `neutralisé par la décision ${ecart.decision_id ?? "inconnue"} (\`PASS\`)` : "à trancher (`SUSPECTED`)";
  return `- Écart visuel ${ecart.id} (${ecart.ecran}, vue ${ecart.vue}) : ${ecart.description}. Zone de ${largeur} × ${hauteur} px en x = ${x}, y = ${y}, ${outcome}.`;
}

function resultLines(result: ResultatVerification, replay?: string): string[] {
  const values = Object.entries(result.valeurs).map(([name, value]) => `${name} = ${value}`);
  return [
    `- Statut : ${LABELS[result.statut]} (\`${result.statut}\`), niveau de preuve : ${result.niveau_de_preuve}.`,
    ...(result.raison ? [`- Raison : ${result.raison}`] : []),
    `- Règle : ${result.regle ? `\`${compactJson(result.regle)}\`` : "aucune"}`,
    `- Valeurs : ${values.join(" ; ") || "aucune"}`,
    `- Calcul : ${result.calcul ?? "aucun"}`,
    ...(result.ecarts_visuels.length ? result.ecarts_visuels.map(visualGap) : ["- Écarts visuels : aucun"]),
    `- Replay : ${replay ? `[session H](${replay})` : "aucun lien"}`,
    "",
  ];
}

export function ecrireRapportPassage(vault: string, rapport: RapportPassage, resultats: ResultatVerification[]): string {
  const { passage } = rapport;
  const tests = [...new Set([...rapport.tests.map((test) => test.test_id), ...resultats.map((result) => result.test_id)])]
    .map((id) => {
      const session = rapport.tests.find((test) => test.test_id === id);
      const results = resultats.filter((result) => result.test_id === id);
      // A test without any verification result, or whose session did not finish, is never a success.
      const statuses = results.map((result) => result.statut);
      if (!results.length || session?.etat === "non_concluant") statuses.push("INCONCLUSIVE");
      return { id, session, results, statut: SEVERITY.find((statut) => statuses.includes(statut))! };
    })
    .sort((a, b) => SEVERITY.indexOf(a.statut) - SEVERITY.indexOf(b.statut));
  const count = (statut: Statut) => tests.filter((test) => test.statut === statut).length;

  const markdown = [
    "---",
    `passage: ${yamlScalar(passage.id)}`,
    `logiciel: ${yamlScalar(passage.logiciel)}`,
    `version_testee: ${JSON.stringify(passage.version_testee)}`,
    `version_reference: ${JSON.stringify(passage.version_reference)}`,
    `debut: ${yamlScalar(passage.debut)}`,
    "---",
    "",
    `# Passage ${passage.id}`,
    "",
    `Version testée : ${passage.version_testee}. Version de référence : ${passage.version_reference}.`,
    `Tests joués : ${tests.length}. Réussites : ${count("PASS")} (seuls les tests conformes comptent).`,
    `Durée : ${duration(passage.duree_s)}. Coût : ${cost(passage.cout_usd)}.`,
    "",
    "| Statut | Tests |",
    "|---|---|",
    ...SEVERITY.map((statut) => `| ${LABELS[statut]} (\`${statut}\`) | ${count(statut)} |`),
    "",
    ...tests.flatMap(({ id, session, results, statut }) => [
      `## ${id} : ${LABELS[statut]}`,
      "",
      session
        ? `Session ${session.etat === "termine" ? "terminée" : `non concluante${session.raison ? ` (${session.raison})` : ""}`} : ${duration(session.duree_s)}, ${session.etapes} étapes, coût ${cost(session.cout_usd)}. Écrans relevés : ${session.ecrans_releves.join(", ") || "aucun"}.`
        : "Session absente du rapport de passage.",
      "",
      ...(results.length
        ? results.flatMap((result) => resultLines(result, result.replay_url ?? session?.replay_url))
        : [`- Aucun résultat de vérification. Replay : ${session?.replay_url ? `[session H](${session.replay_url})` : "aucun lien"}`, ""]),
    ]),
  ].join("\n");

  const chemin = `${passage.logiciel}/passages/${passage.id}.md`;
  mkdirSync(join(vault, passage.logiciel, "passages"), { recursive: true });
  writeFileSync(join(vault, chemin), markdown);
  return chemin;
}
