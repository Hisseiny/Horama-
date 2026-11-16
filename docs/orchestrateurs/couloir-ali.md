# Couloir Ali : l'agent

Orchestrateur : Claude Code (Fable 5.2) sur le Mac d'Ali. Branche de couloir : `dev-ali`. Méthode : `docs/orchestrateurs/methode.md`.

Dossiers du couloir : `agent/`, outillage de la racine (scripts, lint, configuration TypeScript commune, sans toucher à `contrats/` ni à `base/migrations/001_init.sql`), `docs/retours-api-h.md`, `docs/journal-ali.md`, `docs/captures/` (ses dossiers), `docs/decisions/` (ses fichiers), `scripts/verifier-cles-ali.mjs`.

Variables `.env.local` utiles : `HAI_API_KEY`, `HAI_API_KEY_DEMO` (jamais en développement), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FAUX_SAAS_URL`, `FACTURO_LOGIN`, `FACTURO_PASSWORD`, `VAULT_PATH=./vault-horama`.

Doc H : https://hub.hcompany.ai (lire `agents-api/agents/create.md`, `sessions/create.md`, `sessions/changes.md`, `sessions/event-object.md`, `sessions/resources.md`, `custom-tools.md`, `sessions/tool-results.md`, `structured-output.md`, `sessions/share.md`). Démo QA de référence : https://github.com/hcompai/agents-api-demos (`examples/software_qa`).

## Tâches, dans l'ordre

| N° | Tâche | Fini quand (l'orchestrateur le vérifie) |
|---|---|---|
| A0 | T0 (clés) et T6 (Devin rend la main) | Codes 200, fichier T6 créé |
| A1 | Outillage : `pnpm -r check` lance types, lint et tests dans chaque paquet ; paquet `agent/` (`@horama/agent`) qui importe `@horama/contrats` | Un clone neuf : `pnpm install && pnpm -r check` vert |
| A2 | T1 et T5 : agent `horama-testeur` défini (navigateur web, environnement 1280 × 900 avec `markdown: true`, URL de départ déjà authentifiée `/vXX/entrer?suite=…`, `max_time_s` 180, consigne inspirée de `software_qa`, outils `relever(ecran, vue)` et `terminer(etat, raison)`, `answer_format`) ; une session sur une page publique simple en attendant le faux SaaS, puis sur le faux SaaS dès que `dev` contient `docs/decisions/2026-11-16-url-faux-saas.md` (vérifier `git fetch` toutes les 15 min) | T1 et T5 tenus, 3 sur 3 (dont : deux sessions v12, même écran et même vue, 0 zone de différence au-dessus du seuil écrit par le couloir Nathan ; on note si une session abandonnée garde sa place dans le quota) ; résultats et surprises dans `docs/retours-api-h.md` |
| A3 | Lecteur de tests C2 : lit `vault-horama/<logiciel>/tests/*.md` (en-tête, sections, bloc `regles`), construit la tâche de la session (identifiants de démo injectés dans la consigne, jamais dans le fichier) | Les 3 tests livrés par le couloir Nathan sont lus sans perte |
| A4 | Coureur `CoureurAgent` : `lancerPassage` crée le passage en base, une session par test (3 au plus, `queue: false`, 429 géré), suit `GET /sessions/{id}/changes`, écrit chaque étape (C3 `EvenementFil`, libellé court en français), télécharge l'image de l'observation à chaque `relever`, vérifie que `metadata.url` correspond à l'écran (sinon le relevé est refusé et le test finit `non_concluant`), la range dans le seau `captures`, écrit la ligne `captures` par upsert sur (passage, test, écran, vue) (l'outil peut être exécuté deux fois), répond à l'outil ; abandon d'une session sans action après 45 s et une relance, puis `non_concluant` ; coût et étapes depuis `MetricsUpdateEvent` ; lien de replay public (`share`) ; `attendreFin` écrit le rapport C6 et passe `passages.etat` à `joue`. Tout cela tourne dans le processus du script de passage (A5) : les outils de H ne sont servis que tant que ce processus suit les sessions | Un passage de 3 tests sur la v13 : chaque écran listé a sa capture et son texte en base, rapport complet, 3 passages de suite |
| **Porte** | **Planche** `docs/captures/2026-11-16-porte-agent/index.html` : les captures d'un passage réel, le fil horodaté, les liens de replay, durée et coût ; ouverte dans Chrome ; **attendre le « go » d'Ali**. Puis PR `dev-ali` vers `dev` | « go » d'Ali |
| A5 | Script (lancé aussi par l'app en processus détaché) `pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --tests a,b --r ca-mois` (pour le banc et pour lancer le passage complet avant le pitch), option `--cle demo` | Le script joue un passage et rend l'identifiant |
| A6 | Passage de référence v12 : mêmes tests sur `/v12` (vues présentes en v12 seulement), captures prêtes à devenir références (le couloir Nathan les désigne) | Une capture v12 par (écran, vue), même taille que v13 |
| A7 | Robustesse et mesure : médiane de durée du test en direct sur 5 essais, durée et coût d'un passage complet, sessions figées rencontrées ; `docs/retours-api-h.md` complété | Chiffres mesurés dans le journal ; médiane du test en direct sous 90 s ou cause écrite |

Dépendances envers le couloir Nathan : les tables Supabase (N1, fait en premier) avant A4 ; l'URL du faux SaaS et les 3 tests C2 (N3) avant la fin de A2 et A3. En attendant, avance sur une page publique et sur `contrats/exemples.ts`.

Après la porte, ne t'arrête plus sauf cas de la section 8 de la méthode ; ouvre une PR vers `dev` après A4 et A7.
