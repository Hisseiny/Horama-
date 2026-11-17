---
id: mode-sombre-tableau-de-bord
logiciel: facturo
source: produit/tableau-de-bord.md
releves: [{ ecran: tableau-de-bord, vue: mode-sombre }]
url_depart: /v13/entrer?suite=/v13/tableau-de-bord
version_cible: "13"
timeout_s: 180
statut: propose
---

# Tableau de bord : le bouton « Mode sombre » passe l'interface en thème sombre

## Setup
Connecté avec le compte de démo, sur le tableau de bord, en thème clair.

## Task
1. Cliquer sur le bouton « Mode sombre » de l'en-tête.
2. Le tableau de bord est affiché en thème sombre, le libellé du bouton est « Revenir au mode clair » : c'est le relevé ecran=tableau-de-bord, vue=mode-sombre.
3. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Toute l'interface passe en thème sombre et le libellé du bouton devient « Revenir au mode clair ».

## Verification
- FAIL if le libellé reste « Mode sombre » ou si l'interface reste claire.

```regles
[{ "type": "etat", "ecran": "tableau-de-bord", "vue": "mode-sombre", "texte_present": ["Revenir au mode clair"] }]
```
