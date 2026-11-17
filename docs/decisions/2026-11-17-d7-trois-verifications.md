# D7 : trois sortes de vérification, et le vault comme mémoire des agents

Date : 17 novembre 2026. Décidé par Nathan (CAO) pour le fond : les méthodes 1 et 2 ci-dessous en P0. **Le nouveau type de règle (section 3) modifie `contrats-v1` : accepté par Ali (CTO), gardien des contrats, avec 4 conditions intégrées en section 3** (commentaire de la PR #21). Complète D6 option B (commentaire de la PR #10) et la décision de jonction (`2026-11-17-jonction-scene-coureur.md`).

## 1. Le constat

Horama sait faire une seule des trois choses qu'une équipe attend d'un testeur.

| Sorte | Exemple | État au 17/11 |
|---|---|---|
| 1. Cohérence des données | Le CA du mois est égal au total des factures | Fait : 5 types de règles calculables (somme, égalité entre écrans, filtre, format, présence) |
| 2. La nouveauté marche | Le nouveau bouton fait ce que dit la note de version | À moitié : le test est généré depuis la note (F6), mais il n'est jugé que s'il se ramène à un calcul |
| 3. Non-régression d'une fonctionnalité sans rapport | On ajoute un bouton ; le mode sombre bascule-t-il toujours ? | Absent pour le comportement : on rejoue les tests existants et on compare les images d'écran, mais aucun test ne décrit un comportement, et rien ne juge « après tel clic, il doit se passer ça » |

Cause : la spec du 16/11 a simplifié la vérification au calcul et à la comparaison d'images d'un écran. Une assertion de comportement (« FAIL if… » du format de H) n'a aujourd'hui aucun juge.

## 2. Les trois manières de juger un comportement

| Méthode | Comment | Ce qu'elle prouve | Priorité |
|---|---|---|---|
| **1. Capture après l'action, contre une référence** | Le test fait relever l'écran dans son nouvel état, sous une vue nommée (`mode-sombre`, `apres-export`). La comparaison d'images existante la confronte à la référence de la même (écran, vue) | Que l'état atteint après l'action est le même qu'à la version validée : une régression de comportement se voit comme un écart d'image | **P0** |
| **2. Vérification exacte dans la page** | Après l'action, le texte de la page relevé (`texte_page`) doit contenir ou ne pas contenir un texte attendu (« Revenir au mode clair », « Facture exportée ») | Un vrai ou faux certain : un `VERIFIED_FAIL` est possible | **P0** |
| 3. Verdict de l'agent | L'agent répond lui-même aux lignes « FAIL if » | Rien de certain : au mieux `SUSPECTED`, que l'humain tranche ; jamais un défaut prouvé | Filet, P1 |

La règle d'or d'Horama ne bouge pas : seul ce qui est mesuré est déclaré prouvé.

La méthode 1 ne demande aucun changement de contrat : les vues et les références par (écran, vue) existent déjà (`Releve`, `references_ecran`). La méthode 2 demande un type de règle.

## 3. Le nouveau type de règle (changement de `contrats-v1`, à valider avec Ali)

```ts
| { type: "etat"; ecran: IdEcran; vue: Vue; texte_present?: string[]; texte_absent?: string[] }
```

- Jugé sur le `texte_page` du relevé (écran, vue), que le coureur transmet déjà à la vérification (`agent/src/verification.ts`) : **aucun champ nouveau dans `Capture` ni dans la base**, aucun changement du coureur au-delà du passage de la règle, qu'il fait déjà (`test.regles`).
- **Statuts, selon l'état réellement atteint** (condition 1 d'Ali) :
  - `INCONCLUSIVE` (« état non atteint ») si le relevé de cette vue manque, ou si **aucun** des `texte_present` n'apparaît : rien ne prouve que l'agent a fait l'action (le mode sombre n'a peut-être jamais été activé) ;
  - `VERIFIED_FAIL` seulement si l'état est prouvé (au moins un `texte_present` trouvé) **et** qu'un texte attendu manque ou qu'un `texte_absent` apparaît, avec le texte manquant ou en trop dans `calcul` et `textes_a_surligner` ;
  - `PASS` si tous les `texte_present` sont là et aucun `texte_absent` n'apparaît.
  - Une règle qui n'a que des `texte_absent` doit porter au moins un `texte_present` témoin, sinon elle est refusée à la lecture.
- **Comparaison des textes** (condition 2) : en sous-chaîne de `texte_page` (le `innerText` de la page, donc sans le texte masqué), après normalisation des espaces, des espaces insécables et de la casse.
- **La vue** (condition 3) : `etat` se juge sur le relevé de la `vue` de la règle. Aujourd'hui, `jugement/verification/index.ts` ne garde que la vue `defaut` (sauf pour `filtre`) : à étendre. Les `switch (regle.type)` de `jugement/verification/rules.ts`, `jugement/verification/wording.ts` et `memoire/src/rules.ts` gèrent `etat` **dans le même lot**, sinon `pnpm -r check` casse dès l'arrivée du type.
- **Un seul changement de contrat, au bon moment** (condition 4) : Ali ajoute le type dans `contrats/types.ts` et `contrats/exemples.ts` et pose l'étiquette `contrats-v2` **quand le jugement de `etat` est prêt à être fusionné juste après**, jamais avant, pour ne pas laisser `dev` avec un type que personne ne juge.
- Limite : `etat` ne voit que le texte. Un mode sombre cassé seulement dans ses couleurs relève de la méthode 1 (comparaison d'images), pas de `etat`. D'où les deux méthodes ensemble dans le scénario.
- Écrit dans les notes du vault comme les autres règles : `regle: etat | vue: mode-sombre | present: Revenir au mode clair`.
- Volontairement limité au texte visible : Horama reste une boîte noire qui voit ce que voit un utilisateur, ce qui marche aussi sur un logiciel dont on n'a pas le code (Dolibarr, le pilote).

Fichiers touchés : `contrats/types.ts` et `contrats/exemples.ts` (accord Nathan et Ali), `jugement/verification/` (couloir Nathan), `memoire/` pour lire la ligne `regle: etat` (couloir Nathan), consigne de génération Hugging Face (`jugement/generation/`, Leslie ou couloir Nathan). Étiquette après accord : `contrats-v2`.

## 4. Obsidian : la documentation du développeur et la mémoire des agents

Le vault est déjà la source des tests (cadrage, section 10). Il prend deux rôles de plus.

### 4.1 La fiche de changement, écrite par le développeur

Chaque développement qui part en déploiement a sa fiche dans le vault : `vault-horama/<logiciel>/changements/<id>.md`.

```
---
id: bouton-relancer
pr: 42
code: [faux-saas/app/[version]/factures/**, faux-saas/lib/relances.ts]
ecrans_vises: [liste-des-factures]
---

# Bouton « Relancer » sur la liste des factures

Ce qui change : un bouton « Relancer » sur chaque facture échue ; un clic affiche « Relance envoyée ».
Ce qui ne doit pas changer : le reste de la liste, le mode sombre, l'export.
```

Ce qu'Horama en fait :
- **Sorte 2** : il génère le test de la nouveauté depuis « Ce qui change » (règle `etat` : présent « Relance envoyée » après le clic).
- **Sorte 3** : il choisit les tests à rejouer. Ceux des écrans dont les notes déclarent les mêmes fichiers dans leur champ `code:` (D6 option B), ceux que la fiche cite dans « Ce qui ne doit pas changer », et le socle joué à chaque fois.
- Après validation du déploiement, la fiche nourrit la documentation du produit : la dérive documentaire (correction de note de Leslie, PR #11 et #20) propose de reporter le changement dans la note de l'écran.

### 4.2 La branche Git porte sa propre documentation

Le vault vit dans le dépôt. Une branche de fonctionnalité porte donc son code **et** sa fiche de changement, et le déploiement de prévisualisation est testé avec le vault de cette branche. À la fusion, la doc fusionne avec le code. Il n'y a pas de « branche Obsidian » à créer à côté : la branche Git est la branche de la doc. Pour la démo, le commit de démo de Facturo (D6 option B) contient sa fiche.

Limite, pour le pitch : chez un client, la doc ne vit pas toujours dans le dépôt du code. La synchronisation d'un vault externe avec les branches passe en roadmap.

### 4.3 La mémoire des agents

| Mémoire | Où | État |
|---|---|---|
| Décisions humaines (bug ou voulu), portée limitée à un écart | `decisions/` | Fait |
| Références validées par (écran, vue) | `references/` | Fait (v12) |
| Rapports de passage | `passages/` | Fait (coureur, `memoire`) |
| Fiches de changement | `changements/` | **Nouveau, P0** |
| Mémoire de travail de l'agent : comment atteindre chaque écran, pièges rencontrés, durées, écrans instables | `memoire-agent/<ecran>.md`, écrite par le coureur après chaque passage, relue dans la consigne de la session suivante | **Nouveau, P1** |

La mémoire de travail de l'agent passe en P1 : elle n'est utile qu'au-delà de quelques passages et ne se voit pas en démo de 6 minutes. On la présente au pitch comme la suite.

## 5. Le scénario de démonstration sur Facturo

1. Facturo reçoit une fonctionnalité existante et sans rapport avec les factures : **un bouton Mode sombre** dans l'en-tête, en v12 et en v13. Sa note d'écran (`_regles-communes.md` ou une note `en-tete.md`) dit : « Le bouton Mode sombre passe toute l'interface en thème sombre ; son libellé devient Revenir au mode clair. » Les références de la vue `mode-sombre` sont prises sur le Mac de démo.
2. Le commit de démo ajoute le bouton « Relancer » (sa fiche de changement dans le même commit) et, par effet de bord, casse le mode sombre (une classe CSS écrasée, le libellé ne change plus).
3. Le déploiement réveille la scène (D6 option B). Horama lit la fiche, joue le test de la nouveauté (Relancer marche : `PASS`) et rejoue celui du mode sombre, que la fiche cite dans « Ce qui ne doit pas changer ».
4. La scène montre le défaut prouvé (« Revenir au mode clair » absent après le clic) et l'écart d'image de la vue `mode-sombre` contre la référence.
5. La phrase du pitch : « Le développeur a ajouté un bouton. Il n'a pas touché au mode sombre. Horama l'a quand même vérifié, parce que la doc dit ce qui ne doit pas changer, et il a trouvé la casse. »

## 6. Qui fait quoi

| Brique | Qui | Quand |
|---|---|---|
| Valider le type `etat` (contrat) | Ali et Nathan | Fait le 17/11 (accord d'Ali, 4 conditions) |
| Jugement de `etat` dans `jugement/verification/` et `wording.ts`, lecture dans `memoire/`, en un seul lot | Couloir Nathan | Après J4 (la jonction ne doit pas être perturbée) |
| Type `etat` dans `contrats/`, étiquette `contrats-v2` | Ali (gardien) | Quand le lot du jugement est prêt à être fusionné juste après |
| Mode sombre et bouton Relancer dans Facturo, commit de démo et sa fiche, références `mode-sombre` | Couloir Nathan | Avec l'option B |
| Fiches de changement : format, lecture, sélection des tests | Couloir Nathan (script du diff de l'option B) | Avec l'option B |
| Génération des tests depuis une fiche et des règles `etat` | Leslie (consigne Hugging Face) | Après accord sur le type |
| Notes du vault pour le mode sombre | Couloir Nathan, relu par Inès | Avec l'option B |
| `memoire-agent/` | Ali (coureur) | P1 |
| Verdict de l'agent sur les « FAIL if » (méthode 3) | Ali (coureur) | P1 |

## 7. Ce qui ne change pas

- Les 4 statuts et la règle « seul ce qui est mesuré est prouvé ».
- La jonction scène et coureur, telle que décidée le 17/11.
- La comparaison d'images reste en P0 (option B).
