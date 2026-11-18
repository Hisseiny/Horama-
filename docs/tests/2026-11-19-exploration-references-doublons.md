# Issue #166 — références et constats de l’exploration

## Vérification locale

`pnpm -r --if-present run check` : code 0. Les nouveaux tests vérifient les octets des références avant et après deux passages, les versions et la comparaison dès le premier passage, ainsi que le regroupement par type, mesure et zone, y compris après recadrage. Une mesure ou une zone différente reste un constat séparé.

```text
agent check: ok 81 - références préexistantes sans historique : conservées et comparées dès le premier passage
agent check: ok 88 - constats de contrôle regroupés par type, mesure et zone à un pixel près, par page
agent check: ok 89 - trois éléments hors écran recadrés au même endroit donnent un constat et une capture
agent check: # tests 265
agent check: # pass 265
agent check: # fail 0
agent check: Done
```

## Protocole réel

Prévisualisation publique de la [PR #16 du clone](https://github.com/Hisseiny/eugenia-school-website/pull/16), confirmée par le lien Vercel dans sa conversation et par HTTP 200. Chrome dédié à 1280 × 900, DPR 1 ; visite sans connexion ni saisie ou soumission de formulaire. La clé de développement de l’organisation est injectée dans `HAI_API_KEY`. Une session H à la fois ; le premier passage se termine avant le lancement du second. Aucune écriture Supabase.

Le vault de travail est une copie de `vault-horama/eugenia-clone`, avec cinq références de production préexistantes (v1) et aucun rapport de passage. Les deux passages corrigés réutilisent cette même copie. Empreintes relevées depuis la racine de la copie avant la première visite :

```sh
find eugenia-clone/references -type f -print0 | sort -z | xargs -0 sha256sum > "$run/references-avant.sha256"
```

Commande d’exploration (exécutée avec `n=1` puis `n=2`) :

```sh
run="$HOME/horama-166-mesures"
pnpm --filter @horama/agent explorer -- \
  --url https://eugenia-school-website-git-devin-179503024-b6c714-ahissein-5983.vercel.app/ \
  --site eugenia-clone --max 8 --pages-cliquees 0 --sans-base --reseau-public \
  --chrome-port 19333 --vault "$run/vault-corrige" --sortie "$run/corrige-$n"
```

### Diagnostic réel avant le regroupement après recadrage

Avec le premier correctif, les cinq empreintes n’ont pas changé, mais trois constats `129×89 > 96×89` ont encore été émis sur `/programmes`. Un relevé CDP en lecture seule a mesuré les ordonnées brutes dans le document : `2553.6875`, `2703.875`, `2854.0625`. Dans les captures recadrées du passage, elles valaient `405.6875`, `405.875`, `405.0625` avec les mêmes x, largeur et hauteur. Le regroupement limité aux coordonnées du document ne pouvait donc pas supprimer les trois répétitions de la réponse.

### Passages corrigés

Passage 1, version 2, référence 1, état `fini` (code 0) :

```text
8 pages visitées ; durée 146.137 s ; coût 0.058399000000000006 USD.
{"debordement":2,"texte-coupe":3,"changement":99,"deplacement":1}
Navigation : 0 pages par clic, 7 par adresse ; 0 clics, 3 défilements, 8 go_to ; départ : 3 défilements.
```

Passage 2, version 3, référence globale 2 (les pages ayant une référence de production restent comparées à la v1), état `fini` (code 0) :

```text
8 pages visitées ; durée 137.078 s ; coût 0.045734199999999996 USD.
{"debordement":2,"texte-coupe":3,"changement":99,"deplacement":1}
Navigation : 0 pages par clic, 7 par adresse ; 0 clics, 0 défilements, 8 go_to ; départ : 0 défilements.
```

Les deux rapports JSON contiennent chacun 2 défauts prouvés, 103 doutes, et 0 constat sans conclusion. Sur `/programmes`, chacun contient exactement un constat `programmes--controle--1` pour `129×89 > 96×89`, qui cite les trois éléments `li:nth-child(1)`, `li:nth-child(2)`, `li:nth-child(3)`. Sa zone de capture est `x=668.5, y=405.6875, largeur=96, hauteur=89.1875`, et le seul fichier de preuve du contrôle pour la page est `captures/programmes--controle--1.png`. Le Markdown produit localement par `ecrireSectionExploration` contient une seule occurrence de cette mesure dans chaque passage.

`sha256sum -c "$run/references-avant.sha256"`, lancé dans la copie après chacun des passages, a donné :

```text
eugenia-clone/references/accueil/defaut--v1.png: OK
eugenia-clone/references/admissions/defaut--v1.png: OK
eugenia-clone/references/bachelor/defaut--v1.png: OK
eugenia-clone/references/msc/defaut--v1.png: OK
eugenia-clone/references/programmes/defaut--v1.png: OK
```

Le premier passage a créé cinq références v2 pour les pages sans référence. `diff -u "$run/references-corrige-1.txt" "$run/references-corrige-2.txt"` ne renvoie aucune ligne : l’inventaire complet et les empreintes des dix fichiers sont identiques entre les deux passages. `git status --short -- vault-horama/eugenia-clone/references` ne renvoie aucune ligne non plus.

Journaux bruts : `$run/corrige-1.log`, `$run/corrige-2.log` et `$run/corrige-{1,2}/exploration.json`.

### Limites

L’exploration conserve les références françaises de production et continue à comparer avec elles : les écarts visuels de comparaison sont des doutes, pas des défauts prouvés. Aucun commentaire n’a été publié sur la PR cible pendant la mesure. Le réveil du mode dev, ses décisions humaines et la publication de captures sur une branche cible n’ont pas été rejoués.
