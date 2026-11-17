# @horama/jugement

Trois briques : la génération des tests depuis une note du vault (`generation/`, `proposerTests`, voir `generation/comparaison.md`), la vérification d'un écran pendant le parcours de l'agent (`verification/`, décrite ici) et la correction de note proposée après un « voulu » (`correction/`, en fin de fichier).

Vérifier : `pnpm --filter @horama/jugement run check` (types, puis tests sans réseau).

## Vérification d'un écran (`verification/`)

Fonctions pures : ni réseau, ni modèle, ni fichier. Appelées par la scène à chaque `relever(ecran, vue)`.

- `verifierReleve(entree)` rend les constats (`Constat[]`) du relevé qui vient d'être pris : d'abord les règles, puis l'image si `reference` est fourni.
- `releverValeurs(texte)` lit le `document.body.innerText` d'une page : tableaux (en-têtes, lignes, ligne de total), valeurs étiquetées, date du jour, filtre actif, compteur de factures.
- `comparerImages(png, reference)` rend les zones qui comptent, le nombre de pixels différents et le nombre de zones avant le seuil.
- `consoliderConstats`, `formuler`, `versDecision` : voir « Des constats qu'un spectateur comprend », plus bas.

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

**Un élément déplacé = un seul constat.** Deux zones qui comptent, de même taille, dont le contenu de la référence à une place est celui de l'image testée à l'autre (moins de 6 pixels différents, tolérance de 24) : c'est un déplacement. Le constat porte `nature: "deplacement"`, `zone` (la nouvelle place) et `zone_avant` (l'ancienne) ; une décision « voulu » sur la nouvelle place règle les deux. Les autres constats visuels portent `nature: "changement"`.

Limites connues : un contenu d'une seule couleur est pris pour une place vide (sans cela, le vide laissé par l'élément « se déplacerait » dans l'autre sens), donc un aplat sans texte ni contour qui bouge donne encore deux constats ; un élément qui change de taille ou d'aspect en bougeant aussi.

## Des constats qu'un spectateur comprend

### Ce que porte un constat

- `id` : `<ecran>--<vue>--<genre>--<n>`, le même d'un parcours à l'autre tant que l'écran donne les mêmes constats. `ecran` et `vue` sont ceux du relevé où le constat sort (une règle entre deux écrans sort au second).
- Pour un constat visuel : `nature`, `zone`, `zone_avant` (déplacement), `page` (taille de l'image comparée, pour dire où est une zone), et `texte_zone`, que la scène remplit avec le texte de l'élément au centre de la zone.
- `explique_par` : posé par `consoliderConstats`.
- Les champs d'avant (`description`, `calcul`, `valeurs`, `textes_a_surligner`…) n'ont pas changé.

### `consoliderConstats(constats)`

Reçoit tous les constats du parcours, dans l'ordre, et rend la même liste. Un doute visuel dont le `texte_zone`, lu comme un montant ou comme un texte, est l'une des valeurs d'un défaut prouvé pour le même écran (clé `<ecran>.<champ>` de `valeurs`) reçoit `explique_par` = l'identifiant de ce défaut. Rien n'est supprimé : c'est l'appelant qui ne le montre plus comme un doute.

### `formuler(constat)`

Rend `{ annonce?, resultat, question? }` : ce que la mascotte vérifie (règles seulement), ce qu'elle a trouvé, et ce qui sera demandé à l'humain à la fin (défauts prouvés et doutes ; pas de question pour un doute déjà expliqué par un défaut).

- Chaque phrase tient en 90 caractères. Quand un nom ou une valeur est trop long, la phrase se dit sans lui (« Je vérifie que deux valeurs correspondent. »).
- Les phrases viennent de la règle, de ses valeurs et des zones, jamais d'un texte écrit pour un logiciel donné.
- Montants : « 1 240 € », centimes gardés s'ils ne sont pas nuls. Hypothèse : un montant lu par le calcul est en euros (le relevé ne lit que le format français, avec ou sans « € » affiché). Dates : « 30/11 ».
- « ici » est l'écran où le constat sort, « là-bas » l'autre écran de la règle.
- Déplacement : les mots de position (haut, bas, gauche, droite, « au milieu ») viennent des tiers de la page. Si les deux places tombent dans la même case, ou sans `page`, la question dit seulement « a changé de place ».
- Le `calcul` exact reste dans le constat.

### `versDecision(constat, choix, contexte)`

Rend la `Decision` du contrat pour un constat tranché « bug » ou « voulu », prête pour `ecrireDecision` (`@horama/memoire`) : identifiant `<date>-<ecran>-<mot court>` en kebab-case (le texte sous la zone, ou l'objet de la règle), `ecart` = la phrase `resultat`, `ecart_id` = l'identifiant du constat, `zone` pour un constat visuel. Au parcours suivant, `verifierReleve` avec cette décision rend le même constat en `PASS` avec `decision_id`.

### Dépendance

`pngjs` 7.0.0 (lecture des PNG), déjà utilisée par `faux-saas` et `automatisation/scene`. Elle n'a pas de types : `verification/pngjs.d.ts` déclare la partie utilisée.

## Correction de note après un « voulu » (`correction/`, tâche 5.2)

`proposerCorrection(vault, decision, options)` reçoit une `Decision` « voulu » (celle de `versDecision`) et rend `{ decision, raison, modele, duree_ms, essais }`. Quand la note de l'écran est contredite, `decision.correction_de_note` est rempli (`fichier`, `avant`, `apres`, `statut: "proposee"`), prêt pour `appliquerCorrection` (`@horama/memoire`) quand l'humain accepte. Sinon la décision revient sans correction et `raison` dit pourquoi, à montrer à l'humain.

- Ce que voit le modèle : la note de l'écran (`entete.ecran` = `decision.ecran`), la note de version `notes-de-version/v<version>.md` si elle existe, `decision.ecart`, `decision.pourquoi`, et `options.indices`. **La scène doit passer en indice la question de `formuler`** : c'est elle qui porte la nouvelle position (« … il est maintenant en haut à droite »), que `ecart` ne dit pas.
- Ce que fait le modèle : il recopie la phrase contredite et écrit la nouvelle (routeur Hugging Face, `CORRECTION_MODEL` = `openai/gpt-oss-120b`, la configuration mesurée, température 0).
- Ce que vérifie le code, sinon un second essai avec les raisons, puis pas de correction :
  - `avant` apparaît exactement une fois dans la note (la même règle que `appliquerCorrection`), sur une ligne du corps : jamais l'en-tête, un titre, ni la partie « Règles » (une règle ne se corrige pas par une phrase) ;
  - `apres` est une seule phrase, différente de `avant`, sans version ; chacun de ses libellés entre « » vient de ce que le modèle a reçu (rien d'inventé) ;
  - « (depuis la version N) » est ajouté par le code, avant le point final.
- Aucune phrase contredite, ou nouvel état inconnu : pas de correction, ce n'est pas une erreur. Un bug, ou un écran sans note : aucun appel au modèle.
- Un appel en échec (réseau, délai de 45 s, code HTTP) ne lève rien : la décision revient sans correction, `raison` donne le code et le message du service, jamais le jeton.

Mesure : `node --env-file=.env.local jugement/scripts/t52-correction.ts [modèle …]`, sur les 5 changements « voulu » de `faux-saas/verite.json`, 3 passes chacun ; écrit `docs/tests/2026-11-17-correction.md`.
