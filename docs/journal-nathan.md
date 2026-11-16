# Journal du couloir Nathan

Orchestrateur : Claude Code (Fable 5.2). Branche : `dev-nathan`. Méthode : `docs/orchestrateurs/methode.md`. Une entrée par tâche : heure, tâche, résultat vérifié (avec la commande), décision, blocage.

## Lundi 16 novembre 2026

### 17 h 30, mise en place
- `git fetch` : l'étiquette `contrats-v1` est bien dans `dev` (`git branch -a --contains contrats-v1`).
- Branche `dev-nathan` créée depuis `origin/dev` et poussée.
- `.env.local` était absent : créé à la racine avec les noms de variables seulement, ouvert dans TextEdit pour que Nathan colle les valeurs. L'orchestrateur ne le lit pas.
- Avertissement pnpm à chaque commande : `packageManager: "pnpm@10"` dans le `package.json` de la racine n'est pas une version exacte. Fichier du couloir Ali, non touché. Sans effet constaté pour l'instant.

### 17 h 45, N0 : T6 (Devin rend la main)
- **Résultat : tenu.** Devin lancé sans interaction dans le worktree `horama-wt/t6-nathan` a créé `docs/tests/t6-nathan.md`, l'a commité, a écrit son rapport et a rendu la main : code de sortie 0, 38 s (limite : 5 min). Vérifié par `git diff --name-only dev-nathan...t6-nathan` (un seul fichier), `git status` propre, lecture du fichier.
- **Écart à la méthode (section 3)** : le lancement avec `--permission-mode dangerous` a été refusé à l'orchestrateur par le classifieur de Claude Code (« Undermining Oversight »). Relancé avec `--permission-mode smart` (un modèle rapide juge chaque commande avant de l'exécuter) : accepté. Détail : `docs/decisions/2026-11-16-devin-mode-smart.md`. À surveiller : une commande que le juge de Devin refuserait en cours de tâche (installation, déploiement).
- Quota Devin : non lu. La page `app.devin.ai/settings/usage` demande une connexion dans Chrome, et la CLI n'a pas de commande d'usage. À relire dès que Nathan est connecté.

### 17 h 45, N0 : T0 (clés)
- Script `scripts/verifier-cles-nathan.mjs` écrit par l'orchestrateur (mise en place, section 2 de la méthode). Il n'affiche que le nom du service et le code HTTP.
- **Résultat : en attente des clés.** Lancé une fois à vide : 6 variables vides (`HAI_API_KEY`, `HF_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`), CLI Vercel connectée.
- Vercel se vérifie par `vercel whoami` et non par un code HTTP : la CLI garde son jeton, l'orchestrateur ne le lit pas.
- `SUPABASE_DB_URL` n'est pas testée par T0 (il faut le paquet `postgres`) : elle le sera par N1.
- **17 h 54, résultat : tenu.** Clés collées par Nathan. `node scripts/verifier-cles-nathan.mjs` : H Agents API 200, Hugging Face 200 (whoami et routeur), Supabase 200 (clé anon ; clé de service sur REST et stockage), CLI Vercel connectée, code de sortie 0.

### 17 h 54, N1 : migration Supabase
- Devin a écrit `base/appliquer.mjs` (paquet `postgres` 3.4.9, installé dans `base/` hors du workspace pour ne pas toucher aux fichiers de la racine) en 232 s, sortie 0. Diff relu : 4 fichiers, tous dans `base/`, `001_init.sql` intact. Le juge du mode « smart » a laissé passer `pnpm install`.
- **Bloqué sur la clé, pas sur le code.** `node --env-file=.env.local base/appliquer.mjs --verifier` : « Connexion impossible (code 28P01) » (mot de passe refusé). Diagnostic sans afficher la valeur : `SUPABASE_DB_URL` contient encore le texte `[YOUR-PASSWORD]` du modèle de Supabase. Branche `n1-migration` gardée, non fusionnée tant que le comptage n'est pas rejoué.
- **17 h 57, résultat : tenu.** Mot de passe remplacé par Nathan, mais les crochets du modèle sont restés autour (`[motdepasse]`) : encore 28P01. Essai avec les crochets retirés en mémoire (sans modifier ni afficher la valeur) : connexion bonne, base vide (0 table sur 7). Migration appliquée de la même façon : « 7 tables sur 7, seau captures présent, RLS activée sur les 7 tables », code 0 ; relancée une fois (sans dégât, même sortie) ; `--verifier` seul : même sortie. Contrôle indépendant par l'API REST : lecture publique 200 sur les 7 tables, écriture avec la clé anon refusée (401). `001_init.sql` intact. Fusionné dans `dev-nathan`.
- Reste à faire par Nathan, sans urgence : retirer les deux crochets dans `SUPABASE_DB_URL`. Plus aucune tâche du couloir ne dépend de cette variable.
- `N8N_WEBHOOK_URL` est vide : la notification n8n (N11) sera notée « pas de webhook ».

### 17 h 50, N3 (en avance) : vault de Facturo
- Écrit par l'orchestrateur (ce sont des notes, pas du code) : 5 notes de `produit/`, la note de version v13, 3 tests C2 (`liste-factures-filtre-echeance`, `ca-du-mois-egal-total`, `detail-facture-total-egal-liste`), dossiers `decisions/`, `references/`, `passages/`.
- Conventions posées, à tenir par N5 à N7 : ligne `regle:` avec les mots exacts du contrat (`condition: < aujourd_hui`) ; champ d'une égalité écrit `<ecran>.<libellé>` ; libellés `Total`, `Nombre de factures`, `Montant TTC de F-119` ; `url` de chaque écran dans l'en-tête de sa note.
- Non vérifié : les 3 tests n'ont pas encore été lus par le lecteur de C2 (N5) ni joués par l'agent.

### 17 h 52, N2 : Facturo (en cours chez Devin)
- Brief : `.orchestrateur/briefs/n2-faux-saas.md` (hors Git). Décisions prises dans le brief, à reporter dans `docs/decisions/` à la livraison : routes (`/vXX/tableau-de-bord`, `/vXX/factures`, `/vXX/factures/<numero>`), changements actifs posés par `/vXX/entrer` seulement (`r=aucun`, `r=id1,id2`, mot `defaut`), catalogue de 10 régressions et 5 changements voulus, filtre en menu `<details>` (« Toutes », « À venir », et « Échéance dépassée » en v13), boîtes à dimensions fixes pour que les positions ne dépendent pas de la police.
- 18 h 02 : Devin actif (journal de la CLI : `pnpm install` à 17 h 58 ; 21 fichiers écrits). Il tourne sans fenêtre : on le suit par `~/.local/share/devin/cli/logs/`.

### 18 h 03, N4 : app Horama sur données factices (lancé en parallèle de N2, dossiers disjoints)
- Direction posée avec la méthode `taste` avant le brief (note de goût du vault de Nathan lue, 5 références regardées) et annoncée à Nathan : outil de travail à composants standard, une signature (le surlignage d'état : jaune à trancher, lime conforme, corail défaut prouvé, pointillé non testée, mesure en marge), blocs pleins pour les verdicts, valeurs en très grand, Atkinson Hyperlegible Next et Mono, jetons de la spec.
- À faire avant la porte : déposer les vraies captures de Facturo dans `interface/public/factice/`, passer les 10 captures au juge aveugle (agent frais).

### 18 h 06, quota Devin et URL de base
- Quota Devin lu sur `app.devin.ai/settings/usage` (second profil Chrome de Nathan) : **46 % du quota hebdomadaire utilisés**, remise à zéro dans 6 jours (donc après la démo), aucun solde à la demande. Seuil d'arrêt de la méthode : 80 % utilisés. À ce relevé, T6 et N1 sont finis, N2 et N4 sont en cours : le coût d'une tâche n'est pas encore mesuré. À relire à la fin de N2.
- Nathan a retiré les crochets de `SUPABASE_DB_URL` : `node --env-file=.env.local base/appliquer.mjs --verifier` passe tel quel (7 tables sur 7, seau présent, RLS partout, code 0).

### 18 h 35, N2 : Facturo, tenu
- Devin : 20 min, sortie 0, 28 fichiers (27 dans `faux-saas/`, plus `pnpm-lock.yaml` à la racine, généré). Son rapport n'a pas été écrit sur disque (écriture hors du worktree refusée par son juge en fin de tâche) : lu dans sa sortie.
- Rejoué par l'orchestrateur, en local puis sur l'URL publique : `check` vert (7 tests), `build` vert, `captures.mjs` : 7 captures, 0 pixel différent entre deux visites, aucun défilement à 1280 × 900 ; `verifier-regressions.mjs` : 78 contrôles sur 78 (v13 `r=aucun` identique à v12, chaque changement ne touche que son écran, textes avant et après, `r=defaut,…`, 400 sur identifiant inconnu et sur `suite` hors version). `positions.json` identique en local et en ligne. Captures regardées une à une. Diff relu : pas de clé en dur, connexion par variables d'environnement.
- Déployé : `https://facturo-demo.vercel.app` (projet Vercel `facturo-demo`). Premier déploiement en échec (projet créé sans framework : « No Output Directory named public ») ; corrigé par `faux-saas/vercel.json` (`"framework": "nextjs"`, correctif de l'orchestrateur). Variables `FACTURO_LOGIN`, `FACTURO_PASSWORD`, `FACTURO_TODAY` envoyées au projet sans être affichées.
- `vercel link` a créé un `faux-saas/.env.local` et ajouté `.env*` au `.gitignore` du dossier (gardé). Le lien `faux-saas/.env.local -> ../.env.local` de la méthode n'est donc pas en place : sans effet tant que personne ne teste le formulaire `/login` en local.
- `FAUX_SAAS_URL` ajoutée à la fin de `.env.local` (valeur non secrète).
- Non testé : le rendu dans le navigateur de H, le texte de page vu par H (T2), les captures après des clics de l'agent.

### 18 h 40, N3 : livraison au couloir Ali
- `docs/decisions/2026-11-16-url-faux-saas.md` : URL, entrée sans mot de passe, paramètre `r`, table écran, vue, adresse, et une proposition à valider par Ali (jouer un test en v12 en remplaçant `/v13/` par `/v12/` dans `url_depart`).
- `docs/decisions/2026-11-16-seuil-de-bruit.md` : seuil provisoire pour T1 (écart de canal de plus de 24, zones à 8 px, au moins 6 pixels), fixé sur Chrome, à refixer sur les captures de H.
- Captures : `docs/captures/2026-11-16-n2-faux-saas/` (7 PNG et la planche `index.html`).
- `pnpm -r --if-present run check` à la racine échoue sur `@horama/contrats` (« tsc: command not found » : aucun paquet de la racine ni de `contrats/` n'installe TypeScript). Déjà vrai sur `dev`, fichiers du couloir Ali : signalé dans la PR, non touché. `pnpm --filter @horama/faux-saas run check` : vert.
- 18 h 45 : PR `dev-nathan` vers `dev` ouverte, fusionnable : https://github.com/Hisseiny/Horama-/pull/2
- Quota Devin : 48 % utilisés (46 % à 18 h 06). Deux points pour la seconde moitié de N2 et le premier quart d'heure de N4 : une tâche de la taille de N2 coûte de l'ordre de 2 à 3 points (estimation sur un seul écart, à affiner après N4).
- Les 7 captures de Facturo sont copiées dans `interface/public/factice/` du worktree de N4 (les maquettes affichent de vraies captures).

### 19 h 10, N5 : `@horama/memoire`, tenu (fait avant la porte : il ne dépend pas de la direction visuelle)
- PR #2 fusionnée par Nathan à 18 h 23, `dev` récupéré dans `dev-nathan`. `dev-ali` n'existe pas encore sur le dépôt.
- Devin : 14 min, sortie 0, 17 fichiers (16 dans `memoire/`, plus `pnpm-lock.yaml`). Rapport écrit dans le worktree (consigne changée après le refus d'écriture de N2).
- Rejoué par l'orchestrateur : `pnpm --filter @horama/memoire run check` vert (27 tests) ; `vault-horama/` intact ; lecture du vrai vault par le paquet : 6 notes, 13 règles dont 10 testables, les 3 tests C2 écrits à la main passent le lecteur (critère de N3 tenu). Aller-retour C2 sans perte, à l'octet près, couvert par les tests. `accepted-tests.ts` relu.
- Points laissés ouverts par Devin, à traiter en N9 : F32 ne regarde que les écarts visuels (un bug de règle sur le même écran ne bloque pas la validation d'une référence) ; l'app doit repartir de la décision rendue par `appliquerCorrection`. Le paquet s'importe en `.ts` : l'app doit le mettre dans `transpilePackages`.
- T4 préparé : le routeur Hugging Face liste 164 modèles ; candidats ouverts à comparer en N6 : `openai/gpt-oss-120b`, `Qwen/Qwen3.8-27B`, réserve `zai-org/GLM-5.3-Flash`.

### 19 h 20, N6a lancé : T4 et génération par Hugging Face (dans `jugement/`, sans l'interface)
- N6 est coupé en deux pour ne pas toucher `interface/` pendant que N4 s'y code : N6a (mesure de deux modèles, `proposerTests`), puis N6b (écran 11.2 branché, Accepter écrit le fichier) après la porte.
- Devin lance ses scripts avec `node --env-file=<.env.local du dépôt>` pour appeler le routeur ; consigne : ne jamais lire ni afficher le fichier ou une valeur.
- Quota Devin : 52 % utilisés à 19 h 15 (46 % à 18 h 06, 48 % à 18 h 45). Rythme constaté : environ 6 points en 70 min avec un à deux Devin actifs. Marge avant le seuil d'arrêt (80 %) : 28 points.
