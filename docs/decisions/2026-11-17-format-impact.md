# Format du fichier d'impact (`horama-impact-1`)

Date : 17 novembre 2026. Couloir Nathan. Temps 2 du déroulé (`docs/decisions/2026-11-17-deroule-demo-eugenia.md`) : un changement réveille Horama, qui choisit les tests à rejouer et montre aussi ceux qu'il écarte. Le réveil (couloir Ali, issue #36, `automatisation/reveil/`) écrit ce fichier ; la scène le lit et l'affiche. Aucun contrat (`contrats/`) ne change.

## Qui l'écrit, qui le lit

- **Écrit par** `node automatisation/impact/impact.mjs --depuis <commit> --vers <commit> --logiciel <logiciel> --json > <fichier>` (couloir Nathan, J6b). Le réveil l'appelle avec le commit déployé (`--vers`) et le précédent (`--depuis`), puis passe le fichier à la scène.
- **Lu par** `node automatisation/scene/parcours.mjs --impact <fichier> --base-url <adresse du déploiement> --logiciel <logiciel> …`. Sans `--tests`, la scène joue exactement les tests `retenus` du fichier. Avant que l'agent démarre, la mascotte dit en une bulle : « Nouvelle version (`vers` sur 7 caractères) : 2 tests rejoués, 1 écarté : page non touchée. ». Le détail (raison de chaque test) est écrit dans le terminal et dans `passage.json` (champ `impact`). Avec `--sans-presentation`, pas de bulle, seulement le terminal.

## Le fichier (JSON, UTF-8)

```json
{
  "format": "horama-impact-1",
  "le": "2026-11-17T18:30:00.000Z",
  "depuis": "88bc191",
  "vers": "556a89e",
  "logiciel": "eugenia",
  "fichiers": ["src/pages/programme/bachelor-ia-business.astro"],
  "fiches_retenues": ["bouton-candidater-anglais"],
  "socle": [],
  "ids": ["accueil-vers-bachelor"],
  "ecrans": [{ "ecran": "bachelor", "raisons": ["code de la note produit/bachelor.md : src/pages/programme/bachelor-ia-business.astro"] }],
  "retenus": [{ "id": "accueil-vers-bachelor", "raisons": ["relève bachelor"] }],
  "ecartes": [{ "id": "bachelor-vers-msc", "raison": "page non touchée" }],
  "socle_inconnus": []
}
```

| Champ | Type | Sens |
|---|---|---|
| `format` | `"horama-impact-1"` | Obligatoire. La scène refuse tout autre format (sortie 2) |
| `le` | texte ISO 8601 | Quand le choix a été fait |
| `depuis`, `vers` | texte | Commits de départ et d'arrivée (le déployé est `vers`) |
| `logiciel` | texte | Dossier du vault (`eugenia`, `facturo`) ; doit être celui de `--logiciel` de la scène, sinon sortie 2 |
| `fichiers` | liste de textes | Fichiers modifiés entre les deux commits (`git diff --name-only`) |
| `fiches_retenues` | liste de textes | Identifiants des fiches de changement (`<logiciel>/changements/`) ajoutées ou modifiées entre les deux commits |
| `socle` | liste de textes | Tests joués à chaque fois (`automatisation/impact/socle.json` ou `--socle`) |
| `ids` | liste de textes | Les identifiants des tests retenus, dans l'ordre (le même que `retenus`) |
| `ecrans` | liste de `{ ecran, raisons }` | Écrans touchés, et pourquoi : « code de la note … : fichier », « fiche … : ecrans_vises », « fiche … : ne_doit_pas_changer » |
| `retenus` | liste de `{ id, raisons }` | Tests rejoués : « relève <écran> » pour chaque écran touché qu'ils relèvent, « socle » |
| `ecartes` | liste de `{ id, raison }` | Tests acceptés non rejoués ; `raison` est une phrase courte montrée à l'écran (aujourd'hui toujours « page non touchée ») |
| `socle_inconnus` | liste de textes | Tests du socle absents du vault (signalés, jamais joués) |

Règles :
- `retenus` et `ecartes` forment ensemble tous les tests acceptés du logiciel au commit `vers`, sans doublon.
- Une liste `retenus` vide est possible (rien de touché, pas de socle) : la scène s'arrête alors avant de lancer l'agent (« Aucun test à jouer »), sortie 2. Au réveil de décider s'il appelle la scène dans ce cas.
- Tout champ en plus est ignoré par la scène ; un champ en moins parmi `format`, `logiciel`, `retenus`, `ecartes` rend le fichier illisible (sortie 2).

## Vérifié

- `node --test automatisation/impact/*.test.mjs` : 6 sur 6 (la raison des tests écartés est testée).
- Scène en mode scripté sur le site d'Eugenia en ligne, avec un fichier écrit à la main (1 retenu, 1 écarté) : sortie 0, seul le test retenu est joué, bulle affichée avant le départ (témoin `selection`), `passage.json` porte `impact`.
