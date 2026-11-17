# Qui fait quoi

État à la clôture du lundi 16 novembre 2026 (mardi 17, 0 h 30). Tenu à jour par l'orchestrateur du couloir Nathan à chaque étape franchie. Cap : `docs/decisions/2026-11-16-scene-en-direct.md`. Détail daté : `docs/journal-nathan.md`.

## Fait et prouvé

| Brique | État | Preuve |
|---|---|---|
| Facturo en ligne, v12 et v13, 15 changements activables | Fait | `docs/decisions/2026-11-16-url-faux-saas.md` |
| Vault de Facturo : 5 notes, 13 règles, 3 tests C2, références v12 | Fait | `vault-horama/facturo/` |
| Base Supabase | Fait | `base/appliquer.mjs --verifier` |
| Lecture et écriture du vault (`@horama/memoire`) | Fait | 28 tests |
| Génération des tests par Hugging Face | Marche, trop lent (16,3 s pour 10 s visés) | `jugement/generation/comparaison.md` |
| Agent H dans un Chrome local, clics suivis, captures identiques | Prouvé, 3 passages sur 3 | `docs/tests/2026-11-16-t7-navigateur-local.md` |
| Vérification à chaque écran pendant le parcours (valeurs, 5 règles, image) | Fait, 34 tests sur les captures réelles | `jugement/verification/` |
| La scène : curseur, mascotte provisoire, phrases simples, trait animé, fin où l'humain tranche, décisions écrites dans le vault | Jouée de bout en bout avec le vrai agent (101 s, 4 écrans, 3 questions) | `automatisation/scene/`, `docs/captures/2026-11-16-scene/` |
| App à 8 onglets (`interface/`) | Faite, forme abandonnée ; écrans de fin à réemployer | `docs/captures/2026-11-16-porte-direction/` |

## Nathan et son orchestrateur : la scène (ce que le jury regarde)

| N° | Tâche | État |
|---|---|---|
| S1, S2, S3 | Scène, vérification pendant le parcours, fin de parcours | faits, **en attente de l'avis de Nathan** sur le dernier parcours |
| S3 (suite) | Défauts connus de la scène : une règle conforme ne montre pas ses deux valeurs ; le doute qui devient problème change de couleur hors champ ; clignotement de la couche à chaque capture ; marques des autres constats visibles pendant une question | à faire |
| S3 (suite) | Correction de la documentation proposée après un « voulu » qui la contredit (le modèle propose la phrase, l'humain accepte, la note change) | à faire |
| S4 | Déclenchement par un déploiement Vercel | à faire |
| | Tenue sur 5 à 10 parcours de suite (3 muets sur 11 le 8/11 sur Nami) et vidéo de secours | à faire |
| | Remesurer la génération avec un fournisseur plus rapide | à faire |
| | Banc de mesure | à faire, coupé en premier si le temps manque |

## Ali et son orchestrateur : le moteur (ce qui doit tenir)

| Tâche | État |
|---|---|
| Agent `horama-testeur` et ses outils `relever` et `terminer` | à confirmer par Ali |
| Coureur robuste : suivi de la session, sessions muettes relancées, coût et durée, écriture de `passages`, `evenements`, `captures` en base | A4, attente levée par T7 |
| Outillage du dépôt (`pnpm -r check` échoue sur `@horama/contrats`, `packageManager` non exact) | à faire |
| Mode cloud pour la version en ligne que le jury teste seul | à trancher |
| Réponse à la proposition de partage de la décision | attendue |
| Branche `dev-ali` | toujours absente du dépôt le 17/11 à 0 h 30 |

Le couloir Nathan n'est pas bloqué : `automatisation/scene/agent-h.mjs` contient un coureur minimal qui marche. Rien n'est encore écrit en base par la scène (elle écrit un `passage.json` local et les décisions dans le vault) : c'est le point de jonction avec le coureur d'Ali.

## Le reste de l'équipe : le visuel et le pitch

| Tâche | Qui |
|---|---|
| Mascotte définitive : 5 états (repos, vérification, interrogation, défaut, conforme), un bloc par état dans `automatisation/scene/couche-horama.js`, format et ancrage décrits dans `automatisation/scene/README.md` | groupe de Nathan |
| Direction artistique de la scène (bulle, bandeau, boutons, écran de fin) et des écrans de fin | Inès |
| Pitch | Noé |

## En attente de Nathan (à reposer à la reprise)

1. Son avis sur le dernier parcours : curseur, mascotte, rythme, phrases, fin avec les boutons.
2. Quota Devin à 75 % (remise à zéro après la démo) : l'orchestrateur code lui-même les ajustements, ou Devin réservé à une ou deux grosses tâches, ou achat de solde.
3. La réponse d'Ali sur le partage.
4. Un écran d'au moins 900 px de haut utiles pour la démo (l'écran intégré du Mac ne suffit pas).

## Pour rejouer la scène

Depuis la racine, avec `holo` installé (`pip install "hai-agents[cli,browser]"` dans un environnement à part) et la clé de H dans `.env.local` :

`node --env-file=.env.local automatisation/scene/parcours.mjs --plafond 20`

Souris hors de la fenêtre de l'agent pendant le parcours ; les questions de fin se cliquent à la souris. Sans agent, pour voir le montage : ajouter `--sans-agent --rythme 3`. Les décisions s'écrivent dans `vault-horama/facturo/decisions/` : les retirer pour rejouer à zéro.
