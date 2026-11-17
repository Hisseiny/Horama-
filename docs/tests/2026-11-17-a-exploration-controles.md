# Contrôles mécaniques par page (#57, point 3) — pôle A

Date : 17 novembre 2026. Brique `agent/src/exploration/controles.ts`, fonction `controlerPage(client)`. Chrome for Testing 156.0.8078.47, headless, 1280 × 900, Linux (VM Devin). Aucun appel H.

## Tests sans réseau

`agent/exploration-controles.test.ts` sert `agent/scripts/exploration-pages-essai/` sur 127.0.0.1 et lance un vrai Chrome headless (`CHROME_BIN`, sinon `google-chrome`).

- `broken.html` : défilement en largeur, image cassée, texte qui déborde d'un bouton (en largeur et d'une ligne en hauteur), lien interne mort (404), « undefined » affiché, `console.error` et exception au chargement : chaque défaut est trouvé.
- `healthy.html` : 0 défaut, avec des pièges de faux positifs (élément caché, `overflow: hidden` voulu, ellipse, « nullement », titre à interligne serré).
- Défilement en largeur masqué par `overflow-x: hidden/clip` sur `html` ou `body` : pas de défaut (4 combinaisons).
- Plafond de 20 liens, requêtes en série, repli `GET` sur `HEAD` refusé (405), page servie en 404.

Commande : `pnpm install && pnpm -r --if-present run check` → agent : 89 tests, 89 réussis, 0 échec. Avec `CHROME_BIN=/nonexistent`, le test navigateur est sauté (`# SKIP Chrome absent`), 0 échec.

Les erreurs console émises au chargement, avant l'appel, sont retrouvées par `Runtime.disable` puis `Runtime.enable` (V8 rejoue les messages gardés) : mesuré sur la fixture.

## Essai réel sur https://www.eugeniaschool.com

`robots.txt` lu : `/` autorisé, `/studio` interdit. Trois pages, en série, simple visiteur, aucun formulaire : `/`, `/approche-pedagogique`, `/alternance`. Après chargement complet, `controlerPage` sur chacune (liens internes vérifiés en `HEAD`, 20 au plus par page).

### Premier passage

| Page | Constats |
|---|---|
| `/` | 0 |
| `/approche-pedagogique` | 1 |
| `/alternance` | 0 |

Constat relu à la main sur la capture de sa zone :

| Sorte | Preuve | Classement |
|---|---|---|
| `debordement` | `p` « STÉPHANE VELASQUEZ », zone x 32, y 1333, 415 × 30 px, mesuré `415×32 > 415×30` | **Faux** : texte entier et lisible ; 2 px de jambages d'un titre à interligne serré, aucun défaut visible |

Taux de faux constats sur ce passage : 1 sur 1 (échantillon d'un seul constat, à ne pas généraliser).

Correction : en hauteur, un débordement n'est signalé qu'au-delà d'une demi-ligne (`line-height`, ou `font-size` × 1,2 si `normal`) ; en largeur, la tolérance reste 1 px. Un bouton dont le texte passe à la ligne reste détecté (fixture).

### Second passage (après correction, mêmes trois pages, une fois)

| Page | Constats |
|---|---|
| `/` | 0 |
| `/approche-pedagogique` | 0 |
| `/alternance` | 0 |

0 constat ne prouve pas que ces pages n'ont aucun défaut : le taux de vrais défauts manqués est à mesurer (pas de vérité de terrain sur ce site).

## Ce qui n'est pas testé

- Pages plus nombreuses du site, et contrôles après navigation par H : étape 2 (assemblage).
- Liens externes (hors domaine) et liens qui ne répondent pas (erreur réseau ou délai de 10 s) : ignorés, jamais comptés comme défauts.
- Taux de faux constats sur un échantillon plus large : à mesurer à l'étape 2 (`docs/tests/2026-11-18-mode-visuel.md`).
