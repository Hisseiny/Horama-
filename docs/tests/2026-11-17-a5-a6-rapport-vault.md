# A5, A6 et rapport C6 dans le vault

## Périmètre

- A5 : commande `pnpm --filter @horama/agent passage -- --help`, options du banc, clé dev par défaut, option explicite pour la clé réservée. Supabase et session H réels câblés, sans appel réseau H pendant ces contrôles.
- A6 : `--logiciel facturo --version 12 --reference 12`, mêmes tests demandés ; consigne filtrée aux vues disponibles en v12. Le test de filtre d’échéance v13 est exclu ; trois couples écran/vue uniques restent. Les captures ne sont pas promues en références par Ali.
- Rapport : emplacement prévu au cadrage §10, `<vault>/<logiciel>/passages/<id>.md`, via `ecrireRapportPassage` déjà fourni par `@horama/memoire`. Le coureur ne fabrique aucun C4 : le Markdown indique zéro réussite et des résultats non concluants tant qu’il n’y a pas de vérification métier.

## Raccord navigateur

Inspection de `origin/dev-nathan` : pas d’export autonome `relever` directement adapté au coureur. Les exports `connectTab`, `fitViewport`, `evaluate`, `findHolo`, `startBridge` existent déjà sur `origin/dev` (`5a4fbbdb1867bf4758c08e8387905167656efad1`). Le raccord Ali réutilise uniquement ces exports ; aucun import d’une nouveauté exclusive à `dev-nathan` et aucune modification d’`automatisation/`.

Le hook de capture vit dans `agent/src/browser.ts` : PNG CDP de l’onglet courant, texte, URL, dimensions, défilement. Pas de navigation par le hook. Chrome dédié déjà lancé sur 9333, zone 1280 × 900 et DPR 1 ; installation de `holo` requise. Le processus suit les sessions jusqu’à leur fin et nettoie connexion CDP et ponts. Chrome reste ouvert.

## Contrôles

```sh
pnpm install && pnpm -r check
pnpm --filter @horama/agent passage -- --help
git diff --check
```

Les tests du paquet couvrent : arguments normaux, aide, listes absentes ou invalides, câblage des dépendances factices et sélection explicite de clé, nettoyage sur erreur, capture sans navigation, dimensions incompatibles, pont absent/non prêt, passage v12 injecté avec dédoublonnage, rapport écrit dans une copie temporaire du vault et échec d’écriture remonté en base.

Résultats du contrôle : installation déjà à jour ; `pnpm -r check` code 0,
tous les paquets terminés, 36 tests agent réussis et zéro échec. Les scripts
vérifient types et tests ; aucun lint dédié. L’aide A5 s’affiche avec code 0,
sans démarrer de navigateur ni session. `git diff --check` code 0.

## Limites

Aucun appel H, aucune clé réelle ou de démo utilisée. Aucun passage A5/A6 réel : attente de la clé Horama autorisée. Les PNG et sessions des tests unitaires sont factices, pas une preuve de navigation ni de durée ou coût H. Les rapports générés par les tests restent dans des dossiers temporaires, jamais dans `vault-horama/` committé. La promotion des références reste au couloir Nathan. Replay public et mesures A7 restent à faire.

Les lignes 1.7, 2.2 et 1.14 restent « codé non testé » au sens humain de la checklist. La ligne 1.8 est « testé » grâce à la preuve de Nathan, pas grâce à un essai Ali. Les lignes 3.4 et 4.7 restent « en cours » tant que leur validation réelle manque.
