# @horama/jugement

Deux briques : la génération des tests depuis une note du vault (`generation/`, `proposerTests`, voir `generation/comparaison.md`) et la vérification d'un écran pendant le parcours de l'agent (`verification/`, décrite ici).

Vérifier : `pnpm --filter @horama/jugement run check` (types, puis tests sans réseau).

## Vérification d'un écran (`verification/`)

Fonctions pures : ni réseau, ni modèle, ni fichier. Appelées par la scène à chaque `relever(ecran, vue)`.

- `verifierReleve(entree)` rend les constats (`Constat[]`) du relevé qui vient d'être pris : d'abord les règles, puis l'image si `reference` est fourni.
- `releverValeurs(texte)` lit le `document.body.innerText` d'une page : tableaux (en-têtes, lignes, ligne de total), valeurs étiquetées, date du jour, filtre actif, compteur de factures.
- `comparerImages(png, reference)` rend les zones qui comptent, le nombre de pixels différents et le nombre de zones avant le seuil.

### Quand une règle est rendue

Une règle est rendue une seule fois par parcours, au relevé qui la rend décidable : ce relevé fait partie des écrans qu'elle lit, et tous ses écrans sont relevés. Une règle entre deux écrans sort donc au second.

- Règle `filtre` : elle lit le relevé dont le filtre actif (« Filtrer : … » sur la page) est celui de la règle. Sur un autre relevé du même écran elle n'est pas décidable.
- Les quatre autres : elles lisent le relevé de la vue `defaut` de chaque écran (sans filtre, selon le contrat). Une vue filtrée ne sert donc jamais à comparer un total avec un autre écran. Conséquence : une règle dont l'écran n'est relevé qu'en vue filtrée n'est jamais rendue.
- Deux règles identiques (portées par deux tests) donnent un seul constat.

### Où une règle trouve ses valeurs

Dans cet ordre, pour un `champ`, une `colonne` ou une `cible` :

1. `Total`, `Total TTC` : la ligne de total du tableau (sa dernière case remplie) ;
2. `Nombre de factures` : le nombre de lignes du tableau ; si le compteur affiché (« 4 factures ») dit autre chose, la valeur est illisible ;
3. `<Colonne> de <Numéro>` (`Montant TTC de F-119`) : la case de cette ligne ;
4. une valeur étiquetée (`CA du mois`, ou `Client : Studio Lune`) ;
5. une colonne de tableau : une valeur par ligne, nommée `<Colonne> de <première case>`.

Les montants se lisent en centimes entiers, toutes espaces Unicode normalisées. Dans `valeurs`, un montant s'écrit `1420.00`, le reste tel qu'affiché.

### Statuts

- `PASS`, `VERIFIED_FAIL` (valeurs et calcul qui prouvent la violation), `INCONCLUSIVE` avec `raison` dès qu'une valeur est introuvable ou illisible (« colonne Échéance introuvable sur liste-des-factures »). Jamais `SUSPECTED` pour une règle.
- `egalite` : deux montants se comparent en centimes ; si un seul des deux textes est un montant, l'autre est illisible ; sinon les textes normalisés se comparent.
- `format` : une case vide n'est pas un défaut de format, c'est l'affaire de `presence`. `date-fr` : `JJ/MM/AAAA`, année de 2020 à celle de la date du jour lue sur l'écran.
- `textes_a_surligner`, pour un défaut : la valeur fautive (`somme` : le total affiché ; `egalite` : la valeur de l'écran courant ; `format`), ou le numéro de la ligne fautive (`filtre`, `presence`). Textes tels qu'affichés, espaces insécables comprises.

### Image

Règle de `docs/decisions/2026-11-16-seuil-de-bruit.md` : pixel différent si un canal s'écarte de plus de 24 ; zone = pixels différents distants de 8 px au plus (sur chaque axe) ; une zone compte à partir de 6 pixels. Tailles différentes : un constat `INCONCLUSIVE`, rien n'est comparé.

Chaque zone qui compte donne un constat `visuel` `SUSPECTED` avec sa boîte et ses pixels, ou `PASS` avec `decision_id` si `decisionQuiNeutralise` (`@horama/memoire`) trouve une décision « voulu » pour la version testée. Pas de modèle de vision ici : la description est la même pour toutes les zones.

Un élément déplacé donne plusieurs zones : son contour et son texte, distants de plus de 8 px, à l'ancienne place et à la nouvelle.

### Dépendance

`pngjs` 7.0.0 (lecture des PNG), déjà utilisée par `faux-saas` et `automatisation/scene`. Elle n'a pas de types : `verification/pngjs.d.ts` déclare la partie utilisée.
