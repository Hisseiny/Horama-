# Essai du coureur sur Dolibarr public

17 novembre 2026 — branche `a-coureur-dolibarr`, créée depuis `a-c4-coureur` (`8c09b9b`). Les contrats et C6 restent inchangés. Aucun ajout de dépendance ni changement du lockfile.

## Changement et choix d'adressage

- `agent/src/consigne.ts` déduit le préfixe de version du début de `url_depart` : une adresse commençant par `/vN/` conserve le comportement Facturo ; une adresse comme `/compta/facture/list.php?lang=fr_FR` n'est pas préfixée par `/v24`.
- Pour les adresses sans préfixe, les paramètres de départ sont reportés sur les étapes du même hôte. Un paramètre déjà déclaré dans l'URL de la note est prioritaire. Aucun changement du vault fourni n'a été nécessaire. La query de démarrage Facturo (`suite`) n'est pas recopiée dans ses étapes.
- Le motif `here` compare le chemin seul à `location.pathname`, et les paramètres attendus à `location.search`, dont `lang=fr_FR` et le filtre de la vue. Les paramètres supplémentaires non contraints restent permis ; leur ordre est indifférent.
- `agent/src/coureur.ts` contrôle également tous ces paramètres lors du relevé, en plus du chemin, de l'origine et du filtre. Une capture anglaise ne peut donc pas être acceptée à la place du relevé français attendu.
- Les régressions démarrent avec `?r=` si l'adresse n'a pas encore de query, sinon avec `&r=`. Facturo conserve ses adresses existantes.
- `agent/src/session.ts` décrit désormais le logiciel cible, sans présenter systématiquement le parcours à H comme un parcours Facturo.

## Tests locaux

`agent/dolibarr.test.ts` construit un vault synthétique indépendant du vault externe et couvre :

1. Adresse Dolibarr sans préfixe, langue conservée, exécution du motif `here` avec query réordonnée ; refus du mauvais chemin, de la mauvaise langue, d'une langue absente et d'un filtre inattendu.
2. Paramètres de la note prioritaires, fusion des paramètres de départ, adresse sans query et séparateur des régressions.
3. Absence de transmission des paramètres de départ vers un autre hôte.
4. Faux H/base : refus de captures sur mauvais hôte, mauvais écran ou mauvaise langue, puis acceptation du relevé français et C4 calculé `PASS`.

La consigne conserve l'interdiction d'utiliser le formulaire de connexion. Les tests Facturo existants restent verts.

Commande après la dernière modification de code :

```sh
pnpm install && pnpm -r check
```

Sortie finale : **0**. Une première tentative avait signalé deux erreurs TypeScript dans les nouveaux tests (passage direct de `CourseStep` à un argument `Record<string, unknown>`). Elles ont été corrigées avant cette vérification et avant le passage réel.

```text
Scope: all 7 workspace projects
Already up to date
Done in 4ms using pnpm v12.18.0
faux-saas check: # pass 7
faux-saas check: # fail 0
memoire check: # pass 28
memoire check: # fail 0
interface check: # pass 8
interface check: # fail 0
jugement check: # pass 34
jugement check: # fail 0
agent check: # tests 61
agent check: # pass 61
agent check: # fail 0
agent check: # duration_ms 572.207162
agent check: Done
```

## Préparation du passage réel

- Vault fourni : `/home/ubuntu/vaults/dolibarr-essai`, hors dépôt ; logiciel `dolibarr`, test accepté `liste-factures-total-ttc`, version cible `24`.
- Connexion manuelle préalable avec le compte public de démonstration, par Playwright Python raccordé à Chrome CDP 9333. Aucun identifiant ni cookie écrit dans le dépôt. Retour sur la liste française avant le lancement ; contrôle de l'absence du champ de mot de passe.
- Chrome local réutilisé, capture contrôlée par le coureur en **1280 × 900, DPR 1** ; holo via `HOLO_BIN`.
- Configuration Supabase partagée chargée depuis le fichier externe existant. La clé Horama disponible sous `HAI_API_KEY_HORAMA` a été transmise au processus sous `HAI_API_KEY`. Aucune utilisation de `HAI_API_KEY_DEMO`.
- Préflight quota H : HTTP **200**, trois places disponibles avant le lancement.

Commande réelle :

```sh
pnpm --filter @horama/agent passage -- --logiciel dolibarr --version 24 --reference 24 --tests liste-factures-total-ttc --base-url https://demo.dolibarr.org --vault /home/ubuntu/vaults/dolibarr-essai
```

## Résultat réel, premier essai

| Passage | Sortie CLI / état C6 | Durée C6 | Durée commande | Coût H USD | Événements REST | Captures REST | C4 | Replay HTTP |
|---|---|---:|---:|---:|---:|---:|---|---:|
| `2026-11-17-13h19-733d` | `0` / `joue` | 27,693 s | 28,877 s | 0,0066634 | 3 | 1 | `PASS` | 200 |

Session H `242ebbeb-369b-4fec-a079-0ccf9a59d76b`, état final `completed`, aucun gel, aucune relance. Les trois événements persistés sont « Relève l'écran », « Termine le parcours », « Agit dans le navigateur ». Les appels H observés sont `relever`, `terminer`, `answer` : l'agent a relevé la liste déjà ouverte, sans utiliser le formulaire de connexion.

La capture persistée porte l'adresse exacte :

```text
https://demo.dolibarr.org/compta/facture/list.php?lang=fr_FR
```

Son texte contient « Montant TTC », les dix lignes affichées, puis `Total` avec `267,20`, et non la page de connexion. Ses dimensions persistées sont 1280 × 900.

Les GET REST filtrés par ce passage dans `passages`, `evenements`, `captures` et `resultats` ont tous répondu **HTTP 200**. Une ligne `resultats` a été relue ; extrait :

```json
{
  "passage_id": "2026-11-17-13h19-733d",
  "test_id": "liste-factures-total-ttc",
  "statut": "PASS",
  "payload": {
    "statut": "PASS",
    "regle": {
      "type": "somme",
      "ecran": "liste-des-factures",
      "colonne": "Montant TTC",
      "cible": "Total"
    },
    "calcul": "0,00 + 0,00 + 0,00 + 100,00 + 0,00 + 82,00 + 0,00 + 9,60 + 3,60 + 72,00 = 267,20",
    "niveau_de_preuve": "releve + calcul"
  }
}
```

Le Markdown externe contient également `PASS` et ce calcul. Le statut d'exécution `joue` et le verdict calculé `PASS` restent distincts.

Replay public : https://agp.eu.hcompany.ai/share/api/v1/trajectories/242ebbeb-369b-4fec-a079-0ccf9a59d76b — curl sans authentification : **HTTP 200, sortie 0**.

## Portée et limites

- Le verdict porte sur la somme des dix lignes affichées, pas sur toutes les factures paginées du site public. Les données de démonstration peuvent évoluer.
- La connexion reste une préparation externe : le coureur n'authentifie pas l'utilisateur. La disponibilité durable du cookie n'est pas garantie ; aucun essai d'expiration de session.
- Ce raccordement ne découvre pas automatiquement les vues propres à chaque logiciel. Pour un autre SaaS, fournir ses notes, ses C2 et son `--base-url` ; le défaut d'origine reste Facturo. Les vues nommées restent celles déjà prises en charge.
- Aucun gel ni panne de Dolibarr observé ; aucun rejeu nécessaire. Aucun contrôle visuel humain du parcours, du PNG ou d'un lecteur replay. La réponse publique du replay est une trajectoire JSON, pas une validation visuelle d'un lecteur.
- Preuves détaillées hors dépôt : `/home/ubuntu/horama-a7-local/dolibarr-check.log`, `dolibarr-run-1.log`, `dolibarr-results.json`. Aucun rapport généré dans le vault du dépôt.
