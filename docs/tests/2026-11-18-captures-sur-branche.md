# Réponse sur la PR avec les captures entourées, poussées sur une branche du dépôt cible (#122, option a), 18 novembre 2026

Couloir Nathan. L'API GitHub ne joint pas d'image à un commentaire, et le dépôt Horama est privé. Nathan a choisi l'option (a) : les captures entourées sont poussées sur une branche dédiée du dépôt cible, `horama/captures`, jamais fusionnée, et la réponse les affiche. L'écriture sur le clone a été autorisée par Nathan dans la session de l'orchestrateur : « go captures sur une branche du clone ».

## Ce qui change

- **`reveil/pr.mjs`, nouvelle option `--captures-sur-branche <branche>`** (avec `--depot` et `--commenter`, désactivée par défaut). Pour chaque défaut prouvé et chaque doute de l'exploration qui a une capture entourée, `televerserCapture` :
  - crée la branche depuis la branche par défaut si elle manque (`git/refs`) ;
  - pousse le fichier par l'API des contenus (`PUT contents`, dans `pr-<numéro>/<commit court>/<constat>.png`, avec le `sha` du fichier s'il existe déjà) ;
  - rend l'adresse `raw.githubusercontent.com/<dépôt>/<commit>/<chemin>`, attachée au commit, donc indépendante du nom de la branche, qui contient un `/`.

  La partie de l'exploration est ensuite réécrite avec une image sous chaque constat. Une capture refusée laisse son constat en texte, et la raison est dite.
- **`scene/exploration.mjs`** : `scene.json` donne, avec le texte de sa partie, ses éléments. Chaque constat porte le chemin de sa capture entourée dans le vault (`anneau`, écrit par `completerNote`).
- **`pr-doc/commentaire.mjs`** : une entrée qui a une `image` l'affiche sous sa ligne.

## Ce qui a été lancé

1. Tests avec un faux GitHub (`node --test automatisation/reveil/pr.test.mjs`, 14 sur 14 ; `pr-doc/commentaire.test.mjs`, 5 sur 5) :
   - `televerserCapture` : branche absente, créée depuis `main` et poussée ; branche et fichier déjà là, `sha` repris et pas de création ; refus rendu (`HTTP 403`), jamais levé ;
   - `jouerPr` avec `captures` : seule la capture qui a un anneau est poussée, au bon chemin (`pr-14/0b4112f/accueil--controle--1.png`) ; la réponse publiée affiche `![…](https://raw.githubusercontent.com/o/clone/c0mmit/pr-14/0b4112f/accueil--controle--1.png)` sous le défaut, l'autre défaut reste en texte, et `reveil.json` dit `poussees: 1`.
2. **Vérification réelle, une fois, sur le clone** (autorisée par Nathan) : une capture entourée de l'essai en allemand (`accueil--controle--1.png`, 1280 × 900, 25 466 octets) poussée par `televerserCapture` dans `essai/2026-11-18/` de la branche `horama/captures` du dépôt `Hisseiny/eugenia-school-website`.
   - La branche est créée depuis `main`, non protégée. Elle a 1 commit d'avance (`9d65d75`), qui ne contient que ce fichier.
   - `https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/9d65d75cfce24a777ec1593c7c536438902ebfc7/essai/2026-11-18/accueil--controle--1.png` répond 200 `image/png` sans connexion, et le fichier est identique à l’original à l’octet près.
3. `pnpm -r check` : 380 tests, 377 réussis, 1 échec qui ne vient pas de ce changement : `agent/exploration-reseau.test.ts` (#121) lance `google-chrome`, absent du Mac.

## Ce qui n'est pas testé

- Une vraie réponse publiée avec ses images sur une PR du clone : à faire au premier passage réel, sur go de Nathan pour H.
- L'affichage de l'image dans le commentaire GitHub : l'adresse est publique et sert une image, mais le rendu dans un commentaire n'a pas été vu.
