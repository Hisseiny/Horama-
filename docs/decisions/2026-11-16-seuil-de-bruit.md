# Seuil de bruit pour comparer deux captures

Date : 16 novembre 2026. Couloir Nathan. Sert au test T1 du couloir Ali et à la double vision (tâche N8). **Provisoire** : fixé sur des captures Chrome et Playwright, pas encore sur des captures de H.

## Règle

1. Deux captures ne se comparent que si elles ont la même taille, le même écran et la même vue. Sinon : pas de comparaison, statut `INCONCLUSIVE`.
2. **Pixel différent** : un pixel dont au moins un canal (rouge, vert, bleu) s'écarte de plus de 24 sur 255.
3. **Zone** : un groupe de pixels différents distants de 8 px au plus les uns des autres.
4. **Zone qui compte** : une zone d'au moins 6 pixels différents. Les autres sont du bruit.

Critère de T1 : deux sessions v12 sur le même écran et la même vue donnent **0 zone qui compte**.

## Ce qui est mesuré (16/11, Chrome sur Mac, 1280 × 900, densité 1)

- Deux visites de la même page : 0 pixel différent sur les 7 captures, en local et sur `https://facturo-demo.vercel.app`.
- La v13 avec `r=aucun` contre la v12 : 0 pixel différent sur les 3 écrans.
- Plus petit changement réel du catalogue : `format-montant` (une virgule devient un point), 9 pixels différents dans une boîte de 3 × 4 px. Les 14 autres vont de 59 pixels (`total-detail`) à 90 674 (`filtre-echeance`). Source : `faux-saas/positions.json`.

## Ce qui n'est pas mesuré

- Le bruit des captures de H (format de l'image, compression, rendu des polices sous un autre système) : à mesurer par T1 et par la sonde de T2.
- La tolérance de 24 et le minimum de 6 pixels sont donc des valeurs de départ. Si T1 trouve des zones entre deux sessions identiques, on relève la taille et l'écart de ces zones et on refixe le seuil sur cette mesure, sans dépasser ce qui masquerait un vrai changement. `format-montant` (9 pixels) est le premier qui disparaîtrait : il resterait détecté par sa règle de format, plus par l'image.
