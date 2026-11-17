# T4 : comparaison des modèles de génération

Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.

**Modèle retenu : `openai/gpt-oss-120b:cerebras`.** 2 modèles tiennent le critère de T4, il est le plus rapide (3 note(s) sur 3 réussie(s) aux 3 passes, temps médian 1,8 s ; `openai/gpt-oss-120b:fastest` : 3,0 s).

Modèle par défaut de `proposerTests` dans le code au moment du lancement : `openai/gpt-oss-120b`, ce n'est pas lui : à corriger dans `jugement/generation/index.ts`.

- Commande, depuis la racine du repo : `node --env-file=.env.local jugement/scripts/t4-generation.ts openai/gpt-oss-120b:fastest openai/gpt-oss-120b:cerebras`
- Début : 2026-11-17T13:55:33.844Z ; durée totale : 25,0 s.
- Code : commit `53dcd15`, sans modification non commitée de `jugement/` ni de `memoire/`.
- Modèles : `openai/gpt-oss-120b:fastest`, `openai/gpt-oss-120b:cerebras` ; réserve `zai-org/GLM-5.3-Flash` : sans objet (modèles choisis à la main).
- 3 notes (`notes-de-version/v13.md`, `produit/liste-des-factures.md`, `produit/regles-entre-ecrans.md`), 3 passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.

- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».
- Règles justes : pour les deux notes de `produit/`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par `lireNotes` ; pour `notes-de-version/v13.md`, il y a 2 tests, l'un porte la règle `filtre` attendue (condition `< aujourd_hui` ou `<= aujourd_hui`) avec un relevé de `liste-des-factures` dans une vue autre que `defaut` et au moins une question, l'autre cite « Exporter », relève `liste-des-factures` en vue `defaut` et ne porte aucune règle.
- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.

## openai/gpt-oss-120b:fastest

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 3 sur 3 | 3,2 s | 3 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 3,1 s | 3 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 1,7 s | 0 sur 3 |
| **Total** | **9 sur 9** | **9 sur 9** | **3,0 s** | **6 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 3 sur 3.
- Temps médian global (9 passes, échecs compris) : 3,0 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 40347 en entrée, 21588 en sortie ; coût rendu par le routeur : 0.0254 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **tenu**.

## openai/gpt-oss-120b:cerebras

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 3 sur 3 | 1,9 s | 3 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 1,8 s | 3 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 1,6 s | 0 sur 3 |
| **Total** | **9 sur 9** | **9 sur 9** | **1,8 s** | **6 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 3 sur 3.
- Temps médian global (9 passes, échecs compris) : 1,8 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 40347 en entrée, 21889 en sortie ; coût rendu par le routeur : 0.0305 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **tenu**.

Détail de chaque passe et réponses brutes : `jugement/generation/essais-rapide-2/` et `docs/tests/2026-11-17-t4-generation-rapide-2.md`.
