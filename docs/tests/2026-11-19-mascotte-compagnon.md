# Mascotte compagnon du curseur (nuit du 18 au 19/11, tâche 3)

Branche `nathan-nuit-3-mascotte`, partie de `nathan-nuit-2-curseur` (PR #171). Aucune session H.

## Ce qui change (`automatisation/scene/couche-horama.js`)

- La mascotte quitte son coin : quand la flèche part vers un point, elle vole près de ce point (anneau de 130 à 280 px), à la place qui ne cache ni la flèche, ni sa cible, ni le chemin entre les deux, et le moins possible du reste ; à cache égal, la plus proche d'où elle est (`nearSpot`).
- Elle revient près de la flèche quand elle en est à plus de 340 px, ou quand la page qui a réagi est sous elle.
- Avant un trait (défaut ou doute), elle se pose à côté de la zone, jamais dessus, puis le trait vient.
- Ses yeux regardent la cible de la flèche pendant le trajet. Les 5 états de la charte sont inchangés.
- Le ressort de son vol prend son pas de temps à `performance.now()` (et non à l'horloge des images) : identique à l'écran, mais le vol continue quand un test fige les animations.

## Tests adaptés

- `capture-zone.test.mjs` et `mascotte.test.mjs` cherchaient la mascotte dans le coin en bas à droite. Ils la cherchent maintenant sur toute l'image (capture-zone, en ignorant la barre de défilement) ou à la place que la couche garde dans la session de l'onglet (mascotte). Ce qu'ils vérifient ne change pas : couche absente de la capture de preuve et remontrée après ; cinq dessins à la même place ; pupille seule à changer quand la flèche part à gauche puis en haut.
- `node --test automatisation/scene/*.test.mjs` : 5 fichiers, 0 échec.

## Ce qui a été lancé, et ce qui en est sorti

La page d'essai de la charte (`talaria.exemple` servie en local, deux clics, un défaut prouvé puis un doute, le récapitulatif, la fin), sans H : `captures/2026-11-19-mascotte-compagnon/`.
- `01-trait-defaut.png` : la mascotte (état « trouve ») posée sous le lien entouré, à côté de la flèche, sans cacher le trait.
- `02-points-doute.png` : elle s'est déplacée sous le prix marqué de points ocre (état « doute »).
- `03-recapitulatif.png`, `07-fin.png` : la fin, inchangée.

## Ce qui n'est pas testé

Avec le vrai agent H : au passage filmé (tâche 6).
