# Retours de l’API H

## Essai Ali du 17 novembre 2026

Source : [preuve du passage refusé](tests/2026-11-17-passage-agent-h.md).

- `GET /sessions/quota` : HTTP 200, `{"scope":"org","limit":3,"active":0,"available":3}`.
- `POST /sessions` : HTTP 403. Message exact communiqué ensuite par l’utilisateur : `Only enterprise organizations can start sessions and trajectories.` Le corps n’avait pas été conservé par le runner.
- Le pont local H était prêt. Aucun identifiant de session, capture ou événement créé. Le passage est en échec ; coût inconnu. Trois places disponibles ne prouvent pas le droit de créer une session.
- Aucun nouvel essai avec la clé Nami. Les passages réels attendent la clé Horama ; aucune clé de démo utilisée.

## Mesures antérieures de l’équipe, 7 et 8 novembre

Faits rapportés dans [`AGENTS.md`](../AGENTS.md), section « Ce qu’on sait déjà de l’API H ». Ils ne sont pas remesurés ici et ne garantissent pas les droits actuels de chaque organisation.

- Trois sessions simultanées par organisation dans l’offre alors observée. Au-delà, attente ; `queue: false` demande un refus immédiat.
- Sessions figées dès la première étape ; suppression parfois sans effet. Abandon après 45 secondes sans réponse, une relance, puis non concluant.
- Huit à dix secondes par étape observées à l’époque, pas une garantie de latence.
- Après un résultat d’outil personnalisé, pas de nouvelle capture automatique : demander `wait_web`.
- Pas d’action « capture d’écran », pas de captcha géré.
- `answer_format` impose un JSON Schema ; une réponse non conforme fait échouer la session.
- Suivi par `GET /sessions/{id}/changes?from_index=N&wait_for_seconds=20`. HTTP 204 : rien de neuf ; la réponse finale peut suivre l’état terminal.
- Chrome Retina : `--force-device-scale-factor=1`, sinon les clics sont décalés.

## Preuve de Nathan sur Facturo v13

[T7 du 16 novembre](tests/2026-11-16-t7-navigateur-local.md), disponible sur `dev` : trois passages H, quatre relevés par passage, 1280 × 900, DPR 1. Durées rapportées : 45,2 s, 59,4 s et 70,5 s ; coûts : 0,0316 $, 0,0323 $ et 0,0273 $. Ce montage est celui de Nathan, pas une validation réelle du coureur Ali.

## A6/A7 du 17 novembre : Facturo en ligne et Supabase partagé

Source : [preuve en ligne, routes curl, passages, coûts et replays](tests/2026-11-17-a7-facturo-en-ligne.md). Échantillon indépendant des essais locaux de la PR 13, qui reste séparée.

- Les routes `/v12` et `/v13` attendues sont accessibles sur `https://facturo-demo.vercel.app`, y compris `/factures/F-119` et le filtre v13. Curl doit conserver les cookies en mémoire (`--cookie ''`) après `/vXX/entrer?suite=…` ; sinon la redirection vers `/login` ne signifie pas une incompatibilité du déploiement. Ce comportement existe aussi en local.
- Six préflights quota HTTP 200 (`limit=3`, `active=0`, `available=3`), six créations réelles HTTP 201 avec la référence Horama autorisée. Les anciens refus restent historiques, pas l’état de ces essais. Aucune clé de démo ou de Nami utilisée.
- A6 réel `--version 12 --reference 12` : deux tests compatibles, trois captures uniques en 1280 × 900 ; filtre v13 exclu. Durée C6 43,355 s, commande complète 44,575 s, coût 0,0144588 USD. Captures prêtes à être désignées par Nathan, sans promotion automatique en références.
- Cinq v13 en ligne : durées C6 **73,777 ; 44,048 ; 73,712 ; 55,027 ; 66,517 s**, médiane **66,517 s**. Médiane des commandes complètes jusqu’à leur sortie : **67,786 s**. Cible < 90 s atteinte ; coût H total v13 **0,1455548 USD**. Les durées C6 excluent le dernier PATCH et l’écriture Markdown finale ; les durées de commande les incluent. Préflight et repos de 35 s exclus des deux.
- Les six sessions terminent `completed`, passages `joue`. REST partagé : **6 passages, 70 événements, 23 captures**, dont 5/63/20 pour v13. Les URL des 23 relevés sont en ligne, pas localhost ; les PNG publics donnent HTTP 200. Aucun jugement métier exécuté : aucun `PASS` revendiqué.
- Six partages HTTP 200 ; six liens C6/Markdown vérifiés par curl anonyme HTTP 200, sortie 0. Les ressources sont des trajectoires `application/json`, `is_public=true`, pas un lecteur HTML vérifié visuellement. Liens exacts dans la preuve ; aucun changement de contrat.
- Aucun gel > 45 s ni relance observé ; plus grand écart entre activités observées 9,964 s. Le quota après abandon et la récupération d’un gel restent à mesurer, sans provoquer d’incident sur le service partagé.

## À vérifier encore

Désignation des références v12 par Nathan, comparaison métier calculée v12/v13, relance après gel réel, quota après abandon, lecteur visuel et validation humaine de la porte. Les mesures ne garantissent ni latence future ni autorisations pour une autre clé/organisation. `INCONCLUSIVE` et `SUSPECTED` ne comptent jamais comme réussites.
