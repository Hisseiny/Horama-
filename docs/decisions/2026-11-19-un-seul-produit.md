# Un seul produit, deux cibles prioritaires

Date : jeudi 19 novembre 2026. **Décidé par Noé** (CEO), en préparant le business model du deck de vendredi ([`pitch/business-model.md`](../../pitch/business-model.md)). Sur ce point, ce document remplace la section « Deux modes » du [recadrage du 18/11](2026-11-18-recadrage-grand-public-et-dev.md) ; le reste du recadrage (scène épurée, direction artistique, feuille de route) ne change pas.

## Ce qui change

- **Il n'y a plus deux modes.** Horama est un seul produit. Ce qu'on appelait « mode grand public » et « mode développeur » sont deux **entrées** du même produit :
  - **l'entrée par une adresse** : on colle l'adresse d'un site (page d'accueil ou extension Chrome), sans documentation ni accès au code ;
  - **l'entrée par une PR** : avec la documentation (vault) et GitHub, une PR réveille Horama, qui rejoue les tests et répond sur la PR.
- On commence par une adresse ; on va plus loin en branchant la documentation et GitHub. C'est le même produit, facturé au passage.
- **Deux cibles prioritaires, regroupées** : le CTO d'un SaaS sans testeur (persona Troov) et le marketeur qui vibe-code le site de son entreprise. Elles ont le même problème : elles livrent vite, et personne ne vérifie derrière.

## Pourquoi

- Deux modes donnent l'impression de deux produits, et brouillent le pitch et le business model.
- Les deux cibles n'achètent pas deux produits différents : elles achètent plus ou moins de passages et plus ou moins d'intégration (paliers Solo et Équipe du business model).

## Ce qui ne change pas

Le code et l'architecture : les deux entrées existent comme avant (`automatisation/reveil` pour la PR, le service d'exploration Railway pour l'adresse). Les identifiants de code (par exemple la valeur `mode: "dev"`) ne sont pas renommés. Seuls le récit et le vocabulaire changent.

## Ce qui reste à faire

- Les libellés visibles qui parlent encore de deux modes dans la page d'accueil (`accueil/`), la tour de contrôle (`automatisation/tour/`) et l'extension : à décider par leur propriétaire (Nathan).
- La fiche persona du marketeur qui vibe-code (Noé).
