# Réveil par PR : les tests du vault écartés quand la langue du site change (issue #122, point 2), 18 novembre 2026

Couloir Nathan. La démo du mode dev (#122) réveille Horama sur une PR qui traduit le clone en allemand. Les tests du vault sont écrits en français : sur une page traduite, ils échoueraient sur chaque texte. Ils doivent être écartés avec leur raison, et seule l'exploration de tout le site doit tourner.

## Choix

La coordination proposait de noter la langue dans le README du vault du clone. Je l'ai mise dans l'en-tête de chaque note d'écran, `langue: fr` : un README n'est pas lu par le programme, et une langue par page reste juste si un site mélange les langues. La règle est générique : elle ne connaît ni le clone ni l'allemand. Elle compare la langue déclarée par la note au `<html lang>` que la prévisualisation sert à l'adresse de cette note.

## Ce qui change

- `automatisation/reveil/pr.mjs` :
  - `langueDePage(adresse)` lit le `<html lang>` d'une page (première partie, en minuscules ; `null` si la page ne le dit pas ou ne répond pas) ;
  - `ecarterLangue(impact, …)` écarte un test retenu dès qu'une page dont il dépend a changé de langue, avec la raison « langue du site changée (fr → de) : tests de la documentation non joués ».
- `jouerPr` l'applique avant d'écrire `impact.json`. Sans test restant, le parcours du vault n'est pas lancé, et l'exploration tourne. `reveil.json` garde la raison dans `langue`.
- Le mode à blanc l'affiche.
- Vault :
  - `langue: fr` dans les 5 notes du clone (`<html lang="fr">` vérifié sur les 5 pages de la prévisualisation de la PR #11 du clone) ;
  - le champ est décrit dans le modèle `_modeles/note-ecran.md` et dans le README du vault du clone.

## Ce qui a été lancé

1. `node --test automatisation/reveil/pr.test.mjs` : 10 tests, 10 réussis. Les deux nouveaux couvrent :
   - la lecture de `<html lang>` (`de-DE`, `FR`, absente, panne réseau) ;
   - une prévisualisation en allemand : les deux tests sont écartés avec la raison, et seules les deux adresses des notes sont demandées ;
   - même langue ou langue absente : tests gardés ;
   - dans `jouerPr`, seule l'exploration est lancée et `reveil.json` dit pourquoi ;
   - le mode à blanc l'affiche.
2. À blanc, avec un faux GitHub et deux prévisualisations locales, l'une servie en `de`, l'autre en `fr`, pour deux PR qui modifient `src/data/home.ts` :

   ```
   PR #31 (deutsch) « Traduction en allemand » : prévisualisation prête (faux GitHub), http://127.0.0.1:9412, répond sans connexion (code 200).
     1 fichier(s) : src/data/home.ts
     tests rejoués : aucun ; écartés : admissions, bachelor-vers-msc, accueil-vers-programmes
     langue du site changée (fr → de) : tests de la documentation non joués (accueil-vers-programmes)
   PR #32 (francai) « Durée du Bachelor » : prévisualisation prête (faux GitHub), http://127.0.0.1:9413, répond sans connexion (code 200).
     1 fichier(s) : src/data/home.ts
     tests rejoués : accueil-vers-programmes ; écartés : admissions, bachelor-vers-msc
   ```

3. À blanc sur le vrai dépôt du clone (PR #11 et #13, pages en `fr`) : rien n'est écarté pour la langue.
4. `pnpm -r check` : 380 tests, 377 réussis, 1 échec qui ne vient pas de ce changement : `agent/exploration-reseau.test.ts` (#121) lance `google-chrome`, absent du Mac, et échoue de même sur `dev`.

## Ce qui n'est pas testé

- La vraie PR en allemand d'Ali : à blanc dès qu'elle existe (point 4).
- Une page traduite qui garderait `lang="fr"` : la règle ne la verrait pas. C'est à vérifier sur la PR d'Ali, qui doit poser `<html lang="de">` (#122).
