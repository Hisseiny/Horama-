---
id: accueil-vers-programmes
logiciel: eugenia-clone
source: produit/regles-entre-pages.md
releves: [{ ecran: accueil, vue: defaut }, { ecran: programmes, vue: defaut }]
url_depart: /
version_cible: "1"
timeout_s: 180
statut: accepte
accepte_par: orchestrateur couloir Nathan (18/11, à relire par Nathan)
accepte_le: 2026-11-18
---

# Accueil puis page Programmes : la durée du Bachelor

## Setup
Sur la page d'accueil du clone du site d'Eugenia School, en haut de page, sans être connecté.

## Task
1. Si une bannière de cookies s'affiche, la fermer en refusant les cookies. Ne remplir aucun formulaire, ne cliquer ni sur « Candidater » ni sur un bouton qui ouvre un formulaire.
2. L'accueil est affiché en haut de page : c'est le relevé ecran=accueil, vue=defaut.
3. Cliquer sur le bouton « Voir les programmes », en haut de l'accueil.
4. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
La page Programmes s'ouvre. La durée du Bachelor écrite sur l'accueil est celle de la ligne « Durée » de la page Programmes.

## Verification
- FAIL if la page Programmes ne s'ouvre pas.
- FAIL if la durée du Bachelor diffère entre l'accueil et la page Programmes.

```regles
[{ "type": "egalite", "a": { "ecran": "accueil", "champ": "Bachelor IA Applied to Business (chiffre au-dessus)" }, "b": { "ecran": "programmes", "champ": "Durée" } }]
```
