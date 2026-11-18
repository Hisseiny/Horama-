# Deck du vendredi 20/11 : plan des slides

Tâche 4.11 (Noé et Axil). À rendre avant 15 h vendredi, 8 à 12 slides. Ordre imposé par le brief : problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run (`docs/cadrage.md`, section 1).

Ce fichier est le squelette : le message de chaque slide, ce qu'on y montre, la source. Axil fait le design. Une valeur non mesurée est écrite « à mesurer » ; aucun chiffre de Troov n'est donné.

## Les slides

| N° | Partie | Titre (le message) | Ce qu'on montre | Source |
|---|---|---|---|---|
| 1 | Titre | Horama. « Votre documentation devient vos tests. Sans documentation, Horama regarde quand même. » | Logo, mascotte, équipe 11 | README |
| 2 | Problème | Les défauts restent en ligne jusqu'à ce qu'un client tombe dessus | Les deux personae : la responsable du site d'Eugenia (pas le temps de tout relire) et le CTO de Troov (une dizaine de développeurs, une mise en production par semaine, pas de tests de non-régression) | `pitch/persona-*.md` |
| 3 | Problème | Une amélioration ici, une régression là | L'exemple du bouton d'export PDF chez Troov : amélioré sur une page, dégradé sur les autres, que personne n'a revérifiées. Et sur le site d'Eugenia : un lien de l'article « Fin de Parcoursup » mène à une page 404 | `pitch/persona-cto-troov.md` ; `docs/tests/2026-11-18-mode-visuel.md` |
| 4 | Solution | Un agent qui visite comme un humain, du code qui prouve, un humain qui tranche | Les trois temps : l'agent H clique et défile ; le code vérifie (lien mort, texte qui déborde, règles entre pages, écart d'image) ; l'humain répond « bug ou voulu », et Horama s'en souvient | README, « Deux modes » |
| 5 | Solution | Deux modes, une même boucle | Grand public : une adresse, aucune documentation. Développeur : la documentation devient des tests, rejoués à chaque PR. Ce qu'on ajoute à la démo QA de H : qui écrit les tests, la preuve, la mémoire | README ; `docs/cadrage.md`, section 3 |
| 6 | Démo | Démo en direct (ou vidéo de secours) | Le passage depuis l'article d'Eugenia : le 404 entouré, les pages cliquées, le récapitulatif, « bug ou voulu ». Si le test en allemand est fait : ce qui casse sur le site traduit | `pitch/loom-mercredi.md` ; test en allemand : à mesurer |
| 7 | Business model | Un abonnement par site ou par application | Essai gratuit en mode grand public (une adresse, quelques pages), puis abonnement avec un nombre de passages inclus, au-dessus du coût de run. Prix : à fixer | `docs/cadrage.md`, section 16 |
| 8 | Go-to-market | Le mode grand public fait entrer, le mode développeur fait payer | 1. L'extension Chrome gratuite : n'importe qui teste son site. 2. Les équipes SaaS sans QA, à partir de notre réseau (Troov). 3. Là où vivent les livraisons : PR GitHub, prévisualisation Vercel | README ; `docs/cadrage.md`, section 16 |
| 9 | Architecture | Ce qui tourne aujourd'hui | Le schéma du README : extension → service → agent H et Chrome → contrôles et Holo → récapitulatif → mémoire ; en mode dev : PR → Vercel → tests touchés → commentaire sur la PR. Marquer ce qui est fait et ce qui est prévu | README (Ali) |
| 10 | Limites et roadmap | Ce qu'on sait, ce qu'on ne sait pas encore | Limites : les doutes de l'IA sont souvent faux (2 sur 3 à la répétition du 18/11), ils restent donc des doutes ; un seul agent ; pas encore prouvé sur n'importe quel site. Roadmap : plusieurs agents en parallèle, Confluence et Notion comme sources, Jira et Linear comme sorties, Devin qui corrige le code | README, « Évolutions prévues » ; `docs/feuille-de-route.md` |
| 11 | Coût de run | Une dizaine de centimes par passage | Mesuré sur eugeniaschool.com : 8 pages dont 4 par clic, 211,6 s, 0,1030 $ ; 15 pages par adresse, 174 à 237 s, environ 0,07 $. Tout un site en production : à mesurer | `docs/tests/2026-11-18-a91-visite.md`, `docs/tests/2026-11-18-mode-visuel.md` |
| 12 | Fin | Testez votre site | Le lien de l'extension ou du service, le dépôt GitHub, l'équipe | À compléter vendredi |

## Ce qui manque pour remplir le deck

| Quoi | Qui | Pour quelle slide |
|---|---|---|
| Le prix (essai, abonnement) | Noé et Axil, avec Nathan | 7 |
| Le test du site traduit en allemand, mesuré | À attribuer | 6 et 10 |
| Un avis écrit du CTO de Troov (« l'utiliseriez-vous ? ») | Noé | 2 ou 8, si on l'a ; sinon rien |
| Le lien public de l'extension ou du service | Ali, Nathan (#68) | 12 |
| Les chiffres du banc de sites (#67) | Ali, Inès | 10 |
| La direction artistique (palette grecque, mascotte) | Axil, Inès (#98, #116) | toutes |
