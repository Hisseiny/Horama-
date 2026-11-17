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

## À mesurer

Trois passages réels du coureur Ali, références v12, quota après abandon, replay public, durée médiane sur cinq essais et coût complet. Aucune extrapolation depuis les tests injectés.
