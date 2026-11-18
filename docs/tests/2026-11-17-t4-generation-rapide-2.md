# T4 : génération des tests par un modèle ouvert (routeur Hugging Face)

Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.

## Ce qui a été lancé

- Commande, depuis la racine du repo : `node --env-file=.env.local jugement/scripts/t4-generation.ts openai/gpt-oss-120b:fastest openai/gpt-oss-120b:cerebras`
- Début : 2026-11-17T13:55:33.844Z ; durée totale : 25,0 s.
- Code : commit `53dcd15`, sans modification non commitée de `jugement/` ni de `memoire/`.
- Modèles : `openai/gpt-oss-120b:fastest`, `openai/gpt-oss-120b:cerebras` ; réserve `zai-org/GLM-5.3-Flash` : sans objet (modèles choisis à la main).
- 3 notes (`notes-de-version/v13.md`, `produit/liste-des-factures.md`, `produit/regles-entre-ecrans.md`), 3 passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.

Comment chaque mesure est calculée :
- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».
- Règles justes : pour les deux notes de `produit/`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par `lireNotes` ; pour `notes-de-version/v13.md`, il y a 2 tests, l'un porte la règle `filtre` attendue (condition `< aujourd_hui` ou `<= aujourd_hui`) avec un relevé de `liste-des-factures` dans une vue autre que `defaut` et au moins une question, l'autre cite « Exporter », relève `liste-des-factures` en vue `defaut` et ne porte aucune règle.
- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.

## Ce qui en est sorti

**Modèle retenu : `openai/gpt-oss-120b:cerebras`.** 2 modèles tiennent le critère de T4, il est le plus rapide (3 note(s) sur 3 réussie(s) aux 3 passes, temps médian 1,8 s ; `openai/gpt-oss-120b:fastest` : 3,0 s).

Modèle par défaut de `proposerTests` dans le code au moment du lancement : `openai/gpt-oss-120b`, ce n'est pas lui : à corriger dans `jugement/generation/index.ts`.

### openai/gpt-oss-120b:fastest

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

### openai/gpt-oss-120b:cerebras

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

### Chaque passe

| Modèle | Note | Passe | Format C1 valide | Règles justes | Essais | Temps (ms) | Jetons en entrée | Jetons en sortie | Écrits et relus |
|---|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b:fastest` | `notes-de-version/v13.md` | 1 | oui | oui | 2 | 3716 | 5105 | 2744 | oui |
| `openai/gpt-oss-120b:fastest` | `notes-de-version/v13.md` | 2 | oui | oui | 2 | 3223 | 5105 | 2750 | oui |
| `openai/gpt-oss-120b:fastest` | `notes-de-version/v13.md` | 3 | oui | oui | 2 | 3017 | 5105 | 2743 | oui |
| `openai/gpt-oss-120b:fastest` | `produit/liste-des-factures.md` | 1 | oui | oui | 2 | 2861 | 5710 | 2065 |  |
| `openai/gpt-oss-120b:fastest` | `produit/liste-des-factures.md` | 2 | oui | oui | 2 | 3127 | 5710 | 2109 |  |
| `openai/gpt-oss-120b:fastest` | `produit/liste-des-factures.md` | 3 | oui | oui | 2 | 3215 | 5710 | 2115 |  |
| `openai/gpt-oss-120b:fastest` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 1738 | 2634 | 2354 |  |
| `openai/gpt-oss-120b:fastest` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 2221 | 2634 | 2354 |  |
| `openai/gpt-oss-120b:fastest` | `produit/regles-entre-ecrans.md` | 3 | oui | oui | 1 | 1692 | 2634 | 2354 |  |
| `openai/gpt-oss-120b:cerebras` | `notes-de-version/v13.md` | 1 | oui | oui | 2 | 2046 | 5105 | 2816 | oui |
| `openai/gpt-oss-120b:cerebras` | `notes-de-version/v13.md` | 2 | oui | oui | 2 | 1825 | 5105 | 2816 | oui |
| `openai/gpt-oss-120b:cerebras` | `notes-de-version/v13.md` | 3 | oui | oui | 2 | 1877 | 5105 | 2816 | oui |
| `openai/gpt-oss-120b:cerebras` | `produit/liste-des-factures.md` | 1 | oui | oui | 2 | 1778 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/liste-des-factures.md` | 2 | oui | oui | 2 | 1884 | 5710 | 2097 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/liste-des-factures.md` | 3 | oui | oui | 2 | 1788 | 5710 | 2083 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 1576 | 2634 | 2470 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 1635 | 2634 | 2354 |  |
| `openai/gpt-oss-120b:cerebras` | `produit/regles-entre-ecrans.md` | 3 | oui | oui | 1 | 1740 | 2634 | 2354 |  |

## Ce qui a échoué

Aucune passe en échec.

Premiers essais refusés par le code, puis rattrapés ou non au second :
- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 1 : test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit un filtre, un tri ou un onglet : la vue est alors « defaut »
- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 2 : test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit un filtre, un tri ou un onglet : la vue est alors « defaut »
- `openai/gpt-oss-120b:fastest`, `notes-de-version/v13.md`, passe 3 : test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit un filtre, un tri ou un onglet : la vue est alors « defaut »
- `openai/gpt-oss-120b:fastest`, `produit/liste-des-factures.md`, passe 1 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:fastest`, `produit/liste-des-factures.md`, passe 2 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:fastest`, `produit/liste-des-factures.md`, passe 3 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:cerebras`, `notes-de-version/v13.md`, passe 1 : test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit un filtre, un tri ou un onglet : la vue est alors « defaut »
- `openai/gpt-oss-120b:cerebras`, `notes-de-version/v13.md`, passe 2 : test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit un filtre, un tri ou un onglet : la vue est alors « defaut »
- `openai/gpt-oss-120b:cerebras`, `notes-de-version/v13.md`, passe 3 : test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit un filtre, un tri ou un onglet : la vue est alors « defaut »
- `openai/gpt-oss-120b:cerebras`, `produit/liste-des-factures.md`, passe 1 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:cerebras`, `produit/liste-des-factures.md`, passe 2 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b:cerebras`, `produit/liste-des-factures.md`, passe 3 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)

Réponses brutes de chaque passe : `jugement/generation/essais-rapide-2/<modele>--<note>--<passe>.json`.
