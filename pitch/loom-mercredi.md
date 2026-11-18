# Loom de 2 minutes, rendu du mercredi 18/11

Tâche 4.3 de la checklist, issue [#73](https://github.com/Hisseiny/Horama-/issues/73). Noé parle. Contenu demandé par #73 : l'accroche, l'agent qui parcourt un vrai site, un vrai défaut trouvé, la décision de l'humain. Mis à jour le 18/11 à 17 h 30 avec les réponses de Nathan (commentaire de #73, midi) et ce qui est fusionné sur `dev`.

Chaque chiffre dit à voix haute a sa source en bas de page. 239 mots, soit 1 min 36 à 150 mots par minute, environ 25 s pour les silences et les transitions. À chronométrer à voix haute avant d'enregistrer.

## Ce qui est décidé

- **Dépôt** : Nathan s'en occupe.
- **Le défaut d'Eugenia** : on le montre (le lien « portes ouvertes » en 404). L'accord de l'école est donné.
- **Quoi filmer** : la décision de Nathan prévue à 16 h n'est pas écrite dans le dépôt. Ce script suit la commande de démo actuelle, ci-dessous. Si Nathan a choisi autre chose, ajuster les plans 3 à 5.

## Ce qu'on filme

Un passage réel, lancé par Nathan ou Ali (il faut la clé H et le Chrome de démo) :

```
bash automatisation/demo/passage-reel.sh
```

- Départ de l'onglet ouvert sur l'article « Fin de Parcoursup : ce qui change en Première et en Terminale ».
- 8 pages, dont 4 atteintes par un vrai clic de l'agent H ; la scène agrandie en plein écran (vitrine).
- À l'écran, pendant le parcours : le curseur, la mascotte, le trait à la main. Tout le texte arrive au récapitulatif, où l'humain tranche.
- Coût d'un passage : environ 0,10 $. Durée : environ 3 min 30, à couper au montage.

**Plan de secours** si le passage échoue ou n'est pas lancé : les captures de la répétition réelle du 18/11 à 11 h 45 (`docs/tests/captures/2026-11-18-repetition-reelle/` : le 404 entouré, le récapitulatif, la question « bug ou voulu ») et son replay H. Ce passage-là a visité 15 pages par adresse, sans clic : dans ce cas, dire « quinze pages » au plan 4.

## Le script

| Temps | À l'écran | Voix |
|---|---|---|
| 0:00–0:10 | Titre « Horama », puis l'accroche en grand | « Votre documentation devient vos tests. Sans documentation, Horama regarde quand même. Je suis Noé, de l'équipe 11. » |
| 0:10–0:30 | Le site d'Eugenia School | « La personne qui s'occupe d'un site n'a pas le temps de tout relire après chaque modification. Le CTO d'un SaaS n'a pas le temps d'écrire des tests de non-régression. Les défauts restent en ligne jusqu'à ce qu'un visiteur tombe dessus. » |
| 0:30–0:45 | L'onglet ouvert sur l'article. On lance Horama | « Premier mode, pour tout le monde : on est sur une page, on lance Horama. Pas de documentation, pas d'accès au code. Un agent de H Company prend la main dans Chrome, comme un visiteur. » |
| 0:45–1:05 | L'agent fait défiler l'article ; le lien « journée portes ouvertes d'Eugenia School le 12 décembre » est entouré | « Il lit l'article et le fait défiler. Ce lien annonce les portes ouvertes du 12 décembre. Horama l'a suivi : la page n'existe pas, erreur 404. Ce n'est pas l'IA qui le dit, c'est le code qui l'a vérifié. Ce défaut est en ligne aujourd'hui. » |
| 1:05–1:20 | Le curseur clique un lien, une autre page s'ouvre (accéléré au montage) | « Puis il continue : il clique, il défile, comme vous. Huit pages, pour une dizaine de centimes. Huit, parce qu'on est sur le plan gratuit de H. En production, tout le site. » |
| 1:20–1:40 | Le récapitulatif, puis « C'est un bug, ou c'est voulu ? » ; clic sur « C'est un bug » | « À la fin, tout arrive au récapitulatif. Ce que le code prouve est un défaut. Ce que l'IA croit voir reste un doute. C'est un humain qui tranche : bug ou voulu. Horama garde sa décision pour la prochaine fois. » |
| 1:40–2:00 | Le vault Obsidian (une note par page) | « Second mode, pour les équipes produit : leur documentation devient des tests. À chaque mise en ligne, Horama rejoue ceux que le changement touche, et l'équipe tranche avant ses clients. Votre documentation devient vos tests. » |

## Ce que le script ne dit pas, exprès

- **Le test du site traduit en allemand** : la version allemande du clone n'existe pas encore ; rien de mesuré.
- **Le mode développeur de bout en bout** : le réveil par une PR sur le clone et le commentaire sur la PR sont codés, mais pas encore joués sur une vraie prévisualisation Vercel (protégée par une connexion, `docs/tests/2026-11-18-reveil-vercel-clone.md`) ni sur un vrai dépôt (`docs/tests/2026-11-18-commentaire-pr.md`). L'image s'arrête sur le vault, pas sur un commentaire de PR.
- **« Trois agents en parallèle »** : pas construit (évolution prévue, README).
- **« Marche sur n'importe quel site »** : en cours de preuve (#67) ; sur Albert School, le passage avec clics a été interrompu deux fois (`docs/tests/2026-11-18-a91-visite.md`).
- **Les faux constats** : à la répétition de 11 h 45, 1 constat vrai sur 3, les 2 faux venus de Holo et restés des doutes. À garder pour les questions du jury ; c'est la raison de la phrase « ce que l'IA croit voir reste un doute ».

## Sources

| Ce qui est dit | Source |
|---|---|
| La personne du site, le CTO d'un SaaS | `pitch/persona-responsable-site-eugenia.md`, `pitch/persona-cto-troov.md` |
| Lien « portes ouvertes » en 404 | `docs/tests/2026-11-18-mode-visuel.md`, `docs/tests/2026-11-18-repetition-reelle.md` ; revérifié le 18/11 à 16 h 12 : `https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov` répond 404 |
| Il lit, défile, clique ; 8 pages ; une dizaine de centimes | `docs/tests/2026-11-18-a91-visite.md`, passage Eugenia après 14 h 30 : 8 pages sur 8, 4 par clic, 3 défilements sur l'article, 211,6 s, 0,1030 $ ; commande `automatisation/demo/passage-reel.sh` (`--max 8 --pages-cliquees 4`) |
| Plan gratuit de H | Commentaire de Nathan sur #73 |
| Récapitulatif, « bug ou voulu », décision gardée | `docs/tests/2026-11-18-repetition-reelle.md` (3 décisions écrites dans la mémoire du site) |
| Un agent de H Company | README ; Horama prolonge la démo QA de H (`hcompai/agents-api-demos`, MIT) |

Replay H de la répétition du 18/11 à 11 h 45 (HTTP 200 le 18/11 à 17 h 20) : https://agp.eu.hcompany.ai/share/api/v1/trajectories/49596382-066a-4d9c-baa4-ac0714ca638c

## Après l'enregistrement

- Ouvrir le lien du Loom en fenêtre privée (mission, tâche 4.3).
- Ajouter le lien dans l'issue #73 et passer la ligne 4.3 de `docs/checklist.md` à « fait » avec la preuve.
