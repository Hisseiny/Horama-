# @horama/interface

L'application Horama (Next.js, App Router) : les 8 étapes de la boucle, pour l'instant sur données factices.

## Lancer

Depuis la racine du repo :

```
pnpm install
USE_MOCKS=1 pnpm --filter @horama/interface run dev
```

Ou la version construite (un build fait avec `USE_MOCKS=1` reste en données factices au `start`) :

```
USE_MOCKS=1 pnpm --filter @horama/interface run build
pnpm --filter @horama/interface run start
```

L'application répond sur http://localhost:3000. Sans `USE_MOCKS=1`, les fonctions de données lèvent « non branché ».

## Les 8 étapes

| Étape | Route |
|---|---|
| 1. Couverture | `/` |
| 2. Tests proposés | `/notes/facturo/13` |
| 3. Test accepté | `/notes/facturo/13?etat=accepte` |
| 4. Passage en direct | `/passages/<id>/direct` (`?instant=30` fige l'écran à 30 s du fil) |
| 5. Comparaison | `/passages/<id>/comparaison/<ecran>` (`?vue=rideau`, `?vue=pixels`) |
| 6. Relecture | `/relecture` |
| 7. Dérive documentaire | `/derive` |
| 8. Rapport | `/passages/<id>` |

## Données

- Tout passe par `lib/donnees.ts`. Les écrans n'importent jamais `lib/factice/`.
- `lib/factice/` répond à partir de `@horama/contrats/exemples` et du vrai vault, lu dans `VAULT_PATH` (défaut `../vault-horama`). Rien n'est écrit dans le vault.
- Les captures du logiciel testé sont attendues dans `public/factice/<ecran>--<vue>--v<XX>.png` (1280 × 900). Tant qu'un fichier manque, l'écran affiche un cadre qui porte son nom. Après un dépôt de fichier, relancer `start`.
- Les décisions prises à l'écran (accepter un test, trancher un cas, corriger la note) ne vivent que dans la page : recharger la page les efface.
- « Lancer un passage » rejoue le fil enregistré au rythme enregistré (3 min 40) ; redémarrer le serveur revient au passage terminé.

## Style

Jetons dans `app/tokens.css` (provisoires), base commune dans `app/globals.css`, un fichier CSS par écran. Une seule signature : la phrase vérifiable surlignée selon l'état de sa règle (`components/Highlight.tsx`).

## Vérifier

```
pnpm --filter @horama/interface run check
node interface/scripts/captures.mjs --sortie <dossier>
```

`check` : types, puis le test de contraste des jetons. `captures` : 10 captures avec le Chrome installé, serveur lancé ; sort en 1 si une page ne répond pas 200 ou si la console du navigateur montre une erreur.
