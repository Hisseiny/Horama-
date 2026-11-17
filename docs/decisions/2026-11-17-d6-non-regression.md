# D6 : tests de non-régression à chaque déploiement

Date : 17 novembre 2026. Proposé par Noé (CEO). **Décidé par Nathan (CAO) le 17/11 : option B, version réduite** (commentaire sur la PR #10). Mis à jour le soir même après le changement de cap vers le site d'Eugenia School (`docs/decisions/2026-11-17-deroule-demo-eugenia.md`).

## Décision

À chaque nouvelle version du site, Horama :

1. compare le code de la nouvelle version à celui de la précédente ;
2. en déduit les pages touchées, y compris celles que la modification ne visait pas ;
3. rejoue seulement les tests qui relèvent ces pages, plus un petit socle joué à chaque fois, et **montre à l'écran les tests qu'il écarte** ;
4. laisse l'humain trancher chaque écart (bug ou voulu), puis met le vault à jour.

## Comment ça marche pour la démo

| Étape | Qui le fait | Détail |
|---|---|---|
| Réveil | `automatisation/reveil/` (issue #36) | Sur le Mac de démo. Repli local d'abord : un commit qui touche le site réveille la scène. Un déploiement Vercel ne vient qu'après l'accord de l'école |
| Diff et sélection | `automatisation/impact/impact.mjs` (J6b, fait) | Compare les fichiers modifiés au champ `code:` des notes d'écran et aux fiches de changement. Écrit le fichier `horama-impact-1` : tests retenus, tests écartés, raison de chacun (`docs/decisions/2026-11-17-format-impact.md`) |
| Annonce | La scène (`--impact`, fait) | La mascotte dit avant le parcours : « Nouvelle version (…) : 1 test rejoué, 1 écarté : page non touchée. » |
| Passage | Agent H, Chrome local de la scène | Seuls les tests retenus sont joués |
| Rapport | La scène | Récapitulatif, images avant et après, décision humaine |

**Pas de GitHub Action pour la démo** : une Action tourne sur un serveur de GitHub et ne peut pas piloter le Chrome local de la scène.

## Des fichiers aux pages

- Chaque note d'écran du vault déclare ses fichiers de code dans le champ `code:` de son en-tête, entre guillemets (fait sur Facturo, PR #24 d'Inès).
- Comme il n'y a pas de graphe des imports, une note liste aussi les fichiers communs qu'elle utilise. Sinon, un changement d'un fichier partagé ne déclencherait aucun test.
- Pour le site d'Eugenia, `code: []` reste vide tant que l'école n'a pas donné accès au dépôt (`docs/decisions/2026-11-17-fork-eugenia.md`). En attendant, ce sont les fiches de changement (`ecrans_vises`, `ne_doit_pas_changer`) qui désignent les pages touchées.
- Ni graphe des imports ni LLM pour l'instant.

## Ce qui reste dans le P0

La comparaison d'images (F18 à F20, F23) reste dans le P0 : elle est déjà construite et marche dans la scène.

## Roadmap du pitch (pas construit cette semaine)

- Une GitHub Action déclenchée par chaque déploiement de prévisualisation, en navigateur cloud de H.
- Le rapport en commentaire de la pull request.
- Le graphe des imports, pour ne plus déclarer à la main les fichiers communs.
- Un LLM qui explique en une phrase pourquoi une page est touchée, et propose une page oubliée (jouée seulement après validation humaine).

## Limites connues

- Un diff ne voit pas tout : CSS global, configuration, contenu venu d'un CMS (les textes du site d'Eugenia viennent de Sanity, pas du code). D'où le socle joué à chaque fois (`automatisation/impact/socle.json`, vide pour Eugenia aujourd'hui ; le test « tour du site » de l'issue #42 est prévu pour ça).
- L'approche est connue sous le nom de « sélection de tests de régression » (*regression test selection*, *test impact analysis*). Elle n'est pas neuve. Notre différence : les tests viennent de la documentation, et le lien entre les pages et le code vit dans le vault.
- Facturo est abandonné (décision de Nathan du 17/11, 17 h 54) : les « vrais commits de démo sur Facturo » prévus ici ne se font pas. Le commit de démo se fait sur le site d'Eugenia (temps 2 du déroulé).

## Questions ouvertes

- Ali (issue #36) : le réveil appelle-t-il la scène quand aucun test n'est retenu ?
- Nathan : quel test va dans le socle d'Eugenia (`socle.json`) ?
- Noé et Axil : écrire les notes d'écran d'Eugenia, sans lesquelles aucune règle de page n'existe.
