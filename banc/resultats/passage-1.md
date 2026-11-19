# Banc, passage 1 : résultats (19/11)

Tâche 4.12 de la mission CDO.

## Ce qui a été lancé

- Commande : `node banc/scripts/passage-banc.mjs --vault-base <copie du vault> --travail <dossier>`, qui joue chaque cas seul (v13 avec `r=<id>`) par `automatisation/scene/parcours.mjs --sans-agent --sans-fin --sans-base`.
- **Sans l'agent H** : les clics sont faits par le script (CDP), au rythme d'un agent. Ce banc mesure donc la vérification d'Horama (relevés, règles calculées, comparaison aux références), pas la navigation de H.
- Site : https://facturo-demo.vercel.app (Facturo en ligne). Chrome headless, 1280 × 900.
- Références v12 reprises sur la même machine dans une copie du vault. Avec les références du vault (prises sur une autre machine), le rendu du texte différait et donnait 69 faux doutes sur un seul cas : les références doivent venir du même environnement que le passage.
- Aucune écriture dans `vault-horama/` ni dans la base. Coût : 0 $. Durée totale : 615 s pour 19 passages.
- Témoin (v13 sans changement, `r=aucun`) : 4 règles conformes, 0 défaut, 0 doute.

## Chiffres

| | Valeur |
|---|---|
| Bugs prouvés (`VERIFIED_FAIL`) | **4 sur 13** (rappel prouvé 31 %) |
| Bugs vus, prouvés ou envoyés à l'humain en doute | 9 sur 13 (69 %) ; les doutes ne comptent pas comme des réussites |
| Bugs manqués | 4 sur 13 |
| Précision des défauts prouvés | **4 sur 4 (100 %)** : aucun défaut prouvé faux |
| Changements voulus envoyés à l'humain | **5 sur 5** ; **0 faux défaut prouvé** |
| Doutes hors de la zone du cas (bruit) | 0 |
| Comparaison la plus simple, pixels bruts | 18 alertes sur 18 cas, dont 5 sur des changements voulus, sans distinguer bug et voulu |

## Cas par cas

| Cas | Nature | Verdict | Prouvés | Doutes | Pixels changés | Durée |
|---|---|---|---|---|---|---|
| `aucun` | témoin | témoin propre | 0 | 0 | 0 | 32.6 s |
| `ca-mois` | bug | bug prouvé | 1 | 1 | 387 | 34.4 s |
| `nombre-factures` | bug | bug vu comme doute | 0 | 1 | 183 | 35.2 s |
| `total-detail` | bug | bug prouvé | 2 | 1 | 59 | 36.7 s |
| `filtre-echeance` | bug | bug prouvé | 1 | 0 | 90674 | 39.6 s |
| `total-liste` | bug | bug prouvé | 1 | 1 | 71 | 36.4 s |
| `format-montant` | bug | bug manqué | 0 | 0 | 9 | 39.2 s |
| `format-date` | bug | bug vu comme doute | 0 | 1 | 534 | 34.9 s |
| `echeance-vide` | bug | bug vu comme doute | 0 | 1 | 481 | 35.8 s |
| `chevauchement-total` | bug | bug vu comme doute | 0 | 1 | 25099 | 34.7 s |
| `client-tronque` | bug | bug vu comme doute | 0 | 4 | 741 | 35 s |
| `centime-detail` | bug | bug manqué | 0 | 0 | 69 | 14.6 s |
| `arrondi-total-liste` | bug | bug manqué | 0 | 0 | 227 | 14.1 s |
| `echeance-decalee` | bug | bug manqué | 0 | 0 | 58 | 13.7 s |
| `export-haut` | voulu | voulu envoyé à l'humain | 0 | 1 | 1320 | 36.5 s |
| `colonne-renommee` | voulu | voulu envoyé à l'humain | 0 | 1 | 355 | 33.8 s |
| `bouton-nouvelle-facture` | voulu | voulu envoyé à l'humain | 0 | 1 | 5514 | 38.7 s |
| `titre-tableau-de-bord` | voulu | voulu envoyé à l'humain | 0 | 1 | 1795 | 34 s |
| `badge-statut-detail` | voulu | voulu envoyé à l'humain | 0 | 1 | 5148 | 35.2 s |

## Lecture

- **Ce qu'Horama prouve, il le prouve juste** : 4 défauts prouvés, 4 vrais bugs, tous des règles calculées (CA du mois, total de la liste, total du détail, filtre).
- **Les bugs manqués** sont ceux qu'aucune règle du vault ne couvre et qui changent très peu de pixels : `format-montant` (9 pixels), `centime-detail`, `arrondi-total-liste` et `echeance-decalee` (moins de 70 pixels). Les trois derniers sont les cas presque invisibles ajoutés exprès. Les attraper demande des règles de plus dans le vault (format des montants, égalité au centime près entre la liste et le détail, date d'échéance), pas un meilleur agent.
- **Les bugs vus comme doute** (affichage, chevauchement, nom tronqué, 3 au lieu de 4) sont envoyés à l'humain : c'est le comportement voulu tant qu'aucune règle ne les prouve.

## Limites

- Un seul passage par cas, sans H. Le banc avec l'agent H sur les 18 cas reste à faire (clé H, environ 0,03 $ par cas).
- Les cas sont ceux du faux SaaS : ils mesurent Horama sur un logiciel documenté, pas en mode grand public.
