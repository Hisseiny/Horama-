# Point 3 de #35 : site sans version

Statut : **codé non testé** (validation par une autre personne non attestée).

## Changement

Les écrans non versionnés conservent désormais le chemin de `--base-url` :
`http://localhost:8000/site/` + `/admissions.html` donne `/site/admissions.html`.
Le champ `address` reste relatif à l'origine pour un même hôte, conformément aux
tests existants Dolibarr ; sa résolution donne bien l'adresse complète attendue.
`start`, `VIEWS`, `COURSE_RULES`, Facturo et les contrats ne sont pas modifiés.
Sans `<numero>` ni régressions demandées, aucune facture ni `?r=` n'est ajoutée.
Les tests couvrent bases avec/sans chemin et slash final, requête héritée,
chemin erroné, requête absente/incorrecte et base invalide.

## Page et passage scripté

Page d'essai originale (pas une copie du site officiel), sans connexion :
`/home/ubuntu/essais/site/admissions.html`. Vault isolé :
`/home/ubuntu/essais/vault-eugenia`. Commandes exécutées :

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory /home/ubuntu/essais
node /home/ubuntu/essais/run-static.mjs
```

Le script construit la consigne, ouvre la page via CDP Chrome 29229, évalue
`here` dans la vraie page, capture son PNG, puis appelle le coureur avec une
session H factice et le vrai relevé texte/PNG. Aucun appel à H ni clé H.

Sorties réelles :

```text
start: http://localhost:8000/site/admissions.html
address: /site/admissions.html
here: new RegExp("^/site/admissions\\.html$").test(location.pathname) && new URLSearchParams(location.search).get("filtre") === null
Chrome here: true URL: http://localhost:8000/site/admissions.html
{"etat":"joue","captures":1,"verdict":"INCONCLUSIVE","rapport":"/home/ubuntu/essais/vault-eugenia/eugenia/passages/static-scripted.md"}
```

Capture produite et relue visuellement : `/home/ubuntu/essais/static-page.png`.
La page affiche « Admissions » et « Candidatures ouvertes ».
Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` ne sont pas disponibles
dans l'environnement de cette session ; aucune connexion partagée tentée.
Repli utilisé : base mémoire et rapport Markdown persistant dans le vault de copie
ci-dessus. `INCONCLUSIVE` est attendu : aucune règle métier dans cet essai
technique ; ce n'est pas une réussite métier. Session `scripted-no-h`.

## Vérifications

```sh
pnpm install && pnpm -r --if-present run check
pnpm --filter @horama/agent check
git fetch origin dev && git merge origin/dev
pnpm -r --if-present run check
pnpm --filter @horama/interface --filter @horama/jugement --if-present run check
```

Installation réussie. Fusion : `Already up to date.`
Agent (lint, types et tests) :

```text
1..82
# tests 82
# pass 82
# fail 0
```

**Vérification globale bloquée hors du périmètre**, aux deux exécutions :

```text
memoire check: not ok 28 - derniersFichiers : les plus récents d'abord, sans dossiers ni fichiers cachés
memoire check:     11 !== 10
memoire check: # pass 27
memoire check: # fail 1
```

Localisation : `memoire/tests/traces.test.ts:103`, attente fixe de 10 fichiers.
Aucun fichier de `memoire/` ni du vault source n'est modifié par cette branche.
Le check récursif s'arrête à cet échec ; les autres paquets pertinents ont été
contrôlés séparément :

```text
faux-saas check: # pass 7
faux-saas check: # fail 0
contrats check: Done
jugement check: # pass 34
jugement check: # fail 0
interface check: # pass 8
interface check: # fail 0
```

Journaux hors dépôt : `/home/ubuntu/essais/{install,check,agent-check,final-check,remaining-check,static-run}.log`.
À faire par un humain : traiter l'échec mémoire hors périmètre, relire ce passage,
puis rejouer avec le vrai vault Eugenia et la base partagée disponible.
Aucun essai H réel ni validation du site officiel revendiqué.
