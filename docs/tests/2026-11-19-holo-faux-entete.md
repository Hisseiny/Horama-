# Holo : faux doutes de découpe et éléments d’en-tête répétés

## Périmètre

Branche indépendante `a-179-holo-faux-entete`, créée depuis `origin/dev`
(`aa56a5e`) dans `/home/ubuntu/repos/Horama-holo`. La branche
`a-170-texte-non-traduit` et son worktree ne sont pas modifiés.
Seuls `agent/` et ce compte rendu changent : aucun contrat, aucune dépendance,
aucune modification d’`automatisation/`, aucun domaine ajouté dans `agent/src/`.

## Méthode

- Avant de conserver un doute Holo de découpe (`cut-off-text` ou phrase parlant
  d’un élément masqué/coupé), interroger le DOM via CDP. Chercher un élément
  textuel ou une image intersectant la zone ; garder le doute si la sélection
  est ambiguë ou si la page, les dimensions ou le défilement ont changé depuis
  la capture.
- Écarter seulement si toute sa boîte est dans le viewport, sans débordement
  propre (`scrollWidth <= clientWidth` et équivalent vertical), sans indice CSS
  de masquage/découpe, et si neuf points de sa boîte touchent l’élément ou ses
  descendants via `elementFromPoint`. Cela couvre aussi le rognage par un
  ancêtre, sans rejeter arbitrairement un élément fixe sous un parent
  `overflow:clip`. Une erreur CDP conserve le doute.
- Journaliser chaque retrait et son sélecteur. Les autres sortes de doute ne
  sont pas retirées au seul motif que l’élément est visible.
- Pour les doutes conservés, mémoriser sélecteur, texte normalisé et appartenance
  à un `header` ou `[role="banner"]` dans la preuve libre `element_holo`.
  Remplacer le rapprochement interpages à ±8 px par un même sélecteur **ou** un
  même texte non vide, seulement entre éléments d’en-tête de même sorte de
  constat. Un doute principal ; les suivants portent `explique_par` sans devenir
  des réussites. La priorité d’explication par un contrôle `VERIFIED_FAIL` reste
  inchangée. Aucune identité n’est déduite quand le DOM n’est pas disponible.

## Tests sans réseau externe

- `agent/exploration-holo.test.ts` : identité par sélecteur/texte, éléments hors
  en-tête ou distincts, valeurs vides, classification masqué/coupé, erreur ou
  réponse CDP vide, absence de zone.
- `agent/exploration-explorer.test.ts` : zones très différentes rattachées au
  même doute, comptage et `explique_par` de #186 conservés ; retrait journalisé
  pour un élément visible ; éléments distincts ou inspection indisponible non
  fusionnés, même à coordonnées identiques.
- `agent/exploration-controles.test.ts` : Chrome local, logo SVG et texte de menu
  visibles, débordement réel, texte recouvert, rognage par un ancêtre, hors écran,
  `clip-path`, élément fixe sous `overflow:clip`, zone vide et décalage entre
  contexte de capture et DOM courant.

Commande ciblée, dans `agent/` :

```text
node --test exploration-holo.test.ts exploration-explorer.test.ts exploration-controles.test.ts
# tests 101
# pass 101
# fail 0
# cancelled 0
# skipped 0
```

Après la dernière modification du code, `pnpm -r --if-present run check`, code 0 :

```text
agent check: 1..276
agent check: # tests 282
agent check: # suites 0
agent check: # pass 282
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 16998.237242
agent check: Done
```

Un premier essai global avait échoué dans le test de découverte inchangé :

```text
agent check: not ok 175 - Chrome réel découvre une page JS locale sans masquer la scène et ferme ses onglets
agent check:   error: 'Onglet du relevé introuvable.'
agent check: # tests 282
agent check: # pass 281
agent check: # fail 1
```

Le Chrome dédié resté ouvert a été arrêté, jamais le Chrome bureau sur 29229.
La cause de cet échec n’est pas établie ; aucune correction spéculative du test
ou de la gestion d’onglets. Le dernier check ci-dessus est intégralement vert.

## Captures réelles et Models API

Chrome headless, viewport 1280×900, DPR 1, défilement `[0,0]`, captures PNG du
viewport. Navigation visiteur en lecture seule ; aucun formulaire ni connexion.
`askHolo` réel, modèle `holo4-27b`, clé fournie uniquement par l’environnement
`HAI_API_KEY=secret:org:HORAMA_HAI_API_KEY`. Aucun passage H nécessaire ni lancé.

« Avant » désigne les doutes rendus par `askHolo` avec les filtres déjà présents
sur dev ; « après » applique l’inspection DOM et le rapprochement interpages aux
**mêmes réponses et captures**. Il ne s’agit pas de deux appels modèle comparés.

| URL finale capturée | Doutes avant | Conservés après | Principaux après |
|---|---:|---:|---:|
| `https://www.albertschool.com/en/` | 0 | 0 | 0 |
| `https://www.albertschool.com/en/about/` | 0 | 0 | 0 |
| `https://www.albertschool.com/en/programs/` | 0 | 0 | 0 |
| `https://www.albertschool.com/en/diploma/` | 0 | 0 | 0 |
| Témoin local injecté, premier appel | 2 | 2 | 2 |
| Témoin local injecté, nouvel appel après la dernière correction | 2 | 2 | 2 |

**Les cinq faux doutes rapportés par Nathan ne sont pas reproduits par ces
nouveaux appels Holo.** Aucun gain réel de 5 à 0 ni rapprochement de nouveaux
doutes entre les quatre pages ne peut donc être revendiqué. Les réponses Holo
ne sont pas converties en verdicts prouvés ; les doutes du témoin restent
`SUSPECTED`.

En complément, rejouer séparément les cinq zones historiques fournies, sur
l’accueil actuel et avec l’inspection finale, résout chaque fois le lien du logo
(`aria-label="Albert School"`, dans un banner), visible et non couvert :

| Zone historique x, y, largeur, hauteur | Inspection | Retrait applicable |
|---|---|---|
| 49, 72, 70, 14 | visible | oui |
| 0, 63, 77, 9 | visible | oui |
| 0, 54, 90, 90 | visible | oui |
| 0, 63, 77, 90 | visible | oui |
| 38, 68, 90, 18 | visible | oui |

Ce rejeu utilise des doutes injectés, pas une nouvelle réponse du modèle ni les
captures originales du passage de Nathan. Il ne prouve pas le cas de son premier
élément de menu. Le regroupement interpages malgré les déplacements est couvert
par les tests déterministes décrits plus haut, pas par les réponses réelles vides.

### Témoin réel conservé

Page locale sans réseau externe : une étiquette jaune `overflow:hidden` et un
texte partiellement recouvert par un rectangle noir. Le dernier appel Holo
décrit bien les deux ; CDP résout respectivement `#real-cut` et `#real-hidden`,
avec `visible:false`, aucun retrait ni `explique_par`. **Deux doutes conservés**,
pas deux défauts prouvés. Vérification visuelle du logo visible et des deux
défauts injectés sur les PNG :
`/home/ubuntu/horama-179-holo-real/0.png` et
`/home/ubuntu/horama-179-holo-witness-final/4.png`.

Six requêtes Models API au total. Écarts entre débuts d’appels : 4,838 s,
4,003 s, 4,003 s, 4,015 s puis 389,247 s : tous ≥4 s et moins de 30 requêtes/min.
Somme des coûts estimés par `askHolo` : **0,004095 USD**. Crédits distincts :
à mesurer, non renvoyés. Aucun HTTP 429 ni timeout de capture observé ici ; cela
n’infirme pas les timeouts signalés pendant les passages H.

### Traces hors dépôt

- Script : `/home/ubuntu/horama-179-holo-real.mjs` ; option `--witness-only` pour
  le second témoin. Requêtes séquentielles avec garde d’espacement de 4000 ms.
- Captures des quatre pages et premier témoin :
  `/home/ubuntu/horama-179-holo-real/{0,1,2,3,4}.png`.
- Réponses, preuves DOM et horaires :
  `/home/ubuntu/horama-179-holo-real/results.json` et
  `/home/ubuntu/horama-179-holo-witness-final/results.json`.
- Rejeu final des zones historiques :
  `/home/ubuntu/horama-179-holo-real/historical-after.json`.
- Check global final : `/home/ubuntu/horama-179-holo-check-2.log`.

Les scripts et captures de mesure restent hors du dépôt ; les tests reproductibles
sans réseau externe sont les trois fichiers de tests du diff.

## Relecture de la PR #197

HEAD local et distant vérifiés avant toute modification :
`77f7e979baa2253cb3fa078dcdb148926c4e79d8`.

### 1. Calque `pointer-events:none`

Retour fondé : Chrome renvoie le texte dans `elementFromPoint`, même sous le
calque noir. L’inspection cherche désormais aussi les éléments sans interaction
qui chevauchent la cible, hors de sa chaîne ancêtre/descendant. S’ils sont visibles
et peints (fond, image, texte ou bordure), le résultat est ambigu (`null`) et le
doute reste conservé. Pas de prétention à prouver l’ordre de peinture : ce
chevauchement suffit à interdire le retrait automatique.

Test Chrome local ajouté : calque noir, semi-transparent ou avec image de fond
→ ambigu ; fond transparent, opacité nulle, élément caché ou hors de la cible
→ cible toujours visible. Le test vérifie explicitement que le hit-test seul
continue à renvoyer le texte.

`node --test exploration-controles.test.ts`, code 0 :

```text
# tests 1
# pass 1
# fail 0
# skipped 0
```
