# Rapports du vault et test mémoire : proposition de correction

Statut : proposition à valider par les responsables ; aucune correction de code dans ce ticket.

Base examinée : `dev`, `a22f812001881504f1b0305464e4734b9f4e8aef`. Branche indépendante : `a-conflit-vault-memoire`.

## Constat et cause

Le défaut signalé est documenté dans `docs/tests/2026-11-17-a5-trois-passages-agent-h.md`, section rapports : trois passages réels ont écrit trois Markdown dans `vault-horama/facturo/passages/`, provoquant `13 !== 10`. Cette preuve indique que les trois rapports ont ensuite été archivés hors du dépôt. Cela explique l’absence actuelle du défaut : `git ls-files vault-horama/facturo/passages` ne rend que `.gitkeep` et `pnpm install && pnpm -r check` sur `dev` termine avec code 0, dont mémoire 28 réussites et 0 échec. Les passages H historiques n’ont pas été rejoués et leurs artefacts externes n’ont pas été inspectés ici.

Chaîne vérifiée dans le code actuel :

1. `agent/src/cli.ts:68` choisit `--vault`, ou par défaut le `vault-horama` du dépôt (ce chemin ne dépend pas du répertoire courant). `executerPassage` transmet ce même vault au lecteur des tests et au coureur (`:78`, `:93`). La variable `VAULT_PATH` n’est pas lue dans ce chemin CLI.
2. `agent/src/coureur.ts`, `creerCoureur`, initialise `writeReport = ecrireRapportPassage`. Son `finish` appelle `writeReport(vault, report, [])` à la finalisation, avant la persistance en base. Ce n’est pas conditionné à la réussite des vérifications. L’option injectée `writeReport` peut remplacer cette fonction dans les tests, mais la CLI normale ne la remplace pas.
3. `memoire/src/reports.ts`, `ecrireRapportPassage`, crée `<vault>/<logiciel>/passages/` et écrit `<id>.md` ; avec la CLI par défaut, il s’agit bien de `vault-horama/facturo/passages/`.
4. `memoire/tests/vault.ts`, `temporaryVault`, copie récursivement le véritable vault du dépôt : tout rapport local, même non suivi par Git, entre dans la copie des tests.
5. `memoire/tests/traces.test.ts:88-103`, test « derniersFichiers : les plus récents d'abord, sans dossiers ni fichiers cachés », ajoute notamment `facturo/decisions/recent.md`. À la ligne 103 : `assert.equal(derniersFichiers(vault, 100).length, 10)`.
6. `memoire/src/files.ts`, `derniersFichiers`, parcourt récursivement tous les fichiers non cachés ; les Markdown de rapports sont donc légitimement inclus. Aucun filtre n’exclut `passages/`. Le `.gitkeep` est, lui, ignoré.

Ce n’est pas une erreur du nombre de tests acceptés ni une erreur de contrat : l’assertion compte les fichiers du vault, dont le contenu est mutable. Remplacer 10 par 13 ne résoudrait pas le prochain passage.

## Contre-vérification et reproduction isolée

Pour tenter d’infirmer la cause, le check initial a été exécuté avant toute modification : il réussit sur le vault actuel. Puis une copie jetable du vault a été créée sous `/home/ubuntu/horama-vault-investigation-*`, sans écrire dans le vault du dépôt. Un `recent.md` a été ajouté comme dans le test, puis trois appels au véritable `ecrireRapportPassage` ont été faits avec `c6Rapport`, des identifiants distincts et aucun résultat de vérification. Appels de comptage au véritable `derniersFichiers(copie, 100)` ; assertions explicites à 10 puis à 13. Sortie réelle :

```text
Copie du vault + recent.md : 10
Après trois rapports : 13
Reproduction isolée : assertions 10 puis 13 vérifiées ; vault du dépôt inchangé.
```

Code de sortie : 0. La copie est supprimée dans un `finally`. Cette reproduction vérifie l’effet causal des trois rapports avec les fonctions actuelles ; elle ne prétend pas rejouer les sessions H historiques ni exécuter le test original en échec. Aucun secret ni appel réseau.

## Options

1. **Recommandée : isoler le test mémoire de l’état du vault vivant.** Le responsable de `memoire/` (couloir Nathan selon les contrats et le couloir Ali, attribution à confirmer avec l’équipe) doit construire un petit fixture maîtrisé pour ce test : fichiers ordinaires, fichiers cachés, sous-dossiers, dates explicites. Vérifier la liste triée, la limite, le total connu de ce fixture, le dossier vide et l’inclusion de rapports ordinaires. Garder séparément les tests d’intégration qui lisent réellement les notes et les tests du vault. Inès valide que les rapports restent à leur emplacement produit. Aucun changement des contrats ni du comportement de `derniersFichiers`.
2. **Alternative minimale côté mémoire :** mesurer le nombre initial dans la copie, puis vérifier les ajouts attendus au lieu d’un total figé. Moins robuste : le tri reste exposé à des dates futures et à d’autres fichiers ajoutés au vault. À choisir seulement comme dépannage par le propriétaire de mémoire.
3. **Contournement côté Ali, sans modifier mémoire :** fournir `--vault` vers une copie de travail complète du vault hors dépôt lors des essais H. Cette option existe déjà et déplace à la fois la source des tests et la destination des rapports ; elle ne permet pas de choisir uniquement un dossier de rapports. Inès et Ali doivent s’accorder sur la synchronisation. L’agent expose aussi l’injection interne `writeReport` ; une configuration séparée pour les rapports pourrait être ajoutée dans `agent/` sans changer C1–C8, mais la CLI ne la propose pas aujourd’hui. Ce serait une évolution produit à approuver, pas le correctif recommandé d’un test fragile.
4. **À éviter :** supprimer ou déplacer systématiquement les rapports après un passage, les exclure du lecteur générique de fichiers, ou remplacer 10 par 13. Cela masque le couplage au fixture vivant ou retire des traces attendues dans Obsidian. Un `.gitignore` n’empêche pas la copie récursive des fichiers locaux.

## Décision demandée et partage

Demander au responsable de mémoire une PR dédiée pour l’option 1, relue par Inès pour les attentes du vault et par Ali pour l’intégration. Critère : le test réussit avec zéro, un ou plusieurs rapports déjà présents dans le vault, conserve ses vérifications de tri/limite/fichiers cachés, et ne modifie jamais le vault du dépôt. Puis `pnpm -r check` depuis `dev` à jour, avant et après un passage d’essai vers un vault de travail.

Ali ne modifie ici ni `memoire/`, ni `vault-horama/`, ni les contrats gelés. Aucun changement de destination des rapports n’est effectué. Le défaut reste possible après un nouveau passage CLI utilisant le vault du dépôt, tant que le fixture du test n’est pas isolé.
