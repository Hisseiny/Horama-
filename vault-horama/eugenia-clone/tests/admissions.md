---
id: admissions
logiciel: eugenia-clone
source: produit/admissions.md
releves: [{ ecran: admissions, vue: defaut }]
url_depart: /admissions
version_cible: "1"
timeout_s: 120
statut: accepte
accepte_par: orchestrateur couloir Nathan (18/11, à relire par Nathan)
accepte_le: 2026-11-18
---

# Page Admissions

## Setup
Sur la page Admissions du clone du site d'Eugenia School, en haut de page, sans être connecté.

## Task
1. Si une bannière de cookies s'affiche, la fermer en refusant les cookies. Ne remplir aucun formulaire, ne cliquer ni sur « Commencer ma candidature » ni sur un bouton qui ouvre un formulaire.
2. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
La page Admissions est affichée, avec le titre « Admissions » et les quatre étapes de la candidature.

## Verification
- FAIL if la page Admissions ne s'affiche pas.

```regles
[]
```
