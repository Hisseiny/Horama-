# 19/11 : un constat et un cadre par élément recapturé, statut GitHub de la tour journalisé

Suite de la PR #255 (répétition PR #16 du clone), choix A d'Ali.

## Ce qui change

- `agent/src/exploration/explorer.ts` : la recherche de doublons sur la zone de recapture (ajoutée par f97d2cb pour #166) est retirée. Les défauts ne sont plus regroupés que sur leur zone dans le document (`groupControls`). Les trois « Studienjahr » de `/programmes` donnent donc trois constats, chacun avec sa capture et son cadre. Ce choix revient sur le regroupement demandé dans #166.
- `agent/scripts/tour-service.mjs` : quand GitHub refuse une écriture ou une lecture, le service écrit `Tour <route> : GitHub <statut> : <message>` dans son journal et répond 503 avec « Service de la tour indisponible (GitHub <statut>). ».

## Lancé

- `pnpm -r check` : vert (agent : 352 tests).
- Tests modifiés ou ajoutés : « trois éléments hors écran recadrés au même endroit gardent chacun leur constat et leur capture », « a GitHub refusal answers 503 with its status and logs it ».

## Diagnostic du problème 1 de #255

Sonde sans écriture (PUT `contents` avec un faux `sha`) avec le `GITHUB_TOKEN_TOUR` de Railway : 403 « Resource not accessible by personal access token » sur les deux dépôts. Le jeton n'avait accès à aucun dépôt ni aucune permission. Correction par Léon dans les réglages du jeton (Contents : Read and write), sans changer sa valeur.

## Pas testé

- Pas de passage réel sur le clone avec cette version : à rejouer après redéploiement de Railway.
