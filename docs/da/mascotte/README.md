# Mascotte : les états de la scène (issue #113)

Ces états suivent la charte « L'envoyé » (18/11), section 3 : la mascotte d'Inès, dessin repris tel quel depuis `mascotte.js` (œil rond, ailes lilas). **Le dessin ne change jamais** : seuls la couleur de l'iris et le badge changent selon l'état. Pendant le parcours, la scène n'affiche aucun texte : seule la mascotte dit ce qui se passe.

| Fichier | État | Quand la scène l'affiche | Iris | Badge |
|---|---|---|---|---|
| `observe` | Il regarde. | Pendant toute la visite : il lit, défile, clique. | `#7F77DD` | aucun |
| `trouve` | Il a trouvé. | Un défaut vient d'être prouvé et entouré. | miltos `#B8321F` | « ! » |
| `doute` | Il doute. | Il croit voir quelque chose sans pouvoir le prouver : un humain tranche. | ocre `#C48A1E` | « ? » |
| `bloquee` | Il est bloqué (proposé). | Le site refuse les robots, ou une page ne s'ouvre pas : le passage s'arrête. | encre secondaire `#5C5546` | barre |
| `fini` | C'est rangé. | La visite est finie, le récapitulatif s'ouvre. | olivier `#2E7D55` | coche |

`bloquee` n'existe pas dans la charte. Il est proposé dans le même système, avec l'encre secondaire de la charte et non une couleur d'état : il n'affirme rien, il dit seulement que la visite s'arrête. À valider par le responsable de la scène.

Le trait de la mascotte est en encre `#1C1C1C`, comme dans `docs/da/mascotte.js` (aligné le 18/11).

## Format

- Un SVG et un PNG transparent par état, **512 × 512**. Le cadrage est le même pour tous (celui de `mascotte.js`) : la mascotte ne saute pas d'un état à l'autre.
- `planche.png` :
  - les cinq états sur fond ciel et sur fond nuit ;
  - puis à taille réelle (104 px, la taille du récapitulatif dans la charte) sur une page claire du site d'Eugenia, sur une photo du site et sur fond nuit.

Aucun fichier de code : le couloir du responsable de la scène les branche dans `automatisation/scene/`.
