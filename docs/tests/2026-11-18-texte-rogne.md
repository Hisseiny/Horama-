# Contrôle du texte rogné — 18 novembre 2026

## Périmètre

Issue #122, section 2 et commentaire lus. Ce passage ne traite ni la traduction du clone ni l’option `--site` demandée en commentaire pour une PR distincte. Aucun contrat modifié, aucun accès à `banc/`, aucune clé de démo utilisée.

Le contrôle relève un débordement de plus d’un pixel sur un axe masqué (`hidden` ou `clip`), sans ellipse, puis confirme que le texte lui-même dépasse la boîte. Les éléments invisibles, le texte réservé aux lecteurs d’écran, les carrousels déclarés et les conteneurs défilants sont exclus. Les libellés entièrement déportés par un retrait négatif sont aussi exclus.

## Tests sans réseau

Dans `agent/exploration-controles.test.ts`, Chrome local vérifie le bouton allemand rogné, le texte multiligne sous `overflow:clip`, l’ellipse, le texte court, les éléments masqués ou transparents, `sr-only`, le clip 1 px, le carrousel, le défilement, le retrait négatif et une boîte sans texte. Seuls `#german` et `#multiline` sont signalés.

La page saine existante comportait une « troncature volontaire » sans ellipse, désormais détectable selon la nouvelle règle : elle exprime maintenant explicitement cette intention avec `text-overflow:ellipsis`.

## Pages publiques réelles

Repli autorisé : contrôles mécaniques dans Chrome headless, sans session H, sans clé ni appel au modèle. C’est une mesure du contrôle DOM, pas une exploration H complète du site. Une page d’accueil par site, visiteur anonyme, aucun formulaire soumis. Chrome à 1280 × 900, DPR 1 ; `prepareCapture` puis `controlerPage(client, { maxLiens: 0 })`. Les liens ne sont donc pas vérifiés. Les contrôles parcourent le document rendu, pas uniquement le premier écran.

Pilote local conservé sur la machine : `/home/ubuntu/horama-122-bench.ts`, lancé avec `node /home/ubuntu/horama-122-bench.ts`. Sortie finale : `/home/ubuntu/horama-122-bench-final.log`. Captures pleine page : `/home/ubuntu/horama-122-python.png`, `/home/ubuntu/horama-122-mozilla.png`, `/home/ubuntu/horama-122-govuk.png`.

| Page | Éléments DOM | `texte_rogne` final | Autres constats | Verdict pour `texte_rogne` |
|---|---:|---:|---|---|
| https://www.python.org/ | 897 | 0 | 1 `debordement` | Aucun faux observé sur cette page |
| https://www.mozilla.org/en-US/ | 1103 | 0 | 1 `debordement` | Aucun faux après correction ci-dessous |
| https://www.gov.uk/ | 617 | 0 | Aucun | Aucun faux observé sur cette page |

Le premier passage sur Mozilla avait produit **9 faux** : les liens sociaux du pied de page (Mozilla : Bluesky, Instagram, LinkedIn, TikTok, Spotify ; Firefox : Bluesky, Instagram, YouTube, TikTok). Chaque lien a été inspecté par CDP : boîte 24 × 25 px, `text-indent:-9999px`, image de fond représentant le réseau social et libellé accessible déporté. Il ne s’agit pas d’un texte visible accidentellement rogné. La capture pleine page a également été examinée. Une exclusion générique du texte entièrement déporté et un test de régression ont été ajoutés, puis les trois pages ont été rejouées : **0, 0, 0**. Les deux constats `debordement` ne sont pas évalués par ce banc ciblé.

Recherche insensible à la casse des trois domaines avec `rg -i 'python\.org|mozilla\.org|gov\.uk' agent/src` : aucune correspondance (code 1 de `rg`). Aucun domaine utilisé comme exception dans le code.

Limites : trois pages, un seul viewport, aucun parcours authentifié ou interactif ; ces résultats ne prouvent pas l’absence universelle de faux positifs ou de faux négatifs.

## Vérification globale

Commande : `pnpm install && pnpm -r --if-present run check`. Résultat final : code 0. Extrait :

```text
Scope: all 7 workspace projects
Already up to date
Done in 2ms using pnpm v12.18.0
agent check: # Textes rognés : \#german, \#multiline
agent check: 1..253
agent check: # tests 259
agent check: # suites 0
agent check: # pass 259
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 17073.661182
agent check: Done
```

Les autres projets vérifiés se terminent aussi sans échec : contrats (types), faux-saas (10 tests), mémoire (34), interface (8), jugement (79).

Deux adaptations nécessaires : les tables de correspondance de `explorer.ts` reconnaissent la nouvelle sorte (deux lignes, sans toucher au reste de l’explorateur) ; la fixture saine utilise une ellipse explicite. Un premier essai global a été interrompu pendant qu’un Chrome de mesure occupait le port 9333 utilisé par les tests ; le passage final a été exécuté après sa fermeture. Les messages D-Bus de Chrome ont été diagnostiqués et l’adresse de bus de session explicitée pour la vérification finale.

## Complément : explorations avec de vraies sessions H

Deux invocations réelles de la CLI ont ensuite été effectuées avec la clé de développement Horama injectée dans `HAI_API_KEY` (jamais la clé de démo). Chrome dédié headless sur le port 9333, 1280 × 900, DPR 1. Vault neuf hors dépôt : `/home/ubuntu/horama-122-h-vault`. Aucun formulaire soumis et aucune connexion demandée.

```sh
pnpm --filter @horama/agent explorer -- --url https://www.python.org/ --max 3 --sans-base --vault /home/ubuntu/horama-122-h-vault --sortie /home/ubuntu/horama-122-h-python
pnpm --filter @horama/agent explorer -- --url https://www.gov.uk/ --max 3 --sans-base --vault /home/ubuntu/horama-122-h-vault --sortie /home/ubuntu/horama-122-h-govuk
```

Les résultats proviennent de `exploration.json` dans chacun de ces dossiers. Dans cette sortie, la sorte du contrôle s’écrit `texte-rogne` ; le doute visuel Holo `texte-coupe` est distinct.

| Site | Pages visitées / trouvées | `texte-rogne` | Verdict et état du passage |
|---|---:|---:|---|
| Python | 3 / 3 | 0 | Aucun faux de ce contrôle observé ; passage `fini`, CLI code 0 |
| GOV.UK | 3 / 3 | 0 | Aucun constat de ce contrôle enregistré ; passage `interrompu`, CLI code 1 : ne constitue pas une réussite complète |

Python : `/`, `/about/apps`, `/downloads`. Session H `2231bd78-a1f0-4dbc-856d-4d400817ec26`, replay : https://agp.eu.hcompany.ai/share/api/v1/trajectories/2231bd78-a1f0-4dbc-856d-4d400817ec26. Sortie :

```text
3 pages trouvées.
accueil : depart
about-apps : clic
downloads : clic
3 pages visitées ; durée 87.174 s ; coût 0.035922600000000006 USD.
{"debordement":3,"texte-coupe":1}
Navigation : 2 pages par clic, 0 par adresse ; 2 clics, 4 défilements, 1 go_to ; départ : 2 défilements.
```

Les trois `debordement` et le doute Holo ne sont pas des `texte-rogne` et ne sont pas arbitrés ici. Aucun constat `texte-rogne` à inspecter.

GOV.UK : `/`, `/browse/benefits`, `/government/organisations`, toutes marquées `visitee`, avec analyse Holo `fait` pour chacune et zéro constat enregistré. Session H `9de19986-21f0-4af1-8e4c-f508e4cfb7c6`. Le processus ne se terminant pas après environ six minutes, un SIGINT a arrêté proprement la CLI ; aucune relance manuelle. Diagnostic final exact dans le JSON : `La session H est interrompue (erreur réseau ou outil).` Il ne permet pas de distinguer une erreur réseau d’une erreur d’outil ; aucune cause plus précise n’est affirmée. Sortie :

```text
3 pages trouvées.
accueil : depart
government-organisations : clic
browse-benefits : clic
2026-11-18-20h41-dd8b : Passage annulé : Passage annulé par Ctrl+C.
3 pages visitées ; durée 372.162 s ; coût 0.0017712000000000001 USD.
{}
Navigation : 2 pages par clic, 0 par adresse ; 4 clics, 2 défilements, 1 go_to ; départ : 2 défilements.
[ELIFECYCLE] Command failed with exit code 1.
```

Journaux persistants : `/home/ubuntu/horama-122-h-python.log` et `/home/ubuntu/horama-122-h-govuk.log`. Cette suite ne change que le présent document : le contrôle global réussi ci-dessus reste applicable, sans relance identique. Aucun fichier de mesure ni vault ajouté au dépôt.

## Corrections après revue de la PR #156

Deux faux positifs supplémentaires sont couverts dans Chrome local, sans réseau :

- Une ellipse multiligne active (`-webkit-line-clamp:2`, boîte verticale) est intentionnelle même si `text-overflow` vaut `clip` : aucun `texte_rogne`.
- Une carte de 100 × 80 px contient un libellé avec ellipse et une image de 200 px de large : le texte déjà masqué par le libellé enfant ne doit pas expliquer le débordement de l’image. Aucun `texte_rogne` sur cette carte.
- Contre-exemple : un parent de 100 px coupe réellement le texte d’un enfant de 400 px ; le parent est bien signalé. Le texte multiligne sans clamp reste également signalé.

L’intersection des rectangles de texte avec les boîtes de découpage intermédiaires est activée uniquement pour `texte_rogne`. L’appel utilisé par `debordement` conserve son comportement antérieur.

Commande : `pnpm -r --if-present run check`, code 0. Journal : `/home/ubuntu/horama-156-review-check.log`.

```text
agent check: 1..253
agent check: # tests 259
agent check: # suites 0
agent check: # pass 259
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 17064.65266
agent check: Done
```

Pas de nouvelle exploration publique pour ces deux corrections ; vérification ciblée par les fixtures Chrome, sans inspection visuelle supplémentaire.
