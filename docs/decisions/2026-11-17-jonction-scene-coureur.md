# Décision : jonction directe scène / coureur

17 novembre 2026 — **jonction tranchée par Hisseiny**. Cette décision remplace la proposition de lancement par la CLI. Vérification du code sur `origin/dev` au commit `a83067c4391cbbf2c36aa086273ae3efc81f78b3`, après fusion des PR #18 (C4) et #19 (Dolibarr). Le raccordement décrit reste à réaliser côté scène ; ce document ne change ni le code ni les contrats gelés.

## 1. Répartition retenue

La scène et le coureur vivent dans le même processus sur le Mac de démo. **La scène appelle directement `creerCoureur`**, sans lancer de processus CLI et sans nouvelle API HTTP.

- **Scène :** Chrome, pont holo, couche artistique, paroles et attentes de la mascotte, capture avec la couche masquée. Elle fournit son crochet `relever` et une fabrique de pont via `h.navigateur`.
- **Coureur :** construction du parcours depuis C2, session H, outils, suivi des étapes, relance d'une session muette, validation et persistance des relevés, calcul C4, écriture de `resultats`, rapport Markdown et fin C6.
- **Scène après le parcours :** lecture des résultats persistés, présentation et décisions humaines C5 ; écriture des décisions, puis transition du passage vers `verifie`.

La [scène en direct](2026-11-16-scene-en-direct.md) et sa [direction artistique](2026-11-17-da-de-la-scene.md) restent les références d'habillage. `joue` ou `termine` ne signifie jamais `PASS`.

## 2. Surface réellement disponible

`creerCoureur` est exporté par `agent/index.ts:8`, importable depuis `@horama/agent` (`agent/package.json:6`). Signature réelle, `agent/src/coureur.ts:45` :

```ts
export function creerCoureur({ vault, base, relever, session = creerSessionH(), h, baseUrl, maintenant = Date.now, identifiant = randomUUID, signaler = console.error, writeReport = ecrireRapportPassage }: OptionsCoureur): CoureurAgent
```

Options exactes (`agent/src/coureur.ts:21–32`) :

```ts
export interface OptionsCoureur {
  vault: string;
  base: BasePassages;
  relever(ecran: string, vue: string): Promise<ReleveCapture>;
  session?: Session;
  h?: OptionsSessionH;
  baseUrl?: string;
  maintenant?: () => number;
  identifiant?: () => string;
  signaler?: (message: string) => void;
  writeReport?: typeof ecrireRapportPassage;
}
```

Le crochet doit résoudre avec **les octets et les métadonnées**, pas seulement une phrase (`agent/src/coureur.ts:11–19`) :

```ts
export interface ReleveCapture {
  png: Uint8Array;
  texte: string;
  url_page: string;
  largeur: number;
  hauteur: number;
  defilement: [number, number];
  phrase: string;
}
```

La scène masque sa couche, capture la page et son texte, restaure sa couche et attend la fin de la présentation avant de résoudre le crochet. Le coureur attend cette promesse (`coureur.ts:87–89`), puis enregistre le relevé ; `phrase` devient la réponse de l'outil envoyée à H. Un relevé déjà accepté n'appelle pas à nouveau le crochet : le coureur renvoie la phrase mémorisée.

Il n'y a pas d'option Chrome ou CDP directe dans `OptionsCoureur`. Le raccord est `h.navigateur`, de type `() => Promise<NavigateurSession>` (`agent/src/session.ts:27–39`) :

```ts
export interface NavigateurSession {
  channel: string;
  stop(): void | Promise<void>;
  failed?(): string | null;
}
```

La scène fournit un canal de pont utilisable par H ; le coureur ne reçoit pas un objet Playwright. Avec `h` renseigné, il construit `creerSessionH(h)` et ignore l'option `session` (`coureur.ts:46`). La fabrique `navigateur` est rappelée à chaque création de session ; le code de session appelle `stop()` en cas de refus de création ou en fin de session (`session.ts:72, 86, 141`). La scène doit donc fournir un pont recréable, dont l'arrêt ne ferme pas son Chrome. Pas de second pont concurrent ni de seconde boucle H.

Séquence d'appel retenue : construire le coureur avec `base`, `relever`, `h.navigateur`, `vault` et `baseUrl`, puis appeler :

```ts
lancerPassage(input: LancementPassage): Promise<{ passage_id: string }>;
attendreFin(passage_id: string): Promise<RapportPassage>;
```

`input` contient `logiciel`, `version_testee`, `version_reference`, `tests: string[]`, et facultativement `regressions` et `cle` (C2/C3, `contrats/types.ts:65–72, 131–135`). L'identifiant est une valeur retournée, **pas une ligne stdout à analyser**. Il n'est rendu qu'après l'insertion initiale tentée et la création H ; cette création peut échouer après qu'une ligne a déjà été créée en base (`coureur.ts:140–164`).

## 3. Captures et C4 : le crochet ne court-circuite pas le coureur

Même avec le `relever` de la scène, le coureur effectue les opérations suivantes :

1. POST `passages` avec `id`, `logiciel`, `version_testee`, `version_reference`, `etat: en_cours`, `debut`, avant la création H.
2. À chaque étape H, POST `evenements` avec `passage_id`, `test_id`, `session_id`, `horodatage`, `etape`, `action`, `etat_session`. Lire par `horodatage` ; `etape` repart à zéro lors d'une relance.
3. Au retour du crochet, contrôle de l'origine, du chemin et des paramètres attendus de `url_page`, dont le filtre et la langue éventuelle. Un relevé refusé n'est pas enregistré.
4. Dépôt des octets fournis dans le bucket `captures`, chemin `<passage_id>/<test_id>/<ecran>--<vue>.png`, puis POST avec fusion dans `captures` sur `(passage_id,test_id,ecran,vue)`. Champs : `passage_id`, `test_id`, `session_id`, `ecran`, `vue`, `version`, `chemin`, `url`, `largeur`, `hauteur`, `defilement`, `texte_page`, `url_page`, `etape`, `prise_le`.
5. Après ces écritures réussies, conservation en mémoire de la C3, de la phrase et d'une copie `png.slice()` (`coureur.ts:90–104`). `texte_page` reprend le `texte` du crochet. Les écrans partagés entre tests sont mutualisés.
6. À la finalisation, `verifierTest` reçoit ces relevés et PNG conservés. Il appelle `verifierReleve` dans leur ordre d'acquisition avec les règles C2 du test, le préfixe des relevés, les références et les décisions du vault (`agent/src/verification.ts:25–35`). **C4 tourne donc toujours sur les captures de la scène.** Un résultat est produit par test ; une session échouée ou une capture manquante donne `INCONCLUSIVE`. Un défaut calculé prouvé prime sur un constat incomplet ; `PASS` exige toutes les preuves.
7. POST de chaque C4 dans `resultats` : `passage_id`, `test_id`, `statut`, `payload` = C4 complet. Ensuite Markdown avec les C4, puis PATCH final `passages` avec `fin`, `duree_s`, `cout_usd`, `etat: joue/echec` et `rapport` C6 (`coureur.ts:124–137`, `base.ts:55–72`). C6 ne contient pas une nouvelle liste de C4.

Il n'y a pas de transaction globale. Le coureur ne recapture pas l'écran lui-même lorsque ce crochet est fourni. La scène n'a donc à doubler ni le dépôt PNG, ni l'écriture C3, ni l'écriture C4.

## 4. Un seul écrivain, puis un passage de relais explicite

| Donnée | Écrivain retenu | Rôle de la scène |
|---|---|---|
| `evenements`, `captures`, bucket `captures` | Coureur | Fournir les octets et métadonnées ; lire pour afficher |
| `resultats` (C4) | Coureur uniquement | Lire les lignes filtrées par `passage_id` et `test_id`, jamais les réécrire |
| `decisions` (C5), mémoire des décisions | Scène | Écrire les décisions humaines et assurer leur synchronisation avec le vault |
| `passages` jusqu'au PATCH final C6 | Coureur | Attendre et vérifier la fin persistée |
| `passages.etat = verifie` après validation | Scène uniquement après relais | Transition finale, sans réécrire le rapport ni les autres champs du coureur |

La transition `verifie` est l'exception de cycle de vie déjà prévue par le contrat : il ne s'agit pas de deux écrivains concurrents. Elle intervient **après** `attendreFin`, la vérification de la fin persistée et l'écriture réussie des C5. Aucun PATCH de la scène pendant que le coureur pourrait encore finaliser ; sinon son PATCH écraserait `verifie`. Un passage en échec ou à persistance non confirmée n'est pas promu automatiquement.

## 5. Fin et erreurs : non concluant explicite

Si aucun `passage_id` n'est rendu, ou si l'exécution s'arrête sans fin enregistrée en base, la scène affiche **« non concluant » avec la raison**, puis son processus sort en erreur (code non nul). Elle ne reste pas indéfiniment en attente et ne présente jamais `en_cours` comme une réussite.

Le contrôle de fin relit `passages` par `id` : `fin` renseigné, état terminal `joue/echec`, rapport présent. Il vérifie aussi les C4 attendus dans `resultats` avant de les présenter comme persistés. Ne pas déduire la fin du dernier événement ou du nombre de captures. `attendreFin` rend un rapport local, pas une garantie que toutes les écritures sont visibles en base.

La scène collecte les exceptions, les avertissements via `OptionsCoureur.signaler` **et** `h.signaler`, puis les rapproche de la lecture finale. Un échec de POST C4 est seulement signalé par le coureur : il ne bloque pas le Markdown ni le PATCH final. Un `joue` sans C4 doit donc être affiché comme vérification non concluante avec sa raison, pas comme un test réussi. Les raisons publiques ne doivent exposer aucun secret.

## 6. Écarts à régler

1. **Adaptateur scène non livré.** Le `relever` actuel de `automatisation/scene/parcours.mjs:338–361` capture et présente déjà, mais retourne une chaîne. Il faut lui faire fournir le `ReleveCapture` complet, et remplacer l'appel autonome à `agentPass` (`parcours.mjs:429–432`) par le coureur. Aucun changement de contrat du coureur nécessaire.
2. **Cycle du pont à raccorder.** La scène doit adapter sa gestion Chrome/holo à `h.navigateur` et à ses rappels lors des relances ; `stop()` est invoqué par la session. Ce raccord n'est pas démontré par la seule existence des types. Garder le Chrome et la couche vivants, sans pont parallèle.
3. **C4 final, pas un flux temps réel.** Le coureur calcule C4 seulement à la finalisation et `attendreFin` ne retourne que C6. La scène doit lire `resultats` pour les verdicts persistés. Ses constats locaux actuels peuvent servir à l'habillage provisoire, mais ne doivent ni écrire C4 ni être annoncés comme résultat final avant cette lecture. La restitution immédiate des C4 pendant chaque crochet n'est pas fournie par cette API.
4. **Relais C5 / `verifie` à implémenter côté scène.** `BasePassages` ne propose ni écriture C5 ni transition `verifie`. La scène actuelle écrit des décisions dans le vault (`parcours.mjs:489`), ce qui n'établit pas leur persistance dans la table `decisions`. Assurer la synchronisation des deux et le relais séquentiel, sans appeler `terminerPassage` une seconde fois pour réécrire C6.
5. **Surveillance et erreurs de persistance à raccorder.** Pas de callback de lancement anticipé, pas de méthode publique d'annulation du coureur, pas de timeout dédié au crochet. Les limites H restent actives (`max_time_s: 240`, `max_steps: 40`), et le suivi attend le retour du crochet pour poursuivre : la présentation de la mascotte doit rester bornée. La scène doit arrêter proprement son pont et sortir en erreur si le lancement ou la fin persistée manque. Le délai de cette surveillance reste à fixer, sans mesure inventée.
6. **Persistance non garantie par le retour local.** L'insertion initiale peut échouer sans empêcher la tentative H ; un POST C4 peut échouer sans changer `joue` ; le PATCH final ne contrôle pas le nombre de lignes affectées (`base.ts:44–54`). Prévoir les relectures et raisons « non concluant » décrites ci-dessus. Aucun correctif de ces comportements dans ce ticket documentaire.

## 7. Prérequis et CLI hors scène

La scène initialise son environnement serveur : `HAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, éventuellement `HOLO_BIN`, `FAUX_SAAS_URL`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. L'import du coureur ne charge pas automatiquement `.env.local`. Aucune clé de service transmise à l'interface publique, aucune utilisation de la clé de démo.

Chrome CDP dédié, page 1280 × 900, DPR 1 (`--force-device-scale-factor=1`), holo disponible, un seul parcours à la fois et vault externe complet accessible en écriture. La scène doit contrôler les dimensions et masquer sa couche : le coureur stocke les dimensions déclarées par le crochet, il ne refait pas ces contrôles comme `agent/src/browser.ts` dans le chemin CLI.

La CLI reste disponible **hors scène** pour lancer le coureur et ses propres captures, par exemple `pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --tests ca-du-mois-egal-total --base-url https://facturo-demo.vercel.app --vault <copie externe>`. Ce n'est plus l'interface de jonction. Pas de nouvelle API HTTP, pas de D6 dans cette décision. Aucun changement C1–C8 ; aucun passage H ni essai Mac/visuel effectué pour cette mise à jour.
