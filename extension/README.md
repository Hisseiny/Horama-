# Extension Chrome Horama

L'entrée du mode grand public (issue #68, étape 3). On ouvre un site, on clique sur le bouton Horama : l'adresse de l'onglet est déjà remplie, on peut la changer, on clique « Envoyer Horama ». Le service Horama explore le site avec l'agent H. L'extension montre la progression page par page, puis le récapitulatif : trois chiffres, chaque **défaut prouvé** avec sa capture marquée du trait de la charte et sa mesure en clair (« mesuré : … », « attendu : … »), et, à part sous « À trancher », les doutes de Holo, qui ne prouvent rien.

L'extension ne navigue pas à la place de l'utilisateur : c'est le service qui explore. Ce qu'elle montre, ce sont des défauts prouvés par le code, avec leur preuve.

Dans la charte « L'envoyé » (`docs/da/charte-graphique.md`) :
- la fenêtre de 360 px : bandeau ciel avec le soleil, le mot de marque et la mascotte, adresse en mono, bouton ailé « Envoyer Horama » ;
- le rapport : la carte du récapitulatif, trois chiffres, chaque défaut sur sa feuille avec le trait miltos, les doutes avec leurs points ocre, les pages avec le carré de leur état.

La mascotte est celle de la charte (`mascotte/`, copie de `docs/da/mascotte/`), animée comme dans la scène.

## Installer (mode développeur)

1. Récupérer le dossier `extension/` du dépôt, ou le `.zip` (voir plus bas) décompressé.
2. Dans Chrome, ouvrir `chrome://extensions`, activer « Mode développeur » (en haut à droite).
3. « Charger l'extension non empaquetée », puis choisir le dossier `extension/` (celui qui contient `manifest.json`).
4. Épingler Horama dans la barre d'outils (icône de pièce de puzzle).
5. Options de l'extension : l'adresse du service Horama (par défaut `https://explorations-production-70bf5b38.up.railway.app`, le service en ligne ; `http://127.0.0.1:8787` pour le faux service local).

## Le .zip pour le jury

```
sh extension/empaqueter.sh
```

Il écrit `extension/dist/horama-extension.zip` (ignoré par Git), qui ne contient que les fichiers que Chrome charge : ni le faux service, ni ce README. Le jury le décompresse, puis suit « Installer ».

## Ce que l'extension demande à Chrome

- `activeTab` : l'adresse de l'onglet ouvert, seulement au clic sur le bouton. Aucune permission sur les sites en général.
- `storage` : l'adresse du service, dans les options.
- Aucune clé, aucun code distant : les signes de preuve (`lib/trait.js`), la feuille de style (`envoye.css`) et la mascotte (`mascotte/`) sont copiés de la charte dans l'extension. Seules les polices de la charte viennent de Google Fonts, avec des polices de repli.

## Le contrat avec le service

Celui de l'issue #68, étape 2, avec six points proposés pour Ali le 18/11 dans #68. Ils sont **à confirmer par le service réel**. L'extension s'alignera sur ce qu'Ali écrira dans #68.

| Appel | Réponse |
|---|---|
| tout appel | en-tête `Access-Control-Allow-Origin: *`, `OPTIONS` compris (l'extension appelle depuis sa propre page, sans permission d'hôte) |
| `POST /explorations` `{ url }` | `202 { id, place }` (`place` : 0, ou le nombre d'explorations devant) ; `400`, `429` (plafond de demandes), `503` (service complet) : `{ erreur }`, phrase affichée telle quelle |
| `GET /explorations/:id` | `200 { id, etat: "en_file", place }` tant qu'elle attend, puis le fichier `horama-exploration-1` à jour ([format](../docs/decisions/2026-11-17-format-exploration.md)), lu toutes les 500 ms ; `404 { erreur }` |
| `GET /explorations/:id/<capture>` | l'image, `<capture>` étant le champ `capture` du fichier tel quel (`captures/<ecran>.png`, `captures/<id du constat>.png`) |

Un service qui ne répond pas : « Le service Horama ne répond pas. Vérifie son adresse dans les options. »

## Le faux service, en attendant celui d'Ali

```
node extension/faux-service/serveur.mjs
```

Node, sans dépendance, même contrat, sur `http://127.0.0.1:8787`. Il rejoue page par page une exploration réelle enregistrée, quelle que soit l'adresse envoyée, et le dit dans le terminal. Par défaut, il rejoue `faux-service/rapport-enregistre/` : l'exploration scriptée de la scène lancée depuis l'article de blog d'Eugenia, le 18/11 (15 pages, sans H ni Holo, un lien en 404 prouvé ; voir `docs/tests/2026-11-18-depart-article-et-pr-doc.md`).

Options : `--port 8787`, `--dossier <sortie d'une exploration>` (un autre rapport `horama-exploration-1` et ses captures), `--rythme 2` (secondes par page), `--file 1` (places dans la file avant le départ), `--plafond 20` (demandes par heure et par adresse IP, puis 429), `--refuser 429|503` (chaque demande reçoit ce refus, pour voir la fenêtre d'erreur).

## Fichiers

- `manifest.json` : Manifest V3.
- `popup.*` : la fenêtre du bouton, avec l’adresse et « Envoyer Horama ». Le rapport s'ouvre dans un onglet de l'extension, qui reste ouvert pendant toute l'exploration (une fenêtre de bouton se ferme dès qu'elle perd le focus).
- `rapport.*` : la progression, puis le récapitulatif.
- `options.*` : l'adresse du service.
- `service.js` : les appels au service, partagés.
- `envoye.css` : la feuille de style de la charte, copiée telle quelle (variables, polices, bouton ailé, feuille).
- `commun.css` : ce qui est propre à l'extension (bandeau, mascotte animée, carrés d'état).
- `mascotte.js` et `mascotte/` : la mascotte de la charte, mise en ligne dans la page pour bouger.
- `lib/trait.js` : les deux signes de preuve de la charte (`tracerDefaut`, `poserDoute`), copiés de `docs/da/trait.js`.
- `faux-service/` : le faux service et le rapport qu'il rejoue (hors du .zip).
- `empaqueter.sh` : le .zip.
