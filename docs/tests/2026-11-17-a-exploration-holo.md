# A-57 — Regard de Holo sur chaque capture

## Périmètre

Ajout local à `agent/src/exploration/holo.ts`, sans modification des contrats ni branchement au coureur. Les constats restent des doutes `SUSPECTED`, jamais des défauts prouvés. Une réponse vide n'est pas un échec technique et ne constitue pas une preuve de conformité.

La réponse structurée utilise exclusivement les propriétés chaîne `d0` à `d4`, avec le format `kind | x,y,width,height | sentence` ou une chaîne vide. Les coordonnées du modèle sont normalisées sur [0,1000], puis converties en pixels de la capture dans le résultat. Aucun tableau dans le schéma JSON, y compris pour `required` : les cinq clés sont donc vérifiées côté code, ainsi que les catégories et les phrases non vides. Les tableaux des messages et du résultat ne font pas partie du schéma. Une zone invalide conserve le constat en `INCONCLUSIVE`, avec `zone: null` et un message ; les autres constats restent exploitables.

Documentation consultée avec `curl -Ls` :
- https://hub.hcompany.ai/models-api/chat-completions.md
- https://hub.hcompany.ai/models-api/build-an-agent/core-concepts.md

Ces pages documentent `response_format.json_schema` et la désactivation du raisonnement pour les appels uniques : `chat_template_kwargs.enable_thinking: false`. Température : 0. Modèle initial : `holo4-27b`. Seul un délai dépassé déclenche un nouvel essai sur `holo4-35b-a3b`, avec son propre délai de 8 000 ms. La durée retournée englobe les deux essais éventuels et la lecture de la réponse. Une erreur HTTP, réseau ou de format produit `INCONCLUSIVE`, sans constat.

## Vérifications hors réseau

Commandes depuis la racine :

```sh
pnpm install
pnpm -r --if-present run check
git fetch origin dev && git merge origin/dev
pnpm -r --if-present run check
```

Installation réussie. Fusion : `Already up to date.` Vérification des sept paquets terminée sans erreur ; agent : 99 tests, 99 réussis, 0 échec. Les tests `exploration-holo.test.ts` sont inclus par le glob existant et couvrent la requête, une réponse normale, les clés vides, le JSON invalide, les clés manquantes, une catégorie ou zone invalide, le repli après abandon du premier modèle, deux délais dépassés (même si fetch ignore l'abandon), HTTP 403 avec masquage de la clé et une erreur réseau.

## Essais réels

`https://www.eugeniaschool.com/robots.txt` consulté avant les pages : `Allow: /`, `Disallow: /studio`. Aucune page interdite, aucun formulaire soumis. Trois captures séquentielles avec Chrome headless :

```sh
google-chrome --headless=new --no-sandbox --disable-gpu \
  --force-device-scale-factor=1 --window-size=1280,900 --timeout=15000 \
  --screenshot=<fichier.png> <url>
```

Les PNG font chacun 1280 × 900 pixels. Appels séquentiels via un script hors dépôt (`/home/ubuntu/holo-trial.ts`), lancé avec `node`, important `askHolo`, lisant les PNG et affichant les résultats JSON. Clé de développement Horama injectée uniquement dans l'environnement `HAI_API_KEY` ; aucune clé de démo utilisée.

| Page | Durée totale (ms) | Modèle ayant répondu | Statut | Constats |
|---|---:|---|---|---|
| https://www.eugeniaschool.com/ | 1634 | holo4-27b | SUSPECTED | 0 |
| https://www.eugeniaschool.com/notre-adn | 293 | holo4-27b | SUSPECTED | 0 |
| https://www.eugeniaschool.com/approche-pedagogique | 277 | holo4-27b | SUSPECTED | 0 |

### Relecture visuelle des captures

Les trois captures ont été ouvertes et regardées après génération. Aucun constat retourné : aucune ligne à classer vrai/faux, et aucune précision calculable sur cet échantillon vide.

| Capture | Observation de relecture |
|---|---|
| [Accueil](captures/2026-11-17-a-exploration-holo/accueil.png) | Titre et boutons lisibles, photo sans distorsion visible ; logos partiellement hors cadre en bas du viewport, ce qui ne démontre pas un défaut de la page. |
| [Notre ADN](captures/2026-11-17-a-exploration-holo/notre-adn.png) | Texte blanc lisible sur la photographie assombrie, sans chevauchement ou coupure visible du titre. |
| [Approche pédagogique](captures/2026-11-17-a-exploration-holo/approche-pedagogique.png) | Bloc principal aligné, titre et boutons lisibles ; section suivante partiellement visible au bord inférieur du viewport, sans preuve de défaut. |

### Témoin avec défauts injectés

Pour vérifier que le modèle regarde bien l'image (réponses vides et rapides sur Eugenia), une page locale avec quatre défauts volontaires ([HTML](captures/2026-11-17-a-exploration-holo/temoin-defauts.html), [capture](captures/2026-11-17-a-exploration-holo/temoin-defauts.png)) : titre et sous-titre qui se chevauchent, texte de bouton coupé (`overflow:hidden`), texte gris clair sur blanc, image cassée remplie d'un dégradé. Même commande Chrome, un appel `askHolo` (script hors dépôt `/home/ubuntu/holo-control.ts`), clé de développement Horama.

Résultat : `holo4-27b`, 530 ms, `SUSPECTED`, 3 constats. Un appel de description libre sur la même image consomme 1 120 jetons d'image (`usage.prompt_tokens_details.multimodal_tokens.image`) : l'image est bien lue.

| Constat de Holo | Zone rendue | Relecture | Verdict |
|---|---|---|---|
| overlapping-text : « The title and subtitle overlap each other. » | top | Les deux titres se chevauchent en haut de la page | vrai |
| unreadable-contrast : « The text is almost invisible due to low contrast. » | middle | Le paragraphe gris clair sur blanc est presque invisible | vrai |
| distorted-image : « The image is stretched and distorted. » | middle | Le bloc est une image cassée remplie d'un dégradé, pas une image étirée : il y a bien un problème à cet endroit, mais pas celui décrit | faux |

Manqué : le texte coupé du bouton « Télécharger la brochure complète ». Sur ce témoin : 2 constats vrais sur 3, 3 défauts sur 4 désignés (dont un mal nommé). Lors de ce premier passage, les zones textuelles (« top », « middle ») ne permettaient pas de dessiner un cadre ; la correction ci-dessous les remplace par des boîtes en pixels. Un seul passage : ce n'est pas un taux.

## Correction de revue — zones en pixels et nouvelle mesure

Documentation relue avec `curl -Ls` : [conventions](https://hub.hcompany.ai/models-api/build-an-agent/core-concepts.md) et [localisation](https://hub.hcompany.ai/models-api/element-localization.md). Holo utilise des coordonnées entières normalisées sur [0,1000], origine en haut à gauche, indépendamment de la taille envoyée. Le prompt demande donc une boîte `x,y,width,height` dans cette convention, sans redimensionner l'image. Le code lit la largeur et la hauteur dans IHDR (signature PNG, premier bloc IHDR et dimensions non nulles vérifiés), puis convertit les bords avec `Math.round(coordinate * dimension / 1000)` ; largeur et hauteur sont les différences des bords convertis. Le résultat exporté est en pixels entiers de la capture d'origine.

Validation : quatre entiers, position non négative, dimensions positives, boîte entièrement incluse dans [0,1000] puis dans l'image après arrondi. Aucune correction ou zone inventée : une boîte mal formée, hors limites ou arrondie à une taille nulle donne uniquement pour ce constat `INCONCLUSIVE`, `zone: null` et un message. JSON invalide, catégorie invalide et erreurs de transport restent des erreurs de résultat entier.

### Protocole et résultats

Aucune nouvelle requête vers eugeniaschool.com. Réutilisation des quatre PNG existants, chacun 1280 × 900, sans modification des originaux. Script hors dépôt `/home/ubuntu/holo-box-trial.ts`, exécuté avec `node`, clé de développement Horama injectée dans `HAI_API_KEY`. Quatre appels séquentiels à `askHolo`. Le même script rend ensuite une page HTML locale contenant uniquement le PNG en data URI et les rectangles rouges numérotés, via Chrome headless à 1280 × 900 et facteur d'échelle 1. Pillow n'étant pas installé, aucun paquet n'a été ajouté.

| Capture | Durée (ms) | Modèle | Statut global | Constats |
|---|---:|---|---|---:|
| accueil | 361 | holo4-27b | SUSPECTED | 0 |
| notre-adn | 322 | holo4-27b | SUSPECTED | 0 |
| approche-pedagogique | 322 | holo4-27b | SUSPECTED | 0 |
| temoin-defauts | 471 | holo4-27b | SUSPECTED | 3 |

### Relecture des images avec cadres

Les quatre copies ont été ouvertes et regardées : [accueil](captures/2026-11-17-a-exploration-holo/accueil-cadres.png), [notre-adn](captures/2026-11-17-a-exploration-holo/notre-adn-cadres.png), [approche-pedagogique](captures/2026-11-17-a-exploration-holo/approche-pedagogique-cadres.png), [témoin](captures/2026-11-17-a-exploration-holo/temoin-defauts-cadres.png). Les trois images Eugenia n'ont aucun cadre puisqu'aucun constat n'a été retourné. Pour le témoin, tous les constats retournés sont `SUSPECTED`, avec une boîte valide :

| N° | Catégorie et phrase exacte | Boîte pixels x,y,largeur,hauteur | Affirmation vraie/fausse | Cadre sur le bon élément ? |
|---|---|---|---|---|
| 1 | overlapping-text — “The title text overlaps with the subtitle text.” | 40,44,740,68 | Vraie : les deux lignes de titre se chevauchent visiblement. | Oui : le cadre englobe les deux titres superposés. |
| 2 | unreadable-contrast — “The light gray text on a white background is nearly invisible.” | 40,202,567,23 | Vraie : le paragraphe gris très clair se distingue à peine du fond blanc. | Oui : le cadre suit le paragraphe concerné. |
| 3 | distorted-image — “The image is stretched and distorted.” | 40,241,600,79 | Fausse : une image cassée sur fond dégradé est visible, pas une photographie étirée démontrable. | Oui : le cadre entoure le bloc image cassée/dégradé, malgré la mauvaise qualification. |

Défauts manqués du témoin : le libellé du bouton est coupé et n'est pas signalé ; l'image cassée est localisée mais son défaut réel n'est pas identifié correctement. Aucun constat à zone invalide dans cet essai réel. Le témoin reste un cas unique, pas une estimation de performance générale.

### Vérification de la correction

`pnpm -r --if-present run check` terminé sans erreur avant et après `git fetch origin dev && git merge origin/dev` (fusion automatique réussie). Dernière sortie agent :

```text
agent check: 1..111
agent check: # tests 111
agent check: # suites 0
agent check: # pass 111
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 566.834738
agent check: Done
```

Les tests factices supplémentaires couvrent une boîte valide convertie à partir d'un PNG 1280 × 900, les limites inclusives, les boîtes hors image, les coordonnées mal formées, les tailles nulles, la coexistence de constats valides et invalides, l'arrondi des bords et les en-têtes PNG invalides. Les formats échangés dans `contrats/` ne changent pas.

## Limites

Un seul témoin à défauts injectés (ci-dessus) : rappel et précision sur de vraies pages restent à mesurer. Pas de test réel du second modèle, de saturation, du coût, de concurrence ni d'intégration au parcours d'exploration. Les délais et erreurs sont couverts uniquement par fetch factice. Aucun défilement, autre taille de fenêtre ou interaction avec les pages. Ces trois réponses vides ne prouvent pas l'absence de défauts visuels.
