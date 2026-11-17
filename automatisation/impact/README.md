# impact : les tests à rejouer depuis un diff

Décision D6 option B (commentaire de la PR #10) et D7 section 4.1 : à partir de deux commits du dépôt, la liste des identifiants de tests acceptés à rejouer, prête pour `parcours.mjs --tests`.

## Commande

```
node automatisation/impact/impact.mjs --depuis <commit> --vers <commit> [--logiciel facturo] [--socle a,b] [--json]
```

Sortie standard : les identifiants séparés par des virgules, sur une ligne. Sortie d'erreur : le détail pour un humain (fichiers modifiés, écrans touchés et pourquoi, tests retenus et écartés, socle). Avec `--json`, le même détail sort en JSON sur la sortie standard. Code de sortie : 0, ou 2 si un commit est inconnu ou si le vault ne se lit pas.

## Ce qu'elle lit

- les fichiers modifiés : `git diff --name-only <depuis> <vers>` ;
- le vault du commit `--vers` (D7 section 4.2 : la branche porte sa propre documentation), exporté par `git archive` dans un dossier temporaire, lu avec `@horama/memoire`, dossier supprimé à la fin ;
- les fiches de changement retenues : celles dont le fichier `vault-horama/<logiciel>/changements/<id>.md` est ajouté ou modifié entre les deux commits.

## Règle de choix

Un écran est touché quand sa note déclare l'un des fichiers modifiés dans son champ `code:`, ou qu'il est listé dans `ecrans_vises` ou `ne_doit_pas_changer` d'une fiche retenue. Un test accepté est rejoué quand l'un de ses `releves` porte sur un écran touché.

Le socle est joué à chaque fois : `--socle`, sinon `socle.json` (`{ "facturo": ["ca-du-mois-egal-total"] }`). Aucun doublon, ordre par identifiant. Un identifiant du socle inconnu des tests acceptés est signalé dans le détail, pas joué.

La logique est `choisirTests({ fichiers, notes, fiches, tests, socle })`, exportée par `impact.mjs` et testée sans Git (`impact.test.mjs`).

## Exemple réel

```
node automatisation/impact/impact.mjs --depuis c5bdf8e --vers 7b60563
```

Entre ces deux commits du 17/11, le bouton « Mode sombre » est né : `faux-saas/app/shell.tsx` et `faux-saas/app/styles.ts`, fichiers communs déclarés par les trois notes d'écran. Sortie standard :

```
ca-du-mois-egal-total,detail-facture-total-egal-liste,liste-factures-filtre-echeance
```

Et entre `7b60563` et `9ee96e4` (un test de memoire et une note retouchés, aucun fichier déclaré dans `code:`) :

```
ca-du-mois-egal-total
```

Le socle seul, comme prévu.
