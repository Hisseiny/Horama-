À fusionner après #66

# Assemblage de l'exploration — #67 et #63

## Ce qui est fait

- Holo : zones au format `{ x, y, largeur, hauteur }` ; jetons d'entrée/sortie cumulés entre tentatives ; coût du modèle holo4-27b calculé à 0,40 USD/M en entrée et 3,00 USD/M en sortie. Prix inconnu pour holo4-35b-a3b : coût `null`. Seule l'instruction de phrase courte a été adaptée au français.
- Captures : coordonnées document corrigées du défilement ; un défaut prouvé hors du viewport reçoit une capture centrée du viewport dans `captures/<id>.png`, avec zone bornée dans l'image et restauration du défilement. En cas d'échec, conservation du constat et de la capture initiale, sans zone extérieure.
- Cookies : refus générique FR/EN avant capture, jamais d'acceptation ni de soumission de formulaire ; état `refusee` ou `aucune` enregistré.
- Page lente : attente de `document.readyState === "complete"`, bornée à 15 s.
- Complément PR #82 (mesure partie B) : kpmg.com/fr restait invisible à 2 s, visible à 8 s. Après le chargement et le refus éventuel des cookies, attente générique de visibilité effective du body/conteneur principal et de stabilité (hauteur, texte, nombre d'éléments et géométrie visibles inchangés sur deux observations espacées de 500 ms), bornée à 10 s supplémentaires ; puis poursuite même sans stabilité. Cette préparation précède la capture et les contrôles ; délai de transport CDP porté à 30 s pour couvrir les deux bornes. Correctif non vérifié sur le site réel.
- Redirection acceptée sur la même origine après résolution ; abandon après deux essais sans atteindre la bonne page. Autre origine, page navigateur en erreur et page inaccessible reçoivent une raison française.
- Site sans plan, texte anglais et pages HTTP 404/500 couverts ; les pages en erreur atteintes restent visitées, avec contrôles de page en erreur.
- Toute page non atteinte finit `non_visitee`, avec raison dans le rapport et le résultat C4 ; le rapport reste `interrompu`.
- Budget H : `4 × pages + 10`, soit 70 étapes pour 15 pages. Navigation + relevé + attente éventuelle + marge par page, et marge de démarrage/fin/reprises. Une seule relance, limitée aux pages restantes, avec fermeture de la session précédente et conservation des deux agents, coûts et replays. Pas de relance après annulation ni si la fermeture précédente n'est pas confirmée.
- Mesure #68 : moteur de `dev` avant correctifs, sur eugeniaschool.com, 40 étapes consommées, 13/15 pages visitées, 2 non atteintes. Notre replay réel compte 39 étapes pour 15 pages, dont 15 `go_to_web`, 15 `relever` et 6 `terminer` ; inspection par GET uniquement.
- Adaptation minimale de `agent/src/session.ts` : entrée optionnelle `maxSteps` transmise à `max_steps`, validée comme entier positif. Défaut historique 40 conservé hors exploration ; `queue: false` inchangé. Aucun plafond numérique supplémentaire trouvé dans le code/docs inspectés.
- `pages.ts`, `controles.ts` et la ligne d'appel à `controlerPage` n'ont pas été modifiés par ces correctifs d'assemblage.

## Comment c'est testé

Tests hors réseau avec fetch, session H et CDP factices :

- Zones Holo, jetons cumulés, coût connu/inconnu, instruction française et total H + Holo.
- Défaut hors écran à y=4583, capture dédiée, zones visibles et décalage par le défilement ; repli si capture contextuelle impossible.
- Attente de chargement ; redirections, mauvaise page répétée, autre origine, page inaccessible ; capture ou état manquant sans crash.
- Site sans sitemap, texte anglais, pages HTTP 404/500.
- Budget 15 pages = 70 ; arrêt après 13 pages puis relance des seules 2 restantes ; deux agents et replays C4 distincts ; deuxième échec, session muette, création de relance impossible, rejet de fin, annulation et fermeture impossible.
- Transmission HTTP de `max_steps`, `queue: false`, défaut 40 et refus des budgets invalides.
- Complément visibilité : Chrome local, body à opacité nulle puis visible après 3 s, contrôles et capture après apparition ; texte changeant en permanence, poursuite après la borne de 10 s. Test d'ordre dans explorer : préparation entièrement attendue avant capture puis contrôles.

Tests Chrome local effectivement exécutés : contrôles mécaniques sur de vraies pages locales et refus des cookies FR/EN ; acceptation seule, bouton submit dans un formulaire et absence de bannière ne déclenchent pas de clic.

Vérification avant intégration de `dev` : `pnpm -r --if-present run check`.

```text
faux-saas check: # tests 10
faux-saas check: # pass 10
faux-saas check: # fail 0
memoire check: # tests 34
memoire check: # pass 34
memoire check: # fail 0
interface check: # tests 8
interface check: # pass 8
interface check: # fail 0
jugement check: # tests 79
jugement check: # pass 79
jugement check: # fail 0
agent check: # tests 175
agent check: # pass 175
agent check: # fail 0
agent check: # skipped 0
agent check: Done
```

Recherche des cinq domaines interdits dans `agent/src` : 0 ligne.

Après fusion de `origin/dev`, `pnpm install && pnpm -r --if-present run check` est également vert. Installation : `Already up to date`. Résultats finaux :

```text
faux-saas check: # tests 10
faux-saas check: # pass 10
faux-saas check: # fail 0
memoire check: # tests 34
memoire check: # pass 34
memoire check: # fail 0
interface check: # tests 8
interface check: # pass 8
interface check: # fail 0
jugement check: # tests 79
jugement check: # pass 79
jugement check: # fail 0
agent check: # tests 177
agent check: # pass 177
agent check: # fail 0
agent check: # skipped 0
agent check: Done
```

Tests Chrome locaux non ignorés ; recherche des cinq domaines interdits dans `agent/src` après fusion : 0 ligne.

Après le complément visibilité PR #82, nouvelle vérification `pnpm -r --if-present run check` : agent 180 tests, 180 réussites, 0 échec, 0 ignoré ; autres pôles inchangés (10/10, 34/34, 8/8, 79/79). Les deux scénarios Chrome locaux (apparition après 3 s et instabilité bornée à 10 s) ont effectivement été exécutés. Recherche des cinq domaines interdits dans `agent/src` : 0 ligne.

## Passage réel

Un seul lancement, le 18 novembre 2026, de 10:00:36 à 10:03:35 UTC, sur https://www.albertschool.com/fr/, en simple visiteur, sans formulaire.

- Robots : `User-agent: *`, `Allow: /`, exclusion `/studio` ; départ autorisé. Le robots.txt SKEMA a renvoyé une protection HTML : règles non déterminables.
- Chrome visible sur `DISPLAY=:0`, CDP 9333, viewport 1280 × 900, facteur d'échelle 1.
- Durée murale : 179 s ; `duree_s: 177.333` ; état `fini`.
- 15 pages trouvées, 15 visitées ; 0 constat.
- Coût : 0.1004 USD = H 0.0899886 + Holo 0.0104114.
- Jetons Holo : 20216 en entrée, 775 en sortie.
- Replay : https://agp.eu.hcompany.ai/share/api/v1/trajectories/5f70b030-c0e9-4ffc-8548-07ac3656cc8d
- Quota avant/après : 0 session active, 3 disponibles sur 3 ; aucune session `running` laissée après le passage.
- Rapport et captures hors dépôt : `/home/ubuntu/essais/a67/sortie/exploration.json` et `captures/` ; vault : `/home/ubuntu/essais/a67/vault`.

## Relecture à la main

0 constat : rien à juger vrai/faux dans le rapport.

Le responsable a relu manuellement `en.png` et `en-blog-3.png` : aucune bannière de cookies visible sur le premier écran, cohérent avec `cookies: "aucune"`. Sur `en-blog-3`, la troisième carte de blog présente un emplacement d'image gris. Holo y a produit 3 propositions, toutes écartées faute de zone : un doute probablement réel a été perdu. À investiguer : faux négatif possible, parsing de zone Holo. Cette observation n'est pas un défaut prouvé par les contrôles.

## Ce qui n'est pas testé

- Les pages découvertes étaient majoritairement `/en` malgré le départ `/fr` : sujet de découverte, partie A (`pages.ts`). Ce passage ne valide pas sa correction.
- Refus de cookies sur une vraie bannière distante : aucune observée.
- Capture contextuelle d'un défaut sur site réel : aucun défaut prouvé.
- Relance sur une vraie session H : validée uniquement avec fakes.
- Coût holo4-35b-a3b : inconnu, donc `null`, pas de prix inventé.
- Les six autres sites n'ont pas fait l'objet d'un passage d'exploration dans cette validation.

## Intégration et enregistrement

`origin/a-57-holo-faux-constats` (#66) est ancêtre de `origin/dev` lors du fetch final. Fusion de cette branche : déjà à jour ; puis fusion de `origin/dev`, sans conflit. Les versions de `pages.ts` et `controles.ts` restent identiques à celles de `origin/dev`.

Enregistrement d'écran joint à la PR.
