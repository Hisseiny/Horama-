---
ecran: detail-facture
chemin: Menu > Factures > numéro de la facture
url: /factures/<numero>
---

# Détail d'une facture

S'ouvre depuis la [[liste-des-factures]], en cliquant sur le numéro. Affiche le client, l'échéance, le statut de paiement (badge « En attente de paiement »), les lignes de la facture (désignation et montant) et le « Total TTC ». Le lien « Retour aux factures » ramène à la liste.

## Règles
- Le « Total TTC » est la somme de la colonne « Montant » des lignes.
  regle: somme | colonne: Montant | cible: Total TTC
- Les montants des lignes s'affichent au format 1 420,00 €.
  regle: format | colonne: Montant | motif: montant-fr
- Le « Total TTC » doit être égal au montant de la facture dans la liste : voir [[regles-entre-ecrans]].
