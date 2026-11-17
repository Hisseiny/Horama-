# Ce qui est encore propre à Facturo dans le coureur et la scène (E1)

Date : 17 novembre 2026. Couloir Nathan. Contexte : nouveau cap de Nathan (option B), la démo se joue aussi sur une copie locale du site d'Eugenia School (`site-eugenia/`, servie sur le Mac de démo, pages statiques sans versions dans l'adresse, sans connexion, sans filtre). Facturo reste la démo de secours. Ce document liste ce qui suppose Facturo, ce que le couloir Nathan a déjà retiré de son côté, et ce qui est demandé au couloir Ali. Aucun contrat ne change.

## Déjà fait, couloir Nathan (`automatisation/scene/`, commit 297df71)

- La scène n'a plus sa propre copie des vues (`VIEWS`) ni du calcul des adresses : elle joue le parcours que `construireConsigne` donne à H (`consigne.course`, `consigne.tests`, `consigne.dropped`, `consigne.start`). Ce qui est propre au logiciel testé n'est donc écrit qu'à un seul endroit, `agent/src/consigne.ts`.
- `--base-url <adresse>` : l'origine du logiciel testé (défaut : `FAUX_SAAS_URL`, sinon Facturo en ligne).
- Mode scripté : la page de départ d'un test est la page après l'entrée de Facturo (`?suite=`) si elle existe, sinon l'adresse de départ elle-même.
- Vérifié : parcours scripté sur Facturo en v13 et v12, sortie 0, captures identiques aux références (contrôle J3 à 0).
- Reste propre à Facturo, sans gêne pour un autre site : la sonde T7 (`sonde-t7.mjs`, preuve historique), l'adresse par défaut de Facturo quand rien n'est donné.

## Demandé au couloir Ali (`agent/`)

Suivi par Ali dans l'issue #35 (https://github.com/Hisseiny/Horama-/issues/35 : `contrats-v2` avec la règle `etat`, vues lues dans le vault, site sans version dans l'adresse). Ali commence par `contrats-v2`.

Facturo est abandonné par décision de Nathan (17/11) : plus de démo de secours. Les points ci-dessous valent pour tout logiciel sans versions dans l'adresse, d'abord la copie du site d'Eugenia.

| N° | Où | Ce qui suppose Facturo | Proposition |
|---|---|---|---|
| 1 | `agent/src/consigne.ts`, `VIEWS` | Les vues nommées sont en dur : `defaut`, et `filtre-echeance` (paramètre `?filtre=echeance-depassee`, vue apparue en version 13). Toute autre vue fait échouer `construireConsigne` (« Vue inconnue »), donc tout le parcours | Lire les vues dans le champ `vues:` de la note de l'écran (déjà lu par `memoire`, PR #23). Une vue sans précision a l'adresse de `defaut` (cas de `mode-sombre`, atteinte par un clic) ; garder `filtre-echeance` comme cas particulier tant que la note ne sait pas dire son paramètre, ou ajouter ce paramètre à la note (à voir avec Inès) |
| 2 | `agent/src/consigne.ts`, adresse d'un écran | `<numero>` est remplacé par un numéro de facture trouvé dans le test (`/\bF-\d+\b/`) | Une forme générale : un `<parametre>` de l'adresse de la note est pris dans l'adresse de départ ou dans le test sous la forme `<parametre>=valeur` ; sans valeur, l'écran garde le motif `[^/]+` |
| 3 | `agent/src/consigne.ts` | Préfixe `/vN/` déduit de `url_depart` (fait dans la PR #19) ; le remplacement `/v<version_cible>/` vers `/v<version>/` de `start` suppose ce préfixe | Rien à changer si `url_depart` n'a pas de préfixe : à confirmer par un test sur une adresse de départ `/` (page d'accueil d'un site statique) |
| 4 | `agent/src/consigne.ts`, `baseUrl` par défaut | `FAUX_SAAS_URL` ou `https://facturo-demo.vercel.app` | Rien d'obligatoire (la scène passe `--base-url`) ; un défaut absent qui oblige l'appelant à le donner serait plus sûr |
| 5 | `agent/src/coureur.ts:44`, `bonneAdresse` | Contrôle explicite du paramètre `filtre` en plus des paramètres de l'adresse attendue | Comparer seulement les paramètres de l'adresse attendue (déjà fait ligne 43) ; le contrôle `filtre` n'est utile que si une vue sans filtre doit refuser une page filtrée : le garder alors comme règle générale « pas de paramètre de vue en trop », sans nommer `filtre` |
| 6 | `agent/src/cli.ts`, aide | Exemples et `--base-url` décrits pour Facturo | Texte d'aide seulement |

Rien à changer, déjà général : la session H (`session.ts`, description sans Facturo depuis la PR #19), les règles données à l'agent (`COURSE_RULES` : « N'utilise jamais le formulaire de connexion » vaut pour tout site), le navigateur local (`browser.ts`), la base (`base.ts`), la vérification C4 (`verification.ts`).

## Hors de ce périmètre, couloir Nathan, à faire ensuite

- `memoire/src/notes.ts`, `urlDepart` : compose `/v<version>/entrer?suite=/v<version><url>`, l'entrée authentifiée de Facturo, pour les tests générés. Pour un site sans versions ni connexion, il faut l'adresse de la note telle quelle. Proposition : un réglage par logiciel dans le vault (par exemple `vault-horama/<logiciel>/logiciel.md`, champ `depart:`), à voir avec Inès, gardienne du vault.
- `jugement/verification/values.ts` : la vue filtrée est reconnue par le libellé « Filtrer : … » de Facturo. Sans effet sur un site sans filtre.

## Ordre proposé

Le point 1 (vues lues dans les notes) d'abord : il débloque aussi le test du mode sombre (demande 5 de `docs/decisions/2026-11-17-demandes-coureur-scene.md`). Les points 2 et 5 quand le vault d'Eugenia aura un écran à paramètre, s'il en a un.
