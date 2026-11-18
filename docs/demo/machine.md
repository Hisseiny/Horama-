# La machine de démo (issue #134)

Vendredi, le Mac de Nathan fait tourner la démo du mode dev (réveil par une PR du clone, scène, agent H) et peut-être celle du mode grand public. Cette fiche dit quoi vérifier jeudi à la répétition, puis vendredi avant de monter.

## 1. Lancer la vérification automatique

Depuis la racine du dépôt :

```sh
bash automatisation/demo/verifier-machine.sh
```

Le script ne fait que lire : il n'installe rien, ne lance rien, n'écrit rien et ne dépense rien. Il affiche une ligne par point, `OK` ou `KO`, et rend le nombre de `KO` comme code de sortie (0 : machine prête). Les lignes `--` sont des informations.

| Point | Ce qui est vérifié | Si c'est KO |
|---|---|---|
| Clés | `.env.local` existe, et `HAI_API_KEY`, `HAI_API_KEY_DEMO`, `HF_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y ont une valeur. Le script ne lit ni n'affiche aucune valeur. | Ouvrir `.env.local` et coller la clé manquante (Nathan, jamais dans une conversation). |
| Outils | `node`, `pnpm`, les dépendances de la scène, `holo` (`HOLO_BIN`, `PATH` ou `~/.venvs/holo/bin/holo`), Chrome | `pnpm --dir automatisation/scene install --ignore-workspace` pour la scène ; `holo` vient du paquet `hai-agents[cli,browser]`, dans un environnement Python à part. |
| Ports | 9333 (Chrome de la scène), 9400 (vitrine), 8787 (faux service) libres. Seul le nombre de processus est dit, jamais leur ligne de commande. | Fermer la scène ou le Chrome resté ouvert (`lsof -ti tcp:9333` donne le numéro du processus). |
| GitHub | `gh auth status` | `gh auth login` (Nathan, dans son terminal). |
| Réveil | le vault du clone existe, et le réveil à blanc sur `Hisseiny/eugenia-school-website` lit les PR et leurs prévisualisations. La ligne `--` dit si un réveil tourne déjà. | Lire le message : dépôt inaccessible, `gh` non connecté, ou vault absent. |
| Sessions H | aucune session H en cours pour l'organisation. Le plan gratuit en permet 3 à la fois ; une session oubliée prend une place. Node lit la clé lui-même, le script ne la tient jamais. | Attendre la fin des sessions, ou les arrêter depuis le hub de H. Un `HTTP 401` ou `403` : clé refusée. |

## 2. À vérifier à la main

- **Prévisualisations du clone sans barre Vercel** : elle sortirait en écart d'image sur chaque page. Réglage du projet Vercel du clone (Ali).
- **Prévisualisations ouvertes sans connexion** : le réveil à blanc dit « répond sans connexion (code 200) » pour chaque PR.
- **Partage d'écran** : le projecteur ou l'écran de la salle affiche la vitrine (Chrome en plein écran, `--vitrine`). Essayer jeudi sur la vraie sortie vidéo. `Ctrl+Cmd+F` sort du plein écran.
- **Réseau** : le Wi-Fi de l'école d'abord. En secours, le partage de connexion du téléphone, essayé jeudi : la scène, H et Vercel doivent répondre dessus.
- **Fenêtres** : fermer ce qui pourrait passer devant la scène (notifications, mises à jour), mode « Ne pas déranger ».
- **Batterie et veille** : sur secteur, veille de l'écran coupée pendant la démo.

## 3. La répétition de jeudi

1. La vérification automatique : 0 KO.
2. Le mode dev de bout en bout, dans les conditions de vendredi : une PR du clone, le réveil, les tests du vault, puis l'exploration de la prévisualisation, et la réponse sur la PR. Chronométrer chaque étape.
3. Le mode grand public : l'extension ou la page d'accueil, contre le service en ligne (#68), sur le site de la démo.
4. Noter ce qui casse et le temps de chaque étape dans `docs/tests/`.
5. Relancer la vérification après la répétition : aucune session H restée active.

## 4. Plan de secours

- Une vidéo de chaque mode qui marche, enregistrée à la répétition, à lancer si H ou Vercel sont lents le jour même.
- Le passage d'une démo réelle déjà enregistré (`docs/tests/`) pour répondre aux questions.

## 5. `dev` vers `main`

Jeudi soir, après la répétition : une PR de `dev` vers `main`, ouverte par le couloir Nathan et fusionnée par Nathan. Railway déploie le service depuis `main`.
