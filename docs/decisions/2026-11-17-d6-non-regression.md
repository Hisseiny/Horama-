# D6 : tests de non-régression à chaque déploiement

Date : 17 novembre 2026. Proposé par Noé (CEO). **À valider par Ali (racine, `.github/`, `agent/`), Nathan (`automatisation/`, `faux-saas/`) et Inès (`vault-horama/`)** dans cette pull request. Rien n'est codé tant qu'ils n'ont pas approuvé.

## Décision

Horama ajoute une fonctionnalité de non-régression, en P0, démontrée sur le faux SaaS (Facturo) :

1. À chaque déploiement, Horama compare le code déployé au code précédent.
2. Il en déduit les écrans et les fonctionnalités touchés, y compris ceux que la modification ne visait pas.
3. Il rejoue seulement les tests liés à ces écrans, plus un petit socle de tests joués à chaque fois.
4. Il publie le résultat en commentaire de la pull request.

En contrepartie, la comparaison de pixels (F18 à F20, F23) passe en P1. Sans retrait, le périmètre P0 grossit encore.

## Comment ça marche

| Étape | Outil | Détail |
|---|---|---|
| Déclenchement | GitHub Actions, événement `deployment_status` | Vercel signale à GitHub chaque déploiement réussi, avec son URL publique |
| Diff | `git diff --name-only <commit précédent> <commit déployé>` | Liste des fichiers modifiés |
| Impact | Table de correspondance, puis graphe des imports, puis LLM | Voir plus bas |
| Sélection | Script | Tests du vault liés aux écrans touchés, plus le socle |
| Passage | Agent H, navigateur cloud | Sur l'URL publique du déploiement : le navigateur de H ne voit pas `localhost`, il voit une prévisualisation Vercel |
| Rapport | Commentaire de pull request | Fichiers modifiés, écrans touchés et pourquoi, statut de chaque test, lien de replay |

Pourquoi GitHub Actions : le déclencheur et le diff sont gratuits, il n'y a aucun serveur ni webhook public à monter, et le rapport arrive là où l'équipe travaille déjà. Une application GitHub ou un webhook Vercel vers notre serveur serait plus propre pour un vrai produit : c'est pour la roadmap.

## Des fichiers aux fonctionnalités : les deux méthodes

1. **Déclaré, puis calculé (fait foi).**
   - Chaque note d'écran du vault déclare ses fichiers de code, par exemple dans son en-tête : `code: [faux-saas/app/[version]/factures/**]`.
   - Le graphe des imports propage ensuite le changement. Exemple : un fichier partagé comme `faux-saas/lib/data.ts` remonte à tous les écrans qui l'importent.
   - C'est ce qui répond à « une autre fonctionnalité a été touchée ».
2. **LLM (explique, ne décide pas).**
   - Il lit le diff et les notes, puis rédige en une phrase pourquoi un écran est touché.
   - Il peut proposer un écran oublié par la table, marqué « proposé par le LLM ». Cet écran n'est joué qu'après validation humaine.

## Limites connues

- Un diff ne voit pas tout : CSS global, configuration, données, backend. D'où le socle de tests joué à chaque déploiement.
- **Facturo n'a pas aujourd'hui deux versions de code.** v12 et v13 sont le même code, dont les changements s'activent par le paramètre `r`. Pour la démo, il faut de vrais commits. Exemple : un commit qui modifie le calcul du total dans `lib/data.ts`, visé pour la liste des factures, et qui casse aussi le « CA du mois » du tableau de bord. Format à décider par Nathan.
- Le pilote : il faudrait un accès à son dépôt et à ses déploiements. C'est peu probable cette semaine. La fonctionnalité se montre sur Facturo et se présente au pilote comme la suite.
- Limites de H : 3 sessions en même temps et 8 à 10 s par étape. Sélectionner peu de tests est justement l'argument.
- La scène en direct utilise le navigateur local (décision du 16/11). Le passage déclenché par un déploiement utilise le navigateur cloud. Les deux coexistent, à confirmer par Ali.
- L'approche est connue sous le nom de « sélection de tests de régression » (*regression test selection*, *test impact analysis*). Elle n'est pas neuve. Notre différence : les tests viennent de la documentation, et la correspondance écran ↔ code vit dans le vault.

## Questions ouvertes

- Ali : un fichier `.github/workflows/horama-regression.yml` à la racine, qui appelle le coureur existant ? Le coureur accepte-t-il une liste de tests et une URL de base ?
- Nathan : comment produire les commits de démo sur Facturo ?
- Inès : faut-il un champ `code` dans l'en-tête des notes d'écran ? Ce n'est pas un contrat gelé, mais c'est un format partagé.
- Qui écrit le script d'impact (diff, puis écrans, puis tests) : `automatisation/` (Nathan) ou `agent/` (Ali) ?
- Que retire-t-on du P0 en échange ? Proposition : F18 à F20 et F23.
