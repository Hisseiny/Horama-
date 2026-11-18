# A1 — Socle pnpm et paquet agent

Base : `origin/dev`, `5a4fbbdb1867bf4758c08e8387905167656efad1`.

Environnement : Linux, Node `22.23.5`, pnpm `12.18.0`.

Commandes exécutées : `pnpm install`, puis `pnpm -r check`.
Résultat : codes de sortie 0 ; types vérifiés dans les six paquets ;
tests réussis : faux SaaS 7, mémoire 28, jugement 12, agent 1, interface 8.
Les contrats ne possèdent qu'un contrôle TypeScript. Aucun script de lint
n'est défini dans les paquets existants ; aucun lint n'est donc revendiqué.

Le paquet agent est un squelette : import et réexport du type `CoureurAgent`,
test de chargement sans session. Aucun appel H ni orchestrateur implémenté.
Les champs des contrats gelés sont inchangés. Aucun hook Husky ou pre-commit
n'est présent. Dépendances de développement ajoutées : TypeScript `5.9.3`
pour les contrats et l'agent, et types Node `26.6.6` pour le test de l'agent.
