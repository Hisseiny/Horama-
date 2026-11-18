---
id: ca-du-mois-egal-total
logiciel: facturo
source: produit/regles-entre-ecrans.md
releves: [{ ecran: tableau-de-bord, vue: defaut }, { ecran: liste-des-factures, vue: defaut }]
url_depart: /v13/entrer?suite=/v13/tableau-de-bord
version_cible: "13"
timeout_s: 180
statut: accepte
accepte_par: Nathan
accepte_le: 2026-11-16
---

# Tableau de bord et liste : le CA du mois est égal au total des factures

## Setup
Connecté avec le compte de démo, sur le tableau de bord.

## Task
1. Le tableau de bord est affiché, avec la carte « CA du mois » : c'est le relevé ecran=tableau-de-bord, vue=defaut.
2. Ouvrir « Factures » dans le menu de gauche, sans toucher au filtre.
3. La liste des factures est affichée, avec la ligne « Total » : c'est le relevé ecran=liste-des-factures, vue=defaut.
4. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Le « CA du mois » du tableau de bord est égal à la ligne « Total » de la liste des factures.

## Verification
- FAIL if le « CA du mois » du tableau de bord est différent du « Total » de la liste des factures.

```regles
[{ "type": "egalite", "a": { "ecran": "tableau-de-bord", "champ": "CA du mois" }, "b": { "ecran": "liste-des-factures", "champ": "Total" } }]
```
