# Tour de contrôle : corrections de l'audit UI/UX (19/11)

Audit fait par la coordination (sous-agent Fable, build en ligne `index-Cwmag7wE.js`) : 4 bloquants, 11 importants, 15 finitions. Corrigés ici : B1 à B4, I1 à I11, F1 à F14. Non faits, comme décidé : F15 (état d'exemple du prototype dans `PrototypeContext.tsx`) et le hors-périmètre (rectangles des captures du mode développeur, à corriger dans la scène).

Décisions de la coordination appliquées : B4, le bouton « Mode sombre » est retiré (la tour reste en clair) ; I10, l'adresse d'une exploration perdue (404) est citée une fois, puis l'entrée est retirée de l'historique du navigateur. Un service injoignable ne retire rien.

## Ce qui a été lancé

- Typage : `./node_modules/.bin/tsc --noEmit -p .` (depuis `automatisation/tour`) : aucune erreur.
- Build : `FIGMA_PUBLIC_URL=. ./node_modules/.bin/vite build --outDir ../../accueil/tour --emptyOutDir` : réussi. Bundle sans tiret cadratin ni demi-cadratin, sans « Mode sombre », « ↗ », « smooth » ni « non publiés ».
- Navigateur (Chromium piloté par Playwright), `accueil/` servi en local, sur les vraies données de l'index public :
  - 1920×1080, 1440×900, 1280×720, 1024×768, 768×1024 et 390×844, sur les trois écrans (Passages, Rapport de la PR #16, À relire) : largeur de page égale à la fenêtre partout, aucun élément du contenu hors de l'écran ;
  - index coupé (requêtes vers raw.githubusercontent.com refusées), à 1440×900 : « Rien à afficher tant que l'index ne répond pas. », plus de « 0 cas à trancher » ni « Tout est tranché. », barre latérale « index muet » ;
  - historique simulé (un service factice intercepté) : une exploration perdue (404) et une en cours. La phrase cite l'adresse perdue, l'entrée disparaît du `localStorage` après ce premier affichage ; l'exploration en cours affiche « visite en cours », jamais « rien de prouvé » en vert, et son rapport dit « Rien de prouvé pour l'instant : ce passage n'est pas allé au bout. ».

Captures : `2026-11-19-tour-audit/avant/` (tour en ligne avant correction, mêmes tailles, index joignable et coupé) et `2026-11-19-tour-audit/apres/`.

## Écarts par rapport aux corrections proposées par l'audit

- `tour.css` n'était pas chargé après le prototype (ordre réel : 11-8, tour.css, 11-4, 11-6, index.css) : il est importé en dernier dans `src/main.tsx`, sinon B1, I8, F5 et F6 perdaient à spécificité égale.
- B1 : le bloc de l'audit ne suffisait pas à 768 et 1024 (tableau des passages chevauché, journal coupé, tableau du rapport plus large que la colonne). Sous 1100 px, les lignes passent en cartes et le rapport ne garde que ses cartes de constats (qui portent la décision). La mascotte passe derrière les cartes : à 1280 elle recouvrait la colonne Décision.
- I1 : `interrompu` (valeur réelle du format `horama-exploration-1`) s'affiche « visite interrompue » ; un état nul, « état inconnu ».
- I3 : défauts et doutes sur deux lignes, sans « · » (la colonne fait 150 px).
- F5 : 910 px au lieu de 900 (somme des minimums : 907).
- F6 : deux colonnes de plis sous 720 px, comme le prototype.

## Pas fait ou à mesurer

- Titre de PR long à 1280 : coupé par des points de suspension dans le tableau des passages (titre complet dans le rapport).
- La flèche « → » de « Voir le rapport » vient d'une police de secours, comme le « ← » déjà en place.
- Pastilles d'À relire sans singulier (« 1 défauts prouvés » si un seul) ; `fromExploration` ne passe pas par la réécriture de la langue ; une exploration en file (sans `format`) compte comme « illisible ». Hors audit, non touchés.
- Rien n'est en ligne : horama-gold ne se redéploie que par Léon (Vercel limité).
