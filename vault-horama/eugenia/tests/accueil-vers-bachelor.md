---
id: accueil-vers-bachelor
logiciel: eugenia
source: produit/accueil.md
releves: [{ ecran: accueil, vue: defaut }, { ecran: bachelor, vue: defaut }]
url_depart: /
version_cible: "1"
timeout_s: 180
statut: accepte
accepte_par: orchestrateur couloir Nathan (essai du 17/11, à revoir avec Axil et Noé)
accepte_le: 2026-11-17
---

# Accueil puis page du Bachelor

## Setup
Sur la page d'accueil du site d'Eugenia School, en haut de page, sans être connecté.

## Task
1. Si une bannière de cookies s'affiche, la fermer en refusant les cookies. Ne remplir aucun formulaire.
2. L'accueil est affiché en haut de page : c'est le relevé ecran=accueil, vue=defaut.
3. Cliquer sur « DÉCOUVRIR LE BACHELOR ».
4. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
La page du Bachelor s'ouvre.

## Verification
- FAIL if la page du Bachelor ne s'ouvre pas.

```regles
[]
```
