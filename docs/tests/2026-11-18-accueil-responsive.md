# Accueil responsive (issue #136), 18 novembre 2026

La landing vient du couloir Nathan (PR #131) ; le dossier `accueil/` a été placé à la racine, dans le couloir Ali selon la PR et `AGENTS.md`. La scène du titre et son défaut volontaire ne changent pas.

Avant : https://horama-gold.vercel.app/. Après : `python3 -m http.server 4192 --bind 127.0.0.1 --directory accueil`. Captures réalisées dans Chrome via CDP (port 29229), après le tracé et la révélation du pli. Le dépôt ne contient pas les captures de ce passage : elles sont dans `/home/ubuntu/screenshots/horama-responsive-{before,after}-<largeur>x<hauteur>-dpr<facteur>.png`.

| Configuration | Avant | Après |
|---|---|---|
| 1280 × 720 | Le hero faisait 820 px ; le bas de la scène sortait de l'écran. | Hero de 720 px, titre 86,4 px, bouton et frise visibles. |
| 1366 × 768, DPR 1 et 1,25 | Le hero faisait 820 px dans les deux cas. | Hero de 768 px dans les deux cas. |
| 1440 × 900 | Composition de référence. | Titre de 108 px, mêmes positions du titre, formulaire et rapport. Comparaison visuelle avec `captures/2026-11-18-accueil/hero-1440-apres-animation.png` : même composition, à la barre de défilement et à la phase des éléments animés près. |
| 1536 × 864, 1920 × 1080 et 2560 × 1440 | Composition large. | Titre plafonné à 108 px ; contrôles visibles, sans étirement du bloc. |
| 1024 × 768 et 768 × 1024 | Le titre occupait plus de hauteur et repoussait le formulaire. | Titre plafonné à 76 px ; à 768 px de large, le début du formulaire remonte de 722 à 619 px. |
| 390 × 844 et 360 × 640 | Le texte indicatif du champ était tronqué ; à 360 × 640, seul le bord du formulaire apparaissait dans le premier écran. | Champ au-dessus du bouton, exemple d'adresse entier ; à 360 × 640, le bouton occupe les coordonnées verticales 590 à 640 px. |
| 320 × 640, mouvements réduits | Non mesuré. | Pas de défilement horizontal ; le rapport et le tracé sont présents sans animation du soleil. Le bas du bouton se voit en défilant. |

`pnpm check` : 259, 79, 34, 10 et 8 tests réussis, 0 échec dans chaque suite. `node --check accueil/envoye.js` et `git diff --check` : code 0.

Références : [guide responsive de web.dev](https://web.dev/articles/responsive-web-design-basics), [WCAG 2.2, critère de redistribution du contenu](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). La simulation du DPR ne remplace pas un test sur le poste d'Ali ; Safari, le zoom navigateur à 125 % et l'envoi d'une exploration n'ont pas été vérifiés.
