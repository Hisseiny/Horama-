# Mission : Leslie, CAIO, pôle B (Écriture et vérification)

**Ta mission en une phrase.** Faire écrire les tests par un modèle Hugging Face à partir des notes du vault, sans rien inventer quand la doc est floue, puis décider du statut de chaque test à partir des valeurs relevées et du calcul.

**Ton dossier.** `jugement/`. Nathan contribue par pull request que tu relis (relevés par Holo, différence de pixels).

**Ce que tu reçois.**
- Les notes du vault (écrans, règles, notes de version), écrites par Inès.
- Les captures et les étapes de l'agent, transmises par l'orchestrateur d'Ali.

**Ce que tu donnes.**
- Les tests proposés (C1) avec leurs questions d'ambiguïté, pour l'écran 11.2 d'Axil et pour Inès.
- Le résultat de vérification (C4) : valeurs relevées, calcul, statut parmi `PASS`, `SUSPECTED`, `VERIFIED_FAIL`, `INCONCLUSIVE`.
- La rédaction de la correction de note (dérive documentaire), pour Inès.
- La comparaison des modèles (qualité, coût, latence) : c'est ton livrable de CAIO.

**Tes tâches, dans l'ordre.**

| N° | Tâche | Fini quand |
|---|---|---|
| 1.5 | Clé Hugging Face, coupon de 50 €, clé H personnelle | Un appel réel répond |
| 1.7 | Relire les brouillons des contrats C1 et C4 | Tes remarques intégrées |
| 1.9 | Preuve 2 : deux modèles Hugging Face écrivent un test au format H depuis la note d'exemple (cadrage, section 10) | Tests et temps de réponse dans `docs/tests/` |
| 2.3 | Versions factices de C1 et C4 | `USE_MOCKS=1` les renvoie |
| 3.1 | Génération : 3 notes donnent 3 tests proposés C1, avec questions d'ambiguïté | Format C1 respecté, 3 sur 3 |
| 3.5 | Vérification d'une règle d'un écran (somme, format ou filtre) | Même statut 3 fois sur 3 |
| 4.6 | Règle entre deux écrans (égalité de deux valeurs), avec Ali | « Défaut prouvé » 3 fois sur 3 |
| 5.1 | Zones d'écart pour la comparaison des versions | Zones entourées sur un vrai passage |
| 5.2 | Rédaction de la correction de note proposée | Correction juste, 3 cas sur 3 |
| 5.4 | Comparaison des deux modèles sur le banc, avec Inès | Tableau qualité, coût, latence |

**Les règles de ton pôle.**
- Un « défaut prouvé » exige des valeurs relevées et un calcul fait en code, jamais le seul avis d'un modèle.
- Pas de pourcentage de confiance affiché : on affiche le niveau de preuve (relevé, calcul, second lecteur).
- Quand la doc est ambiguë, le test n'est pas écrit au hasard : la question part à l'humain.
- Température à 0 pour les relevés ; un relevé douteux est relu.

**Ce que tu ne fais pas.** Lire `banc/` (cas cachés) ; régler tes consignes sur les cas du banc ; changer un champ d'un contrat sans pull request approuvée.

**Ton premier message à ton IA** :

```
Tu es mon assistant de code pour le projet Horama (hackathon). Je suis Leslie, CAIO, responsable du pôle B : génération des tests par un modèle Hugging Face et vérification des résultats.
Lis d'abord AGENTS.md, puis docs/missions/leslie-caio-ecriture-verification.md, puis docs/cadrage.md sections 8, 10 et 12, puis les contrats C1 et C4 dans contrats/.
Tu ne modifies que jugement/. Tu ne changes aucun contrat gelé. Tu n'inventes jamais une valeur : si l'information manque, le statut est INCONCLUSIVE ou une question part à l'humain.
Ma tâche maintenant : [numéro et titre]. Avant de coder, redis-moi en 5 lignes ce que tu vas faire, les fichiers que tu vas créer ou modifier, et comment on vérifiera que c'est fini.
```
