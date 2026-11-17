# A6 et A7 sur Facturo en ligne — 17 novembre 2026

Branche `a7-facturo-en-ligne`, depuis `origin/dev` récupéré à jour (`45b6c3988f889fafba297d84b8564ddaa1ff2ada`). La branche de la PR 13 reste séparée et inchangée. Ce ticket documentaire ne reprend pas ses mesures locales.

## Contrôle préalable des routes par curl

Origine exclusive des passages : **https://facturo-demo.vercel.app**, pas le serveur Facturo local. Les routes sont produites par `construireConsigne` avec les tests du vault. Curl, code de sortie 0 pour chaque requête, confirme :

| Route | Statut final | Destination |
|---|---:|---|
| `/v12/entrer?suite=/v12/tableau-de-bord` | 200 | `/v12/tableau-de-bord` |
| `/v12/tableau-de-bord` | 200 | identique |
| `/v12/factures` | 200 | identique |
| `/v12/factures/F-119` | 200 | identique |
| `/v13/entrer?suite=/v13/tableau-de-bord` | 200 | `/v13/tableau-de-bord` |
| `/v13/tableau-de-bord` | 200 | identique |
| `/v13/factures` | 200 | identique |
| `/v13/factures/F-119` | 200 | identique |
| `/v13/factures?filtre=echeance-depassee` | 200 | identique, filtre conservé |

Les routes protégées sont contrôlées après `/vXX/entrer`, dans le même processus curl. Commande type, cookies conservés **en mémoire seulement** :

```sh
curl --silent --show-error --cookie '' --location --max-time 30 \
  --output /dev/null --write-out '\n%{http_code} %{url_effective}\n' \
  'https://facturo-demo.vercel.app/v13/entrer?suite=/v13/tableau-de-bord' \
  'https://facturo-demo.vercel.app/v13/factures?filtre=echeance-depassee'
```

Sans moteur de cookies, un premier curl aboutissait à `/login`, même après `/entrer`. Vérification contradictoire : avec `--cookie ''`, `/entrer` aboutit au tableau de bord aussi bien en local qu’en ligne ; les sept routes protégées en ligne répondent alors sans formulaire de mot de passe. Aucun écart bloquant d’URL relevé. Ce contrôle ne prétend pas prouver une identité pixel à pixel entre les déploiements.

## Montage et commandes réelles

- Wrapper réutilisé : `/home/ubuntu/horama-a7-local/run-a7-shared.mjs --online`. Le mode en ligne exécute d’abord v12, puis cinq v13 ; journaux distincts des essais locaux précédents. Aucun changement du code du dépôt.
- `FAUX_SAAS_URL=https://facturo-demo.vercel.app` transmis à chaque CLI ; aucun repli vers localhost. Le serveur Facturo local a été arrêté avant les passages.
- Supabase partagé : configuration existante chargée hors dépôt, jamais reproduite ici. La connexion SQL n’est pas transmise au coureur ; écritures par REST et stockage serveur. Aucun secret ajouté au dépôt ou aux journaux.
- Clé H liée seulement à l’environnement exec via `{"HAI_API_KEY":"secret:session:HAI_API_KEY_HORAMA"}` ; ni clé de démo ni clé Nami. Aucun secret H écrit dans un fichier.
- Chrome dédié CDP 9333, `--force-device-scale-factor=1`, profil externe, 1280 × 900 et DPR 1 vérifiés avant **chacun** des six passages. Pont `/home/ubuntu/.venvs/holo/bin/holo`, SDK `hai-agents` 1.5.1.
- Nouvelle copie complète du vault : `/home/ubuntu/horama-a7-local/vault-online`. Tous les rapports générés restent hors dépôt.
- Préflight avant chaque passage : quota H HTTP 200, `{"scope":"org","limit":3,"active":0,"available":3}`. Le wrapper refuse de créer un passage si HTTP différent de 200 ou quota disponible nul. Repos de 35 s entre passages, hors mesure.

Commandes, chacune avec l’environnement ci-dessus :

```sh
# A6 : une fois
pnpm --filter @horama/agent passage -- --logiciel facturo --version 12 --reference 12 --vault /home/ubuntu/horama-a7-local/vault-online
# A7 : cinq fois, séquentiellement
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --vault /home/ubuntu/horama-a7-local/vault-online
```

## A6 : référence v12 réelle, sans promotion automatique

Conformément au couloir Ali/A6 et à `construireConsigne`, les mêmes tests sont demandés en v12 ; `liste-factures-filtre-echeance` est exclu parce que sa vue n’existe qu’en v13. Deux tests compatibles, trois couples écran/vue uniques :

| Écran / vue | Chemin dans le bucket partagé `captures` |
|---|---|
| `tableau-de-bord` / `defaut` | `2026-11-17-11h55-bce8/ca-du-mois-egal-total/tableau-de-bord--defaut.png` |
| `liste-des-factures` / `defaut` | `2026-11-17-11h55-bce8/ca-du-mois-egal-total/liste-des-factures--defaut.png` |
| `detail-facture` / `defaut` | `2026-11-17-11h55-bce8/detail-facture-total-egal-liste/detail-facture--defaut.png` |

Les trois captures ont la version `12`, l’URL de page en ligne attendue et une taille de **1280 × 900**, comme les captures v13. Elles sont prêtes à être désignées par le couloir Nathan ; **aucune promotion dans `references_ecran` ni copie dans les références du vault** n’a été faite par Ali.

## Mesures A6 et cinq A7

« Durée C6 » : de la création logique du passage jusqu’au retour du partage H et à l’arrêt du pont ; inclut outils, captures et écritures intermédiaires, mais exclut l’écriture Markdown finale et le dernier PATCH. « Commande complète » : temps mural du lancement de la CLI à sa sortie, incluant ces finalisations. Les deux excluent le préflight, la préparation du navigateur, les lectures REST de contrôle et le repos entre commandes. Coût : métrique H de la session, pas une estimation d’infrastructure.

| Essai | Passage partagé | Début UTC | C6 (s) | Commande complète (s) | Coût USD | Événements / étapes | Captures | État passage / H | Gel > 45 s / relance |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| A6 v12 | `2026-11-17-11h55-bce8` | 11:55:27 | 43,355 | 44,575 | 0,0144588 | 7 | 3 | `joue` / `completed` | non / 0 |
| A7 v13 n°1 | `2026-11-17-11h56-7635` | 11:56:50 | 73,777 | 74,976 | 0,0305696 | 13 | 4 | `joue` / `completed` | non / 0 |
| A7 v13 n°2 | `2026-11-17-11h58-7225` | 11:58:43 | 44,048 | 45,314 | 0,0264386 | 11 | 4 | `joue` / `completed` | non / 0 |
| A7 v13 n°3 | `2026-11-17-12h00-243f` | 12:00:05 | 73,712 | 74,975 | 0,0335700 | 14 | 4 | `joue` / `completed` | non / 0 |
| A7 v13 n°4 | `2026-11-17-12h01-bd38` | 12:01:58 | 55,027 | 56,387 | 0,0275154 | 12 | 4 | `joue` / `completed` | non / 0 |
| A7 v13 n°5 | `2026-11-17-12h03-2ce9` | 12:03:32 | 66,517 | 67,786 | 0,0274612 | 13 | 4 | `joue` / `completed` | non / 0 |

Six sorties CLI avec code 0. **Médiane des cinq v13 : 66,517 s C6 ; 67,786 s pour la commande complète**, cible < 90 s atteinte dans les deux cas. Aucun dépassement sur cet échantillon. Total v13 : 313,081 s C6, 319,438 s commande complète et **0,1455548 USD**. A6 n’est pas inclus dans la médiane A7.

Une seule création de session par passage, aucune alerte de relance. Écarts maximums entre activités observées (événements ou retours d’outils) : A6 7,519 s ; A7 8,653 / 8,436 / 5,958 / 7,616 / 9,964 s. Aucun gel > 45 s observé ; la récupération d’un gel n’est donc pas validée en réel.

Chaque passage utilise une session chaînée, pas une session par test : deux tests `termine` en A6, trois dans chacun des cinq A7. **Ne pas additionner les métriques répétées par test.** La CLI ne lance aucun jugement métier : les Markdown restent `INCONCLUSIVE`, zéro `PASS` revendiqué. `--reference 12` n’implique ni comparaison calculée des versions ni validation des références.

## Replays publics

Création H : six HTTP 201 ; `POST /sessions/{id}/share` : six HTTP 200. Liens résolus depuis le `share_url` relatif renvoyé par H, présents dans C6 et les six Markdown. Contrôle par `curl --silent --show-error --location --max-time 30 --output /dev/null --write-out '%{http_code}' "$REPLAY_URL"`, sans clé ni cookie :

| Essai | Replay renvoyé par H | curl HTTP / sortie |
|---|---|---|
| A6 | [8f7f5b01-64a5-4984-a06b-29166a02e72b](https://agp.eu.hcompany.ai/share/api/v1/trajectories/8f7f5b01-64a5-4984-a06b-29166a02e72b) | 200 / 0 |
| A7 n°1 | [d97ae9d4-50fe-424b-b49e-61a70df07df3](https://agp.eu.hcompany.ai/share/api/v1/trajectories/d97ae9d4-50fe-424b-b49e-61a70df07df3) | 200 / 0 |
| A7 n°2 | [04ed16e2-9084-4039-8bc1-5c767dda8e66](https://agp.eu.hcompany.ai/share/api/v1/trajectories/04ed16e2-9084-4039-8bc1-5c767dda8e66) | 200 / 0 |
| A7 n°3 | [9edee5d6-3542-45c3-9f20-dbeae6ac899d](https://agp.eu.hcompany.ai/share/api/v1/trajectories/9edee5d6-3542-45c3-9f20-dbeae6ac899d) | 200 / 0 |
| A7 n°4 | [17973f3a-5570-4d8c-b69d-6802f7c79efe](https://agp.eu.hcompany.ai/share/api/v1/trajectories/17973f3a-5570-4d8c-b69d-6802f7c79efe) | 200 / 0 |
| A7 n°5 | [996399d6-a3c2-43b0-a748-01a542b52228](https://agp.eu.hcompany.ai/share/api/v1/trajectories/996399d6-a3c2-43b0-a748-01a542b52228) | 200 / 0 |

GET anonyme complémentaire : six ressources `application/json`, `is_public=true`, `status=completed`. Il s’agit de trajectoires JSON publiques, **pas d’un lecteur HTML vérifié visuellement**. Aucun lien de lecteur inventé.

## Vérification REST des écritures partagées

Après chaque commande : GET sur `passages?id=eq.<id>` (exactement une ligne), `evenements?passage_id=eq.<id>` et `captures?passage_id=eq.<id>`. Les comptes sont ceux du tableau des mesures : **A6 1/7/3 ; A7 1/13/4, 1/11/4, 1/14/4, 1/12/4, 1/13/4** pour passages/événements/captures. Total de ces essais seulement : **6 passages, 70 événements, 23 captures** ; v13 seul : 5/63/20.

Les champs `captures.url_page` commencent tous par l’origine en ligne et portent la bonne version ; 23 captures en 1280 × 900. Les 23 objets donnent HTTP 200 et `image/png` par HEAD anonyme sur `/storage/v1/object/public/captures/<chemin>`. Les 17 entrées de tests C6 sont `termine`, avec replay présent dans le Markdown externe. Aucune migration, suppression ou modification des passages préexistants.

Preuves externes persistantes dans `/home/ubuntu/horama-a7-local/` : `online-evidence.log`, `online-run-1.log` à `online-run-6.log`, `online-results.json`, `online-public-checks.json`, et `vault-online/facturo/passages/<id>.md`. Les traces H n’enregistrent ni en-têtes d’autorisation ni corps de requêtes.

## Vérification du dépôt et limites

`pnpm install && pnpm -r check` : **code de sortie 0**, journal externe `/home/ubuntu/horama-a7-local/online-workspace-check.log`. Installation sans changement du verrou :

```text
Scope: all 7 workspace projects
Already up to date
Done in 3ms using pnpm v12.18.0
```

Extraits réels des résultats, lint agent exécuté une seule fois :

```text
faux-saas check: # pass 7
faux-saas check: # fail 0
memoire check: # pass 28
memoire check: # fail 0
agent check: $ tsc --noEmit --noUnusedLocals --noUnusedParameters --allowUnreachableCode false --allowUnusedLabels false
interface check: # pass 8
interface check: # fail 0
jugement check: # pass 34
jugement check: # fail 0
agent check: 1..48
agent check: # tests 48
agent check: # suites 0
agent check: # pass 48
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 385.690664
agent check: Done
```

`git diff --check` ne signale aucune erreur. Les paquets existants couvrent les contrats, types, lint et tests ; aucun nouveau test de production n’est nécessaire pour ce ticket de mesures, sans changement de code.

Aucun code de production, contrat gelé, cas caché, référence ou vault du dépôt modifié. Aucun parcours ni lecteur vérifié visuellement, aucune validation humaine de la porte déclarée. Restent la désignation des références v12 par Nathan, la comparaison calculée v12/v13, la relance après gel réel et la relecture humaine. Les six exécutions ne garantissent pas les performances futures.
