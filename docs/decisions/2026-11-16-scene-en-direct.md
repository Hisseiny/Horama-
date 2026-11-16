# Changement de cap : la scène en direct

Date : 16 novembre 2026, 21 h. Décidé par Nathan à la porte de direction du couloir Nathan. **Concerne les deux couloirs.** Là où ce document contredit la spec du 16/11 (`docs/specs/2026-11-16-technique.md`), c'est lui qui fait foi.

## Pourquoi

À la porte, Nathan a vu une application à 8 onglets, une page par étape de la boucle. Son verdict : « on ne comprend pas trop où ça va », « très vibe codé ». Ce qu'il veut, et qu'il a déjà fait sur Nami (hackathon H Company des 7 et 8 novembre) : « On a un use case computer use, il faut qu'on voie l'écran bouger, il faut qu'on voie le curseur bouger, il faut qu'on voie Horama, la petite mascotte, qui clique et qui pose des questions. C'est vraiment là où on va se démarquer. »

La spec avait choisi le navigateur cloud de H, qu'on ne peut pas montrer en direct. Le navigateur **local** (l'agent H pilote un Chrome de la machine) le permet : c'est ce qui tournait sur Nami.

## Le déroulé retenu (validé par Nathan)

1. On déploie la nouvelle version du logiciel sur Vercel. Horama le détecte seul, personne ne clique sur « lancer ».
2. Le logiciel testé s'ouvre en grand dans un Chrome. La mascotte Horama arrive dessus.
3. C'est le vrai agent H qui clique. La mascotte se pose exactement là où il clique, la page réagit pour de vrai.
4. À chaque écran, Horama vérifie tout de suite : règles par le calcul, image contre la référence.
5. Quand elle doute, la mascotte change de visuel (interrogation), la zone se surligne sur la page, et elle **continue sans s'arrêter**.
6. À la fin du parcours, on repasse sur les zones surlignées (bug ou voulu), puis tout se met à jour d'un coup : décisions et documentation.

Les tests existent déjà quand l'agent arrive : ils ont été écrits depuis la documentation, en coulisses. La mascotte dit d'où vient ce qu'elle vérifie (« la doc dit : CA du mois = total des factures »).

## Ce qui change

| Sujet | Spec du 16/11 | Maintenant |
|---|---|---|
| Navigateur de l'agent | Cloud de H | Chrome local dédié, piloté par le pont `holo local browser` (port de débogage, profil à part, densité de pixels 1) |
| Sessions | Une par test, 3 en parallèle | Une seule session qui joue tout le parcours (le pont local n'en sert qu'une à la fois) |
| Capture d'un écran | Image de l'observation de H, téléchargée | Prise par nous dans ce Chrome (CDP), mascotte masquée le temps de la capture ; texte lu dans la page |
| Vérification | Après la session (`verifierPassage`) | À chaque `relever`, pendant la session (calcul et pixels : quelques millisecondes) ; la description par Holo peut arriver après |
| Ce que voit le public | Une page « passage en direct » de l'app | Le vrai logiciel, avec une couche visuelle posée dans la page : mascotte, bulle, zones surlignées |
| Question « bug ou voulu » | File de relecture | À la fin du parcours, sur les zones surlignées |
| Déclenchement | Bouton « Lancer un passage » | Un déploiement Vercel détecté |

## Ce qui ne change pas

- Les contrats `contrats-v1` : aucun champ modifié pour l'instant. Si la preuve ci-dessous montre qu'il en manque un, la demande passera par une décision à part.
- La base, le vault, le format C2, Facturo, la génération des tests, `@horama/memoire`.
- Les écrans de fin de l'app (relecture, correction de la note, rapport), qui deviennent la fin du parcours.
- Le mode cloud reste utile pour la version en ligne que le jury teste seul (un Chrome local ne s'y pilote pas) : à trancher après la preuve.

## La preuve à faire d'abord (T7, couloir Nathan, ce soir)

L'agent H joue un parcours sur Facturo dans un Chrome local ; un curseur posé dans la page suit ses clics ; nos captures (CDP) sont prises à chaque écran.

- **Tenu si**, sur 3 passages de suite : l'agent atteint les écrans demandés ; le curseur tombe sur l'élément cliqué ; deux passages donnent des captures identiques au pixel près ; la durée du parcours complet est mesurée (cible : sous 120 s).
- **Sinon** : on garde le plan cloud de la spec, et la scène est reconstituée à partir des captures de H.
- Résultat dans `docs/tests/2026-11-16-t7-navigateur-local.md`.

## Ce qu'on sait déjà de ce mode (mesuré sur Nami, 7 et 8 novembre)

- Outil : `pip install "hai-agents[cli,browser]"`, commande `holo local browser --debug-port <port> --session-id <uuid>`. Documenté en Python et en ligne de commande seulement ; l'API REST et les outils personnalisés marchent avec ce pont.
- Une nouvelle session annule la précédente ; le pont s'arrête à la fin de chaque session (le relancer en boucle) ; laisser 35 s entre deux sessions, sinon la suivante démarre sans navigateur.
- Écran Retina : lancer le Chrome de l'agent avec `--force-device-scale-factor=1`, sinon les clics tombent à coordonnées doublées.
- La fenêtre de l'agent ne doit jamais être recouverte ni réduite (`--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling`), et il lui faut un onglet ouvert au départ.
- Les clics de l'agent sont de vrais événements de souris : une couche dans la page les écoute et y déplace le curseur. La souris de l'humain doit rester hors de la fenêtre de l'agent.
- Fiabilité au panneau le 8/11 : 6 réussites sur 11 lancements (3 démarrages muets). Garder l'abandon à 45 s, une relance, et une vidéo de secours.
- Vitesse : `settle_s` à 0,5 et des consignes sans vérification inutile ont fait passer un parcours de 19 étapes de 99 s à 60 à 65 s.
- Sources : dépôt public `llecalvez-dotcom/nami`, étiquette `demo-oral-2026-11-08` (`scripts/lancer-demo.sh`, `extension/agent-overlay.js`, `lib/local-chrome.ts`, `lib/local-bridge.ts`).

## Proposition de partage, à valider par Ali

- **Couloir Ali (inchangé dans son rôle)** : définition de l'agent `horama-testeur`, création et suivi de la session, réponses aux outils, relance des sessions muettes, coût et durée, lecteur des tests C2, script de passage, écriture de `passages`, `evenements` et `captures`.
- **Couloir Nathan (nouveau)** : « la scène », c'est-à-dire le lanceur du Chrome local et du pont, la couche visuelle (mascotte, bulle, surlignage), la capture par CDP, la vérification pendant la session.
- **Point de contact proposé** : quand l'agent appelle `relever(ecran, vue)`, le coureur d'Ali appelle une fonction fournie par le couloir Nathan, qui prend la capture, vérifie, dessine ce qu'il faut sur la page, et rend la `Capture` du contrat (qu'Ali écrit en base comme prévu) et la phrase à renvoyer à l'agent. Aucun type du contrat ne change.

## Ce qui est demandé à Ali dès maintenant

1. Ne pas construire les 3 sessions en parallèle ni le téléchargement de l'image d'observation (tâche A4) avant le résultat de T7.
2. Continuer ce qui reste vrai dans les deux cas : A0, A1, A3 (lecteur des tests C2), la définition de l'agent et de ses outils.
3. Prévoir que la consigne de la session puisse enchaîner plusieurs tests dans un seul parcours.
4. Répondre à la proposition de partage dans la pull request qui apporte ce document, ou directement à Nathan.
