# Persona : la responsable du site d'Eugenia School (cas réel de la cible « marketeur qui vibe-code »)

Rendu du mercredi 18/11 à 17 h, issue [#73](https://github.com/Hisseiny/Horama-/issues/73) (parcours utilisateur). Seconde persona, à côté du [CTO de Troov](persona-cto-troov.md). Depuis le 19/11, Horama est un seul produit pour deux cibles prioritaires, le CTO d'un SaaS et le marketeur qui vibe-code le site de son entreprise ([décision](../docs/decisions/2026-11-19-un-seul-produit.md)) ; elle ne code pas, mais son cas est celui de la seconde cible. Elle n'est pas nommée. Ce qui vient de Noé est sourcé en bas de page ; ce qui n'est pas mesuré est écrit « à mesurer ».

## Profil

- Elle est en charge du site internet d'Eugenia School, côté marketing.
- Elle fait tout sur le site : les textes, les articles du blog, les événements, les mises à jour de pages.
- Le site n'est qu'une partie de son travail : elle a peu de temps à lui consacrer, et personne pour le relire derrière elle.

## Contexte quotidien

- **Un site riche et vivant** : formations, campus, admissions, un blog, des événements qui passent (portes ouvertes, webinaires).
- **Pas de tests** : rien ne vérifie le site après une modification, à part ce qu'elle a le temps de regarder.
- **Les défauts lui arrivent de partout à la fois** : un étudiant, un parent, un collègue, ou personne.
- **Un site appelé à changer de langue ou de texte** : chaque texte plus long qu'avant peut casser la mise en page, faire déborder un bouton ou le rendre illisible.

## Objectifs

- Savoir ce qui est cassé sur le site avant qu'un futur étudiant tombe dessus.
- Être aidée pour les tests sans y passer de temps et sans compétence technique.
- Une liste courte de vrais défauts, prouvés, qu'elle peut corriger ou transmettre.
- Modifier ou traduire le site sans craindre de casser des pages qu'elle n'a pas regardées.

## Frustrations

- **Des défauts restent en ligne sans qu'elle le sache.** Exemple réel, toujours en ligne le 18/11 à 16 h : l'article « Fin de Parcoursup » invite aux portes ouvertes du 12 décembre, mais le lien mène à une page qui n'existe pas (erreur 404). Elle ne le sait probablement pas.
- **Elle ne peut pas relire tout le site à chaque modification** : elle vérifie la page qu'elle a touchée, pas les autres.
- **Un texte qui change peut casser le design** : un mot plus long fait déborder un bouton ou couper un texte, et rien ne la prévient.
- **Les outils de test sont faits pour des développeurs** : il faut écrire des scripts, ce qu'elle n'a ni le temps ni le métier de faire.

## Son parcours aujourd'hui

1. Elle publie un article ou met à jour une page.
2. Elle vérifie la page modifiée, si elle a le temps.
3. Un lien mort ou un texte coupé ailleurs sur le site reste en ligne.
4. Elle l'apprend quand quelqu'un le lui signale, ou jamais.

## Son parcours avec Horama (entrée par une adresse)

1. Elle est sur une page du site, dans Chrome, et lance Horama. Pas de documentation à écrire, pas d'accès au code.
2. Un agent H parcourt le site comme un visiteur : il clique, il lit, il suit les liens.
3. Pendant le parcours, elle ne voit que le curseur qui clique, la mascotte et un trait à la main sur ce qui cloche.
4. À la fin, le récapitulatif : ce que le code prouve (un lien en 404) est un défaut ; ce que l'IA croit voir (un texte qui semble coupé) reste un doute, qu'elle tranche : bug ou voulu.
5. Elle corrige, ou transmet la liste avec les captures. Horama garde ses décisions pour le passage suivant.

## Le test qui la concerne : le site traduit en allemand

On a recréé le site d'Eugenia (le clone d'Ali, `Hisseiny/eugenia-school-website`) et on le traduit en allemand, une langue aux mots longs, pour pousser le design à bout. Horama le parcourt à partir de sa seule adresse et montre ce qui casse.

| Ce qu'on cherche | Comment Horama le voit | État au 18/11 |
|---|---|---|
| Texte coupé ou qui déborde d'un bouton | Le code mesure le texte qui sort de sa boîte (débordement) ; l'IA signale ce qui semble coupé | Construit : sur des pages d'essai, les 4 débordements plantés sont trouvés et aucun faux ; sur 4 sites réels (dont Eugenia), aucun faux, mais aucun vrai débordement n'y existait. Jamais essayé sur une page traduite |
| Bouton ou lien qui ne mène plus nulle part | Le code suit chaque lien et lit la réponse finale | Construit et prouvé sur le site d'Eugenia en ligne (le lien des portes ouvertes en 404, à chaque passage) |
| Bouton introuvable sous son nom allemand | L'agent H cherche le bouton à l'écran | Jamais essayé en allemand |
| « La plupart des boutons ne marchent pas en allemand » | | À mesurer : la version allemande n'existe pas encore ; qui la fait et quand est à déterminer |

## Ce qui est prouvé et ce qui ne l'est pas

| Ce que dit la fiche | État au 18/11 |
|---|---|
| Un agent H parcourt le site seul, sans documentation | Construit, joué sur eugeniaschool.com : 15 pages, 174 à 237 s, environ 0,07 $ par passage |
| Les défauts prouvés par le code | 2 vrais défauts sur 8 constats au premier passage (le lien en 404, un chapô d'article coupé) ; les 6 faux venaient tous de l'IA, d'où leur place parmi les doutes |
| L'écran épuré (curseur, mascotte, trait à la main) | En cours ([#69](https://github.com/Hisseiny/Horama-/issues/69)) |
| Lancer Horama depuis l'onglet ouvert (extension Chrome) | En cours ([#68](https://github.com/Hisseiny/Horama-/issues/68)) |
| Marcher sur n'importe quel site | À prouver ([#67](https://github.com/Hisseiny/Horama-/issues/67)) |
| Tout le site, et pas 15 pages | 15 pages sur le plan gratuit de H ; tout le site en production, à mesurer |

## Sources

| Ce qui est dit | Source |
|---|---|
| Elle fait tout sur le site, a peu de temps, apprend les défauts de partout ; elle ne connaît probablement pas le 404 | Noé, 18/11 |
| Le choix de l'allemand (mots longs qui font sauter le design) | Noé, 18/11 |
| Lien des portes ouvertes en 404 | `docs/tests/2026-11-18-mode-visuel.md` ; revérifié le 18/11 à 16 h 12 : `https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov` répond 404 |
| 15 pages, durée, coût, 2 vrais défauts sur 8 | `docs/tests/2026-11-18-mode-visuel.md` |
| Règle du débordement et suivi des liens | `docs/tests/2026-11-18-a67-controles.md` |
| Le clone du site d'Eugenia | Issue [#71](https://github.com/Hisseiny/Horama-/issues/71) |
| Accord de l'école pour montrer ses défauts | Donné, d'après Noé, 18/11 |
