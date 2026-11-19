# Captures de preuve en défilement doux dans la scène (19/11, après #179)

#179 (Devin, fusionnée) ajoute à l'explorateur l'option `doux` : la capture de preuve d'un défaut défile en douceur jusqu'à sa zone au lieu d'un saut (`agent/src/exploration/cdp.ts`, `captureDefect`). La scène étant à l'écran, `exploration.mjs` la passe désormais toujours (`doux: true`) ; `--captures-instantanees` revient au défilement instantané.

## Ce qui a été lancé, et ce qui en est sorti (sans H)

- Exploration sans agent ni Holo sur un site local de deux pages avec trois liens morts (`--choix voulu,bug --repeter-choix --fermer-chrome`) : récapitulatif à 9 s (3 défauts prouvés), 3 questions répondues, « 1 bug à corriger, 2 changements validés », sortie 0.
- Tests de la scène : 9 fichiers, 0 échec.

## Ce qui n'est pas testé

Avec H : le passage final du mode dev sur la PR #16 du clone, filmé.
