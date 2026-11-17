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

## A7 du 17 novembre : replay implémenté, mesures bloquées

Source : [preuve A7 et commande réelle](tests/2026-11-17-a7-fiabilite.md). La [preuve A5](tests/2026-11-17-a5-trois-passages-agent-h.md) documente déjà trois passages réels avec une clé Horama ; elle ne constitue pas les cinq essais demandés ici.

- Avec la référence Horama fournie pour A7, liée uniquement à `HAI_API_KEY` dans l’environnement du processus, `GET /sessions/quota` et la création réelle `POST /sessions` renvoient HTTP 403 : `{"message":"User is not authorized to access this resource with an explicit deny in an identity-based policy"}`. Aucun recours à la clé Nami ni à la clé de démo. Ce refus n’est pas le message « enterprise » de l’essai antérieur ; sa cause précise côté autorisation n’est pas vérifiée.
- La commande de passage échoue avant toute session H : zéro étape, zéro capture, aucune session figée ou relancée à observer. Le passage local d’échec dure 1,485 s et son coût est inconnu ; ce n’est pas la durée d’un parcours complet. Arrêt après ce refus de création, sans quatre tentatives supplémentaires identiques.
- Montage recréé : Facturo local v13, Supabase local avec la migration gelée, Chrome 1280 × 900 et DPR 1, SDK `hai-agents` 1.5.1. Vault de travail externe : aucun rapport écrit dans le vault du dépôt.
- Documentation et SDK concordent : `POST /sessions/{id}/share` rend `share_url`, relatif à l’hôte API régional. C6 possède déjà `tests[].replay_url` : aucun changement de contrat nécessaire. L’agent crée désormais ce lien après le suivi de session, le normalise sur `https://agp.eu.hcompany.ai` et le transmet à chaque test de la session partagée. En cas de lien absent, invalide ou de refus réseau/HTTP, avertissement explicite et aucun lien inventé ; l’état d’exécution n’est pas transformé en échec pour ce seul manque optionnel de replay.
- Tests automatiques : 47/47 pour agent, dont partage relatif/absolu, réponse vide, lien invalide, HTTP 404, erreur réseau sans fuite de clé et propagation aux trois tests C6 ainsi qu’au Markdown. Aucun lien réel disponible pour une vérification curl.

## À mesurer

Cinq passages A7, leur médiane (cible < 90 s), coût complet, gels et relances observés, ouverture HTTP des cinq liens publics ; références v12 et quota après abandon restent également à mesurer. Déblocage nécessaire : autoriser la référence Horama fournie sur l’API Agents. Aucune extrapolation des anciens passages ou des tests injectés.
