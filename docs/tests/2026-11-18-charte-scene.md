# La charte « L'envoyé » appliquée à la scène (issue #69), 18 novembre 2026

Couloir Nathan. Nathan a choisi la charte « L'envoyé » (`docs/da/charte-graphique.md`, PR #131) et la mascotte de la charte (PR #130). La scène prend la charte. Pendant le parcours, rien d'autre que le curseur, la mascotte et le signe de preuve.

## Ce qui change

- **Palette.** Celle de la charte, en variables de `couche-horama.js` : encre, papier, engobe, encre secondaire, filet, soleil, ciel, aile. Les couleurs d'état sont miltos `#B8321F` (défaut), ocre `#C48A1E` (doute) et olivier `#2E7D55` (conforme, rangé), à la place de `#E5484D`, `#E8A33D` et `#2E9E5B`. Elles ne servent qu'aux états.
- **Les deux signes de preuve** de `docs/da/trait.js`, lu tel quel par `scene.mjs`, remplacent rough-notation :
  - un défaut prouvé : un seul trait miltos, d'un geste, liseré clair dessous (`tracerDefaut`) ;
  - un doute : une rangée de points ocre sous l'élément (`poserDoute`) ;
  - sur la page comme sur les captures du récapitulatif.

  Ce qui s'est déplacé garde un cadre en pointillé d'encre.
- **Le curseur** : la flèche encre cernée de blanc, inchangée. **Le voile de fin** : la nuit de la charte (`#2A2647`, 72 %), au lieu du noir.
- **Les trois voix** de la charte : Tilt Warp (titres, chiffres), Funnel Sans (texte), Spline Sans Mono (mesures, adresses).
  - Elles sont demandées à Google Fonts seulement à l'ouverture du récapitulatif. Pendant la visite, la page ne charge rien de plus : une police refusée par le site serait une erreur de sa console, que les contrôles prendraient pour un défaut.
  - Sans elles, la scène affiche les polices de repli prévues par la charte.
- **Le récapitulatif**, carte de la charte :
  - un bandeau ciel avec le soleil et la mascotte (`fini`, ou `bloquee`), animée ;
  - « J'ai fini. » en Tilt Warp, puis l'adresse en mono ;
  - trois chiffres : défauts prouvés en miltos, à trancher en ocre souligné de points, pages visitées (tests rejoués en mode dev) ;
  - un relevé par constat, avec son carré (« ! » miltos, « ? » ocre) et sa mesure en mono (« mesuré : 404 ») ou « bug, ou voulu ? » ;
  - le détail des pages ou des tests en petit ;
  - le bouton ailé « Les regarder un par un », avec les ailes `aile-g` et `aile-d` de la landing.

  Sur un site qui n'a pas pu être visité : « Je n'ai pas pu entrer. », l'adresse et la raison.
- **Une question à la fois**, même carte :
  - la mascotte dans l'état du constat (`trouve` ou `doute`) ;
  - le rang en mono, puis la capture avec son signe ;
  - le constat, puis la preuve en mono ;
  - « C'est un bug, ou c'est voulu ? », avec les boutons « C'est un bug » (miltos) et « C'est voulu » (papier) ;
  - le tampon « Bug noté » ou « Voulu » en mono.
- **La fin** : même carte, titre en Tilt Warp, fichiers écrits en mono. La bulle de correction de note prend le papier, le bord encre et le mono.
- **Les scripts** :
  - `exploration.mjs` et `parcours.mjs` donnent au récapitulatif son titre, son adresse, ses trois chiffres et la mesure de chaque constat ;
  - `recapitulatif.mjs` ne transmet plus les captures au récapitulatif, qui n'en montre plus : elles viennent une par une, avec la question.

## Ce qui a été lancé

1. Captures de la scène sur un passage factice (page locale « talaria.exemple », sans H ; seul réseau : les polices de la charte), à 1280 × 900 :
   - [trait d'un défaut](captures/2026-11-18-charte-scene/01-trait-defaut.png) ;
   - [points d'un doute](captures/2026-11-18-charte-scene/02-points-doute.png) ;
   - [récapitulatif](captures/2026-11-18-charte-scene/03-recapitulatif.png), avec 1 défaut prouvé, 1 doute et 3 pages ;
   - [question sur le défaut](captures/2026-11-18-charte-scene/04-question-defaut.png) ;
   - [tampon « Bug noté »](captures/2026-11-18-charte-scene/05-tampon-bug.png) ;
   - [question sur le doute](captures/2026-11-18-charte-scene/06-question-doute.png) ;
   - [fin](captures/2026-11-18-charte-scene/07-fin.png) ;
   - [site bloqué](captures/2026-11-18-charte-scene/08-recapitulatif-bloque.png).
2. Exploration scriptée de bout en bout (`exploration.mjs --sans-agent --sans-holo --sans-base --choix bug,voulu`), sur la page locale en allemand aux deux boutons trop étroits :
   - code 0 ;
   - « Récapitulatif : J'ai fini. 2 défauts prouvés 0 à trancher 2 pages visitées sur 2 » ;
   - les deux questions sont posées et répondues, et 2 décisions sont écrites.
   - Capture : [récapitulatif](captures/2026-11-18-charte-scene/exploration-scriptee-recapitulatif.png).
3. `mascotte.test.mjs`, `capture-zone.test.mjs` et `capture-consentement.test.mjs` : réussis.
4. `pnpm -r check` : 380 tests, 377 réussis, 1 échec qui ne vient pas de ce changement (`agent/exploration-reseau.test.ts`, #121, `google-chrome` absent du Mac).

## Ce qui n'est pas testé

- Le mode dev (`parcours.mjs`) de bout en bout : son récapitulatif reprend les mêmes commandes de la couche, mais la répétition écrit dans la base partagée et n'a pas été lancée ici.
- Un site dont la politique de sécurité refuse Google Fonts : le récapitulatif s'affiche alors avec les polices de repli.
- Aucun passage avec H.

## Deux détails corrigés après relecture (coordination)

- **La capture d'une question n'est plus coupée au milieu d'un mot.** Elle montre toute la largeur de la page, la hauteur centrée sur la zone. Avant : un cadrage au plus près de la zone, qui coupait « Sandales » et « atelier » à gauche.
- **Le compte des pages tombe juste.** La ligne des pages compte aussi la page de départ : « 1 page de départ, 1 page atteinte par un clic de l'agent, 1 ouverte par son adresse », pour 3 pages visitées. Sur l'exploration scriptée : « 1 page de départ, 0 page atteinte par un clic de l'agent, 1 ouverte par son adresse », pour 2 pages visitées sur 2 (arrivées `depart` et `adresse` dans `exploration.json`).

Les captures `03` à `06` et celle de l'exploration scriptée sont reprises avec ces corrections.
