# Réveil par PR sur le clone, à blanc (issue #71), 18 novembre 2026

Couloir Nathan. But : régler `automatisation/reveil/pr.mjs` sur le dépôt du clone (`Hisseiny/eugenia-school-website`, public) et vérifier, sans H, qu'il voit les PR et leurs déploiements de prévisualisation. Aucune adresse propre au clone n'entre dans le code : le dépôt et le logiciel du vault passent en paramètres (`--depot`, `--logiciel eugenia-clone`).

## Ce qui change

Le réveil gagne une option `--a-blanc`. Elle fait une lecture de GitHub et ne joue rien : ni scène, ni H, ni écriture. Elle affiche :
- le nombre de déploiements Preview du dépôt ;
- chaque PR ouverte, avec l'état de la prévisualisation de son dernier commit et ses fichiers ;
- les tests que la PR ferait rejouer, et ceux qu'elle écarte.

Les lecteurs de GitHub et du faux GitHub ont une fonction de plus, `deploiementsPreview()`.

## Ce qui a été lancé et ce qui en est sorti

1. `node --test pr.test.mjs` (dossier `automatisation/reveil/`) : 5 tests, 5 réussis. Le nouveau test couvre trois cas : une PR prête, avec 1 test rejoué et 1 écarté ; un dépôt sans Vercel ni PR ; une PR sans déploiement Preview.
2. À blanc sur le vrai dépôt :

   ```
   node automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --a-blanc
   réveil PR, à blanc : Hisseiny/eugenia-school-website, vault eugenia-clone, rien n'est joué.
   Aucun déploiement Preview sur le dépôt : Vercel n'y est pas encore relié.
   Aucune PR ouverte.
   ```

   Code de sortie 0.
3. Lecture directe de l'API (`gh api`), pour confirmer :
   - 0 PR ouverte ;
   - 0 déploiement, tous environnements confondus, et 0 environnement ;
   - sur les commits `07a5f5a` (tête de la PR #10) et `4e7dd32` (`main`), aucun statut ni contrôle Vercel. On ne voit que « Devin Review » et un contrôle `github-actions`.

   Vercel n'est donc pas relié au dépôt.
4. Le lecteur de GitHub sur la PR #10, fermée, faute de PR ouverte :
   - il lit ses 7 fichiers (`src/pages/index.astro`, `src/components/RotatingLine.astro`…) ;
   - la prévisualisation de son commit vaut `null` ;
   - l'impact sur le vault du clone retient `accueil-vers-programmes` (par `src/pages/index.astro`) et écarte `admissions` et `bachelor-vers-msc`.
5. `pnpm -r check` : code 0.

## Ce qui n'est pas testé

- Une vraie PR avec une vraie prévisualisation Vercel : le dépôt n'en a pas encore. Il faut que Ali relie Vercel au dépôt et coupe la protection des prévisualisations (#78).
- La boucle de surveillance (sans `--a-blanc`) sur le vrai dépôt : non lancée, faute de PR à jouer.
