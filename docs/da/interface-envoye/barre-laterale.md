# Barre latérale Horama : règles à conserver

La barre latérale suit la direction graphique « L'envoyé » (`docs/da/charte-graphique.pdf`). Ces règles valent pour tous les écrans de l'application, de 11.1 à 11.7.

## Coque

- Position fixe à gauche.
- Largeur desktop : 240 px.
- Hauteur : toute la hauteur de l'écran.
- Fond Nuit : `#2A2647`.
- Bordure droite : 2,5 px solid `#1C1C1C`.
- Padding : 28 px 16 px 24 px.
- Aucun dégradé, aucune ombre portée.
- La barre reste Nuit en mode clair comme en mode sombre.
- Les textes gardent un contraste d'au moins 4,5:1.

## Typographies

- Logo et mot de marque : Tilt Warp 400.
- Navigation, boutons et libellés : Funnel Sans 400, 600 ou 700.
- Versions, compteurs, abonnement et données mesurées : Spline Sans Mono 400, 500 ou 600.
- Aucune quatrième police.

## Palette autorisée

| Rôle | Couleur |
|---|---|
| Nuit, fond de la barre | `#2A2647` |
| Engobe, texte principal clair | `#FBF5E6` |
| Filet, texte secondaire clair | `#E2D6B8` |
| Encre, boutons et contours | `#1C1C1C` |
| Aile, ailes du bouton et compteurs secondaires | `#AFA9EC` |
| Miltos, alerte « À relire » | `#B8321F` |
| Olivier, agent disponible | `#2E7D55` |
| Iris du logo | `#7F77DD` |

Miltos et olivier sont réservés aux états.

## Logo

- Texte affiché : H[œil]rama.
- Tilt Warp 400, 30 px.
- Couleur Engobe `#FBF5E6`.
- Espacement des lettres -0,01em, interligne 1.
- Aucun espace entre le H, l'œil et « rama ».
- L'œil remplace uniquement le « o ». Il est sans ailes, mesure 0,7em × 0,7em et se pose sur la ligne de base.
- On ne redessine jamais l'œil :

```svg
<svg viewBox="26 26 44 44">
  <circle cx="48" cy="48" r="20" fill="#fff" stroke="#2B2B2B" stroke-width="3"/>
  <circle cx="48" cy="48" r="10.5" fill="#7F77DD"/>
  <circle cx="48" cy="48" r="4.6" fill="#2B2B2B"/>
  <circle cx="51.6" cy="44.4" r="2.2" fill="#fff"/>
</svg>
```

## Sélecteur de projet

- Placé 24 px sous le logo, sur toute la largeur.
- Padding 10 px 13 px.
- Bordure 2,5 px solid `#1C1C1C`, rayon 10 px.
- Fond transparent sur la Nuit.
- Spline Sans Mono :
  - nom du projet en 15 px, graisse 600, Engobe ;
  - version en 12 px, Filet.
- Contenu : « Facturation Pro », « version testée : v13 ».

## Bouton principal ailé

- Libellé sur une seule ligne, sans retour à la ligne : « ▷ Lancer un passage ».
- Hauteur minimale 44 px, pilule de rayon 999 px.
- Fond Encre `#1C1C1C`, bordure 2,5 px solid `#1C1C1C`.
- Texte Engobe, Funnel Sans 600, 13 px.
- Deux ailes lilas `#AFA9EC`, contour 2,5 px solid `#1C1C1C`, qui dépassent visiblement de chaque côté.
- Aucune ombre.

## Navigation principale

- 20 px après le bouton.
- 4 px entre les entrées ; chaque entrée fait 44 px de haut.
- Funnel Sans 16,5 px, icône d'environ 18 px.
- Grille interne : icône, libellé, compteur.
- Espacement interne 10 px, padding horizontal 11 px, rayon 10 px.
- Entrée inactive :
  - fond transparent ;
  - texte et icône en Filet `#E2D6B8`, lisibles sur la Nuit.
- Entrée active :
  - fond Encre ;
  - bordure 2,5 px solid `#1C1C1C` ;
  - texte Engobe, graisse 700.
- Ordre : Couverture, Tests à valider, Passages & Rapports, À relire.

## Compteurs de navigation

- **Compteur standard** :
  - rond, 25 × 25 px au moins ;
  - bordure 2,5 px solid `#AFA9EC` ;
  - Spline Sans Mono 12 px ;
  - texte clair sur la Nuit.
- **Compteur d'alerte « À relire »** :
  - fond et bordure Miltos `#B8321F` ;
  - texte Engobe, contraste d'environ 5,49:1 ;
  - le miltos n'est utilisé ici que parce qu'il s'agit d'un état d'alerte.

## Pied de la barre

- À 24 px du bas.
- Séparateur supérieur 1 px solid `#1C1C1C`, padding supérieur 16 px.
- 14 px entre les éléments.
- **Bascule de thème** :
  - pilule de 38 px de haut au moins ;
  - bordure pointillée de 2,5 px `#1C1C1C` ;
  - texte Engobe, Funnel Sans 600, 13 px.
- **Abonnement** : « 14 / 40 passages · PRO », Spline Sans Mono 500, 12 px, Engobe.
- **Agent** :
  - point plein Olivier `#2E7D55` de 9 px ;
  - « Agent disponible » en Funnel Sans 600, 14 px, Engobe ;
  - « Prêt pour un passage » en 13 px, Filet.
- **Profil** : avatar, informations, déconnexion.
  - Avatar de 36 × 36 px : carré de rayon 10 px, fond Engobe, bordure 2,5 px solid `#1C1C1C`.
  - Initiales « JD » en Encre, Spline Sans Mono 600, 12 px.
  - « Jane Doe » en Engobe, Funnel Sans 600, 14 px.
  - « Équipe produit » en Filet, 13 px.
  - Icône de déconnexion Engobe, discrète, opacité réduite.

## Responsive, sous 600 px

- La barre passe en position relative, sur toute la largeur, en hauteur automatique.
- Padding 22 px 16 px.
- La bordure droite devient une bordure basse de 2,5 px.
- Aucun débordement horizontal, et l'ordre des éléments reste le même.

## Interdit

- Remettre un fond clair sur la barre latérale.
- Utiliser `#E7DECA` comme fond de la barre.
