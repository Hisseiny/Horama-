# Fins de ligne Unix

17 novembre 2026 — branche `a-gitattributes`, depuis `origin/dev` à jour (`3c4f3e2`).

Ajout de `.gitattributes` : `* text=auto eol=lf` impose LF aux fichiers texte. Les PNG, seule extension binaire identifiée parmi les fichiers suivis inspectés hors `banc/`, sont explicitement marqués `binary`. Les SVG restent du texte. Aucun fichier existant renormalisé, aucun contrat modifié.

Contrôle de l'index avec `git ls-files --eol` (sans lecture du contenu de `banc/`) :

```text
git ls-files --eol | awk '$1 == "i/crlf" || $1 == "i/mixed" { print; count++ } END { print "Fichiers CRLF ou mixtes dans l’index : " count+0 }'
Fichiers CRLF ou mixtes dans l’index : 0
```

`pnpm -r check` — sortie **0** :

```text
agent check: 1..73
agent check: # tests 73
agent check: # suites 0
agent check: # pass 73
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 618.726684
agent check: Done
```

Pas d'essai sur Windows : contrôle des attributs et de l'index sur Linux uniquement.
