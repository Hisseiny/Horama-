# #162 — Faux défauts prouvés en exploration publique, mesures du 19 novembre 2026

Branche `a-162-faux-prouves`, depuis `dev` (`268fd28`). Règle suivie (commentaires
de Nathan sur #162) : le but n'est pas de réduire les doutes ; tout cas incertain
devient `SUSPECTED`, avec une `raison`, au lieu de `VERIFIED_FAIL`. Un défaut
reste `VERIFIED_FAIL` seulement s'il est prouvé pour un visiteur.

Tous les passages sont faits en simple visiteur : aucune connexion, aucun
formulaire rempli ni soumis. Clé H : `HORAMA_HAI_API_KEY` passée en
`HAI_API_KEY`, une seule session H à la fois (quota de l'organisation vérifié
avant chaque passage). `HAI_API_KEY_DEMO` n'a pas été utilisée.

## Ce qui change dans `agent/`

| Cas du banc #153 | Avant | Après |
|---|---|---|
| Lien dont le clic est pris par un script (EFREI, `popin-evenement-*`) | `lien_casse` `VERIFIED_FAIL` dès que l'URL répond 404 | le lien est cliqué dans un onglet caché (contexte Chrome séparé, la navigation est coupée avant d'atteindre le serveur) : s'il ne part vers aucune adresse, `SUSPECTED` « Un script prend en charge le clic » ; si le clic part bien vers l'URL en erreur, `VERIFIED_FAIL` ; si l'onglet caché ne retrouve pas le lien ou échoue, `SUSPECTED` |
| Débordement dans un carrousel (Apple, Louvre) | `VERIFIED_FAIL` | `SUSPECTED` avec raison : rôle ARIA carrousel/diapositive, `scroll-snap`, classe générique (`carousel`, `slider`, `swiper`…) ou bandeau défilant horizontal |
| Texte limité en lignes (`-webkit-line-clamp`, aussi sur un ancêtre), `text-overflow: ellipsis` | `VERIFIED_FAIL` pour certains enfants | ignoré |
| Texte masqué volontairement (`sr-only`, `clip`, `clip-path`, boîte de 1 px) | `VERIFIED_FAIL` (Louvre, 1×22 px) | ignoré |
| Titre remplacé par une image, texte entièrement sorti de sa boîte de découpe (Debian) | `texte_rogne` `VERIFIED_FAIL` | ignoré (le texte est masqué, pas rogné) |
| Texte décoratif `aria-hidden="true"` qui déborde (EFREI) | `VERIFIED_FAIL` | `SUSPECTED` avec raison |
| `undefined`, `NULL`, `NaN` dans un texte rédigé (Python, Debian) | `VERIFIED_FAIL` | `SUSPECTED` avec raison, sauf en position de valeur : texte seul, ou après `:` ou `=` (« Erreur : undefined », « Prix : NaN € » restent `VERIFIED_FAIL`) |
| Zone Holo ou de comparaison de moins de 4 px de côté | constat | ignorée (bruit de rendu) |
| Doute Holo au même endroit (± 8 px) sur une autre page | un doute par page | doute rattaché au premier par `explique_par` |

Le statut et la raison du contrôle sont repris tels quels dans le rapport
d'exploration. Les doutes des contrôles apparaissent dans `ecarts_visuels`,
comme les doutes Holo, et ne comptent jamais comme défauts. Aucun contrat
modifié, aucune dépendance ajoutée, aucun domaine ni sélecteur propre à un site.

## Vérifications sans réseau

`pnpm -r --if-present run check` : sortie 0. Agent : 263 tests, 263 réussis,
0 échec ; jugement 79/79, mémoire 34/34, interface 8/8, faux-saas 10/10.

Pages Chrome locales ajoutées à `agent/exploration-controles.test.ts` :
lien `preventDefault()` en ligne, lien pris par un écouteur délégué,
vrai lien 404, lien `target="_blank"` 404 (l'onglet du visiteur ne bouge pas) ;
prose technique, titre « The Null Object », vrais messages d'erreur ; carrousel,
bandeau défilant, texte décoratif, ancêtre à lignes limitées, `sr-only`,
`clip-path`, boîte de 1 px, titre remplacé par une image. Le cas de l'ancêtre
à lignes limitées a été vérifié en échec sur le code précédent.
`exploration-explorer.test.ts` : statut et raison repris du contrôle, doute Holo
répété rattaché, comparaison de 1 px ignorée. `exploration-holo.test.ts` : zones
23×1 et 3×40 écartées.

```sh
grep -riE "efrei|louvre|apple\.com|debian|python\.org|bnf\.fr|nasa|kpmg|eugenia|albertschool|skema|grantthornton|quilombo|ceratopsian|popin|MeaPlaylist|chapternav" agent/src
```

Sortie vide, code 1 : aucune correspondance.

## Banc 1 : contrôles seuls, ancien et nouveau code, mêmes pages

Pour comparer à pages égales sans dépenser de session H, un script hors Git
(`~/probe/banc.ts`) découvre 8 pages par site avec `discoverPages`, ouvre chacune
dans un Chrome sans écran (`--force-device-scale-factor=1`, port 9555) et lance
`controlerPage`. « Avant » : copie de `agent/src/exploration` de `dev` (`268fd28`).
« Après » : la branche. Pas de H, pas de Holo dans ce banc.

```sh
node banc.ts avant 9555 <url>     # code de dev
node banc.ts final3 9555 <url>    # code de la branche
```

Les constats ont été relus à la main (capture, chaîne de styles des ancêtres,
`curl` de la page ou de la feuille de style).

| Site | Avant : `VERIFIED_FAIL` | dont faux | Après : `VERIFIED_FAIL` | dont faux | Après : `SUSPECTED` |
|---|---|---|---|---|---|
| Louvre | 6 `debordement` | 6 | 0 | 0 | 0 |
| Apple | 1 `debordement` (barre de produits défilante) | 1 | 0 | 0 | 1 |
| EFREI | 17 `lien_casse` | 16 | 1 (`/formation/mastere-green-it/` : 404) | 0 | 17 (16 liens pris par un script, 1 texte décoratif) |
| Docs Python | 2 `texte_erreur` (`undefined` en prose) | 2 | 0 | 0 | 2 |
| Debian | 2 `texte_rogne` (titre remplacé par une image) + 1 `texte_erreur` (`NULL` en prose) | 3 | 0 | 0 | 1 |
| BnF | 1 `lien_casse` (HTTP 502) | non qualifié | 0 | 0 | 0 |
| **Total** | **30** | **28 (93 %)** | **1** | **0** | **21** |
| NASA (témoin) | 26 `erreur_console` | 0 | 26 `erreur_console` | 0 | 0 |

Le 502 BnF (`/fr/pour-les-professionnels`) n'est pas revenu au second passage :
erreur passagère du serveur, ni prouvée vraie ni prouvée fausse. Le seul vrai
lien cassé d'EFREI reste `VERIFIED_FAIL` : son clic part bien vers l'adresse
en erreur. NASA, ajouté comme témoin, garde ses 26 vraies erreurs de console.

Les vraies images cassées BnF de #153 (icônes sociales du pied de page) ne se
reproduisent plus : le 19/11, les trois SVG se chargent (`naturalWidth` 150),
avec l'ancien comme avec le nouveau code. La détection `image_cassee` n'a pas
changé ; elle reste couverte par les tests locaux existants.

## Banc 2 : explorations H réelles après correctif

Même commande que #153, 15 pages au lieu de 8, Holo actif :

```sh
HOLO_BIN="$HOME/.venvs/holo/bin/holo" pnpm --filter @horama/agent explorer -- --url <site> --sans-base --max 15 --chrome-port 9333 --sortie ~/b162/<site>/apres --vault ~/b162/<site>/vault
```

Docs Python est parti de `https://docs.python.org/fr/3/whatsnew/3.15.html`, la
page des faux de #153. « Avant » : tableau du rapport #153 (8 pages, local).
Les passages ont été lancés au fil des correctifs ; la colonne « code » donne le
dernier commit présent.

| Site | Avant (#153) : défauts, dont faux | Code | Pages | Durée | Coût H (USD) | Après : `VERIFIED_FAIL` | dont faux | `SUSPECTED` |
|---|---|---|---|---|---|---|---|---|
| EFREI | 18, 17 faux | `777c0de` | 15/15 | 578 s | 0.1313 | 2 | 1 (texte décoratif) | 28 |
| Louvre | 6, 6 faux | `db38ad7` | 15/15 | 359 s | 0.1734 | 1 | 1 (ancêtre à lignes limitées) | 7 |
| Docs Python | 2, 2 faux | `72c3050` | 15/15 | 288 s | 0.1328 | 1 | 1 (titre « The Null Object ») | 7 |
| BnF | 9, 0 faux | `1278adb` | 15/15 | 744 s | 0.2110 | 0 | 0 | 0 |
| Debian | 1, 1 faux | `1278adb` | 15/15 | 278 s | 0.1159 | 0 | 0 | 1 |
| Apple | 1, 1 faux | `1278adb` | 15/15 | 550 s | 0.1653 | 0 | 0 | 4 |
| **Total** | **37, 27 faux (73 %)** | | 90/90 | 2797 s | 0.9297 | **4** | **3** | **47** |

Les 3 faux restants ont chacun donné un correctif générique (`e77be63`,
`72c3050`, `1278adb`). Revérifiés avec le code final par `controlerPage` sur
la page concernée (`~/probe/control.ts`) :

| Page | Constat en H | Code final |
|---|---|---|
| `https://www.efrei.fr/` | `debordement` `VERIFIED_FAIL` (766×227 > 766×178, `aria-hidden`) | `SUSPECTED`, raison « texte décoratif » |
| `https://www.louvre.fr/louvreplus` | `debordement` `VERIFIED_FAIL` (635×100 > 635×75, résumé coupé par « … ») | aucun constat |
| `https://docs.python.org/fr/3/contents.html` | `texte_erreur` `VERIFIED_FAIL` (`Null`) | `SUSPECTED`, raison « texte rédigé » |

Avec le code final, le passage H EFREI garderait donc 1 seul `VERIFIED_FAIL`,
le vrai 404. Ce point est déduit de la revérification page par page, pas d'un
nouveau passage H complet.

Holo a tourné sur les 90 pages (état `fait`). Ses doutes restent `SUSPECTED`.
Aucun doute Holo répété d'une page à l'autre n'est apparu dans ces passages.

## Ce qui n'est pas testé

- Aucun passage H complet des 6 sites avec le code final : EFREI, Louvre et
  Python ont tourné avant leur dernier correctif (revérification par page
  ci-dessus).
- Pas de passage en conteneur.
- Un vrai défaut BnF `image_cassee` sur site réel : le site est réparé.
- Le rattachement des doutes Holo répétés n'est testé qu'en local (cas absent
  des passages réels).
- La vérification du clic attend 2 s une navigation : un script qui navigue
  plus tard donne `SUSPECTED`, jamais un faux `VERIFIED_FAIL`.
- Les `SUSPECTED` n'ont pas été tous relus un par un.
