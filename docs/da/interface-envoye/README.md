# Interface Horama dans Figma Make : reskin « L'envoyé » (CDO, 18/11)

Les écrans de l'application, dans Figma Make, suivent la charte graphique « L'envoyé » (`docs/da/charte-graphique.pdf`) et son guide de reskinning. Seuls les couleurs, les polices, les contours, le logo et la mascotte ont été remplacés sur les écrans existants. Les écrans 11.2 à 11.7 ont été créés d'après la spécification des écrans. Les sept écrans sont dans un seul fichier Figma Make, et on passe de l'un à l'autre par le menu.

| Écran | Fichier Figma Make | Capture | Mascotte |
|---|---|---|---|
| 11.1 Couverture | [Concevoir l'interface Horama (light mode) (copie) (copie)](https://www.figma.com/make/95kAUa9u4Rg2A525f5OHtf) | `11-1-couverture.png` | `regarde` (iris `#7F77DD`, sans badge) |
| 11.2 Tests à valider (de la note au test) | même fichier, route `#screen-11-2` | `11-2-tests-a-valider.png` | `doute` (iris ocre, badge « ? ») |
| 11.3 Passage en cours | même fichier que 11.1, route `#screen-11-3` | `11-3-passage-en-cours.png` | `regarde` |
| 11.4 Rapport de passage | même fichier, route `#screen-11-4` | `11-4-rapport-de-passage.png` | `fini` (iris olivier, coche) |
| 11.5 Comparaison des versions | même fichier, route `#screen-11-5` | `11-5-comparaison-des-versions.png` | `trouve` (iris miltos, badge « ! ») |
| 11.6 À relire | même fichier, route `#screen-11-6` | `11-6-a-relire.png` | `doute` |
| 11.7 Dérive documentaire | même fichier, route `#screen-11-7` | `11-7-derive-documentaire.png` | `fini` |

Navigation branchée : « Tests à valider » ouvre 11.2, « ▷ Lancer un passage » ouvre 11.3, « Passages & Rapports » ouvre 11.4, la ligne « Suspect » du rapport ouvre 11.5, « À relire » et « Ouvrir la relecture → » ouvrent 11.6, « C'est voulu » sur le second cas ouvre 11.7. L'entrée active du menu suit l'écran affiché.

## Ce qui a été appliqué

- **Coque** : barre latérale Soleil clair `#FFE39A` en mode clair, Encre en mode sombre, avec contour encre (voir plus bas), logo « H[œil]rama » en Tilt Warp couleur encre, sélecteur « Facturation Pro · version testée : v13 », bouton ailé « ▷ Lancer un passage », menu (Couverture, Tests à valider, Passages & Rapports, À relire), quota « 14 / 40 passages · PRO », « Agent disponible », profil « Jane Doe ».
- **Zone principale** : fond engobe `#FBF5E6`, cartes papier `#FFFDF6` avec contour encre de 2,5 px, aucune ombre ni dégradé, titres en Tilt Warp, texte en Funnel Sans, mesures en Spline Sans Mono.
- **États** : miltos `#B8321F` (défaut prouvé), ocre `#C48A1E` (suspect), olivier `#2E7D55` (conforme), toujours avec leur signe.
- **Mascotte** : le dessin de `docs/da/mascotte.js` (ailes lilas pointues, trait `#1C1C1C`), fixe en bas à droite ; seuls l'iris et le badge changent selon l'écran.

Les demandes envoyées à Figma Make sont dans `demande-figma-coque.txt`, `demande-figma-barre-papier.txt` et `demandes-ecrans-11-3-a-11-7.txt`. Les captures ont été prises sur l'aperçu du fichier, à 1440 × 900.

## Barre latérale : décisions du 18 et du 19/11

La barre latérale n'est **jamais violette**. En mode clair, elle est en Soleil clair `#FFE39A`, pour se détacher du fond et des cartes. En mode sombre, elle est en Encre `#1C1C1C`. Voir `barre-laterale.md`.

À quoi sert chaque écran : voir `ecrans.md`.

## Ce qui reste

- Le dossier `interface/` du dépôt n'est pas modifié : ces écrans vivent dans Figma Make (fichiers du CPO).
- Une restauration de version dans Figma Make avait effacé les écrans 11.3 et 11.4 et remis l'ancien logo sur 11.1 : ils ont été recréés le 18/11 au soir. Avant de restaurer une version, vérifiez qu'elle contient les dossiers `interface/screen-11-3` à `screen-11-7`.
- Le deuxième fichier Figma Make (ancien écran « Tests à valider ») n'est plus la référence et n'est plus mis à jour : seul le fichier principal compte.
- Les tableaux reproduits dans les maquettes (11.3, 11.5, 11.7) affichent « à mesurer » là où la spécification ne donne pas de valeur.
