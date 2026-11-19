---
id: bachelor-vers-msc
logiciel: eugenia-clone
source: produit/bachelor.md
releves: [{ ecran: bachelor, vue: defaut }, { ecran: msc, vue: defaut }]
url_depart: /programme/bachelor-ia-business
version_cible: "1"
timeout_s: 180
statut: accepte
accepte_par: orchestrateur couloir Nathan (18/11, à relire par Nathan)
accepte_le: 2026-11-18
---

# Page du Bachelor puis page du MSc

## Setup
Sur la page du Bachelor du clone du site d'Eugenia School, en haut de page, sans être connecté.

## Task
1. Si une bannière de cookies s'affiche, la fermer en refusant les cookies. Ne remplir aucun formulaire, ne cliquer ni sur « Candidater → » ni sur un bouton qui ouvre un formulaire.
2. La page du Bachelor est affichée en haut de page : c'est le relevé ecran=bachelor, vue=defaut.
3. Descendre jusqu'au pied de page et cliquer sur le lien « MSc » de la colonne « Programmes ».
4. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
La page du MSc s'ouvre, avec le titre « MSc IA Appliquée au Business ».

## Verification
- FAIL if la page du MSc ne s'ouvre pas.

```regles
[]
```
