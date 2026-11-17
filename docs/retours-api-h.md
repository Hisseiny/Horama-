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

## A7 du 17 novembre : cinq passages réels, base partagée

Source : [preuve A7, mesures, identifiants partagés et liens publics](tests/2026-11-17-a7-fiabilite.md). Les anciennes mesures A5/Nathan ne sont pas comptées dans cet échantillon.

- Le premier essai A7 avait échoué avec HTTP 403 `explicit deny in an identity-based policy`, avant toute session. Son délai local de 1,485 s n’était pas une durée de parcours complet. Après remplacement de la référence Horama et autorisation de poursuivre, les cinq nouveaux préflights `GET /sessions/quota` renvoient HTTP 200 avec `limit=3`, `active=0`, `available=3`. Les cinq créations réelles renvoient HTTP 201 : l’accès effectif ne se déduit donc pas seulement du quota. La cause précise de l’ancien refus n’a pas été établie côté H.
- Montage : Facturo local v13, Chrome 1280 × 900/DPR 1, pont Holo et SDK `hai-agents` 1.5.1, Supabase partagé vérifié en lecture seule contre la migration avant toute écriture. Aucune migration distante. Vault externe, aucune clé de démo ni clé Nami utilisée.
- Cinq passages séquentiels `--logiciel facturo --version 13 --reference 12` : **73,012 ; 64,210 ; 66,938 ; 48,971 ; 79,595 s** ; médiane **66,938 s**, cible < 90 s atteinte sur cet échantillon. Coûts H respectifs **0,0249984 ; 0,0292960 ; 0,0295724 ; 0,0207310 ; 0,0301180 USD**, total **0,1347158 USD**. Durée C6 incluant création, outils, captures, arrêt du pont et partage ; excluant préparation, repos de 35 s, écriture Markdown finale et dernier PATCH. Les métriques répétées dans les trois tests C6 d’une session ne doivent pas être additionnées.
- Étapes : **11, 11, 13, 11, 13** ; quatre captures par passage. Les cinq sessions atteignent `completed`, les cinq passages `joue`, les 15 tests C6 `termine`. Lectures REST partagées : **5 passages, 59 événements, 20 captures** ; les 20 PNG publics répondent HTTP 200. Aucun jugement métier lancé : les rapports Markdown indiquent `INCONCLUSIVE`, pas `PASS`.
- Aucun gel > 45 s ni relance observé, une seule session par passage. L’écart maximal entre activités H observées est 10,563 s. Le gel réel, sa relance et le quota après abandon restent donc à mesurer ; aucun test négatif de production n’a été provoqué.
- `POST /sessions/{id}/share` répond HTTP 200 sur les cinq sessions et renvoie un chemin relatif `/share/api/v1/trajectories/{id}`. Résolution réelle contre `https://agp.eu.hcompany.ai`, sans restreindre le code à cet hôte. Les cinq URL sont présentes dans C6 et les Markdown. Curl anonyme de chaque lien : **HTTP 200**, code de sortie 0. GET anonyme complémentaire : `application/json`, `is_public=true`, `status=completed`. C’est une **trajectoire JSON publique**, pas un lecteur HTML vérifié visuellement ; aucune URL de lecteur n’est inventée. Liens exacts dans la preuve A7.
- Le code de replay du ticket 3.4 est déjà intégré à `dev` et n’est pas recopié par ce ticket documentaire. C6 possède déjà `tests[].replay_url` : aucun changement de contrat. Documentation : <https://hub.hcompany.ai/agents-api/sessions/share.md> ; méthode SDK `share_session`.

## Limites restantes

Références v12 et comparaison calculée v12/v13, relance après gel réel, quota après abandon et lecteur visuel restent à vérifier. Les cinq passages locaux ne garantissent ni latence future ni droit de création pour une autre clé/organisation. Aucun résultat `SUSPECTED` ou `INCONCLUSIVE` ne compte comme réussite. La présence d’un replay public prouve l’accès HTTP à la trajectoire, pas la conformité métier ou la permanence du lien.
