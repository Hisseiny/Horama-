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

## Banc réel — à mesurer

`HF_TOKEN` indisponible : aucun appel au modèle effectué. Aucun résultat ni taux de réussite annoncé. L'efficacité de la consigne et le rendu à l'écran restent non vérifiés.

Avant le lancement, demander à Nathan les entrées exactes de la scène pour les deux cas (ne pas les reconstituer à partir de la note) : décision C5, note de l'écran chargée, note de version chargée éventuelle, indices transmis. Sans ces entrées, la mesure conforme à l'issue reste bloquée.

Préparer hors du dépôt `/home/ubuntu/t54-entrees.json`, objet avec les clés `gray` et `caseA`. Chaque valeur a la forme `{ "decision": <Decision C5>, "note": <Note de @horama/memoire>, "releaseNote": <Note facultative>, "indices": <tableau de chaînes exactes> }`.

- `gray` : cas « bouton gris » sans indice de texte donnant le nouvel état ; conserver les autres indices exacts, notamment la question si elle était transmise.
- `caseA` : cas A de #53, remplacement de « POSTULER → » par « CANDIDATER → », avec le libellé voisin « TÉLÉCHARGER LA BROCHURE » dans la phrase remplacée et les indices exacts de la scène.
- Ne mettre aucun jeton ni identifiant sensible dans ce fichier ; `Note` est le type exporté par `@horama/memoire` (`memoire/src/notes.ts`).

Une fois `HF_TOKEN` lié à l'environnement du shell, depuis la racine :

```sh
node jugement/scripts/t54-correction.ts /home/ubuntu/t54-entrees.json openai/gpt-oss-120b > /home/ubuntu/t54-resultats.jsonl
```

Le script fait exactement 6 appels directs par cas, séquentiellement, température 0, sans relance, sans nudge et sans `proposerCorrection`. Il enregistre les messages, réponses brutes, erreurs, durées, jetons disponibles et le résultat du validateur ; il ne prétend pas juger la vérité de l'état visuel. Un échec réseau met le code de sortie à 1 et ne compte jamais comme réussite.

Relire les 12 réponses contre les sources, y compris celles acceptées par le validateur. Critères : `gray`, **0 correction inventée sur 6** ; `caseA`, **au moins 5 corrections justes sur 6**, qui gardent le libellé voisin et n'inventent pas d'état. Un null sur A est un échec ; sur `gray`, un repli sans correction n'est pas une invention. Reporter ici les dénominateurs, erreurs et résultats réels, avec le commit et la date, sans déduire une réussite du seul code de sortie. Si une décision d'équipe devient nécessaire, la décrire dans la PR et arrêter.
