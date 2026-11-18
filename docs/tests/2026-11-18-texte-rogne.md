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
