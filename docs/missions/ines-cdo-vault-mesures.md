# Mission : Inès, CDO, pôle C (Vault et mesures)

**Ta mission en une phrase.** Tenir la mémoire d'Horama (le vault Obsidian et la base de données) et prouver par des mesures honnêtes que le produit marche.

**Tes dossiers.** `vault-horama/`, `banc/`, `base/`. Personne d'autre n'écrit dans `banc/`.

**Ce que tu reçois.**
- La documentation du pilote, transmise par Noé.
- Les tests acceptés à l'écran 11.2 (Axil), les décisions humaines C5 (Axil), les rapports C6 et les lignes de mesure C8 (Ali et Leslie).
- La liste des régressions activables du faux SaaS (Nathan les code d'après ta liste).

**Ce que tu donnes.**
- Le vault : notes d'écran, règles entre écrans, notes de version, tests acceptés (C2), décisions, rapports de passage.
- La base Supabase (si D2 la retient) : tables et stockage des captures.
- Le banc : cas, vérité écrite à l'avance, résultats.
- Les chiffres et graphiques du deck, pour Noé.

**Tes tâches, dans l'ordre.**

| N° | Tâche | Fini quand |
|---|---|---|
| 1.1 | Trancher D2 (base de données) | Fichier dans `docs/decisions/` |
| 1.5 | Projet Supabase créé | Un appel réel répond |
| 1.7 | Relire les brouillons des contrats C2, C5, C8 | Tes remarques intégrées |
| 1.11 | Vault de départ : structure, 3 notes d'écran, 1 note de règles entre écrans, 1 note de version | Lisible dans Obsidian |
| 2.3 | Version factice du vault et de la base, remplie de données d'exemple | `USE_MOCKS=1` les sert |
| 2.4 | Tables et stockage selon C3, C4, C6, C8 | Migration dans `base/` |
| 3.3 | Écriture du test accepté dans le vault (C2) | Accepter crée le fichier |
| 3.9 | Banc : environ 10 régressions (dont 3 entre écrans), 5 changements voulus (dont 2 qui contredisent la doc), un écran avec les deux, 5 notes de version ; vérité écrite avant ; cas cachés | `banc/cas.md`, cas cachés non montrés à Ali ni à Leslie |
| 4.9 | Mémoire limitée à un écart ; référence mise à jour seulement quand tout est tranché sans bug ; retest | L'écart validé ne revient pas ; une régression sur le même écran reste vue |
| 4.12 | Premier passage du banc | Rappel et précision bruts |
| 5.2 | Dérive documentaire : la correction acceptée modifie la note | La note change dans Obsidian, 3 cas sur 3 |
| 5.4 | Mesures complètes, comparaisons, coût et durée, graphiques | Notebook et graphiques dans `banc/` |

**Les règles de ton pôle.**
- Une validation humaine ne vaut que pour un écart précis : écran, zone, description, version.
- Seule une décision humaine crée une règle ou modifie une note : Horama propose, l'humain accepte.
- Les échecs se publient avec les réussites ; `SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites ; chaque score se donne avec la comparaison la plus simple (différence de pixels, tests écrits à la main).
- Aucun chiffre inventé : une valeur inconnue s'écrit « à mesurer ».

**Ce que tu ne fais pas.** Écrire les consignes de l'agent ou de génération des tests (garde-fou de mesure).

**Ton premier message à ton IA** :

```
Tu es mon assistant pour le projet Horama (hackathon). Je suis Inès, CDO, responsable du pôle C : vault Obsidian, mémoire des décisions, base de données, banc de mesures.
Lis d'abord AGENTS.md, puis docs/missions/ines-cdo-vault-mesures.md, puis docs/cadrage.md sections 10 et 15, puis les contrats C2, C5, C6, C8 dans contrats/.
Tu ne modifies que vault-horama/, banc/ et base/. Tu ne changes aucun contrat gelé. Tu n'inventes jamais un chiffre.
Ma tâche maintenant : [numéro et titre]. Avant de commencer, redis-moi en 5 lignes ce que tu vas faire, les fichiers que tu vas créer ou modifier, et comment on vérifiera que c'est fini.
```
