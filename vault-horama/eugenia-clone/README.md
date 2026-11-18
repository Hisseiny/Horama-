# Clone du site d'Eugenia School : le logiciel du mode dev

Le mode dev d'Horama (issue #71) joue sur ce clone, pas sur eugeniaschool.com. Nous n'avons pas le code du vrai site. Le clone, lui, a un dépôt (`Hisseiny/eugenia-school-website`, site statique Astro, déployé par Vercel) : une PR du clone réveille Horama, qui choisit les tests par le champ `code:` des notes.

Ce dossier a été écrit le 18/11 à partir du clone au commit `4e7dd32`, construit (`pnpm build`) et servi en local (`astro preview` sur 127.0.0.1). Les textes viennent du texte affiché de chaque page, relevé comme le fait le moteur (`capture()` de `automatisation/scene/scene.mjs`, 1280 × 900). Aucun formulaire n'a été ouvert ni envoyé : le clone utilise les vrais formulaires HubSpot de l'école.

## Ce qu'il contient

- `produit/` : une note par écran (accueil, programmes, bachelor, msc, admissions) et `regles-entre-pages.md` (durée du Bachelor et du MSc entre l'accueil et Programmes).
- `tests/` : trois tests acceptés. `accueil-vers-programmes` porte la règle calculée de la durée du Bachelor ; `bachelor-vers-msc` et `admissions` vérifient que les pages s'ouvrent et comparent leurs captures aux références.
- `references/` : la capture du haut de chaque page, `defaut--v1.png`, prise le 18/11. Deux lectures à quelques secondes d'écart : 0 pixel d'écart sur les cinq pages.
- `passages/`, `decisions/`, `changements/` : vides, remplis par les passages.

## La langue des pages

Chaque note déclare `langue: fr`, la langue de sa page (`<html lang="fr">` sur le clone, vérifié le 18/11 sur les 5 pages). Si la prévisualisation d'une PR affiche une page dans une autre langue, par exemple la traduction en allemand de la démo (#122), le réveil par PR écarte les tests de cette page avec la raison « langue du site changée (fr → de) : tests de la documentation non joués ». Seule l'exploration de tout le site tourne alors.

## Le champ `code:`

Chaque note liste le fichier de sa page et ses fichiers de données, chemins depuis la racine du dépôt du clone, comme GitHub les donne dans la liste des fichiers d'une PR. Les fichiers communs à toutes les pages ne sont listés dans aucune note : un changement de l'un d'eux ne retient donc aucun test par le code. C'est le cas de `src/layouts/Base.astro`, `src/data/site.ts`, `src/data/images.ts`, des en-tête et pied de page de `src/components/`, et des styles.

| Écran | Fichiers |
|---|---|
| accueil | `src/pages/index.astro`, `src/data/home.ts` |
| programmes | `src/pages/programmes.astro`, `src/data/programmes.ts` |
| bachelor | `src/pages/programme/bachelor-ia-business.astro`, `src/data/pages/programme-bachelor-ia-business.ts`, `src/components/LivePage.astro` |
| msc | `src/pages/programme/master-ia-business-alternance.astro`, `src/data/pages/programme-master-ia-business-alternance.ts`, `src/components/LivePage.astro` |
| admissions | `src/pages/admissions.astro`, `src/data/admissions.ts` |

## Écarts entre pages relevés le 18/11, non tranchés

Ce sont des constats sur le clone, pas des règles. C'est à l'école ou à Ali de dire si chacun est voulu.

- Le Bachelor s'appelle « Bachelor IA Applied to Business » sur l'accueil et Programmes, et « Bachelor AI Applied to Business » sur sa page.
- Le MSc s'appelle « MSc IA Applied to Business » sur l'accueil et Programmes, et « MSc IA Appliquée au Business » sur sa page.
- Sur la page du MSc, la durée est écrite deux fois de suite dans l'en-tête : « 2 ans » puis « 2 ans · 120 ECTS ».
- À 1280 × 900, les titres des pages Programmes et Admissions sont coupés au milieu du mot : « Programm » puis « es », « Admission » puis « s ».
