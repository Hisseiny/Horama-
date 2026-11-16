import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { Decision, EcartVisuel, Version } from "@horama/contrats";
import { listMarkdown, yamlScalar } from "./files.ts";

type Zone = EcartVisuel["zone"];
type Correction = NonNullable<Decision["correction_de_note"]>;

const DECISION_BLOCK = /^```decision[ \t]*\n([\s\S]*?)^```[ \t]*$/m;

function documentationLine(correction?: Correction): string {
  if (!correction) return "aucune correction de note proposée.";
  if (correction.statut === "acceptee") return `${correction.fichier} corrigée (proposition acceptée).`;
  if (correction.statut === "refusee") return `${correction.fichier} laissée telle quelle (proposition refusée).`;
  return `correction de ${correction.fichier} proposée, en attente de réponse.`;
}

export function ecrireDecision(vault: string, decision: Decision): string {
  const { zone } = decision;
  const chemin = `${decision.logiciel}/decisions/${decision.id}.md`;
  const markdown = [
    "---",
    `date: ${yamlScalar(decision.le.slice(0, 10))}`,
    `version: ${yamlScalar(decision.version)}`,
    `ecran: ${yamlScalar(decision.ecran)}`,
    `vue: ${yamlScalar(decision.vue)}`,
    `par: ${yamlScalar(decision.par)}`,
    `decision: ${decision.decision}`,
    "---",
    "",
    `Écart : ${decision.ecart}`,
    `Décision : ${decision.decision}${decision.pourquoi ? ` (${decision.pourquoi})` : ""}`,
    `Portée : cet écart${zone ? ` (zone de ${zone.largeur} × ${zone.hauteur} px en x = ${zone.x}, y = ${zone.y})` : ""}, cet écran, cette version. Le reste de l'écran reste vérifié.`,
    `Documentation : ${documentationLine(decision.correction_de_note)}`,
    "",
    "```decision",
    JSON.stringify(decision, null, 2),
    "```",
    "",
  ].join("\n");
  mkdirSync(join(vault, decision.logiciel, "decisions"), { recursive: true });
  writeFileSync(join(vault, chemin), markdown);
  return chemin;
}

export function lireDecisions(vault: string, logiciel: string): Decision[] {
  const folder = join(vault, logiciel, "decisions");
  return listMarkdown(folder).map((name) => {
    try {
      const block = DECISION_BLOCK.exec(readFileSync(join(folder, name), "utf8"));
      if (!block) throw new Error("bloc ```decision absent");
      return JSON.parse(block[1]) as Decision;
    } catch (error) {
      throw new Error(`${logiciel}/decisions/${name} : décision illisible (${(error as Error).message})`);
    }
  });
}

function pendingCorrection(decision: Decision): Correction {
  const correction = decision.correction_de_note;
  if (!correction) throw new Error(`La décision « ${decision.id} » n'a pas de correction de note`);
  if (correction.statut !== "proposee") {
    throw new Error(`La correction de la décision « ${decision.id} » est déjà ${correction.statut === "acceptee" ? "acceptée" : "refusée"}`);
  }
  return correction;
}

function closeCorrection(vault: string, decision: Decision, statut: "acceptee" | "refusee"): Decision {
  const closed = { ...decision, correction_de_note: { ...pendingCorrection(decision), statut } };
  ecrireDecision(vault, closed);
  return closed;
}

export function appliquerCorrection(vault: string, decision: Decision): Decision {
  const { fichier, avant, apres } = pendingCorrection(decision);
  const root = resolve(vault, decision.logiciel);
  const file = resolve(root, fichier);
  if (!file.startsWith(root + sep)) throw new Error(`Correction refusée : « ${fichier} » sort du dossier ${decision.logiciel}`);
  const note = readFileSync(file, "utf8");
  const count = avant ? note.split(avant).length - 1 : 0;
  if (count !== 1) {
    throw new Error(`Correction refusée : le texte à remplacer apparaît ${count} fois dans ${fichier} (une seule attendue) : « ${avant} »`);
  }
  writeFileSync(file, note.replace(avant, () => apres));
  return closeCorrection(vault, decision, "acceptee");
}

export function refuserCorrection(vault: string, decision: Decision): Decision {
  return closeCorrection(vault, decision, "refusee");
}

function overlaps(a: Zone, b: Zone): boolean {
  const width = Math.min(a.x + a.largeur, b.x + b.largeur) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.hauteur, b.y + b.hauteur) - Math.max(a.y, b.y);
  return width > 0 && height > 0 && 2 * width * height >= Math.min(a.largeur * a.hauteur, b.largeur * b.hauteur);
}

const sameView = (decision: Decision, ecart: EcartVisuel, version: Version) =>
  decision.ecran === ecart.ecran && decision.vue === ecart.vue && decision.version === version;

export function decisionQuiNeutralise(ecart: EcartVisuel, version: Version, decisions: Decision[]): Decision | null {
  return (
    decisions.find(
      (decision) => decision.decision === "voulu" && sameView(decision, ecart, version) && decision.zone !== undefined && overlaps(decision.zone, ecart.zone),
    ) ?? null
  );
}

export function peutValiderReference(ecarts: EcartVisuel[], decisions: Decision[], version: Version): { ok: boolean; raison: string } {
  for (const ecart of ecarts) {
    const name = `l'écart ${ecart.id} (${ecart.ecran}, vue ${ecart.vue} : ${ecart.description})`;
    const linked = decisions.filter((decision) => decision.ecart_id === ecart.id && sameView(decision, ecart, version));
    if (linked.some((decision) => decision.decision === "bug")) return { ok: false, raison: `Référence non validée : ${name} est un bug.` };
    if (!linked.length && !decisionQuiNeutralise(ecart, version, decisions)) {
      return { ok: false, raison: `Référence non validée : ${name} n'est pas tranché.` };
    }
  }
  return { ok: true, raison: "Tous les écarts sont tranchés et aucun n'est un bug." };
}
