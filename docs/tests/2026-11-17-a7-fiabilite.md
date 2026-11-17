# A7 : fiabilité et replay public — mesures bloquées

Branche `a7-fiabilite`, créée depuis `origin/dev` à jour (`a22f812001881504f1b0305464e4734b9f4e8aef`). Aucun chiffre des trois passages A5 n’est réutilisé comme mesure A7.

## Montage et commandes

- `pnpm --filter @horama/faux-saas dev` : Facturo v13 prêt sur `http://localhost:3100`.
- SDK déjà installé : `/home/ubuntu/.venvs/holo/bin/python -m pip show hai-agents` indique version `1.5.1`. Pont `/home/ubuntu/.venvs/holo/bin/holo`.
- `supabase init --workdir /home/ubuntu/horama-a7-local`, puis `supabase start --workdir /home/ubuntu/horama-a7-local -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,mailpit` : base, API, authentification et stockage locaux prêts.
- `docker exec -i supabase_db_horama-a7-local psql -U postgres -d postgres -v ON_ERROR_STOP=1 < base/migrations/001_init.sql` : migration appliquée sans modification, sept tables créées et bucket captures inséré.
- Chrome dédié sur CDP 9333, profil `/home/ubuntu/horama-a7-local/chrome-profile`, avec `--force-device-scale-factor=1`, `--force-color-profile=srgb`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding` et `--disable-background-timer-throttling`. Connexion CDP et `fitViewport` du couloir scène : `Viewport : { largeur: 1280, hauteur: 900, densite: 1 }`.
- Avertissements D-Bus au premier lancement de Chrome : diagnostic de l’environnement, puis relancement avec `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus`. Reste un service NetworkManager absent, sans effet observé sur la mesure CDP ; aucune session H n’a pu être lancée pour vérifier davantage.
- Copie du vault par `cpSync('vault-horama', '/home/ubuntu/horama-a7-local/vault', {recursive:true})`. Les rapports restent hors dépôt.

La clé Horama est liée uniquement à l’environnement exec via `HAI_API_KEY` avec la référence `secret:session:HAI_API_KEY_HORAMA`. Aucune valeur de clé affichée ou écrite ; aucune utilisation de la clé Nami ou de la clé de démo. Les identifiants Supabase locaux sont lus en mémoire depuis `supabase status -o json`, jamais affichés par le wrapper.

Wrapper hors dépôt : `/home/ubuntu/horama-a7-local/run-a7.mjs`. Il lance réellement :

```sh
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --vault /home/ubuntu/horama-a7-local/vault
```

Variables de montage : `FAUX_SAAS_URL=http://localhost:3100`, `HOLO_BIN=/home/ubuntu/.venvs/holo/bin/holo`, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` du projet local. Le préchargement externe `trace-h.mjs` journalise seulement la méthode, le chemin et le statut HTTP de H ; les corps d’erreur sont expurgés de la valeur de clé. Aucun corps de requête ni en-tête d’autorisation n’est journalisé.

## Refus réel et arrêt des essais

Sonde préalable :

```text
GET /sessions/quota HTTP 403
{"message":"User is not authorized to access this resource with an explicit deny in an identity-based policy"}
```

Pour vérifier si ce refus ne concernait que le quota, un seul lancement réel du passage a été effectué. Sortie, conservée dans `/home/ubuntu/horama-a7-local/run-1.log` :

```text
$ node passage.ts -- --logiciel facturo --version 13 --reference 12 --vault /home/ubuntu/horama-a7-local/vault
H POST /api/v2/sessions HTTP 403
{"message":"User is not authorized to access this resource with an explicit deny in an identity-based policy"}
Passage impossible : vérifier les arguments (--help), les clés serveur, Supabase, le vault, Chrome et le pont H.
[ELIFECYCLE] Command failed with exit code 1.
```

Le refus de création est donc observé dans le chemin réel, pas déduit de la sonde quota. La cause précise du refus côté autorisations H est inconnue. Ne pas l’assimiler au refus « enterprise » historique. Les quatre autres essais ne sont pas lancés : ils ne permettraient pas de mesurer un parcours tant que cette autorisation n’est pas rétablie.

## Tableau des cinq essais prévus

| Essai | Passage local / session H | État | Durée du parcours complet (s) | Coût (USD) | Étapes | Captures | Gel > 45 s / relance | Replay / HTTP public |
|---|---|---|---|---|---|---|---|---|
| 1 | `2026-11-17-11h21-36bb` / aucune session créée | échec de création HTTP 403 | à mesurer | à mesurer | 0 | 0 | non observable, aucune session ; aucune relance | aucun lien, non vérifiable |
| 2 | non lancé | bloqué par l’autorisation | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |
| 3 | non lancé | bloqué par l’autorisation | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |
| 4 | non lancé | bloqué par l’autorisation | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |
| 5 | non lancé | bloqué par l’autorisation | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |

Lecture directe de Supabase par `docker exec … psql` : passage `echec`, `duree_s=1.485`, `cout_usd=null`, zéro capture et zéro événement. Les trois tests C6 sont `non_concluant`, `session_id` vide et zéro étape. **1,485 s est le temps de traitement de cet échec local, pas une durée de passage complet.** Aucun coût nul n’est déduit de l’absence de métrique. Rapport Markdown externe : `/home/ubuntu/horama-a7-local/vault/facturo/passages/2026-11-17-11h21-36bb.md`.

Médiane sur cinq passages : **à mesurer**. Cible < 90 s : **non évaluée**, pas un dépassement mesuré. Durée et coût d’un passage complet : **à mesurer**. Aucun résultat `PASS` revendiqué.

## API de partage et implémentation

Source consultée : <https://hub.hcompany.ai/agents-api/sessions/share.md>. SDK installé : `hai_agents/sessions/raw_client.py`, méthode `share_session`, confirme un `POST api/v2/sessions/{id}/share`. Réponse documentée : `{"share_url":"/share/api/v1/trajectories/{id}"}`, chemin relatif à l’hôte API régional et accessible sans clé.

C6 possède déjà `tests[].replay_url?: string` dans `contrats/types.ts` : aucun champ manquant ni changement de contrat.

`agent/src/session.ts` appelle ce POST après le suivi et l’arrêt du pont, normalise le lien sur `https://agp.eu.hcompany.ai` et le retourne dans `ResultatSession.replay_url`. Le coureur propage déjà ce champ aux trois tests de la session unique et le lecteur mémoire l’écrit dans le Markdown. Les métriques de session répétées par test ne doivent pas être additionnées.

Un partage HTTP/réseau en échec, une réponse vide ou un lien invalide produisent un avertissement explicite et aucun lien ; ils ne réécrivent pas l’état d’exécution d’une session. C’est une métadonnée optionnelle du rapport, pas une preuve de conformité métier. Les tests couvrent les URL relatives et absolues, les réponses nulles/vides, les schémas/hôtes refusés, HTTP 404, erreur réseau, absence de fuite de clé et propagation aux trois tests C6/Markdown.

**Aucun POST de partage réel ni contrôle curl des cinq liens n’a pu être fait : la création de session est refusée.** La validité réelle des liens et la fiabilité du parcours restent à vérifier après rétablissement des droits de la référence Horama fournie.

## Vérifications locales

`pnpm --filter @horama/agent check` :

```text
# tests 47
# pass 47
# fail 0
```

`pnpm install && pnpm -r check`, code 0 ; sortie conservée dans `/home/ubuntu/horama-a7-local/workspace-check.log` :

```text
Scope: all 7 workspace projects
Already up to date
Done in 18ms using pnpm v12.18.0
contrats check: Done
faux-saas check: # pass 7
faux-saas check: # fail 0
memoire check: # pass 28
memoire check: # fail 0
jugement check: # pass 12
jugement check: # fail 0
interface check: # pass 8
interface check: # fail 0
agent check: # pass 47
agent check: # fail 0
agent check: Done
```

Cette branche part de `dev` sans reprendre l’outillage de la branche 1.4 : aucun lint dédié n’y est encore intégré. Aucun rapport dans le vault du dépôt, aucun contrat modifié, aucun accès au banc. Aucun contrôle visuel de parcours possible en l’absence de session H. La ligne 3.4 est marquée bloquée, pas terminée ; la répétition de démo 5.8 reste à faire.
