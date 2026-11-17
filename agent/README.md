# Coureur de passages

`construireConsigne` lit les tests acceptés et les notes avec `@horama/memoire`.
Le texte, les vues et l'ordre du parcours suivent
`automatisation/scene/parcours.mjs` ; chaque couple écran/vue appartient au
premier test qui le demande. Le Markdown et les règles restent disponibles
dans `consigne.tests`.

`creerCoureur` reçoit `vault`, `base` et `relever`. La base est créée par
`creerBaseSupabase()` côté serveur (variables `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY`), ou par `new BaseMemoire()` pour les tests.
Le hook `relever` rend le PNG, le texte, l'URL, les dimensions, le défilement
et la phrase à renvoyer à H. Une adresse incompatible avec l'écran/vue
demandé n'est pas enregistrée. Les relevés déjà enregistrés ne sont pas repris.

La session par défaut est un port TypeScript de `runSession`, sans importer
le lanceur de scène. Fournir `h.navigateur`, une fonction qui prépare l'onglet
et démarre un nouveau pont local à chaque tentative, puis rend
`{ channel, stop, failed? }`. Le couloir scène reste propriétaire de Chrome,
du pont et des captures. La clé H vient de `HAI_API_KEY` par défaut ; la clé
de démonstration n'est sélectionnée que par `cle: "demo"`.
Pour les tests sans H, fournir une fonction `session` : elle appelle
`onCreated(id)`, puis les callbacks `onStep` et `onTool`, et rend
`{ id, fin: Promise<ResultatSession> }`.

`lancerPassage` rend l'identifiant après la création de session ; le processus
doit rester vivant jusqu'à `attendreFin`. Une session sans nouvel événement
pendant 45 secondes est abandonnée puis relancée une fois, après la pause
de 35 secondes du port H. Les erreurs d'écriture sont signalées, sans
interrompre les outils ; le rapport du passage finit alors en échec.
Le coût et la durée partagés sont répétés dans chaque entrée de test :
utiliser `rapport.passage` pour les totaux, ne pas sommer les entrées.
Le port H ne crée pas de lien de partage ; une session injectée peut rendre
`replay_url`, qui sera conservé dans le rapport.

La fin du passage écrit aussi le rapport via `@horama/memoire` dans
`<vault>/<logiciel>/passages/<id>.md` (cadrage, section 10).
`attendreFin` attend cette écriture ainsi que celle en base. Une erreur du
vault est signalée et rend le passage en échec en base ; aucun résultat
métier n’est inventé : sans C4, le Markdown indique zéro réussite et des
tests non concluants. Les tests utilisent une copie temporaire du vault.

Vérification : `pnpm --filter @horama/agent check` ou `pnpm -r check`.
Preuves et limites : `docs/tests/2026-11-16-a3-a4-agent.md`.

## Commande de passage et référence v12

```sh
pnpm --filter @horama/agent passage -- --help
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --tests ca-du-mois-egal-total,detail-facture-total-egal-liste,liste-factures-filtre-echeance --r ca-mois
pnpm --filter @horama/agent passage -- --logiciel facturo --version 12 --reference 12
```

La troisième commande est le mode A6 : mêmes tests demandés, routes `/v12`,
tests nécessitant une vue plus récente exclus par la consigne. Un seul PNG
par couple écran/vue est stocké, à 1280 × 900, DPR 1, comme pour v13.
Ces captures ne sont pas promues automatiquement en références validées.
Sans `--tests`, tous les tests acceptés du logiciel sont sélectionnés.

Le script imprime l’identifiant dès la création, puis attend la fin du
passage pour continuer à servir les outils. Il sort avec 1 en cas d’échec.
Il exige les variables serveur Supabase et la clé H ; `--cle demo` seul
sélectionne la clé réservée, jamais utilisée dans les essais de développement.

Chrome dédié doit déjà écouter en CDP sur 9333 (`--chrome-port` pour changer),
avec `--force-device-scale-factor=1` et une zone de page ajustable à 1280 × 900.
Le raccord réutilise `connectTab`, `fitViewport`, `evaluate`, `findHolo` et
`startBridge`, déjà disponibles dans `automatisation/scene` sur `dev`.
`connectTab` garde un seul onglet : ne pas utiliser le navigateur personnel.
Le hook de capture dans `agent/src/browser.ts` ne navigue pas ; H joue le parcours.
Un nouveau pont `holo local browser` est préparé par tentative, ses journaux
restent dans `~/.horama/ponts/`. `HOLO_BIN` permet de choisir l’exécutable.
Les connexions et ponts sont fermés à la fin ; Chrome est laissé ouvert.

Ce câblage n’a pas été joué avec H : attente de la clé Horama autorisée.
