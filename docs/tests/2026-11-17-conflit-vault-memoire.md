# 2026-11-17 : conflit rapports du vault et test mémoire

Branche `a-conflit-vault-memoire`, base `dev` `a22f812001881504f1b0305464e4734b9f4e8aef`. Décision associée : [2026-11-17-rapports-vault-test-memoire](../decisions/2026-11-17-rapports-vault-test-memoire.md).

## 1. Vérification sur `dev`

Lancé : `pnpm install && pnpm -r check`.

Sortie : code 0 ; faux-saas 7/0, mémoire 28/0, jugement 12/0, agent 39/0, interface 8/0 (réussites/échecs). Le défaut « 13 au lieu de 10 » n'apparaît pas : `git ls-files vault-horama/facturo/passages` ne rend que `.gitkeep`, les trois rapports du 17/11 ayant été archivés hors du dépôt.

## 2. Reproduction isolée

Lancé : script Node jetable qui copie le vault dans `/home/ubuntu/horama-vault-investigation-*`, ajoute `facturo/decisions/recent.md` comme le test, appelle trois fois le véritable `ecrireRapportPassage` avec `c6Rapport` et des identifiants distincts, puis compte avec le véritable `derniersFichiers(copie, 100)`. La copie est supprimée dans un `finally`.

Sortie (code 0) :

```text
Copie du vault + recent.md : 10
Après trois rapports : 13
Reproduction isolée : assertions 10 puis 13 vérifiées ; vault du dépôt inchangé.
```

## Non testé

Aucun passage H rejoué ; le test original n'a pas été exécuté en échec sur le vault du dépôt.
