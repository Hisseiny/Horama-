# Mission : Noé, CEO, pôle F (Business, pilote et pitch)

**Ta mission en une phrase.** Obtenir le vrai cas (accès au pilote, sa documentation, ses chiffres, son avis écrit), tenir le calendrier des rendus, et porter la voix de l'équipe jusqu'au pitch.

**Ton dossier.** `pitch/` (deck, script, chiffres, rendus, liens des vidéos). Tu tiens aussi `docs/plan-de-travail.md`. Axil travaille avec toi sur le design du deck.

**Ce que tu reçois.**
- Les chiffres et graphiques du banc (Inès).
- Les replays, le rapport de passage et les captures (Ali).
- Le parcours utilisateur et le design (Axil).

**Ce que tu donnes.**
- À Inès : la documentation et les notes de version du pilote (ou 30 minutes d'entretien pour écrire les règles de 3 écrans).
- À Ali : la fiche d'accès au pilote (URL de l'environnement de test, sans mot de passe dans le repo).
- À l'équipe : la décision de bascule pilote ou faux SaaS (mardi 12 h, avec Ali).

**Tes tâches, dans l'ordre.**

| N° | Tâche | Fini quand |
|---|---|---|
| 0.2 | Déposer le rendu de lundi | Avant 17 h |
| 1.1 | Trancher D4 (SaaS pilote et ses 3 écrans) dès la réponse | Fichier dans `docs/decisions/` |
| 1.6 | Prérequis du pilote envoyés (cadrage, section 17) | Réponse attendue mardi 12 h |
| 2.6 | Bascule pilote ou faux SaaS, avec Ali | Décision écrite à 12 h |
| 3.10 | Chiffres du pilote (temps de recette, bugs arrivés chez des clients), sa doc transmise à Inès, premier jet du go-to-market | `pitch/chiffres.md`, chaque chiffre avec sa source |
| 4.3 | Loom de 2 minutes : problème, solution, avancement montré en vrai | Lien testé en fenêtre privée |
| 4.4, 4.5 | Roadmap jusqu'à jeudi ; dépôt du rendu de mercredi | Avant 17 h |
| 4.11 | Plan du deck de vendredi dans l'ordre imposé, avec Axil | Squelette dans `pitch/deck/` |
| 5.5 | Retour écrit du pilote après lui avoir montré un passage : utiliserait-il Horama, paierait-il, combien, que manque-t-il | `pitch/pilote.md` |
| 5.6, 5.8 | État de départ de la démo ; 5 répétitions chronométrées (tu parles) | Médiane du test en direct sous 90 s |
| 6.2, 6.6 | Vidéo de 5 minutes avec Nathan ; dépôt des livrables du matin | Avant 11 h |
| 6.7 | Deck final de 8 à 12 slides | Avant 15 h |
| 6.8 | Pitch de 6 minutes et 4 minutes de questions | |

**L'ordre imposé du deck de vendredi.** Problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run.

**Les règles de ton pôle.**
- Aucun chiffre inventé : chaque chiffre du pitch a sa source (le pilote, le banc, une étude datée).
- Rien du pilote n'est publié (écrans, nom, LinkedIn) sans son accord écrit.
- On cite la démo QA de H dès le début du pitch et on montre ce qu'Horama ajoute (cadrage, section 3).
- Le faux SaaS se présente comme tel.

**Ton premier message à ton IA** :

```
Tu es mon assistant pour le projet Horama (hackathon). Je suis Noé, CEO, responsable du pôle F : client pilote, business, rendus, deck et pitch.
Lis d'abord AGENTS.md, puis docs/missions/noe-ceo-business-pitch.md, puis docs/cadrage.md sections 0, 2, 14, 16 et 17.
Tu ne modifies que pitch/ et docs/plan-de-travail.md. Tu n'inventes jamais un chiffre, une citation ou un nom de client : une valeur inconnue s'écrit « à mesurer ».
Ma tâche maintenant : [numéro et titre]. Avant de commencer, redis-moi en 5 lignes ce que tu vas faire, les fichiers que tu vas créer ou modifier, et comment on vérifiera que c'est fini.
```
