# Prototype de l'interface (code du fichier Figma Make)

Ce dossier contient le code du prototype « L'envoyé » : les 8 écrans 11.1 à 11.8 et l'écran de connexion. C'est le même code que le fichier Figma Make de référence, écrit directement en code, sans l'IA de Figma Make.

- Fichier Figma Make à jour : https://www.figma.com/make/IZqTWw7BCIEb0oSnDcA945
- Les anciens fichiers Make (`KEvDa7ELN9ILjRT4zhFdRE` et avant) ne sont plus mis à jour.

C'est une maquette : rien n'est branché sur la base ni sur l'agent H. Les chiffres viennent de `contrats/exemples/couverture.json` (une copie locale, pas le contrat du dépôt) ou sont écrits « à mesurer ».

## Lancer

```bash
cd docs/da/interface-envoye/prototype
npx -y pnpm@9 install --frozen-lockfile --ignore-workspace
npx vite --port 5173
```

Puis ouvrir http://localhost:5173 en 1440 × 900. Le dossier n'est pas dans l'espace de travail pnpm du dépôt : il ne change rien à `pnpm install` ni à `pnpm -r check` à la racine.

## Écrans

| Adresse | Écran |
|---|---|
| `#login` | Connexion (e-mail et mot de passe, SSO, mot de passe oublié, demande d'accès) |
| `#` | 11.1 Couverture |
| `#screen-11-2` | 11.2 Tests à valider |
| `#screen-11-3` | 11.3 Passage en cours |
| `#screen-11-4` | 11.4 Rapport de passage |
| `#screen-11-5` | 11.5 Comparaison des versions |
| `#screen-11-6` | 11.6 À relire, par passage (`?etat=fermes`, `tranche`, `termine` ou `vide`) |
| `#screen-11-7` | 11.7 Dérive documentaire |
| `#screen-11-8` | 11.8 Passages et historique |

Le bouton de déconnexion de chaque écran ouvre `#login`. « Se connecter » et le SSO ouvrent la Couverture.

## Pour la page d'accueil (Nathan)

Les éléments communs avec la page d'accueil (`accueil/`) :

- variables de couleur et polices : début de `interface/screen-11-1/styles.css` (`--engobe`, `--soleil-clair`, `--encre`, `--miltos`, `--ocre`, `--olivier`, Tilt Warp, Funnel Sans, Spline Sans Mono) ;
- logo « H◉rama » : fonction `Logo()` de chaque écran, l'œil reprend le dessin de `docs/da/mascotte.js` ;
- mascotte : fonction `Mascot()` de chaque écran, fixe à 24 px du bas et de la droite. Son `viewBox` est resserré sur le dessin (`0 4 96 66`) pour que le dessin touche vraiment le coin de l'écran ;
- l'œil du logo qui suit le curseur (issue #214) n'est pas codé ici.

## Vérifié le 19/11

- `tsc` et `vite build` passent.
- Dans Chrome en 1440 × 900 : chaque écran fait 1440 × 900 sans défilement horizontal ; la mascotte est à 26 px du bas et de la droite sur les 8 écrans et ne cache aucun bouton.
- Connexion : 24 vérifications passent (déconnexion depuis les 8 écrans, champs vides, e-mail invalide, afficher le mot de passe, mode sombre, connexion, SSO), sans erreur dans la page.

Pas vérifié : l'aperçu lancé dans Figma Make lui-même.
