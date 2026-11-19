# Feuille de route d'Horama

> **Archive du 19/11 : à jour jusqu'à cette date ; l'état actuel est dans le [README](../README.md).**

Mise à jour le mercredi 18 novembre 2026 au matin, après le recadrage de Nathan ([décision](decisions/2026-11-18-recadrage-grand-public-et-dev.md)) ; vocabulaire aligné le 19/11 sur le produit unique ([décision](decisions/2026-11-19-un-seul-produit.md)). Ce document répond aussi au livrable du brief « roadmap jusqu'à jeudi ». Chaque ligne a son issue GitHub : c'est là que se suivent l'avancement et les preuves.

## Le cap en trois phrases

1. **Votre documentation devient vos tests. Sans documentation, Horama regarde quand même.**
2. **Un produit, deux entrées.** **Par une adresse** : on donne l'adresse de n'importe quel site (extension Chrome ou page d'accueil) ; l'agent H le parcourt et trouve ce que personne n'a vu (lien mort, texte coupé, image cassée), prouvé par le code. **Par une PR, avec la documentation et GitHub** : déploiement Vercel → GitHub → Obsidian → l'agent travaille → il réécrit dans Obsidian où sont les erreurs → non-régression contre le code → PR sur GitHub.
3. **Pendant le parcours, on ne voit que le curseur qui clique, la mascotte et un trait à la main sur ce qui cloche** ; tout le texte arrive au récapitulatif, où l'humain tranche.

## Ce qui est prouvé au 18/11 au matin

- Le moteur de l'entrée par une PR sur le site d'Eugenia en ligne : 3 tours sur 3, 21 règles PASS, 0 pixel d'écart ([preuve](tests/2026-11-17-tour-du-site-reel.md)).
- Le moteur de l'entrée par une adresse, à un agent (#64) : 15 pages visitées par H, et **deux vrais défauts** trouvés sur eugeniaschool.com (lien « portes ouvertes » en 404, chapô d'article coupé) ; 6 faux constats sur 8, tous venus de Holo, réduits par #66.
- La boucle de l'entrée par une PR en local : réveil sur commit, choix des tests, scène, décision, correction de note, PR de documentation.

## D'ici vendredi

### Mercredi 18 (aujourd'hui)

| Quoi | Qui | Issue |
|---|---|---|
| Rendu de 17 h : parcours utilisateur, architecture, Loom 2 min, cette feuille de route | Noé, Axil | #73 |
| Notes du vault d'Eugenia (7 pages recopiées du site, chiffres répétés), puis génération des tests | Axil, Noé, puis Leslie | #72 |
| Entrée par une adresse sur n'importe quel site : corrections de #63, filtre #66, banc de 7 sites dont les 4 de Nathan | Ali | #67 |
| Architecture de l'extension et du service que le jury essaie seul : à trancher | Nathan, Ali | #68 |
| Scène épurée : le squelette (curseur, mascotte, trait à la main ; texte au récapitulatif) | Couloir Nathan | #69 |
| Direction artistique : squelette validé, puis récapitulatif, puis couleurs et mascotte (méthode `/taste`) | Nathan | #69, #70 |

### Jeudi 19

| Quoi | Qui | Issue |
|---|---|---|
| Service en ligne de l'entrée par une adresse, puis extension Chrome | Ali (service), couloir Nathan (extension) | #68 |
| Page d'accueil Horama | Couloir Nathan | #70 |
| Entrée par une PR de bout en bout : réveil par Vercel, rapport dans Obsidian, commentaire sur la PR GitHub | Ali, couloir Nathan | #71 |
| Direction artistique appliquée à la scène, à l'extension, à la page d'accueil | Nathan | #69, #70 |
| Point business (CEO) | Noé | |

### Vendredi 20

| Quand | Quoi |
|---|---|
| Avant 11 h | Prototype en live ; fiche et dépôt (problème, solution, stack, architecture, lien, « comment tester ») ; vidéo de démo de 5 min. Contrôle en fenêtre privée de tous les liens, extension installée depuis zéro sur une machine propre |
| Avant 15 h | Deck de 8 à 12 slides |
| Après-midi | Pitch de 6 min et 4 min de questions |

## Ce qui reste en suspens

| Sujet | Ce qui manque | Qui tranche |
|---|---|---|
| Fork du site d'Eugenia (entrée par une PR sur le vrai code) | La réponse de l'école ([demandes](decisions/2026-11-17-fork-eugenia.md)) | L'école, puis Nathan pour la cible de repli |
| Montrer les deux défauts du site d'Eugenia au jury | Prévenir l'école avant | Nathan |
| Trois agents en parallèle (#57, étape 3) | L'exploration à un agent stable sur le banc (#67) | Ali, si le temps le permet |

## Après le hackathon (slide de feuille de route)

- L'entrée « message d'un client » : le support transmet un signalement, Horama le reproduit et en fait un test.
- Devin corrige le code, puis Horama rejoue.
- Les sources de documentation : Confluence, Notion, Google Docs, PDF, centre d'aide.
- Les sorties : GitLab, Jira, Linear, en plus de GitHub.
- L'accessibilité mesurée (#55, en pause depuis le 18/11).
- La notification par n8n.
- Le mobile ; plusieurs comptes de test aux droits différents.
