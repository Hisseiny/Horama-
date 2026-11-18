# Devin se lance en mode « smart », pas « dangerous »

Date : 16 novembre 2026. Constaté par l'orchestrateur du couloir Nathan pendant T6. Concerne aussi le couloir Ali.

**Constat.** La commande de la méthode (section 3), avec `--permission-mode dangerous`, est refusée à l'orchestrateur par le classifieur de Claude Code (« Undermining Oversight ») : ce mode approuve tous les outils de Devin sans contrôle.

**Décision.** Le couloir Nathan lance Devin avec `--permission-mode smart` : Devin exécute seul ce qu'un modèle rapide juge sûr. Le reste de la commande ne change pas.

```
devin -p --prompt-file <brief> --model claude-fable-5-2-high \
  --permission-mode smart --respect-workspace-trust false --export <journal>
```

**Mesuré.** T6 dans ce mode : fichier créé, commit fait, rapport écrit hors du worktree, code de sortie 0, 38 s (1 essai).

**Pas encore mesuré.** Si le juge de Devin laisse passer `pnpm install`, un déploiement Vercel ou un script Playwright. Si une commande est refusée en cours de tâche, l'orchestrateur la lance lui-même après revue.
