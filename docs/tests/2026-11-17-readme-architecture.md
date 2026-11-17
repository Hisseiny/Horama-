# README : architecture et commandes — 17 novembre 2026

## Périmètre

Branche `a-readme-architecture`, indépendante de `a-tests-adresse-depart`, créée depuis `origin/dev` à `45b6c3988f889fafba297d84b8564ddaa1ff2ada`. Aucun changement d’agent, de contrat, de vault du dépôt ou de branche de la PR 13.

Fichiers : README racine (produit, architecture Mermaid, pôles, C1–C8, D6 option B, guide d’exécution), lien depuis AGENTS, présente preuve. Les échanges C1–C8 sont recoupés avec `contrats/README.md`, `contrats/types.ts` et le plan ; l’attribution actuelle des pôles est distinguée des deux couloirs historiques des contrats. D6 est documenté comme raccordement prévu par le commentaire de PR 10, non comme fonctionnalité livrée.

## Commandes du README réellement exécutées

Environnement : Node `v22.23.5`, pnpm `12.18.0`, Chrome dédié CDP 9333, holo externe. Les secrets Supabase sont chargés depuis un fichier externe privé ; la clé H Horama est injectée uniquement dans l’environnement d’exécution. Aucune valeur de clé n’est reproduite.

### Installation et vérification

Depuis la racine : `pnpm install && pnpm -r check`, sortie 0.

```text
Scope: all 7 workspace projects
Already up to date
Done in 4ms using pnpm v12.18.0
agent check$ pnpm lint && tsc --noEmit && node --test *.test.ts *.test.mjs
faux-saas check: # pass 7
faux-saas check: # fail 0
memoire check: # pass 28
memoire check: # fail 0
interface check: # pass 8
interface check: # fail 0
jugement check: # pass 34
jugement check: # fail 0
agent check: 1..48
agent check: # tests 48
agent check: # suites 0
agent check: # pass 48
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 407.372063
agent check: Done
```

Le lint appartient au check agent, sans double agrégation racine. Le check ne consomme pas de session H. `pnpm --filter @horama/agent passage -- --help` exécuté, sortie 0 ; l’aide affiche bien `--tests`, `--base-url`, `--vault`, `--chrome-port` et les noms des variables serveur.

### Mode factice

`pnpm dev` réellement lancé puis arrêté après contrôle HTTP :

```text
$ USE_MOCKS=1 pnpm --parallel --filter @horama/interface --filter @horama/faux-saas run dev
interface dev: ✓ Ready in 490ms
faux-saas dev: ✓ Ready in 543ms
interface HTTP 200
faux-saas HTTP 307
```

Le 307 est une redirection de la racine du faux SaaS, pas une page testée visuellement. Ce contrôle atteste seulement du démarrage, pas de la boucle de vérification ni d’une interface validée par un humain.

### Passage réel de la commande documentée

Copie hors dépôt, destination initialement absente :

```sh
cp -R vault-horama "$HOME/horama-readme-vault"
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 --vault "$HOME/horama-readme-vault" --base-url https://facturo-demo.vercel.app --tests detail-facture-total-egal-liste
```

La seconde commande est lancée par le wrapper externe `/home/ubuntu/horama-a7-local/run-a7-shared.mjs --readme` avec les mêmes arguments, le vault ci-dessus et les accès partagés. Préflight quota et vérification de viewport avant la commande ; contrôle REST et curl replay après. `FAUX_SAAS_URL` était volontairement une origine invalide : l’option explicite prime. Aucun serveur Facturo local n’est utilisé par ce passage.

```text
Préflight H essai 1 HTTP 200
Quota {"scope":"org","limit":3,"active":0,"available":3}
Viewport {"largeur":1280,"hauteur":900,"densite":1}
```

| Passage | Test C6 unique | État passage / test | Durée C6 / commande s | Coût H USD | Événements / captures REST | Relances | Replay curl |
|---|---|---|---|---|---|---|---|
| `2026-11-17-12h20-6cec` | `detail-facture-total-egal-liste` | `joue` / `termine` | 49,405 / 50,988 | 0,010892 | 6 / 2 | 0 | HTTP 200, sortie 0 |

Commande sortie 0. Session H `8c1e3c23-1f92-4ab4-9045-5ee7c6e93c4f` ; lien enregistré dans C6 : https://agp.eu.hcompany.ai/share/api/v1/trajectories/8c1e3c23-1f92-4ab4-9045-5ee7c6e93c4f.

Les captures concernent les factures et le détail F-119 sur l’origine en ligne, version 13. Le rapport Markdown est dans le vault externe. Le wrapper affiche aussi `MEDIANE_SECONDES undefined` parce que son calcul historique suppose cinq essais : aucune médiane n’est revendiquée sur cet essai unique ; ce message ne modifie ni le rapport C6 ni le résultat de commande.

### Lectures Supabase du README

Les trois commandes curl du bloc « Vérifier les lignes du Supabase partagé » ont été extraites telles quelles du README, puis exécutées avec `PASSAGE_ID` égal au passage ci-dessus et les variables privées chargées uniquement dans l’environnement. Aucune requête SQL directe, migration ni modification distante dans ce contrôle.

```text
passages : HTTP 200, 1 ligne(s), curl sortie 0
evenements : HTTP 200, 6 ligne(s), curl sortie 0
captures : HTTP 200, 2 ligne(s), curl sortie 0
C6, événements et captures : uniquement detail-facture-total-egal-liste
```

Les assertions vérifient exactement l’identifiant C6 attendu et que chaque événement/capture appartient au test demandé. Réponses complètes gardées hors dépôt dans `/home/ubuntu/horama-a7-local/readme-rest.json` ; mesures et journaux sous le même répertoire (`readme-results.json`, `readme-run-1.log`, `readme-evidence.log`, `readme-workspace-check.log`).

## Validation Mermaid

Bloc Mermaid extrait du README sans réécriture dans `/home/ubuntu/horama-a7-local/readme-architecture.mmd`, puis rendu réel :

```sh
PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH="$(command -v google-chrome)" npx -y @mermaid-js/mermaid-cli -i /home/ubuntu/horama-a7-local/readme-architecture.mmd -o /home/ubuntu/horama-a7-local/readme-architecture.svg
```

```text
Generating single mermaid chart
Exit code: 0
```

SVG produit au chemin ci-dessus. Aucun ajout de dépendance ou changement de lockfile dans le dépôt. La génération valide la syntaxe et le rendu Mermaid ; aucune inspection visuelle de la lisibilité du SVG ni du rendu GitHub n’est revendiquée.

## Limites

- Le coureur joue et rapporte ; aucun jugement C4, aucune décision humaine ni promotion de référence lancé ici. `joue`/`termine` ne signifie pas `PASS` ; Markdown non concluant.
- Un lien public curl 200 ne valide pas visuellement un lecteur replay.
- Pas de gel observé, donc récupération d’un gel réel non exercée.
- D6 déploiement → réveil scène → script diff/`code:` non implémenté ou exécuté dans ce ticket.
- UI, parcours et replay visuellement non vérifiés. Les serveurs factices de ce contrôle ont été arrêtés.
- La validation explicite des identifiants inconnus est livrée uniquement dans la branche A indépendante ; ce README ne prétend pas l’avoir ajoutée à sa propre base.
