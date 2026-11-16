# Facturo est en ligne : URL, versions, entrée, écrans

Date : 16 novembre 2026. Couloir Nathan, livraison au couloir Ali (tâche N3). Détail complet : `faux-saas/README.md`.

## URL

`FAUX_SAAS_URL=https://facturo-demo.vercel.app` (projet Vercel `facturo-demo`, public, sans protection). À mettre dans le `.env.local` de chacun : ce n'est pas un secret.

Vérifié le 16/11 sur cette URL : 7 captures identiques au pixel près sur deux visites (`node faux-saas/scripts/captures.mjs --base https://facturo-demo.vercel.app`), 78 contrôles sur 78 pour les 15 changements (`node faux-saas/scripts/verifier-regressions.mjs --base …`). Captures : `docs/captures/2026-11-16-n2-faux-saas/`.

## Se connecter sans mot de passe

L'agent n'utilise jamais le formulaire. Il part de l'entrée déjà authentifiée :

```
/v13/entrer?suite=/v13/factures
```

Elle pose le cookie de session de démo et redirige vers `suite` (qui doit commencer par `/v13/`, sinon 400). C'est le `url_depart` des tests C2. Le formulaire `/login` existe (identifiants dans `FACTURO_LOGIN` et `FACTURO_PASSWORD` du `.env.local`, jamais écrits ailleurs), aucun test ne passe par lui.

## Versions et changements

- `/v12/…` : la référence, aucun changement. `/v13/…` : la version testée, avec ses trois changements par défaut (`ca-mois` et `filtre-echeance`, deux bugs ; `export-haut`, voulu).
- Les changements se règlent à l'entrée, par le paramètre `r`, et restent actifs pour toute la session du navigateur :

| `r` | Changements actifs |
|---|---|
| absent | ceux par défaut de la version |
| `r=aucun` | aucun (la v13 est alors identique à la v12 au pixel près) |
| `r=id1,id2` | exactement ceux-là, à la place de ceux par défaut |
| `r=defaut,total-liste` | ceux par défaut, plus `total-liste` |
| identifiant inconnu | réponse 400 qui liste les identifiants valides |

- **Pour le coureur (`LancementPassage.regressions`)** : ajouter `&r=<ids séparés par des virgules>` au `url_depart` du test. Catalogue des 15 identifiants et leur vérité : `faux-saas/verite.json`.

## Écrans, vues et adresses

| `ecran` | `vue` | Adresse (`metadata.url` de l'observation) |
|---|---|---|
| `tableau-de-bord` | `defaut` | `/vXX/tableau-de-bord` |
| `liste-des-factures` | `defaut` | `/vXX/factures` (sans paramètre `filtre`) |
| `liste-des-factures` | `filtre-echeance` | `/v13/factures?filtre=echeance-depassee` (n'existe pas en v12) |
| `detail-facture` | `defaut` | `/vXX/factures/<numéro>`, par exemple `/v13/factures/F-119` |

Pour accepter une capture, comparer le chemin et, pour la liste, le paramètre `filtre`. Le chemin relatif à la version est aussi dans l'en-tête de chaque note d'écran du vault (champ `url`).

## Proposition à valider par Ali : jouer un test sur la version de référence

Les tests C2 portent `version_cible: "13"` et un `url_depart` en `/v13/…`. Pour le passage de référence (`version_testee: "12"`), proposition : le coureur remplace `/v13/` par `/v12/` dans `url_depart` (les deux occurrences), et ne joue pas un test dont une vue n'existe pas en v12 (`liste-factures-filtre-echeance`). Cela ne change aucun champ des contrats. Si Ali préfère des tests distincts par version, le dire dans la PR.

## Ce que l'agent verra

- Fenêtre : tout tient dans 1280 × 900, sans défilement.
- Le menu « Filtrer » est fermé au chargement ; un clic l'ouvre, un clic sur une option recharge la page avec le filtre, menu refermé.
- La date du jour est fixée à 18/11/2026 et affichée dans l'en-tête de chaque écran.
- Aucun survol, aucune animation, aucune police téléchargée : deux visites donnent la même image (mesuré avec Chrome sur Mac ; à mesurer dans le navigateur de H, test T1).

## Vault et tests écrits à la main

`vault-horama/facturo/` : 5 notes de `produit/`, `notes-de-version/v13.md`, et 3 tests C2 dans `tests/` : `liste-factures-filtre-echeance` (le test joué en direct), `ca-du-mois-egal-total` (le défaut entre deux écrans), `detail-facture-total-egal-liste` (attendu conforme). Ils n'ont pas encore été joués par l'agent ni lus par le lecteur de C2 (tâche N5).
