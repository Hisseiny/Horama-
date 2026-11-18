# Thème de la scène : deux propositions de la CDO

Pour la scène épurée (issue #69, commit `e70a0c4`). Pendant le parcours, on ne voit que le curseur, la mascotte dans son coin et le trait autour de ce qui ne va pas. Tout le texte arrive à la fin, dans le panneau et la bulle. La couche annonce des couleurs « provisoires, la direction artistique vient après » : voici deux propositions, que l'équipe départage par un vote.

Les fichiers de la CDO sont à côté de la couche, sans la modifier :

- `theme-horama.js` : le thème branché, **« Stèle nuit »** ;
- `theme-collage-nuit.js` : la seconde proposition, **« Collage nuit »**, qui n'est pas branchée ;
- `apercu-theme.mjs` : branche un thème sur la couche actuelle **en mémoire seulement**, joue un petit parcours sur une page et en tire 8 captures ;
- ce fichier.

Les deux thèmes gardent le logo exact et la mascotte de la CDO, l'œil ailé. Chaque état de la mascotte se lit sur son visage, sans pastille ; quand elle lit, elle porte un monocle fin. Un mot accompagne toujours la couleur (« Défaut », « À trancher ») : la couleur n'est jamais seule. Polices système seulement : la couche vit dans la page testée et ne charge rien du web.

## « Stèle nuit » (branché)

Adapté de la page d'accueil « La stèle » :
- nuit bleu-noir et crème marbre ;
- lapis-lazuli ;
- titres en capitales à chasse fixe.

Captures sur le site d'Eugenia : `docs/da/stele-nuit/`.

| Élément | Stèle nuit |
|---|---|
| Panneau | nuit `#0B0F1E` avec une lueur en haut à droite, titres en capitales à chasse fixe (IBM Plex Mono si installée, sinon Consolas), sur-titre « ΟΡΑΜΑ · CE QUI EST VU » en lapis clair, logo exact sur une pastille crème arrondie |
| Trouvailles | cartes nuit, pièces Α Β Γ cobalt `#2453B3`, étiquettes « DÉFAUT » / « À TRANCHER » en petites capitales |
| Boutons, tampons | coins de 6 px, capitales à chasse fixe ; texte nuit sur corail ocre `#D66A52` (5,5:1) et sur sauge `#9DB27A` (8,3:1) |
| Trait sur la page | corail `#E06A4E` (3,3:1 sur blanc) pour un défaut, cobalt `#2453B3` (7,1:1) pour un doute, olive `#4A6B1C` (6,2:1) pour « conforme » |

Contrastes du panneau : texte crème 16:1, texte second 7,3:1 au moins, étiquettes 7:1 au moins (WCAG AA).

## « Collage nuit » (seconde proposition)

Inspiré d'une présentation « minimaliste absurde » (collage, filets fins, petits carrés de repère), dans les violets de Horama :

- **Cadres dans les cadres** :
  - le cadre extérieur est vide, avec seulement ses filets et des carrés aux angles ;
  - l'intérieur est plein, violet nuit `#140F24` avec du grain ;
  - chaque trouvaille a son cadre, avec la capture décalée à l'intérieur et une légende en capitales grasses.
- **Titres** : capitales fines et larges, avec un petit sur-titre très espacé au-dessus.
- **Statue** : une colonne ionique gravée au trait, fissurée, dans son propre cadre, avec la légende « FIG. Ι · ΚΙΩΝ ».
- **Logo** : exact, en signature en bas à gauche.
- **Couleurs des états** : celles de Horama. Corail `#E0503F` pour un défaut (3,9:1 sur blanc), violet `#6A5FD0` pour un doute (5:1), olive `#4A6B1C` pour « conforme » ; texte des cartes 12,9:1.

Captures sur Eugenia et une vidéo du parcours de 38 s : `docs/da/collage-nuit/`.

**Après le vote** : si « Collage nuit » l'emporte, il suffit de copier son contenu dans `theme-horama.js`. Le branchement ne change pas.

## Le branchement à faire dans la couche (propriétaire : CAO)

Quatre ajouts dans `couche-horama.js` et un argument dans `scene.mjs`. Ce sont exactement ceux qu'applique `apercu-theme.mjs` (tableau `WIRING`) ; le script s'arrête en le disant si l'un d'eux ne se trouve plus.

`couche-horama.js` :

1. signature : `(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate)` → `(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate, THEME = {})` ;
2. juste après `const STAMPS = { bug: "Bug noté", voulu: "Voulu" };` : `Object.assign(COLORS, THEME.colors ?? {}); Object.assign(STAMPS, THEME.stamps ?? {});` ;
3. juste avant `// ---------- Sizes and times ----------` : `Object.assign(SPRITES, THEME.sprites ?? {});` ;
4. juste avant `</style>` : `${THEME.css ?? ""}`.

`scene.mjs`, dans `installLayer` : passer le thème en cinquième argument, après `RoughNotation.annotate` : `, ${read("./theme-horama.js")}()`.

Sans thème (`THEME = {}`), la couche reste exactement comme aujourd'hui.

## Voir l'aperçu

```bash
node automatisation/scene/apercu-theme.mjs https://www.eugeniaschool.com <dossier>
THEME_FILE=./theme-collage-nuit.js node automatisation/scene/apercu-theme.mjs https://www.eugeniaschool.com <dossier>
node automatisation/scene/apercu-theme.mjs "http://localhost:3100/v13/entrer?r=total-liste&suite=/v13/factures" <dossier> --facturo
```

Huit captures par page : lecture, défaut, doute, récapitulatif, question, réponse, correction de note, fin. Les textes du parcours et les fichiers de la fin sont des valeurs d'exemple, pas un vrai passage.

## Pas changé, à voir avec le CAO

- La mascotte se place à gauche du panneau de fin. Sur une page étroite, elle peut couvrir le contenu de la page sous le voile (sans gêner le panneau).
- Rien n'est ajouté pendant le parcours, qui reste épuré comme le veut la couche : les deux thèmes ne changent que la fin (panneau, bulle) et la couleur des traits.
