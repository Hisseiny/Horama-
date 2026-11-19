// Writes banc/cas.md from faux-saas/verite.json (the truth written before any measure) and faux-saas/positions.json.
// Usage: node banc/scripts/ecrire-cas.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const racine = resolve(import.meta.dirname, "../..");
const verite = JSON.parse(readFileSync(join(racine, "faux-saas/verite.json"), "utf8"));
const positions = Object.fromEntries(
  Object.values(JSON.parse(readFileSync(join(racine, "faux-saas/positions.json"), "utf8"))).map((p) => [p.id, p]),
);
const ecrans = { "tableau-de-bord": "Tableau de bord", "liste-des-factures": "Liste des factures", "detail-facture": "Détail facture" };
const bugs = verite.filter((c) => c.nature === "bug");
const voulus = verite.filter((c) => c.nature !== "bug");
const ligne = (c) =>
  "| `" + c.id + "` | " + ecrans[c.ecran] + " | " + c.description + " | " + (c.entre_ecrans ? "oui" : "") + " | " +
  (c.contredit_la_doc ? "oui" : "") + " | " + (c.defaut_v13 ? "oui" : "") + " | " + (positions[c.id]?.pixels_differents ?? "à mesurer") + " |";
const entete = "| Cas | Écran | Ce qui change en v13 | Entre écrans | Contredit la doc | Actif par défaut | Pixels changés |\n|---|---|---|---|---|---|---|";

const md = `# Banc de mesure d'Horama : les cas et leur vérité

Tâche 3.9 de la mission CDO. Ce fichier est **généré** par \`node banc/scripts/ecrire-cas.mjs\` à partir de \`faux-saas/verite.json\` : il n'y a rien à recopier à la main.

## D'où vient la vérité

- Le logiciel testé est Facturo, le faux SaaS de l'équipe (\`faux-saas/\`), en version 12 (référence) et 13 (testée).
- Chaque changement de la v13 s'active seul avec le paramètre \`r=<id>\` de l'adresse d'entrée.
- La vérité (bug ou voulu, écran, zone) a été écrite **avant toute mesure** : le 16/11 par le CAO (15 changements), puis le 17/11 par la CDO (3 bugs presque invisibles : \`centime-detail\`, \`arrondi-total-liste\`, \`echeance-decalee\`). Le premier passage du banc date du 19/11.
- Les pixels changés viennent de \`faux-saas/positions.json\`, mesurés par \`faux-saas/scripts/verifier-regressions.mjs\` (v13 avec ce seul changement contre v13 sans changement).

## Composition

| | Nombre |
|---|---|
| Bugs (régressions) | ${bugs.length} |
| dont entre deux écrans | ${bugs.filter((c) => c.entre_ecrans).length} |
| dont presque invisibles à l'œil (moins de 100 pixels changés) | ${bugs.filter((c) => (positions[c.id]?.pixels_differents ?? 999) < 100).length} |
| Changements voulus | ${voulus.length} |
| dont qui contredisent la doc | ${voulus.filter((c) => c.contredit_la_doc).length} |
| **Total** | **${verite.length}** |

Écart avec la mission : elle demandait environ 10 régressions et 5 voulus, un écran avec les deux, et 5 notes de version. Le banc a ${bugs.length} régressions et ${voulus.length} voulus ; la liste des factures porte les deux. Une seule note de version existe dans le vault (\`facturo/notes-de-version/\`) : les 4 autres sont à écrire.

## Les ${bugs.length} bugs

${entete}
${bugs.map(ligne).join("\n")}

## Les ${voulus.length} changements voulus

${entete}
${voulus.map(ligne).join("\n")}

## Ce qu'on attend d'Horama sur chaque cas

| Nature du cas | Bonne réponse | Acceptable | Mauvaise réponse |
|---|---|---|---|
| Bug | défaut prouvé (\`VERIFIED_FAIL\`) | doute envoyé à l'humain (\`SUSPECTED\`) | rien vu |
| Voulu | doute envoyé à l'humain, qui répond « voulu » | rien vu (si rien n'est attendu à l'écran) | **défaut prouvé** : c'est une fausse alarme |

\`SUSPECTED\` et \`INCONCLUSIVE\` ne comptent jamais comme des réussites (règle de l'équipe) : dans les chiffres, un bug vu comme doute n'est pas un bug prouvé.

## Cas cachés

Règle du pôle : ce dossier ne se lit pas quand on travaille pour le CTO ou la CAIO (\`AGENTS.md\`), pour que les consignes de l'agent et de génération des tests ne soient pas écrites en regardant les réponses.
`;
writeFileSync(join(racine, "banc/cas.md"), md);
console.log("banc/cas.md écrit :", verite.length, "cas");
