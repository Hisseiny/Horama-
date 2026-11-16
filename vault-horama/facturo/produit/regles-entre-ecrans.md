---
logiciel: facturo
---

# Règles entre plusieurs écrans

Ces règles relient deux écrans. Aucun écran pris seul ne permet de les vérifier : il faut relever une valeur sur chacun et les comparer.

## Règles
- Le « CA du mois » du [[tableau-de-bord]] est égal au total de la [[liste-des-factures]].
  regle: egalite | a: tableau-de-bord.CA du mois | b: liste-des-factures.Total
- Le nombre de « Factures du mois » du [[tableau-de-bord]] est égal au nombre de factures de la [[liste-des-factures]].
  regle: egalite | a: tableau-de-bord.Factures du mois | b: liste-des-factures.Nombre de factures
- Le « Total TTC » du [[detail-facture]] est égal au montant de la même facture dans la [[liste-des-factures]]. Facture témoin : F-119.
  regle: egalite | a: detail-facture.Total TTC | b: liste-des-factures.Montant TTC de F-119
