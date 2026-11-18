---
id: liste-factures-filtre-echeance
logiciel: facturo
source: notes-de-version/v13.md
releves: [{ ecran: liste-des-factures, vue: filtre-echeance }]
url_depart: /v13/entrer?suite=/v13/factures
version_cible: "13"
timeout_s: 180
statut: accepte
accepte_par: Nathan
accepte_le: 2026-11-16
---

# Liste des factures : filtre « Échéance dépassée »

## Setup
Connecté avec le compte de démo, sur la liste des factures, filtre sur « Toutes ».

## Task
1. Ouvrir le menu « Filtrer » et choisir « Échéance dépassée ».
2. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Seules les factures dont l'échéance est antérieure à aujourd'hui sont affichées.

## Verification
- FAIL if une ligne affichée a une échéance égale ou postérieure à aujourd'hui.

```regles
[{ "type": "filtre", "ecran": "liste-des-factures", "filtre": "Échéance dépassée", "colonne": "Échéance", "condition": "< aujourd_hui" }]
```
