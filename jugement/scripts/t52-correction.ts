// Measure of task 5.2: the note correction proposed after a "voulu", on the 5 intended changes of Facturo (faux-saas/verite.json).
// Usage, from the root of the repo: node --env-file=.env.local jugement/scripts/t52-correction.ts [model ...]
// Adds one run to docs/tests/2026-11-17-correction.md (earlier runs are kept). No number of that file is written by hand.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Decision } from "@horama/contrats";
import { proposerCorrection } from "../index.ts";
import { CORRECTION_MODEL } from "../correction/index.ts";
import type { ModelCall } from "../index.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const VAULT = `${ROOT}vault-horama`;
const OUTPUT = `${ROOT}docs/tests/2026-11-17-correction.md`;
const PASSES = 3;
const models = process.argv.slice(2).length ? process.argv.slice(2) : [CORRECTION_MODEL];
if (!process.env.HF_TOKEN) throw new Error("HF_TOKEN absent : lancer avec node --env-file=.env.local");

interface Truth { id: string; ecran: string; vue: string; nature: string; contredit_la_doc: boolean; texte_apres?: string }
const truth = (JSON.parse(readFileSync(`${ROOT}faux-saas/verite.json`, "utf8")) as Truth[]).filter(({ nature }) => nature === "voulu");

// What the scene knows when the human says "voulu": the sentence of formuler (ecart) and its question (hint).
// Written by hand from the wording rules of verification/wording.ts; the expected sentence comes from the note, the truth from verite.json.
const CASES: Record<string, { ecart: string; indice?: string; avant?: string; apresContient?: string }> = {
  "export-haut": {
    ecart: "« Exporter » a changé de place.",
    indice: "« Exporter » a été déplacé vers le haut, il est maintenant en haut à droite. Bug ou voulu ?",
    avant: "Le bouton « Exporter » se trouve en bas du tableau.",
    apresContient: "haut",
  },
  "colonne-renommee": {
    ecart: "Quelque chose a changé ici, autour de « Société ».",
    // Only if the scene reads the text of the same zone on the reference capture: demand made to Nathan in PR #11.
    indice: "Dans la version de référence, à cet endroit : « Client ».",
    avant: "Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ».",
    apresContient: "« Société »",
  },
  "bouton-nouvelle-facture": { ecart: "Quelque chose a changé ici, autour de « Nouvelle facture »." },
  "titre-tableau-de-bord": { ecart: "Quelque chose a changé ici, autour de « Vue d'ensemble »." },
  "badge-statut-detail": { ecart: "Quelque chose a changé ici, autour de « En attente de paiement »." },
};

const decisionOf = (t: Truth): Decision => ({
  id: `2026-11-18-${t.ecran}-${t.id}`,
  passage_id: "mesure-5-2",
  test_id: "mesure-5-2",
  ecart_id: `${t.ecran}--${t.vue}--visuel--1`,
  decision: "voulu",
  logiciel: "facturo",
  ecran: t.ecran,
  vue: t.vue,
  ecart: CASES[t.id].ecart,
  version: "13",
  portee: "cet ecart, cet ecran, cette version",
  par: "mesure",
  le: new Date().toISOString(),
});

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
const commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const start = new Date();
const lines: string[] = [];
const rows: string[] = [];

for (const modele of models) {
  const durations: number[] = [];
  let right = 0;
  for (const t of truth) {
    const expected = CASES[t.id];
    if (!expected) throw new Error(`Cas « ${t.id} » sans phrase d'écart dans le script`);
    for (let passe = 1; passe <= PASSES; passe++) {
      const calls: ModelCall[] = [];
      const proposal = await proposerCorrection(VAULT, decisionOf(t), { modele, indices: expected.indice ? [expected.indice] : [], trace: (call) => calls.push(call) });
      const correction = proposal.decision.correction_de_note;
      const ok = t.contredit_la_doc
        ? correction !== undefined && correction.avant === expected.avant && correction.apres.includes(expected.apresContient!) && !correction.apres.includes("« Client »")
        : correction === undefined;
      if (ok) right++;
      durations.push(proposal.duree_ms);
      const shown = correction ? `${correction.avant} → ${correction.apres}` : proposal.raison;
      rows.push(`| \`${modele}\` | \`${t.id}\` | ${t.contredit_la_doc ? "oui" : "non"} | ${passe} | ${ok ? "oui" : "non"} | ${proposal.essais} | ${proposal.duree_ms} | ${calls.map(({ inputTokens }) => inputTokens ?? "?").join("+")} | ${shown.replaceAll("|", "\\|")} |`);
      console.log(`${modele} ${t.id} passe ${passe} : ${ok ? "juste" : "faux"} (${proposal.duree_ms} ms)`);
    }
  }
  const total = truth.length * PASSES;
  lines.push(`- \`${modele}\` : **${right} sur ${total}** propositions justes ; temps médian ${seconds(median(durations))}.`);
}

const header = existsSync(OUTPUT)
  ? [readFileSync(OUTPUT, "utf8").trimEnd(), "", "---", ""]
  : ["# 5.2 : correction de note proposée après un « voulu »", "", "Fichier écrit par `jugement/scripts/t52-correction.ts` : aucun chiffre n'y est écrit à la main. Une section par lancement.", ""];
writeFileSync(OUTPUT, [
  ...header,
  `## Lancement du ${start.toISOString()}`,
  "",
  "### Ce qui a été lancé",
  "",
  "- Commande, depuis la racine : `node --env-file=.env.local jugement/scripts/t52-correction.ts " + models.join(" ") + "`",
  `- Début : ${start.toISOString()} ; code : commit \`${commit}\`.`,
  "- Indices donnés : la question de la mascotte pour `export-haut` ; le texte de la même zone dans la version de référence pour `colonne-renommee` (à fournir par la scène, demandé à Nathan).",
  `- Cas : les ${truth.length} changements « voulu » de \`faux-saas/verite.json\`, ${PASSES} passes chacun, température 0, un second essai au plus après un refus du code.`,
  "- Juste : pour un changement qui contredit la doc, la phrase remplacée est la bonne phrase de la note et la nouvelle dit le nouvel état ; pour un changement qui ne la contredit pas, aucune correction n'est proposée.",
  "",
  "### Ce qui en est sorti",
  "",
  ...lines,
  "- Critère de la tâche 5.2 : correction juste 3 cas sur 3 (ici, toutes les passes des cas qui contredisent la doc).",
  "",
  "| Modèle | Cas | Contredit la doc | Passe | Juste | Essais | Temps (ms) | Jetons en entrée | Proposition ou raison |",
  "|---|---|---|---|---|---|---|---|---|",
  ...rows,
  "",
].join("\n"));
console.log(`Écrit : ${OUTPUT}`);
