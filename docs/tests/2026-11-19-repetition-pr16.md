# Répétition du 19/11 au soir : passage réel de la PR #16 du clone, fin dans la tour

Lancé à 19 h 50 (heure de Paris) sur le go de Nathan, selon `docs/demo/2026-11-19-repetition-tour.md` § 1 :

```
node --env-file=.env.local automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --vault .orchestrateur/jour/vault-final --sortie .orchestrateur/jour/reveil-tour --numero 16 --une-fois --commenter --captures-sur-branche horama/captures --trancher-dans-la-tour -- --sans-base
```

## Ce qui est sorti

- Scène : 8 pages sur 8 en 259 s (6 par clic, 1 par adresse, 1 `go_to`). 3 défauts prouvés (débordement à l'accueil, « Studienjahr » sur `/programmes`, bloc français sur `/ecole`), 2 doutes de Holo (texte coupé sur `/programmes` et `/admissions`).
- Fin de scène : « Arrêt H non confirmé ; session abandonnée » à 257 s, le temps mort déjà relevé sur #236. Conséquence : `cout_usd` est `null` dans l'entrée de l'index (« coût inconnu »).
- Envoi des captures et de l'index sur `horama/captures` : environ 1 min 30 entre la fin de la scène (277 s) et l'ouverture de la tour. Temps mort visible pendant le pitch.
- Tour ouverte dans le Chrome de la scène : https://horama-gold.vercel.app/tour/?index=ddf5f13#relire/dev%3A2026-11-19-19h50-57e4 .
- Connexion avec le compte d'équipe : OK.
- **Trancher dans la tour : échec.** Chaque clic affiche « Le service n'a pas pu enregistrer la décision : réessayez dans un instant. » (voir le problème 1).
- Contournement : Nathan a tranché les 5 cas par écrit (« bug » pour les 5) et a lancé lui-même un script qui les écrit dans l'index au format de `recordDecision`. Le réveil les a vus : `tout est tranché dans la tour (5 sur 5)`, puis réponse publiée sur https://github.com/Hisseiny/eugenia-school-website/pull/16#issuecomment-7019175159 .
- `reveil.json` : `tour.complet: true` (5 sur 5, 437 s d'attente), `commentaire.status: "publie"`, `index_reponse.commit: 4b784dd`. L'entrée de la PR #16 a `pages` (8 captures) et `duree_s: 259.01`.

Ce passage ne prouve donc pas l'écriture par le service : c'est à refaire sur la PR #19 une fois le problème 1 réglé.

## Problème 1 (pôle Ali, `agent/scripts/tour-*.mjs` et Railway) : le service n'écrit pas les décisions

Observé, en lecture seule :
- `POST /tour/decision` avec la session de Nathan et un constat inexistant répond 404 « Passage ou constat introuvable. » : la session, l'origine et la lecture de l'index par le service marchent.
- La tour envoie `passage` et les ids des constats identiques à l'index.
- Aucun commit du service n'est arrivé sur `horama/captures` après `ddf5f13` (18:56:10 UTC, l'index publié par le réveil).

Il ne reste que le `catch` de `github.updateIndex` (`agent/scripts/tour-service.mjs`, fin de la route de décision), qui répond 503 « Service de la tour indisponible » sans dire ce que GitHub a répondu. Piste la plus probable : `GITHUB_TOKEN_TOUR` a la lecture mais pas l'écriture (`Contents: Read and write`) sur `Hisseiny/eugenia-school-website`. Autre possibilité : le `PUT` dépasse le délai de 5 s (`AbortSignal.timeout(5000)` dans `api`). Non vérifié : la tour n'affiche pas le code, et nous n'avons pas accès aux journaux Railway.

Ce qu'il faudrait :
1. Vérifier les droits de `GITHUB_TOKEN_TOUR` sur Railway : écriture sur `Hisseiny/eugenia-school-website` (branche `horama/captures`) et sur `Hisseiny/Horama-` (branche `horama/vault`, pour `/tour/doc`).
2. Journaliser dans ce `catch` le statut GitHub (`error.status`) et le message, pour que le prochain échec se diagnostique en une lecture.
3. Après correction : une décision depuis la tour doit créer un commit « Horama : décision dans la tour » sur `horama/captures`.

Côté tour (pôle Nathan, à faire après) : `ARelire.tsx` affiche le même message pour tout statut autre que 2xx, 0, 401 et 409 ; il affichera le code et l'`erreur` du service.

## Problème 2 (pôle Ali, `agent/src/exploration/explorer.ts`) : trois éléments, un seul cadre

Sur `/programmes`, les trois « 1./2./3. Studienjahr » débordent de leur boîte (colonne de gauche des trois années). Le constat `programmes--controle--1` les liste bien (« 3 éléments »), mais sa capture n'en entoure qu'un, le premier (zone `{x: 676, y: 405.8, largeur: 96, hauteur: 89.2}`). Nathan l'a relevé dans la tour.

Cause, lue dans le code : les trois éléments sont sous la première vue. `controlerPage` rend trois défauts distincts, avec trois zones différentes dans le document. `groupControls` ne les regroupe donc pas. Mais chacun sort de l'image, donc chacun est recapturé (`capturerZone` ou `captureDefect`), qui fait défiler la page jusqu'à l'élément. Sur sa recapture, chacun tombe à la même place de l'écran. La recherche de doublons (`recapturedControls.find(… sameControlZone(other.zone, extra.zone))`) compare ces zones de recapture, donc relatives à l'écran. Elle prend le deuxième et le troisième pour des doublons du premier : elle ajoute leurs sélecteurs à la description et garde la seule zone du premier.

Deux corrections possibles, sans toucher au contrat (`zone` reste une seule zone) :
- **A.** Comparer les zones dans le document (`documentZone`) au lieu des zones de recapture. Les trois deviennent trois constats, chacun avec sa capture et son cadre : 3 cas à trancher au lieu d'un.
- **B.** Garder un seul constat, mais lui donner pour zone la boîte qui englobe les trois éléments sur la capture, quand ils y sont tous visibles. Un seul cadre, haut et étroit, autour des trois.

Le choix revient à Ali. Un test qui reproduit : trois éléments qui débordent, sous la première vue et espacés verticalement, doivent donner trois zones distinctes (A) ou une zone qui contient les trois (B).
