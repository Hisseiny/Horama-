# Tour : connexion et « À relire » en écriture (#238, étape 3), 19/11 au soir

## Ce qui a été lancé

- `tsc --noEmit`, `node --test faux-service.test.mjs` (7 sur 7), build Vite : réussis.
- Faux service local (`automatisation/tour/faux-service.mjs`) avec l'index public du jour dont les décisions ont été vidées (copie de test dans le scratchpad, pas dans le dépôt). Chromium (Playwright), `accueil/` servi en local, `?service=http://127.0.0.1:8788`, `#relire/dev%3A2026-11-19-14h31-1c01`.
  - **Déconnecté**, aux 5 tailles (1920×1080, 1440×900, 1280×720, 768×1024, 390×844) : 10 boutons désactivés (2 par cas, 5 cas), lien « Connectez-vous pour trancher ».
  - **Écran de connexion**, aux 5 tailles.
  - **Mauvais mot de passe** : « Adresse ou mot de passe incorrect. ». Bon mot de passe : retour sur `#relire/dev%3A…`.
  - **Connecté**, aux 5 tailles : 10 boutons actifs, nom de l'équipe et « Se déconnecter » dans la barre latérale.
  - **Une décision** (« C'est voulu » sur le premier cas) : le résumé passe de 5 à 4 cas à trancher, le cas part dans « Déjà tranchés », et `GET /tour/donnees` du faux service rend `accueil--controle--1 : voulu : Équipe Horama`.
- Aucune page plus large que la fenêtre.

Vérifié par le sous-agent, pas recapturé ici : 409 (« Déjà tranché. »), jeton falsifié (« Session expirée : reconnectez-vous. »), jeton expiré retiré.

## Pas testé

- Le vrai service Railway (`/tour/session`, `/tour/decision`) : pas encore en ligne (Léon, #239).
- 429 et service injoignable à la connexion, dans le navigateur.
