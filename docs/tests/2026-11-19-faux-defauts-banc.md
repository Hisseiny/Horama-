# Faux défauts des contrôles d’exploration

- Branche : `fix-faux-defauts-banc` (depuis `dev`).
- Installation : environnement Node chargé avec `source ~/.nvm/nvm.sh`, puis `corepack pnpm install` ; installation réussie, fichier de verrouillage inchangé.
- Vérification finale : `pnpm -r --if-present run check` ; tous les paquets vérifiés terminent sans erreur. Agent : 299 tests, 299 réussis, 0 échec, 0 ignoré.
- Un premier lancement via Corepack a échoué dans le sous-processus pnpm (12.16.1 au lieu de 12.18.0). Le lancement direct de pnpm utilise correctement 12.18.0. Un lancement suivant a révélé une assertion de consigne trop liée à la position du texte ; la consigne a été reformulée sans modifier cette assertion, puis toute la vérification a réussi.

## Cas ajoutés, sans service externe

- Requêtes de liens avec User-Agent Chrome, Accept HTML et Accept-Language ; réponses simulées 200, 404, 429 et erreur réseau. Seul le 404 navigateur avec clic navigant devient un défaut prouvé.
- Chrome sur page locale : texte rogné dans une figure classé comme doute, liens masqués et sans dimensions écartés, zone d’un lien multiligne limitée à son premier fragment plutôt qu’à la boîte englobante vide entre les fragments.
- Exploration simulée : arrivée sur l’alias `www` acceptée, deux pages visitées sans refus ni sortie du site. Les tests existants de découverte couvrent déjà les redirections www avant la création de la session.

## Heuristique des illustrations

Un texte rogné est au plus suspect si lui-même ou un ancêtre porte `aria-hidden=true`, `role=img`, `role=presentation`, `inert`, est un `svg`, `figure` ou `picture`, ou a `pointer-events:none`. Ces indices sont génériques et conservateurs : une vraie erreur dans une figure reste soumise à validation humaine. Les troncatures CSS explicites étaient déjà suspectes.

## Zone vide : constat et limite

`controles.ts` mesurait une boîte englobante avec `getBoundingClientRect`, en coordonnées document. Une boîte englobante de lien multiligne peut inclure du vide entre ses fragments. Elle est remplacée par le premier rectangle non vide de `getClientRects`, sans zone pour un élément invisible. Le test local vérifie cette géométrie.

`explorer.ts` convertit ensuite la zone en coordonnées de capture et effectue une capture complémentaire si elle dépasse le viewport. Le tracé direct dans `automatisation/scene/exploration.mjs` cherche d’abord le sélecteur courant, puis les textes, puis la zone enregistrée ; `automatisation/scene/note-passage.mjs` encadre les zones reçues. Ces fichiers ne sont pas modifiés. `agent/scripts/pointeur-capture.ts` teste le survol, pas le dessin du cercle.

La capture et l’état DOM du cas signalé sur `/ai-sdk` n’étant pas fournis, la cause exacte de ce cercle précis n’est pas établie : un décalage de mise en page entre mesure et capture reste possible, ainsi qu’une boîte de sélecteur trop grande côté tracé direct. Aucun test visuel du site réel ni appel H n’a été effectué.
