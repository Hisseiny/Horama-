# Persona du mode développeur : le CTO de Troov

Rendu du mercredi 18/11 à 17 h, issue [#73](https://github.com/Hisseiny/Horama-/issues/73) (parcours utilisateur). Remplace la fiche « Le Développeur » proposée par Axil : on colle à un vrai SaaS, Troov, où travaille Noé. Le CTO n'est pas nommé ; aucun chiffre interne n'est donné. Ce qui vient de Noé est sourcé en bas de page ; ce qui n'est pas connu est écrit « à confirmer ».

## Profil

- CTO de Troov, SaaS B2B marseillais : des lieux (administrations, sites culturels, villes) l'utilisent avec leurs agents, et le grand public s'en sert de l'autre côté.
- Il dirige une équipe d'une dizaine de développeurs et code encore lui-même une partie du temps.
- Pas de QA dédiée : la vérification avant livraison se fait entre développeurs, puis par l'équipe produit sur l'environnement de staging.

## Contexte quotidien

- **Une mise en production presque chaque semaine.**
- **Un environnement de staging** sur lequel l'équipe produit teste à la main avant la mise en ligne.
- **Des tests côté développeurs**, dont l'étendue est à confirmer. Pas de tests de non-régression de bout en bout : l'équipe n'a ni le temps ni les moyens de les écrire et de les entretenir.
- **Une documentation coupée en deux** : Confluence pour les développeurs, Notion pour le produit et le service client. Aucune des deux ne dit à coup sûr ce que chaque écran doit afficher aujourd'hui.

## Objectifs

- Livrer chaque semaine sans casser ce qui marche déjà chez les clients.
- Savoir avant la mise en production qu'un écran a changé sans qu'on le veuille, y compris sur les écrans que personne n'a touchés.
- Couvrir les régressions sans recruter de QA ni écrire de tests à la main.
- Une documentation qui reste juste après chaque livraison.

## Frustrations

- **Les tests de non-régression coûtent plus que ce que l'équipe peut y mettre**, donc il n'y en a pas.
- **La recette manuelle sur le staging** dépend de ce que l'équipe produit pense à regarder : elle vérifie la page modifiée, rarement les autres.
- **Une amélioration sur une page en dégrade une autre.** Exemple vécu : le bouton d'export PDF a été amélioré sur une page et s'est dégradé sur d'autres pages où il apparaît aussi.
- **Deux documentations qui ne se parlent pas** : la règle connue du produit (Notion) n'est pas celle que lisent les développeurs (Confluence).
- **Devant un écran qui a changé, il ne sait pas tout de suite si c'est un bug ou un changement voulu.**

## Son parcours aujourd'hui

1. Un développeur améliore le bouton d'export PDF sur une page et ouvre sa PR.
2. Un autre développeur relit le code ; le déploiement part sur le staging.
3. L'équipe produit teste la page modifiée sur le staging : le bouton est mieux, c'est validé.
4. Mise en production de la semaine.
5. Les autres pages qui affichent le bouton se sont dégradées ; personne ne les a regardées. Le problème remonte plus tard, par un client ou par le service client.

## Son parcours avec Horama (mode développeur)

1. Les écrans et leurs règles sont décrits dans un vault Obsidian, une note par écran (aujourd'hui dans Confluence et Notion : la reprise de cette documentation est à construire).
2. La même PR part sur le staging. Horama rejoue les tests de **tous** les écrans qui montrent le bouton d'export, pas seulement celui qui a été modifié.
3. Le code compare ce qui est affiché à ce que dit la documentation et à la capture de référence : la page modifiée change comme prévu, les autres changent aussi.
4. Le CTO tranche dans le récapitulatif : sur la page modifiée, « voulu » ; sur les autres, « bug ». La décision est gardée pour le passage suivant et la documentation est mise à jour.
5. Le bug est corrigé avant la mise en production de la semaine.

## Ce qui est prouvé et ce qui ne l'est pas

| Ce que dit la fiche | État au 18/11 |
|---|---|
| La documentation devient des tests, un humain tranche « bug ou voulu », la décision est gardée | Construit et joué sur le site d'Eugenia, pas sur Troov (README, « Chiffres mesurés ») |
| Repérer qu'un écran non modifié a changé (capture comparée à la référence) | Construit, mesuré sur le site d'Eugenia (7 pages, 3 tours sur 3, 0 pixel d'écart avec les références) |
| Réveil automatique à chaque déploiement, réponse sur la PR | Pas construit ([#71](https://github.com/Hisseiny/Horama-/issues/71)) |
| Tourner sur le staging de Troov | Pas essayé. Si le staging demande une connexion, à construire : aujourd'hui Horama n'utilise jamais un formulaire de connexion |
| Vérifier le contenu du PDF exporté | Pas construit : Horama vérifie le bouton tel qu'il est affiché à l'écran, pas le fichier téléchargé (l'exploration écarte les PDF, `agent/src/exploration/explorer.ts`) |
| Reprendre la documentation depuis Confluence ou Notion | Pas construit : Horama lit un vault Obsidian |

## Sources

| Ce qui est dit | Source |
|---|---|
| Équipe d'une dizaine de développeurs, CTO qui code en partie, pas de temps ni de moyens pour la non-régression | Noé, salarié de Troov, 18/11 |
| Mise en production presque chaque semaine, staging testé à la main par le produit | Noé, 18/11 |
| Confluence pour les développeurs, Notion pour le produit et le service client | Noé, 18/11 |
| Exemple du bouton d'export PDF | Noé, 18/11 |
| Ce qu'Horama fait aujourd'hui | `README.md`, `docs/feuille-de-route.md`, `agent/src/consigne.ts` (pas de formulaire de connexion) |
