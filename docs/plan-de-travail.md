# Horama : plan de travail de l'équipe

Du lundi 16 au vendredi 20 novembre. Équipe 11. Document de pilotage : qui fait quoi, dans quel ordre, et comment six personnes avec six IA différentes livrent un seul produit.

À lire avec `cadrage-horama.pdf` (le quoi) ; ce document donne le comment et le quand. Repo : https://github.com/Hisseiny/Horama-

**Les trois règles qui évitent qu'on se marche dessus.**

1. **Un dossier, un propriétaire.** Personne n'écrit dans le dossier d'un autre, ni lui, ni son IA.
2. **Les contrats d'abord.** Les formats échangés entre pôles sont gelés mardi 10 h ; chacun code contre une version factice en attendant le vrai.
3. **Un ticket, une branche, une pull request**, relue par une autre personne. Personne ne pousse sur `main`.

---

## 1. Qui fait quoi

| Personne | Rôle officiel | Pôle | Dossiers à lui ou à elle | Ce qu'il ou elle livre au jury |
|---|---|---|---|---|
| Noé | CEO | F. Business, pilote et pitch | `pitch/`, `docs/plan-de-travail.md` | Rendus de lundi et mercredi, Loom, chiffres et retour du pilote, go-to-market, deck de vendredi, pitch |
| Ali | CTO | A. Moteur | `agent/`, `contrats/`, fichiers de la racine | Agent H, orchestrateur, fil en direct, architecture, README et « comment tester » |
| Leslie | CAIO | B. Écriture et vérification | `jugement/` | Tests écrits par Hugging Face, questions d'ambiguïté, relevés, calcul, 4 statuts, comparaison des modèles |
| Inès | CDO | C. Vault et mesures | `vault-horama/`, `banc/`, `base/` | Vault, mémoire, dérive documentaire, base de données, banc de régressions, chiffres du deck |
| Nathan | CAO | E. Automatisation, renfort A et B | `automatisation/`, `faux-saas/` | Workflow n8n, faux SaaS de démonstration, renfort sur l'API H et Holo, vidéos de secours |
| Axil | CPO | D. Interface et design | `interface/` | Les 7 écrans, parcours utilisateur de mercredi, direction artistique, design du deck |

Les dossiers `docs/` et `docs/checklist.md` sont communs : chacun met à jour ses propres lignes.

---

## 2. Comment travailler à six, avec six IA différentes

Chacun code avec l'IA de son choix (Claude, ChatGPT, Cursor, Codex, Gemini, Devin…). Le risque : six styles, six langages, six façons de nommer les mêmes choses, et du code qui ne s'emboîte pas. La parade tient en cinq dispositifs.

### 2.1 Les mêmes règles pour toutes les IA : `AGENTS.md`

Un fichier `AGENTS.md` à la racine du repo donne à toutes les IA les mêmes règles : langage, commandes, dossiers, contrats, interdits, pièges de l'API H. Il est lu tel quel par la plupart des agents de code (Codex, Cursor, GitHub Copilot) ; `CLAUDE.md` l'importe pour Claude Code ; `GEMINI.md` en est un lien pour Gemini CLI.

Une IA de discussion sans accès au repo (ChatGPT ou Claude dans le navigateur) reçoit au début de chaque conversation : `AGENTS.md`, la fiche de mission de la personne (`docs/missions/`), et les contrats qu'elle utilise. Le code qu'elle produit passe ensuite par la même branche et la même pull request que les autres.

### 2.2 Un dossier, un propriétaire

| Dossier ou fichier | Propriétaire | Qui d'autre y touche |
|---|---|---|
| Racine (`package.json`, configuration, `AGENTS.md`) | Ali | Par pull request relue par Ali |
| `contrats/` | Ali, gardien | Modification après le gel : pull request approuvée par le producteur et les consommateurs du format |
| `agent/` | Ali | Nathan, par pull request relue par Ali |
| `jugement/` | Leslie | Nathan, par pull request relue par Leslie |
| `vault-horama/`, `banc/`, `base/` | Inès | Personne d'autre n'écrit dans `banc/` (garde-fou de mesure) |
| `interface/` | Axil | Les autres proposent par pull request relue par Axil |
| `automatisation/`, `faux-saas/` | Nathan | |
| `pitch/` | Noé | Axil pour le design du deck |
| `docs/` | Tous | Une décision = un fichier daté dans `docs/decisions/` |

Une IA qui « a besoin » de modifier un fichier hors de son dossier s'arrête et l'écrit dans la description de sa pull request. Le propriétaire fait la modification ou l'accepte.

### 2.3 Les contrats : les formats échangés entre pôles

Ils vivent dans `contrats/` : un exemple JSON par format (`contrats/exemples/`) et sa définition (types TypeScript ou JSON Schema selon la décision D1). Brouillon lundi soir, gel mardi 10 h, étiquette Git `contrats-v1`. Les trois premiers sont déjà écrits dans le cadrage, section 12.4.

| N° | Format | Produit par | Utilisé par | Gardien |
|---|---|---|---|---|
| C1 | Test proposé (JSON) | B | D (écran 11.2), C | Leslie |
| C2 | Test accepté (Markdown au format H, avec en-tête) | C (écrit dans le vault) | A | Inès |
| C3 | Événement du fil (passage, test, heure, étape, action, capture, état de la session) | A | D (écran 11.3) | Ali |
| C4 | Résultat de vérification (JSON, 4 statuts) | B, appelé par A | D, C, E | Leslie |
| C5 | Décision humaine et correction de note (JSON) | D | C | Inès |
| C6 | Rapport de passage (version, tests, statuts, durée, coût, replays) | A | D, C, E | Ali |
| C7 | Notification vers n8n (ce qui part au webhook) | A | E | Nathan |
| C8 | Ligne de mesure (une ligne par test joué) | A et B | C | Inès |

Après le gel, on n'ajoute ni ne renomme aucun champ sans pull request approuvée. Une IA ne « complète » jamais un format de sa propre initiative : c'est la première cause de code qui ne s'emboîte pas.

### 2.4 Les versions factices

Chaque producteur livre, dès que le contrat est gelé, une version factice de sa brique qui renvoie un exemple au bon format (variable `USE_MOCKS=1`). Le consommateur code contre elle et branche le vrai plus tard. Axil peut construire tous les écrans sans attendre l'agent ; Ali peut tester l'orchestrateur sans attendre Hugging Face.

### 2.5 Le circuit d'un ticket

1. Le ticket existe dans GitHub Issues, avec le numéro de ce plan dans son titre (« 3.4 Orchestrateur : un test, une session ») et son étiquette de pôle (A à F).
2. Branche depuis `main` à jour : `3.4-orchestrateur`.
3. Une session d'IA par ticket, dans son propre dossier de travail (un clone ou un worktree). Deux IA ne travaillent jamais dans le même dossier en même temps.
4. Avant la pull request : `main` récupéré dans la branche, `npm run check` (ou l'équivalent fixé en D1) passe.
5. La pull request dit : ce qui a été fait, comment c'est testé, ce qui ne l'est pas. Elle met à jour sa ligne de `docs/checklist.md`.
6. Une autre personne relit. L'auteur fusionne après approbation, sauf pendant un gel (seul Ali fusionne).
7. Une version qui marche reçoit une étiquette Git (`demo-ok-mardi`, `demo-ok-jeudi`) : on peut toujours y revenir.

**Le gel de `main`.** Pendant le test réel d'une pièce critique (boucle de mardi soir, critères de jeudi), Ali annonce le gel : personne ne fusionne. Au hackathon du 7 novembre, quatre reprises de conflits en deux heures venaient de fusions faites pendant le test de l'agent.

### 2.6 Le tableau d'avancement : `docs/checklist.md`

Une ligne par tâche de ce plan : numéro, tâche, responsable, état, preuve (lien de pull request, de replay ou de résultat de test). Cinq états seulement : **à faire**, **en cours**, **codé non testé**, **testé**, **bloqué**. « Testé » veut dire qu'une autre personne a vu marcher la chose, avec une preuve. C'est le seul endroit où l'on regarde « où on en est » : au hackathon du 7 novembre, c'est ce tableau, et pas les messages, qui a permis de savoir si l'équipe avançait.

### 2.7 Les clés et les secrets

- Chacun garde ses clés dans `.env.local` sur sa machine. Le repo contient seulement `.env.example` (les noms des variables, sans valeur).
- Jamais une clé dans le repo, dans un message d'équipe, ni collée dans une IA de discussion.
- Clés H : chaque personne des pôles A et B (Ali, Leslie, Nathan) a sa propre clé et donc sa propre limite de 3 sessions simultanées. **Une clé à part est réservée à la démo** et n'est utilisée par personne d'autre : une session figée pendant les essais peut bloquer une place pendant des heures (mesuré le 8 novembre).
- Les comptes de test du pilote ne vont ni dans le repo, ni dans le vault : dans `.env.local` seulement.

### 2.8 Les rendez-vous

- **9 h 30, 14 h, 17 h** : point de 10 minutes. Chacun dit : ce qui est testé depuis le dernier point, ce qui bloque, ce qu'il fait ensuite. Le tableau d'avancement est à jour avant le point.
- **Un blocage de plus de 30 minutes** se dit tout de suite dans le canal de l'équipe.
- **Peer review** chaque soir entre 17 h et 9 h, tout le monde.
- **Points H** mardi 11 h et 15 h (Ali et Nathan), avec le bug exact, ce qu'on a testé et une capture.
- **Point business** mercredi et jeudi après-midi (Noé).

---

## 3. Les décisions à prendre avant la première ligne de code

À trancher ce soir, chacune écrite dans `docs/decisions/` (une phrase de décision, une phrase de pourquoi). Sans elles, chaque IA choisira son langage et sa base.

| N° | Décision | Ma recommandation | Alternative | Qui tranche, quand |
|---|---|---|---|---|
| D1 | Langage du produit | **TypeScript partout** (Next.js) : le SDK de H existe en npm, Hugging Face et Holo répondent au format OpenAI, un seul langage pour six IA, un seul déploiement. Python seulement pour le notebook de mesures | Orchestrateur en Python (FastAPI) et interface en Next.js : deux langages, deux déploiements, un contrat HTTP de plus | Ali, ce soir |
| D2 | Base de données | **Supabase** : tables, stockage des captures, temps réel pour le fil en direct | Google Sheets : simple pour Pandas, mais ni captures ni temps réel | Inès, ce soir |
| D3 | Où tourne la démo | **En local sur le portable de démo** (l'app écrit directement dans le vault ouvert dans Obsidian), **et sur Vercel en lecture** pour le jury (passages enregistrés) | Tout sur Vercel : le vault doit alors passer par l'API GitHub, la note qui change dans Obsidian devient plus fragile | Ali, ce soir |
| D4 | Le SaaS pilote et ses 3 écrans | Selon la réponse du collègue | | Noé, dès sa réponse |
| D5 | Le faux SaaS de démonstration | **Une brique P0, pas un plan B** (voir ci-dessous). **Décidé le 16/11** | Le garder en plan B, comme dans le cadrage | Tranché le 16/11 (`docs/decisions/2026-11-16-d5-faux-saas.md`) |

**Pourquoi le faux SaaS devient une brique P0 (D5).** Le cadrage demande au pilote une version 13 qui contient un bug, une incohérence entre écrans et un bouton déplacé (section 14.3), plus une dizaine de régressions activables pour le banc (section 15). Une entreprise ne mettra pas de bugs volontaires dans son environnement de test en trois jours. Et le README de vendredi doit permettre à un développeur de tester Horama sans accès au pilote (section 22). Le faux SaaS sert donc dans tous les cas.

Ce que ça donne pour la démo, à dire honnêtement au jury :
- **Sur le vrai SaaS du pilote** : les tests écrits depuis sa vraie documentation, joués pour de vrai par l'agent H. S'ils trouvent un vrai écart, c'est le meilleur moment du pitch ; sinon, ils passent au vert, et c'est la preuve d'usage réel.
- **Sur le faux SaaS** : les régressions placées exprès (bug du filtre, incohérence entre écrans, bouton déplacé), le banc et ses mesures, la dérive documentaire.

---

## 4. La checklist chronologique

Chaque tâche a un numéro (phase.tâche), un responsable, les tâches qui doivent être finies avant, et un critère de fin vérifiable. Une tâche ne démarre pas tant que ce qui est dans « Après » n'est pas fait, sauf si elle peut tourner sur une version factice.

### Phase 0. Lundi, avant 17 h : le rendu de l'idée

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 0.1 | Relire le deck de 5 slides (noms, rôles, slogan) | Tous | | Personne n'a d'objection à 16 h 30 |
| 0.2 | Déposer le rendu (PDF) depuis l'adresse de l'équipe | Noé | 0.1 | Déposé avant 17 h, capture de la confirmation |
| 0.3 | Activer son compte de peer review | Chacun | | Connecté avant 17 h |

### Phase 1. Lundi soir : les fondations

Rien ne se code avant que 1.1 à 1.4 soient faits. Le reste de la phase tourne en parallèle.

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 1.1 | Trancher D1 à D4 (D5 tranchée le 16/11) | Ali, Inès, Noé, l'équipe | | 5 fichiers dans `docs/decisions/` |
| 1.2 | Poser la structure du repo : dossiers, README, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore`, `.env.example`, cadrage et plan dans `docs/`, fiches de mission, tableau d'avancement | Nathan (fichiers prêts), Ali (valide) | | Chacun voit la structure sur GitHub |
| 1.3 | Protéger `main` (pull request et une relecture obligatoires), étiquettes A à F, tableau GitHub Projects, une issue par tâche de ce plan | Ali (administrateur du repo) | 1.2 | Une poussée directe sur `main` est refusée |
| 1.4 | Squelette du code : `package.json`, lint, vérification des types, tests, `npm run dev`, `npm run check`, un dossier par pôle | Ali | 1.1 (D1) | Une autre personne clone, installe, et `npm run check` passe |
| 1.5 | Clés : H (Ali, Leslie, Nathan, plus la clé de démo), Hugging Face (Leslie, coupon de 50 €), projet Vercel (Ali), projet Supabase (Inès), crédits v0 (Axil) | Chacun pour les siennes | | Chacun a obtenu une réponse d'un appel réel, noté dans `docs/tests/` |
| 1.6 | Envoyer au collègue les prérequis du pilote (cadrage, section 17) : environnement de test, compte de test avec données fictives, accord écrit, connexion sans captcha, documentation et notes de version, chiffres | Noé | | Message envoyé, réponse attendue mardi 12 h |
| 1.7 | Brouillon des contrats C1 à C8 avec un exemple factice chacun | Ali (gardien), avec Leslie et Inès | 1.1 | 8 exemples dans `contrats/exemples/` |
| 1.8 | Preuve 1 : l'agent H se connecte au SaaS (pilote si l'accès existe, sinon le faux SaaS ou un site de démonstration) et atteint 2 écrans | Ali, Nathan en renfort | 1.5 | Lien de replay dans `docs/tests/2026-11-16.md` |
| 1.9 | Preuve 2 : un modèle Hugging Face écrit un test au format H à partir de la note d'exemple du cadrage (section 10) ; deux modèles comparés | Leslie | 1.5 | Les deux tests et le temps de réponse dans `docs/tests/` |
| 1.10 | Preuve 3 : Holo (Models API) relève un montant sur une capture | Nathan | 1.5 | Valeur relevée juste sur 3 essais sur 3, notée |
| 1.11 | Vault de départ : structure, 3 notes d'écran, 1 note de règles entre écrans, 1 note de version (factices tant que la doc du pilote n'est pas arrivée) | Inès | 1.2 | Les 5 notes dans `vault-horama/`, lisibles dans Obsidian |
| 1.12 | Maquettes rapides des écrans prioritaires : 11.2 (note vers test), 11.3 (passage en direct), 11.6 (relecture) | Axil | | 3 maquettes dans `interface/maquettes/` |
| 1.13 | Faux SaaS, première version : tableau de bord, liste des factures, détail d'une facture, données fictives, déployé sur Vercel | Nathan | 1.1 (D5) | URL publique, l'agent H peut s'y connecter |
| 1.14 | Ouvrir `docs/retours-api-h.md` (ce qui marche, ce qui casse, ce qui surprend) | Ali | | Fichier créé, première entrée datée |
| 1.15 | Peer review du soir | Tous | | Rempli avant 9 h |

### Phase 2. Mardi matin : contrats gelés, versions factices, points H

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 2.1 | Point de 9 h 30 : état des preuves 1.8 à 1.10, réponse du pilote | Tous | | Tableau d'avancement à jour |
| 2.2 | Gel des contrats C1 à C8 | Ali | 1.7, 2.1 | Étiquette `contrats-v1` à 10 h |
| 2.3 | Versions factices : A (fil et rapport), B (test proposé et verdict), C (vault et base remplis de données factices) | Ali, Leslie, Inès | 2.2 | `USE_MOCKS=1` fait tourner les écrans sans agent ni modèle |
| 2.4 | Tables Supabase et stockage des captures, selon C3, C4, C6, C8 | Inès | 2.2 | Migration dans `base/`, tables visibles |
| 2.5 | Point technique H (11 h) : questions du cadrage section 18, bugs de la veille avec capture | Ali, Nathan | 1.8 | Réponses écrites dans `docs/retours-api-h.md` |
| 2.6 | Bascule pilote : sans environnement de test, compte et accord écrit à 12 h, la démo principale part sur le faux SaaS, le vrai SaaS reste en lecture | Noé, Ali | 1.6 | Décision écrite dans `docs/decisions/` |
| 2.7 | Essai de Vercel eve, 30 minutes au plus, verdict écrit ; sans évidence en 30 minutes, on ne l'adopte pas | Nathan | 2.5 | Verdict d'une ligne dans `docs/decisions/` |

### Phase 3. Mardi après-midi et soir : la première boucle sur un écran

But du jour : une note devient un test accepté, joué par l'agent H, vérifié, et affiché. Un seul écran, un seul test, mais de bout en bout.

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 3.1 | Génération : une note du vault devient un test proposé (C1) avec ses questions d'ambiguïté | Leslie | 2.2, 1.11 | 3 notes, 3 tests proposés au format C1 |
| 3.2 | Écran 11.2 : note à gauche, test à droite, règle surlignée, Accepter, Modifier, Refuser | Axil | 2.3 | Marche sur la version factice, puis sur 3.1 |
| 3.3 | Écriture du test accepté dans `vault-horama/…/tests/` (C2) | Inès | 2.2 | Un clic sur Accepter crée le fichier |
| 3.4 | Orchestrateur : une session H par test accepté, événements du fil (C3) en base, lien de replay, abandon d'une session muette après 45 s et une relance | Ali | 2.2, 1.8 | Un test joué, ses étapes en base |
| 3.5 | Vérification : relevé des valeurs, calcul, statut (C4) pour une règle d'un écran | Leslie, Nathan en renfort | 2.2, 1.10 | Le même relevé donne le même statut 3 fois sur 3 |
| 3.6 | Écran 11.3 : le fil en direct se remplit à partir de la base | Axil | 2.3, 2.4 | Les étapes arrivent au rythme de l'agent |
| 3.7 | Point technique H (15 h) : ce qui bloque 3.4 et 3.5 | Ali, Nathan | 3.4 | Réponses dans `docs/retours-api-h.md` |
| 3.8 | Workflow n8n : « cas à relire » (C7) devient une notification, et une ligne de mesure part en base | Nathan | 2.2 | Une notification reçue sur un vrai passage |
| 3.9 | Banc : liste d'environ 10 régressions (dont 3 entre écrans) et 5 changements voulus (dont 2 contredisent la doc), vérité écrite à l'avance, cas gardés cachés jusqu'à la mesure | Inès | 1.13 | `banc/cas.md` ; les cas cachés ne sont pas montrés à Ali ni à Leslie |
| 3.10 | Chiffres du pilote (temps de recette, bugs arrivés chez des clients), sa documentation transmise à Inès, premier jet du go-to-market | Noé | 1.6 | Chiffres sourcés dans `pitch/chiffres.md` |
| 3.11 | Intégration : la boucle complète sur 1 écran, sans toucher au code entre deux passages ; `main` gelé pendant le test | Ali | 3.1 à 3.6 | 3 passages de suite, étiquette `demo-ok-mardi`, résultat dans `docs/tests/2026-11-17.md` |
| 3.12 | Peer review du soir | Tous | | Rempli avant 9 h |

### Phase 4. Mercredi : le rendu de 17 h et la boucle sur plusieurs écrans

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 4.1 | Parcours utilisateur (maquette des 7 écrans dans l'ordre d'usage) | Axil | 1.12 | Fichier ou lien dans `pitch/rendu-mercredi/` |
| 4.2 | Architecture (schéma simple : vault, Hugging Face, agent H, Holo, calcul, base, interface, n8n) | Ali | 3.11 | Image dans `docs/architecture.png` |
| 4.3 | Loom de 2 minutes : problème, solution, avancement montré avec la vraie boucle de mardi | Noé | 3.11 | Lien testé en fenêtre privée |
| 4.4 | Roadmap jusqu'à jeudi (tirée de ce plan) | Noé | | Dans `pitch/rendu-mercredi/` |
| 4.5 | Dépôt du rendu de mercredi | Noé | 4.1 à 4.4 | Déposé avant 17 h |
| 4.6 | Règle entre deux écrans prouvée par le calcul (le CA du tableau de bord égale le total de la liste) | Leslie, Ali | 3.11 | « Défaut prouvé » sur la régression du faux SaaS, 3 fois sur 3 |
| 4.7 | Passage de plusieurs tests (3 en parallèle au plus) et rapport de passage (C6), écrit aussi dans le vault | Ali | 3.11 | Un passage complet sur les 3 écrans, rapport visible |
| 4.8 | Écran 11.6 : file de relecture, « C'est un bug » ou « C'est voulu » (C5) | Axil | 2.3 | Une décision crée son fichier dans `decisions/` |
| 4.9 | Mémoire limitée à un écart, référence mise à jour seulement quand tout est tranché, retest | Inès | 4.8 | L'écart validé ne revient pas ; une régression sur le même écran reste vue |
| 4.10 | Faux SaaS en deux versions (12 et 13) et régressions activables selon la liste du banc | Nathan | 3.9 | Chaque régression s'active par un paramètre |
| 4.11 | Deck de vendredi : plan des 8 à 12 slides dans l'ordre imposé (problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run) | Noé, Axil | | Squelette dans `pitch/deck/` |
| 4.12 | Premier passage du banc : rappel et précision bruts | Inès | 4.7, 4.10 | Premiers chiffres dans `banc/resultats/` |
| 4.13 | Peer review du soir | Tous | | Rempli avant 9 h |

### Phase 5. Jeudi : le P0 complet, mesuré, répété, gelé

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 5.1 | Écran 11.5 : comparaison des versions, côte à côte, rideau, pixels bruts ; zones d'écart entourées | Axil (écran), Leslie (zones), Nathan (script de différence de pixels) | 4.7 | Les trois vues marchent sur un vrai passage |
| 5.2 | Dérive documentaire : un « voulu » qui contredit une note propose la correction (écran 11.7) ; Accepter modifie la note dans le vault | Inès (logique), Leslie (rédaction de la correction), Axil (écran) | 4.8, 4.9 | La note change dans Obsidian, 3 cas sur 3 |
| 5.3 | Vérifier les 8 critères du P0 (cadrage, section 7), `main` gelé | Ali | 5.1, 5.2 | Tableau des critères rempli avec preuves dans `docs/tests/2026-11-19.md` |
| 5.4 | Mesures complètes, comparaisons (pixels, tests écrits à la main, sans et avec mémoire, deux modèles Hugging Face), coût et durée d'un passage, graphiques du deck | Inès | 4.12 | Notebook et graphiques dans `banc/` |
| 5.5 | Retour écrit du pilote : utiliserait-il Horama, paierait-il, combien, que manque-t-il ; point business de l'après-midi | Noé | un passage montré au pilote | Réponse écrite dans `pitch/pilote.md` |
| 5.6 | État de départ de la démo écrit (comptes connectés, fenêtres, zoom, étiquette Git jouée) | Ali, Noé | 5.3 | `docs/demo/etat-de-depart.md` |
| 5.7 | Vidéo de secours par étape de la chorégraphie (cadrage, section 14.2) | Nathan, Noé | 5.3 | Un fichier par chapitre, rangé et nommé |
| 5.8 | 5 répétitions chronométrées depuis l'état de départ | Noé (parle), Ali (pilote la démo), tous | 5.6 | Le test en direct dure moins de 90 s en médiane |
| 5.9 | Gel du soir : étiquette `demo-ok-jeudi` ; ensuite, seules les corrections de bug critiques, fusionnées par Ali | Ali | 5.8 | Étiquette posée, annoncée à l'équipe |
| 5.10 | README et « comment tester » en brouillon (trois façons de voir Horama, et le faux SaaS pour un développeur) | Ali | 5.3 | Une personne extérieure au pôle A suit le README sans aide |
| 5.11 | Peer review du soir | Tous | | Rempli avant 9 h |

### Phase 6. Vendredi : les livrables et le pitch

| N° | Tâche | Qui | Après | Fini quand |
|---|---|---|---|---|
| 6.1 | Dernière répétition ; le passage complet est lancé avec la clé de démo 10 minutes avant chaque présentation | Ali, Noé | 5.9 | Passage terminé avant de commencer |
| 6.2 | Vidéo de démo de 5 minutes | Noé, Nathan | 5.7 | Lien testé en fenêtre privée |
| 6.3 | Fiche projet et README finaux, lien du prototype, « comment tester », dépôt H cité (licence MIT) | Ali | 5.10 | Relu par Noé |
| 6.4 | Contrôle de tous les liens en fenêtre privée, sans être connecté | Nathan | 6.2, 6.3 | Liste cochée dans `docs/demo/liens.md` |
| 6.5 | `docs/retours-api-h.md` complété (c'est un livrable) | Ali, Nathan | | Relu |
| 6.6 | Dépôt des livrables du matin | Noé | 6.1 à 6.5 | Avant 11 h |
| 6.7 | Deck final de 8 à 12 slides, chiffres du banc et retour du pilote compris | Noé (contenu), Axil (design) | 5.4, 5.5 | Déposé avant 15 h |
| 6.8 | Pitch du top 6 : Noé parle, Ali pilote la démo ; questions du jury réparties (technique Ali, IA Leslie, données Inès, business Noé) | Noé, Ali | 6.7 | |
| 6.9 | Post LinkedIn du concours (à partir de vendredi 14 h), seulement avec l'accord écrit du pilote | Noé ou Nathan | accord du pilote | |

---

## 5. Le chemin critique et les points de bascule

**Le chemin critique** (un retard ici retarde tout le monde) : clés (1.5), puis l'agent atteint deux écrans (1.8), puis les contrats gelés (2.2), puis l'orchestrateur (3.4), puis la boucle de mardi (3.11), puis plusieurs écrans (4.6, 4.7), puis les critères du P0 (5.3), puis les répétitions (5.8). Ali porte ce chemin ; Nathan est son premier renfort.

Les autres chemins avancent en parallèle sur les versions factices : l'interface (Axil), la génération des tests (Leslie), le vault et le banc (Inès), le pilote et le pitch (Noé), n8n et le faux SaaS (Nathan).

**Les points de bascule, décidés à l'avance** pour ne pas en débattre le jour même :

| Si… | À cette heure | Alors… |
|---|---|---|
| Le pilote n'a pas donné environnement, compte et accord écrit | Mardi 12 h | La démo principale part sur le faux SaaS ; le vrai SaaS est montré en lecture |
| H ne permet pas de récupérer la capture depuis un outil personnalisé | Mardi 12 h (point H) | Les valeurs sont relevées par la réponse structurée de l'agent (format JSON imposé), Holo devient le second lecteur |
| La boucle de mardi (3.11) ne tourne pas | Mercredi 12 h | Tout le P1 est coupé, Nathan et Leslie passent en renfort sur A ; l'écran 11.5 se réduit au côte à côte |
| Moins de 2 tests générés sur 3 sont acceptables | Mercredi 12 h | On change de modèle Hugging Face (une ligne) ; si ça ne suffit pas, gabarit fixe et le modèle remplit les cases |
| Une session H reste figée | Toujours | Abandon après 45 s, une relance, puis « non concluant » ; jamais la clé de démo pour les essais |
| Les critères du P0 ne sont pas tenus | Jeudi 18 h | On ne montre en direct que ce qui passe 3 fois sur 3 ; le reste passe en vidéo, annoncé comme tel |

---

## 6. Ce que chacun fait ce soir (lundi)

| Personne | Ce soir |
|---|---|
| Noé | Dépôt du rendu (0.2), message au collègue pour le pilote (1.6), D4 dès sa réponse |
| Ali | D1 et D3 (1.1), protection de `main` et issues (1.3), squelette du code (1.4), brouillon des contrats (1.7), preuve 1 (1.8) |
| Leslie | Clé et coupon Hugging Face (1.5), preuve 2 avec deux modèles (1.9), relecture des contrats C1 et C4 (1.7) |
| Inès | D2 et projet Supabase (1.1, 1.5), vault de départ (1.11), relecture des contrats C2, C5, C8 (1.7) |
| Nathan | Structure du repo (1.2), preuve 3 avec Holo (1.10), faux SaaS première version (1.13), renfort d'Ali sur 1.8 |
| Axil | Maquettes des écrans 11.2, 11.3, 11.6 (1.12), crédits v0 (1.5) |
| Tous | Peer review avant 9 h (1.15) |

---

## 7. Les documents qui accompagnent ce plan

Dans le dossier `pour-le-repo/`, prêts à être poussés dans le repo :

- `AGENTS.md` : les règles communes à toutes les IA (avec `CLAUDE.md` et `GEMINI.md` qui y renvoient).
- `docs/missions/` : une fiche par personne, à donner telle quelle à son IA en début de conversation.
- `docs/checklist.md` : le tableau d'avancement, une ligne par tâche de ce plan.
