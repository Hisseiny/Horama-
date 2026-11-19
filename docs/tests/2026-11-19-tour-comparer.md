# Comparer deux passages (PR 7, #238), 19/11 au soir

## Réveil

`automatisation/reveil/pr.mjs` pousse la capture brute de chaque page visitée sur la branche des captures (`pr-<n>/<sha>/pages/<écran>.png`) et la liste dans l'entrée de l'index (champ `pages`, absent des entrées anciennes). `node --test automatisation/reveil/pr.test.mjs` : 19 sur 19 (dont le nouveau test : pages poussées, page refusée gardée avec `capture: null`, page non visitée écartée, ancienne forme de l'entrée sans `pages`).

## Tour, 11.5

- Une page est comparable si deux passages par une PR ont sa capture (`pages`) ; repli sur la capture d'un constat pour les entrées anciennes.
- Modes Côte à côte, Rideau (poignée `role="slider"`, souris, toucher, flèches) et Pixels bruts (seuil de 24 sur 255, celui de `comparerImages` du moteur ; nombre et part des pixels calculés).
- Les constats de chaque passage sur la page sont montrés **sur leur propre capture**, prise à l'endroit du défaut et entourée par la scène, sous la capture de la page. Ils ne sont pas dessinés sur la capture du haut de page : leur zone est mesurée sur leur propre capture, défilée jusqu'au défaut (le champ `defilement` n'est pas renseigné). Dessinée sur la capture du haut de page, elle tombait sur un autre texte : erreur vue à la relecture (le trait de « Zertifikatskurs » sur « Eugenia School ») et corrigée.
- « Corrigé : absent du nouveau passage » seulement si le passage d'après est plus récent et n'a aucun constat de même texte sur la même page.

## Ce qui a été lancé

- `tsc --noEmit`, `node --test automatisation/tour/faux-service.test.mjs` (7 sur 7), build Vite.
- Chromium, faux service avec un index d'essai local hors dépôt : deux explorations réelles en mode scripté, sans agent H, titrées « ESSAI LOCAL » (A : prévisualisation de la PR #16 en allemand, 2 constats ; B : production du clone en français). 1920×1080, 1440×900, 1280×720, 768×1024, 390×844 : aucune page plus large que la fenêtre ; les trois modes ; pixels bruts sur `/` : 283 238 pixels sur 1 152 000 (24,59 %), le même compte que `comparerImages` du moteur (relevé par le sous-agent, retrouvé ici).
- Index réel du jour : « Rien à comparer », avec la raison (aucune entrée n'a encore `pages`).

Captures : `2026-11-19-tour-comparer/` ; celles marquées `essai-local-` montrent les données d'essai, pas un vrai passage.

## Pas testé

Deux vrais passages par une PR avec `pages` (PR #16 puis la PR #19 après la boucle verte) : il faudra rejouer les deux avec le nouveau réveil.
