# Mascotte : les expressions de la scène (issue #113)

L'œil ailé de la CDO : œil blanc, iris violet `#7F77DD`, ailes arrondies lavande `#AFA9EC`, trait graphite `#2B2B2B`. Pendant le parcours, la scène n'affiche aucun texte : seule l'expression de la mascotte dit ce qui se passe.

| Fichier | État | Quand la scène l'affiche | Ce qui le dit |
|---|---|---|---|
| `observe` | Observe | tout le parcours : l'agent lit la page, défile, clique | paupière un peu baissée, regard qui glisse sur le côté |
| `trouve` | Trouvé | un défaut prouvé vient d'être entouré | sourcils froncés, iris corail `#F26B5B`, pupille resserrée |
| `doute` | Doute | un constat à vérifier par un humain (avis de Holo, pas une preuve) | un sourcil levé, iris lavande `#9D96EA`, regard de côté |
| `bloquee` | Bloquée | le site refuse les robots, ou une page ne s'ouvre pas : le passage s'arrête | œil fermé, sourcils plats, ailes tombantes |
| `fini` | Fini | le passage est terminé, le récapitulatif s'ouvre | œil qui sourit, iris citron `#B6E36B`, ailes relevées |
| `hesite` | Hésite (proposée, 6e) | juste avant un clic de l'agent | regard vers le bas, petits sourcils inquiets |

## Format

- Un SVG et un PNG transparent par état, **512 × 512**, même cadrage et même centre : la mascotte ne saute pas d'un état à l'autre.
- Un **fin halo blanc** sous le dessin la garde lisible sur les pages sombres et sur les photos.
- Essais à taille réelle sur une page claire, sur une photo et sur le voile sombre de fin : `planche.png`, qui montre aussi les 6 états sur fond clair et sur fond sombre.

Aucun fichier de code : le couloir du responsable de la scène les branche dans `automatisation/scene/`.
