---
id: detail-facture-total-egal-liste
logiciel: facturo
source: produit/regles-entre-ecrans.md
releves: [{ ecran: liste-des-factures, vue: defaut }, { ecran: detail-facture, vue: defaut }]
url_depart: /v13/entrer?suite=/v13/factures
version_cible: "13"
timeout_s: 180
statut: accepte
accepte_par: Nathan
accepte_le: 2026-11-16
---

# Liste et détail : le total de la facture F-119 est le même sur les deux écrans

## Setup
Connecté avec le compte de démo, sur la liste des factures, filtre sur « Toutes ».

## Task
1. La liste des factures est affichée, avec la ligne de la facture F-119 : c'est le relevé ecran=liste-des-factures, vue=defaut.
2. Cliquer sur le numéro « F-119 » pour ouvrir son détail.
3. Le détail de la facture F-119 est affiché, avec ses lignes et son « Total TTC » : c'est le relevé ecran=detail-facture, vue=defaut.
4. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Le « Total TTC » du détail de la facture F-119 est égal à son montant dans la liste, et à la somme de ses lignes.

## Verification
- FAIL if le « Total TTC » du détail est différent du « Montant TTC » de F-119 dans la liste.
- FAIL if le « Total TTC » du détail est différent de la somme des montants de ses lignes.

```regles
[{ "type": "egalite", "a": { "ecran": "detail-facture", "champ": "Total TTC" }, "b": { "ecran": "liste-des-factures", "champ": "Montant TTC de F-119" } },
 { "type": "somme", "ecran": "detail-facture", "colonne": "Montant", "cible": "Total TTC" }]
```
