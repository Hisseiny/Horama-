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

Vérification : `pnpm --filter @horama/agent check` ou `pnpm -r check`.
Preuves et limites : `docs/tests/2026-11-16-a3-a4-agent.md`.
