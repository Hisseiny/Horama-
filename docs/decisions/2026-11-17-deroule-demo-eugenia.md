# Déroulé de la démo sur le site d'Eugenia School

Date : 17 novembre 2026. **Validé par Nathan.** Écrit tel qu'il l'a donné. La démo se joue sur une copie locale du site d'Eugenia School (`site-eugenia/`, servie sur le Mac de démo). Facturo est abandonné : plus de démo de secours.

## Le déroulé

1. Le vault Obsidian du site d'Eugenia : une note par page, en français, avec des règles de cohérence (un même chiffre réel affiché sur deux pages).
2. Un développeur pousse une PR : le bouton « Candidater » et un sélecteur de langue passent en anglais. Le déploiement réveille Horama, qui lit la PR et sa fiche de changement et choisit les tests à rejouer, en montrant aussi ceux qu'il écarte.
3. L'agent H parcourt le site en direct dans Chrome ; la mascotte suit sans parler, traits colorés.
4. Récapitulatif, trois verdicts : la nouveauté est là (règle etat), une régression est trouvée (un bouton traduit qui déborde, ou une page sans rapport qui a bougé), la cohérence entre pages tient (calcul).
5. Une image avant/après pour chaque écart.
6. L'humain tranche bug ou voulu ; le vault se met à jour ; en option, une PR de documentation part sur GitHub.

## Consignes de Nathan qui l'accompagnent

- **Le commit v2** (la nouveauté et la régression plantée) se code une fois E0 tenu (copie fidèle du site). Avant de le coder, son contenu exact est écrit en 5 lignes à Nathan : la nouveauté, la régression plantée, la page sans rapport touchée.
- **Leçon de J6c** : la règle `etat` de la nouveauté a un texte témoin qui s'affiche après l'action et reste là même quand la fonction casse ; sinon la casse sort `INCONCLUSIVE` au lieu d'un défaut prouvé (condition 1 d'Ali, D7 section 3).
- **La sélection écarte au moins un test à l'écran** (temps 2) : le vault a au moins un test qui ne relève qu'une page non touchée par la v2.
- **Réveil** : le site reste en local tant que l'école n'a pas dit oui. Repli : un commit local réveille la scène de la même façon qu'un déploiement. Vercel seulement après l'accord de l'école.
