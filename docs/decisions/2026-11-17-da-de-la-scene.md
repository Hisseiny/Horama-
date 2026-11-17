# La scène prend la direction artistique de Horama

> **Rédigé par :** CDO · 17 novembre 2026 · branche `da-scene-oeil-violet`, première version à montrer à l'équipe

## Décision

La couche de la scène (`automatisation/scene/couche-horama.js`) prend la direction artistique validée par la CDO : l'œil ailé du logo comme mascotte, le violet de l'œil, des tampons à la place des pastilles. Le moteur ne change pas : mêmes commandes, mêmes moments, même écriture dans le vault. **Le moteur existe, on lui donne son visage.**

## Ce qui change à l'écran

| Avant | Après |
|---|---|
| Mascotte provisoire (rond violet à deux yeux) | Œil ailé du logo, 5 états animés (bat des ailes, cligne, secousse en défaut, tour sur lui-même quand c'est bon) |
| Bandeau noir arrondi, pastilles de couleur | Bandeau violet `#2A2163` avec le logo, compteurs en tampons « OK », « DÉFAUTS », « À TRANCHER » |
| Traits jaunes et corail dessinés à la main | Défaut prouvé entouré en corail, doute en cadre lavande pointillé, tampon sur chaque zone |
| Question sur carte noire, boutons arrondis | Carte violette, boutons plats ; le verdict tombe en tampon (« BUG NOTÉ », « VOULU ») |
| — | **Nouveau bouton « Voir à la loupe »** : la zone grossie 2,4 fois, à côté de la question |
| Fin crème avec les chemins des fichiers | Fin violette, tampon « TOUT EST TRANCHÉ », nom des décisions écrites |

## Trois bugs presque invisibles à l'œil (Facturo)

Pour montrer ce qu'un humain ne voit pas, trois changements s'ajoutent au catalogue de `faux-saas/regressions.ts` (non actifs par défaut, à activer avec `r=`) :

| Identifiant | Ce qui change | Qui le trouve |
|---|---|---|
| `centime-detail` | « Total TTC » de F-119 : 480,01 € au lieu de 480,00 € | deux règles du vault (somme des lignes, égalité avec la liste) |
| `arrondi-total-liste` | « Total » de la liste : 1 419,99 € au lieu de 1 420,00 € | la règle de somme de la liste |
| `echeance-decalee` | Échéance de F-119 : 13/11/2026 au lieu de 12/11/2026 (format toujours bon) | la comparaison d'image avec la v12 |

## Ce qui a été lancé

- `faux-saas` : `node --test "tests/*.test.ts"` : 7 tests sur 7 passent (le compte du catalogue passe à 13 bugs et 5 changements voulus) ; `verite.json` régénéré.
- La scène, sans l'agent H, sur Facturo en local (Windows, Chrome 157), références v12 refaites sur le même poste dans une copie du vault :
  `node automatisation/scene/parcours.mjs --sans-agent --rythme 1.5 --r defaut,centime-detail,arrondi-total-liste,echeance-decalee --choix bug,bug,bug,bug,voulu --vault <copie> ...`
  Résultat : 4 relevés sur 4, 4 problèmes et 1 doute, 5 questions, 5 décisions écrites. Les deux écarts d'un centime sont prouvés par le calcul.
- La loupe : essayée à la vraie souris sur la liste des factures.

## Ce qui n'est pas testé

- Le passage avec le vrai agent H (pas de clé utilisée pour ce changement).
- Le rendu sur Mac : la police du logo est Segoe UI, avec repli sur Avenir Next puis Arial.

## Points à voir avec l'équipe

- **CAO** : `automatisation/` et `faux-saas/` sont à lui ; cette branche les modifie à la demande de la CDO, qui porte toute la direction artistique. À relire et à approuver avant fusion.
- **CAO, CAIO** : `faux-saas/positions.json` n'a pas les trois nouveaux changements (il faut lancer `scripts/verifier-regressions.mjs` sur l'application construite).
- **Tous** : sous Windows, Git convertit les fins de ligne du vault en CRLF et `@horama/memoire` refuse alors de lire les notes (« champ ecran manquant »). Il faudrait un `.gitattributes` avec `*.md text eol=lf` (racine : CTO).
- Les références v12 du vault ont été prises sur Mac : sur un autre poste, la comparaison d'image voit tout le texte changé (62 doutes). Pour la démo, prendre les références sur la machine de la démo.
