# Question lisible, attente plafonnée, et la mascotte hors du texte après le trait (19/11)

Retours de la relecture des passages filmés du jour.

1. **Clone allemand, question 2 de 40 s** : son texte déversait les sélecteurs CSS des trois éléments regroupés par l'explorateur (#180 : « … Éléments : html > body:nth-child(3) > main:nth-child(4) > section… », sur 6 à 8 lignes), et la réponse automatique attendait 2,5 s plus 50 ms par caractère.
2. **Albert School, page À propos** : la mascotte, badge affiché, est restée environ 9 s sur le titre « À la fin de vos études », à côté du doute de Holo sur le menu. La permission de couvrir un texte voisin (S3) durait au-delà du trait, jusqu'au geste suivant de H.

## Ce qui change

- `recapitulatif.mjs` : `lisible(description, textes)` remplace la liste de sélecteurs d'un constat groupé par le nombre d'éléments et leurs textes visibles, courts (40 caractères au plus) et sans doublon, 3 au plus (« 3 éléments : « Studienjahr » ») ; `selecteursDe` lit ces sélecteurs. Les sélecteurs restent dans la note du vault et dans la réponse sur la PR. `attenteLecture` : la réponse automatique attend 6 s au plus.
- `couche-horama.js` : commande `texte(selecteur)`, le texte visible d'un élément ("" s'il n'est pas vu). Après le trait, si la mascotte couvre un texte, elle va à une place sans texte près de la zone, en gardant son expression.
- `exploration.mjs` : pendant le parcours, quand la page d'un constat groupé est à l'écran, la scène lit le texte visible de chacun de ses éléments ; le récapitulatif et la question utilisent `lisible`.

## Ce qui a été lancé, et ce qui en est sorti

- `recapitulatif.test.mjs`, nouveau cas : trois sélecteurs, textes « Studienjahr » répétés → « 3 éléments : « Studienjahr » » ; sans texte → « 3 éléments » ; jamais « html » ni « nth-child » ; attente de 6 s pour 700 caractères, 3,5 s pour 20. 6 sur 6.
- `trait-expression.test.mjs`, nouvelle étape : après le trait, la mascotte ne couvre aucun texte ; sans le changement de la couche, le test échoue (« après le trait, la mascotte ne couvre aucun texte »).
- Fin rejouée sans H, sur la même prévisualisation allemande (exploration sans agent ni Holo, `--choix voulu,bug --repeter-choix`, témoins) : récapitulatif à 31 s, 2 questions répondues en 14 et 9 s, la question du constat groupé dit « Le texte dépasse la boîte de son conteneur. 3 éléments : « 1. Studienjahr », « 2. Studienjahr », « 3. Studienjahr ». », sans sélecteur (`captures/2026-11-19-question-lisible/questions-rejouees.png`).
- Tests de la scène et du réveil : 0 échec (le test de la mascotte a échoué une fois, puis 3 fois de suite sans échec : l'instabilité connue, présente aussi sur `dev`).

## Ce qui n'est pas testé

Avec H : prochain passage filmé.
