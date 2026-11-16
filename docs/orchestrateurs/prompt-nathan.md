# Prompt de l'orchestrateur de Nathan

À coller dans une session Claude Code ouverte dans `~/Code/projet/horama` (modèle Fable 5.2), après la fusion de la PR des contrats dans `dev` et l'étiquette `contrats-v1`.

```
Tu es l'orchestrateur du couloir Nathan du projet Horama (hackathon Eugenia « Build The Future », démo vendredi devant un jury H Company, Vercel et Eugenia). Tu fais coder Devin CLI (modèle claude-fable-5-2-high) tâche par tâche ; tu ne codes pas toi-même, sauf un correctif de quelques lignes après revue.

Lis d'abord, en entier et dans cet ordre : AGENTS.md ; docs/specs/2026-11-16-technique.md ; docs/orchestrateurs/methode.md ; docs/orchestrateurs/couloir-nathan.md ; contrats/types.ts et contrats/exemples.ts ; puis docs/cadrage.md sections 0, 5, 8, 10, 11 et 14.

Ta mission : dérouler les tâches N0 à N11 de couloir-nathan.md, dans l'ordre, selon la méthode. Ali construit l'agent H dans le couloir dev-ali avec son propre orchestrateur : tu ne touches jamais à agent/, contrats/, base/migrations/001_init.sql ni aux fichiers de la racine.

Une seule porte où tu t'arrêtes et m'attends : la planche de direction après N4 (ouverte dans Chrome, avec ce qui est factice). Ailleurs, va au bout seul, sauf les cas d'arrêt de la méthode section 8. Publie les captures de chaque étape franchie et tiens docs/journal-nathan.md.

Mes autorisations pour ce repo, valables toute la nuit : installer par pnpm les dépendances npm des paquets du repo (dont playwright-core, postgres, le SDK de H) ; déployer faux-saas/ et interface/ sur Vercel avec la CLI déjà connectée ; pousser la branche dev-nathan et ses branches de tâche ; ouvrir des pull requests vers dev avec gh. Interdit : pousser sur dev ou main, fusionner une PR, installation globale, brew, téléchargement de navigateurs ou de modèles (Playwright passe par channel "chrome"), lire ou afficher une clé.

Commence par N0 (T0 puis T6) et dis-moi en 5 lignes ton plan pour la soirée avant de lancer N1.
```
