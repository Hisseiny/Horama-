# Tour : écrans 11.1, 11.2, 11.3, 11.5 et 11.7 (#238, étape 5), 19/11 au soir

## Ce qui a été lancé

- `tsc --noEmit`, `node --test faux-service.test.mjs` (y compris le test ajouté sur « Modifier »), build Vite : réussis.
- Chromium (Playwright), `accueil/` servi en local, les 5 écrans (Couverture, Tests à valider, En direct, Comparer, Corrections de doc) :
  - aux 5 tailles (1920×1080, 1440×900, 1280×720, 768×1024, 390×844), sur deux sources : faux service local (`?service=http://127.0.0.1:8788`) et repli GitHub (le service en ligne n'a pas encore la route). Résultat : 50 combinaisons, aucune page plus large que la fenêtre, aucun mot d'exemple (Facturo, Jane Doe, v13, « 14/40 »), aucun « Failed to fetch », aucun tiret cadratin ou demi-cadratin ;
  - tout coupé (service et raw refusés), à 1440 : chaque écran le dit (« ni le service Horama ni le dépôt ne répondent », « Le vault ne répond pas »).
- Corrigé pendant la relecture : à 390, le lien « À relire » de l'état vide de Corrections de doc cassait la phrase.

Vérifié par le sous-agent, pas recapturé ici : « Modifier » puis « Accepter » d'un test contre le faux service (« Accepté par Équipe Horama, le … »), 501 de `/tour/doc` affiché tel quel, direct d'une exploration contre un faux service d'exploration jetable.

Captures : `2026-11-19-tour-ecrans/`.

## Ce que les données du jour donnent

- Couverture : 5 écrans documentés, 3 tests acceptés, 5 références ; dernier constat par page tiré de l'index (PR #16).
- Tests à valider : aucun en attente, les 3 tests acceptés « par orchestrateur couloir Nathan (18/11, à relire par Nathan) », mot pour mot.
- Comparer : rien à comparer aujourd'hui (un seul passage par une PR), l'écran dit pourquoi.
- Corrections de doc : aucun « voulu », écran vide qui le dit.

## Pas testé

- Le vrai service Railway (`/tour/test`, `/tour/doc`, explorations en cours) : pas encore en ligne (Léon, #239).
- Comparer la PR #16 et la PR #19 corrigée : l'index ne garde une capture que pour un constat ; une page corrigée n'en a plus. Il faudra que le réveil publie la capture de chaque page visitée.
