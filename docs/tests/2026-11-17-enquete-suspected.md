# Enquête : pourquoi `detail-facture-total-egal-liste` sort en `SUSPECTED`

**Conclusion.** Les deux règles du test sont vraies en v13 (480,00 = 480,00 et 300,00 + 180,00 = 480,00) : aucune règle ne produit le doute, et le test n'a aucune raison d'être `VERIFIED_FAIL`.
Le `SUSPECTED` vient de l'écart visuel du bouton « Exporter » sur `liste-des-factures` (déplacé de y = 465 à y = 136, `export-haut`), un écran que ce test relève aussi ; `verifierTest` (`agent/src/verification.ts`, ligne 51) met tout le test en `SUSPECTED` dès qu'un constat l'est.
C'est attendu vu `faux-saas/verite.json` : `export-haut` est un changement `voulu`, actif par défaut en v13 et contraire à la doc, donc à trancher par un humain ; une fois tranché « voulu » dans le vault, le même test sort `PASS` (rejoué ci-dessous).

Lancé le 17/11/2026 par Devin sur la branche `enquete-suspected-detail` (depuis `dev-nathan`, `bf2bb29`). Aucun code modifié, aucune session H, aucune base (`--sans-base`).

## Ce que dit le passage réel

Entrée de 14 h 55 de `docs/journal-nathan.md`, passage `2026-11-17-14h51-7b0a` :

- `resultats` en base : `ca-du-mois-egal-total` `VERIFIED_FAIL`, `detail-facture-total-egal-liste` `SUSPECTED`, `liste-factures-filtre-echeance` `VERIFIED_FAIL` ;
- J3 sur les relevés réels : tableau de bord 387 pixels changés, tous dans `ca-mois` ; liste 1 320 pixels, tous dans `export-haut` ; détail F-119 **0 pixel** ; 0 pixel hors zones.

Le détail F-119 est donc identique à sa référence v12 : le doute ne vient pas de l'écran `detail-facture`.

## Le test

`vault-horama/facturo/tests/detail-facture-total-egal-liste.md` :

- relevés : `liste-des-factures` vue `defaut`, puis `detail-facture` vue `defaut` ;
- règle 1, `egalite` : `detail-facture` « Total TTC » = `liste-des-factures` « Montant TTC de F-119 » ;
- règle 2, `somme` : la colonne « Montant » de `detail-facture` = « Total TTC ».

## Le code qui produit `SUSPECTED`

1. **Les règles ne peuvent pas donner `SUSPECTED`.** `checkRule` (`jugement/verification/rules.ts`) rend `PASS` si la règle est vraie, `VERIFIED_FAIL` si elle est fausse et lisible, `INCONCLUSIVE` si une valeur est illisible.
2. **Les écarts d'image donnent `SUSPECTED`.** Dans `verifierReleve` (`jugement/verification/index.ts`, ligne 115), chaque relevé qui a une référence passe par `visualFindings` : chaque zone d'au moins 6 pixels qui diffèrent (`MIN_PIXELS`, tolérance 24 par canal, `images.ts`) devient un constat `visuel` `SUSPECTED` (ligne 73), sauf si une décision du vault la neutralise : il devient alors `PASS` avec `decision_id`.
3. **Le test hérite des écarts de tous ses écrans.** `verifierTest` (`agent/src/verification.ts`) appelle `verifierReleve` pour chaque relevé du test, donc aussi pour `liste-des-factures`, avec sa référence v12. Puis, dans l'ordre :
   - ligne 46 : une règle `VERIFIED_FAIL` avec calcul et valeurs → test `VERIFIED_FAIL` ;
   - ligne 50 : règle manquante ou constat `INCONCLUSIVE` → test `INCONCLUSIVE` ;
   - **ligne 51 : un constat `SUSPECTED`, règle ou visuel, sur n'importe quel écran du test → test `SUSPECTED`** ;
   - sinon, toutes les règles `PASS` → test `PASS`.

Pour ce test, la condition qui déclenche le doute est la ligne 51, avec le constat visuel `liste-des-factures--defaut--visuel--1`.

## Rejeu scripté

Commandes, depuis `automatisation/scene/`, Chrome Linux local (`CHROME_BIN=$HOME/.local/bin/google-chrome DISPLAY=:0`), sur des copies du vault dans `essais/` (ignoré par Git) :

| Essai | Commande (options) | Références v12 | Passage |
|---|---|---|---|
| A | `--sans-agent --sans-base --sans-fin --rythme 1 --vault essais/enq-vault-locale` | refaites sous Linux (voir `2026-11-17-rythme-ci.md`) | `2026-11-17-14h43-ea5d` |
| B | `--sans-agent --sans-base --sans-fin --rythme 1 --plafond 1 --vault essais/enq-vault-repo` | celles du repo (Mac) | `2026-11-17-14h44-ebca` |
| C1 | `--sans-agent --sans-base --choix bug,bug,voulu --rythme 1 --vault essais/enq-vault-voulu` | refaites sous Linux | `2026-11-17-14h45-0b28` |
| C2 | `--sans-agent --sans-base --sans-fin --rythme 1 --vault essais/enq-vault-voulu` (même vault, après C1) | refaites sous Linux | `2026-11-17-14h46-600f` |

Tous sortent avec le code 0. Les C4 sont lus dans le rapport du coureur (`<vault>/facturo/passages/<id>.md`) et les constats dans `passage.json`.

### Essai A : même résultat que le passage réel

C4 : 2 `VERIFIED_FAIL`, 1 `SUSPECTED`, 0 `PASS`, comme en réel. Constats du test `detail-facture-total-egal-liste` :

| Constat | Genre | Statut | Valeurs | Calcul |
|---|---|---|---|---|
| `detail-facture--defaut--regle--1` (`egalite`) | règle | `PASS` | `detail-facture.Total TTC` = 480.00 ; `liste-des-factures.Montant TTC de F-119` = 480.00 | 480,00 = 480,00 |
| `detail-facture--defaut--regle--2` (`somme`) | règle | `PASS` | `Montant de Maquette de site` = 300.00 ; `Montant de Intégration` = 180.00 ; `Total TTC` = 480.00 | 300,00 + 180,00 = 480,00 |
| `liste-des-factures--defaut--visuel--1` | visuel | **`SUSPECTED`** | aucune | zone 120 × 36 px en x = 1128, y = 136 ; `nature: "deplacement"`, `zone_avant` x = 1128, y = 465 ; 646 pixels ; `texte_zone` « Exporter » |

Aucun constat visuel sur `detail-facture` (0 zone), ce qui concorde avec les 0 pixel de J3 en réel. La zone et `zone_avant` sont exactement `apres` et `avant` de `export-haut` dans `faux-saas/positions.json`.

Ce constat n'est pas rattaché à un défaut prouvé par `consoliderConstats` (`review.ts`) : son texte « Exporter » n'est aucune valeur d'une règle `VERIFIED_FAIL`, il reste donc un doute à trancher.

### Essai B : références du repo

C4 identiques (2 `VERIFIED_FAIL`, 1 `SUSPECTED`), mais le rapport montre 105 écarts visuels au total : ce sont les différences de police entre les références prises sur le Mac et un Chrome Linux, déjà constatées dans `2026-11-17-rythme-ci.md`. Le statut du test ne change pas ; le détail des zones n'est pas comparable au passage réel, d'où l'essai A.

### Essais C1 et C2 : le doute levé par la décision « voulu »

C1 écrit trois décisions dans la copie du vault, dont `2026-11-17-liste-des-factures-exporter.md` (`decision: voulu`, zone 120 × 36 en x = 1128, y = 136). C2, joué ensuite sur ce vault :

- C4 : 2 `VERIFIED_FAIL`, 0 `SUSPECTED`, **1 `PASS`** ;
- `detail-facture-total-egal-liste` : `PASS`, mêmes valeurs et calculs, écart visuel `liste-des-factures--defaut--visuel--1` « neutralisé par la décision 2026-11-17-liste-des-factures-exporter (`PASS`) ».

## Lecture de `faux-saas/verite.json`

| Entrée | Écran | Nature | Actif en v13 par défaut (`defaut_v13`) | Contredit la doc | Effet sur ce test |
|---|---|---|---|---|---|
| `total-detail` | `detail-facture` | bug, `egalite` | non | non | aurait donné `VERIFIED_FAIL` (460,00 ≠ 480,00) ; inactif, donc règle 1 `PASS` |
| `centime-detail` | `detail-facture` | bug, `somme` | non | non | inactif, donc règle 2 `PASS` |
| `badge-statut-detail` | `detail-facture` | voulu | non | non | inactif, donc 0 zone sur le détail |
| `export-haut` | `liste-des-factures` | **voulu** | **oui** | **oui** | zone visuelle `SUSPECTED` sur un écran du test |

En v13 par défaut, les seuls changements actifs sont `ca-mois`, `filtre-echeance` (deux bugs) et `export-haut` (voulu). Aucun ne touche les valeurs lues par ce test. `export-haut` contredit `vault-horama/facturo/produit/liste-des-factures.md` (« en bas du tableau ») mais suit `notes-de-version/v13.md` (« passe en haut à droite »). Pour `docs/cadrage.md` (ligne 329), `SUSPECTED` couvre le « changement visuel à faire trancher » par l'humain. Le statut est donc attendu : ni `PASS` (un écart non tranché ne compte jamais comme réussite), ni `VERIFIED_FAIL` (aucun calcul faux).

## Remarques, sans changement de code

- Le même écart « Exporter » appartient aussi à `ca-du-mois-egal-total`, qui relève `liste-des-factures`. Il y est masqué, car `VERIFIED_FAIL` passe avant `SUSPECTED` (ligne 46). La décision écrite en C1 porte d'ailleurs `test_id: "ca-du-mois-egal-total"`. Un écart d'écran partagé fait donc douter tous les tests qui relèvent cet écran, et pas seulement celui qui le vise. C'est une question de règle de C4 pour Ali (`agent/`), pas un défaut du jugement.
- Les passages réels suivants du journal (`15h15-c9b4`, `15h23-68e7`, `15h26-18d0`, `15h29-a8f5`) donnent toujours `SUSPECTED` sur ce test, malgré une décision « voulu » écrite à chaque fois. Hypothèse, non vérifiée : chaque parcours part d'une copie du vault sans les décisions des parcours précédents, et `verifierTest` lit les décisions dans le vault (`lireDecisions`), pas en base. À confirmer avec le script de l'orchestrateur, absent du repo.

## Ce qui n'est pas vérifié

- Les constats exacts du passage réel `2026-11-17-14h51-7b0a` (champ `ecarts_visuels` de sa ligne `resultats`) sont dans Supabase. Je ne les ai pas lus : pas de clé utilisée. Le rejeu A reproduit le statut, et le journal (J3 : 0 pixel sur le détail, 1 320 pixels sur la liste, tous dans `export-haut`) concorde. La preuve directe demande cette ligne `resultats` ou le rapport `passages/2026-11-17-14h51-7b0a.md` de la copie du vault utilisée sur le Mac.
- Rejoué sous Linux, pas sur le Mac du passage réel.
