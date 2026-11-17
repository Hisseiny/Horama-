# Proposition : jonction scène / coureur

17 novembre 2026 — **à valider par Hisseiny/Nathan pendant le point de 15 minutes**. Cette proposition décrit le code actuel, sans changement de code ni de contrat gelé.

## 1. Périmètre proposé

La scène et le coureur tournent sur le même Mac. La scène lance un processus CLI depuis la racine du dépôt, conserve ses flux et son état, puis lit Supabase pour afficher la progression. Pas de nouvelle API HTTP locale.

Cette jonction précise le lancement et le suivi, pas toute la chorégraphie de [la scène en direct](2026-11-16-scene-en-direct.md). La [direction artistique](2026-11-17-da-de-la-scene.md) ne change pas cette interface. La vérification immédiate, les surlignages et la relecture de ces décisions ne sont pas automatiquement fournis par cette CLI.

## 2. Appel du coureur

Gabarit demandé, où les chevrons sont des paramètres à remplacer, non une commande shell prête à coller :

```text
pnpm --filter @horama/agent passage -- --logiciel facturo --version <v> --reference <v> --tests <ids séparés par des virgules> --base-url https://facturo-demo.vercel.app
```

La version testée et la version de référence peuvent différer. La scène devrait fournir chaque argument séparément au lancement du processus, sans construire une commande shell à partir d’entrées non contrôlées.

Options réellement acceptées par `lireArguments` (`agent/src/cli.ts`) :

| Option | Comportement |
|---|---|
| `--logiciel`, `--version`, `--reference` | Obligatoires ; versions numériques, identifiant logiciel validé |
| `--tests a,b` | Facultatif ; identifiants acceptés, dédupliqués ; sans option, tous les tests acceptés du logiciel. Un identifiant inconnu est refusé avant clés, base, navigateur et H |
| `--base-url URL` | Origine HTTP(S) du SaaS ; prioritaire sur `FAUX_SAAS_URL`. Le chemin de départ vient du C2, adapté à la version par `construireConsigne`, pas de cette option |
| `--vault chemin` | Vault complet en lecture/écriture ; par défaut celui du dépôt. Pour la démo, convenir d’une copie externe afin de ne pas y déposer les rapports |
| `--chrome-port 9333` | Port CDP, 9333 par défaut. **`--port` n’existe pas** |
| `--cle dev` | Défaut ; utiliser la clé de développement autorisée. Le parseur accepte aussi `demo`, mais son utilisation est interdite pour ce travail |
| `--r a,b` | Régressions à activer, facultatives ; ne pas les ajouter implicitement |
| `--help` | Seul, affiche l’aide sans passage |

`--reference` renseigne le rapport : ni comparaison calculée ni promotion des captures en références. Les tests sélectionnés sont chaînés dans une session, avec une relance possible, pas une session simultanée par test.

## 3. Sorties et cycle du processus

`lancerCommande` attend `runner.lancerPassage(input)`, écrit `passage_id` par `console.log`, puis attend `runner.attendreFin(passage_id)`. Le processus doit rester vivant pour répondre aux outils H.

**Nuance sur « dès le lancement, avant la fin » :** `lancerPassage` attend d’abord l’insertion initiale en base puis la création de la session H via `launch()`. L’identifiant est donc émis avant l’attente explicite de fin, mais pas avant ces opérations ; une exécution très rapide peut déjà avoir fini lors de son affichage. Une création H refusée finalise autant que possible un passage en échec puis lève une erreur : aucun identifiant n’est alors imprimé par la CLI, même si une ligne existe en base.

Proposition pour la scène : lire stdout au fil de l’eau, reconnaître la ligne d’identifiant et conserver stderr séparément. La CLI ne fournit pas de protocole JSON de lancement ; l’enveloppe pnpm peut ajouter ses propres messages. Ne pas confondre `passage_id` et `session_id` H.

`agent/passage.ts` laisse la sortie à **0** pour un passage `joue`, la fixe à **1** sinon ou en cas d’exception. L’aide sort également à 0, sans passage. Les erreurs applicatives et avertissements vont sur stderr ; l’identifiant inconnu est explicite, les autres exceptions ont un message générique. Les journaux du pont sont dans `~/.horama/ponts/`.

Les gestionnaires de `lancerCommande` ferment le raccord navigateur puis quittent à **130** sur SIGINT et **143** sur SIGTERM. Ils ne sont installés qu’après l’initialisation du navigateur. Ce sont les codes du processus CLI, pas une garantie de propagation à travers toute enveloppe pnpm. Une interruption ne garantit ni annulation de H ni PATCH final en base ; ne pas présenter un passage resté `en_cours` comme terminé.

## 4. Suivi Supabase : ordre des écritures et colonnes

Sources : `creerCoureur` dans `agent/src/coureur.ts`, `creerBaseSupabase` dans `agent/src/base.ts`, C3/C6 dans `contrats/types.ts`. Pour lire, filtrer `passages` par `id`, et `evenements`/`captures` par `passage_id`.

1. **Avant la création H :** POST `passages`, avec `id`, `logiciel`, `version_testee`, `version_reference`, `etat: en_cours`, `debut`.
2. **Pendant la session :** chaque `onStep` POST dans `evenements` : `passage_id`, `test_id`, `session_id`, `horodatage`, `etape`, `action`, `etat_session` ; C3 prévoit aussi `capture_url`, facultatif. Lire le fil par `horodatage`, sans supposer une étape globale unique : `etape` repart à zéro à chaque création de session. Une relance change `session_id`.
3. **À chaque relevé accepté :** dépôt du PNG dans le bucket `captures`, chemin `<passage_id>/<test_id>/<ecran>--<vue>.png`, puis POST avec fusion dans la table `captures` sur `(passage_id,test_id,ecran,vue)`. Colonnes écrites : `passage_id`, `test_id`, `session_id`, `ecran`, `vue`, `version`, `chemin`, `url`, `largeur`, `hauteur`, `defilement`, `texte_page`, `url_page`, `etape`, `prise_le`. La scène utilise `url` pour l’image, `url_page` pour le contexte. Un relevé répété déjà acquis n’est pas redéposé ; des écrans partagés entre tests peuvent être mutualisés : ne pas exiger une capture par test et par événement.
4. **À la finalisation :** construction C6, écriture Markdown dans `<vault>/<logiciel>/passages/`, puis PATCH `passages?id=eq.<id>` avec les champs du passage final et `rapport` (C6). Le PATCH ajoute `fin`, `duree_s`, `cout_usd` et fixe `etat` à `joue` ou `echec`. `cout_usd` peut être nul : inconnu, pas zéro. `rapport.tests` contient `test_id`, `session_id`, `etat`, éventuellement `raison`, `ecrans_releves`, éventuellement `replay_url`, `duree_s`, `cout_usd`, `etapes`. Les métriques de la session sont répétées par test : ne pas les sommer.

Il n’y a pas de transaction globale événements/captures/rapport. Les étapes et relevés s’entrelacent ; aucun ordre total entre ces deux tables n’est promis. Proposition de suivi : relire les lignes filtrées pendant le processus, puis une dernière fois après sa sortie. Ni Realtime ni fréquence de polling ne sont imposés par le coureur.

**Marqueur normal de fin :** `passages.fin` renseigné et `etat` terminal du coureur (`joue`/`echec`), accompagnés de `rapport` après un PATCH réussi. Le contrat autorise aussi `verifie`, écrit par l’autre couloir ; ce n’est pas la CLI qui le produit. Ne pas déduire la fin du dernier événement, du nombre de captures ou d’un `etat_session` isolé.

**Limites réelles :** les écritures passent par `safe` : une panne est signalée sur stderr, le parcours continue et sera localement en échec. Une insertion initiale ratée peut donc être suivie d’une tentative H. Si le dernier PATCH échoue, le rapport retourné au processus est marqué `echec`, mais la base peut rester `en_cours`, absente ou incomplète ; `base.ts` ne contrôle pas le nombre de lignes affectées par le PATCH. La scène doit croiser état du processus, stderr et lecture finale, et signaler une persistance non confirmée plutôt qu’attendre indéfiniment.

## 5. Prérequis sur le Mac de démo

- Dépôt installé avec pnpm et Node compatible avec l’exécution native TypeScript ; variables serveur chargées avant le lancement, ou par le `.env.local` racine lu par `agent/src/environment.ts`.
- Noms des variables seulement : `HAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ; `HOLO_BIN` si holo n’est pas trouvé dans le PATH. Facultatives : `FAUX_SAAS_URL`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. Aucun secret dans les arguments, les logs ou le navigateur ; la scène ne transmet pas la clé de service à son interface publique.
- Projet Supabase avec les tables et le bucket `captures` attendus ; accès H autorisé et réseau disponible. La CLI ne fait pas de préflight quota automatique.
- Chrome dédié déjà ouvert en CDP sur le port choisi, avec `--force-device-scale-factor=1`. Zone de page **1280 × 900, DPR 1**, pas simplement taille extérieure de fenêtre : le raccord ajuste puis contrôle ces dimensions. Garder un onglet dédié, la fenêtre visible et ne pas interférer avec les clics.
- `holo` disponible (paquet Python `hai-agents[cli,browser]`). La CLI démarre et arrête elle-même le pont `holo local browser` via `agent/src/browser.ts` ; éviter un second pont concurrent lancé par la scène. Un seul parcours à la fois sur ce Chrome.
- Vault externe complet contenant les C2 sélectionnés, accessible en écriture pour les rapports. Cette proposition n’atteste pas d’un essai sur le Mac ni du rendu de la couche artistique.

## 6. Hors périmètre et questions du point

Pas de nouvelle API HTTP, pas de C4 automatique (ni verdict `PASS` déduit de `joue`/`termine`), pas de D6 : ni déclenchement Vercel ni sélection par diff/`code:`. Aucun changement de C1–C8. Aucun nouveau passage H lancé pour cette proposition.

1. Valide-t-on une scène qui lance cette CLI et lui laisse l’exclusivité du pont et des captures, ou faut-il ultérieurement raccorder le `relever` enrichi de Nathan pour la vérification et l’habillage en direct ? La CLI actuelle utilise son propre `runtime.relever`, pas cette vérification enrichie.
2. Quel délai et quelle présentation retenir côté scène quand aucun identifiant ne sort ou quand le processus sort sans fin persistée ? Le protocole actuel ne permet pas d’attribuer sans ambiguïté une ligne créée avant l’échec H à un lancement qui n’a pas émis son identifiant.

La checklist actuelle est organisée par phases, sans section A : elle est laissée inchangée. Ce ticket ajoute uniquement la présente proposition de décision.
