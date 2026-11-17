# Crochet de relevé borné et annulation du coureur

17 novembre 2026 — branche `a-coureur-crochet`, créée depuis `origin/dev` à jour (`a83067c4391cbbf2c36aa086273ae3efc81f78b3`). Aucun contrat gelé modifié, aucune dépendance ajoutée, aucun passage H réel ni accès Supabase partagé.

## Signature publique

```ts
creerCoureur(options: OptionsCoureur): CoureurAgent

interface OptionsCoureur {
  vault: string;
  base: BasePassages;
  relever(ecran: string, vue: string, signal?: AbortSignal): Promise<ReleveCapture>;
  hookTimeoutMs?: number;
  signal?: AbortSignal;
  session?: Session;
  h?: OptionsSessionH;
  baseUrl?: string;
  maintenant?: () => number;
  identifiant?: () => string;
  signaler?: (message: string) => void;
  writeReport?: typeof ecrireRapportPassage;
}
```

`ReleveCapture` ne change pas. Les crochets existants à deux arguments restent compatibles. Les méthodes contractuelles `lancerPassage` et `attendreFin` restent intactes : l'annulation est portée par une option, pas par une modification de `CoureurAgent`.

```ts
const controller = new AbortController();
const runner = creerCoureur({
  vault, base, relever, h: { navigateur },
  hookTimeoutMs: 30_000,
  signal: controller.signal,
});
const { passage_id } = await runner.lancerPassage(input);
controller.abort("Arrêt demandé par la scène");
const rapport = await runner.attendreFin(passage_id);
```

## Timeout

- Défaut : **30 000 ms**, assez long pour une intervention de la mascotte et inférieur au seuil de silence H de 45 secondes. Valeur finie strictement positive, au plus `2_147_483_647` ms.
- Chaque appel est plafonné au minimum des `timeout_s × 1000` positifs et finis des tests qui partagent ce relevé. C'est un plafond par crochet, **pas un nouveau chronomètre global du test** : attendre un crochet plus longtemps que tout le budget déclaré d'un test n'aurait pas de sens.
- Le crochet reçoit un signal combinant délai et annulation publique. Même s'il ignore ce signal et ne se résout jamais, le coureur cesse de l'attendre. Aucun PNG ni C3 n'est écrit pour ce relevé ; une résolution tardive n'est pas acceptée.
- `signaler` reçoit l'écran, la vue et le délai dépassé. H reçoit un résultat d'outil lui demandant de continuer les autres relevés puis de terminer. Le même relevé expiré n'est plus rejoué dans ce passage, pour éviter une boucle d'attentes.
- Les tests partageant ce relevé ont un C4 `INCONCLUSIVE` avec raison et un C6 `non_concluant`. Les autres tests restent vérifiés normalement. Le passage se finalise en `echec`, avec `fin`, C4, rapport Markdown et PATCH final : « continuer normalement » signifie achever cette chaîne, pas masquer l'incident en réussite.

## Annulation

- `controller.abort(raison)` interrompt l'attente du crochet, du polling H, des pauses réseau et de relance, ou de la création de session. Aucune relance n'est engagée après annulation.
- Le raccord H interrompt ses requêtes et tente un `DELETE /sessions/{id}` indépendant du signal déjà annulé. `navigateur.stop()` est appelé une seule fois et en parallèle du nettoyage H. Chaque nettoyage est borné à 5 secondes ; un arrêt refusé ou non confirmé est signalé, puis la session est abandonnée.
- Le passage devient `echec`, les tests sont `non_concluant`, leurs C4 `INCONCLUSIVE`, avec la raison humaine. La finalisation tente les résultats, le Markdown et le PATCH avec `fin`, puis `attendreFin` se résout. Les métriques non reçues ne sont pas inventées : le coût peut rester `null`.
- Un signal déjà annulé empêche de créer une session H mais permet la finalisation et le retour d'un identifiant de passage. Un pont livré après l'annulation est arrêté dès qu'il devient disponible.
- Les sessions injectées reçoivent aussi `SessionInput.signal`. Leur retour peut fournir `stop?(): Promise<void>`. Si elles ne coopèrent pas, le coureur abandonne leur attente et refuse leurs outils tardifs ; il ne peut pas arrêter des ressources dont elles ne lui donnent aucun moyen de fermeture.

## Vérifications exécutées

Depuis `agent/` :

```text
node --test crochet.test.ts coureur.test.ts session.test.ts verification.test.ts dolibarr.test.ts
1..49
# tests 49
# suites 0
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 394.69786
```

Les neuf nouveaux cas utilisent une fausse API H et `BaseMemoire` : timeout ciblé et résolution tardive, plafond `timeout_s`, annulation dans le crochet et dans un polling qui ignore le signal, refus du DELETE, session injectée non coopérative, signal déjà annulé, pont livré tardivement, parcours nominal et délai invalide/exception du crochet. Le cas ciblé prouve simultanément un C4 `PASS` pour le test non concerné et un `INCONCLUSIVE` pour celui dont le relevé expire. La présence du Markdown et du rapport final en fausse base est contrôlée.

Premier `pnpm install && pnpm -r check` : les tests ciblés étaient verts, mais le typage strict a refusé l'inférence de la variable de session capturée dans le nettoyage :

```text
agent check: src/coureur.ts(187,11): error TS7034: Variable 'running' implicitly has type 'any' in some locations where its type cannot be determined.
agent check: src/coureur.ts(204,59): error TS7005: Variable 'running' implicitly has an 'any' type.
```

Correction : annotation explicite `SessionEnCours`. Nouvelle exécution complète depuis la racine, sortie **0** :

```text
pnpm install && pnpm -r check
Scope: all 7 workspace projects
Already up to date
Done in 3ms using pnpm v12.18.0
faux-saas check: # pass 7
faux-saas check: # fail 0
memoire check: # pass 28
memoire check: # fail 0
interface check: # pass 8
interface check: # fail 0
jugement check: # pass 34
jugement check: # fail 0
agent check: 1..72
agent check: # tests 72
agent check: # suites 0
agent check: # pass 72
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 686.705937
agent check: Done
```

Les avertissements de replay et d'arrêt H dans certains tests existants proviennent de leurs réponses réseau factices volontairement incomplètes ; ils n'indiquent pas un appel réel.

## Limites

- JavaScript ne peut pas tuer une promesse ni interrompre un crochet qui bloque synchroniquement la boucle événementielle. Le crochet doit respecter son signal pour arrêter ses propres animations, captures ou autres effets ; le coureur garantit seulement qu'il n'accepte pas son relevé tardif.
- Une requête de création H annulée avant réception de l'identifiant peut avoir créé une session distante impossible à identifier pour le DELETE. Le pont est arrêté ; l'arrêt distant n'est pas garanti. Même un DELETE accepté n'atteste pas que H a effectivement cessé toute activité.
- Les écritures déjà en vol ne sont pas annulables et la finalisation n'est pas transactionnelle. La garantie d'annulation vise l'exécution avant la construction des résultats ; un signal arrivé pendant leur persistance ne réécrit pas rétroactivement les C4 déjà envoyés. Une panne de base ou du rapport reste signalée selon les replis existants ; aucune fin persistée n'est garantie face à une base indisponible. Une fausse base injectée qui ne rend jamais la main peut toujours bloquer la finalisation.
- Le signal appartient au coureur : il concerne tous ses passages et ne se réarme pas. Pour des annulations indépendantes, créer un contrôleur et un coureur par passage.
- La CLI conserve ses gestionnaires SIGINT/SIGTERM : ils ferment leur raccord puis quittent immédiatement, sans attendre cette finalisation. Les router ici demanderait de modifier leur cycle de sortie ; ce raccord optionnel est laissé hors du correctif.
- Aucun navigateur réel, replay ou rendu de scène vérifié visuellement ; aucun passage H réel demandé ni lancé.
