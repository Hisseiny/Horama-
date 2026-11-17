# Essai réel H sur Facturo local : création de session refusée

## Résultat

Le 17 novembre 2026 à 08 h 47 UTC, le coureur a tenté de créer une vraie session H sur Facturo v13 local. H a refusé la création avec HTTP 403. Aucun agent n'a joué le parcours : le passage est en échec, sans session, capture ni événement. Le coût est inconnu, pas nul. Aucune planche de réussite n'a été générée.

## Montage

- Branche : `dev-ali`.
- Facturo local : `pnpm --filter @horama/faux-saas dev`, port 3100 ; la route `/v13/entrer?suite=/v13/tableau-de-bord` répond HTTP 307 (redirection d'entrée).
- Chrome visible dédié : `/home/ubuntu/.local/bin/google-chrome`, CDP sur 9333, zone de page mesurée 1280 × 900 et DPR 1.
- Pont réel : `/home/ubuntu/.venvs/holo/bin/holo local browser`, démarré par `startBridge` de Nathan et prêt avant la requête de création.
- Runner hors dépôt : `/home/ubuntu/horama-a4-local/passage-h.ts`, exécuté avec `node`, la clé organisationnelle `HAI_API_KEY` liée par référence dans un nouveau shell. Aucune utilisation de `HAI_API_KEY_DEMO`.
- `creerCoureur` utilise `creerSessionH` sans session factice, le modèle par défaut `holo4-27b`, les trois tests acceptés du vault et la base Supabase locale existante.
- Le hook de capture utilise le CDP de l'onglet de l'agent ; aucune navigation vers les relevés n'est effectuée par le hook. Il n'a pas été appelé, la création de session ayant échoué.
- Aucun fichier d'`automatisation/` ni contrat modifié.

## Sortie de l'essai

```text
GET /sessions/quota HTTP 200
{"scope":"org","limit":3,"active":0,"available":3}
Pont local H prêt.
H POST /api/v2/sessions HTTP 403
Error: H a répondu 403 sur POST /sessions.
```

L'exécution du runner se termine avec le code 1. Le quota indique trois places disponibles immédiatement avant le refus ; aucun HTTP 429 observé. La lecture du quota fonctionne, mais cela ne prouve pas le droit de créer une session avec ce modèle. Le corps de la réponse 403 n'a pas été conservé : sa cause précise reste inconnue. Aucune seconde création tentée, aucun changement de clé, de modèle ou de région pour contourner le refus.

## Preuves Supabase

Requêtes effectuées via `docker exec supabase_db_horama-a4-local psql -U postgres -d postgres` :

```sql
select id, etat, duree_s, cout_usd, rapport
from passages order by debut desc limit 1;

select p.id,
  (select count(*) from captures c where c.passage_id=p.id) as captures,
  (select count(*) from evenements e where e.passage_id=p.id) as evenements
from passages p order by debut desc limit 1;
```

```text
          id           | etat  | duree_s | cout_usd
-----------------------+-------+---------+----------
 2026-11-17-08h47-cd7d | echec |   1.267 |

          id           | captures | evenements
-----------------------+----------+------------
 2026-11-17-08h47-cd7d |        0 |          0
```

Rapport C6 stocké :

```json
{
  "passage": {
    "id": "2026-11-17-08h47-cd7d",
    "logiciel": "facturo",
    "version_testee": "13",
    "version_reference": "12",
    "etat": "echec",
    "debut": "2026-11-17T08:47:05.595Z",
    "fin": "2026-11-17T08:47:06.862Z",
    "duree_s": 1.267,
    "cout_usd": null
  },
  "tests": [
    {
      "test_id": "ca-du-mois-egal-total",
      "session_id": "",
      "etat": "non_concluant",
      "raison": "ecran non atteint",
      "ecrans_releves": [],
      "duree_s": 1.267,
      "cout_usd": null,
      "etapes": 0
    },
    {
      "test_id": "detail-facture-total-egal-liste",
      "session_id": "",
      "etat": "non_concluant",
      "raison": "ecran non atteint",
      "ecrans_releves": [],
      "duree_s": 1.267,
      "cout_usd": null,
      "etapes": 0
    },
    {
      "test_id": "liste-factures-filtre-echeance",
      "session_id": "",
      "etat": "non_concluant",
      "raison": "ecran non atteint",
      "ecrans_releves": [],
      "duree_s": 1.267,
      "cout_usd": null,
      "etapes": 0
    }
  ]
}
```

La durée mesure l'essai du coureur refusé, pas une navigation H. La raison contractuelle « ecran non atteint » ne décrit pas la cause HTTP 403 ; elle est la valeur produite par le coureur pour les relevés absents.

## État laissé et suite nécessaire

- Supabase local et Facturo local restent lancés ; le pont H de cet essai a été arrêté.
- Chrome dédié reste ouvert. Le serveur 8080 sert toujours l'ancienne planche simulée ; il n'a pas été présenté comme un passage réel.
- Journaux hors dépôt : `/home/ubuntu/horama-a4-local/passage-h.log`, `/home/ubuntu/horama-a4-local/facturo-h.log` et `/home/ubuntu/horama-a4-local/h-quota.json`.
- Pas de nouvelle planche `2026-11-17-porte-agent-h`, pas de capture d'écran de réussite, pas de coût H mesuré, pas de navigation autonome démontrée.
- Faire vérifier par le responsable de l'organisation H les droits de création de sessions et l'accès au modèle `holo4-27b` sur l'API EU. Après résolution du refus, relancer le runner, vérifier les quatre captures et les événements, puis produire la nouvelle planche.
