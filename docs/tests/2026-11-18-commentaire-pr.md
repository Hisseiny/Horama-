# Commentaire sur la PR qui a réveillé le passage (issue #71, étape 3), 18 novembre 2026

Couloir Nathan. Sans H, **0 $**. Aucun commentaire n'a été publié sur un vrai dépôt : le `gh` de l'essai est un faux, placé en tête du `PATH`. Il note ses arguments et le corps reçu, et rend une adresse d'essai (`https://example.invalid/…`).

## Tests unitaires

`node --test automatisation/pr-doc/*.test.mjs` : 10 réussis sur 10, dont 3 nouveaux.
- **Le texte** dit le verdict (« 1 défaut prouvé, 1 doute. »), les tests rejoués et écartés, chaque défaut prouvé et chaque doute avec la décision prise (ou « pas tranché »), et le chemin de la note. Il ne contient aucun tiret cadratin.
- **Les cas limites** : « rien à signaler » et « Passage incomplet » sont dits tels quels.
- **La publication** passe par `gh pr comment <adresse> --body-file`. Un échec de `gh` est rendu (`INCONCLUSIVE`, dernière ligne de l'erreur), jamais levé.

## Essai de bout en bout

Le faux SaaS (Facturo) servi en local, `parcours.mjs --sans-agent --sans-base --sans-presentation --base-url http://localhost:3100 --logiciel facturo --tests ca-du-mois-egal-total --choix bug,… --pr https://example.invalid/essai/pull/42 --commenter`, sur une copie du vault : **code 0**.
- La scène dit « Commentaire publié sur la PR : https://example.invalid/essai/pull/42#issuecomment-1 ».
- Le faux `gh` a reçu `pr comment https://example.invalid/essai/pull/42 --body-file <fichier>`.
- Le corps reçu :

```
## Horama : passage 2026-11-18-14h34-50a3

**1 défaut prouvé, 5 doutes.**

### Tests

- Rejoué : ca-du-mois-egal-total

### Défauts prouvés par le code

- liste-des-factures : Problème : ici 1 420 €, là-bas 1 240 €. Il manque 180 €. (décision : bug)

### Doutes, rien n'est prouvé

- tableau-de-bord : Quelque chose a changé ici, autour de « Mode sombre ». (décision : bug)
- tableau-de-bord : Quelque chose a changé ici, autour de « Aujourd'hui : 18/11/2026 ». (décision : bug)
- liste-des-factures : Quelque chose a changé ici, autour de « Mode sombre ». (décision : bug)
- liste-des-factures : Quelque chose a changé ici, autour de « Aujourd'hui : 18/11/2026 ». (décision : bug)
- liste-des-factures : « Exporter » a changé de place. (décision : bug)

La note du passage, avec chaque capture entourée et chaque décision : `vault-horama/facturo/passages/2026-11-18-14h34-50a3.md` (vault Horama).
```

## Ce qui n'est pas testé

- Une publication sur une vraie PR du clone : elle attend l'écriture sur le clone (Ali, #78) et le go de Nathan, car c'est une écriture sur un dépôt public.
- Les captures dans le commentaire : non prévues, l'API de GitHub n'attache pas d'image.
