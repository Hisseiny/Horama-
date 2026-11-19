# Démo de vendredi : ce qui est en direct, ce qui est enregistré

Issue [#132](https://github.com/Hisseiny/Horama-/issues/132). Proposition de Noé du 19/11, **à valider par Nathan**. Ce fichier reprend le découpage des 6 minutes du commentaire de #132 (« Proposition : la vision produit en une seule diapositive »). Il y ajoute la règle d'Ali du 19/11 : à chaque moment, quelle preuve on montre, et si elle est en direct ou enregistrée.

Chaque chiffre dit à voix haute a sa source en bas de page. Une valeur non mesurée est écrite « à mesurer ».

## Pourquoi la preuve compte plus que le défaut

Bettenburg et ses coauteurs ont interrogé les développeurs et les utilisateurs d'Apache, Eclipse et Mozilla (466 réponses). D'après les développeurs :

- **les étapes pour reproduire** et les traces d'erreur sont ce qui les aide le plus ;
- des étapes fausses et des informations manquantes sont ce qui les gêne le plus.

L'étude montre aussi un écart entre ce dont les développeurs ont besoin et ce que les utilisateurs fournissent.

L'écart n'a pas disparu. Une étude récente a analysé les issues de 250 projets GitHub populaires. **27 % des rapports de bug en moyenne contiennent des étapes pour reproduire**, et plus de 70 % n'ont aucun des éléments importants.

Le client d'une PME écrit « ça marche pas ». Horama, lui, a fait le parcours : il connaît la page, le lien et ce qui en revient. Le chemin pour reproduire fait donc partie de la preuve, au lieu d'être une information que le développeur doit réclamer.

## L'échelle de la preuve (Ali, 19/11)

Chaque personne a sa question, à un moment différent :

| Qui | Sa question | Ce qu'il lui faut |
|---|---|---|
| Le chef de projet, le client | « Il y a vraiment un problème ? » | Comprendre en une seconde |
| Le développeur | « Comment je le reproduis ? » | Les étapes, en dix secondes |
| Le développeur sceptique | « Je ne crois pas Horama » | Une preuve qu'Horama n'a pas fabriquée |
| Après la correction | « C'est vraiment corrigé ? » | Ce qui se passe maintenant |

D'où une échelle, de la preuve la plus légère à la plus lourde. Chacun descend aussi bas qu'il en a besoin :

| Niveau | Ce qu'on montre | Coût | Quand | État au 19/11 |
|---|---|---|---|---|
| 1 | La capture, avec le défaut entouré | 0 | Toujours, en premier | Fait : récapitulatif de la scène, captures sur la PR (#122) |
| 2 | Le chemin pour reproduire, lu dans l'enregistrement du passage | 0, instantané | Un clic : « comment on arrive là ? » | **À construire.** Le mode d'arrivée de chaque page existe (`arrivee` : départ, clic ou adresse) ; le détail des étapes par page est à confirmer par Ali |
| 3 | Le lien public du replay H | 0, déjà payé | Un clic : « je veux vérifier moi-même » | Fait : `replay_url` dans le rapport de chaque passage |
| 4 | Un nouveau passage, en direct | Une session H, quelques centimes | Seulement pour prouver une correction | En cours : boucle « Fixes #N » de #199, correction de #196 |

Trois règles :

1. **Le plus simple d'abord, le reste à la demande.** Le chef de projet s'arrête à la capture, le développeur va jusqu'au chemin, le sceptique ouvre le replay H.
2. **Le coût suit le besoin.** Pour *montrer* ce qui s'est passé, l'enregistrement suffit : c'est gratuit et sans risque. Pour *vérifier* ce qui se passe maintenant, il faut le direct, parce que le site a pu changer. Relancer H seulement pour montrer prendrait une des 3 sessions du plan gratuit, du temps, et le risque d'une session figée devant le jury.
3. **Toujours dire si c'est enregistré ou en direct.** C'est la règle de #185 : ne jamais faire passer un enregistrement pour du direct. Une étiquette suffit : « Enregistré à 14 h 02 » ou « En direct ».

## Ce qu'on dit du 404, et ce qu'on ne dit pas

Le lien « journée portes ouvertes » d'Eugenia est trouvé ainsi :

- l'agent H arrive sur la page de l'article, et le lui fait défiler ;
- **le code** suit chaque lien interne (HTTP, puis un clic vérifié dans un onglet caché) et prouve que celui-ci répond 404 ;
- **H ne clique pas sur ce lien lui-même.**

Celui qui ouvre le replay H voit donc H sur l'article, pas H devant la page 404. À dire juste :

- **Oui** : « L'agent a parcouru le site, le code a prouvé que ce lien mène à une page 404, et voici le chemin pour le reproduire. »
- **Non** : « L'agent est tombé sur la 404 », ni « le replay montre le bug ».

Si Ali confirme que H peut cliquer le lien cassé pendant la démo (question ouverte, plus bas), la seconde formule devient vraie.

## Le déroulé (6 minutes)

| Temps | À l'écran | Ce qui est dit (Noé) | Direct ou enregistré | Ce qui doit marcher | Si ça ne répond pas |
|---|---|---|---|---|---|
| 0:00–0:40 | Le message d'un client : « ça marche pas » | « Un client écrit "ça marche pas". Le développeur a besoin des étapes pour reproduire. En moyenne, à peine plus d'un rapport de bug sur quatre les donne. » | Diapositive | Rien | Rien |
| 0:40–2:30 | Chrome : l'agent H parcourt le site, la mascotte se pose sur le lien, le trait l'entoure | « Un agent de H Company parcourt le site comme un visiteur : il lit, il défile, il clique. Ce lien mène à une page qui n'existe pas. Ce n'est pas l'IA qui le dit, c'est le code qui l'a vérifié. » | **En direct**, étiquette « En direct » | Le passage réel (`automatisation/demo/passage-reel.sh` ou la PR de #196) | Vidéo de secours (#134), annoncée comme enregistrée |
| 2:30–3:30 | Le récapitulatif : niveau 1 (capture entourée), puis un clic sur « Comment on arrive là ? » (niveau 2), puis le lien du replay H (niveau 3). L'humain répond « bug », le ticket s'ouvre | « Le chef de projet voit le défaut en une seconde. Le développeur a le chemin, en dix secondes. Et s'il ne nous croit pas, le replay est hébergé par H Company, pas par nous. Un humain tranche : c'est un bug. Le ticket part avec la preuve. » | **Enregistré**, étiquette « Enregistré à … » | Niveau 2 (à construire), ticket de #199 | Le chemin dit à l'oral sur la capture ; le replay seul |
| 3:30–4:30 | La correction est poussée ; nouveau passage sur les seules pages du ticket ; le résultat est vert ; le ticket se ferme | « La correction est en ligne. Est-ce vraiment corrigé ? Pour ça, on ne rejoue pas l'enregistrement : on repasse, maintenant. » | **En direct**, étiquette « En direct » | Boucle « Fixes #N » de #199 ; correction de #196 ; un passage court (voir plus bas) | Le passage vert de la répétition, annoncé comme enregistré |
| 4:30–5:10 | La confiance : faux défauts prouvés avant et après #162 | Chiffre à reprendre tel qu'il sera mesuré | Diapositive | #162 | Ne rien dire de chiffré |
| 5:10–5:30 | Diapositive « Et ensuite » | Phrase du commentaire de #132 | Diapositive | Rien | Rien |
| 5:30–6:00 | Conclusion | La phrase ci-dessous | Diapositive | Rien | Rien |

On garde la règle « pic-fin » (#185) : le moment fort est le défaut trouvé en direct (0:40), et la fin est la boucle qui se ferme (4:30). La vision ne passe qu'ensuite, en vingt secondes.

### Le passage de vérification doit être court

On a une minute, de 3:30 à 4:30. Les durées mesurées :

- 3 pages d'Eugenia en 63,4 s ;
- 8 pages, dont 4 par clic, en 211,6 s.

Il faut donc **ne rejouer que la ou les pages du ticket**, et non tout le site. À confirmer avec Ali : le moteur sait-il rejouer une seule page avec son lien ?

## La phrase du pitch

> « Horama ne vous dit pas seulement qu'il y a un bug. Il vous donne le chemin pour le reproduire, parce que son agent a fait le parcours, et la preuve, parce que le code l'a vérifié. »

C'est la version juste de la phrase d'Ali (« parce que c'est lui qui l'a fait ») : sur le lien cassé, c'est le code qui prouve, pas le clic de l'agent.

## Questions ouvertes

| Question | À qui | Pourquoi ça compte |
|---|---|---|
| Le temps fort se joue-t-il sur le site d'Eugenia en ligne (le 404 « portes ouvertes ») ou sur le clone (le bouton brochure de #196) ? | Nathan | Le site en ligne n'est pas à nous : on ne peut pas y pousser de correction. La boucle de 3:30 n'est possible que sur le clone |
| Les étapes de H peuvent-elles être rattachées à chaque page, pour le niveau 2 ? | Ali | Sans ça, le chemin se limite à « page de départ, puis page ouverte par clic ou par adresse » |
| H peut-il cliquer lui-même sur le lien cassé ? | Ali | Le replay montrerait alors la 404, et la phrase « il est tombé dessus » deviendrait vraie |
| Peut-on rejouer seulement les pages d'un ticket ? | Ali | Le passage de vérification doit tenir en une minute |
| L'étiquette « En direct » ou « Enregistré à … » dans la scène et le rapport | Nathan | Règle 3, sinon on la dit à voix haute |

## Sources

| Ce qui est dit | Source |
|---|---|
| Étapes pour reproduire et traces d'erreur : ce qui aide le plus les développeurs ; étapes fausses et informations manquantes : ce qui gêne le plus ; 466 réponses | N. Bettenburg, S. Just, A. Schröter, C. Weiss, R. Premraj, T. Zimmermann, *What Makes a Good Bug Report?*, FSE 2008, https://doi.org/10.1145/1453101.1453146 |
| 27 % des rapports de bug avec des étapes pour reproduire ; plus de 70 % sans aucun des éléments importants ; 250 projets GitHub, 835 381 issues | M. Soltani, F. Hermans, T. Bäck, *The significance of bug report elements*, Empirical Software Engineering, septembre 2020, https://doi.org/10.1007/s10664-020-09882-z (section 4.3 et discussion) |
| Le lien « portes ouvertes » en 404 | `docs/tests/2026-11-18-mode-visuel.md`, `docs/tests/2026-11-18-repetition-reelle.md` ; revérifié le 19/11 avec `curl -L` : `https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov` répond 404 |
| Le lien cassé prouvé par le code, pas par un clic de H | `agent/src/exploration/controles.ts` (requête HEAD puis GET, puis `verifierClic` dans un onglet caché) |
| Mode d'arrivée de chaque page | Champ `arrivee` de `agent/src/exploration/explorer.ts`, format `horama-exploration-1` (`docs/decisions/2026-11-17-format-exploration.md`) |
| Lien public du replay H | `agent/src/session.ts` (`POST /sessions/{id}/share`), champ `replay_url` du contrat C6 |
| 3 sessions H simultanées sur le plan gratuit ; sessions figées | `AGENTS.md`, « Ce qu'on sait déjà de l'API H » |
| 3 pages en 63,4 s | `docs/tests/2026-11-17-eugenia-en-ligne.md` |
| 8 pages, dont 4 par clic, en 211,6 s | `docs/tests/2026-11-18-a91-visite.md` |
| Règle d'honnêteté, règle « pic-fin » | Issue #185 |
| Découpage des 6 minutes | Commentaire de l'issue #132 |
