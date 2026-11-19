# Business model et go-to-market

Décidé par Noé le jeudi 19/11/2026, pour les slides 7 (business model), 8 (go-to-market) et 11 (coût de run) du deck de vendredi. Les prix ont reçu un avis favorable du CTO de Troov (rapporté par Noé le 19/11, sans citation écrite) ; aucun client ne les a encore payés. Une valeur inconnue est écrite « à mesurer ».

## Un produit, deux cibles

Horama est un seul produit. Il a deux cibles prioritaires, qui ont le même problème : **elles livrent vite, et personne ne vérifie derrière.**

| | Le CTO d'un SaaS | Le marketeur qui vibe-code |
|---|---|---|
| Qui | CTO d'un SaaS B2B d'une dizaine de développeurs, sans testeur ([persona Troov](persona-cto-troov.md)) | Il construit et met à jour le site de son entreprise lui-même, avec des outils d'IA, sans être développeur |
| Rythme | Une mise en production presque chaque semaine | Il publie dès qu'il a une idée |
| Douleur | Une amélioration sur une page en dégrade une autre, et personne ne regarde les autres pages | Un lien mort ou un texte coupé reste en ligne jusqu'à ce qu'un visiteur tombe dessus (le 404 des portes ouvertes d'Eugenia) |
| Ce qu'il veut d'Horama | Une réponse sur sa PR avant la mise en production, et une doc qui reste juste | Un contrôle après chaque publication, sans écrire un seul test |
| Combien il paierait | Avis favorable du CTO de Troov sur la grille (Noé, 19/11) | à mesurer |

Source des deux cibles : Noé, 19/11. Le marketeur qui vibe-code, c'est la responsable du site d'Eugenia ([persona](persona-responsable-site-eugenia.md)).

## L'unité facturée : le passage

Un **passage**, c'est l'agent H qui parcourt un site ou une application, jusqu'à 8 pages (le plafond actuel du service en ligne), puis rend ses défauts prouvés et ses doutes. C'est l'unité qu'on a mesurée :

| Passage mesuré | Pages | Durée | Coût | Source |
|---|---|---|---|---|
| Faux SaaS Facturo, 3 passages | 4 relevés | 64 à 88 s | 0,026 à 0,034 $ | [A5](../docs/tests/2026-11-17-a5-trois-passages-agent-h.md) |
| Tour du site d'Eugenia, 3 tours | 7 | 115 à 152 s | 0,0716 à 0,0739 $ | [Tour du site réel](../docs/tests/2026-11-17-tour-du-site-reel.md) |
| Visite de 15 pages sur eugeniaschool.com, 2 passages | 15 | 174 à 237 s | 0,0712 à 0,0745 $ | [Mode visuel](../docs/tests/2026-11-18-mode-visuel.md) |
| Visite par clics sur eugeniaschool.com | 8, dont 4 par clic | 211,6 s | 0,1030 $ | [Visite A91](../docs/tests/2026-11-18-a91-visite.md) |
| Visite par clics sur albertschool.com, interrompue | 1 sur 8 | 521,1 s | 0,1148 $ | [Visite A91](../docs/tests/2026-11-18-a91-visite.md) |
| Visite par clics sur eugeniaschool.com, première version du code | 8 | 317,5 s | 0,1875 $ | [Visite A91](../docs/tests/2026-11-18-a91-visite.md) |
| Visite par clics sur albertschool.com/fr, 2 passages | 8 | 278,6 à 280,8 s | 0,1411 à 0,1454 $ | [Rester sur le site](../docs/tests/2026-11-19-rester-sur-le-site.md) |
| Passage complet sur la PR #16 du clone d'Eugenia | 8 | 343 s | 0,2174 $ | [Langue et lecture](../docs/tests/2026-11-19-langue-et-lecture.md) |
| Visite avec contrôle du texte non traduit, finie | 8 | 434,5 s | 0,2680 $ (H et Holo) | [Texte non traduit](../docs/tests/2026-11-19-texte-non-traduit.md) |
| Même visite, interrompue | 4 sur 8 | 959,9 s | 0,5400 $ | [Texte non traduit](../docs/tests/2026-11-19-texte-non-traduit.md) |

Les passages courts (Facturo, 15 pages par adresse sans clic) ne représentent pas un passage complet d'aujourd'hui : avec les visites par clic et le plafond relevé à 380 s, un passage complet de 8 pages coûte plutôt entre 0,20 et 0,25 $ (Nathan, revue de #227). On retient donc **0,25 $ par passage** comme coût prudent, et **0,30 $** comme pire cas : un peu au-dessus du plus haut passage réussi (0,268 $). Un passage interrompu a coûté jusqu'à 0,54 $. Au-delà de 8 pages : à mesurer.

## La grille

Même produit, trois paliers. Chaque palier inclut des passages ; au-delà, on paie au passage.

| | Gratuit | Solo | Équipe |
|---|---|---|---|
| Prix | 0 € | 49 € par mois | 199 € par mois |
| Pour qui | Tout le monde, via l'extension Chrome | Le marketeur qui vibe-code | Le CTO d'un SaaS |
| Passages inclus | 3 par mois | 100 par mois | 200 par mois |
| Passage en plus | non | 0,50 € | 0,40 € |
| Ce qu'on a | Défauts prouvés et doutes à trancher, sur l'adresse donnée | En plus : la mémoire des décisions « bug ou voulu », une alerte après chaque publication | En plus : la documentation qui devient des tests, la réponse sur la PR GitHub, plusieurs projets et plusieurs personnes |

**Pourquoi ces prix.** 199 € reste sous Momentic Scale (500 $ par mois) et loin d'un contrat de QA géré. 49 € est au-dessus d'un simple vérificateur de liens (Dr. Link Check dès 13 $ par mois), parce qu'Horama visite le site comme un humain et prouve ce qu'il signale. À l'oral, on ne cite ces prix que si le jury les demande.

| Repère | Prix public | Source |
|---|---|---|
| Momentic Scale | 500 $ par mois, 500 $ d'usage inclus | momentic.ai/pricing, lu le 19/11 |
| TesterArmy | 99 $ par mois pour 250 passages | tester.army, lu le 19/11 |
| Dr. Link Check | à partir de 13 $ par mois | drlinkcheck.com/pricing, cité par le rapport marketing de Noé (19/11), non relu sur la page |
| QA Wolf en libre-service | 1 $ par passage web | testoptim.com, source secondaire, lue le 19/11 |

## Marge sur le coût de run

Calcul en comptant que tous les passages inclus sont consommés, à 0,25 $ (coût prudent) et à 0,30 $ par passage (pire cas mesuré) ; marge = (prix − coût) / prix. L'écart entre dollar et euro est ignoré (ordre de grandeur proche de 1).

| Palier | Prix | Coût de run maximal à 0,25 $ | Marge à 0,25 $ | Coût de run maximal à 0,30 $ | Marge à 0,30 $ |
|---|---|---|---|---|---|
| Gratuit | 0 € | 0,75 $ par utilisateur et par mois | coût d'acquisition | 0,90 $ par utilisateur et par mois | coût d'acquisition |
| Solo | 49 € | 100 × 0,25 = 25 $ | environ 49 % | 100 × 0,30 = 30 $ | environ 39 % |
| Équipe | 199 € | 200 × 0,25 = 50 $ | environ 75 % | 200 × 0,30 = 60 $ | environ 70 % |
| Passage en plus | 0,40 à 0,50 € | 0,25 $ | environ 38 à 50 % | 0,30 $ | environ 25 à 40 % |

Avec un passage court à 0,07 $ (15 pages d'eugeniaschool.com par adresse), la marge monte à environ 86 % sur Solo et 93 % sur Équipe ; mais ce n'est plus le passage complet qu'on vend.

**Pourquoi 200 passages pour Équipe.** Avec 500 passages inclus, le palier Équipe ne gardait qu'environ 37 % de marge à 0,25 $ par passage, et 25 % au pire cas. Noé a choisi le 19/11 de réduire les passages inclus à 200 par mois plutôt que de monter le prix : la marge revient à environ 75 %, et 70 % au pire cas. Le Solo reste le palier le plus serré (49 % à 0,25 $), tout comme le passage en plus.

Ces marges ne comptent que l'agent H et Holo. Restent à mesurer : le service Railway (payant depuis le 19/11), le support, le coût d'écriture d'un test par le modèle Hugging Face, et le prix de l'offre H payante (l'offre gratuite limite à 3 sessions simultanées).

## Go-to-market : l'extension Chrome gratuite

Un seul canal pour vendredi :

1. **L'extension Chrome gratuite.** On colle son lien, sans compte : 3 passages par mois.
2. **Le « waouh ».** Un vrai défaut prouvé sur son propre site, comme le 404 des portes ouvertes d'Eugenia.
3. **Le passage à Solo.** Le déclencheur : il veut un contrôle après chaque publication, pas seulement 3 fois par mois.
4. **Le passage à Équipe.** Le déclencheur : il veut la réponse sur la PR et sa documentation comme source des tests.

**Limite à assumer.** Le marketeur vient naturellement par l'extension. Le CTO aussi, s'il la lance sur son staging, mais aucun autre canal ne va le chercher. Les autres canaux (intégrations Lovable, v0 et Vercel, commentaire de PR GitHub, réseau Troov, contrôle gratuit envoyé à froid) vont dans la roadmap, pas dans le deck.

## Ce qui reste à mesurer

| Quoi | Pourquoi | Qui |
|---|---|---|
| Le coût d'un passage au-delà de 8 pages, avec le code actuel de `dev` | Un vrai site en a souvent plus ; c'est lui qui fixe le vrai pire cas | Ali |
| Le coût du service Railway | Payant depuis le 19/11 | Ali |
| Comment compter les 3 passages gratuits sans compte | Sans compte, rien ne les compte : compte léger, ou limite par extension installée | Nathan, Noé |
| Le coût d'écriture d'un test (Hugging Face) | Dernière case vide de la formule du coût de run | Leslie |
| Le prix de l'offre H payante | Nécessaire au-delà de 3 sessions simultanées | Ali |
| Le nombre de passages réellement consommés par un client | Les marges supposent le pire cas | Après le hackathon |
