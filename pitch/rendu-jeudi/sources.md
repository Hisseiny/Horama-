# Rendu du jeudi 19/11 à 8 h : les 4 slides

Demandé pour jeudi 8 h : une slide pour le parcours utilisateur, une pour l'architecture technique, une avec le lien du Loom (ce qui est réalisé), une pour la feuille de route jusqu'à vendredi. Issue [#73](https://github.com/Hisseiny/Horama-/issues/73).

- `index.html` : les 4 slides en 1920 × 1080, selon la charte « L'envoyé » (`docs/da/charte-graphique.md`) : `envoye.css`, mascotte d'Inès sans retouche (`docs/da/mascotte/*.svg`), trait rouge avec sa mesure, points ocre pour le doute.
- `rendu-jeudi-8h.pdf` : les mêmes, exportées par Chrome.

Pour régénérer le PDF après une modification, depuis la racine du dépôt :

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --virtual-time-budget=8000 --print-to-pdf="$PWD/pitch/rendu-jeudi/rendu-jeudi-8h.pdf" "file://$PWD/pitch/rendu-jeudi/index.html"
```

## Avant de déposer

- Slide 3 : lien du Loom ajouté le 18/11 au soir (`#loom`).

## Sources

| Slide | Ce qui est dit | Source |
|---|---|---|
| 1 | Les deux personnes, leur problème | `pitch/persona-responsable-site-eugenia.md`, `pitch/persona-cto-troov.md` |
| 1 | Étapes fait / en cours | `docs/rendu/2026-11-18-parcours-utilisateur.md`. Extension essayée contre un faux service (`docs/tests/2026-11-18-extension-squelette.md`). Réveil par PR : prévisualisation Vercel du clone protégée par une connexion, aucun passage avec H (`docs/tests/2026-11-18-reveil-vercel-clone.md`). Réponse sur la PR : capture poussée une fois sur le clone, aucune réponse publiée sur une vraie PR (`docs/tests/2026-11-18-captures-sur-branche.md`) |
| 2 | Les briques et leur état | README (« Deux modes », « Mode grand public », « Le service que le jury essaie seul ») ; conteneur : `docs/tests/2026-11-18-a68-conteneur.md` (13 pages sur 15, passage incomplet), service pas encore déployé (#68) |
| 3 | Le 404 « portes ouvertes » | `docs/tests/2026-11-18-repetition-reelle.md` (capture `02-trait-defaut.jpg`) ; revérifié le 18/11 à 16 h 12 ; accord de l'école d'après Noé |
| 3 | 8 pages, 4 par clic, 211,6 s, 0,1030 $ | `docs/tests/2026-11-18-a91-visite.md`, passage Eugenia après 14 h 30 |
| 3 | 1 constat juste sur 3, 2 faux restés des doutes | `docs/tests/2026-11-18-repetition-reelle.md` |
| 3 | 7 pages, 3 tours sur 3, 21 règles, 0 pixel d'écart | `docs/tests/2026-11-17-tour-du-site-reel.md` |
| 3 | 11 corrections justes sur 15 | `docs/tests/2026-11-17-correction.md` (cas de Facturo) |
| 4 | Ce qui reste jeudi | Issues ouvertes #67, #68, #69, #71, #72, #122 au 18/11 à 18 h 30 |
| 4 | Vendredi | `docs/feuille-de-route.md`, « Vendredi 20 » |
| 4 | Après le hackathon | README, « Évolutions prévues » ; `docs/feuille-de-route.md` |
