# T4 : génération des tests par un modèle ouvert (routeur Hugging Face)

Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.

## Ce qui a été lancé

- Commande, depuis la racine du repo : `node --env-file=/Users/nathan/Code/projet/horama/.env.local jugement/scripts/t4-generation.ts`
- Début : 2026-11-16T17:54:21.656Z ; durée totale : 357,1 s.
- Code : commit `74572cd`, sans modification non commitée de `jugement/` ni de `memoire/`.
- Modèles : `openai/gpt-oss-120b`, `Qwen/Qwen3.8-27B` ; réserve `zai-org/GLM-5.3-Flash` : non lancée (chaque modèle a répondu au moins une fois).
- 3 notes (`notes-de-version/v13.md`, `produit/liste-des-factures.md`, `produit/regles-entre-ecrans.md`), 3 passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.

Comment chaque mesure est calculée :
- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».
- Règles justes : pour les deux notes de `produit/`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par `lireNotes` ; pour `notes-de-version/v13.md`, il y a 2 tests, l'un porte la règle `filtre` attendue (condition `< aujourd_hui` ou `<= aujourd_hui`) avec un relevé de `liste-des-factures` dans une vue autre que `defaut` et au moins une question, l'autre cite « Exporter », relève `liste-des-factures` en vue `defaut` et ne porte aucune règle.
- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.

## Ce qui en est sorti

**Aucun modèle ne tient le critère de T4.** Le meilleur est `openai/gpt-oss-120b` (2 note(s) sur 3 réussie(s) aux 3 passes, temps médian 16,3 s). Repli prévu par la spec : afficher un test pré-généré, présenté comme tel.

Modèle par défaut de `proposerTests` dans le code au moment du lancement : `openai/gpt-oss-120b`, c'est bien lui.

### openai/gpt-oss-120b

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

### Qwen/Qwen3.8-27B

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

### Chaque passe

| Modèle | Note | Passe | Format C1 valide | Règles justes | Essais | Temps (ms) | Jetons en entrée | Jetons en sortie | Écrits et relus |
|---|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b` | `notes-de-version/v13.md` | 1 | oui | oui | 2 | 14344 | 5072 | 2716 | oui |
| `openai/gpt-oss-120b` | `notes-de-version/v13.md` | 2 | oui | oui | 1 | 14163 | 2223 | 1986 | oui |
| `openai/gpt-oss-120b` | `notes-de-version/v13.md` | 3 | oui | oui | 1 | 15131 | 2223 | 1972 | oui |
| `openai/gpt-oss-120b` | `produit/liste-des-factures.md` | 1 | oui | oui | 2 | 14797 | 5730 | 1827 |  |
| `openai/gpt-oss-120b` | `produit/liste-des-factures.md` | 2 | oui | oui | 2 | 16260 | 5704 | 1396 |  |
| `openai/gpt-oss-120b` | `produit/liste-des-factures.md` | 3 | oui | oui | 1 | 16786 | 2600 | 1838 |  |
| `openai/gpt-oss-120b` | `produit/regles-entre-ecrans.md` | 1 | oui | oui | 1 | 23830 | 2634 | 2443 |  |
| `openai/gpt-oss-120b` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 18340 | 2634 | 1800 |  |
| `openai/gpt-oss-120b` | `produit/regles-entre-ecrans.md` | 3 | non | non | 2 | 26772 | 6240 | 4298 |  |
| `Qwen/Qwen3.8-27B` | `notes-de-version/v13.md` | 1 | non | non | 1 | 45007 | à mesurer | à mesurer |  |
| `Qwen/Qwen3.8-27B` | `notes-de-version/v13.md` | 2 | non | non | 1 | 45008 | à mesurer | à mesurer |  |
| `Qwen/Qwen3.8-27B` | `notes-de-version/v13.md` | 3 | non | non | 1 | 45008 | à mesurer | à mesurer |  |
| `Qwen/Qwen3.8-27B` | `produit/liste-des-factures.md` | 1 | non | non | 1 | 45006 | à mesurer | à mesurer |  |
| `Qwen/Qwen3.8-27B` | `produit/liste-des-factures.md` | 2 | non | non | 1 | 45007 | à mesurer | à mesurer |  |
| `Qwen/Qwen3.8-27B` | `produit/liste-des-factures.md` | 3 | oui | oui | 1 | 16235 | 2686 | 6064 |  |
| `Qwen/Qwen3.8-27B` | `produit/regles-entre-ecrans.md` | 1 | non | non | 1 | 45004 | à mesurer | à mesurer |  |
| `Qwen/Qwen3.8-27B` | `produit/regles-entre-ecrans.md` | 2 | oui | oui | 1 | 25735 | 2711 | 8012 |  |
| `Qwen/Qwen3.8-27B` | `produit/regles-entre-ecrans.md` | 3 | non | non | 1 | 45006 | à mesurer | à mesurer |  |

## Ce qui a échoué

- `openai/gpt-oss-120b`, `produit/regles-entre-ecrans.md`, passe 3 : Tests refusés après 2 essais (openai/gpt-oss-120b, produit/regles-entre-ecrans.md) : test 1 : le passage « phrase : Le « CA du mois » du [[tableau-de-bord]] est égal au total de la [[liste-des-factures]]. » n'est pas recopié mot pour mot de la note ; test 2 : le passage « phrase : Le « Total TTC » du [[detail-facture]] est égal au montant de la même facture dans la [[liste-des-factures]]. Facture témoin : F-119. » n'est pas recopié mot pour mot de la note
- `Qwen/Qwen3.8-27B`, `notes-de-version/v13.md`, passe 1 : Génération impossible (Qwen/Qwen3.8-27B, notes-de-version/v13.md) : délai de 45 s dépassé
- `Qwen/Qwen3.8-27B`, `notes-de-version/v13.md`, passe 2 : Génération impossible (Qwen/Qwen3.8-27B, notes-de-version/v13.md) : délai de 45 s dépassé
- `Qwen/Qwen3.8-27B`, `notes-de-version/v13.md`, passe 3 : Génération impossible (Qwen/Qwen3.8-27B, notes-de-version/v13.md) : délai de 45 s dépassé
- `Qwen/Qwen3.8-27B`, `produit/liste-des-factures.md`, passe 1 : Génération impossible (Qwen/Qwen3.8-27B, produit/liste-des-factures.md) : délai de 45 s dépassé
- `Qwen/Qwen3.8-27B`, `produit/liste-des-factures.md`, passe 2 : Génération impossible (Qwen/Qwen3.8-27B, produit/liste-des-factures.md) : délai de 45 s dépassé
- `Qwen/Qwen3.8-27B`, `produit/regles-entre-ecrans.md`, passe 1 : Génération impossible (Qwen/Qwen3.8-27B, produit/regles-entre-ecrans.md) : délai de 45 s dépassé
- `Qwen/Qwen3.8-27B`, `produit/regles-entre-ecrans.md`, passe 3 : Génération impossible (Qwen/Qwen3.8-27B, produit/regles-entre-ecrans.md) : délai de 45 s dépassé

Premiers essais refusés par le code, puis rattrapés ou non au second :
- `openai/gpt-oss-120b`, `notes-de-version/v13.md`, passe 1 : test 2 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b`, `produit/liste-des-factures.md`, passe 1 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b`, `produit/liste-des-factures.md`, passe 2 : test 1 : « etapes » doit être une liste d'au moins 1 élément(s)
- `openai/gpt-oss-120b`, `produit/regles-entre-ecrans.md`, passe 3 : test 1 : le passage « phrase : Le « CA du mois » du [[tableau-de-bord]] est égal au total de la [[liste-des-factures]]. » n'est pas recopié mot pour mot de la note ; test 2 : le passage « phrase : Le « Total TTC » du [[detail-facture]] est égal au montant de la même facture dans la [[liste-des-factures]]. Facture témoin : F-119. » n'est pas recopié mot pour mot de la note

Réponses brutes de chaque passe : `jugement/generation/essais/<modele>--<note>--<passe>.json`.
