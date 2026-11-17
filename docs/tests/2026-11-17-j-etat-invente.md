# #54 — Correction de note : état visuel inventé

## Changement

- Branche issue de `3817d95` (PR #53), à fusionner après #53, vers `dev`.
- Exception de dossier confirmée par Ali : Leslie et Nathan sont d'accord pour cette intervention dans `jugement/` ; relecture humaine demandée aux deux.
- La consigne exige un état visuel écrit en toutes lettres dans l'écart, le pourquoi, les indices ou la phrase remplacée. Un ancien état ne prouve pas sa disparition ; faute de nouvel état connu, `nouvelle_phrase: null` utilise le repli existant.
- Le contrôle « ne parle pas de ce changement » utilise désormais `key`, comme la correspondance des libellés de #53 (casse et espaces).
- **Pas de nouveau contrôle lexical d'état dans `validateAnswer`** : le point 2 autorise la consigne seule si le contrôle risque des faux refus. Une négation peut être explicitement sourcée (« n'est plus gris ») ou concerner un texte (« ne contient plus le mot… ») ; un nom de couleur peut être un libellé (« Orange »). La présence du mot « gris » dans l'ancien état ne prouve pas non plus sa négation dans le nouvel état. Un filtre lexical ne garantit donc ni absence de faux refus ni absence d'invention. Les tests existants ne sont pas réécrits pour simuler une garantie du validateur.
- Aucun changement à la scène, à Facturo ou aux contrats. Aucun nouvel appel H.

## Vérification sans réseau

Commande : `pnpm install && pnpm -r --if-present run check`.

Résultat : commande terminée avec le code 0, après `git fetch origin && git merge origin/dev` (« Already up to date. »). La suite existante conserve les cas A et D de #53 ; nouveaux tests pour la consigne et la normalisation du contrôle de changement (dont un libellé voisin refusé).

```text
faux-saas check: # tests 10
faux-saas check: # pass 10
faux-saas check: # fail 0
memoire check: # tests 34
memoire check: # pass 34
memoire check: # fail 0
interface check: # tests 8
interface check: # pass 8
interface check: # fail 0
jugement check: # tests 81
jugement check: # pass 81
jugement check: # fail 0
agent check: # tests 88
agent check: # pass 88
agent check: # fail 0
```

Contrats : compilation terminée sans erreur. Les étapes de typage et le lint de l'agent inclus dans la commande sont verts. Vérification du script de banc par un script jetable hors dépôt (`/home/ubuntu/t54-smoke.mjs`) : 12 appels simulés pour chacun des scénarios réponse null valide, contenu vide et erreur réseau ; sorties et code d'échec vérifiés, aucun réseau. `git diff --check` ne produit aucune erreur.

Statut : **codé non testé** (aucune attestation d'une autre personne). Pas de ligne #54 dans `docs/checklist.md` ; la ligne partagée 5.2 n'est pas réécrite.

## Banc réel — tentative du 17 novembre, bloquée par HTTP 402

Début : `2026-11-17T18:24:11Z`. Commit exécuté : `8af8bdd69347e8a956480aae6a153d8ccbb62d65`. Modèle : `openai/gpt-oss-120b`, température 0. Le secret org `HF_TOKEN` a été lié à l'environnement sans être affiché ni enregistré dans un fichier. Le lancement a terminé avec le code 1.

Les **12 requêtes ont toutes reçu HTTP 402**, sans réponse du modèle :

```text
HTTP 402 : Purchase pre-paid credits to continue using Inference Providers. Alternatively, subscribe to PRO to get monthly included credits.
```

Aucun nouvel essai effectué. Action humaine nécessaire : créditer le compte Hugging Face associé ou résoudre l'accès facturé aux Inference Providers. Une réponse de `whoami` ne garantit pas le crédit d'inférence.

| Cas | Appel | Durée (ms) | nouvelle_phrase | Validateur | Erreur |
|---|---|---:|---|---|---|
| bouton gris | 1 | 166 | aucune réponse | non exécuté | HTTP 402 |
| bouton gris | 2 | 114 | aucune réponse | non exécuté | HTTP 402 |
| bouton gris | 3 | 96 | aucune réponse | non exécuté | HTTP 402 |
| bouton gris | 4 | 97 | aucune réponse | non exécuté | HTTP 402 |
| bouton gris | 5 | 99 | aucune réponse | non exécuté | HTTP 402 |
| bouton gris | 6 | 92 | aucune réponse | non exécuté | HTTP 402 |
| A | 1 | 98 | aucune réponse | non exécuté | HTTP 402 |
| A | 2 | 103 | aucune réponse | non exécuté | HTTP 402 |
| A | 3 | 95 | aucune réponse | non exécuté | HTTP 402 |
| A | 4 | 94 | aucune réponse | non exécuté | HTTP 402 |
| A | 5 | 96 | aucune réponse | non exécuté | HTTP 402 |
| A | 6 | 89 | aucune réponse | non exécuté | HTTP 402 |

Bilan : bouton gris, 6 erreurs sur 6 requêtes, 0 réponse évaluable ; A, 6 erreurs sur 6 requêtes, 0 réponse évaluable. **Ni le critère « 0 invention sur 6 », ni le critère « A juste au moins 5 sur 6 » n'est démontré**. Ils restent **à mesurer** ; aucune erreur ne compte comme une réussite. L'efficacité de la consigne et le rendu à l'écran restent non vérifiés.

Après cette tentative : `git fetch origin && git merge origin/dev` répond « Already up to date. » ; `pnpm -r --if-present run check` termine avec le code 0 (jugement 81/81, agent 88/88, autres résultats identiques à la section sans réseau). Aucune modification de la consigne après la mesure.

### Entrées reconstruites et provenance

Ces entrées sont **reconstruites**, pas les entrées capturées de la scène. Elles ne constituent pas une reproduction exacte du parcours de Nathan. Fichier utilisé : `/home/ubuntu/t54-entrees.json` ; sortie brute : `/home/ubuntu/t54-resultats.jsonl` (messages inclus).

- Écart commun, repris littéralement du test « Eugenia : la question et la phrase remplacée fournissent les deux libellés » dans `jugement/tests/correction.test.ts` : `Un changement autour de « CANDIDATER → ».` Aucun `pourquoi` et aucune note de version.
- `gray` : phrase reconstruite à partir du défaut décrit dans les issues [#49](https://github.com/Hisseiny/Horama-/issues/49), [#54](https://github.com/Hisseiny/Horama-/issues/54) et du [commentaire de Nathan sur #53](https://github.com/Hisseiny/Horama-/pull/53#issuecomment-6956805309) : `Le bouton « CANDIDATER → » est gris, à côté de « TÉLÉCHARGER LA BROCHURE ».` Indices : `[]`, conformément au cas demandé sans indice de texte. Aucune source ne donne la nouvelle couleur.
- `caseA` : phrase reconstruite à partir du changement POSTULER → CANDIDATER de #49 et du libellé voisin du cas A dans le commentaire de Nathan : `Le bouton « POSTULER → » est à côté de « TÉLÉCHARGER LA BROCHURE ».` Ce n'est pas la phrase « … est seul. » du test unitaire, qui ne documenterait pas la position conservée.
- Indices A : `Quelque chose a changé autour de « CANDIDATER → ». Bug ou voulu ?` (texte exact du test Eugenia) ; `Dans la version de référence, à cet endroit : « POSTULER → ».` (gabarit de `jugement/scripts/t52-correction.ts`, cas `colonne-renommee`, avec l'ancien libellé de #49 substitué) ; `CANDIDATER →` (indice lu du test « POSTULER devient CANDIDATER avec un indice lu »). Cette combinaison est reconstruite, non relevée dans la scène.
- Enveloppe synthétique commune : logiciel `eugenia`, écran `accueil`, vue `defaut`, version `13`, note `produit/accueil.md`, titre `Accueil`, entête vide et aucune règle. Identifiants `t54-gray` / `t54-case-a`, passage `t54-reconstruction`, auteur `Banc reconstruit`, horodatage de fixture `2026-11-17T00:00:00.000Z` : ce ne sont pas des métadonnées de parcours réel.

### Relancer après résolution du blocage

Préparer hors du dépôt `/home/ubuntu/t54-entrees.json`, objet avec les clés `gray` et `caseA`. Chaque valeur a la forme `{ "decision": <Decision C5>, "note": <Note de @horama/memoire>, "releaseNote": <Note facultative>, "indices": <tableau de chaînes exactes> }`.

- Pour rejouer cette tentative, utiliser les entrées reconstruites détaillées ci-dessus. Pour valider le parcours réel de l'issue, obtenir séparément les entrées capturées auprès de Nathan et les identifier comme telles.
- Ne mettre aucun jeton ni identifiant sensible dans ce fichier ; `Note` est le type exporté par `@horama/memoire` (`memoire/src/notes.ts`).

Une fois `HF_TOKEN` lié à l'environnement du shell, depuis la racine :

```sh
node jugement/scripts/t54-correction.ts /home/ubuntu/t54-entrees.json openai/gpt-oss-120b > /home/ubuntu/t54-resultats.jsonl
```

Le script fait exactement 6 appels directs par cas, séquentiellement, température 0, sans relance, sans nudge et sans `proposerCorrection`. Il enregistre les messages, réponses brutes, erreurs, durées, jetons disponibles et le résultat du validateur ; il ne prétend pas juger la vérité de l'état visuel. Un échec réseau met le code de sortie à 1 et ne compte jamais comme réussite.

Relire les 12 réponses contre les sources, y compris celles acceptées par le validateur. Critères : `gray`, **0 correction inventée sur 6** ; `caseA`, **au moins 5 corrections justes sur 6**, qui gardent le libellé voisin et n'inventent pas d'état. Un null sur A est un échec ; sur `gray`, un repli sans correction n'est pas une invention. Reporter ici les dénominateurs, erreurs et résultats réels, avec le commit et la date, sans déduire une réussite du seul code de sortie. Si une décision d'équipe devient nécessaire, la décrire dans la PR et arrêter.
