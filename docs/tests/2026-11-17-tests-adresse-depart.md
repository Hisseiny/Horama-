# CLI : sous-ensemble de tests et origine explicite

Branche `a-tests-adresse-depart`, depuis `origin/dev` à jour. D6 option B est décrite dans le commentaire de Nathan sur [PR 10](https://github.com/Hisseiny/Horama-/pull/10#issuecomment-6946965917) : déploiement Vercel vers scène locale, sélection par diff et champs `code:` du vault. Ce ticket valide seulement l’entrée CLI ; il ne livre pas ce déclencheur ni ce sélecteur.

## Ajustement minimal

Le coureur refusait déjà les identifiants inconnus avant de créer une session, mais l’entrée `passage.ts` masquait l’erreur derrière un message générique et initialisait le runtime auparavant. La CLI vérifie maintenant les identifiants acceptés avant clés, base et navigateur. Seule l’erreur typée `UnknownTestsError` est affichée précisément ; les autres erreurs restent génériques pour ne pas exposer de secret réseau. Aucun contrat modifié.

`agent/cli.test.ts` couvre le refus anticipé et le message réel du processus (sortie 1), ainsi que la priorité de `--base-url` sur `FAUX_SAAS_URL`. Les cas sans sélection et sélection vide/invalide restent couverts par les tests existants.

## Passage H réel sur Supabase partagé

Wrapper externe réutilisé avec `--subset`, vault `/home/ubuntu/horama-a7-local/vault-subset`, Chrome CDP 9333, 1280 × 900/DPR 1, Holo et configuration Supabase partagée existante. Clé H liée uniquement à l’environnement exec via la référence Horama ; aucune clé de démo/Nami. Préflight quota HTTP 200, trois places disponibles.

Commande réellement exécutée :

```sh
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --vault /home/ubuntu/horama-a7-local/vault-subset --base-url https://facturo-demo.vercel.app --tests detail-facture-total-egal-liste
```

Pour vérifier la priorité de l’option, l’environnement du processus contient délibérément `FAUX_SAAS_URL=https://invalid.example` : les relevés sont pourtant tous sur l’origine explicite Facturo. `--base-url` est une **origine**, pas une URL complète de démarrage arbitraire : le chemin `/v13/entrer?suite=…` vient du test accepté C2 et est adapté à la version. Un script D6 doit respecter cette distinction.

| Passage | Session H | État passage / test | Durée C6 / commande complète (s) | Coût H USD | Étapes / événements | Captures | Gel / relance |
|---|---|---|---|---:|---:|---:|---|
| `2026-11-17-12h16-1fd6` | `324c8c80-ad78-4853-9da7-8fb0a530561a` | `joue` / `termine` | 55,645 / 56,952 | 0,0128592 | 7 | 2 | non / 0 |

Sortie CLI 0. Durée C6 excluant le Markdown et le dernier PATCH ; commande complète jusqu’à la sortie les incluant. Préparation du navigateur et préflight exclus des deux.

Lectures REST après exécution :

- `passages?id=eq.2026-11-17-12h16-1fd6` : une ligne, C6 contenant **exactement un test**, `detail-facture-total-egal-liste`, sur les trois tests acceptés disponibles.
- `evenements?passage_id=eq.2026-11-17-12h16-1fd6` : **7 lignes**, toutes avec ce seul `test_id` et la session indiquée.
- `captures?passage_id=eq.2026-11-17-12h16-1fd6` : **2 lignes**, uniquement `liste-des-factures/defaut` et `detail-facture/defaut`, ce seul `test_id`, version 13, 1280 × 900. URL des pages : `https://facturo-demo.vercel.app/v13/factures` et `/v13/factures/F-119`. Aucun relevé tableau de bord ni filtre d’échéance.
- Rapport Markdown externe : `vault-subset/facturo/passages/2026-11-17-12h16-1fd6.md`, un seul test. Aucun rapport généré dans le vault du dépôt.
- [Replay public](https://agp.eu.hcompany.ai/share/api/v1/trajectories/324c8c80-ad78-4853-9da7-8fb0a530561a) présent dans C6 et Markdown ; curl anonyme HTTP **200**, sortie 0. Trajectoire JSON, lecteur non vérifié visuellement.

Preuves locales persistantes : `/home/ubuntu/horama-a7-local/subset-results.json`, `subset-evidence.log`, `subset-run-1.log`. Aucun jugement métier lancé : le Markdown reste non concluant, aucun `PASS` revendiqué.

## Identifiant inconnu : refus clair, sans H

Même CLI, avec `--tests introuvable`, sans démarrer de session :

```text
$ node passage.ts -- --logiciel facturo --version 13 --reference 12 --base-url https://facturo-demo.vercel.app --tests introuvable
Tests acceptés inconnus : introuvable.
[ELIFECYCLE] Command failed with exit code 1.
```

Contrôle supplémentaire de l’entrée réelle `passage.ts`, avec `fetch` intercepté et compteur de requêtes :

```text
Tests acceptés inconnus : introuvable.
Contrôle négatif : 0 requête réseau, donc 0 création H et 0 écriture REST.
```

Le refus ne se déduit pas du seul quota : le code de validation s’exécute avant la création des dépendances et le contrôle interdit tout accès réseau. Le test automatisé reproduit aussi une sélection mixte valide/inconnue, rejetée entièrement.

## Vérification du dépôt

`pnpm install && pnpm -r check` : **code 0**, journal externe `/home/ubuntu/horama-a7-local/subset-workspace-check.log`. Installation déjà à jour, pnpm 12.18.0. Tous les paquets terminent sans échec (faux SaaS 7, mémoire 28, interface 8, jugement 34, agent 49 tests). Fin de sortie réelle :

```text
agent check: 1..49
agent check: # tests 49
agent check: # suites 0
agent check: # pass 49
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 472.935896
agent check: Done
```

`git diff --check` : aucune erreur. Aucun contrat ou vault du dépôt modifié.

Non vérifiés : déclencheur Vercel, réveil du Mac de démo, mapping diff/`code:`, lecteur visuel, jugement métier et validation humaine. Le passage a été exécuté avec Chrome local Linux, pas sur le Mac de démo.
