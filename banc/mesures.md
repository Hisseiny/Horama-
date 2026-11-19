# Mesures d'Horama : ce qui est mesuré, avec sa source

Tâche 5.4 de la mission CDO. Relevé le 19/11 dans `docs/tests/` : **aucun chiffre n'est saisi à la main sans sa source**. Une valeur inconnue s'écrit « à mesurer ». `SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites.

Graphiques : `banc/graphiques/` (générés par `node banc/scripts/graphiques.mjs`). Rapport : `banc/rapport-pole-cdo.pdf` (régénéré par `node banc/scripts/rapport-pdf.mjs`, jamais édité à la main). Résultats du banc : `banc/resultats/passage-1.md`.

## 1. Le banc (Facturo, 18 cas, vérité écrite avant)

Passage 1 du 19/11, sans l'agent H : 4 bugs prouvés sur 13 (précision 4 sur 4), 5 changements voulus sur 5 envoyés à l'humain, 0 faux défaut prouvé, témoin propre. Détail : `banc/resultats/passage-1.md`.

## 2. Fiabilité : ce qu'Horama affirme

| Mesure | Valeur | Date | Source |
|---|---|---|---|
| Facturo, passage réel avec H : statuts | 2 défauts prouvés, 1 doute (le bouton « Exporter » déplacé, un changement voulu) | 17/11 | `docs/tests/2026-11-17-enquete-suspected.md` |
| Même passage rejoué après la décision « voulu » | 2 défauts prouvés, 0 doute, 1 conforme : la question n'est pas reposée | 17/11 | idem |
| « CA du mois » sur Facturo en ligne | `VERIFIED_FAIL`, « 1 240,00 ≠ 1 420,00, écart 180,00 » | 17/11 | `docs/tests/2026-11-17-c4-coureur.md` |
| Tour du site d'Eugenia en ligne | 3 tours, 21 relevés sur 21, 21 règles conformes, 0 pixel d'écart | 17/11 | `docs/tests/2026-11-17-tour-du-site-reel.md` |
| Vision (Holo), passage réel | 8 constats dont 6 faux (75 %) ; après filtre : 3 dont 1 faux (33 %), un seul passage, un seul site | 18/11 | `docs/tests/2026-11-18-a-holo-faux-constats.md` |
| Mode grand public, banc de 15 sites | 77 défauts prouvés, dont 27 faux (35 %) ; 10 à 16 doutes, aucun vrai | 18/11 | `docs/tests/2026-11-18-grand-public-banc.md` |
| Après le correctif des faux prouvés (#162), 6 sites avec H | avant : 37 défauts, 27 faux (73 %) ; après : 4 défauts prouvés dont 3 faux, 47 doutes | 19/11 | `docs/tests/2026-11-19-faux-prouves.md` |
| Clone d'Eugenia, PR #16 (allemand) | 8 pages sur 8, 4 défauts prouvés (2 distincts : un débordement compté 3 fois, #166), 2 doutes | 18/11 | `docs/tests/2026-11-18-passage-reel-pr16.md` |

**À dire honnêtement.** Sur un logiciel documenté (Facturo, Eugenia), les défauts prouvés étaient justes. En mode grand public, sur des sites inconnus, le taux de faux défauts prouvés était de 35 % le 18/11 ; le correctif du 19/11 en transforme la plupart en doutes, mais le dernier passage complet après correctif reste à faire.

## 3. Coût et durée d'un passage (agent H réel)

| Passage | Durée | Coût | Source |
|---|---|---|---|
| Facturo, 3 tests (3 passages) | 63,7 à 88,1 s | 0,026 à 0,034 $ | `docs/tests/2026-11-17-a5-trois-passages-agent-h.md` |
| Eugenia, tour de 7 pages (3 tours) | 115,1 à 151,5 s | 0,0716 à 0,0739 $ | `docs/tests/2026-11-17-tour-du-site-reel.md` |
| Eugenia, mode visuel, 15 pages | 173,7 à 237,0 s | 0,0712 à 0,0745 $ | `docs/tests/2026-11-18-mode-visuel.md` |
| Clone d'Eugenia, PR #16, 8 pages | 150 s | 0,0659 $ (note du passage) ou 0,0709 $ (scène) | `docs/tests/2026-11-18-passage-reel-pr16.md` |
| Eugenia, visite par clics, 8 pages | 211,6 s | 0,1030 $ | `docs/tests/2026-11-18-a91-visite.md` |
| Banc de 15 sites, total | 3 717 s (local) ; 3 809 s (conteneur) | 1,2799 $ ; 1,3782 $ | `docs/tests/2026-11-18-grand-public-banc.md` |

Les coûts de bancs différents ne sont pas toujours comparables : le banc de 7 sites compte Holo, celui de 15 sites non.

## 4. Écriture des tests et correction de la doc (modèle ouvert, Hugging Face)

| Mesure | Valeur | Date | Source |
|---|---|---|---|
| Tests générés (gpt-oss-120b) | 9 sur 9 au bon format, 9 sur 9 règles justes, 1,6 s, 0,0256 $ (3e essai) ; 1er essai : 8 sur 9, 16,3 s | 16 et 17/11 | `docs/tests/2026-11-17-t4-generation-rapide-3.md`, `2026-11-16-t4-generation.md` |
| Correction de la note après un « voulu » | 11/15, puis 14/15, 14/15, 15/15 sur 4 lancements | 17/11 | `docs/tests/2026-11-17-correction.md` |

## 5. Ce qui reste à mesurer

- Le banc Facturo **avec l'agent H** sur les 18 cas (le passage 1 est fait sans H : clics du script).
- Un passage complet du mode grand public après le correctif #162.
- Le coût d'écriture d'un test au prix réel du modèle par jeton.
- La comparaison avec des tests écrits à la main (temps humain), et « sans mémoire » contre « avec mémoire » sur plusieurs passages.
