# #204 — Essai axe-core sur des pages ouvertes dans Chrome

Mesures du 19 novembre 2026 sur `essai-accessibilite`, créée depuis `dev` à
`e0f95bc`. Chrome 156.0.8078.47, 1280 × 900, DPR 1, thème clair, axe-core 4.14.1.
Passages en visiteur, sans connexion ni envoi de formulaire.

## Vérifications locales

`pnpm -r check` et `pnpm -r --if-present run check` sortent à 0. Le paquet
`agent` réussit ses 288 tests. Le serveur de test ne sert que des pages locales.

- Le bouton sans nom, l’image sans `alt`, le contraste insuffisant et un
  deuxième bouton sous la ligne de flottaison produisent des `VERIFIED_FAIL`
  avec identifiant de règle, sélecteur, extrait HTML et PNG entouré. Le compteur
  du serveur reste identique pendant l’analyse et les captures, y compris près
  d’une image hors écran chargée en différé. L’onglet garde son défilement.
- La page saine rend zéro constat. Axe classe le contraste d’un texte sur
  dégradé en « incomplete » et Horama ne crée aucun `VERIFIED_FAIL`.
- Une zone défilante sans `tabindex` signalée par axe est comptée dans les
  violations graves sans preuve suffisante. Un CDP indisponible rend le relevé
  d’accessibilité non concluant dans le fichier séparé.
- Un bouton signalé par axe, mais rogné par son conteneur, ne reçoit aucune
  preuve visuelle. Le bouton visible placé sous la ligne de flottaison reste
  prouvé. L’URL `/accessibilite-accueil-1` ne peut pas produire un fichier
  qui écrase la première preuve de l’accueil.

## Passage H sur la prévisualisation locale du clone Eugenia

Clone [Hisseiny/eugenia-school-website à `3725b94`](https://github.com/Hisseiny/eugenia-school-website/commit/3725b94).
`pnpm build`, puis `pnpm preview --host 127.0.0.1 --port 4322`.

```sh
pnpm --filter @horama/agent explorer -- --url http://127.0.0.1:4322/ \
  --sans-base --max 3 --pages-cliquees 0 --accessibilite --chrome-port 9440 \
  --sortie /chemin/essai-eugenia --vault /chemin/vault-essai
```

Le passage a visité les 3 pages en 133,294 s, avec la clé de développement H.
[Replay de la session H](https://agp.eu.hcompany.ai/share/api/v1/trajectories/b7cdd506-dc1e-4341-9801-481f4cd9f629).
La durée ajoutée couvre l’analyse, la capture et l’enregistrement des PNG
pour la page. L’unité de comptage est une règle sur un élément d’une page.

| Page | Graves prouvées | Graves sans preuve suffisante | Mineures ou modérées | Durée ajoutée |
|---|---:|---:|---:|---:|
| `/` | 0 | 1 | 0 | 411 ms |
| `/programmes` | 0 | 0 | 0 | 157 ms |
| `/entreprises` | 0 | 0 | 0 | 176 ms |

## Mesure du contrôle sur les sites de #162

Debian et la documentation Python figurent dans le [banc public de #162](2026-11-19-faux-prouves.md).
Le script de mesure ouvre chaque URL une fois dans un onglet Chrome. Une fois
la page stabilisée, il appelle la même fonction `auditAccessibility` que
l’exploration et journalise les requêtes navigateur jusqu’au retour du contrôle.
Ce script a aussi rejoué les trois URL d’Eugenia. Aucune requête n’a été
observée pendant le contrôle sur chacune des neuf pages.

| Page | Graves prouvées | Graves sans preuve suffisante | Mineures ou modérées | Durée ajoutée |
|---|---:|---:|---:|---:|
| [Debian — Accueil](https://www.debian.org/) | 11 | 0 | 18 | 1 216 ms |
| [Debian — Versions](https://www.debian.org/releases/) | 2 | 0 | 10 | 303 ms |
| [Debian — Distribution](https://www.debian.org/distrib/) | 2 | 0 | 10 | 254 ms |
| [Python — Nouveautés 3.15](https://docs.python.org/fr/3/whatsnew/3.15.html) | 0 | 3 | 3 | 1 556 ms |
| [Python — Table des matières](https://docs.python.org/fr/3/contents.html) | 0 | 0 | 4 | 2 480 ms |
| [Python — Tutoriel](https://docs.python.org/fr/3/tutorial/index.html) | 0 | 0 | 4 | 183 ms |

Deux passages H de confirmation, avec la même commande qu’Eugenia et
`--max 1`, ont aussi terminé sur les pages de départ des deux sites.

| Page visitée par H | Graves prouvées | Graves sans preuve suffisante | Mineures ou modérées | Durée ajoutée |
|---|---:|---:|---:|---:|
| [Debian — Accueil, replay H](https://agp.eu.hcompany.ai/share/api/v1/trajectories/564e9498-02c7-435f-a3c6-b0f516d17cbf) | 10 | 1 | 18 | 1 076 ms |
| [Python — Nouveautés 3.15, replay H](https://agp.eu.hcompany.ai/share/api/v1/trajectories/b0b81b58-5d6b-48de-8bff-f3e5d6a88a15) | 0 | 3 | 3 | 1 520 ms |

Le lien `people` de Debian, prouvé par une capture dans la mesure à l’URL
fixe, n’avait pas de capture exploitable au passage H.

## Dix signalements d’axe relus à la main

Relecture ciblée des captures entourées, du DOM et du comportement dans
Chrome. Pour les zones de défilement, passage avec Tab depuis l’élément précédent,
puis pression sur Flèche droite. Les violations d’axe ont été relevées avant le
garde-fou clavier, puis les mesures ont été rejouées avec le garde-fou actif.

| Page | Règle | Élément et observation | Verdict pour Chrome |
|---|---|---|---|
| Eugenia `/` | `scrollable-region-focusable` | `.gallery__strip` reçoit le focus avec Tab et défile de 40 px | Faux |
| Debian `/` | `aria-hidden-focus` | Icône `people` ignorée dans l’arbre AX à cause d’`aria-hidden`, atteinte par Tab | Vrai |
| Debian `/` | `aria-hidden-focus` | Icône `philosophy` ignorée dans l’arbre AX à cause d’`aria-hidden`, atteinte par Tab | Vrai |
| Debian `/` | `aria-hidden-focus` | Icône `join/` ignorée dans l’arbre AX à cause d’`aria-hidden`, atteinte par Tab | Vrai |
| Debian `/` | `color-contrast` | `.rss_logo`, texte blanc sur `#ff6600`, contraste recalculé 2,94:1 pour du petit texte | Vrai |
| Debian `/` | `label` | `input[name="P"]`, zéro label associé et nom accessible vide dans l’arbre AX | Vrai |
| Debian `/` | `select-name` | Sélecteur de langue, zéro label associé et nom accessible vide dans l’arbre AX | Vrai |
| Python Nouveautés 3.15 | `scrollable-region-focusable` | Bloc de traceback de `.highlight-pytb` atteint avec Tab, défile de 40 px | Faux |
| Python Nouveautés 3.15 | `scrollable-region-focusable` | Bloc de `[1, 2, 3].push(4)` atteint avec Tab, défile de 21 px | Faux |
| Python Nouveautés 3.15 | `scrollable-region-focusable` | Bloc de `(1, 2, 3).append(4)` atteint avec Tab, défile de 40 px | Faux |

Les six constats confirmés figurent parmi les `VERIFIED_FAIL` après le
correctif. Les quatre zones atteintes au clavier sont comptées sans preuve
suffisante. Chrome peut [donner le focus clavier aux zones défilantes sans attribut `tabindex`](https://developer.chrome.com/blog/new-in-chrome-132#scrollable_regions_are_keyboard_focusable).
Sur cet échantillon, l’arbre AX ne signalait pas leur focus implicite avant
le passage avec Tab.
