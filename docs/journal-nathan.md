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
