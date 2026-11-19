# AGENTS.md : règles pour toutes les IA qui travaillent sur Horama

Tu travailles pour une personne de l'équipe 11 du hackathon Eugenia « Build The Future » (16-20 novembre 2026). Six personnes codent en parallèle, chacune avec une IA différente. Ces règles sont les mêmes pour toutes les IA. Elles priment sur tes habitudes.

## Le projet en trois lignes

Horama transforme la documentation d'une équipe produit (un vault Obsidian : écrans, règles métier, notes de version) en tests au format de la démo QA de H Company. Un humain valide chaque test, l'agent H (Agents API) le joue sur un vrai logiciel, le code vérifie les valeurs relevées par le calcul, et chaque décision humaine met à jour le vault.

Avant de coder, lis :
- `docs/cadrage.md` (le produit, les fonctionnalités F1 à F39, les écrans, les contrats) ;
- `docs/plan-de-travail.md` (qui fait quoi, dans quel ordre) ;
- la fiche de mission de la personne pour qui tu travailles, dans `docs/missions/` ;
- les contrats que tu produis ou consommes, dans `contrats/`.

## Langues

- Documentation, messages de commit, descriptions de pull request : en français.
- Code, noms de variables, de fonctions et de fichiers de code : en anglais.

## Tu ne modifies que ton dossier

| Dossier | Propriétaire |
|---|---|
| Racine, `contrats/`, `agent/` | Ali (CTO) |
| `jugement/` | Leslie (CAIO) |
| `vault-horama/`, `banc/`, `base/` | Inès (CDO) |
| `interface/` | Axil (CPO) |
| `automatisation/`, `faux-saas/`, `extension/` | Nathan (CAO) |
| `pitch/` | Noé (CEO) |
| `docs/` | Tous (une décision = un fichier daté dans `docs/decisions/`) |

- Ne crée, ne modifie et ne supprime aucun fichier hors du dossier de la personne pour qui tu travailles, sauf sa ligne dans `docs/checklist.md` et un fichier de `docs/decisions/` ou `docs/tests/`.
- Si tu as besoin d'un changement ailleurs, arrête-toi et écris la demande dans la description de la pull request.
- `banc/` contient des cas cachés : ne le lis pas si tu travailles pour Ali ou Leslie.

## Les contrats sont gelés

- Les formats échangés entre pôles sont dans `contrats/` (exemples dans `contrats/exemples/`). Ils sont gelés depuis l'étiquette Git `contrats-v1`.
- N'ajoute, ne renomme, ne supprime et ne change le type d'aucun champ. S'il manque quelque chose, arrête-toi et signale-le à la personne : la modification passe par une pull request approuvée par le gardien du contrat.
- Tant qu'une brique d'un autre pôle n'est pas prête, code contre sa version factice (`USE_MOCKS=1`), jamais contre une copie que tu aurais réécrite.

## Commandes

Le [README](README.md#comment-lancer) présente l’architecture, le lancement factice et les prérequis d’un passage réel.

- Installer : `pnpm install`
- Lancer en local : `pnpm dev` (mode factice `USE_MOCKS=1`, interface sur http://localhost:3000 et faux SaaS sur http://localhost:3100 ; ne lance pas l'agent H ; shell POSIX).
- Tout vérifier avant une pull request : `pnpm -r check` (lint statique du pôle Ali, types et tests des paquets). Elle doit passer. Le check d’`agent/` lance son lint une seule fois ; `pnpm lint` à la racine délègue à ce même lint, qui vérifie les déclarations et paramètres inutilisés, le code inaccessible et les labels inutilisés avec TypeScript, sans dépendance supplémentaire.

## Git

- Ne pousse jamais sur `main`, ne force jamais une poussée, ne réécris jamais l'historique partagé.
- Une branche par ticket, depuis `dev` à jour, nommée par le numéro du plan : `3.4-orchestrateur`. Les pull requests vont vers `dev`.
- Une pull request par ticket. Sa description dit : ce qui est fait, comment c'est testé, ce qui ne l'est pas. Elle met à jour la ligne du ticket dans `docs/checklist.md`.
- Avant d'ouvrir la pull request : récupère `dev` dans ta branche et relance la vérification.
- Une nouvelle dépendance se signale dans la description de la pull request, avec la raison. N'en ajoute pas pour une chose que quelques lignes font.

## Secrets

- Les clés vivent dans `.env.local`, jamais dans le code, jamais dans un commit, jamais affichées. `.env.example` liste les noms des variables, sans valeur.
- N'utilise jamais `HAI_API_KEY_DEMO` (clé réservée à la démo) pendant le développement.
- Les identifiants du compte de test du pilote ne vont ni dans le repo, ni dans le vault.

## Données et mesures

- N'invente jamais un chiffre, une mesure, un résultat de test ou une citation. Une valeur inconnue s'écrit « à mesurer ».
- `SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites.
- Un résultat de test va dans `docs/tests/AAAA-MM-JJ.md` avec ce qui a été lancé et ce qui en est sorti.

## Style de code

- Le minimum de code qui fait la tâche. Pas d'abstraction pour un usage unique, pas de fonctionnalité au-delà du ticket.
- Pas de gestion d'erreur pour des cas impossibles, mais toujours un repli visible pour un appel réseau qui échoue (statut `INCONCLUSIVE`, message clair).
- Suis le style du code déjà présent dans le dossier.

## Ce qu'on sait déjà de l'API H (mesuré les 7 et 8 novembre)

- 3 sessions simultanées par organisation en offre gratuite ; au-delà, la session attend sans erreur : passer `queue: false` pour échouer tout de suite.
- Des sessions restent figées à la première étape et la suppression est sans effet : abandonner une session sans réponse après 45 s, relancer une fois, puis statut `INCONCLUSIVE`.
- Compter 8 à 10 s par étape de l'agent.
- Après le résultat d'un outil personnalisé, l'agent ne reçoit pas de nouvelle capture : lui demander de regarder la page (`wait_web`).
- Il n'existe pas d'action « capture d'écran » ; pas de captcha géré.
- `answer_format` (JSON Schema) impose le format de la réponse finale ; une réponse non conforme fait échouer la session.
- Suivi d'une session : `GET /sessions/{id}/changes?from_index=N&wait_for_seconds=20` ; une réponse 204 veut dire « rien de neuf » ; la réponse finale peut arriver après l'état terminal.
- Chrome local sur écran Retina : lancer avec `--force-device-scale-factor=1`, sinon les clics tombent à côté.
- Documentation : https://hub.hcompany.ai ; démo QA de référence (licence MIT, à citer) : https://github.com/hcompai/agents-api-demos (`examples/software_qa`).
