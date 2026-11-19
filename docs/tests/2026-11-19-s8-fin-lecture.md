# S8 : la mascotte vit aussi sur une page à un seul titre ; la fin reste à l'écran (19/11)

Retour de Nathan : Louvre de 4:55 à la fin, environ 30 s immobiles.

## Cause (journal du pont du passage Louvre de la nuit)

- Dernier `click_at` de H à 00:30:22, observation à 00:30:24, puis aucune commande jusqu'à `destroy` à 00:30:53 : 29 s pendant lesquelles H rédige sa réponse finale. C'est H, pas la scène.
- La mascotte ne bougeait pas : la page Éditions n'a qu'un titre à l'écran (« ÉDITIONS »), et sa lecture tournait sur ce seul titre.
- Le récapitulatif arrivait à 288 s, et `--fermer-chrome` fermait Chrome 2 s plus tard.

## Ce qui change

- `couche-horama.js`, lecture : avec deux titres ou plus à l'écran, comme avant ; avec un seul titre ou aucun, la mascotte lit aussi les paragraphes (40 caractères au moins) et les images (160 × 100 px au moins) de l'écran, dans l'ordre de la page (7 places au plus). Un élément plus grand que l'écran compte par sa partie visible.
- La fin gardée 8 s à l'écran avant de fermer Chrome, avec ou sans `--sans-fin`, est déjà dans S9 (#192).

## Ce qui a été lancé, et ce qui en est sorti

Page d'essai locale à un seul titre (« ÉDITIONS » en 160 px), trois paragraphes et une image de 360 × 300, couche installée, 18 s relevées toutes les 250 ms :

| Code | Places successives de la mascotte | Sur un texte | Sur la photo |
|---|---|---|---|
| avant | autour du titre seulement (392, 449), (252, 463), (252, 548), (252, 487) | 0 | 0 |
| après | à côté du titre, des paragraphes, puis près de l'image (935, 575), puis de nouveau à gauche | 0 sur 72 | 0 |

Tests de la scène : 9 fichiers, 0 échec.

## Ce qui n'est pas testé

Avec H : passage filmé de vérification.
