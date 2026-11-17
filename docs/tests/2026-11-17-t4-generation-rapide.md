# T4 : génération des tests par un modèle ouvert (routeur Hugging Face)

Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.

## Ce qui a été lancé

- Commande, depuis la racine du repo : `node --env-file=.env.local jugement/scripts/t4-generation.ts openai/gpt-oss-120b:fastest openai/gpt-oss-120b:cerebras openai/gpt-oss-120b:groq openai/gpt-oss-20b:fastest`
- Début : 2026-11-17T13:46:53.428Z ; durée totale : 63,2 s.
- Code : commit `af4614c`, sans modification non commitée de `jugement/` ni de `memoire/`.
- Modèles : `openai/gpt-oss-120b:fastest`, `openai/gpt-oss-120b:cerebras`, `openai/gpt-oss-120b:groq`, `openai/gpt-oss-20b:fastest` ; réserve `zai-org/GLM-5.3-Flash` : sans objet (modèles choisis à la main).
- 3 notes (`notes-de-version/v13.md`, `produit/liste-des-factures.md`, `produit/regles-entre-ecrans.md`), 3 passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.

Comment chaque mesure est calculée :
- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».
- Règles justes : pour les deux notes de `produit/`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par `lireNotes` ; pour `notes-de-version/v13.md`, il y a 2 tests, l'un porte la règle `filtre` attendue (condition `< aujourd_hui` ou `<= aujourd_hui`) avec un relevé de `liste-des-factures` dans une vue autre que `defaut` et au moins une question, l'autre cite « Exporter », relève `liste-des-factures` en vue `defaut` et ne porte aucune règle.
- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.

## Ce qui en est sorti

**Modèle retenu : `openai/gpt-oss-120b:fastest`.** 3 modèles tiennent le critère de T4, il est le plus rapide (2 note(s) sur 3 réussie(s) aux 3 passes, temps médian 1,6 s ; `openai/gpt-oss-120b:cerebras` : 1,6 s, `openai/gpt-oss-20b:fastest` : 6,9 s).

Modèle par défaut de `proposerTests` dans le code au moment du lancement : `openai/gpt-oss-120b`, ce n'est pas lui : à corriger dans `jugement/generation/index.ts`.

### openai/gpt-oss-120b:fastest

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 0 sur 3 | 1,6 s | 1 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 1,7 s | 3 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 1,6 s | 0 sur 3 |
| **Total** | **9 sur 9** | **6 sur 9** | **1,6 s** | **4 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 2 sur 3.
- Temps médian global (9 passes, échecs compris) : 1,6 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 34504 en entrée, 19602 en sortie ; coût rendu par le routeur : 0.0261 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **tenu**.

### openai/gpt-oss-120b:cerebras

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 2 sur 3 | 0 sur 3 | 1,3 s | 0 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 1,7 s | 3 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 1,7 s | 0 sur 3 |
| **Total** | **8 sur 9** | **6 sur 9** | **1,6 s** | **3 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 2 sur 3.
- Temps médian global (9 passes, échecs compris) : 1,6 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 2 sur 3.
- Jetons : 29478 en entrée, 17713 en sortie ; coût rendu par le routeur : 0.0236 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **tenu**.

### openai/gpt-oss-120b:groq

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 2 sur 3 | 4,1 s | 1 sur 3 |
| `produit/liste-des-factures.md` | 1 sur 3 | 1 sur 3 | 5,1 s | 3 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 5,9 s | 0 sur 3 |
| **Total** | **7 sur 9** | **6 sur 9** | **5,4 s** | **4 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 1 sur 3.
- Temps médian global (9 passes, échecs compris) : 5,4 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 28326 en entrée, 17174 en sortie ; coût rendu par le routeur : 0.0139 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **non tenu**.

### openai/gpt-oss-20b:fastest

| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |
|---|---|---|---|---|
| `notes-de-version/v13.md` | 3 sur 3 | 0 sur 3 | 8,4 s | 2 sur 3 |
| `produit/liste-des-factures.md` | 3 sur 3 | 3 sur 3 | 4,6 s | 1 sur 3 |
| `produit/regles-entre-ecrans.md` | 3 sur 3 | 3 sur 3 | 7,3 s | 0 sur 3 |
| **Total** | **9 sur 9** | **6 sur 9** | **6,9 s** | **3 sur 9** |

- Notes réussies aux 3 passes (format valide et règles justes) : 2 sur 3.
- Temps médian global (9 passes, échecs compris) : 6,9 s.
- `notes-de-version/v13.md` : passes où les 2 tests s'écrivent (`ecrireTestAccepte`) et se relisent (`lireTestAccepte`) : 3 sur 3.
- Jetons : 30602 en entrée, 32963 en sortie ; coût rendu par le routeur : 0.0071 $.
- Critère de T4 (au moins 2 notes sur 3 réussies aux 3 passes, temps médian sous 10 s) : **tenu**.

### Chaque passe

| Modèle | Note | Passe | Format C1 valide | Règles justes | Essais | Temps (ms) | Jetons en entrée | Jetons en sortie | Écrits et relus |
|---|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b:fastest` | `notes-de-version/v13.md` | 1 | oui | non | 1 | 1444 | 2223 | 2078 | oui |
| `openai/gpt-oss-120b:fastest` | `notes-de-version/v13.md` | 2 | oui | non | 2 | 4282 | 5026 | 2393 | oui |
| `openai/gpt-oss-120b:fastest` | `notes-de-version/v13.md` | 3 | oui | non | 1 | 1559 | 2223 | 2078 | oui |
| `openai/gpt-oss-120b:fastest` | `produit/liste-des-factures.md` | 1 | oui | oui | 2 | 1805 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:fastest` | `produit/liste-des-factures.md` | 2 | oui | oui | 2 | 1680 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:fastest` | `produit/liste-des-factures.md` | 3 | oui | oui | 2 | 1644 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:fastest` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 1616 | 2634 | 2268 |  |
| `openai/gpt-oss-120b:fastest` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 1521 | 2634 | 2268 |  |
| `openai/gpt-oss-120b:fastest` | `produit/regles-entre-ecrans.md` | 3 | oui | oui | 1 | 1640 | 2634 | 2268 |  |
| `openai/gpt-oss-120b:cerebras` | `notes-de-version/v13.md` | 1 | oui | non | 1 | 1399 | 2223 | 2078 | oui |
| `openai/gpt-oss-120b:cerebras` | `notes-de-version/v13.md` | 2 | oui | non | 1 | 1340 | 2223 | 2078 | oui |
| `openai/gpt-oss-120b:cerebras` | `notes-de-version/v13.md` | 3 | non | non | 1 | 324 | à mesurer | à mesurer |  |
| `openai/gpt-oss-120b:cerebras` | `produit/liste-des-factures.md` | 1 | oui | oui | 2 | 1739 | 5710 | 2097 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/liste-des-factures.md` | 2 | oui | oui | 2 | 1742 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/liste-des-factures.md` | 3 | oui | oui | 2 | 1646 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 1836 | 2634 | 2470 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 1654 | 2634 | 2470 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/regles-entre-ecrans.md` | 3 | oui | oui | 1 | 1452 | 2634 | 2354 |  |
| `openai/gpt-oss-120b:groq` | `notes-de-version/v13.md` | 1 | oui | oui | 1 | 3923 | 2223 | 1590 | oui |
| `openai/gpt-oss-120b:groq` | `notes-de-version/v13.md` | 2 | oui | non | 2 | 5980 | 5037 | 2253 | oui |
| `openai/gpt-oss-120b:groq` | `notes-de-version/v13.md` | 3 | oui | oui | 1 | 4148 | 2223 | 1490 | oui |
| `openai/gpt-oss-120b:groq` | `produit/liste-des-factures.md` | 1 | non | non | 2 | 3595 | 2600 | 1301 |  |
| `openai/gpt-oss-120b:groq` | `produit/liste-des-factures.md` | 2 | non | non | 2 | 5067 | 2600 | 2005 |  |
| `openai/gpt-oss-120b:groq` | `produit/liste-des-factures.md` | 3 | oui | oui | 2 | 5635 | 5741 | 1822 |  |
| `openai/gpt-oss-120b:groq` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 5862 | 2634 | 2164 |  |
| `openai/gpt-oss-120b:groq` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 5436 | 2634 | 2266 |  |
| `openai/gpt-oss-120b:groq` | `produit/regles-entre-ecrans.md` | 3 | oui | oui | 1 | 6824 | 2634 | 2283 |  |
| `openai/gpt-oss-20b:fastest` | `notes-de-version/v13.md` | 1 | oui | non | 2 | 10629 | 4881 | 4478 | oui |
| `openai/gpt-oss-20b:fastest` | `notes-de-version/v13.md` | 2 | oui | non | 2 | 8449 | 4882 | 4813 | oui |
| `openai/gpt-oss-20b:fastest` | `notes-de-version/v13.md` | 3 | oui | non | 1 | 3345 | 2220 | 2114 | oui |
| `openai/gpt-oss-20b:fastest` | `produit/liste-des-factures.md` | 1 | oui | oui | 1 | 4114 | 2597 | 2215 |  |
| `openai/gpt-oss-20b:fastest` | `produit/liste-des-factures.md` | 2 | oui | oui | 1 | 5027 | 2597 | 2750 |  |
| `openai/gpt-oss-20b:fastest` | `produit/liste-des-factures.md` | 3 | oui | oui | 2 | 4645 | 5532 | 2075 |  |
| `openai/gpt-oss-20b:fastest` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 7284 | 2631 | 4295 |  |
| `openai/gpt-oss-20b:fastest` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 12564 | 2631 | 5820 |  |
| `openai/gpt-oss-20b:fastest` | `produit/regles-entre-ecrans.md` | 3 | oui | oui | 1 | 6885 | 2631 | 4403 |  |

## Ce qui a échoué

- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 1 : le second test ne relève pas liste-des-factures en vue defaut
- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 2 : le test du filtre ne pose aucune question
- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 3 : le second test ne relève pas liste-des-factures en vue defaut
- `openai/gpt-oss-120b:cerebras`, `notes-de-version/v13.md`, passe 1 : le second test ne relève pas liste-des-factures en vue defaut
- `openai/gpt-oss-120b:cerebras`, `notes-de-version/v13.md`, passe 2 : le second test ne relève pas liste-des-factures en vue defaut
- `openai/gpt-oss-120b:cerebras`, `notes-de-version/v13.md`, passe 3 : Génération impossible (openai/gpt-oss-120b:cerebras, notes-de-version/v13.md) : HTTP 429 : Provider returned error
- `openai/gpt-oss-120b:groq`, `notes-de-version/v13.md`, passe 2 : le test du filtre ne pose aucune question
- `openai/gpt-oss-120b:groq`, `produit/liste-des-factures.md`, passe 1 : Génération impossible (openai/gpt-oss-120b:groq, produit/liste-des-factures.md) : HTTP 429 : Provider returned error
- `openai/gpt-oss-120b:groq`, `produit/liste-des-factures.md`, passe 2 : Génération impossible (openai/gpt-oss-120b:groq, produit/liste-des-factures.md) : HTTP 429 : Provider returned error
- `openai/gpt-oss-20b:fastest`, `notes-de-version/v13.md`, passe 1 : le test du filtre ne pose aucune question
- `openai/gpt-oss-20b:fastest`, `notes-de-version/v13.md`, passe 2 : le test du filtre ne pose aucune question
- `openai/gpt-oss-20b:fastest`, `notes-de-version/v13.md`, passe 3 : le test du filtre ne pose aucune question

Premiers essais refusés par le code, puis rattrapés ou non au second :
- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 2 : test 2 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:fastest`, `produit/liste-des-factures.md`, passe 1 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:fastest`, `produit/liste-des-factures.md`, passe 2 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:fastest`, `produit/liste-des-factures.md`, passe 3 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:cerebras`, `produit/liste-des-factures.md`, passe 1 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:cerebras`, `produit/liste-des-factures.md`, passe 2 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:cerebras`, `produit/liste-des-factures.md`, passe 3 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:groq`, `notes-de-version/v13.md`, passe 2 : test 2 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:groq`, `produit/liste-des-factures.md`, passe 1 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:groq`, `produit/liste-des-factures.md`, passe 2 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:groq`, `produit/liste-des-factures.md`, passe 3 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-20b:fastest`, `notes-de-version/v13.md`, passe 1 : la réponse n'est pas un objet JSON lisible
- `openai/gpt-oss-20b:fastest`, `notes-de-version/v13.md`, passe 2 : test 2 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-20b:fastest`, `produit/liste-des-factures.md`, passe 3 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)

Réponses brutes de chaque passe : `jugement/generation/essais-rapide/<modele>--<note>--<passe>.json`.
