# Tour : lecture par le service (#238, étape 2), 19/11 au soir

## Ce qui a été lancé

- `./node_modules/.bin/tsc --noEmit -p .`, `node --test faux-service.test.mjs` (7 sur 7) et build Vite, depuis `automatisation/tour` : réussis.
- Chromium (Playwright), `accueil/` servi en local, 1920×1080, 1440×900, 1280×720, 768×1024 et 390×844, écrans Passages et « À relire » d'un passage (`#relire/dev%3A2026-11-19-14h31-1c01`), trois sources :
  - **repli GitHub** : le service en ligne n'a pas encore la route (404 à 18 h) ; la barre latérale dit « Données : GitHub (service injoignable) », l'index et le vault sont lus sur raw ;
  - **faux service local** (`?service=http://127.0.0.1:8788`) : « Données : service Horama » ;
  - **tout coupé** (service et raw refusés), à 1440 : « Index des passages déclenchés par une PR illisible : ni le service Horama ni le dépôt ne répondent, rechargez la page. », « Rien à afficher tant que l'index ne répond pas. », barre latérale « index muet ».
- Aucune page plus large que la fenêtre, aux 5 tailles et sur les deux premières sources.

Captures : `2026-11-19-tour-lecture/avant/` (tour en ligne) et `2026-11-19-tour-lecture/apres/`.

## Pas testé

- Le vrai `GET /tour/donnees` de Railway : la route n'existe pas encore en ligne (Léon, #239).
- `?index=<sha>` vérifié par le sous-agent (requête vers l'index à ce commit), pas recapturé ici.
