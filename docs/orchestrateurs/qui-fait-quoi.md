# Qui fait quoi

État du mercredi 18 novembre 2026, après-midi (répartition décidée par Nathan et Ali après le passage au jury ; avant : fin de matinée), après le recadrage de Nathan ([décision](../decisions/2026-11-18-recadrage-grand-public-et-dev.md), [feuille de route](../feuille-de-route.md)). Chaque tâche a son issue : c'est là que se suivent l'avancement et les preuves. L'historique du 16/11 est dans `docs/journal-nathan.md` et dans l'historique Git de ce fichier.

## Répartition du 18/11 après-midi (fait foi)

- **Ali : le mode grand public.** Quelle que soit l'adresse, Horama va au bout (#67 : sites en JavaScript, anti-robots, banc de 15 sites en local et en conteneur), le champ `arrivee` (#91), le service Railway (#68), puis les 4 notes du vault (#72). Il donne aussi les accès du mode dev (#78, point 1).
- **Couloir Nathan : le mode dev sur le clone d'Ali** (`Hisseiny/eugenia-school-website`, #71) : vault du clone, réveil par la PR et Vercel, réponse sur la PR, commits de démo. Plus la direction artistique appliquée à la scène, à l'extension et à la page d'accueil. `automatisation/reveil/` et `automatisation/pr-doc/` passent au couloir Nathan.
- Les tableaux ci-dessous datent du matin : en cas d'écart, cette section fait foi.

## Règle de partage

- **Ali** construit le moteur : l'agent H, l'exploration et ses contrôles (`agent/`), le service en ligne, le réveil par Vercel et le commentaire sur la PR. Sa file, dans l'ordre : **#78** (issue épinglée).
- **Le couloir Nathan** (Nathan et son orchestrateur) construit ce que le jury regarde : la scène, le récapitulatif, la note du passage dans le vault, l'extension, la page d'accueil. Nathan refait lui-même la direction artistique.
- **Axil, Noé, Leslie, Inès** : le vault d'Eugenia, le rendu et le pitch.
- Personne ne code dans le dossier d'un autre. Une question passe en commentaire de l'issue concernée.

## Ali

| Ordre | Quoi | Issue | Dossiers |
|---|---|---|---|
| 1 | Mode grand public sur n'importe quel site : corrections de #63, contrôle des liens (redirections, plafond), faux constats de Holo (PR #66), banc de 7 sites | #67 | `agent/` |
| 2 | Service en ligne que le jury essaie seul, après la décision d'architecture de Nathan | #68 | à définir dans #68 |
| 3 | Mode dev : réveil par un vrai déploiement Vercel, commentaire sur la PR du développeur | #71 points 1 et 3 | `automatisation/reveil/`, `automatisation/pr-doc/` |
| 4 | Lecteur de valeurs : ligne vide, chiffre dans l'étiquette | #76 | `jugement/verification/` |

Pas avant la fin du hackathon : #55 (accessibilité), #77 (sélection élargie), #57 étape 3 (trois agents), #54 et PR #56.

## Couloir Nathan

| Ordre | Quoi | Issue | Qui |
|---|---|---|---|
| 1 | Scène épurée, squelette sans couleur : pendant le parcours, seulement le curseur, la mascotte et un trait à la main ; tout le texte au récapitulatif. Montrée à Nathan avant toute couleur | #69 | Orchestrateur |
| 2 | Note du passage dans le vault (« l'agent réexplique à Obsidian où sont les erreurs ») | #71 point 2 | Orchestrateur |
| 3 | Direction artistique (méthode `/taste`), page d'accueil, extension Chrome | #69, #70, #68 | Nathan, dans une session à part |
| | Décisions : architecture du service (#68), cible du mode dev si l'école ne donne pas le dépôt (#71), quatre sites du banc (#67), prévenir l'école des deux défauts trouvés | | Nathan |

Fusion des PR, push sur `dev` ou `main`, dépenses : Nathan seul.

## Le reste de l'équipe

| Quoi | Qui | Issue |
|---|---|---|
| Notes du vault d'Eugenia (7 pages recopiées du site), puis génération des tests | Axil, Noé, puis Leslie | #72 |
| Vue « question ouverte » pour les réponses repliées de la FAQ | Inès ou Leslie | #72 (PR #75) |
| Rendu de mercredi 17 h : parcours utilisateur, architecture, Loom de 2 min, feuille de route | Noé, Axil | #73 |
| Point business, pitch | Noé | |

Le thème « Musée grec » d'Inès (PR #65) n'est pas branché : Nathan refait la direction artistique.

## Dossiers et propriétaires

| Dossier | À qui |
|---|---|
| `agent/` | Ali |
| `automatisation/reveil/`, `automatisation/pr-doc/` | Couloir Nathan (depuis le 18/11 après-midi) |
| `automatisation/scene/`, `automatisation/impact/`, `extension/` | Couloir Nathan |
| `jugement/` | Couloir Nathan, sauf #76 (Ali) |
| `vault-horama/` | Axil, Noé, Leslie |
| `docs/decisions/`, `docs/feuille-de-route.md` | Nathan |
| `contrats/` | Gelés (`contrats-v2`) : un changement se décide à deux, Ali et Nathan |

Le format `horama-exploration-1` est le point de jonction entre le moteur d'Ali et la scène : il ne change pas sans un commentaire dans #69.
