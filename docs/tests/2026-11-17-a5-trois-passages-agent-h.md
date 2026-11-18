# A5 : trois passages consécutifs avec le véritable agent H

## Autorisation et sonde

Le 17 novembre 2026, la clé Horama fournie par référence de secret a été liée à `HAI_API_KEY` uniquement dans l'environnement du processus. Aucune clé n'est affichée, écrite dans un fichier ou committée ; aucune utilisation de la clé de démo.

```text
GET /sessions/quota HTTP 200
{"scope":"org","limit":3,"active":0,"available":3}
POST /sessions HTTP 201
Session créée : d28995a4-7d2a-403c-b8de-7d22f8ef7bcb
DELETE /sessions/d28995a4-7d2a-403c-b8de-7d22f8ef7bcb HTTP 204
```

La sonde a supprimé sa session immédiatement. Son wrapper de transport a ensuite interrompu volontairement le suivi, ce que `creerSessionH` a remonté comme erreur réseau générique : cela ne constitue pas un nouveau refus de création. Le refus HTTP 403 de la clé Nami reste documenté dans `2026-11-17-passage-agent-h.md` ; il ne s'applique pas à cette clé Horama.

## Montage et commande

- Facturo v13 local : `http://localhost:3100` ; Supabase local `horama-a4-local` existant.
- Chrome dédié CDP 9333, captures 1280 × 900 et DPR 1.
- Pont `/home/ubuntu/.venvs/holo/bin/holo`, exports de `automatisation/scene/` réutilisés sans modification.
- Vraies sessions `creerSessionH`, modèle `holo4-27b`, coureur `creerCoureur`, base Supabase, relevés CDP de l'onglet piloté par H. Le hook de relevé ne navigue pas.
- Wrapper hors dépôt : `/home/ubuntu/horama-a4-local/run-a5.mjs`, avec `FAUX_SAAS_URL=http://localhost:3100`, `HOLO_BIN` et les variables Supabase locales.

Commande jouée trois fois, sans modification du code entre les passages :

```sh
pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12
```

## Résultats persistés dans Supabase

| Passage | État | Durée (s) | Coût (USD) | Captures | Événements |
|---|---|---:|---:|---:|---:|
| `2026-11-17-11h03-6bb2` | joue | 64.007 | 0.0313806 | 4 | 13 |
| `2026-11-17-11h04-6745` | joue | 63.749 | 0.0260574 | 4 | 12 |
| `2026-11-17-11h05-c3a1` | joue | 88.135 | 0.033743800000000004 | 4 | 13 |

| Passage | Session H réelle |
|---|---|
| `2026-11-17-11h03-6bb2` | `6ae410b3-1ba7-4323-9ccd-308f5f93110b` |
| `2026-11-17-11h04-6745` | `9f8c4dd4-3e74-44a6-a7c2-5ca4ffdd637f` |
| `2026-11-17-11h05-c3a1` | `01338b6b-703d-4d0e-bd48-93578da00b64` |

Chacun des trois rapports contient les trois tests suivants à l'état `termine` :

- `ca-du-mois-egal-total` ;
- `detail-facture-total-egal-liste` ;
- `liste-factures-filtre-echeance`.

Chaque passage a les quatre couples écran/vue : `tableau-de-bord/defaut`, `liste-des-factures/defaut`, `detail-facture/defaut`, `liste-des-factures/filtre-echeance`. Le détail est bien `/v13/factures/F-119` et le filtre `/v13/factures?filtre=echeance-depassee`.

Requête de contrôle des nombres :

```sql
select p.id, p.etat, p.duree_s, p.cout_usd,
  (select count(*) from captures c where c.passage_id=p.id) as captures,
  (select count(*) from evenements e where e.passage_id=p.id) as evenements
from passages p where p.debut >= '2026-11-17T11:00:00Z' order by p.debut;
```

Rapports JSON complets et données SQL collectés hors dépôt dans `/home/ubuntu/horama-a4-local/real-results.json`, sortie lisible dans `real-evidence.log`. Logs des commandes : `a5-real-1.log`, `a5-real-2.log`, `a5-real-3.log` dans ce même dossier.

## Rapports C6 et captures examinées

Chaque commande a écrit son rapport Markdown dans le vault :

```text
vault-horama/facturo/passages/2026-11-17-11h03-6bb2.md
vault-horama/facturo/passages/2026-11-17-11h04-6745.md
vault-horama/facturo/passages/2026-11-17-11h05-c3a1.md
```

Après vérification, les trois fichiers générés ont été déplacés, sans modification, vers `/home/ubuntu/horama-a4-local/<id>.md` : aucun fichier du vault n'est committé. Le test mémoire `derniersFichiers` copie le vault et suppose exactement dix fichiers ; les trois rapports supplémentaires faisaient échouer son assertion (`13 !== 10`). Archivage des artefacts de ce passage hors du fixture, sans modifier le test ni le paquet mémoire ; vérification globale ensuite réussie.

Les quatre PNG de chaque passage sont téléchargés hors dépôt. Deux images du premier passage ont été examinées visuellement : tableau de bord lisible, CA affiché 1 240 €, quatre factures ; détail F-119 lisible, total TTC 480 €. Les dimensions des fichiers sont 1280 × 900. Chemins à montrer :

```text
/home/ubuntu/horama-a4-local/2026-11-17-11h03-6bb2-tableau-de-bord-defaut.png
/home/ubuntu/horama-a4-local/2026-11-17-11h03-6bb2-detail-facture-defaut.png
```

## Corrections de revue et contrôles

Après les trois passages, deux corrections indépendantes ont été apportées :

- chargement conditionnel du `.env.local` à la racine par l'entrée `agent/passage.ts`, en conservant les variables déjà définies, y compris une chaîne vide ; test avec fichier temporaire, fichier absent, vide et erreur de lecture ;
- interception temporaire de SIGINT/SIGTERM pendant le passage, fermeture du runtime avant sortie non nulle (130/143), suppression des écouteurs à la fin et fermeture unique. Tests sur runtime factice. La fermeture réutilise `bridge.stop()` qui envoie SIGTERM au groupe de processus du pont et de son chromedriver.

`pnpm install` : dépendances à jour. `pnpm -r check` : sortie 0, types et tests des paquets ; agent : 39 tests, 39 réussis, zéro échec. Pas de lint dédié dans les scripts. `git diff --check` : sortie 0.

## Limites

- `joue` et `termine` prouvent l'exécution et les relevés, pas un verdict de conformité métier. Aucun jugement par calcul n'est lancé par cette commande.
- Les coûts/durées du rapport sont ceux de la session partagée ; ne pas additionner à nouveau les mêmes valeurs répétées dans chaque résultat de test.
- Ces trois passages sont v13 avec référence déclarée v12, pas trois passages réels de v12 ni une promotion des captures en références.
- Les deux corrections de revue sont vérifiées automatiquement avec des dépendances factices ; pas de nouvel appel H après leur application. L'arrêt d'un processus H réel par signal n'a pas été provoqué.
- Pas de nouvelle planche ni de replay public livré dans cette étape ; les PNG sont les captures réelles brutes.
