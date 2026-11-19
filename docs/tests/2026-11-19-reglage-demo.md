# Réglage de la démo : 8 pages, toutes atteintes par clic (nuit du 18 au 19/11, tâche 5)

Branche `nathan-nuit-5-reglage-demo`, partie de `nathan-nuit-4-defilement` (PR #173). Décision de Nathan : on reste à 8 pages.

## Ce qui change

- `automatisation/reveil/pr.mjs` : `--pages-cliquees` vaut 8 par défaut (4 avant). L'explorateur (`agent/src/exploration/explorer.ts:52`) plafonne les clics au nombre de pages moins un : avec 8 pages, les 7 pages après la page de départ sont atteintes par un clic de l'agent, aucune par son adresse. Au passage réel du 18/11 (`--pages-cliquees 4`), 3 pages sur 8 étaient ouvertes par leur adresse : un saut à l'écran.
- `pr.test.mjs`, README du réveil.

## Ce qui a été lancé, et ce qui en est sorti

- `node --test automatisation/reveil/pr.test.mjs` : 14 sur 14 (la commande d'exploration attendue porte `--pages-cliquees 8`).
- Réveil à blanc sur `Hisseiny/eugenia-school-website` : inchangé (PR #16 trouvée, tests écartés pour la langue).

## Ce qui n'est pas testé

- Le passage réel : budget d'étapes de l'explorateur plus grand (`4 × 8 + 13 + 3 × 7` = 66 étapes au lieu de 57), donc un passage plus long et un peu plus cher. À mesurer au passage filmé (tâche 6).
