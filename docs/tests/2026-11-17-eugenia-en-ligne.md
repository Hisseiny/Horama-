# Premier parcours réel sur le site d'Eugenia School en ligne (17 novembre 2026)

Couloir Nathan, `dev-nathan` (88bc191). Site : https://www.eugeniaschool.com, en simple visiteur (aucun formulaire, un seul parcours). Agent H, base partagée, copie du vault, `settle_s` 1,2 s, zone de page 1280 × 900 imposée.

## Commande

```
node --env-file=.env.local automatisation/scene/parcours.mjs --base-url https://www.eugeniaschool.com --logiciel eugenia --version 1 --reference 1 --vault <copie> --temoins <dossier> --fermer-chrome
```

Tests (vault `vault-horama/eugenia/tests/`, essais de l'orchestrateur à revoir avec Axil et Noé) : `accueil-vers-bachelor` (« DÉCOUVRIR LE BACHELOR »), `bachelor-vers-msc` (lien « MSc IA Applied to Business » du pied de page, règle `egalite` sur les hackathons par an).

## Résultat : passage `2026-11-17-18h13-f9d4`

| Mesure | Valeur |
|---|---|
| Sortie | 0 |
| Relevés | 3 sur 3 (accueil, bachelor, msc), 1280 × 900 |
| Clics | 2, chacun sur l'élément attendu (« DÉCOUVRIR LE BACHELOR » ; « MSc IA Applied to Business » après défilement) ; clic retenu 714 à 768 ms |
| Durée du coureur | 63,4 s, 10 étapes, aucune relance |
| Coût rendu par H | 0,0229 $ |
| Relevé le plus long | 176 ms |
| Règle « hackathons par an », Bachelor contre MSc | `PASS`, « 3 à 5 = 3 à 5 » (le site écrit « 3-5 » et « 3 À 5 ») |
| Écarts d'image | aucun ; les 3 relevés à 0 pixel des références v1 (prises le même jour sur ce Mac) |
| Base partagée | passage `verifie`, 10 événements, 3 captures, 2 lignes `resultats` (`bachelor-vers-msc` PASS ; `accueil-vers-bachelor` INCONCLUSIVE : aucune règle, le coureur ne déclare pas un test réussi sans preuve calculée), 0 décision |
| Bannière de cookies | aucune affichée |

## Ce qui a été construit pour ce site

- `jugement/verification` : un champ `<libellé> (chiffre au-dessus)` lit le nombre écrit juste avant son libellé (ce site écrit « 3-5 » puis « HACKATHONS PAR AN », l'inverse de Facturo) ; un libellé sans nombre juste avant, ou affiché plusieurs fois, rend la règle non concluante. Les plages (« 3-5 », « 3 à 5 », « de 3 à 5 », tous tirets et espaces) sont comparées sous une même forme ; une vraie différence (« 3 à 5 » contre « 2 à 4 ») est un défaut prouvé (tests `jugement/tests/site-public.test.ts`).
- Zones ignorées : la photo du haut de l'accueil change d'une visite à l'autre (258 941 pixels entre une capture à 2 s et une à 4 s du chargement) ; sa zone est déclarée dans la note (`zones_ignorees`) et n'est plus comparée (9 zones d'écart sans la déclaration, 0 avec, sur une vraie capture).

## Limites

- La lecture `(chiffre au-dessus)` prend le nombre de la ligne d'avant sans savoir s'il appartient à un autre bloc (écrit dans `vault-horama/eugenia/produit/regles-entre-pages.md`).
- Le coureur (C4 en base) ne reçoit pas encore les `zones_ignorees` : sur l'accueil, la photo pourrait y donner un doute. À passer à Ali.
- Un seul parcours : la tenue n'est pas mesurée. Les notes du vault sont encore vides (à écrire par Axil et Noé).

Témoins : `docs/captures/2026-11-17-eugenia-en-ligne/`.
