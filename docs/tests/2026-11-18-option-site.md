# Option de site stable — 18 novembre 2026

Branche indépendante `122-option-site`, créée depuis `origin/dev`, sans les changements du contrôle `texte_rogne`.

`ExplorerOptions.site` et `--site` permettent de conserver le même identifiant de site entre plusieurs hôtes de prévisualisation. Sans option, le nom reste dérivé de l’hôte comme avant. L’identifiant explicite doit commencer par une lettre ou un chiffre et ne contenir ensuite que lettres ASCII, chiffres, tirets ou soulignements : il sert de nom de dossier dans le vault, les chemins relatifs et absolus doivent être refusés.

Test hors réseau dans `agent/exploration-explorer.test.ts` : passage simulé avec `--site eugenia-clone`, résultat et référence écrits sous ce site plutôt que `example-org`, passage sans option conservant `example-org`, refus d’une valeur vide et des chemins `..`, `../outside`, `/outside`, tant via CLI que via l’API.

Commande : `pnpm -r --if-present run check`, code 0. Extrait final :

```text
agent check: 1..254
agent check: # tests 260
agent check: # suites 0
agent check: # pass 260
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 17090.477336
agent check: Done
```

Journal complet sur la machine : `/home/ubuntu/horama-122-option-site-check.log`. Aucun appel H pour ce changement, aucun contrat modifié, aucun changement de `session.ts`. Pas de surface graphique modifiée ni de vérification visuelle nécessaire.
