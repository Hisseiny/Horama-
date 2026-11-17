---
ecran: tableau-de-bord
chemin: Menu > Tableau de bord
url: /tableau-de-bord
code: ["faux-saas/app/[version]/tableau-de-bord/page.tsx", "faux-saas/lib/data.ts", "faux-saas/lib/session.ts", "faux-saas/app/shell.tsx", "faux-saas/app/layout.tsx", "faux-saas/app/styles.ts", "faux-saas/regressions.ts"]
vues: [mode-sombre]
---

# Tableau de bord

Premier écran après la connexion. Il résume le mois en cours en trois cartes : « CA du mois », « Factures du mois » et « Factures en retard ». Sous les cartes, le bloc « Prochaines échéances » liste les factures qui ne sont pas encore échues (numéro, client, échéance). Le bouton « Mode sombre » de l'en-tête passe toute l'interface en thème sombre ; son libellé devient « Revenir au mode clair ».

Une facture est en retard quand son échéance est strictement antérieure à la date du jour.

## Règles
- Le « CA du mois » s'affiche au format des montants.
  regle: format | colonne: CA du mois | motif: montant-fr
- Le « CA du mois » et le nombre de « Factures du mois » doivent correspondre à la liste des factures : voir [[regles-entre-ecrans]].
