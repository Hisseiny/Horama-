# Qui fait quoi

État au lundi 16 novembre 2026, 22 h. Tenu à jour par l'orchestrateur du couloir Nathan à chaque étape franchie. Cap : `docs/decisions/2026-11-16-scene-en-direct.md`.

## Fait et prouvé

| Brique | État | Preuve |
|---|---|---|
| Facturo en ligne, v12 et v13, 15 changements activables | Fait | `docs/decisions/2026-11-16-url-faux-saas.md` |
| Vault de Facturo : 5 notes, 13 règles, 3 tests C2 | Fait | `vault-horama/facturo/` |
| Base Supabase | Fait | `base/appliquer.mjs --verifier` |
| Lecture et écriture du vault (`@horama/memoire`) | Fait | 28 tests |
| Génération des tests par Hugging Face | Marche, trop lent (16,3 s pour 10 s visés) | `jugement/generation/comparaison.md` |
| Agent H dans un Chrome local, curseur sur ses clics, captures identiques | Prouvé, 3 passages sur 3, 45 à 70 s par parcours | `docs/tests/2026-11-16-t7-navigateur-local.md` |
| App à 8 onglets (`interface/`) | Faite, forme abandonnée ; écrans de fin à réemployer | `docs/captures/2026-11-16-porte-direction/` |

## Nathan et son orchestrateur : la scène (ce que le jury regarde)

| N° | Tâche | État |
|---|---|---|
| S1 | Mascotte provisoire à la place du curseur, bulle, états, zones surlignées ; parcours construit depuis les tests du vault | en cours |
| S2 | Vérification à chaque écran pendant le parcours : valeurs lues dans la page, calcul des règles, image contre la version 12, zones d'écart | en cours |
| S3 | Fin de parcours : bug ou voulu sur chaque zone, décisions et note corrigées d'un coup | à faire |
| S4 | Déclenchement par un déploiement Vercel | à faire |
| | Remesurer la génération avec un fournisseur plus rapide | à faire |
| | Banc de mesure | à faire, coupé en premier si le temps manque |

## Ali et son orchestrateur : le moteur (ce qui doit tenir)

| Tâche | État |
|---|---|
| Agent `horama-testeur` et ses outils `relever` et `terminer` | à confirmer par Ali |
| Coureur robuste : suivi de la session, sessions muettes relancées, coût et durée, écriture de `passages`, `evenements`, `captures` | A4, attente levée par T7 |
| Consigne qui enchaîne les tests du vault dans un seul parcours | à faire |
| Outillage du dépôt (`pnpm -r check` échoue sur `@horama/contrats`, `packageManager` non exact) | à faire |
| Mode cloud pour la version en ligne que le jury teste seul | à trancher |
| Réponse à la proposition de partage de la décision | attendue |

Le couloir Nathan n'est pas bloqué par ces tâches : la sonde T7 (`automatisation/scene/agent-h.mjs`) contient un coureur minimal qui marche.

## Le reste de l'équipe : le visuel et le pitch

| Tâche | Qui |
|---|---|
| Mascotte définitive, dans ses états (repos, clic, interrogation, bug trouvé, tout va bien) | groupe de Nathan, liste exacte fournie quand la provisoire tourne |
| Direction artistique des écrans de fin | Inès |
| Pitch | Noé |

## À faire par Nathan lui-même

1. Fusionner les pull requests de `dev-nathan` vers `dev`.
2. Obtenir la réponse d'Ali sur le partage.
3. Prévoir pour la démo un écran d'au moins 900 px de haut utiles (l'écran intégré du Mac ne suffit pas pour une zone de page de 1280 × 900).
4. Fixer la part du quota Devin utilisable (remise à zéro après la démo).
