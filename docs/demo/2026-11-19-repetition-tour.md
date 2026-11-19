# Répétition du pitch avec la tour en écriture (PR #19 du clone) : préparée, pas lancée

But : rejouer le déroulé du pitch de #238 de bout en bout.

1. Un commit sur une PR du clone réveille Horama.
2. La scène visite la prévisualisation.
3. Chrome bascule sur la tour, écran « À relire » de ce passage.
4. Nathan, connecté, tranche chaque cas.
5. Horama répond sur la PR avec ces décisions.
6. La tour compare la PR #16 et la PR #19.

Coût : un passage H, environ 0,20 $ et 6 min au plus (le clone, 8 pages sur 8, a pris 325 à 343 s), plus le temps de trancher, 10 min au plus. Le passage réel se lance seulement sur un go de Nathan tapé dans la session du couloir Nathan : il publie une réponse sur la PR #19 et une entrée dans l'index public.

## 0. Avant de commencer : ce qui doit être vrai (#249, Léon)

- [ ] **Compte d'équipe sur Railway** (`TOUR_EMAIL`, `TOUR_NOM`, `TOUR_MOT_DE_PASSE_HASH`, `TOUR_SECRET`). Vérification : `POST /tour/session` avec un faux mot de passe répond 401, et non plus 503 (503 le 19/11 au soir).
- [ ] **`GITHUB_TOKEN_TOUR`** sur Railway, avec le droit d'écrire sur `horama/captures` du clone.
- [ ] **horama-gold redéployé depuis `dev`** (#241 à #252 dedans). Vérification : la page https://horama-gold.vercel.app/tour/ charge le même bundle que `accueil/tour/index.html` de `dev` (le 19/11 au soir : en ligne `index-BuIeHjPq.js`, sur `dev` `index-EqC_1AZ0.js`, donc pas encore redéployé), affiche « Données : service Horama » en pied de barre latérale, et le bouton « Envoyer Horama » n'a pas d'ailes.
- [ ] **Prévisualisation Vercel de la PR #19** prête, au dernier commit (`1f5c03f` ou plus récent). Vérification : l'étape 1.

## 1. D'abord, rejouer la PR #16 (option B, choisie par Nathan)

Pour que la comparaison montre la même vue de chaque page (section 4), la PR #16 est rejouée avec ce réveil, avant la PR #19. Ses captures de pages entrent dans l'index.

À blanc (gratuit) :

```
node automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --numero 16 --a-blanc
```

Vu le 19/11 au soir : `PR #16 (998767b) « Traduire en allemand les pages de la démo Horama » : prévisualisation prête (statut et commentaire de Vercel), https://eugenia-school-website-git-devin-179503024-b6c714-ahissein-5983.vercel.app, répond sans connexion (code 200).`

Le passage réel, sur go tapé de Nathan, seulement quand les deux premiers préalables sont vrais (compte d'équipe, horama-gold) :

```
node --env-file=.env.local automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --sortie .orchestrateur/jour/reveil-tour --numero 16 --une-fois --commenter --captures-sur-branche horama/captures --trancher-dans-la-tour -- --sans-base
```

Ce que ça change, à savoir avant le go :
- l'entrée de la PR #16 dans l'index (même PR, même commit `998767b`) est **remplacée** : ses 5 décisions « bug » de Nathan disparaissent, et elles sont à retrancher dans la tour pendant ce passage ;
- une **seconde réponse** est publiée sur la PR #16, sous la première, avec les nouvelles décisions ;
- un passage H, environ 0,20 $ et 6 min au plus, plus le temps de trancher.

On doit voir la même suite que pour la PR #19 (section 3) : scène, bascule sur « À relire » de ce passage, connexion, trancher, réponse. Attendus : les 3 défauts prouvés du 19/11 (« Zertifikatskurs », « Studienjahr », le bloc français de `/ecole`) et les doutes de Holo, s'il y en a. L'entrée de la PR #16 a ensuite `pages` (8 captures).

## 2. La PR #19 : à blanc (gratuit, rien n'est joué)

```
node automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --numero 19 --a-blanc
```

On doit voir : `PR #19 (<sha>) « … » : prévisualisation prête (…), https://…vercel.app, répond sans connexion (code 200).` Le 19/11 au soir, elle répondait encore « prévisualisation « failure », pas encore jouable » (Vercel limité).

## 3. La PR #19 : le passage réel (go tapé de Nathan, après la PR #16)

```
node --env-file=.env.local automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --sortie .orchestrateur/jour/reveil-tour --numero 19 --une-fois --commenter --captures-sur-branche horama/captures --trancher-dans-la-tour -- --sans-base
```

- **Pas de `--fermer-chrome`** : c'est le même Chrome qui bascule sur la tour.
- **Pas de `--choix`** : on tranche dans la tour.
- **`--tour`** n'est pas donné : la tour par défaut est https://horama-gold.vercel.app/tour/.
- **Vault** : `.orchestrateur/jour/vault-final` est un vault temporaire. Rien n'est écrit dans `vault-horama/`.

## 4. Ce qu'on doit voir, étape par étape

1. **Page d'attente** : le Chrome de la scène s'ouvre sur la page d'attente, puis passe sur la prévisualisation de la PR #19.
2. **La scène** : 8 pages au plus, curseur, mascotte. Aucun trait miltos à l'endroit des défauts corrigés (« Zertifikatskurs », « Studienjahr », le bloc français de `/ecole`).
3. **La fin de scène, sans question** : le récapitulatif « J'ai fini. » avec ses chiffres. S'il reste des cas, la mascotte dit « À vous de trancher. », « Je passe la main à la tour de contrôle, écran : À relire ». S'il n'y a aucun cas, la tour ne s'ouvre pas et la réponse part tout de suite.
4. **Dans le terminal** :
   - `index des passages à jour` ;
   - puis `tour de contrôle ouverte, https://horama-gold.vercel.app/tour/?index=<commit>#relire/dev%3A<passage>`.
5. **La bascule** : le même Chrome affiche la tour, « À relire » filtré sur ce passage. On y voit son titre, sa date, sa durée et son coût, et ses cas avec leurs captures entourées.
6. **La connexion** : les boutons sont désactivés, avec « Connectez-vous pour trancher ». On clique, on saisit le compte d'équipe, et on revient sur « À relire » de ce passage. La barre latérale montre le nom de l'équipe et « Se déconnecter ».
7. **Trancher** :
   - un clic sur « C'est un bug » ou « C'est voulu » par cas ;
   - chaque cas passe dans « Déjà tranchés » avec qui et quand ;
   - le compteur d'« À relire » descend.
8. **La réponse** : le réveil relit l'index toutes les 5 s. Dans le terminal, `tout est tranché dans la tour (N sur N)`, puis `réponse publiée, https://github.com/…/pull/19#issuecomment-…`. Sur la PR #19, chaque cas porte sa décision, ou « à trancher » si le délai de 10 min est dépassé.
9. **L'index** : `.orchestrateur/jour/reveil-tour/pr-19-<sha>/reveil.json` contient :
   - `tour.complet: true` ;
   - `commentaire.status: "publie"` ;
   - `index_reponse.commit`.

   L'entrée de la PR #19 a `pages` (8 captures), `duree_s` et `cout_usd`.
10. **La comparaison**, sur https://horama-gold.vercel.app/tour/#comparer : voir la section 5.

## 5. La comparaison PR #16 contre PR #19 : option B choisie

L'entrée de la PR #16 date d'avant le champ `pages` : elle n'a que les captures de ses constats, prises à l'endroit du défaut et déjà entourées. La PR #19 aura les captures brutes du haut de chaque page. L'écran Comparer les met côte à côte pour `/`, `/programmes`, `/ecole` et `/admissions`, mais les deux images ne montrent pas la même partie de la page. L'écran le dit, et les pixels bruts n'ont alors pas de sens.

Deux options ; Nathan a choisi **B** (section 1) :

- **A. Garder la PR #16 telle quelle.** On montre « avant » : le défaut entouré ; « après » : la page corrigée. Seul le mode « Côte à côte » est parlant. Rien de plus à payer.
- **B. Rejouer d'abord la PR #16 avec ce réveil.** Un passage H de plus, environ 0,20 $. Pour la même PR et le même commit, son entrée d'index est remplacée : ses 5 décisions « bug » de Nathan sont à retrancher dans la tour, et une seconde réponse est publiée sur la PR #16. Ensuite, les trois modes comparent la même vue de chaque page.

Après les deux passages : https://horama-gold.vercel.app/tour/#comparer/%2F, avant « PR #16 », après « PR #19 ». On doit voir les trois modes (côte à côte, rideau, pixels bruts) sur la même vue du haut de page, et sous l'avant les constats de la PR #16, chacun sur sa propre capture, marqués « Corrigé : absent du nouveau passage » s'ils ne reviennent pas dans la PR #19.

## 6. Ce qui peut empêcher le vert

- Le compte d'équipe n'est pas configuré : la connexion dit « La connexion n'est pas encore ouverte sur le service Horama ». On ne peut pas trancher, et la réponse part après 10 min avec « à trancher ».
- horama-gold n'est pas redéployé : la tour en ligne ne connaît ni `#relire/<cle>` ni la connexion.
- Un bandeau de cookies sur la prévisualisation : il reste à l'écran pendant le passage (#236), et n'est masqué que le temps des captures.
- Après la dernière page, un temps mort pendant que H confirme l'arrêt (relecture de #236). À mesurer pendant la répétition.
- Un défaut réel non corrigé, ou nouveau : la réponse le prouve, avec sa capture.
