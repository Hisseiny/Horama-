# Thème de la scène : direction « Musée grec »

Pour la scène épurée (issue #69, commit `e70a0c4`). Pendant le parcours, on ne voit que le curseur, la mascotte dans son coin et le trait autour de ce qui ne va pas. Tout le texte arrive à la fin, dans le panneau et la bulle. La couche annonce des couleurs « provisoires, la direction artistique vient après » : la voici.

Les fichiers de la CDO sont à côté de la couche, sans la modifier :

- `theme-horama.js` contient le thème : couleurs du trait, mascotte, mots des tampons, styles ;
- `apercu-theme.mjs` branche le thème sur la couche actuelle **en mémoire seulement**, joue un petit parcours sur une page et en tire 8 captures ;
- ce fichier.

## Ce que le thème change

| Élément | Couche actuelle (squelette) | Avec le thème |
|---|---|---|
| Mascotte | ailes pointues, pastilles « ! », « ? », « ✓ » | l'œil ailé de référence de la CDO (`draft.eye.mp4`), chaque état se lit sur le visage, sans pastille |
| Trait sur la page | rouge `#E5484D` pour un défaut, orange `#E8A33D` pour un doute | corail `#E0503F` pour un défaut, violet `#6A5FD0` pour un doute : les couleurs de Horama, à 3,9:1 et 5,1:1 sur fond blanc (WCAG 1.4.11 : au moins 3:1) |
| Voile de la fin | noir à 60 % | violet de l'œil à 55 % |
| Panneau (récapitulatif, question, fin) | blanc, sans-serif, titres en capitales grises | carte lilas, fronton grec en traits fins, logo exact en haut à droite, « ὅραμα · ce qui est vu » au-dessus du titre, titres à empattements (Georgia), frise grecque au-dessus de chaque intertitre, intertitres en minuscules |
| Boutons « C'est un bug / C'est voulu » | texte blanc sur rouge et sur vert | texte violet foncé sur corail et sur citron, lisible sur les deux |
| Tampon du verdict | tampon penché en capitales | pastille droite : « Bug noté », « Voulu » |
| Bulle de correction | blanche | carte lilas avec frise ; l'ancien texte barré, le nouveau en vert foncé |

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
