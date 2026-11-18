---
# Modèle de fiche de changement (décision D7, section 4.1). Copier ce fichier dans
# vault-horama/<logiciel>/changements/<id>.md, remplir l'en-tête, puis les deux parties.
# Les lignes qui commencent par # sont des commentaires : les retirer dans la vraie fiche.

# Identifiant court, en minuscules et tirets ; c'est aussi le nom du fichier.
id: mon-changement
# Numéro de la pull request qui porte le code et cette fiche.
pr: 0
# Fichiers de code modifiés, entre guillemets (sinon les crochets de [version] cassent l'en-tête).
# Le fichier exact de chaque page, jamais un motif comme factures/** qui attraperait d'autres écrans.
code: ["faux-saas/app/[version]/factures/page.tsx"]
# Écrans que le changement veut modifier : Horama y teste la nouveauté.
ecrans_vises: [liste-des-factures]
# Écrans qui ne doivent pas bouger : Horama rejoue leurs tests même si leur code n'a pas changé.
ne_doit_pas_changer: [tableau-de-bord]
---

# Titre du changement, en une phrase

Ce qui change : ce que l'utilisateur voit de nouveau, avec les libellés exacts de l'interface entre « », et ce qui se passe après chaque action. Exemple : un bouton « Relancer » sur chaque facture échue ; un clic affiche « Relance envoyée ».

Ce qui ne doit pas changer : ce que le changement ne doit pas casser, en mots simples, pour l'humain qui relit. Exemple : le reste de la liste, le mode sombre, l'export. Le script, lui, lit le champ `ne_doit_pas_changer` de l'en-tête.

## Ce qu'Horama fait de cette fiche

- Il écrit le test de la nouveauté à partir de « Ce qui change ». Un libellé entre « » devient un texte attendu à l'écran (règle `etat`).
- Il rejoue les tests des écrans dont la note déclare l'un des fichiers de `code`, ceux des écrans de `ne_doit_pas_changer`, et le socle joué à chaque fois.
- Une fois le déploiement validé, il propose de reporter le changement dans la note de l'écran ; un humain accepte ou refuse.

## Bien écrire une fiche

- Un changement par fiche. Deux fonctionnalités, deux fiches.
- Écrire les libellés exactement comme à l'écran : « Relancer », pas « le bouton de relance ».
- Dire ce qui se passe après une action (« un clic affiche « Relance envoyée » ») : c'est ce qu'Horama peut vérifier.
- Ne pas écrire de chiffre ou d'état qu'on ne connaît pas : « à mesurer ».
- Ne pas décrire un bug connu : une fiche dit ce qui doit marcher.
