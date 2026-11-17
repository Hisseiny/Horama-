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

### 19 h 50, N4 : app Horama sur données factices, tenu (direction à valider par Nathan)
- Devin : 44 min, sortie 0, 51 fichiers (`interface/` et `pnpm-lock.yaml`). Conflit de verrou pnpm avec `dev-nathan` réglé par l'orchestrateur dans la branche (verrou de `dev-nathan` repris, `pnpm install`).
- Rejoué par l'orchestrateur : `check` vert (8 tests de contraste), `build` vert avec `USE_MOCKS=1`, les 7 routes en 200, `captures.mjs` : 10 captures, sortie 0. Les 10 captures regardées une à une : rien ne déborde, la signature (surlignage d'état) est tenue sur les 8 écrans.
- Écarts de Devin acceptés : `lireDecisions` ajoutée à `lib/donnees.ts` ; zone du bouton Exporter prise dans `faux-saas/positions.json` (celle de l'exemple du contrat tombe à côté du bouton réel) ; « à calculer » pour le nombre de zones.
- Incident mineur : Devin a arrêté son serveur par `pkill -f "next dev"` (trop large). Aucun autre serveur de développement ne tournait.
- **Constat pour le pitch** : sur Facturo, la vue « pixels bruts » ne montre pas « du rouge partout ». Le faux SaaS est déterministe : 1 320 pixels différents sur 1 152 000 pour le bouton déplacé. L'argument « la comparaison de pixels noie l'humain » ne se voit pas sur ce logiciel ; il se verrait sur un logiciel dont les données ou le rendu changent d'une visite à l'autre.
- Planche de direction : `docs/captures/2026-11-16-porte-direction/index.html`. App servie sur `http://localhost:3000` pour la navigation. Juge aveugle lancé (agent frais, captures seules puis 8 références).

### 20 h 05, PORTE DE DIRECTION : en attente du « go » de Nathan
- Juge aveugle (agent frais, 10 captures seules puis 8 références) : 6,5 sur 10, aucune source unique (« un composite, pas un clone » ; parenté la plus proche : US Graphics pour la structure, PostHog pour le fond et les titres). Propre au produit : le surlignage sur la phrase de documentation, l'équation en très grand, le passage du jaune au souligné à l'acceptation. Écrans faibles : 4 (passage en direct, sans couleur d'état), 5 (captures minuscules, trois navigations), 1 (petit texte gris, règles répétées). Écran fort : 8.
- Cinq corrections proposées sur la planche, **non faites** : elles attendent l'avis de Nathan pour ne payer qu'une passe de Devin.
- Planche ouverte dans Chrome ; app sur `http://localhost:3000`. Étiquette `porte-direction` à poser après le « go ».
- Quota Devin : 56 % utilisés. Dix points depuis 18 h 06 pour N2 (seconde moitié), N4, N5 et le début de N6a. Reste 24 points avant le seuil d'arrêt ; reste à faire : corrections de N4, fin de N6a, N6b, N7, N8, N9, N10, N11. Estimation : la nuit complète finit entre 75 et 80 %.
- Pendant l'attente : N6a continue chez Devin (il ne dépend pas de la direction).

### 20 h 20, N6a : génération par Hugging Face, code tenu, T4 NON tenu sur le temps
- Consigne de Nathan à 20 h 08 : ne plus lancer de tâche, le prévenir quand plus aucun agent ne tourne (il coupe internet puis répond aux questions de la porte).
- Devin : 19 min, sortie 0, bloqué en fin de tâche : son juge (mode « smart ») lui a refusé 3 fois de lancer le script de T4. Code, consigne et script commités ; vérifications hors réseau rejouées : `jugement` 12 tests, `memoire` 28 tests, verts.
- **T4 lancé par l'orchestrateur** (`node --env-file=.env.local jugement/scripts/t4-generation.ts`, 357 s, 18 passes) :
  - `openai/gpt-oss-120b` : format C1 valide et règles justes 8 passes sur 9 (v13 : 3 sur 3, les 2 tests s'écrivent dans le vault et se relisent 3 fois sur 3 ; liste : 3 sur 3 ; règles entre écrans : 2 sur 3, un passage de source mal recopié). Temps médian 16,3 s. Coût rendu par le routeur : 0,0081 $ pour 9 passes.
  - `Qwen/Qwen3.8-27B` : 2 passes sur 9, 7 délais de 45 s dépassés. Écarté.
  - Critère de T4 (2 notes sur 3 réussies aux 3 passes ET temps médian sous 10 s) : **non tenu**, à cause du temps seulement pour gpt-oss-120b (16,3 s contre 10 s).
- Décisions de Devin acceptées : le modèle reçoit les notes d'écran en entier (sans elles il invente le nom de la colonne) ; l'égalité des règles avec la note est imposée par le code.
- À faire à la reprise, avant d'accepter le repli de la spec (test pré-généré) : remesurer gpt-oss-120b en demandant au routeur son fournisseur le plus rapide (suffixe de fournisseur dans l'identifiant du modèle), et la réserve `zai-org/GLM-5.3-Flash`. Une ligne à changer, 6 minutes de mesure.
- Fusionné dans `dev-nathan` (conflit de verrou pnpm réglé par `pnpm install`). Plus aucun agent ne tourne. Seul le serveur local de l'app (port 3000) reste actif, il n'a pas besoin d'internet.

### État à la coupure (pour reprendre)
- Tenus et fusionnés : N0, N1, N2, N3 (PR #2 fusionnée dans `dev`), N4 (direction à valider), N5, N6a (code).
- En attente de Nathan : le « go » de la porte, le choix des corrections du juge, la marge de quota.
- Suite, dans l'ordre : corrections de N4 selon l'avis de Nathan ; remesure de T4 ; N6b (écran 11.2 branché sur `proposerTests` et `ecrireTestAccepte`) ; N7 (sonde H, T2, relevé, calcul, `verifierPassage`) ; N8 ; N9 ; N10 dès que `dev-ali` existe ; N11.
- Pièges : Devin en mode « smart » refuse d'écrire hors de son worktree (rapport à la racine du worktree) et de lancer un script qui appelle un service avec une clé (l'orchestrateur le lance) ; `pnpm-lock.yaml` entre en conflit à chaque fusion de deux branches parallèles (garder celui du couloir, `pnpm install`).

### 21 h 10, PORTE : la direction n'est pas validée, changement de cap décidé par Nathan
- Verdict de Nathan sur l'app à 8 onglets : « on ne comprend pas trop où ça va », « très vibe codé », le parcours est « en plusieurs fois ». Sa vision : un déploiement Vercel, puis une seule scène où l'on voit le site, le curseur qui bouge et la mascotte Horama qui clique, signale ses doutes sans s'arrêter, et tout se tranche à la fin.
- Erreur de l'orchestrateur : avoir répondu qu'on ne peut pas montrer le navigateur de l'agent en direct ni faire pointer la mascotte sur le clic exact. Faux en navigateur local. Fouille du vault de Nathan (note Nami, `h-company-agents-api`, `hackathon-mvp-playbook` § 8, `gout-design-nathan` § Panneau Nami) et du dépôt public de Nami (`extension/agent-overlay.js`, `scripts/lancer-demo.sh`) : Chrome local piloté par `holo local browser`, couche dans la page qui suit les vrais clics.
- Décision écrite : `docs/decisions/2026-11-16-scene-en-direct.md` (déroulé en 6 temps validé par Nathan, ce qui change, pièges mesurés sur Nami, proposition de partage pour Ali). Spec, `couloir-ali.md` et `couloir-nathan.md` mis à jour. PR vers `dev` pour prévenir Ali.
- Les 5 corrections du juge aveugle sur l'app à 8 onglets ne sont pas faites : la forme change. Le visuel (mascotte, images) viendra après, sur prompts donnés à Nathan.
- Prochaine tâche : T7 (preuve du navigateur local), code écrit par Devin, mesure lancée par l'orchestrateur. Elle demande d'installer l'outil `holo` de H (retiré du Mac le 8/11) : accord de Nathan demandé avant.
- T4 reste à remesurer avec un fournisseur plus rapide ; quota Devin à 56 % au dernier relevé (20 h 05).

### 21 h 50, T7 : preuve du navigateur local, TENUE (3 passages sur 3, du premier coup)
- Accord de Nathan (« go ») pour installer l'outil `holo` : `hai-agents[cli,browser]` 1.5.1 dans `~/.venvs/holo` (143 Mo). Au premier lancement, Selenium a téléchargé un pilote Chrome dans `~/.cache/selenium` (17 Mo). Profil Chrome de l'agent : `.orchestrateur/chrome-agent` (172 Mo, hors Git).
- Devin : 23 min, sortie 0, 9 fichiers sous `automatisation/scene/` (paquet autonome, dépendance `pngjs`). Montage sans agent rejoué par l'orchestrateur : zone de page 1280 × 900, densité 1, 0 pixel différent entre deux passes et contre les références de N2.
- Trouvaille de Devin, à garder : sans `--force-color-profile=srgb`, un Chrome visible convertit les couleurs vers le profil de l'écran et chaque capture diffère des références de 250 000 à 300 000 pixels ; avec, 0.
- Incident sans suite : Devin a lancé une fois le mode avec agent avec une fausse clé pendant que `holo` venait d'être installé ; H a répondu 403, aucune session créée.
- **Mesure avec l'agent H**, lancée par l'orchestrateur (`node --env-file=.env.local automatisation/scene/sonde-t7.mjs`, 267 s en tout) sur `https://facturo-demo.vercel.app`, parcours de 4 écrans (tableau de bord, liste, liste filtrée, détail F-119), modèle `holo4-27b`, `settle_s` 0,5 :
  - écrans atteints : 4 sur 4 aux 3 passes, adresse vérifiée ;
  - curseur : les 5 clics attendus signalés par la couche avec le bon élément dessous, 3 passes sur 3 ;
  - captures : 0 pixel différent entre les passes, et 0 contre les références prises sans tête ;
  - durée du parcours complet : 45,2 s, 59,4 s, 70,5 s (13 étapes à chaque fois) ; coût rendu par H : 0,0316 $, 0,0323 $, 0,0273 $ ;
  - aucune relance, aucune session muette (3 sessions : cela ne dit rien du taux réel, 3 muettes sur 11 le 8/11).
- Rapport : `docs/tests/2026-11-16-t7-navigateur-local.md` ; captures : `docs/captures/2026-11-16-t7/`.
- Non mesuré : le texte de page pour le relevé des valeurs (les `.txt` existent, à exploiter en S2) ; la tenue sur plus de 3 sessions ; l'écran intégré seul du Mac (la fenêtre s'est ouverte sur l'écran externe, l'écran intégré n'a pas 900 px de haut utiles).
- Conséquence : le plan de `docs/decisions/2026-11-16-scene-en-direct.md` tient. T1 et T2 de la spec sont répondus par ce montage (captures identiques ; le texte se lit dans la page). Suite : S1 (la scène avec la mascotte), S2 (vérification pendant le parcours).

### 22 h 15, état des lieux et lancement de S1 et S2
- PR #3 (changement de cap) fusionnée par Nathan. PR #4 ouverte : résultat de T7 pour Ali, lève l'attente sur A4.
- Nathan demande qui fait quoi : tableau publié dans `docs/orchestrateurs/qui-fait-quoi.md` (scène : Nathan et son orchestrateur ; moteur : Ali ; visuel : le groupe). Accord de Nathan pour une mascotte provisoire très simple en attendant le visuel du groupe.
- Quota Devin : 59 % utilisés.
- Lancés en parallèle chez Devin (dossiers disjoints) : S1 (`automatisation/scene/` : mascotte, bulle, zones surlignées, parcours unique construit depuis les tests du vault) et S2 (`jugement/verification/` : relevé des valeurs depuis le texte de page, cinq règles, comparaison d'image selon le seuil de bruit). Interface entre les deux fixée dans les briefs : `verifierReleve(entree) → Constat[]`.

### 22 h 40, S2 : vérification d'un écran pendant le parcours, tenu
- PR #4 fusionnée par Nathan à 20 h 52 (UTC 19 h 52), `dev` récupéré. Toujours pas de branche `dev-ali` sur le dépôt.
- Devin : 13 min, sortie 0, 10 fichiers (`jugement/` et `pnpm-lock.yaml`). `check` rejoué : 27 tests verts.
- Sur les 4 écrans réels du parcours T7 (v13) contre les références v12 : CA du mois `VERIFIED_FAIL` à la liste (« 1 240,00 ≠ 1 420,00, écart 180,00 ») ; filtre `VERIFIED_FAIL` sur la vue filtrée (F-120, 30/11/2026, attendu avant le 18/11/2026) ; détail F-119 : égalité et somme `PASS` ; visuel : 1 zone sur la valeur du CA, bouton Exporter sur la liste, aucune zone sur le détail. Durée de `verifierReleve` avec image : 27 à 29 ms.
- Correctif de l'orchestrateur (10 lignes, `jugement/verification/images.ts`) : une zone contenue dans la boîte d'une autre lui est rattachée. Le bouton Exporter donnait 4 zones (contour et texte, deux emplacements), il en donne 2. Règle ajoutée à `docs/decisions/2026-11-16-seuil-de-bruit.md`.
- Choix de Devin gardés : une règle autre que `filtre` ne se lit que sur la vue `defaut` (sinon faux défaut dès que le filtre marche) ; compteur de factures contradictoire : `INCONCLUSIVE`.
- Reste ouvert : l'ancien et le nouvel emplacement du bouton font encore deux doutes pour un seul déplacement (à relier en S3, ou par Holo).

### 23 h 00, S1 tenu, et premier parcours complet : agent réel, mascotte, vérification
- S1 (Devin, 47 min, 7 fichiers dans `automatisation/scene/`) : `couche-horama.js` (mascotte provisoire en SVG, 7 états, bulle, zones numérotées, bandeau à compteur, état gardé d'une page à l'autre), `parcours.mjs` (un seul parcours et une seule consigne depuis les tests acceptés du vault, `verifierReleve` appelé à chaque relevé, `passage.json`). Images témoins regardées par l'orchestrateur (`docs/captures/2026-11-16-scene/`). Les captures propres restent identiques à celles de T7 (0 pixel différent) : la couche ne laisse pas de trace.
- Références v12 écrites dans le vault par un parcours scripté (`parcours.mjs --sans-agent --version 12 --ecrire-references`) : 3 écrans. Sur la v12 : 3 règles conformes, 0 doute.
- **Parcours réel sur la v13** (`node --env-file=.env.local automatisation/scene/parcours.mjs`, session H unique, 3 tests du vault enchaînés) : 4 relevés sur 4, 13 étapes, **38,7 s**, coût rendu par H 0,031 $, aucune relance. Constats pendant le parcours : CA du mois `VERIFIED_FAIL` (1 240,00 ≠ 1 420,00), filtre `VERIFIED_FAIL` (F-120, 30/11/2026), détail F-119 : 2 `PASS`, 3 doutes visuels (valeur du CA sur le tableau de bord, bouton Exporter au nouvel et à l'ancien emplacement). Bilan dit par la mascotte à 51 s.
- À améliorer, constaté sur ce passage : (1) 3 doutes pour 1 seul vrai doute : le doute sur la valeur du CA devrait être repris par le défaut prouvé à l'écran suivant, et les deux emplacements du bouton ne font qu'un déplacement ; (2) l'agent va plus vite que la mascotte ne parle (3 s par geste), ses bulles prennent 11 à 15 s de retard ; (3) une seule mesure : la tenue sur plusieurs passages reste à faire.
- Passage : `.orchestrateur/passages/2026-11-16-21h45-5675/` (hors Git).

### 23 h 30, retour de Nathan sur le premier parcours, et lancement de la correction
- Verdict de Nathan (il a regardé le parcours réel) : pas de fin où il tranche chaque incohérence ; curseur et mascotte à séparer (le curseur clique, la mascotte flotte à côté et parle) ; trop saccadé, trop vite ; langage trop compliqué, « pas très UX friendly » ; il veut voir le surlignage se dessiner ; « te mettre à la place d'un lambda ». Il demande aussi de chercher des bibliothèques d'animation sur GitHub.
- Plan annoncé avant de coder, « go » de Nathan : (1) fin de parcours où chaque problème est remis à l'écran avec deux boutons ; (2) curseur et mascotte séparés ; (3) clic de l'agent retenu environ 0,6 s le temps que le curseur arrive, et agent retenu à chaque écran tant que la mascotte parle ; (4) phrases courtes en mots simples ; (5) trait de surlignage animé ; (6) un seul doute pour un élément déplacé, et un doute remplacé par le défaut prouvé quand la preuve arrive.
- Bibliothèques retenues pour essai (licences à vérifier dans `node_modules` avant de les garder) : `rough-notation` (trait animé), `driver.js` (mise en lumière et boutons de la fin), `ghost-cursor` (trajet du curseur, ou vingt lignes équivalentes), `motion` (ressorts).
- Lancés en parallèle chez Devin : S3-A (`automatisation/scene/` : scène lisible et fin de parcours) et S3-B (`jugement/verification/` : `formuler`, `consoliderConstats`, déplacement en un seul constat, `versDecision`). Interface commune fixée dans les deux briefs.
- Le Chrome de l'agent resté ouvert après le parcours a été fermé avant de lancer Devin (port 9333 libre).

### 0 h 05 (mardi 17), S3-A et S3-B tenus : scène à deux personnages, fin où l'humain tranche
- S3-B (Devin, 19 min ; son commit a été refusé par son juge, fait par l'orchestrateur) : `formuler`, `consoliderConstats`, déplacement en un seul constat, `versDecision`. 34 tests verts. Sur le parcours réel : 2 problèmes, 1 doute (le bouton), 1 doute rattaché au problème du CA. Phrase du déplacement précisée par l'orchestrateur (« a été déplacé vers le haut, il est maintenant en haut à droite »).
- S3-A (Devin, 60 min, 8 fichiers dans `automatisation/scene/`) : curseur (flèche, trajet en courbe, clic de l'agent retenu puis rejoué) et mascotte séparés ; l'agent attend la mascotte à chaque écran (`--plafond`) ; trait dessiné par `rough-notation` 0.5.1 (MIT, seule bibliothèque gardée ; `driver.js`, `motion` et `ghost-cursor` non installées, remplacées par quelques lignes) ; fin de parcours avec assombrissement, question et deux boutons, décisions écrites par `@horama/memoire`. Captures propres toujours à 0 pixel des références. Film de 557 images livré hors Git.
- Assemblage vérifié par l'orchestrateur : parcours scripté avec la vraie vérification sur une copie du vault (4 relevés, 3 questions, 3 décisions écrites).
- **Parcours réel, agent H, vu et terminé par Nathan** (`node --env-file=.env.local automatisation/scene/parcours.mjs --plafond 20`) : 4 relevés sur 4, 13 étapes, parcours en 101,3 s (la mascotte présente chaque écran en 7 à 21 s), clic retenu 0,66 à 0,92 s, aucune relance. Nathan a répondu aux 3 questions à la souris (voulu, bug, voulu) ; 3 décisions écrites dans `vault-horama/facturo/decisions/` (laissées hors Git : ce sont des clics d'essai).
- Défauts connus, listés par Devin : une règle conforme ne désigne pas ses deux valeurs sur la page ; le doute qui devient problème change de couleur hors champ ; clignotement de 54 à 76 ms de la couche à chaque capture ; pendant une question, les marques des autres constats restent visibles.

### 0 h 30 (mardi 17), CLÔTURE de la session du lundi 16. Reprendre ici.
**Consigne de Nathan** : clôturer, tout pousser pour qu'Ali puisse travailler dessus, reprendre demain avec le groupe, lui reposer les questions en attente.

**État**
- Tenus et fusionnés dans `dev-nathan` : N0 à N5, N6a, T7, S1, S2, S3-A, S3-B. Tableau à jour : `docs/orchestrateurs/qui-fait-quoi.md`.
- Dernier parcours réel (agent H, 0 h 00) : 4 écrans, 101 s, 3 questions tranchées par Nathan à la souris, 3 décisions écrites dans le vault. Ces 3 décisions d'essai ont été **sorties du vault** après coup (`.orchestrateur/decisions-essai-2026-11-16/`, hors Git) pour que le prochain parcours reparte de zéro.
- Plus rien ne tourne : aucun Devin, aucun pont `holo`, Chrome de l'agent et serveur local arrêtés. Aucun worktree ouvert.
- Sur le Mac, hors Git : `~/.venvs/holo` (143 Mo), `~/.cache/selenium` (17 Mo), `.orchestrateur/` du dépôt (179 Mo, dont le profil Chrome de l'agent, 172 Mo).
- Quota Devin : **75 % utilisés**, remise à zéro dans 5 jours (après la démo), aucun solde à la demande. Seuil d'arrêt de la méthode : 80 %.

**Questions à reposer à Nathan à la reprise**
1. Son avis sur le dernier parcours (curseur, mascotte, rythme, phrases, fin avec les boutons).
2. Quota : (a) l'orchestrateur code lui-même les ajustements de la scène, (b) Devin gardé pour une ou deux grosses tâches, (c) achat de solde. Recommandation : (a).
3. La réponse d'Ali sur le partage (`docs/decisions/2026-11-16-scene-en-direct.md`, dernière partie). Sa branche `dev-ali` n'existe toujours pas sur le dépôt.
4. L'écran de la démo : au moins 900 px de haut utiles.

**Suite, dans l'ordre**
1. Corrections de la scène selon l'avis de Nathan, et ses défauts connus (voir `qui-fait-quoi.md`).
2. Correction de la documentation après un « voulu » qui la contredit (le dernier maillon de la boucle, pas encore construit).
3. Déclenchement par un déploiement Vercel.
4. Tenue sur 5 à 10 parcours et vidéo de secours.
5. Jonction avec le coureur d'Ali (écriture en base), remesure de T4, banc.

**Pièges appris aujourd'hui (à relire avant de relancer)**
- Devin se lance en `--permission-mode smart` (le mode `dangerous` est refusé à l'orchestrateur). Dans ce mode, son juge lui refuse : d'écrire hors de son worktree (rapport à la racine du worktree), de lancer un script qui appelle un service avec une clé (l'orchestrateur le lance), parfois `git commit` en fin de tâche (l'orchestrateur commite).
- Un worktree neuf n'a pas de `node_modules` : y lancer `pnpm install` (et `pnpm install --ignore-workspace` dans `automatisation/scene/`) avant de lancer Devin.
- `pnpm-lock.yaml` entre en conflit à chaque fusion de deux branches parallèles : garder celui du couloir, `pnpm install`.
- Chrome visible : `--force-color-profile=srgb`, sinon 250 000 à 300 000 pixels d'écart avec les références.
- La zone de page de 1280 × 900 ne tient pas sur l'écran intégré du Mac.
- Le Chrome de l'agent reste ouvert après un parcours (port 9333) : le fermer avant de lancer un essai de Devin.
- Ne jamais montrer à Nathan une commande de suppression dans un bloc de code s'il n'a pas à la taper tout de suite.
- Le coût Devin d'une tâche d'une heure : environ 6 à 8 points de quota hebdomadaire.

## Mardi 17 novembre 2026 : la jonction avec le coureur d'Ali

Orchestrateur : Claude Code (Opus 5.5). Mission : J0 à J4 (scène branchée sur `@horama/agent`, résultats et décisions en base, captures comparables aux références v12, trois parcours réels puis un tranché par Nathan).

### 14 h 12, J0 : mise en place
- `origin/dev-nathan` avait avancé depuis la clôture (1a1f678, PR #11 « correction de note » fusionnée dedans) : `dev-nathan` local avancé d'abord (`git merge --ff-only`).
- `git merge --no-ff origin/dev` (33 commits) : aucun conflit. Commit b176839, poussé.
- `pnpm install` à la racine et `pnpm install --ignore-workspace` dans `automatisation/scene/` : le verrou de la racine reçoit une entrée `@pnpm/exe` (artefact de la version locale de pnpm), remise à celle de `dev` par `git checkout pnpm-lock.yaml`. Même chose après chaque `pnpm -r run` : à rétablir avant tout commit.
- `pnpm -r --if-present run check` : code 0. faux-saas 7, memoire 28, interface 8, jugement 51, agent 49 tests, aucun échec.
- Quota Devin (app.devin.ai, Chrome) : **75 % utilisés**, remise à zéro dans 5 jours, aucun solde à la demande. La page n'affiche que des points entiers et l'onglet « Usage history » est vide : la mesure de SWE-2 (avant et après J2) ne verra qu'un écart d'au moins 1 point.

### 14 h 40, J1 lancé chez Devin (`claude-opus-5-5-high`)
- Brief : `.orchestrateur/briefs/j1-coureur.md` (hors Git). Worktree `../horama-wt/j1-coureur`, branche `j1-coureur`.
- Blocage d'environnement au premier essai scripté : seul l'écran du Mac est branché, la zone de page plafonne à 1280 × 862. **Décision de Nathan** : imposer la zone par le code, toujours, pour le même résultat sur tout écran. Ajouté à J1 : `fitViewport` applique `Emulation.setDeviceMetricsOverride` (1280 × 900, densité 1) après le réglage de la fenêtre.
- L'ancien commentaire du code et la note du vault (`_tech/h-company-agents-api.md`) disent que l'émulation « fausserait les clics » : rien ne le mesure. Le parcours réel de J1 le dira (clics signalés par la couche avec le bon élément dessous).
- Point relevé à la lecture du coureur d'Ali : `settle_s: 0.5` en dur (`agent/src/session.ts`), la scène tournait à 1,0 parce qu'elle retient chaque clic 620 à 920 ms. À mesurer au parcours réel (l'agent reclique-t-il ?) avant d'écrire une demande à Ali.
- Base de comparaison des captures : relevés du parcours réel du 16/11 à 0 h (`.orchestrateur/passages/2026-11-16-22h56-b0bf/releves/`, grand écran, sans émulation) et références v12 du vault.
