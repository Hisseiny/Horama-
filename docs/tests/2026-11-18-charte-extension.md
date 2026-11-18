# La charte « L'envoyé » appliquée à l'extension (issue #68), 18 novembre 2026

Couloir Nathan. Après la scène (#140), l'extension Chrome prend la charte choisie par Nathan (`docs/da/charte-graphique.md`), avec la mascotte de la charte (PR #130).

## Ce qui change

- **La fenêtre (360 px)**, comme sur la planche de la charte :
  - un bandeau ciel avec le soleil, le mot de marque (l'œil à la place du « o ») et la mascotte de 84 px, en `observe` ;
  - « Le site de cet onglet », puis l'adresse en mono, dans une pilule papier ;
  - le bouton ailé « Envoyer Horama », qui remplace « Lancer ».
- **Le rapport**, la carte du récapitulatif de la charte :
  - un bandeau ciel avec le soleil et la mascotte de 104 px, qui passe de `observe` à `trouve` dès qu'un défaut est prouvé, puis à `fini`, ou à `bloquee` pour un site qui n'a pas pu être visité ;
  - le titre en Tilt Warp : « Il visite le site. », « J'ai fini. », « Je n'ai pas pu finir. » (exploration interrompue) ou « Je n'ai pas pu entrer. » ;
  - l'adresse en mono ;
  - trois chiffres : défauts prouvés en miltos, à trancher en ocre souligné de points, pages visitées ;
  - chaque défaut sur sa **feuille** (barre d'adresse en mono, capture sur toute la largeur de la page, avec une marge pour le trait), marqué du **trait miltos** de `trait.js`, la mesure dessous en mono (« mesuré : … », « attendu : … ») ;
  - chaque doute sous « À trancher », marqué des **points ocre** ;
  - les pages avec le **carré de leur état** : coche olivier, « ! » miltos, « ? » ocre, rond lilas qui bat en visite, carré pointillé à visiter, carré d'encre non visitée. Une page avec un doute dit « 1 à trancher ».
- **Les options** : même pâte, champ en pilule et petit bouton ailé.
- **Les fichiers** :
  - `envoye.css` est copié tel quel de la charte ;
  - `lib/trait.js` est copié de `docs/da/trait.js`, et `rough-notation` est retiré de l'extension ;
  - `mascotte/` est copié de `docs/da/mascotte/`, mis en ligne par `mascotte.js` et animé par `commun.css` comme dans la scène (ailes, clignement) ;
  - `empaqueter.sh` met les nouveaux fichiers dans le `.zip`, et le README de l'extension est à jour.

## Ce qui a été lancé

L'extension chargée par CDP dans un Chrome à profil jetable, contre le faux service (`extension/faux-service/`), sans H. Seul réseau : les polices de la charte. Trois explorations factices :
- **complète** : l'exploration enregistrée d'eugeniaschool.com, 1 défaut prouvé, plus un doute de Holo ajouté sur `/notre-adn` ;
- **partielle** : 2 pages non visitées ;
- **bloquée** : skema.edu, anti-robot.

| Capture | Titre | Débordement horizontal | Mascotte |
|---|---|---|---|
| [fenêtre, 360 px](captures/2026-11-18-charte-extension/fenetre-360.png) | | 0 (360 px de large) | `observe` |
| complète, [1440](captures/2026-11-18-charte-extension/rapport-complet-1440.png) et [390](captures/2026-11-18-charte-extension/rapport-complet-390.png) | « J'ai fini. » | 0 | `fini` |
| partielle, [1440](captures/2026-11-18-charte-extension/rapport-partielle-1440.png) et [390](captures/2026-11-18-charte-extension/rapport-partielle-390.png) | « Je n'ai pas pu finir. » | 0 | `fini` |
| bloquée, [1440](captures/2026-11-18-charte-extension/rapport-bloquee-1440.png) et [390](captures/2026-11-18-charte-extension/rapport-bloquee-390.png) | « Je n'ai pas pu entrer. » | 0 | `bloquee` |

Le haut de chaque rapport est aussi capturé seul (fichiers `-haut`). `pnpm -r check` : 380 tests, 377 réussis, 1 échec qui ne vient pas de ce changement (`agent/exploration-reseau.test.ts`, #121, `google-chrome` absent du Mac).

## Ce qui n'est pas testé

- Le vrai service de #68 (Railway) et le clic sur le bouton de la barre d'outils : la fenêtre est ouverte comme une page.
- La pupille qui suit la souris n'est pas branchée dans l'extension : la mascotte bat des ailes et cligne seulement.
- Aucun passage avec H.
