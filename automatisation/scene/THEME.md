# Thème de la scène : direction « La stèle », version nuit

Pour la scène épurée (issue #69, commit `e70a0c4`). Pendant le parcours, on ne voit que le curseur, la mascotte dans son coin et le trait autour de ce qui ne va pas. Tout le texte arrive à la fin, dans le panneau et la bulle. La couche annonce des couleurs « provisoires, la direction artistique vient après » : la voici.

Le 18/11, la CDO a adapté son thème « Musée grec » à l'ambiance de la page d'accueil « La stèle » :
- nuit bleu-noir et crème marbre ;
- lapis-lazuli ;
- titres en capitales à chasse fixe.

Le récapitulatif, la question, la correction et la fin ont maintenant le même air que la page d'accueil. Captures sur le site d'Eugenia : `docs/da/stele-nuit/`. La version « Musée grec » reste dans l'historique de cette branche (commit `7b67a5c`).

Ce qui change par rapport au « Musée grec » :

| Élément | Musée grec | Stèle nuit |
|---|---|---|
| Panneau | carte presque blanche, arche fine, titres à empattements | nuit `#0B0F1E` avec une lueur en haut à droite, titres en capitales à chasse fixe (IBM Plex Mono si installée, sinon Consolas), sur-titre « ΟΡΑΜΑ · CE QUI EST VU » en lapis clair, logo exact sur une pastille crème arrondie |
| Trouvailles | cartes blanches, pièces Α Β Γ violettes | cartes nuit, pièces Α Β Γ cobalt `#2453B3`, étiquettes « DÉFAUT » / « À TRANCHER » en petites capitales |
| Boutons, tampons | coins de 12 px, minuscules | coins de 6 px, capitales à chasse fixe ; texte nuit sur corail ocre `#D66A52` (5,5:1) et sur sauge `#9DB27A` (8,3:1) |
| Trait sur la page | corail et violet | corail `#E06A4E` (3,3:1 sur blanc) pour un défaut, cobalt `#2453B3` (7,1:1) pour un doute, olive `#4A6B1C` (6,2:1) pour « conforme » |
| Mascotte | l'œil ailé de la CDO | inchangée (l'œil, son iris et ses ailes) ; l'iris du défaut prend le corail ocre |

Contrastes du panneau : texte crème 16:1, texte second 7,3:1 au moins, étiquettes 7:1 au moins (WCAG AA).

### Deuxième proposition : « Collage nuit »

Le fichier `theme-collage-nuit.js` est une seconde piste, à comparer pendant le vote de l'équipe. Elle n'est pas branchée : le thème actif reste `theme-horama.js` (Stèle nuit). Elle s'inspire d'une présentation « minimaliste absurde » : collage, filets fins, petits carrés de repère. Elle reprend les violets de Horama :

- **Cadres dans les cadres** :
  - le cadre extérieur est vide, avec seulement ses filets et des carrés aux angles ;
  - l'intérieur est plein, violet nuit `#140F24` avec du grain ;
  - chaque trouvaille a son cadre, avec la capture décalée à l'intérieur et une légende en capitales grasses.
- **Titres** : capitales fines et larges, avec un petit sur-titre très espacé au-dessus.
- **Statue** : une colonne ionique gravée au trait, fissurée, dans son propre cadre, avec la légende « FIG. Ι · ΚΙΩΝ ».
- **Inchangés** : le logo exact, en signature en bas à gauche, et la mascotte.
- **Couleurs des états** : celles de Horama. Le trait de doute est violet `#6A5FD0` (5:1 sur blanc).

Captures sur Eugenia et une vidéo du parcours de 38 s : `docs/da/collage-nuit/`. Aperçu :

```
THEME_FILE=./theme-collage-nuit.js node automatisation/scene/apercu-theme.mjs https://www.eugeniaschool.com <dossier>
```

Pour l'activer après le vote, il suffit de copier son contenu dans `theme-horama.js`. Le branchement ne change pas.

Le tableau ci-dessous décrit le premier thème, par rapport au squelette de la couche. Les structures n'ont pas changé, seulement les couleurs et les polices.

Les fichiers de la CDO sont à côté de la couche, sans la modifier :

- `theme-horama.js` contient le thème : couleurs du trait, mascotte, mots des tampons, styles ;
- `apercu-theme.mjs` branche le thème sur la couche actuelle **en mémoire seulement**, joue un petit parcours sur une page et en tire 8 captures ;
- ce fichier.

## Ce que le thème change

| Élément | Couche actuelle (squelette) | Avec le thème |
|---|---|---|
| Mascotte | ailes pointues, pastilles « ! », « ? », « ✓ » | l'œil ailé de référence de la CDO (`draft.eye.mp4`), chaque état se lit sur le visage, sans pastille ; quand il lit, un monocle fin avec sa chaînette lavande |
| Trait sur la page | rouge `#E5484D` pour un défaut, orange `#E8A33D` pour un doute | corail `#E0503F` pour un défaut, violet `#6A5FD0` pour un doute : les couleurs de Horama, à 3,9:1 et 5,1:1 sur fond blanc (WCAG 1.4.11 : au moins 3:1) |
| Voile de la fin | noir à 60 % | violet nuit à 72 % : le panneau clair ressort |
| Panneau (récapitulatif, question, fin) | blanc, sans-serif, titres en capitales grises, angles droits | carte presque blanche aux coins arrondis sur un voile violet sombre, une arche fine en haut, logo exact, « ὅραμα · ce qui est vu » au-dessus du titre, titres à empattements (Georgia), intertitres en minuscules |
| Trouvailles du récapitulatif | une pastille de couleur seule | regroupées dans une zone teintée sous un intertitre avec frise grecque ; chacune sur une carte blanche, avec sa pièce Α, Β, Γ et une étiquette douce avec un mot (« Défaut », « À trancher ») : la couleur n'est jamais seule |
| Boutons « C'est un bug / C'est voulu » | texte blanc sur rouge et sur vert | texte violet foncé sur corail et sur citron, avec ✕ et ✓ : lisibles sans la couleur |
| Tampon du verdict | tampon penché en capitales | pastille droite : « Bug noté », « Voulu » |
| Bulle de correction | blanche, angles droits | carte claire arrondie ; l'ancien texte barré, le nouveau en vert foncé |

Inspiration pour le panneau : « Agent Approvals Modal » (Chris Nijhof, Dribbble) : zone teintée qui regroupe ce qui attend une décision, badges doux, cartes blanches, sous-titre discret.

Polices système seulement (Georgia, Segoe UI) : la couche vit dans la page testée et ne charge rien du web. Le corail et le citron ne servent que d'aplats, avec du texte violet foncé dessus. Tout texte sur fond clair est au moins à 4,5:1 (WCAG AA).

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
node automatisation/scene/apercu-theme.mjs "http://localhost:3100/v13/entrer?r=total-liste&suite=/v13/factures" <dossier> --facturo
```

Huit captures par page : lecture, défaut, doute, récapitulatif, question, réponse, correction de note, fin. Les textes du parcours et les fichiers de la fin sont des valeurs d'exemple, pas un vrai passage.

## Pas changé, à voir avec le CAO

- La mascotte se place à gauche du panneau de fin. Sur une page étroite, elle peut couvrir le contenu de la page sous le voile (sans gêner le panneau).
- Les lettres grecques et le temple restent sobres : rien n'est ajouté pendant le parcours, qui reste épuré comme le veut la couche.
