# Format de sortie du mode visuel (`horama-exploration-1`)

Date : 17 novembre 2026. Couloir Nathan. Issue [#57](https://github.com/Hisseiny/Horama-/issues/57) : le moteur du mode visuel (Ali, `agent/`) écrit ce fichier ; la scène (Nathan, `automatisation/scene/`) le lit et l'affiche. Déroulé à rendre possible : les 5 temps du mode visuel, validés par Nathan (`docs/decisions/2026-11-17-deroule-demo-eugenia.md`, seconde partie). **Aucun contrat de `contrats/` ne change.**

## Principes

1. **Un seul fichier qui grandit pendant le passage.** Le moteur le réécrit à chaque changement (page commencée, page finie, constat trouvé, agent tombé), en écrivant d'abord `exploration.json.tmp` puis en le renommant : la scène ne lit jamais un fichier à moitié écrit. Elle le relit toutes les 500 ms pendant les temps 2 et 3, et une dernière fois quand `etat` n'est plus `en_cours`. Pas de second canal.
2. **Un constat a la forme du `Constat` de `jugement/verification`** (celui que la scène affiche déjà en mode développeur : `id`, `ecran`, `vue`, `statut`, `description`, `textes_a_surligner`, `zone`, `zone_avant`, `pixels`, `page`, `raison`, `decision_id`, `explique_par`), plus cinq champs : `source`, `sorte`, `preuve`, `capture`, `agent`. La scène réutilise ses traits, son récapitulatif, ses questions bug ou voulu et l'écriture des décisions.
3. **Le statut dit le niveau de preuve, jamais le contraire** :

| Source | Ce que c'est | Statut |
|---|---|---|
| `controle` | Contrôle mécanique par CDP, déterministe | `VERIFIED_FAIL` |
| `accessibilite` | Règle WCAG à seuil (issue [#55](https://github.com/Hisseiny/Horama-/issues/55), plus tard) | `VERIFIED_FAIL` |
| `holo` | Ce que Holo voit sur la capture | `SUSPECTED`, toujours |
| `comparaison` | Écart d'image avec la référence de la page (passage suivant) | `SUSPECTED`, ou `PASS` si une décision « voulu » le neutralise (`decision_id`) |
| n'importe laquelle | Un regard qui n'a pas pu se faire sur une page (Holo hors délai, page non visitée, contrôle en échec) | `INCONCLUSIVE`, avec `raison` |

`SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites. Une page sans aucun constat est `PASS`.

## Où le moteur écrit

- `<sortie>/exploration.json` : le fichier décrit ici. `<sortie>` est passé au moteur (`--sortie`), comme pour la scène.
- `<sortie>/captures/<ecran>.png` : la capture de chaque page (1280 × 900, DPR 1, pointeur écarté, comme les relevés de la scène).
- `<sortie>/captures/<id du constat>.png` : seulement pour un constat dont l'élément est hors de la capture de la page ; le moteur fait défiler jusqu'à lui et capture à nouveau.
- Mémoire du site : `vault-horama/<site>/`, séparé du vault du mode développeur (`vault-horama/eugenia/` reste celui des tests écrits). Au premier passage, le moteur y crée `produit/<ecran>.md` (en-tête `ecran`, `url`, `zones_ignorees: []`, sans texte) et `references/<ecran>/defaut--v1.png`. Les décisions vont dans `decisions/`, comme en mode développeur.

## Identifiants

- `site` : l'hôte de l'adresse, sans `www.`, points remplacés par des tirets. `https://www.eugeniaschool.com` donne `eugeniaschool-com`. Il sert de `logiciel` partout (base, C4, C5, vault).
- `ecran` : le chemin de la page. `/` donne `accueil` ; sinon les segments du chemin, en minuscules, sans accents, joints par des tirets (`/programme/bachelor-ia-business` donne `programme-bachelor-ia-business`), 60 caractères au plus. Deux chemins qui donnent le même identifiant : le second prend `-2`. Paramètres et ancre retirés.
- `vue` : toujours `defaut`.
- `id` d'un constat : `<ecran>--<source>--<n>`, `n` à partir de 1 dans l'ordre où le moteur le trouve. Stable dans un passage.
- `version` : le rang du passage sur ce site (`"1"` au premier, `"2"` au suivant…). `version_reference` : la version des références comparées, `null` au premier passage.

## Le fichier (JSON, UTF-8)

Exemple écrit à la main pour montrer la forme, **pas une mesure** : passage suivant (version 2) à trois agents, en cours.

```json
{
  "format": "horama-exploration-1",
  "etat": "en_cours",
  "passage_id": "2026-11-18-10h00-ab12",
  "adresse": "https://www.eugeniaschool.com",
  "site": "eugeniaschool-com",
  "version": "2",
  "version_reference": "1",
  "le": "2026-11-18T10:00:00.000Z",
  "fin": null,
  "duree_s": null,
  "cout_usd": null,
  "trouvees": {
    "par": "sitemap",
    "plafond": 15,
    "nombre": 12,
    "exclues": [{ "url": "https://www.eugeniaschool.com/candidater", "raison": "formulaire" }]
  },
  "agents": [
    { "agent": 1, "session_id": "…", "etat": "en_cours", "pages": ["accueil", "faq"], "replay_url": null, "duree_s": null, "cout_usd": null, "raison": null },
    { "agent": 2, "session_id": "…", "etat": "fini", "pages": ["programme-bachelor-ia-business"], "replay_url": "https://…", "duree_s": 0, "cout_usd": 0, "raison": null },
    { "agent": 3, "session_id": null, "etat": "tombe", "pages": [], "replay_url": null, "duree_s": null, "cout_usd": null, "raison": "session figée à la première étape" }
  ],
  "pages": [
    {
      "ecran": "accueil",
      "url": "https://www.eugeniaschool.com/",
      "ordre": 1,
      "trouvee_par": "adresse",
      "agent": 1,
      "etat": "visitee",
      "http": 200,
      "debut": "2026-11-18T10:00:12.000Z",
      "fin": "2026-11-18T10:00:31.000Z",
      "capture": { "fichier": "captures/accueil.png", "url": null, "largeur": 1280, "hauteur": 900, "defilement": [0, 0] },
      "reference": { "fichier": "vault-horama/eugeniaschool-com/references/accueil/defaut--v1.png", "version": "1" },
      "holo": { "etat": "fait", "modele": "holo4-27b", "duree_ms": 0, "ecartes_sans_zone": 0 },
      "statut": "VERIFIED_FAIL"
    },
    {
      "ecran": "faq",
      "url": "https://www.eugeniaschool.com/faq",
      "ordre": 7,
      "trouvee_par": "sitemap",
      "agent": 1,
      "etat": "a_visiter",
      "http": null, "debut": null, "fin": null, "capture": null,
      "reference": { "fichier": "vault-horama/eugeniaschool-com/references/faq/defaut--v1.png", "version": "1" },
      "holo": null,
      "statut": null
    }
  ],
  "constats": [
    {
      "id": "accueil--controle--1",
      "ecran": "accueil",
      "vue": "defaut",
      "source": "controle",
      "sorte": "debordement",
      "statut": "VERIFIED_FAIL",
      "description": "Le texte du bouton « APPLY NOW → » dépasse de son bouton.",
      "textes_a_surligner": ["APPLY NOW →"],
      "zone": { "x": 48, "y": 788, "largeur": 165, "hauteur": 61 },
      "preuve": { "element": "a.btn-primary", "mesure": "contenu 212 px de large", "attendu": "boîte de 165 px au plus" },
      "capture": "captures/accueil.png",
      "agent": 1,
      "page": { "largeur": 1280, "hauteur": 900 }
    },
    {
      "id": "accueil--holo--1",
      "ecran": "accueil",
      "vue": "defaut",
      "source": "holo",
      "sorte": "texte-coupe",
      "statut": "SUSPECTED",
      "description": "Le texte du bouton semble coupé à droite.",
      "textes_a_surligner": [],
      "zone": { "x": 40, "y": 780, "largeur": 180, "hauteur": 75 },
      "preuve": { "modele": "holo4-27b", "phrase": "…" },
      "capture": "captures/accueil.png",
      "agent": 1,
      "explique_par": "accueil--controle--1"
    },
    {
      "id": "accueil--comparaison--1",
      "ecran": "accueil",
      "vue": "defaut",
      "source": "comparaison",
      "sorte": "changement",
      "statut": "SUSPECTED",
      "description": "Quelque chose a changé ici depuis la version 1.",
      "textes_a_surligner": [],
      "zone": { "x": 48, "y": 788, "largeur": 165, "hauteur": 61 },
      "nature": "changement",
      "pixels": 0,
      "preuve": { "reference": "vault-horama/eugeniaschool-com/references/accueil/defaut--v1.png" },
      "capture": "captures/accueil.png",
      "agent": 1
    }
  ],
  "totaux": { "pages_trouvees": 12, "pages_visitees": 1, "defauts": 1, "doutes": 1, "sans_conclusion": 0, "par_sorte": { "debordement": 1, "texte-coupe": 1, "changement": 1 } }
}
```

### Le passage

| Champ | Type | Sens |
|---|---|---|
| `format` | `"horama-exploration-1"` | Obligatoire. La scène refuse tout autre format (sortie 2) |
| `etat` | `"en_cours"`, `"fini"`, `"interrompu"` | `interrompu` : arrêt avant la fin (Ctrl+C, plus d'agent en état de travailler) ; les pages non visitées sont alors `non_visitee` avec leur raison |
| `passage_id` | texte | Même forme qu'en mode développeur (`AAAA-MM-JJ-HHhMM-xxxx`), même ligne `passages` en base |
| `adresse` | texte | L'adresse collée, telle quelle |
| `site` | texte | Voir « Identifiants » |
| `version`, `version_reference` | texte, texte ou `null` | Voir « Identifiants ». `version_reference: null` dit à la scène que c'est le premier passage (temps 5 : rien à comparer, « j'ai gardé les captures ») |
| `le`, `fin` | texte ISO 8601, ou `null` | Début et fin du passage |
| `duree_s`, `cout_usd` | nombre ou `null` | Rendus à la fin : durée de bout en bout, somme des coûts rendus par H pour toutes les sessions du passage |
| `trouvees` | objet | `par` : `"sitemap"` ou `"liens"` ; `plafond` ; `nombre` : pages gardées ; `exclues` : `{ url, raison }` (`formulaire`, `pdf`, `connexion`, `robots.txt`, `autre domaine`, `au-delà du plafond`) |
| `agents` | liste | Un par agent H (1 à 3), voir ci-dessous |
| `pages` | liste | Une par page gardée, dans l'ordre du plan du site (`ordre`), voir ci-dessous |
| `constats` | liste | Tous les constats, dans l'ordre où ils sont trouvés, voir ci-dessous |
| `totaux` | objet | `pages_trouvees`, `pages_visitees`, `defauts` (`VERIFIED_FAIL`), `doutes` (`SUSPECTED` sans `explique_par`), `sans_conclusion` (`INCONCLUSIVE`), `par_sorte` (nombre de constats par `sorte`) |

### Un agent (temps 2)

| Champ | Type | Sens |
|---|---|---|
| `agent` | 1, 2 ou 3 | Numéro affiché à l'écran (fenêtre Chrome de cet agent) |
| `session_id` | texte ou `null` | Session de l'Agents API ; `null` si elle n'a pas pu être créée |
| `etat` | `"en_attente"`, `"en_cours"`, `"fini"`, `"tombe"` | `tombe` : session figée, refusée ou en erreur ; ses pages repassent aux autres agents (leur `agent` change dans `pages`) |
| `pages` | liste d'`ecran` | Pages que cet agent a visitées ou visite, dans son ordre |
| `replay_url` | texte ou `null` | Lien de partage H de sa session |
| `duree_s`, `cout_usd` | nombre ou `null` | De sa session |
| `raison` | texte ou `null` | Pour `tombe` : une phrase courte, dite à l'écran |

À un agent, la liste a un seul élément. La scène ne dépend pas du nombre d'agents.

### Une page (temps 2 et 3)

| Champ | Type | Sens |
|---|---|---|
| `ecran`, `url`, `ordre` | texte, texte, nombre | Identifiant, adresse complète, rang dans le plan du site |
| `trouvee_par` | `"adresse"`, `"sitemap"`, `"lien"` | |
| `agent` | nombre ou `null` | Agent qui l'a visitée ou la visite ; `null` tant qu'elle n'est pas attribuée |
| `etat` | `"a_visiter"`, `"en_cours"`, `"visitee"`, `"non_visitee"` | `non_visitee` porte un constat `INCONCLUSIVE` qui dit pourquoi |
| `http` | nombre ou `null` | Code de la réponse du document |
| `debut`, `fin` | texte ISO ou `null` | Visite de cette page par son agent |
| `capture` | objet ou `null` | `fichier` (relatif à `<sortie>`), `url` (publique, une fois envoyée dans le stockage `captures`, sinon `null`), `largeur`, `hauteur`, `defilement` |
| `reference` | objet ou `null` | `fichier` et `version` de la référence comparée ; `null` au premier passage et pour une page nouvelle (elle devient sa référence) |
| `holo` | objet ou `null` | `etat` : `"fait"`, `"hors_delai"`, `"echec"`, `"non_lance"` ; `modele` réellement utilisé (`holo4-27b`, ou `holo4-35b-a3b` après repli) ; `duree_ms` ; `ecartes_sans_zone` : constats de Holo jetés faute de zone |
| `statut` | statut ou `null` | Le pire des constats de la page (`VERIFIED_FAIL`, puis `SUSPECTED`, puis `INCONCLUSIVE`), `PASS` s'il n'y en a aucun ; `null` tant qu'elle n'est pas finie. Les constats qui ont un `explique_par` ne comptent pas |

### Un constat (temps 3, 4 et 5)

| Champ | Type | Sens |
|---|---|---|
| `id`, `ecran`, `vue` | texte | Voir « Identifiants » |
| `source` | `"controle"`, `"holo"`, `"comparaison"`, `"accessibilite"` | Qui l'a trouvé |
| `sorte` | texte | `controle` : `page-erreur`, `image-cassee`, `defilement-horizontal`, `debordement`, `lien-casse`, `texte-erreur`, `erreur-console`. `holo` : `texte-coupe`, `chevauchement`, `decalage`, `image-deformee`, `contraste-illisible`, `autre`. `comparaison` : `changement`, `deplacement`. `accessibilite` : l'identifiant de la règle du moteur (par exemple `color-contrast`). Un `INCONCLUSIVE` : `non-conclu` |
| `statut` | statut | Voir le tableau des principes |
| `description` | texte | Une phrase courte en français, dite par la mascotte, sans jargon (« L'image du campus ne s'affiche pas. ») |
| `textes_a_surligner` | liste de textes | Textes affichés à entourer sur la page en direct (texte du bouton qui déborde, « undefined » affiché, texte du lien mort) ; vide si rien à entourer par le texte |
| `zone` | `{ x, y, largeur, hauteur }` ou absent | Zone du défaut, **en pixels de `capture`** ; absente quand le défaut n'a pas de place (`page-erreur`, `erreur-console`, `defilement-horizontal`). Obligatoire pour `holo` et `comparaison` |
| `zone_avant`, `nature`, `pixels` | comme `Constat` | Pour `comparaison` seulement |
| `preuve` | objet | `controle` et `accessibilite` : `element` (sélecteur CSS), `mesure` et `attendu` en clair (« contraste 3,1:1 », « 4,5:1 au moins »), `url` pour un lien ou une image, `regle_wcag` pour l'accessibilité (« 1.4.3 »), `console` pour une erreur JavaScript (message, 300 caractères au plus). `holo` : `modele`, `phrase` (la phrase de Holo, telle quelle). `comparaison` : `reference` |
| `capture` | texte | Fichier, relatif à `<sortie>`, sur lequel `zone` se lit (celui de la page, ou celui du constat) |
| `agent` | nombre | Agent qui a visité la page |
| `page` | `{ largeur, hauteur }` | Taille de `capture` |
| `explique_par` | texte ou absent | Un doute de Holo dont la zone recouvre de plus de moitié (de la plus petite des deux) celle d'un défaut prouvé de la même page prend l'`id` de ce défaut : la scène le montre avec lui, il ne compte pas comme un doute de plus |
| `decision_id` | texte ou absent | Décision « voulu » de `vault-horama/<site>/decisions/` qui neutralise un écart de `comparaison` (même écran, zone qui se recouvre) |
| `raison` | texte | Pour `INCONCLUSIVE` : pourquoi, en une phrase |

## Comment la scène s'en sert, temps par temps

| Temps | Ce que lit la scène |
|---|---|
| 1. L'adresse | `adresse`, puis `trouvees` dès qu'il est rempli (« 12 pages trouvées dans le plan du site, 1 écartée : formulaire. ») |
| 2. La visite | `agents` (une fenêtre par agent, son numéro, ses pages) et `pages[].agent`, `pages[].etat` (page en cours de visite, page finie, agent tombé et pages reprises) |
| 3. Deux regards | Les `constats` d'une page dès que `pages[].etat` vaut `visitee` : traits sur la page en direct, rouges pour `controle` et `accessibilite`, couleur du doute pour `holo` |
| 4. Le récapitulatif | `totaux`, puis chaque `VERIFIED_FAIL`, puis chaque `SUSPECTED` sans `explique_par`, avec `capture` et `zone` entourée ; bug ou voulu écrit en C5 (ci-dessous) |
| 5. Le passage suivant | `version_reference` : `null`, la mascotte dit qu'elle a gardé les captures ; sinon les constats `comparaison` (avant et après : `reference` et `capture`). Puis la proposition du mode développeur, qui vient de la scène et non du fichier |

## Ce qui va en base

- **C3** : une ligne `passages` (`logiciel` = `site`), les événements et les captures de chaque session, comme le coureur le fait déjà.
- **C4, une ligne `resultats` par page visitée ou non visitée**, écrite quand la page est finie :
  - `test_id` : `exploration--<ecran>` ; `version_testee` : `version` ; `version_reference` : `version_reference`, ou `version` au premier passage ; `statut` : celui de la page ; `ecrans` : `[ecran]` ;
  - `valeurs` : pour chaque constat `controle` ou `accessibilite`, `"<ecran>.<sorte> <n>": "<mesure>"` ; `calcul` : les `description` de ces constats, jointes par « ; » ;
  - `niveau_de_preuve` : `"releve"` s'il y a un défaut prouvé, sinon `"aucun"` ;
  - `ecarts_visuels` : les constats `holo` et `comparaison` de la page, sans ceux qui ont un `explique_par` (`id`, `ecran`, `vue`, `description`, `zone`, `statut`, `decision_id`) ;
  - `captures` : URL publique de la capture de la page ; `replay_url` : celui de l'agent ; `raison` : celle du constat `INCONCLUSIVE` s'il y en a un.
- **C5** : écrit par la scène quand l'humain tranche, comme en mode développeur : `test_id` `exploration--<ecran>`, `ecart_id` = `id` du constat, `logiciel` = `site`, `ecart` = `description`, `zone`, `version` = `version`.
- **Accessibilité (#55)** : le rapport séparé de l'issue #55 peut être le même fichier : ses constats ont `source: "accessibilite"` et restent hors du C4 tant que l'équipe ne l'a pas décidé (la scène les compte à part, sous « accessibilité »).

## Règles de lecture

- Tout champ en plus est ignoré par la scène. Un champ en moins parmi `format`, `etat`, `site`, `pages`, `constats` rend le fichier illisible (sortie 2).
- Un constat dont l'`ecran` n'est pas dans `pages` est ignoré et signalé dans le terminal.
- Aucun chiffre n'est écrit à la main dans ce fichier : tout vient du passage.

## À vérifier quand le moteur existe

- Le moteur écrit ce fichier sur un vrai passage à un agent, sur eugeniaschool.com : la scène le lit sans erreur à chaque réécriture (aucune lecture d'un fichier à moitié écrit).
- Un essai à trois agents où l'un tombe : `agents[].etat` passe à `tombe`, ses pages changent d'`agent`, la synthèse est complète.
- Chaque constat relu à la main, vrai ou faux, dans `docs/tests/2026-11-18-mode-visuel.md` (critère de l'issue #57).
