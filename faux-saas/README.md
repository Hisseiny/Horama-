# Facturo, le faux SaaS de démonstration

Application de facturation factice (Next.js, rendu serveur à chaque requête) qui sert de cible à l'agent H et à la comparaison de captures. Versions 12 et 13, dix-huit changements activables un par un, image identique d'une visite à l'autre.

## Lancer

```
pnpm install
pnpm --filter @horama/faux-saas run build
pnpm --filter @horama/faux-saas run start
```

L'application répond sur http://localhost:3100 (`dev` utilise le même port).

Variables d'environnement, toutes facultatives :

| Variable | Rôle |
|---|---|
| `FACTURO_TODAY` | date du jour au format `AAAA-MM-JJ`, `2026-11-18` par défaut |
| `FACTURO_LOGIN`, `FACTURO_PASSWORD` | identifiants du formulaire `/login` ; vides : « Connexion indisponible » |

## URL

| URL | Écran |
|---|---|
| `/vXX/tableau-de-bord` | `tableau-de-bord` |
| `/vXX/factures` | `liste-des-factures`, vue `defaut` |
| `/v13/factures?filtre=echeance-depassee` | `liste-des-factures`, vue `filtre-echeance` (v13 seulement) |
| `/vXX/factures?filtre=a-venir` | liste filtrée « À venir » |
| `/vXX/factures/F-119` | `detail-facture` |
| `/vXX/entrer?suite=<chemin>[&r=<ids>]` | entrée déjà authentifiée, puis redirection vers `suite` |
| `/login`, `/deconnexion` | connexion par formulaire, déconnexion |

`XX` vaut 12 ou 13. `suite` doit commencer par `/vXX/` de la même version (sinon 400) ; un `suite` qui contient un `?` doit être encodé. Exemple : `/v13/entrer?suite=/v13/factures`.

## Paramètre `r`

Lu par `/vXX/entrer` seulement, qui le range dans un cookie propre à la version (`facturo_r_vXX`).

| Valeur | Changements actifs |
|---|---|
| absent | ceux par défaut de la version (v12 : aucun ; v13 : `ca-mois`, `filtre-echeance`, `export-haut`) |
| `r=aucun` | aucun : la v13 est alors identique à la v12 au pixel près |
| `r=id1,id2` | exactement ceux-là |
| `r=defaut,total-liste` | ceux par défaut de la version, plus `total-liste` |
| identifiant inconnu | réponse 400 qui liste les identifiants valides |

Sans cookie (connexion par `/login`), les pages appliquent les changements par défaut de la version.

Le catalogue est dans `regressions.ts` (source unique : 13 bugs, dont 3 presque invisibles à l'œil, et 5 changements voulus). `verite.json` en est la copie JSON. Chaque élément touché porte un attribut `data-zone` ; la zone `cellule-client` désigne les quatre cases de la colonne Client, sa boîte dans `positions.json` est leur union.

## Bouton « Mode sombre »

L'en-tête de chaque écran, en v12 comme en v13, se termine à droite par un bouton « Mode sombre ». Un clic passe toute l'interface en thème sombre (couleurs fixes, aucune transition, indifférent à `prefers-color-scheme`) et le libellé devient « Revenir au mode clair » ; un second clic revient au thème clair. L'état n'est gardé nulle part : ni cookie, ni `localStorage`, ni `sessionStorage`, ni paramètre d'adresse. Chaque chargement de page repart donc en thème clair, pour qu'un parcours qui active le mode sombre ne modifie pas les relevés du parcours suivant.

## Scripts

Les scripts de preuve pilotent le Chrome installé (`channel: "chrome"`, sans tête, 1280 × 900) et demandent une application lancée. Paramètre commun : `--base <url>` (défaut `http://localhost:3100`).

| Commande | Effet |
|---|---|
| `pnpm --filter @horama/faux-saas run check` | types, puis tests sans navigateur |
| `pnpm --filter @horama/faux-saas run verite` | régénère `verite.json` depuis le catalogue |
| `node faux-saas/scripts/captures.mjs --sortie <dossier>` | 7 captures (v12 et v13), chaque page visitée deux fois et comparée pixel par pixel, planche `index.html` ; sortie 1 si deux visites diffèrent ou si une page défile |
| `node faux-saas/scripts/verifier-regressions.mjs` | v13 `r=aucun` identique à la v12, effet de chacun des 15 changements, cas du paramètre `r`, puis écrit `positions.json` ; sortie 1 au premier écart |

`positions.json` contient des mesures : boîtes des zones avant (v13 `r=aucun`) et après (v13 avec ce seul changement), nombre de pixels différents et leur boîte englobante. Les boîtes des zones ne dépendent pas de la police ; les nombres de pixels dépendent du rendu du texte de la machine qui mesure.
