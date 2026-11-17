---
id: bachelor-vers-msc
logiciel: eugenia
source: produit/bachelor.md
releves: [{ ecran: bachelor, vue: defaut }, { ecran: msc, vue: defaut }]
url_depart: /programme/bachelor-ia-business
version_cible: "1"
timeout_s: 180
statut: accepte
accepte_par: orchestrateur couloir Nathan (essai du 17/11, à revoir avec Axil et Noé)
accepte_le: 2026-11-17
---

# Page du Bachelor puis page du MSc

## Setup
Sur la page du Bachelor, sans être connecté.

## Task
1. Si une bannière de cookies s'affiche, la fermer en refusant les cookies. Ne remplir aucun formulaire.
2. Descendre jusqu'au pied de page et cliquer sur le lien « MSc IA Applied to Business ».
3. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
La page du MSc s'ouvre. Le nombre de hackathons par an est le même sur la page du Bachelor et sur celle du MSc.

## Verification
- FAIL if la page du MSc ne s'ouvre pas.
- FAIL if le nombre de hackathons par an diffère entre les deux pages.

```regles
[{ "type": "egalite", "a": { "ecran": "bachelor", "champ": "HACKATHONS PAR AN (chiffre au-dessus)" }, "b": { "ecran": "msc", "champ": "HACKATHONS PAR AN (chiffre au-dessus)" } }]
```
