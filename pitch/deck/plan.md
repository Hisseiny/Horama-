# Deck du vendredi 20/11 : plan des slides

Tâche 4.11 (Noé et Axil). À rendre avant 15 h vendredi, 8 à 12 slides. Ordre imposé par le brief : problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run (`docs/cadrage.md`, section 1).

Ce fichier est le squelette : le message de chaque slide, ce qu'on y montre, la source. Axil fait le design. Une valeur non mesurée est écrite « à mesurer » ; aucun chiffre de Troov n'est donné.

## Les slides

| N° | Partie | Titre (le message) | Ce qu'on montre | Source |
|---|---|---|---|---|
| 1 | Titre | Horama. « Votre documentation devient vos tests. Sans documentation, Horama regarde quand même. » | Logo, mascotte, équipe 11 | README |
| 2 | Problème | Ils livrent vite, personne ne vérifie derrière | Les deux cibles prioritaires : le CTO d'un SaaS (Troov : une dizaine de développeurs, une mise en production par semaine, pas de tests de non-régression) et le marketeur qui vibe-code le site de son entreprise (le cas Eugenia : pas le temps de tout relire) | `pitch/business-model.md` ; `pitch/persona-*.md` |
| 3 | Problème | Une amélioration ici, une régression là | L'exemple du bouton d'export PDF chez Troov : amélioré sur une page, dégradé sur les autres, que personne n'a revérifiées. Et sur le site d'Eugenia : un lien de l'article « Fin de Parcoursup » mène à une page 404 | `pitch/persona-cto-troov.md` ; `docs/tests/2026-11-18-mode-visuel.md` |
| 4 | Solution | Un agent qui visite comme un humain, du code qui prouve, un humain qui tranche | Les trois temps : l'agent H clique et défile ; le code vérifie (lien mort, texte qui déborde, règles entre pages, écart d'image) ; l'humain répond « bug ou voulu », et Horama s'en souvient | README, « Un produit, deux entrées » |
| 5 | Solution | Un produit, du site vibe-codé au SaaS | Un seul produit : une adresse suffit pour commencer ; avec la documentation, elle devient des tests rejoués à chaque PR. Ce qu'on ajoute à la démo QA de H : qui écrit les tests, la preuve, la mémoire | README ; `docs/cadrage.md`, section 3 ; `pitch/business-model.md` |
| 6 | Démo | Démo en direct (ou vidéo de secours) | Le passage depuis l'article d'Eugenia : le 404 entouré, les pages cliquées, le récapitulatif, « bug ou voulu ». Puis le site traduit en allemand : la PR #16 du clone, 3 défauts prouvés dont « texte non traduit » sur `/ecole` | `pitch/loom-mercredi.md` ; `docs/tests/2026-11-19-langue-et-lecture.md` |
| 7 | Business model | On paie au passage, avec un forfait | Trois paliers : Gratuit (3 passages par mois), Solo à 49 € par mois (100 passages, pour le marketeur), Équipe à 199 € par mois (200 passages, PR GitHub et doc synchronisée, pour le CTO). Passage en plus : 0,40 à 0,50 €. Marge sur le run si tous les passages sont consommés : environ 49 % (Solo) et 75 % (Équipe) à 0,25 $ par passage, 39 % et 70 % au pire cas mesuré (0,30 $). Avis favorable du CTO de Troov sur la grille | `pitch/business-model.md` |
| 8 | Go-to-market | L'extension gratuite fait entrer, le besoin de régularité fait payer | L'extension Chrome gratuite → un vrai défaut prouvé sur son propre site → Solo (un contrôle après chaque publication) → Équipe (la réponse sur la PR, la doc comme source des tests) | `pitch/business-model.md` |
| 9 | Architecture | Ce qui tourne aujourd'hui | Le schéma du README : extension → service → agent H et Chrome → contrôles et Holo → récapitulatif → mémoire ; par une PR : PR → Vercel → tests touchés → commentaire sur la PR. Marquer ce qui est fait et ce qui est prévu | README (Ali) |
| 10 | Limites et roadmap | Ce qu'on sait, ce qu'on ne sait pas encore | Limites : les doutes de l'IA sont souvent faux (2 sur 3 à la répétition du 18/11), ils restent donc des doutes ; un seul agent ; pas encore prouvé sur n'importe quel site. Roadmap : plusieurs agents en parallèle, Confluence et Notion comme sources, Jira et Linear comme sorties, Devin qui corrige le code ; canaux d'acquisition au-delà de l'extension (intégrations Lovable, v0 et Vercel, commentaire de PR GitHub, réseau Troov) | README, « Évolutions prévues » ; `docs/feuille-de-route.md` ; `pitch/business-model.md` |
| 11 | Coût de run | Environ 25 centimes par passage complet | Passage complet de 8 pages par clic : 0,2174 $ (PR #16 du clone, 343 s) à 0,2680 $ (434,5 s) ; passage court de 15 pages par adresse : environ 0,07 $. Un passage interrompu : jusqu'à 0,54 $. Railway et tout un site en production : à mesurer | `pitch/business-model.md` ; `docs/tests/2026-11-19-langue-et-lecture.md`, `docs/tests/2026-11-19-texte-non-traduit.md`, `docs/tests/2026-11-18-mode-visuel.md` |
| 12 | Fin | Testez votre site | Le lien de l'extension ou du service, le dépôt GitHub, l'équipe | À compléter vendredi |

## Ce qui manque pour remplir le deck

| Quoi | Qui | Pour quelle slide |
|---|---|---|
| Le fichier du deck lui-même (design) | Axil | toutes |
| Les captures de la PR #16 en allemand (commentaire d'Horama, défaut sur `/ecole`) | À attribuer | 6 |
| Le choix entre démo en direct et vidéo, et la vidéo de secours | Nathan (#132) | 6 |
| Les chiffres du banc de 5 sites (#208) | Ali, Léon | 10 |
| Le coût Railway par mois | Ali (#208) | 11 |
| Les noms de l'équipe et le lien final | Noé | 1 et 12 |

Déjà disponible : la charte « L'envoyé » (`docs/da/charte-graphique.md`, `docs/da/envoye.css`), le logo (`docs/da/images/logo.png`), la mascotte (`docs/da/mascotte/`), le modèle de slide 1920 × 1080 et l'export PDF (`pitch/rendu-jeudi/`), la capture du 404 (`accueil/img/eugenia-blog-404.jpg`), le lien public https://horama-gold.vercel.app/.
