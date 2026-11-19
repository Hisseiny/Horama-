# Passage réel du réveil sur la PR #16 du clone (allemand)

Date : 18/11, 23 h 05. Go de Nathan tapé dans la session du couloir Nathan. Code de `dev` à `b170869` (avec #156, #157, #161).

## Ce qui a été lancé

```
node --env-file=.env.local automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --une-fois --commenter --captures-sur-branche horama/captures
```

Clé : `HAI_API_KEY` (pas la clé de démo). Avant : `verifier-machine.sh`, aucune session H active, ports libres.

## Ce qui en est sorti

- PR #16 (f3da680), 22 fichiers. Les 3 tests du vault sont écartés : langue du site changée (fr → de). Seule l'exploration est jouée.
- Exploration de la prévisualisation : 8 pages trouvées, 8 visitées (4 par clic, 3 par adresse, plus la page de départ), 150 s, coût affiché par la scène 0,0709 $ (la note du passage indique 0,0659 $ pour la session H).
- 4 défauts prouvés (`debordement`) et 2 doutes de Holo (`texte-coupe`). Nathan a répondu « bug » aux 6 dans la scène.
- Réponse publiée sur la PR : https://github.com/Hisseiny/eugenia-school-website/pull/16#issuecomment-6993065399, avec les 6 captures entourées poussées sur la branche `horama/captures` du clone.
- Écrit dans le vault (ce que contient cette PR) : `vault-horama/eugenia-clone/passages/2026-11-18-23h05-0ed5.md` et ses 6 captures entourées, et les 6 décisions dans `vault-horama/eugenia-clone/decisions/`.

## Écarté de cette PR

- L'explorateur a réécrit `references/{accueil,admissions,programmes}/defaut--v1.png` avec les pages en allemand (version de passage 1, aucune référence antérieure). Restaurés depuis Git. Cause et correctif : #166 (Ali).
- Il a créé 5 notes produit (carrieres, ecole, entreprises, evenements, programme-bachelor-ia-business) et leurs références v1 prises sur l'allemand. Déplacées hors du vault, dans `.orchestrateur/reveil-pr/pr-16-f3da680/hors-vault/` (ignoré par Git), en attendant #166.
- Les défauts `programmes--controle--1`, `2` et `3` sont le même débordement (129×89 > 96×89, même zone) compté trois fois : #166.
