---
ecran: liste-des-factures
chemin: Menu > Factures
url: /factures
code: ["faux-saas/app/[version]/factures/page.tsx", "faux-saas/lib/data.ts", "faux-saas/lib/session.ts", "faux-saas/app/shell.tsx", "faux-saas/app/layout.tsx", "faux-saas/app/styles.ts", "faux-saas/regressions.ts"]
vues: [filtre-echeance]
---

# Liste des factures

Liste toutes les factures du mois, par numéro croissant. Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ». Le numéro ouvre le détail de la facture ([[detail-facture]]).
Le bouton « Exporter » se trouve en bas du tableau.
Le menu « Filtrer » propose « Toutes » et « À venir » (les factures dont l'échéance n'est pas encore passée).

## Règles
- Le total en bas du tableau est la somme de la colonne « Montant TTC ».
  regle: somme | colonne: Montant TTC | cible: Total
- Les montants s'affichent au format 1 420,00 €.
  regle: format | colonne: Montant TTC | motif: montant-fr
- Les échéances s'affichent au format JJ/MM/AAAA.
  regle: format | colonne: Échéance | motif: date-fr
- Chaque facture a une échéance.
  regle: presence | colonne: Échéance
- Sous le tableau, le nombre de factures affichées est indiqué (« 4 factures »).
