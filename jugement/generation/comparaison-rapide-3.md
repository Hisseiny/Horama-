# T4 : comparaison des modèles de génération

Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.

**Modèle retenu : `openai/gpt-oss-120b:fastest`.** Il est le seul à tenir le critère de T4 (3 note(s) sur 3 réussie(s) aux 3 passes, temps médian 1,6 s).

Modèle par défaut de `proposerTests` dans le code au moment du lancement : `openai/gpt-oss-120b:fastest`, c'est bien lui.

- Commande, depuis la racine du repo : `node --env-file=.env.local jugement/scripts/t4-generation.ts openai/gpt-oss-120b:fastest`
- Début : 2026-11-17T14:37:23.012Z ; durée totale : 14,1 s.
- Code : commit `bf2bb29`, sans modification non commitée de `jugement/` ni de `memoire/`.
- Modèles : `openai/gpt-oss-120b:fastest` ; réserve `zai-org/GLM-5.3-Flash` : sans objet (modèles choisis à la main).
- 3 notes (`notes-de-version/v13.md`, `produit/liste-des-factures.md`, `produit/regles-entre-ecrans.md`), 3 passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.

- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».
- Règles justes : pour les deux notes de `produit/`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par `lireNotes` ; pour `notes-de-version/v13.md`, il y a 2 tests, l'un porte la règle `filtre` attendue (condition `< aujourd_hui` ou `<= aujourd_hui`) avec un relevé de `liste-des-factures` dans une vue autre que `defaut` et au moins une question, l'autre cite « Exporter », relève `liste-des-factures` en vue `defaut` et ne porte aucune règle.
- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.

## openai/gpt-oss-120b:fastest

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 3 sur 3 | 1,1 s | 0 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 2,1 s | 1 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 1,6 s | 0 sur 3 |
| **Total** | **9 sur 9** | **9 sur 9** | **1,6 s** | **1 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 3 sur 3.
- Temps médian global (9 passes, échecs compris) : 1,6 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 28461 en entrée, 20896 en sortie ; coût rendu par le routeur : 0.0256 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **tenu**.

Détail de chaque passe : `docs/tests/2026-11-17-t4-generation-rapide-3.md` ; réponses brutes gardées en local, hors du dépôt (`jugement/generation/essais-rapide-3/`).
