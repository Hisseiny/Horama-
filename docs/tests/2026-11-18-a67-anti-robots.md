# #67 — fin propre sur blocage et relevé indisponible

Branche : `a-67-anti-robot`. Aucun passage réel H, aucun contournement.

- Découverte HTTP : serveur local, pages de vérification, Incapsula, Cloudflare,
  Turnstile, HTTP 403/429/404 et connexion. Robots et sitemap protégés : aucune
  session H créée. Absence de robots/sitemap (404) : pas un blocage.
- Page rendue : CDP simulé, mêmes réponses, fin propre sans capture ni Holo.
- Contact avec widget reCAPTCHA, contenu normal et vide : pas de blocage.
- Exception de relevé : raison réelle conservée immédiatement, page
  `non_visitee`, aucune nouvelle invitation vers cette page, autres relevés continués.

Le format reste inchangé. Il ne contient pas de champ récapitulatif textuel global :
la phrase est conservée dans `agents[].raison`, `pages[].raison` et les constats
`INCONCLUSIVE` (`description` et `raison`). Pour un blocage attendu : `etat: fini`,
pages non visitées `INCONCLUSIVE`, jamais `PASS`.

Commandes après modifications :

```text
node --test agent/exploration-*.test.ts
# tests 129
# pass 129
# fail 0

pnpm -r --if-present run check
agent check: # tests 234
agent check: # pass 234
agent check: # fail 0
agent check: Done
```

Un premier lancement avant la mise en place automatique des liens workspace
par pnpm échouait avec `ERR_MODULE_NOT_FOUND` ; les commandes ci-dessus utilisent
ensuite les dépendances workspace disponibles. Deux tests ont initialement révélé
une connexion CDP supplémentaire et un 404 de sitemap mal classé ; corrigés.

Limites : détection heuristique générique, pas de garantie sur toutes les protections.
La détection rendue propre à cette modification utilise un CDP simulé ; aucun
nouvel essai sur site protégé réel, aucune vérification visuelle de la scène.

## Après intégration de dev

`git fetch origin dev`, puis fusion de `origin/dev` (`52f991d`, correctif #112
inclus) dans la branche : commit de fusion `270be64`. Un conflit dans l'assertion
du test d'exception de relevé a été résolu en conservant la réponse spécifique
de l'exploration (raison réelle, puis pages restantes). Aucun changement propre
à cette branche dans `coureur.ts`.

```text
pnpm -r --if-present run check
agent check: 1..229
agent check: # tests 235
agent check: # pass 235
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 16651.786751
agent check: Done
```

`git diff --check` : sortie vide. Recherche des cinq noms de sites interdits
dans `agent/src` : aucune correspondance (code de sortie de recherche 1).
