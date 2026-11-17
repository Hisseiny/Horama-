# Coureur : un écart d'image ne compte que pour le premier test qui demande l'écran

Lancé le 17/11/2026 par Devin sur la branche `a-ecart-visuel-premier-test` (depuis `dev-nathan`, `ab85baf`). Aucune session H, aucune base (`--sans-base`).

## Changement

`verifierTest` (`agent/src/verification.ts`) reçoit les tests du passage, dans l'ordre (`passageTests`, passé par `coureur.ts` : `consigne.tests`). Pour chaque relevé, le premier test du passage qui demande cet écran et cette vue en garde les constats visuels. Les autres tests qui passent par l'écran ne gardent que leurs constats de règle. C'est la même attribution que la scène fait pour le `test_id` des décisions (`testOf`, `part` = premier test qui demande le relevé). Sans `passageTests`, un test reste seul propriétaire de ses écrans : le comportement d'avant.

## Vérification

- `pnpm --filter @horama/agent check` : 82 tests, 82 réussis, dont le nouveau « un écart visuel ne compte que pour le premier test du passage qui demande l'écran ».
- `pnpm -r check` : sortie 0.

## Rejeu scripté

Depuis `automatisation/scene/`, Chrome Linux local, copie du vault avec des références v12 refaites sous Linux (voir `2026-11-17-rythme-ci.md`) :

1. `node parcours.mjs --sans-agent --sans-base --choix bug,bug,voulu --rythme 1 --vault essais/premier-vault --sortie essais/premier-1 --profil essais/profil --fermer-chrome` : code 0, passage `2026-11-17-14h53-a718`.
2. Même commande avec `--sans-fin` à la place de `--choix`, sur le même vault (les décisions de 1 sont donc lues) : code 0, passage `2026-11-17-14h54-914b`.

| Test | Avant (`2026-11-17-14h43-ea5d`, PR 30) | Passage 1 | Passage 2 |
|---|---|---|---|
| `ca-du-mois-egal-total` | `VERIFIED_FAIL`, 2 écarts visuels | `VERIFIED_FAIL`, 2 écarts visuels (`ca-mois` et « Exporter », `SUSPECTED`) | `VERIFIED_FAIL`, « Exporter » neutralisé par `2026-11-17-liste-des-factures-exporter` (`PASS`) |
| `liste-factures-filtre-echeance` | `VERIFIED_FAIL`, aucun écart | `VERIFIED_FAIL`, aucun écart | `VERIFIED_FAIL` |
| `detail-facture-total-egal-liste` | **`SUSPECTED`** (écart « Exporter ») | **`PASS`**, aucun écart, 480,00 = 480,00 ; 300,00 + 180,00 = 480,00 | `PASS`, aucun écart |
| C4 du passage | 2 `VERIFIED_FAIL`, 1 `SUSPECTED` | 2 `VERIFIED_FAIL`, 0 `SUSPECTED`, 1 `PASS` | 2 `VERIFIED_FAIL`, 0 `SUSPECTED`, 1 `PASS` |

Au passage 1, la décision « voulu » sur « Exporter » porte `test_id: "ca-du-mois-egal-total"`, le test qui garde maintenant l'écart dans son C4.

## Ce qui ne change pas

- Le jugement (`jugement/verification`), les relevés, les constats de la scène et ses décisions. Le compteur de la scène dit toujours « 2 problèmes et 1 doute » : il compte les constats, pas les C4.
- L'écart reste dans le C4 du premier test, même quand celui-ci est `VERIFIED_FAIL` : son statut ne le montre pas, mais son champ `ecarts_visuels` le porte.

## Limites

- Si le premier test qui demande l'écran sort `INCONCLUSIVE` avant le jugement (capture manquante, session échouée), l'écart d'image de cet écran n'apparaît dans aucun C4 du passage. Il reste dans les constats de la scène.
- Pas de passage réel avec l'agent H : seulement le mode scripté sous Linux.
