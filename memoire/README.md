# @horama/memoire

Lit et écrit le vault (`vault-horama/`) par le système de fichiers : ni interface, ni base de données, ni variable d'environnement. Chaque fonction reçoit la racine du vault en premier argument. Les types viennent de `@horama/contrats`.

Vérifier : `pnpm --filter @horama/memoire run check` (types, puis tests sur une copie temporaire du vault).

## Fonctions

**Notes et règles**
- `lireNotes(vault, logiciel)` : les notes de `produit/` et de `notes-de-version/` (`chemin`, `entete`, `titre`, `texte`, `regles`). Une règle : `{ phrase, regle, ligne }`, `regle` vaut `null` si la puce n'a pas de ligne `regle:`.
- `analyserLigneRegle(ligne, ecranDeLaNote)` : une ligne `regle: … | cle: valeur` devient une `Regle`.
- `verifierRegle(regle)` : rend la `Regle` avec les seuls champs du contrat, dans l'ordre du contrat ; lève une erreur qui dit pourquoi si ce n'en est pas une.
- `urlDepart(vault, logiciel, version, ecran)` : `/v<version>/entrer?suite=/v<version><url de l'écran>`.

**Tests acceptés (C2)**
- `ecrireTestAccepte(vault, propose, { url_depart, version_cible, timeout_s, accepte_par, accepte_le })` : écrit `<logiciel>/tests/<id>.md` (en-tête, phrase finale de la section Task et bloc `regles` écrits par le code), rend le `TestAccepte`.
- `lireTestAccepte(vault, logiciel, id)`, `lireTestsAcceptes(vault, logiciel)` : seuls les fichiers `statut: accepte`.

**Décisions (C5) et mémoire**
- `ecrireDecision(vault, decision)` : écrit `<logiciel>/decisions/<id>.md`, rend son chemin. Le bloc `decision` (JSON) fait foi à la lecture.
- `lireDecisions(vault, logiciel)`.
- `appliquerCorrection(vault, decision)` : remplace `avant` par `apres` dans la note (une seule occurrence exigée), passe la correction à `acceptee`.
- `refuserCorrection(vault, decision)` : passe la correction à `refusee`, la note n'est pas touchée.
- `decisionQuiNeutralise(ecart, version, decisions)` : la décision « voulu » de même écran, même vue, même version, dont la zone recouvre celle de l'écart, sinon `null`.
- `peutValiderReference(ecarts, decisions, version)` : `{ ok, raison }`, règle F32. À appeler avant `ecrireReference`.

**Références, rapports, fichiers récents**
- `ecrireReference(vault, logiciel, ecran, vue, version, png)` : écrit `<logiciel>/references/<ecran>/<vue>--v<version>.png`, rend le chemin relatif au vault.
- `lireReferences(vault, logiciel)` : `{ ecran, vue, version, chemin }`.
- `ecrireRapportPassage(vault, rapport, resultats)` : écrit `<logiciel>/passages/<id>.md`, rend son chemin. Seuls les tests `PASS` comptent comme réussites.
- `derniersFichiers(vault, n)` : les `n` fichiers modifiés le plus récemment (`chemin`, `date`), sans dossiers ni fichiers cachés.

## Pour l'app qui consomme le paquet

Le paquet est livré en TypeScript, avec des imports en `.ts` (Node 26 l'exécute tel quel). Une app Next.js doit le déclarer dans `transpilePackages` et activer `allowImportingTsExtensions` dans son `tsconfig.json`. Il utilise `node:fs` : côté serveur seulement.
