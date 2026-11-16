# T4 : comparaison des modèles de génération

Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.

**Aucun modèle ne tient le critère de T4.** Le meilleur est `openai/gpt-oss-120b` (2 note(s) sur 3 réussie(s) aux 3 passes, temps médian 16,3 s). Repli prévu par la spec : afficher un test pré-généré, présenté comme tel.

Modèle par défaut de `proposerTests` dans le code au moment du lancement : `openai/gpt-oss-120b`, c'est bien lui.

- Commande, depuis la racine du repo : `node --env-file=/Users/nathan/Code/projet/horama/.env.local jugement/scripts/t4-generation.ts`
- Début : 2026-11-16T17:54:21.656Z ; durée totale : 357,1 s.
- Code : commit `74572cd`, sans modification non commitée de `jugement/` ni de `memoire/`.
- Modèles : `openai/gpt-oss-120b`, `Qwen/Qwen3.8-27B` ; réserve `zai-org/GLM-5.3-Flash` : non lancée (chaque modèle a répondu au moins une fois).
- 3 notes (`notes-de-version/v13.md`, `produit/liste-des-factures.md`, `produit/regles-entre-ecrans.md`), 3 passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.

- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».
- Règles justes : pour les deux notes de `produit/`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par `lireNotes` ; pour `notes-de-version/v13.md`, il y a 2 tests, l'un porte la règle `filtre` attendue (condition `< aujourd_hui` ou `<= aujourd_hui`) avec un relevé de `liste-des-factures` dans une vue autre que `defaut` et au moins une question, l'autre cite « Exporter », relève `liste-des-factures` en vue `defaut` et ne porte aucune règle.
- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.

## openai/gpt-oss-120b

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 3 sur 3 | 14,3 s | 1 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 16,3 s | 2 sur 3 |
| `produit/regles-entre-ecrans.md` | 2 sur 3 | 2 sur 3 | 23,8 s | 1 sur 3 |
| **Total** | **8 sur 9** | **8 sur 9** | **16,3 s** | **4 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 2 sur 3.
- Temps médian global (9 passes, échecs compris) : 16,3 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 35060 en entrée, 20276 en sortie ; coût rendu par le routeur : 0.0081 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **non tenu**.

## Qwen/Qwen3.8-27B

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 0 sur 3 | 0 sur 3 | 45,0 s | 0 sur 3 |
| `produit/liste-des-factures.md` | 1 sur 3 | 1 sur 3 | 45,0 s | 0 sur 3 |
| `produit/regles-entre-ecrans.md` | 1 sur 3 | 1 sur 3 | 45,0 s | 0 sur 3 |
| **Total** | **2 sur 9** | **2 sur 9** | **45,0 s** | **0 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 0 sur 3.
- Temps médian global (9 passes, échecs compris) : 45,0 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 0 sur 3.
- Jetons : 5397 en entrée, 14076 en sortie ; coût rendu par le routeur : 0.0313 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **non tenu**.

Détail de chaque passe et réponses brutes : `jugement/generation/essais/` et `docs/tests/2026-11-16-t4-generation.md`.
