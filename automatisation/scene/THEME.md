# Thème de la scène : direction « Musée grec »

Fichiers de la CDO, à côté de la couche sans la modifier :

- `theme-horama.js` : le thème (styles, mascotte, mots des étiquettes, logo, lettres des trouvailles, place du bandeau, écran de fin) ;
- `apercu-theme.mjs` : un aperçu qui branche le thème sur la couche actuelle, **en mémoire seulement**, joue une petite visite sur une page et en tire des captures ;
- ce fichier.

## Ce que le thème change

| Élément | Avant | Avec le thème |
|---|---|---|
| Bandeau | en haut (`top: 10px`) : il recouvre la ligne d'annonce noire du site d'Eugenia (« candidatures ouvertes… ») | en bas, avec une frise grecque fine : le haut du site reste visible (annonce d'Eugenia, barre et date de Facturo) |
| Mascotte | ailes pointues, pastilles « ! », « ? », « ✓ » | l'œil ailé de référence (`draft.eye.mp4`), chaque état se lit sur le visage, sans pastille |
| Numéro d'une trouvaille | 1, 2, 3 dans un carré | pièce ronde à bord perlé, lettre grecque Α, Β, Γ |
| Zones | cercle au feutre (rough-notation) | cadre fin : corail pour un défaut, pointillés violets pour un doute ; « Avant » en clair pour l'ancienne place |
| Étiquettes | tampons penchés en capitales | pastilles droites en minuscules, texte violet foncé sur fond de couleur |
| Voile de la revue | violet nuit | lilas clair |
| Bulles et question | violet nuit, capitales | cartes lilas, texte à empattements (Georgia), frise en tête de la question, boutons en minuscules |
| Récapitulatif (`fin`) | panneau violet | temple dessiné en traits fins, « ὅραμα · ce qui est vu », registre des fichiers écrits avec leur lettre |

Polices système seulement (Georgia, Segoe UI) : la couche vit dans la page testée et ne charge rien du web. Le corail, le citron et la lavande ne servent que d'aplats avec du texte violet foncé ; tout texte sur fond clair est au moins à 4,5:1 (WCAG AA).

## Le branchement à faire dans la couche (propriétaire : CAO)

Huit remplacements dans `couche-horama.js`, une ligne dans `scene.mjs`. Ce sont exactement ceux qu'applique `apercu-theme.mjs` (tableau `WIRING`), qui s'arrête en le disant si l'un d'eux ne se trouve plus.

`couche-horama.js` :

1. signature : `(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate)` → `(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate, THEME = {})` ;
2. avant `const LOGO = ` : `Object.assign(SPRITES, THEME.sprites ?? {}); Object.assign(STAMPS, THEME.stamps ?? {});`, puis `const LOGO = THEME.logo ?? …` ;
3. juste avant `</style>` : `${THEME.css ?? ""}` ;
4. dans `place()` : `const top = TITLE && THEME.banniere !== "bas" ? 72 : 8;` et `const floor = innerHeight - (TITLE && THEME.banniere === "bas" ? 84 : 8);`
5. et 6. dans `place()` : `innerHeight - M - 8` → `floor - M`, `innerHeight - height - 8` → `floor - height` ;
7. numéro de zone : `element("b", "", zone.n)` → `element("b", "", THEME.numero ? THEME.numero(zone.n) : zone.n)` ;
8. dans `fin()` : `if (THEME.recap) THEME.recap(end, { titre, compte, legende, fichiers }); else end.replaceChildren(…)`.

`scene.mjs`, dans `installLayer` : passer le thème en cinquième argument, après `RoughNotation.annotate` : `, ${read("./theme-horama.js")}()`.

Sans thème (`THEME = {}`), la couche reste exactement comme aujourd'hui.

## Voir l'aperçu

```bash
node automatisation/scene/apercu-theme.mjs https://www.eugeniaschool.com <dossier>
node automatisation/scene/apercu-theme.mjs "http://localhost:3100/v13/entrer?r=total-liste&suite=/v13/factures" <dossier> --facturo
```

Six captures par page : lecture, défaut, doute, question, réponse, récapitulatif. Les textes et les fichiers du récapitulatif sont des valeurs d'exemple, pas un vrai passage.

## Pas changé, à décider avec le CAO

- Les mots des compteurs du bandeau (« OK », « défaut », « à trancher ») viennent de `renderBanner`, pas du thème.
- L'étiquette d'une zone se place au-dessus d'elle : quand deux zones sont proches (le total et « Exporter » sur Facturo), l'étiquette de l'une peut couvrir l'autre.
- Les lettres grecques Α et Β ressemblent aux lettres latines A et B dans la plupart des polices.
