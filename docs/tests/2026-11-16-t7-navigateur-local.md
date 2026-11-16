# T7 : preuve du navigateur local

Rapport écrit par `automatisation/scene/sonde-t7.mjs`. Aucun chiffre n'est saisi à la main ; une valeur absente s'écrit « à mesurer ».

- Date : 16/11/2026 20:45:35 (2026-11-16T19:45:35.800Z)
- Commande : `node --env-file=/Users/nathan/Code/projet/horama/.env.local automatisation/scene/sonde-t7.mjs`
- Mode : avec l'agent H (API REST, navigateur local servi par `holo local browser`)
- Logiciel testé : https://facturo-demo.vercel.app, version 13, départ `/v13/entrer?suite=/v13/tableau-de-bord`
- Chrome : Chrome/157.0.8103.52, lancé par le script avec `--force-device-scale-factor=1 --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --disable-features=Translate --no-first-run --no-default-browser-check --force-color-profile=srgb`, port 9333, profil `/Users/nathan/Code/projet/horama/.orchestrateur/chrome-agent`
- Zone de page mesurée : 1280 × 900 (demandé : 1280 × 900) ; densité de pixels mesurée : 1 (demandé : 1)
- Session H : modèle holo4-27b, effort de raisonnement medium, settle_s 0,5, max_time_s 240, max_steps 40, queue false
- Une session à la fois, 35 s de pause entre deux sessions, abandon sans action 45 s après le départ puis une relance
- Journal du pont : `docs/captures/2026-11-16-t7/pont-holo.log`
- Captures : `docs/captures/2026-11-16-t7/passe-<n>/<ecran>--<vue>.png` et `.txt`
- Passes demandées : 3 ; passes lancées : 3

## Passes

Durée : de la création de la session H à l'appel de `terminer`. Étapes : actions de l'agent vues dans les événements, et compteur de H entre parenthèses.

| Passe | Écrans relevés | Taille des captures | Durée du parcours (s) | Étapes | Durée par étape (s) | Coût (USD) | Relances | État |
|---|---|---|---|---|---|---|---|---|
| 1 | 4 sur 4 | 1280 × 900 | 45,2 | 13 (H : 13) | moyenne 3,3 ; détail 11,1 ; 10,3 ; 1,2 ; 2,3 ; 1,1 ; 2,4 ; 3,3 ; 1,2 ; 2,3 ; 4,9 ; 0,2 ; 0,9 ; 1,5 | 0,0316 | 0 | terminé par l'agent |
| 2 | 4 sur 4 | 1280 × 900 | 59,4 | 13 (H : 13) | moyenne 4,4 ; détail 7,6 ; 6,2 ; 1,5 ; 3,1 ; 2,0 ; 3,1 ; 3,0 ; 1,9 ; 9,1 ; 5,1 ; 1,8 ; 11,0 ; 2,1 | 0,0323 | 0 | terminé par l'agent |
| 3 | 4 sur 4 | 1280 × 900 | 70,5 | 13 (H : 13) | moyenne 5,0 ; détail 3,0 ; 15,6 ; 1,8 ; 11,5 ; 7,9 ; 7,2 ; 3,1 ; 1,9 ; 2,7 ; 3,0 ; 2,9 ; 1,8 ; 2,2 | 0,0273 | 0 | terminé par l'agent |

Sessions H : passe 1 : e16e9d8b-3d20-4e5b-a61f-6d60b4b263fd ; passe 2 : bcb97342-0aa9-4384-82a9-7731241a267c ; passe 3 : 0a1ee1a9-0607-419e-83db-2f1b75ed304a.

## Clics vus par la couche du curseur

Chaque ligne est un appui de souris signalé par la couche posée dans la page : le point, et ce qu'il y a dessous (`elementFromPoint`).

### Passe 1

| Heure | x | y | Balise | Texte | data-zone | href |
|---|---|---|---|---|---|---|
| 19:41:35.678 | 47 | 115 | a | Factures |  | /v13/factures |
| 19:41:39.110 | 368 | 153 | summary | Filtrer : Toutes |  |  |
| 19:41:41.966 | 326 | 261 | a | Échéance dépassée |  | /v13/factures?filtre=echeance-depassee |
| 19:41:46.106 | 368 | 153 | summary | Filtrer : Échéance dépassée |  |  |
| 19:41:48.395 | 284 | 189 | a | Toutes |  | /v13/factures |
| 19:41:51.128 | 284 | 293 | a | F-119 | ligne-F-119 | /v13/factures/F-119 |

### Passe 2

| Heure | x | y | Balise | Texte | data-zone | href |
|---|---|---|---|---|---|---|
| 19:42:55.051 | 44 | 114 | a | Factures |  | /v13/factures |
| 19:43:00.056 | 369 | 152 | summary | Filtrer : Toutes |  |  |
| 19:43:03.112 | 326 | 261 | a | Échéance dépassée |  | /v13/factures?filtre=echeance-depassee |
| 19:43:07.929 | 369 | 152 | summary | Filtrer : Échéance dépassée |  |  |
| 19:43:16.181 | 284 | 189 | a | Toutes |  | /v13/factures |
| 19:43:19.237 | 284 | 295 | a | F-119 | ligne-F-119 | /v13/factures/F-119 |

### Passe 3

| Heure | x | y | Balise | Texte | data-zone | href |
|---|---|---|---|---|---|---|
| 19:44:45.015 | 46 | 116 | a | Factures |  | /v13/factures |
| 19:45:04.456 | 369 | 151 | summary | Filtrer : Toutes |  |  |
| 19:45:11.623 | 325 | 261 | a | Échéance dépassée |  | /v13/factures?filtre=echeance-depassee |
| 19:45:16.573 | 369 | 151 | summary | Filtrer : Échéance dépassée |  |  |
| 19:45:19.276 | 284 | 189 | a | Toutes |  | /v13/factures |
| 19:45:22.287 | 284 | 295 | a | F-119 | ligne-F-119 | /v13/factures/F-119 |

### Clics attendus

| Clic attendu | Passe 1 | Passe 2 | Passe 3 |
|---|---|---|---|
| lien « Factures » | vu | vu | vu |
| menu « Filtrer » | vu | vu | vu |
| option « Échéance dépassée » | vu | vu | vu |
| option « Toutes » | vu | vu | vu |
| lien « F-119 » | vu | vu | vu |

## Comparaisons des captures

Pixel par pixel (pngjs). La référence est la capture prise par Playwright sans tête (`docs/captures/2026-11-16-n2-faux-saas/`, version 13) : c'est une mesure, pas un critère.

| Capture | Passe 2 contre passe 1 | Passe 3 contre passe 1 | Passe 1 contre la référence |
|---|---|---|---|
| tableau-de-bord--defaut | 0 pixel(s) différent(s) | 0 pixel(s) différent(s) | mêmes dimensions (1280 × 900), 0 pixel(s) différent(s) |
| liste-des-factures--defaut | 0 pixel(s) différent(s) | 0 pixel(s) différent(s) | mêmes dimensions (1280 × 900), 0 pixel(s) différent(s) |
| liste-des-factures--filtre-echeance | 0 pixel(s) différent(s) | 0 pixel(s) différent(s) | mêmes dimensions (1280 × 900), 0 pixel(s) différent(s) |
| detail-facture--defaut | 0 pixel(s) différent(s) | 0 pixel(s) différent(s) | mêmes dimensions (1280 × 900), 0 pixel(s) différent(s) |

## Critère de la décision, point par point

Critère : `docs/decisions/2026-11-16-scene-en-direct.md`, « tenu si, sur 3 passages de suite ».

| Point | Résultat | Détail |
|---|---|---|
| Zone de page 1280 × 900, densité 1 (condition du montage) | oui | mesuré : 1280 × 900, densité 1 |
| L'agent atteint les écrans demandés | tenu | 3 passe(s) sur 3 avec les 4 écrans relevés, adresse vérifiée |
| Le curseur tombe sur l'élément cliqué | tenu | 3 passe(s) sur 3 où la couche a signalé les 5 clics attendus avec le bon élément dessous |
| Deux passages donnent des captures identiques au pixel près | tenu | 2 passe(s) sur 2 identique(s) à la passe 1 sur les 4 captures |
| La durée du parcours complet est mesurée (cible : sous 120 s) | tenu | durées : 45,2 s ; 59,4 s ; 70,5 s |

**Critère de la décision : tenu** sur 3 passe(s).

## Ce qui a échoué

Rien.
