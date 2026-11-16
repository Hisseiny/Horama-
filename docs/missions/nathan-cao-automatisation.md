# Mission : Nathan, CAO, pôle E (Automatisation) et renfort A et B

**Ta mission en une phrase.** Automatiser ce qui suit un passage (notification, mesures), construire le faux SaaS de démonstration, et renforcer Ali et Leslie sur l'API H et Holo, que tu as déjà pratiqués.

**Tes dossiers.** `automatisation/` (export des workflows n8n), `faux-saas/`. Tu contribues à `agent/` et `jugement/` par pull request relue par leur propriétaire.

**Ce que tu reçois.**
- La notification C7 et le rapport C6, envoyés par l'orchestrateur d'Ali.
- La liste des régressions et des changements voulus du banc, écrite par Inès.

**Ce que tu donnes.**
- Le workflow n8n : un cas à relire devient une notification, et une ligne de mesure part en base.
- Le faux SaaS (tableau de bord, liste des factures, détail), en version 12 et 13, régressions activables par paramètre.
- Les relevés par Holo, le script de différence de pixels, les vidéos de secours, le contrôle des liens.

**Tes tâches, dans l'ordre.**

| N° | Tâche | Fini quand |
|---|---|---|
| 1.2 | Structure du repo (fichiers déjà prêts dans `pour-le-repo/`), validée par Ali | Visible sur GitHub |
| 1.5 | Clé H personnelle | Un appel réel répond |
| 1.8 | Renfort d'Ali : l'agent H atteint 2 écrans | Replay noté |
| 1.10 | Preuve 3 : Holo relève un montant sur une capture | 3 relevés justes sur 3 |
| 1.13 | Faux SaaS, première version, déployé sur Vercel | URL publique |
| 2.5, 3.7 | Points techniques H avec Ali | Réponses écrites |
| 2.7 | Essai de Vercel eve, 30 minutes au plus | Verdict écrit d'une ligne |
| 3.5 | Renfort de Leslie sur les relevés | |
| 3.8 | Workflow n8n (C7) | Une notification reçue sur un vrai passage |
| 4.10 | Faux SaaS en versions 12 et 13, régressions activables d'après la liste d'Inès | Chaque régression s'active par un paramètre |
| 5.1 | Script de différence de pixels (vue « pixels bruts ») | Image de différence produite sur un vrai passage |
| 5.7 | Vidéo de secours par chapitre de la démo, avec Noé | Un fichier par chapitre |
| 6.2, 6.4, 6.5 | Vidéo de 5 minutes avec Noé ; contrôle des liens en fenêtre privée ; retours sur l'API H | Liste cochée |

**Les règles de ton pôle.**
- Tu codes les régressions du faux SaaS d'après la liste d'Inès, mais tu ne règles pas les consignes de l'agent sur les cas cachés du banc.
- Le faux SaaS se dit tel quel au jury : une application de démonstration, comme celle de la démo QA de H.

**Ton premier message à ton IA** :

```
Tu es mon assistant de code pour le projet Horama (hackathon). Je suis Nathan, CAO, responsable du pôle E (automatisation n8n) et du faux SaaS de démonstration, en renfort des pôles A et B.
Lis d'abord AGENTS.md, puis docs/missions/nathan-cao-automatisation.md, puis docs/cadrage.md sections 12, 14.3 et 15, puis les contrats C6 et C7 dans contrats/.
Tu ne modifies que automatisation/ et faux-saas/, sauf demande explicite de ma part pour une pull request dans agent/ ou jugement/. Tu ne changes aucun contrat gelé.
Ma tâche maintenant : [numéro et titre]. Avant de coder, redis-moi en 5 lignes ce que tu vas faire, les fichiers que tu vas créer ou modifier, et comment on vérifiera que c'est fini.
```
