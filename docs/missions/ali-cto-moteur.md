# Mission : Ali, CTO, pôle A (Moteur)

**Ta mission en une phrase.** Faire jouer par l'agent H, de façon fiable, chaque test accepté sur le SaaS cible, et faire circuler les résultats entre les pôles ; tu tiens aussi le repo et l'intégration.

**Tes dossiers.** Racine du repo, `contrats/` (gardien), `agent/`. Nathan contribue à `agent/` par pull request que tu relis.

**Ce que tu reçois.**
- Les tests acceptés (C2), écrits par Inès dans `vault-horama/…/tests/`.
- La fonction de vérification de Leslie (relevé, calcul, statut), qui rend un résultat C4.

**Ce que tu donnes.**
- Les événements du fil (C3) en base, pour l'écran 11.3 d'Axil.
- Le rapport de passage (C6), pour Axil, Inès et Nathan.
- La notification (C7) vers le webhook n8n de Nathan.
- Les lignes de mesure (C8) pour Inès.

**Tes tâches, dans l'ordre** (numéros du plan de travail).

| N° | Tâche | Fini quand |
|---|---|---|
| 1.1 | Trancher D1 (langage) et D3 (où tourne la démo) | Deux fichiers dans `docs/decisions/` |
| 1.3 | Protéger `main`, étiquettes A à F, tableau Projects, une issue par tâche | Poussée directe sur `main` refusée |
| 1.4 | Squelette du code, commandes `dev` et `check`, compléter la section Commandes d'`AGENTS.md` | Une autre personne clone et `check` passe |
| 1.7 | Brouillon des contrats C1 à C8, avec Leslie et Inès | 8 exemples dans `contrats/exemples/` |
| 1.8 | Preuve 1 : l'agent H atteint 2 écrans | Replay noté dans `docs/tests/` |
| 1.14 | Ouvrir `docs/retours-api-h.md` | Première entrée datée |
| 2.2 | Geler les contrats à 10 h | Étiquette `contrats-v1` |
| 2.3 | Versions factices du fil et du rapport | `USE_MOCKS=1` nourrit les écrans |
| 2.5, 3.7 | Points techniques H (11 h, 15 h) avec Nathan | Réponses écrites |
| 2.6 | Bascule pilote à 12 h, avec Noé | Décision écrite |
| 3.4 | Orchestrateur : une session par test, fil en base, replay, abandon à 45 s et une relance | Un test joué, étapes en base |
| 3.11 | Intégration de la boucle sur 1 écran, `main` gelé | 3 passages de suite, étiquette `demo-ok-mardi` |
| 4.2 | Schéma d'architecture du rendu de mercredi | `docs/architecture.png` |
| 4.6 | Règle entre deux écrans (navigation), avec Leslie | « Défaut prouvé » 3 fois sur 3 |
| 4.7 | Passage de plusieurs tests (3 en parallèle au plus), rapport C6 | Passage complet visible |
| 5.3 | Vérifier les 8 critères du P0, `main` gelé | Tableau des critères avec preuves |
| 5.6, 5.8 | État de départ de la démo, répétitions (tu pilotes la démo) | Médiane du test en direct sous 90 s |
| 5.9 | Gel du jeudi soir | Étiquette `demo-ok-jeudi` |
| 5.10, 6.3 | README, fiche projet, « comment tester », dépôt H cité | Une personne hors pôle A suit le README sans aide |
| 6.1, 6.8 | Passage lancé 10 min avant ; démo pilotée au pitch, questions techniques | |

**Ce que tu ne fais pas.** Écrire les consignes de génération des tests (Leslie) ; lire `banc/` (cas cachés, garde-fou de mesure) ; utiliser la clé de démo pour les essais.

**À savoir.** Tu es sur le chemin critique : si une tâche glisse, dis-le au point suivant, Nathan est ton premier renfort. Les pièges mesurés de l'API H sont dans `AGENTS.md`.

**Ton premier message à ton IA** (à adapter avec le numéro de la tâche) :

```
Tu es mon assistant de code pour le projet Horama (hackathon). Je suis Ali, CTO, responsable du pôle A (Moteur) : agent H, orchestrateur, intégration.
Lis d'abord AGENTS.md, puis docs/missions/ali-cto-moteur.md, puis docs/cadrage.md sections 12 et 19, puis les contrats C2, C3, C4, C6, C7, C8 dans contrats/.
Tu ne modifies que la racine, contrats/ et agent/. Tu ne changes aucun contrat gelé. Une tâche à la fois.
Ma tâche maintenant : [numéro et titre]. Avant de coder, redis-moi en 5 lignes ce que tu vas faire, les fichiers que tu vas créer ou modifier, et comment on vérifiera que c'est fini.
```
