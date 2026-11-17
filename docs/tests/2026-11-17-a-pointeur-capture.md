# 2026-11-17 : pointeur sorti de la page avant chaque capture du coureur (issue #48)

## Ce qui a changé

`agent/src/browser.ts`, capture de `relever` : juste avant la capture, `Input.dispatchMouseEvent` `mouseMoved` vers `(-10, 450)` (sortie par le côté, jamais par le haut), puis attente de la fin des transitions CSS (1 s au plus), comme la scène (commit 8c37506 sur `dev-nathan`). Le pointeur n'est pas remis en place.

## Ce qui a été lancé

1. `pnpm install && pnpm -r --if-present run check` : vert. Le test factice `agent/browser.test.ts` vérifie l'appel `mouseMoved (-10, 450)` avant `Page.captureScreenshot`.
2. Essai avec un vrai Chrome (Linux, `--force-device-scale-factor=1`, fenêtre 1280 × 900) sur une page locale avec un bouton `:hover` (fond rouge, transition 0,4 s) :
   `DISPLAY=:0 CHROME_BIN=$HOME/.local/bin/google-chrome node agent/scripts/pointeur-capture.ts ~/essais/pointeur`

   Le script prend une capture `relever` sans pointeur, pose le pointeur sur le bouton (`:hover` vrai), prend une capture brute (témoin), puis une capture `relever`.

## Ce qui en est sorti

| Code | `:hover` avant | `:hover` après `relever` | Témoin ≠ sans pointeur | `relever` avec pointeur = sans pointeur (octets PNG) |
|---|---|---|---|---|
| Avec le correctif | vrai | faux | oui | **oui** (code 0) |
| Sans le correctif (`browser.ts` de `dev`) | vrai | vrai | oui | **non** (code 1) |

## Ce qui n'est pas testé

- Aucun passage H réel, aucun essai sur eugeniaschool.com par ce chemin.
- Pas d'essai sur Mac ni Windows.
- Pas encore vu marcher par une autre personne.
