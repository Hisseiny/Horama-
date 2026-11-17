# Demandes du couloir Nathan au coureur, après la jonction (J1)

Date : 17 novembre 2026. Concerne `agent/` (couloir Ali). Aucune n'est bloquante : la scène tourne avec le coureur tel qu'il est sur `dev` (a83067c). Aucun contrat ne change.

## Ce qui a été mesuré

La scène (`automatisation/scene/parcours.mjs`) appelle maintenant `creerCoureur` en direct, avec son crochet `relever` et `h.navigateur` (design de J1, décision de Nathan : on ne passe pas par la CLI de la PR #17). Parcours réel `2026-11-17-14h51-7b0a` sur https://facturo-demo.vercel.app, v13, 3 tests :

- en base : passage `joue`, 14 événements, 4 captures 1280 × 900, 3 lignes `resultats` (`ca-du-mois-egal-total` `VERIFIED_FAIL`, `detail-facture-total-egal-liste` `SUSPECTED`, `liste-factures-filtre-echeance` `VERIFIED_FAIL`) ;
- 133,8 s, 0,0332 $, aucune relance, replay rendu ;
- 5 clics de l'agent, chacun sur l'élément attendu (Factures, F-119, Retour aux factures, Filtrer, Échéance dépassée) : aucun clic doublé.

## Demandes

1. **`settle_s` réglable par l'appelant** (`creerSessionH`, par exemple `h.settle_s`, 0,5 par défaut). La scène retient chaque clic de l'agent le temps que le curseur arrive : 659 à 922 ms mesurés. À 0,5 s, l'observation que H reçoit après un clic est sans doute prise avant que la page réagisse. Sur le parcours mesuré, l'agent n'a pas recliqué : priorité basse, mais la scène tournait à 1,0 avant la jonction.
2. **La raison d'un échec dans le rapport** : `ResultatSession.erreur` ne passe pas dans `RapportPassage` ; la scène sait que le passage est en échec, pas pourquoi (seulement `raison` par test).
3. **Phrase rendue pour un relevé déjà pris** : le coureur renvoie la phrase d'origine (« Relevé pris. Relevé suivant : X »), qui peut être périmée. Proposition : « Déjà relevé. » suivi du prochain relevé encore à prendre.
4. Le README du coureur dit « Le port H ne crée pas de lien de partage », alors que `session.ts` appelle `POST /sessions/{id}/share` et que le replay est bien rendu.

Retirée : l'annulation de la session H sur Ctrl+C de la scène est couverte par la PR #22 (option `signal` de `creerCoureur`, `DELETE /sessions/{id}`), fusionnée dans `dev` le 17/11.

Pour info, sans demande : la zone de page est désormais imposée par `Emulation.setDeviceMetricsOverride` dans `fitViewport` (`automatisation/scene/scene.mjs`), que `agent/src/browser.ts` appelle aussi ; elle tient tant que la connexion CDP qui l'a posée reste ouverte.
