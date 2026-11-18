# La page d'accueil branchée sur le service (issue #68), 18 novembre 2026

Couloir Nathan. Décision de Nathan : le résultat s'affichera sur une page de rapport, un dashboard construit à part et intégré ensuite. En attendant, le champ « Envoyer Horama » de la page d'accueil appelle le service et dit le suivi en texte sous le champ. C'est provisoire.

## Ce qui change

- `accueil/service.js` : les deux seules lignes à changer.
  - `SERVICE` est l'adresse du service, aujourd'hui le service local `http://127.0.0.1:8787`, en attendant l'adresse Railway (#68).
  - `RAPPORT_URL` est la page du rapport, vide par défaut.
- `accueil/envoye.js` : le texte « Maquette de direction artistique… » est remplacé par le vrai envoi.
  - « Envoyer Horama » envoie l'adresse au service (`POST /explorations`). Une adresse sans `https://` est acceptée : le script l'ajoute, et la vérification du navigateur est coupée sur ces champs (`noValidate`), sinon « monsite.fr » était refusé avant l'envoi.
  - Si `RAPPORT_URL` est vide, le suivi s'écrit sous le champ, dans l'ordre : la place dans la file (« En attente : 1 visite passe avant la vôtre. »), « Il part… », « Il visite le site : n pages visitées sur m. », puis la phrase de bilan. La phrase dit « J'ai fini : 1 défaut prouvé, 0 à trancher, sur 15 pages visitées. », ou la raison quand le site n'a pas pu être visité.
  - Si `RAPPORT_URL` est remplie, le visiteur est envoyé vers `RAPPORT_URL?id=<id>&service=<adresse du service>` dès que le service accepte l'adresse.
  - Un refus du service affiche son message (adresse refusée, trop de demandes, service complet), et une panne affiche « Le service ne répond pas ».
  - La mascotte regarde pendant la visite, puis passe en « trouvé » s'il y a un défaut prouvé, sinon en « fini ».
- Le reste de la page ne change pas.

## Ce qui a été lancé

1. La vraie couche HTTP du service de la PR #143 (`createExplorationService`), lancée en local avec Node, sans Docker ni clé H, avec un moteur factice qui dépose une exploration enregistrée (`extension/faux-service/rapport-enregistre`).
2. `accueil/` servi en local. Dans un Chrome sans tête, l'adresse « eugenia-school-website.vercel.app », sans `https://`, est envoyée par le champ du hero :
   - à 1440 × 900 : « Il part… » puis « J'ai fini : 1 défaut prouvé, 0 à trancher, sur 15 pages visitées. », 0 px de débordement ;
   - à 390 × 844 : mêmes textes, 0 px de débordement ;
   - le service a reçu l'adresse complétée (`https://eugenia-school-website.vercel.app/`).
3. `RAPPORT_URL` remplie, sur une copie de la page dans le dossier de travail : après l'envoi, le navigateur demande `/tableau-de-bord.html?id=4298043a-…&service=http%3A%2F%2F127.0.0.1%3A8787` (journal du serveur).

Captures : [envoi à 1440](captures/2026-11-18-accueil-service/envoi-1440.png), [bilan à 1440](captures/2026-11-18-accueil-service/bilan-1440.png), [envoi à 390](captures/2026-11-18-accueil-service/envoi-390.png), [bilan à 390](captures/2026-11-18-accueil-service/bilan-390.png).

## Ce qui n'est pas testé

- Le service en ligne (Railway) : son adresse n'est pas encore donnée.
- Les messages « En attente » et « Il visite le site » : le moteur factice dépose directement le rapport final.
- Aucune session H.
