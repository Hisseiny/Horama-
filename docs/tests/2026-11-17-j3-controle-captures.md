# J3 : contrôle chiffré des captures v13 contre les références v12

Rapport écrit par `automatisation/scene/controle-captures.mjs`. Aucun chiffre n'est saisi à la main.

- Date : 17/11/2026 14:40:19 (2026-11-17T13:40:19.995Z)
- Commande : `node automatisation/scene/controle-captures.mjs --releves automatisation/scene/essais/releves-16-11 --rapport docs/tests/2026-11-17-j3-controle-captures.md`
- Relevés : `automatisation/scene/essais/releves-16-11` (4 capture(s) .png)
- Références : `vault-horama/facturo/references/<ecran>/<vue>--v12.png`
- Zones attendues : changements de `faux-saas/verite.json` avec `defaut_v13: true`, rectangles `avant` et `apres` de `faux-saas/positions.json`, tous deux exclus. Le détail par changement compte un pixel dans chaque zone qui le contient.
- Un pixel diffère si un de ses quatre canaux RGBA diffère, sans tolérance.

4 capture(s) relevée(s), 3 comparée(s), 1 sans référence v12.

## detail-facture

| Vue | Taille du relevé | Taille de la référence | Pixels différents | Dans les zones attendues | Hors zones | Boîte englobante hors zones |
|---|---|---|---|---|---|---|
| defaut | 1280 × 900 | 1280 × 900 | 0 | 0 (aucune attendue) | 0 |  |

## liste-des-factures

| Vue | Taille du relevé | Taille de la référence | Pixels différents | Dans les zones attendues | Hors zones | Boîte englobante hors zones |
|---|---|---|---|---|---|---|
| defaut | 1280 × 900 | 1280 × 900 | 1320 | 1320 (export-haut : 1320) | 0 |  |
| filtre-echeance | 1280 × 900 | sans référence |  |  |  |  |

## tableau-de-bord

| Vue | Taille du relevé | Taille de la référence | Pixels différents | Dans les zones attendues | Hors zones | Boîte englobante hors zones |
|---|---|---|---|---|---|---|
| defaut | 1280 × 900 | 1280 × 900 | 387 | 387 (ca-mois : 387) | 0 |  |

## Verdict

Toutes les 3 images comparées ont la taille de leur référence et 0 pixel différent hors des zones attendues. Sortie : 0.

## Contrôle de bon sens (section ajoutée à la main)

Les 3 références v12 copiées dans `automatisation/scene/essais/controle-references-v12/` sous le nom `<ecran>--defaut.png`, puis comparées à elles-mêmes par la même commande (`--releves automatisation/scene/essais/controle-references-v12`, sans `--rapport`) : 0 pixel différent sur les 3 écrans, dans et hors des zones attendues, sortie 0.

Recoupement avec `faux-saas/positions.json` : les 387 pixels du tableau de bord et les 1320 de la liste des factures mesurés ici sont exactement les `pixels_differents` annoncés pour `ca-mois` et `export-haut`.
