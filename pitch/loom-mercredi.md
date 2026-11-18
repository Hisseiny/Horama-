# Loom de 2 minutes, rendu du mercredi 18/11 à 17 h

Tâche 4.3 de la checklist, issue [#73](https://github.com/Hisseiny/Horama-/issues/73). Noé parle. Contenu demandé par #73 : l'accroche, l'agent qui parcourt un vrai site, un vrai défaut trouvé, la décision de l'humain. Déroulé du mode grand public décidé par Nathan le 18/11 (commentaire de #73) : on part de l'onglet ouvert sur un article du blog d'Eugenia.

257 mots lus, soit 1 min 43 à 150 mots par minute ; il reste environ 15 secondes pour les silences et les transitions. À chronométrer à voix haute avant d'enregistrer. Chaque chiffre dit à voix haute a sa source en bas de page.

## À confirmer avec Nathan avant d'enregistrer

1. **Où et sous quelle forme on dépose le rendu** (le Loom seul, un PDF qui rassemble les quatre éléments, un formulaire).
2. **Montrer les deux défauts du site d'Eugenia.** La feuille de route demande de prévenir l'école avant de les montrer au jury, et le Loom repose dessus. Sans accord, remplacer le plan 3 par le tour du site en mode développeur (7 pages, règles tenues) et couper la phrase sur le 404.
3. **Ce qu'on filme.** La scène épurée (curseur, mascotte, trait à la main) n'est pas finie (#69) et le récapitulatif du mode grand public n'a jamais été affiché dans la scène (rapport du 18/11 : « rendu dans la scène non vérifié »). Options, de la plus vraie à la plus sûre :
   - un passage en direct avec l'agent H (clé H et Chrome de démo : Ali ou Nathan) ;
   - le replay H du 17/11 (liens en bas de page) et les captures du passage, avec le trait ajouté au montage ;
   - pour la décision humaine, la répétition du mode développeur (`bash automatisation/demo/repetition.sh`, gratuite, sans agent H), où l'humain tranche bien « bug ou voulu » dans la scène.

## Le script

| Temps | À l'écran | Voix |
|---|---|---|
| 0:00–0:12 | Titre « Horama », puis l'accroche en grand | « Votre documentation devient vos tests. Sans documentation, Horama regarde quand même. Je suis Noé, de l'équipe 11, et voici Horama. » |
| 0:12–0:32 | Le site d'Eugenia School, page d'accueil | « Sur un site, personne ne relit toutes les pages après chaque mise en ligne. Les défauts restent en ligne jusqu'à ce qu'un visiteur tombe dessus. H Company a publié une démo de QA : un agent qui joue un test écrit à la main. On la prolonge : Horama trouve lui-même quoi tester. » |
| 0:32–0:50 | Onglet ouvert sur l'article « Fin de Parcoursup : ce qui change en Première et en Terminale ». Clic sur Horama | « Premier mode, pour tout le monde : on est sur une page, on lance Horama. Pas de documentation, pas d'accès au code. Un agent H prend la main dans Chrome et visite la page, comme un visiteur. » |
| 0:50–1:10 | Le curseur de l'agent ; le lien « journée portes ouvertes d'Eugenia School le 12 décembre » est entouré d'un trait | « Ce lien annonce les portes ouvertes du 12 décembre. Horama l'a suivi : la page répond 404, elle n'existe pas. Ce n'est pas l'agent qui le dit, c'est le code qui l'a vérifié. Ce défaut est en ligne aujourd'hui. » |
| 1:10–1:25 | L'agent passe sur d'autres pages du site | « Puis Horama explore le reste du site : quinze pages, en trois à quatre minutes, pour sept centimes. Quinze, parce qu'on est sur le plan gratuit de H et pour garder l'attente courte. En production, Horama parcourt tout le site. » |
| 1:25–1:42 | Le récapitulatif : chaque constat avec sa capture ; l'humain clique « bug » ou « voulu » | « À la fin, tout arrive au récapitulatif. Ce que le code prouve est un défaut. Ce que l'IA croit voir reste un doute. Et c'est un humain qui tranche : bug ou voulu. Horama garde sa décision pour le passage suivant. » |
| 1:42–2:00 | Le vault Obsidian (une note par page), puis une PR GitHub | « Second mode, pour les équipes produit : la documentation dans Obsidian devient des tests. À chaque mise en ligne, Horama rejoue ceux qui sont touchés, puis répond sur GitHub. Votre documentation devient vos tests. » |

## Ce que le script ne dit pas, exprès

- **« Trois agents en parallèle »** : pas construit (un seul agent aujourd'hui, #57 étape 3).
- **« Marche sur n'importe quel site »** : à prouver (#67) ; le passage mesuré est sur eugeniaschool.com.
- **Le mode développeur de bout en bout** (réveil par Vercel, commentaire sur la PR) : pas construit (#71). La voix dit ce que fait le produit, l'image ne doit pas montrer un commentaire de PR qui n'existe pas : montrer une PR de documentation réelle ou s'arrêter sur le vault.
- **Le taux de faux constats** : 6 constats sur 8 étaient faux au premier passage (tous venus de Holo). On ne le cache pas si on nous le demande, mais il n'a pas sa place en 2 minutes. C'est la raison de la phrase « ce que l'IA croit voir reste un doute ».

## Sources

| Ce qui est dit | Source |
|---|---|
| Lien « portes ouvertes » en 404 | `docs/tests/2026-11-18-mode-visuel.md` ; revérifié le 18/11 à 11 h 30 : `https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov` répond 404, et l'article « Fin de Parcoursup » pointe toujours vers lui avec le texte « journée portes ouvertes d’Eugenia School le 12 décembre » |
| 15 pages, 174 à 237 s, environ 0,07 $ par passage | `docs/tests/2026-11-18-mode-visuel.md`, passages 1 et 2b (0,0745 $ et 0,0712 $) |
| 2 vrais défauts sur 8 constats | Même rapport, revue humaine du passage 1. Le second (chapô coupé « …dans la cha » de l'article sur les métiers de la data) est lui aussi encore en ligne le 18/11 à 11 h 30 |
| Plan gratuit de H, 15 pages | Commentaire de Nathan sur #73 |
| La démo QA de H | README, `hcompai/agents-api-demos`, `examples/software_qa` (MIT) ; `docs/cadrage.md`, section 3 |
| Bug ou voulu, décision gardée | `docs/decisions/2026-11-18-recadrage-grand-public-et-dev.md` ; répétition du mode développeur, `docs/demo/2026-11-17-repetition.md` |

Replays H du 17/11 (JSON public, HTTP 200 le 18/11) :
- passage 1 : https://agp.eu.hcompany.ai/share/api/v1/trajectories/14d93d7d-654a-4377-945a-c6f4285b1174
- passage 2b : https://agp.eu.hcompany.ai/share/api/v1/trajectories/65afc19e-0202-4d02-bab3-f699717d203d

Captures du passage 1 (lien cassé, chapô coupé) : copiées hors dépôt dans `~/essais/pr/` sur la machine qui a fait le passage, à demander à Ali.

## Après l'enregistrement

- Ouvrir le lien du Loom en fenêtre privée (mission, tâche 4.3).
- Ajouter le lien dans l'issue #73 et passer les lignes 4.3, 4.4 et 4.5 de `docs/checklist.md` à « fait » avec la preuve.
