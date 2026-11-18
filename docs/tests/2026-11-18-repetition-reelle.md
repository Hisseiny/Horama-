# Répétition réelle du mode grand public dans la scène, 18 novembre 2026, 11 h 45

Couloir Nathan. **Premier passage avec l'agent H et Holo de `automatisation/scene/exploration.mjs`.** Lancé sur le go de Nathan, tapé dans la session de l'orchestrateur. Code de `dev` fec4753 (PR #89 comprise).

## Ce qui a été lancé

```
bash automatisation/demo/passage-reel.sh
```

- Vérification d'avant-départ (`automatisation/demo/avant-depart.mjs`, sans coût) : « Prêt », 0 session H en cours pour l'organisation, pont holo présent, écran 2560 × 1440.
- Puis la scène, avec H et Holo, depuis https://www.eugeniaschool.com/blog/fin-de-parcoursup-ce-qui-change-premiere-terminale, 15 pages au plus, base en mémoire, sur une copie du vault (`.orchestrateur/demo/2026-11-18-11h45/`, hors Git).
- Les trois questions de la fin ont été tranchées par Nathan, à la souris.

## Ce qui en est sorti

- Code 0. 262 s de bout en bout, dont 235,4 s d'exploration. Coût rendu : **0,0827 $**. Une session H, état « fini », [replay](https://agp.eu.hcompany.ai/share/api/v1/trajectories/49596382-066a-4d9c-baa4-ac0714ca638c).
- 15 pages trouvées par le plan du site, 15 visitées : l'article en premier, puis `/`, `/programme/bachelor-ia-business`, `/notre-adn`, `/entreprises-partenaires`, `/processus-admission`, `/evenements`, `/tech-hub`, `/certification-architecte-ia`, `/carrieres`, `/recruter-nos-etudiants`, `/faq`, `/presse`, `/programme/master-ia-business-alternance`, `/campus/paris`. Écartées : autre domaine (41), pdf (1), au-delà du plafond (82), « section-limit » (1).

| Constat | Source | Relu à la main | Décision de Nathan |
|---|---|---|---|
| Lien « journée portes ouvertes » de l'article : HTTP 404 (`/evenements/journee-portes-ouvertes-14-nov`) | contrôle, prouvé | **vrai** | bug |
| Accueil : « Le texte du badge "Campus de Paris" est coupé à droite » | Holo, doute | **faux** : le badge « // CAMPUS DE PARIS · 10E » est entier (même faux constat que le 17/11) | voulu |
| Master : « texte en arrière-plan partiellement masqué par la photo » | Holo, doute | **faux** : diapositive floue dans la photo d'un intervenant, voulue | voulu |

1 constat vrai sur 3 ; les 2 faux viennent de Holo et sont restés des doutes. Le chapô coupé du 17/11 n'est pas attendu ici : sa page n'est pas parmi les 15.

- Pendant la visite : la page de l'article a défilé jusqu'au lien, que le cercle rouge a entouré en direct, sans texte. Les deux doutes ont reçu leur cadre orangé. Au récapitulatif, la vignette du 404 est centrée et entourée, sans curseur ni mascotte.
- Écrit : 3 décisions dans la mémoire du site de la copie (`eugeniaschool-com/decisions/`) et la note du passage complétée (`eugeniaschool-com/passages/2026-11-18-10h45-8eb8.md`).

| Le 404 en direct | Un doute en direct | Récapitulatif | Question 1 | Fin |
|---|---|---|---|---|
| ![](captures/2026-11-18-repetition-reelle/02-trait-defaut.jpg) | ![](captures/2026-11-18-repetition-reelle/04-trait-doute.jpg) | ![](captures/2026-11-18-repetition-reelle/07-recapitulatif.jpg) | ![](captures/2026-11-18-repetition-reelle/08-examen-1.jpg) | ![](captures/2026-11-18-repetition-reelle/14-fin.jpg) |

## Défauts relevés

- Le curseur de l'agent reste immobile au centre tout le passage : H n'ouvre les pages que par `go_to`, sans clic (scène).
- « section-limit » s'affiche tel quel dans les raisons d'exclusion (moteur).
- L'identifiant du passage est à l'heure UTC (10h45), le dossier à l'heure de Paris (11h45) (moteur).
