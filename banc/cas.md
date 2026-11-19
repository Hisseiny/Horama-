# Banc de mesure d'Horama : les cas et leur vérité

Tâche 3.9 de la mission CDO. Ce fichier est **généré** par `node banc/scripts/ecrire-cas.mjs` à partir de `faux-saas/verite.json` : il n'y a rien à recopier à la main.

## D'où vient la vérité

- Le logiciel testé est Facturo, le faux SaaS de l'équipe (`faux-saas/`), en version 12 (référence) et 13 (testée).
- Chaque changement de la v13 s'active seul avec le paramètre `r=<id>` de l'adresse d'entrée.
- La vérité (bug ou voulu, écran, zone) a été écrite **avant toute mesure** : le 16/11 par le CAO (15 changements), puis le 17/11 par la CDO (3 bugs presque invisibles : `centime-detail`, `arrondi-total-liste`, `echeance-decalee`). Le premier passage du banc date du 19/11.
- Les pixels changés viennent de `faux-saas/positions.json`, mesurés par `faux-saas/scripts/verifier-regressions.mjs` (v13 avec ce seul changement contre v13 sans changement).

## Composition

| | Nombre |
|---|---|
| Bugs (régressions) | 13 |
| dont entre deux écrans | 5 |
| dont presque invisibles à l'œil (moins de 100 pixels changés) | 5 |
| Changements voulus | 5 |
| dont qui contredisent la doc | 2 |
| **Total** | **18** |

Écart avec la mission : elle demandait environ 10 régressions et 5 voulus, un écran avec les deux, et 5 notes de version. Le banc a 13 régressions et 5 voulus ; la liste des factures porte les deux. Une seule note de version existe dans le vault (`facturo/notes-de-version/`) : les 4 autres sont à écrire.

## Les 13 bugs

| Cas | Écran | Ce qui change en v13 | Entre écrans | Contredit la doc | Actif par défaut | Pixels changés |
|---|---|---|---|---|---|---|
| `ca-mois` | Tableau de bord | La carte « CA du mois » affiche 1 240,00 € au lieu de 1 420,00 €, le total de la liste des factures. | oui |  | oui | 387 |
| `nombre-factures` | Tableau de bord | La carte « Factures du mois » affiche 3 alors que la liste des factures compte 4 lignes. | oui |  |  | 183 |
| `total-detail` | Détail facture | Sur la facture F-119, « Total TTC » affiche 460,00 € alors que la liste affiche 480,00 € (les lignes du détail ne changent pas). | oui |  |  | 59 |
| `filtre-echeance` | Liste des factures | Le filtre « Échéance dépassée » affiche aussi la facture F-120, dont l'échéance n'est pas passée. |  |  | oui | 90674 |
| `total-liste` | Liste des factures | La ligne « Total » de la liste affiche la somme des lignes moins 20,00 € (1 400,00 € au lieu de 1 420,00 €). |  |  |  | 71 |
| `format-montant` | Liste des factures | Le montant de la facture F-119 s'affiche avec un point à la place de la virgule. |  |  |  | 9 |
| `format-date` | Liste des factures | L'échéance de la facture F-121 s'affiche au format AAAA-MM-JJ au lieu de JJ/MM/AAAA. |  |  |  | 534 |
| `echeance-vide` | Liste des factures | La case Échéance de la facture F-118 est vide. |  |  |  | 481 |
| `chevauchement-total` | Liste des factures | Le bloc sous le tableau remonte et recouvre en partie la ligne « Total » (le texte de la page ne change pas). |  |  |  | 25099 |
| `client-tronque` | Liste des factures | Les noms de la colonne Client sont coupés à 60 px avec des points de suspension (le texte de la page ne change pas). |  |  |  | 741 |
| `centime-detail` | Détail facture | Sur la facture F-119, « Total TTC » affiche 480,01 € : un centime de plus que la somme des lignes (300,00 € + 180,00 €) et que la liste. | oui |  |  | 69 |
| `arrondi-total-liste` | Liste des factures | La ligne « Total » de la liste affiche 1 419,99 € au lieu de 1 420,00 € : un centime de moins que la somme des lignes et que le CA du mois. | oui |  |  | 227 |
| `echeance-decalee` | Liste des factures | L'échéance de la facture F-119 s'affiche un jour plus tard (13/11/2026 au lieu de 12/11/2026) : le format reste bon, seule l'image change. |  |  |  | 58 |

## Les 5 changements voulus

| Cas | Écran | Ce qui change en v13 | Entre écrans | Contredit la doc | Actif par défaut | Pixels changés |
|---|---|---|---|---|---|---|
| `export-haut` | Liste des factures | Le bouton « Exporter » quitte le bas du tableau pour le haut à droite, au-dessus du tableau. |  | oui | oui | 1320 |
| `colonne-renommee` | Liste des factures | L'en-tête de colonne « Client » devient « Société ». |  | oui |  | 355 |
| `bouton-nouvelle-facture` | Liste des factures | Un bouton « Nouvelle facture » apparaît en haut du tableau, à gauche de l'emplacement haut du bouton « Exporter ». |  |  |  | 5514 |
| `titre-tableau-de-bord` | Tableau de bord | Le titre du tableau de bord devient « Vue d'ensemble ». |  |  |  | 1795 |
| `badge-statut-detail` | Détail facture | Le badge « En attente de paiement » du détail passe d'un contour à un fond plein. |  |  |  | 5148 |

## Ce qu'on attend d'Horama sur chaque cas

| Nature du cas | Bonne réponse | Acceptable | Mauvaise réponse |
|---|---|---|---|
| Bug | défaut prouvé (`VERIFIED_FAIL`) | doute envoyé à l'humain (`SUSPECTED`) | rien vu |
| Voulu | doute envoyé à l'humain, qui répond « voulu » | rien vu (si rien n'est attendu à l'écran) | **défaut prouvé** : c'est une fausse alarme |

`SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites (règle de l'équipe) : dans les chiffres, un bug vu comme doute n'est pas un bug prouvé.

## Cas cachés

Règle du pôle : ce dossier ne se lit pas quand on travaille pour le CTO ou la CAIO (`AGENTS.md`), pour que les consignes de l'agent et de génération des tests ne soient pas écrites en regardant les réponses.
