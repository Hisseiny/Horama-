# Tableau d’avancement

Une ligne par tâche du plan de travail. États : à faire, en cours, codé non testé, testé, bloqué. « Testé » = une autre personne a vu marcher la chose ; la preuve (lien de pull request, de replay ou de résultat) est obligatoire.

Chacun met à jour ses propres lignes, dans la pull request de la tâche.


## Phase 0. Lundi, avant 17 h : le rendu de l'idée

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 0.1 | Relire le deck de 5 slides (noms, rôles, slogan) | Tous | à faire |  |
| 0.2 | Déposer le rendu (PDF) depuis l'adresse de l'équipe | Noé | à faire |  |
| 0.3 | Activer son compte de peer review | Chacun | à faire |  |

## Phase 1. Lundi soir : les fondations

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 1.1 | Trancher D1 à D4 (D5 tranchée le 16/11) | Ali, Inès, Noé, l'équipe | à faire |  |
| 1.2 | Poser la structure du repo : dossiers, README, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore`, `.env.example`, cadrage et plan dans `docs/`, fiches de mission, tableau d'avancement | Nathan (fichiers prêts), Ali (valide) | à faire |  |
| 1.3 | Protéger `main` (pull request et une relecture obligatoires), étiquettes A à F, tableau GitHub Projects, une issue par tâche de ce plan | Ali (administrateur du repo) | à faire |  |
| 1.4 | Squelette du code : `package.json`, lint, vérification des types, tests, `npm run dev`, `npm run check`, un dossier par pôle | Ali | codé non testé | A1 : socle pnpm, lint TypeScript, commandes dev, types et tests livrés ; [PR #7 fusionnée](https://github.com/Hisseiny/Horama-/pull/7), [preuve](tests/2026-11-17-1.4-outillage.md). Complément LF/Windows : [PR #25](https://github.com/Hisseiny/Horama-/pull/25) en relecture, pas encore sur dev ; aucun essai Windows revendiqué. validation par une autre personne à attester. |
| 1.5 | Clés : H (Ali, Leslie, Nathan, plus la clé de démo), Hugging Face (Leslie, coupon de 50 €), projet Vercel (Ali), projet Supabase (Inès), crédits v0 (Axil) | Chacun pour les siennes | à faire |  |
| 1.6 | Envoyer au collègue les prérequis du pilote (cadrage, section 17) : environnement de test, compte de test avec données fictives, accord écrit, connexion sans captcha, documentation et notes de version, chiffres | Noé | à faire |  |
| 1.7 | Brouillon des contrats C1 à C8 avec un exemple factice chacun | Ali (gardien), avec Leslie et Inès | codé non testé | Étiquette `contrats-v1` publiée ; [types et exemples C1 à C8](../contrats/). Validation humaine du brouillon non attestée ici. |
| 1.8 | Preuve 1 : l'agent H se connecte au SaaS (pilote si l'accès existe, sinon le faux SaaS ou un site de démonstration) et atteint 2 écrans | Ali, Nathan en renfort | testé | [T7 de Nathan, sur dev](tests/2026-11-16-t7-navigateur-local.md) : trois passages H sur Facturo v13, quatre relevés chacun. Preuve produite par Nathan, distincte du coureur Ali. |
| 1.9 | Preuve 2 : un modèle Hugging Face écrit un test au format H à partir de la note d'exemple du cadrage (section 10) ; deux modèles comparés | Leslie | fait | Mesure T4 du 16/11 (couloir Nathan, `jugement/generation/comparaison.md`) puis remesure du 17/11 avec les suffixes du routeur (`comparaison-rapide.md`, `comparaison-rapide-2.md`) |
| 1.10 | Preuve 3 : Holo (Models API) relève un montant sur une capture | Nathan | à faire |  |
| 1.11 | Vault de départ : structure, 3 notes d'écran, 1 note de règles entre écrans, 1 note de version (factices tant que la doc du pilote n'est pas arrivée) | Inès | à faire |  |
| 1.12 | Maquettes rapides des écrans prioritaires : 11.2 (note vers test), 11.3 (passage en direct), 11.6 (relecture) | Axil | à faire |  |
| 1.13 | Faux SaaS, première version : tableau de bord, liste des factures, détail d'une facture, données fictives, déployé sur Vercel | Nathan | à faire |  |
| 1.14 | Ouvrir `docs/retours-api-h.md` (ce qui marche, ce qui casse, ce qui surprend) | Ali | codé non testé | [Retours API H](retours-api-h.md) : sources de l’équipe, quota 200 et refus entreprise 403 ; mesures restantes explicites. Relecture humaine à faire. |
| 1.15 | Peer review du soir | Tous | à faire |  |

## Phase 2. Mardi matin : contrats gelés, versions factices, points H

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 2.1 | Point de 9 h 30 : état des preuves 1.8 à 1.10, réponse du pilote | Tous | à faire |  |
| 2.2 | Gel des contrats C1 à C8 | Ali | codé non testé | Étiquette distante `contrats-v1` : `42a349108f062e0fe58fe926678199f8866305f5` ; [contrats gelés](../contrats/README.md). Pas de nouvelle attestation humaine ici. contrats-v2 (point 1 de #35) : règle `etat` de D7 ajoutée à `Regle` avec un exemple, PR en brouillon tant que `jugement/` ne la gère pas ; étiquette `contrats-v2` non posée, codé non testé. |
| 2.3 | Versions factices : A (fil et rapport), B (test proposé et verdict), C (vault et base remplis de données factices) | Ali, Leslie, Inès | à faire |  |
| 2.4 | Tables Supabase et stockage des captures, selon C3, C4, C6, C8 | Inès | à faire |  |
| 2.5 | Point technique H (11 h) : questions du cadrage section 18, bugs de la veille avec capture | Ali, Nathan | à faire |  |
| 2.6 | Bascule pilote : sans environnement de test, compte et accord écrit à 12 h, la démo principale part sur le faux SaaS, le vrai SaaS reste en lecture | Noé, Ali | à faire |  |
| 2.7 | Essai de Vercel eve, 30 minutes au plus, verdict écrit ; sans évidence en 30 minutes, on ne l'adopte pas | Nathan | à faire |  |

## Phase 3. Mardi après-midi et soir : la première boucle sur un écran

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 3.1 | Génération : une note du vault devient un test proposé (C1) avec ses questions d'ambiguïté | Leslie | fait | `proposerTests` ; modèle par défaut `openai/gpt-oss-120b:fastest` : 9 sur 9, 3 notes sur 3, 1,6 s en médiane à la mesure de contrôle (`comparaison-rapide-3.md`) ; le code refuse une vue non déclarée dans la note de l'écran et un filtre à limite sans question |
| 3.2 | Écran 11.2 : note à gauche, test à droite, règle surlignée, Accepter, Modifier, Refuser | Axil | à faire |  |
| 3.3 | Écriture du test accepté dans `vault-horama/…/tests/` (C2) | Inès | à faire |  |
| 3.4 | Orchestrateur : une session H par test accepté, événements du fil (C3) en base, lien de replay, abandon d'une session muette après 45 s et une relance | Ali | codé non testé | A3/A4 : coureur et C3 livrés, parcours désormais chaîné ; [PR #9](https://github.com/Hisseiny/Horama-/pull/9) replay public, [PR #15](https://github.com/Hisseiny/Horama-/pull/15) `--tests`/`--base-url`, [PR #17](https://github.com/Hisseiny/Horama-/pull/17) décision d'appel direct par la scène, [PR #18](https://github.com/Hisseiny/Horama-/pull/18) C4 dans `resultats`, [PR #19](https://github.com/Hisseiny/Horama-/pull/19) Dolibarr réel C4 PASS, [PR #22](https://github.com/Hisseiny/Horama-/pull/22) timeout du crochet et annulation : toutes fusionnées. Relance testée avec faux H, pas de gel observé en réel. [Preuve C4](tests/2026-11-17-c4-coureur.md), [preuve Dolibarr](tests/2026-11-17-essai-dolibarr.md), [preuve timeout/annulation](tests/2026-11-17-crochet-relever.md). `settle_s`, raison d'échec C6 et phrase des doublons : [PR #26](https://github.com/Hisseiny/Horama-/pull/26) en relecture, pas encore sur dev. Vues lues dans le champ `vues:` des notes (point 2 de #35) : PR en relecture, pas encore sur dev. site sans `/v<version>/` (point 3 de #35) : [PR #39](https://github.com/Hisseiny/Horama-/pull/39) en relecture, [preuve](tests/2026-11-17-a-site-sans-version.md), essai avec page statique d'essai et faux H. validation par une autre personne à attester. |
| 3.5 | Vérification : relevé des valeurs, calcul, statut (C4) pour une règle d'un écran | Leslie, Nathan en renfort | fait | `verifierReleve` (`jugement/verification/`) ; appelé par le coureur en fin de passage (PR #18) ; passage réel `2026-11-17-13h14-6321` : C4 écrit dans `resultats` (`docs/tests/2026-11-17-c4-coureur.md`) |
| 3.6 | Écran 11.3 : le fil en direct se remplit à partir de la base | Axil | à faire |  |
| 3.7 | Point technique H (15 h) : ce qui bloque 3.4 et 3.5 | Ali, Nathan | à faire |  |
| 3.8 | Workflow n8n : « cas à relire » (C7) devient une notification, et une ligne de mesure part en base | Nathan | à faire |  |
| 3.9 | Banc : liste d'environ 10 régressions (dont 3 entre écrans) et 5 changements voulus (dont 2 contredisent la doc), vérité écrite à l'avance, cas gardés cachés jusqu'à la mesure | Inès | à faire |  |
| 3.10 | Chiffres du pilote (temps de recette, bugs arrivés chez des clients), sa documentation transmise à Inès, premier jet du go-to-market | Noé | à faire |  |
| 3.11 | Intégration : la boucle complète sur 1 écran, sans toucher au code entre deux passages ; `main` gelé pendant le test | Ali | codé non testé | Deux passages H Eugenia avec --sans-base ; C4 SUSPECTED, décision simulée relue au second passage. Base partagée non accessible. Voir docs/tests/2026-11-17-3.11-integration-eugenia.md. |
| 3.12 | Peer review du soir | Tous | à faire |  |

## Phase 4. Mercredi : le rendu de 17 h et la boucle sur plusieurs écrans

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 4.1 | Parcours utilisateur (maquette des 7 écrans dans l'ordre d'usage) | Axil | à faire |  |
| 4.2 | Architecture (schéma simple : vault, Hugging Face, agent H, Holo, calcul, base, interface, n8n) | Ali | codé non testé | Schéma Mermaid, pôles, C1–C8 et limites dans le README ; [PR #16 fusionnée](https://github.com/Hisseiny/Horama-/pull/16), [preuve](tests/2026-11-17-readme-architecture.md). Jonction scène/coureur par appel direct documentée dans la [PR #17 fusionnée](https://github.com/Hisseiny/Horama-/pull/17). validation par une autre personne à attester. |
| 4.3 | Loom de 2 minutes : problème, solution, avancement montré avec la vraie boucle de mardi | Noé | à faire |  |
| 4.4 | Roadmap jusqu'à jeudi (tirée de ce plan) | Noé | à faire |  |
| 4.5 | Dépôt du rendu de mercredi | Noé | à faire |  |
| 4.6 | Règle entre deux écrans prouvée par le calcul (le CA du tableau de bord égale le total de la liste) | Leslie, Ali | fait | Règle `egalite` : passage H réel `2026-11-17-13h14-6321` sur Facturo v13, `VERIFIED_FAIL`, « 1 240,00 ≠ 1 420,00, écart 180,00 » (`docs/tests/2026-11-17-c4-coureur.md`) |
| 4.7 | Passage de plusieurs tests (3 en parallèle au plus) et rapport de passage (C6), écrit aussi dans le vault | Ali | codé non testé | A5/A6/A7 : [PR #14 fusionnée](https://github.com/Hisseiny/Horama-/pull/14), référence v12 réelle (3 captures, sans promotion automatique), cinq passages Facturo v13 en ligne (20 captures), 17 tests terminés, six C6/Markdown avec replays HTTP 200 ; médiane v13 66,517 s C6 / 67,786 s commande complète. Trois tests chaînés par v13, pas de parallélisme ni de gel observé. [Preuve et comptes REST](tests/2026-11-17-a7-facturo-en-ligne.md). C4 ajouté ensuite par la [PR #18 fusionnée](https://github.com/Hisseiny/Horama-/pull/18) : Facturo réel `VERIFIED_FAIL` calculé, résultats transmis au Markdown ; ne pas attribuer ces verdicts aux anciens A7. Validation humaine des références et de la porte non attestée par ces mesures. validation par une autre personne à attester. |
| 4.8 | Écran 11.6 : file de relecture, « C'est un bug » ou « C'est voulu » (C5) | Axil | à faire |  |
| 4.9 | Mémoire limitée à un écart, référence mise à jour seulement quand tout est tranché, retest | Inès | à faire |  |
| 4.10 | Faux SaaS en deux versions (12 et 13) et régressions activables selon la liste du banc | Nathan | à faire |  |
| 4.11 | Deck de vendredi : plan des 8 à 12 slides dans l'ordre imposé (problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run) | Noé, Axil | à faire |  |
| 4.12 | Premier passage du banc : rappel et précision bruts | Inès | à faire |  |
| 4.13 | Peer review du soir | Tous | à faire |  |

## Phase 5. Jeudi : le P0 complet, mesuré, répété, gelé

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 5.1 | Écran 11.5 : comparaison des versions, côte à côte, rideau, pixels bruts ; zones d'écart entourées | Axil (écran), Leslie (zones), Nathan (script de différence de pixels) | en cours | Leslie (zones) : fait, `comparerImages` et un seul constat pour un élément déplacé (`jugement/verification/`, voir `jugement/README.md`) ; reste l'écran (Axil) |
| 5.2 | Dérive documentaire : un « voulu » qui contredit une note propose la correction (écran 11.7) ; Accepter modifie la note dans le vault | Inès (logique), Leslie (rédaction de la correction), Axil (écran) | en cours | Leslie : rédaction faite, `proposerCorrection` dans `jugement/correction/` (PR #11, #20) ; mesure réelle 11, 14, 14 puis 15 sur 15 après corrections (`docs/tests/2026-11-17-correction.md`) ; branchée dans la scène par Nathan (PR #28, `automatisation/scene/README.md`) : avant / après, « Accepter » ou « Refuser » ; passage réel de la scène avec correction : à mesurer |
| #36.2 | PR documentaire après acceptation d'une correction de note (temps 6) | Ali | codé non testé | `automatisation/pr-doc/` : texte et commandes vérifiés hors réseau, vrais commits/poussées vers un dépôt nu local ; [preuve et limites](tests/2026-11-17-pr-doc.md). Branchement par Nathan et essai GitHub sur un dépôt d'essai à faire ; aucune attestation humaine. |
| 5.3 | Vérifier les 8 critères du P0 (cadrage, section 7), `main` gelé | Ali | à faire |  |
| 5.4 | Mesures complètes, comparaisons (pixels, tests écrits à la main, sans et avec mémoire, deux modèles Hugging Face), coût et durée d'un passage, graphiques du deck | Inès | à faire |  |
| 5.5 | Retour écrit du pilote : utiliserait-il Horama, paierait-il, combien, que manque-t-il ; point business de l'après-midi | Noé | à faire |  |
| 5.6 | État de départ de la démo écrit (comptes connectés, fenêtres, zoom, étiquette Git jouée) | Ali, Noé | à faire |  |
| 5.7 | Vidéo de secours par étape de la chorégraphie (cadrage, section 14.2) | Nathan, Noé | à faire |  |
| 5.8 | 5 répétitions chronométrées depuis l'état de départ | Noé (parle), Ali (pilote la démo), tous | à faire |  |
| 5.9 | Gel du soir : étiquette `demo-ok-jeudi` ; ensuite, seules les corrections de bug critiques, fusionnées par Ali | Ali | à faire |  |
| 5.10 | README et « comment tester » en brouillon (trois façons de voir Horama, et le faux SaaS pour un développeur) | Ali | codé non testé | README et guide d'exécution livrés dans la [PR #16 fusionnée](https://github.com/Hisseiny/Horama-/pull/16) ; commandes vérifiées, [preuve](tests/2026-11-17-readme-architecture.md). Correction du README agent sur le partage incluse dans la [PR #26](https://github.com/Hisseiny/Horama-/pull/26) en relecture. validation par une autre personne à attester. |
| 5.11 | Peer review du soir | Tous | à faire |  |

## Phase 6. Vendredi : les livrables et le pitch

| N° | Tâche | Qui | État | Preuve |
|---|---|---|---|---|
| 6.1 | Dernière répétition ; le passage complet est lancé avec la clé de démo 10 minutes avant chaque présentation | Ali, Noé | à faire |  |
| 6.2 | Vidéo de démo de 5 minutes | Noé, Nathan | à faire |  |
| 6.3 | Fiche projet et README finaux, lien du prototype, « comment tester », dépôt H cité (licence MIT) | Ali | en cours | Partie README/architecture et « comment tester » livrée : [PR #16 fusionnée](https://github.com/Hisseiny/Horama-/pull/16), [preuve](tests/2026-11-17-readme-architecture.md). Fiche projet finale et contrôle des livrables du vendredi non attestés par cette PR ; ne pas considérer le ticket complet comme terminé. |
| 6.4 | Contrôle de tous les liens en fenêtre privée, sans être connecté | Nathan | à faire |  |
| 6.5 | `docs/retours-api-h.md` complété (c'est un livrable) | Ali, Nathan | en cours | Retours Ali complétés par A6 et cinq A7 sur Facturo en ligne, base partagée, coûts et replays HTTP 200 ; limites explicites. Relecture Nathan/humaine restante. [Retours API](retours-api-h.md), [preuve en ligne](tests/2026-11-17-a7-facturo-en-ligne.md). |
| 6.6 | Dépôt des livrables du matin | Noé | à faire |  |
| 6.7 | Deck final de 8 à 12 slides, chiffres du banc et retour du pilote compris | Noé (contenu), Axil (design) | à faire |  |
| 6.8 | Pitch du top 6 : Noé parle, Ali pilote la démo ; questions du jury réparties (technique Ali, IA Leslie, données Inès, business Noé) | Noé, Ali | à faire |  |
| 6.9 | Post LinkedIn du concours (à partir de vendredi 14 h), seulement avec l'accord écrit du pilote | Noé ou Nathan | à faire |  |
