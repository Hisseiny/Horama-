# J5b : pendant le parcours, la mascotte se tait et l'agent n'attend plus (17 novembre 2026)

Couloir Nathan, branche `dev-nathan` (J5a et J5b fusionnés). Facturo en ligne (https://facturo-demo.vercel.app, v13, référence v12), agent H, base partagée, copie neuve du vault à chaque parcours, `settle_s` 1,2 s, couche dans un monde isolé.

## Commande

`.orchestrateur/trois-parcours.sh` (hors Git), depuis le worktree de J5b : trois parcours de suite, 40 s de pause entre deux sessions H, `--choix bug,bug,voulu`, témoins au premier. La correction de note proposée après le « voulu » a été tranchée par Nathan à la souris (le script ne passait pas `--correction-choix`) : acceptée, refusée, acceptée.

## Mesures

| Passage | Sortie | État en base | Clics (attendus 5) | Durée du coureur (s) | Coût ($) | Étapes | Relevé le plus long (ms) | Bulles avant le récapitulatif | Décisions | J3 hors zones |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|
| `2026-11-17-17h02-46c5` | 0 | `verifie` | 5 | 66,1 | 0,0315 | 13 | 98 | 0 | bug, bug, voulu (correction acceptée) | 0 |
| `2026-11-17-17h10-ab6d` | 0 | `verifie` | 5 | 72,3 | 0,0313 | 13 | 111 | 0 | bug, bug, voulu (correction refusée) | 0 |
| `2026-11-17-17h15-6335` | 0 | `verifie` | 5 | 67,1 | 0,0279 | 13 | 114 | 0 | bug, bug, voulu (correction acceptée) | 0 |

- C4 (coureur) aux trois : `ca-du-mois-egal-total` VERIFIED_FAIL, `detail-facture-total-egal-liste` SUSPECTED, `liste-factures-filtre-echeance` VERIFIED_FAIL ; 4 captures 1280 × 900.
- **Durée du coureur : 66 à 72 s, contre 108 à 111 s en J4** (même agent, même `settle_s`, la mascotte présentait chaque écran pendant que l'agent attendait). Le relevé le plus long passe de 20,1 s à 0,1 s.
- Récapitulatif dit à 70 à 75 s du début de la commande. `fin_s` (du dernier relevé à l'écran de fin) : 385, 221 et 1 796 s ; il comprend l'attente du clic humain sur la correction, ce n'est pas une durée de la scène.
- Décisions en base : l'identifiant d'une décision (date, écran, écart) fait que chaque parcours réécrit les 3 mêmes lignes ; relu après la série, elles portent le dernier passage. L'état `verifie` des deux premiers prouve que leurs écritures avaient réussi.
- Journal de chaque parcours : 0 ligne « Mascotte » et 0 bulle avant `Récapitulatif :`.

## Non mesuré

- Un parcours où l'humain répond aussi aux questions bug ou voulu à la souris avec cette version (quatrième parcours, avec Nathan).
- Le rendu sur un grand écran.

Témoins : `docs/captures/2026-11-17-scene-muette/`.
