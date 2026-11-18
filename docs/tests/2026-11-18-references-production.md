# Références du vault du clone reprises sur la production (issue #71), 18 novembre 2026

Couloir Nathan. Les PR #11 (formulaires et traçage coupés, `vercel.json` avec `cleanUrls`) et #14 (correctifs de mise en page) du clone sont fusionnées. La production Vercel de `main` (`3725b94`, statut Vercel `success` à 17 h 19 UTC) sert maintenant de référence au mode dev, à la place du clone construit en local.

## Ce qui a été lancé et ce qui en est sorti

1. **Production, en lecture seule.**
   - Les pages `/`, `/admissions`, `/candidature`, `/brochure`, `/contact`, `/programmes`, `/programme/bachelor-ia-business`, `/programme/master-ia-business-alternance` et `/portfolio` répondent 200.
   - HTML brut des 5 premières : aucune trace de Google Tag Manager, gtag, HubSpot ni Facebook. Le seul « HubSpot » de la page du Bachelor est le nom d'un cours du programme.
   - Dans le Chrome de la scène, sans clic ni saisie, sur `/`, `/admissions`, `/candidature`, `/brochure` et `/contact` : 0 requête vers Google Tag Manager, Google Analytics, HubSpot ou Facebook, aucun hôte tiers, et pas de barre Vercel.
2. **Relevés.** Ils sont faits comme le moteur, par `capture()` de `scene.mjs` (1280 × 900, haut de page), sur les 5 écrans du vault.
   - Une première série, prise 1,5 s après le chargement, et une seconde aussitôt après : 4 pages sur 5 diffèrent dans leurs photos. Le soupçon portait sur des images pas encore chargées.
   - En attendant que les images du premier écran soient chargées (2 par page, prêtes en 0,8 s), il reste des écarts entre deux lectures : au plus 3/255, sur 146 672 pixels de la photo du Bachelor et 2 904 de Programmes. La production alterne entre deux variantes de ces photos (lecture 1 = lecture 3, lecture 3 différente de la lecture 4).
   - Pour le moteur (`comparerImages`, seuil de 24/255 par canal, `docs/decisions/2026-11-16-seuil-de-bruit.md`), ces lectures n'ont **aucune zone d'écart** : 0 sur les 5 pages, entre chaque paire de lectures. Aucune zone à ignorer n'est donc nécessaire.
3. **Avant et après la #14.**
   - Les textes de la production sont identiques à ceux du clone local, sur les 5 pages.
   - Les images ont changé : Programmes compte 21 zones, Admissions 16 zones, Bachelor et MSc une grande zone chacun ; l'accueil n'a pas changé.
   - Ce qui a changé : les titres « Programmes » et « Admissions », coupés au milieu du mot à 1280 × 900, tiennent sur une ligne, et le haut des pages de programme est mis en page autrement.
4. **Vault mis à jour.**
   - Les 5 `references/<ecran>/defaut--v1.png` sont les captures de la production, prises images chargées.
   - Les notes de Programmes et d'Admissions ne citent plus le titre coupé, et le README le range parmi les écarts corrigés par la #14.
   - Les notes, les règles et le README disent que les textes sont identiques sur la production de `main` (`3725b94`) et que le traçage du clone est coupé.
5. **Relevé à blanc, sans changement**, sur une nouvelle lecture de la production comparée aux nouvelles références : 0 zone et 0 pixel au-delà du seuil, sur les 5 écrans. La règle de la durée du Bachelor (accueil et Programmes) donne `PASS`, « 3 ans = 3 ans ».
6. Les deux commits de démonstration (`automatisation/demo/clone/`, en local) s'appliquent toujours sur `main` du clone (`git apply --check`).

## Ce qui n'est pas testé

- Aucun passage avec H.
- Les prévisualisations Vercel gardent leur barre d'outils (`vercel.live`). À couper dans le projet Vercel avant la démo : elle sortirait en écart sur chaque page.
