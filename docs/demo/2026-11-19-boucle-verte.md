# Test de la boucle verte (fin du pitch) : préparé, pas lancé

But : montrer la fin du cycle du mode développeur. Horama a trouvé des défauts sur la PR #16 du clone, Léon pousse un commit qui les corrige, et Horama répond sur la PR qu'il n'y a plus de défaut prouvé.

Coût : un passage H, environ 0,10 à 0,22 $ et 4 à 6 min (passage final du 19/11 : 343 s, 0,22 $). Il se lance seulement sur un go de Nathan tapé dans la session du couloir Nathan : il publie une réponse sur une PR du clone.

## 1. Côté clone (Léon), sans Horama

On ne touche pas à la PR #16, dont la réponse reste comme preuve du premier passage.

1. Une branche partie de la tête de la PR #16 (998767b), par exemple `boucle-verte` ; un commit qui corrige les défauts que la réponse sur la PR #16 a prouvés :
   - `/` : « Zertifikatskurs » qui déborde de sa boîte (120 × 35 px pour un texte de 158 px) ;
   - `/programmes` : « Studienjahr » qui déborde, 3 éléments de la liste des années (96 × 89 px pour 129 px) ;
   - `/ecole` : le bloc resté en français (le `p` du 8e `section`, 28 mots), traduit en allemand ;
   - et, si possible, le titre coupé d'`/admissions` (« Studienzulassung »), doute de Holo.
2. Une PR en brouillon (draft) de cette branche vers `main`. Son numéro, `N`, sert ci-dessous. Vercel en construit la prévisualisation. Le réveil la voit : son lecteur GitHub demande les PR `state=open`, qui comprennent les brouillons, et rien dans `pr.mjs` ne les écarte. Le réveil à blanc de l'étape 2 le confirme avant le passage.

## 2. Côté Horama : à blanc d'abord (gratuit, rien n'est joué)

```
node automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --numero N --a-blanc
```

On doit voir : `PR #N (<sha>) « … » : prévisualisation prête (…), https://…vercel.app, répond sans connexion (code 200).` Si la prévisualisation n'est pas prête ou demande une connexion Vercel, attendre ou corriger avant le passage réel.

Le vault `.orchestrateur/jour/vault-final` est celui du passage final : il garde les 5 décisions « bug » de Nathan sur la PR #16. Rien n'est écrit dans `vault-horama/`.

## 3. Le passage réel (go de Nathan)

```
node --env-file=.env.local automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --sortie .orchestrateur/jour/reveil-boucle --numero N --une-fois --commenter --captures-sur-branche horama/captures -- --sans-base --fermer-chrome
```

`--numero N` empêche le réveil de jouer une autre PR ouverte du clone. Il n'y a pas de `--choix` : s'il reste des doutes, Nathan les tranche dans la scène.

## 4. Ce qu'on doit voir

- **Dans la scène** : la page d'attente, puis la prévisualisation de la PR N, 8 pages. Aucun trait miltos là où les défauts ont été corrigés. Le récapitulatif annonce « 0 défaut prouvé » (et les doutes restants, s'il y en a).
- **Sur la PR N du clone**, la réponse d'Horama, avec en gras :
  - « **Aucun défaut prouvé.** » si plus rien n'est trouvé ;
  - « **Aucun défaut prouvé, N doutes.** » s'il reste des doutes de Holo, chacun avec sa capture et la décision de Nathan.
- **Dans l'index public** (https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/horama/captures/index.json, jusqu'à 5 min de cache) : un deuxième passage en tête, pour la PR N, avec ses constats (ou une liste vide). Le passage de la PR #16 reste dessous.
- **Dans `.orchestrateur/jour/reveil-boucle/pr-N-<sha>/reveil.json`** : `commentaire.status` vaut `publie`, `index.passages` vaut 2.

## Ce qui peut empêcher le vert

- Un défaut réel que la correction n'a pas couvert, ou un nouveau défaut introduit par le commit : la réponse le prouvera, avec sa capture.
- Les doutes de Holo sur des titres coupés : ce sont des doutes, pas des défauts prouvés. La réponse sera « aucun défaut prouvé », mais pas « aucun doute ».
- La langue : la PR reste en allemand, les tests écrits du vault restent écartés et seule l'exploration joue. C'est normal.
