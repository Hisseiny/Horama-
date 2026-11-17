# A7 : cinq passages réels sur Supabase partagé

Branche `a7-fiabilite-base-partagee`, créée depuis `origin/dev` à jour, commit `45b6c3988f889fafba297d84b8564ddaa1ff2ada`. Les tickets outillage et replay sont déjà intégrés à cette base. Ce ticket ne change ni code de production ni contrat.

## Historique et périmètre

L’essai A7 précédent, sur Supabase local, avait échoué à la création H avec HTTP 403 (`explicit deny in an identity-based policy`), après 1,485 s. Aucun parcours complet, coût ou médiane n’en avait été déduit. Après remplacement de la référence Horama et autorisation explicite de lancer les essais, les cinq passages ci-dessous ont réellement été exécutés le 17 novembre 2026. Ils ne réutilisent aucune mesure A5 ou Nathan.

Trois tests acceptés sont joués dans une session chaînée par passage : `ca-du-mois-egal-total`, `detail-facture-total-egal-liste`, `liste-factures-filtre-echeance`. Quatre relevés : tableau de bord, liste des factures, détail de facture, liste filtrée par échéance.

## Préparation du Supabase partagé, en lecture seule

- Référence comparée : `base/migrations/001_init.sql`, sans l’exécuter sur la base partagée.
- `GET /rest/v1/` : HTTP 200 ; métadonnées des trois tables disponibles.
- Inspection SQL distante avec `psql`, connexion TLS, transaction `BEGIN READ ONLY`, puis `ROLLBACK` : colonnes, types, nullabilité et valeurs par défaut de `passages`, `evenements`, `captures` conformes au schéma attendu pour le coureur ; clés primaires, clés étrangères vers `passages(id)`, contrainte d’état, index `evenements_passage_idx` et index unique `captures_unique_idx` présents.
- `GET /storage/v1/bucket/captures` : HTTP 200, identifiant et nom `captures`, `public=true`.
- Aucun écart relevé sur ce périmètre ; aucune migration ni écriture lors du contrôle préalable. Les autres tables et les politiques RLS ne font pas partie de cet audit. Les écritures n’ont commencé qu’avec les cinq passages autorisés.

Les trois paramètres Supabase sont conservés uniquement dans `/home/ubuntu/horama-a7-local/.env.shared`, permissions `600`, hors dépôt. La connexion SQL n’est utilisée que pour l’inspection en lecture seule ; le coureur utilise l’API REST et le stockage avec la clé serveur. Aucune valeur de secret ou URL avec identifiants n’est reproduite ici.

## Montage reproductible

- `pnpm --filter @horama/faux-saas dev` : Facturo sur `http://localhost:3100`, version v13 parcourue.
- SDK `hai-agents` 1.5.1 et pont `/home/ubuntu/.venvs/holo/bin/holo`, préparés hors dépôt.
- Chrome dédié, CDP 9333, profil `/home/ubuntu/horama-a7-local/chrome-profile`, avec `--force-device-scale-factor=1`, `--force-color-profile=srgb`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`, `--disable-background-timer-throttling`. Environnement D-Bus chargé par `DBUS_SESSION_BUS_ADDRESS`.
- `fitViewport` du couloir scène avant chaque passage : `{"largeur":1280,"hauteur":900,"densite":1}`. Les 20 captures enregistrées ont toutes une taille de 1280 × 900.
- Copie complète du vault dans `/home/ubuntu/horama-a7-local/vault-shared`. Aucun rapport généré dans le vault du dépôt.
- Wrapper externe : `/home/ubuntu/horama-a7-local/run-a7-shared.mjs`. Il charge le fichier Supabase externe, vérifie le projet cible, supprime la variable de connexion SQL de son environnement, puis lance les cinq commandes séquentiellement. Repos de 35 s entre passages, hors durée mesurée.

La clé H est liée uniquement à l’environnement exec par `{"HAI_API_KEY":"secret:session:HAI_API_KEY_HORAMA"}` ; elle n’est jamais écrite dans un fichier. Aucune utilisation de la clé de démo ou de Nami. Le wrapper s’arrête avant de créer un passage si `GET https://agp.eu.hcompany.ai/api/v2/sessions/quota` ne renvoie pas HTTP 200 ou si aucune place n’est disponible. Résultat réel avant chacun des cinq essais :

```text
Préflight H essai 1 HTTP 200
Préflight H essai 2 HTTP 200
Préflight H essai 3 HTTP 200
Préflight H essai 4 HTTP 200
Préflight H essai 5 HTTP 200
Quota {"scope":"org","limit":3,"active":0,"available":3}
```

Commande exécutée cinq fois, avec `FAUX_SAAS_URL=http://localhost:3100`, `HOLO_BIN=/home/ubuntu/.venvs/holo/bin/holo`, les paramètres Supabase partagés et la clé H liés à l’environnement :

```sh
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --vault /home/ubuntu/horama-a7-local/vault-shared
```

`trace-shared.mjs`, préchargé hors dépôt, journalise seulement les méthodes/chemins/statuts HTTP de H, dates, métriques et types d’événements/outils. Aucun en-tête d’autorisation ni corps de requête n’est enregistré. Journaux bruts : `shared-run-1.log` à `shared-run-5.log` ; synthèse `shared-results.json` et `shared-evidence.log`, dans le même répertoire externe.

## Résultats mesurés

Les durées et coûts sont ceux du passage complet fournis par `passages`/C6 : création et suivi H, relevés, écritures des captures, arrêt du pont et partage inclus. La durée est arrêtée juste avant l’écriture finale du rapport Markdown et le dernier PATCH de finalisation ; elle exclut aussi préflight, préparation du navigateur et repos entre commandes. Les coûts sont les métriques H, pas une estimation des coûts d’infrastructure.

| Essai | Passage partagé | Début UTC | Durée (s) | Coût USD | Étapes | Captures | État passage / H | Gel > 45 s / relance |
|---|---|---|---:|---:|---:|---:|---|---|
| 1 | `2026-11-17-11h41-db3b` | 11:41:27 | 73,012 | 0,0249984 | 11 | 4 | `joue` / `completed` | non / 0 |
| 2 | `2026-11-17-11h43-b559` | 11:43:19 | 64,210 | 0,0292960 | 11 | 4 | `joue` / `completed` | non / 0 |
| 3 | `2026-11-17-11h45-05a0` | 11:45:02 | 66,938 | 0,0295724 | 13 | 4 | `joue` / `completed` | non / 0 |
| 4 | `2026-11-17-11h46-f36c` | 11:46:48 | 48,971 | 0,0207310 | 11 | 4 | `joue` / `completed` | non / 0 |
| 5 | `2026-11-17-11h48-cdc2` | 11:48:15 | 79,595 | 0,0301180 | 13 | 4 | `joue` / `completed` | non / 0 |

Les cinq commandes sortent avec le code 0. Durées triées : 48,971 ; 64,210 ; **66,938** ; 73,012 ; 79,595 s. **Médiane : 66,938 s, cible < 90 s atteinte sur cet échantillon**, et aucun passage au-dessus de 90 s. Somme des durées : 332,726 s ; coût H total : 0,1347158 USD. Aucun dépassement à expliquer.

Une seule création H par passage, aucune alerte « session muette, une relance ». Les écarts maximums entre activités observées par le client (événements ou retour d’outil) sont respectivement 10,563 ; 9,950 ; 5,049 ; 5,056 ; 10,080 s. Aucun silence > 45 s observé. Le scénario de gel et sa relance ne sont donc **pas validés en réel** par ces essais ; ils restent couverts par injection dans les tests automatiques.

Chaque rapport C6 comporte trois tests `termine`. Ces métriques de session sont répétées dans les trois tests : **ne pas les additionner**. Les rapports Markdown indiquent trois `INCONCLUSIVE` et zéro `PASS`, car cette CLI ne lance aucun jugement métier. `joue`/`termine` signifie exécution et relevés, pas conformité au calcul. Aucune réussite métier n’est revendiquée ; le paramètre `--reference 12` ne prouve pas une comparaison v12/v13 effectuée.

## Replays publics réels

`POST /sessions/{id}/share` : HTTP 200 sur les cinq sessions, après création HTTP 201. H fournit un chemin relatif `/share/api/v1/trajectories/{id}`. Le code 3.4 déjà fusionné le résout en HTTPS contre l’origine API régionale et propage le même lien aux trois tests C6 puis au Markdown, sans changement de contrat.

Contrôle réel pour chaque lien, sans clé ni cookie :

```sh
curl --silent --show-error --location --max-time 30 --output /dev/null --write-out '%{http_code}' "$REPLAY_URL"
```

| Essai | Session H / lien renvoyé par H | curl HTTP (sortie 0) |
|---|---|---|
| 1 | [94a38cd8-dd38-40ae-8071-66e3aa6fc5ab](https://agp.eu.hcompany.ai/share/api/v1/trajectories/94a38cd8-dd38-40ae-8071-66e3aa6fc5ab) | 200 |
| 2 | [500252d0-a872-4f88-b74a-98b77881c4c2](https://agp.eu.hcompany.ai/share/api/v1/trajectories/500252d0-a872-4f88-b74a-98b77881c4c2) | 200 |
| 3 | [e741d29d-ac69-403f-9cb0-9f3c2caf1751](https://agp.eu.hcompany.ai/share/api/v1/trajectories/e741d29d-ac69-403f-9cb0-9f3c2caf1751) | 200 |
| 4 | [448062dd-5ba2-4c7b-bac9-714b8e5b21bd](https://agp.eu.hcompany.ai/share/api/v1/trajectories/448062dd-5ba2-4c7b-bac9-714b8e5b21bd) | 200 |
| 5 | [f715fadb-f4ef-4481-aefb-b1ec60697f3d](https://agp.eu.hcompany.ai/share/api/v1/trajectories/f715fadb-f4ef-4481-aefb-b1ec60697f3d) | 200 |

Un GET anonyme complémentaire confirme, pour les cinq ressources, `Content-Type: application/json`, `is_public=true`, `status=completed` et respectivement 57, 57, 63, 57, 63 événements H. **C’est une trajectoire JSON publique, pas une page HTML de lecteur vérifiée visuellement.** Aucune URL de lecteur n’est inventée. La réponse publique ne garantit pas une lecture animée en navigateur ni la permanence future du lien. Source documentaire : <https://hub.hcompany.ai/agents-api/sessions/share.md> ; SDK `share_session` de `hai-agents` 1.5.1.

## Contrôle des écritures partagées, par REST en lecture seule

Après chaque commande, le wrapper lit :

```text
GET /rest/v1/passages?select=*&id=eq.<passage>
GET /rest/v1/evenements?select=etape,session_id,horodatage,action&passage_id=eq.<passage>&order=horodatage.asc
GET /rest/v1/captures?select=test_id,session_id,ecran,vue,largeur,hauteur,chemin&passage_id=eq.<passage>
```

| Passage | Lignes passages | Événements | Captures | Tests C6 terminés / liens |
|---|---:|---:|---:|---:|
| `2026-11-17-11h41-db3b` | 1 | 11 | 4 | 3 / 3 |
| `2026-11-17-11h43-b559` | 1 | 11 | 4 | 3 / 3 |
| `2026-11-17-11h45-05a0` | 1 | 13 | 4 | 3 / 3 |
| `2026-11-17-11h46-f36c` | 1 | 11 | 4 | 3 / 3 |
| `2026-11-17-11h48-cdc2` | 1 | 13 | 4 | 3 / 3 |
| **Total de ces essais uniquement** | **5** | **59** | **20** | **15 / 15** |

Contrôle anonyme `HEAD /storage/v1/object/public/captures/<chemin>` pour les 20 objets : tous HTTP 200 et `image/png`. Les cinq rapports Markdown existent dans le vault externe. Détails des lectures publiques : `/home/ubuntu/horama-a7-local/shared-public-checks.json`. Aucune suppression ou modification des données préexistantes.

## Vérification du dépôt et limites

`pnpm install && pnpm -r check` : **code de sortie 0**. Installation sans modification du verrou ; sortie d’installation :

```text
Scope: all 7 workspace projects
Already up to date
Done in 4ms using pnpm v12.18.0
```

Extraits réels du check, dont le lint agent exécuté une seule fois :

```text
contrats check: Done
faux-saas check: # pass 7
faux-saas check: # fail 0
memoire check: # pass 28
memoire check: # fail 0
interface check: # pass 8
interface check: # fail 0
jugement check: # pass 34
jugement check: # fail 0
agent check$ pnpm lint && tsc --noEmit && node --test *.test.ts *.test.mjs
agent check: $ tsc --noEmit --noUnusedLocals --noUnusedParameters --allowUnreachableCode false --allowUnusedLabels false
agent check: # tests 48
agent check: # pass 48
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 414.317781
agent check: Done
```

Sortie complète du check : `/home/ubuntu/horama-a7-local/shared-workspace-check.log`. Le conflit mémoire/vault ne réapparaît pas ; aucun des cinq rapports générés n’est dans le vault du dépôt. `git diff --check` ne signale aucune erreur.

Aucun contrat, code de production, cas caché ou vault du dépôt modifié. Aucun nouveau paquet. La ligne 3.4 reste en cours : une session chaînée pour trois tests au lieu d’une session par test, gel réel et comparaison v12 restent à valider. Cette mesure locale sur cinq passages ne garantit pas les performances futures. Aucun contrôle visuel du lecteur ou du parcours n’a été effectué ; aucune validation humaine de la porte n’est déclarée.
