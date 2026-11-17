# A-57 — Regard de Holo sur chaque capture

## Périmètre

Ajout local à `agent/src/exploration/holo.ts`, sans modification des contrats ni branchement au coureur. Les constats restent des doutes `SUSPECTED`, jamais des défauts prouvés. Une réponse vide n'est pas un échec technique et ne constitue pas une preuve de conformité.

La réponse structurée utilise exclusivement les propriétés chaîne `d0` à `d4`, avec le format `kind | zone | sentence` ou une chaîne vide. Aucun tableau dans le schéma JSON, y compris pour `required` : les cinq clés sont donc vérifiées côté code, ainsi que les catégories et les champs non vides. Les tableaux des messages et du résultat ne font pas partie du schéma.

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

## Limites

Aucun défaut injecté : rappel et précision restent à mesurer. Pas de test réel du second modèle, de saturation, du coût, de concurrence ni d'intégration au parcours d'exploration. Les délais et erreurs sont couverts uniquement par fetch factice. Aucun défilement, autre taille de fenêtre ou interaction avec les pages. Ces trois réponses vides ne prouvent pas l'absence de défauts visuels.
