# Interface Horama dans Figma Make : reskin « L'envoyé » (CDO, 18/11)

Les deux écrans de l'application, dans Figma Make, suivent maintenant la charte graphique « L'envoyé » (`docs/da/charte-graphique.pdf`) et son guide de reskinning. La structure, la grille et le placement des composants n'ont pas changé : seuls les couleurs, les polices, les contours, le logo et la mascotte ont été remplacés.

| Écran | Fichier Figma Make | Capture | Mascotte |
|---|---|---|---|
| 11.1 Couverture | [Concevoir l'interface Horama (light mode) (copie) (copie)](https://www.figma.com/make/95kAUa9u4Rg2A525f5OHtf) | `11-1-couverture.png` | `trouve` (iris miltos, badge « ! ») |
| 11.2 Tests à valider | [Concevoir l'interface Horama (light mode) (copie) (copie)](https://www.figma.com/make/6bnlfg9sPF3qDLPWshYQLO) | `11-2-tests-a-valider.png` | `doute` (iris ocre, badge « ? ») |

## Ce qui a été appliqué

- **Coque** : barre latérale Nuit `#2A2647`, logo « Horama » en Tilt Warp couleur engobe avec l'œil à la place du « o », sélecteur « Facturation Pro · version testée : v13 », bouton ailé « ▷ Lancer un passage », menu (Couverture, Tests à valider, Passages & Rapports, À relire), quota « 14 / 40 passages · PRO », « Agent disponible », profil « Jane Doe ».
- **Zone principale** : fond engobe `#FBF5E6`, cartes papier `#FFFDF6` avec contour encre de 2,5 px, aucune ombre ni dégradé, titres en Tilt Warp, texte en Funnel Sans, mesures en Spline Sans Mono.
- **États** : miltos `#B8321F` (défaut prouvé), ocre `#C48A1E` (suspect), olivier `#2E7D55` (conforme), toujours avec leur signe.
- **Mascotte** : le dessin de `docs/da/mascotte.js` (ailes lilas), fixe en bas à droite, seuls l'iris et le badge changent selon l'écran.

La demande commune envoyée à Figma Make est dans `demande-figma-coque.txt`. Les captures ont été prises sur l'aperçu de chaque fichier, à 1440 × 900.

## Ce qui reste

- Le dossier `interface/` du dépôt n'est pas modifié : ces écrans vivent dans Figma Make (fichiers du CPO).
- Les écrans 11.3 à 11.7 de la spécification ne sont pas encore faits dans Figma.
