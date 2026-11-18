---
# Modèle de note d'écran. Copier ce fichier dans vault-horama/<logiciel>/produit/<ecran>.md, remplir l'en-tête,
# puis le texte et les règles. Les lignes qui commencent par # dans l'en-tête sont des commentaires : les retirer.

# Identifiant de l'écran, en minuscules et tirets ; c'est aussi le nom du fichier. Les tests le citent dans « releves ».
ecran: notre-adn
# Adresse de la page, sans le domaine (ex. /notre-adn). Horama l'ouvre et vérifie que l'agent est bien dessus.
url: /notre-adn
# Fichiers de code de cette page, entre guillemets (liste vide tant que le dépôt du site n'est pas disponible).
code: []
# États nommés de la page atteints par une action (ex. [anglais] après un changement de langue) ; vide si la page n'a que son état par défaut.
vues: []
# Zones de la page qui changent à chaque visite (photo qui tourne, vidéo) : non comparées à la référence. Pixels de la page en 1280 × 900.
zones_ignorees: []
---

# Titre de la page, tel que le site l'affiche

Ce que la page montre, en phrases simples, avec les libellés et les chiffres **exactement** comme le site les affiche, entre « ». Rien d'inventé : un chiffre qu'on n'a pas vu sur le site ne s'écrit pas.

## Règles

Une puce par règle vérifiable, avec sa ligne `regle:` juste en dessous quand elle se calcule. Exemple de cohérence entre deux pages (un même chiffre réel affiché sur les deux) :

- Le chiffre « … » de cette page est le même que celui de la page « … » : voir [[regles-entre-pages]].

Les règles qui portent sur deux pages s'écrivent dans `regles-entre-pages.md` (dans `produit/`), au format des règles `egalite` de `vault-horama/facturo/produit/regles-entre-ecrans.md`. Quand le chiffre est écrit juste au-dessus de son libellé (« 3-5 » puis « HACKATHONS PAR AN »), le champ s'écrit `HACKATHONS PAR AN (chiffre au-dessus)`. Une plage (« 3-5 », « 3 à 5 », « de 3 à 5 ») vaut la même chose quelle que soit son écriture. Exemple : `vault-horama/eugenia/produit/regles-entre-pages.md`.
