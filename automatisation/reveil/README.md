# Réveil local de la démo (issue #36, point 1)

Un commit de la branche surveillée touchant `site-eugenia/` lance **impact puis la scène scriptée**, sans clé H ni base distante. Aucun paquet ajouté ; Node 22 et Git suffisent au surveillant. Les dépendances existantes du dépôt et de la scène doivent être installées.

```sh
pnpm install
# La scène est hors workspace ; installation dans son dossier :
pnpm --dir automatisation/scene install --ignore-workspace

CHROME_BIN="$HOME/.local/bin/google-chrome" DISPLAY=:0 \
  node automatisation/reveil/wake.mjs \
  --branche branche-demo --base-url http://localhost:3000 \
  -- --version 1 --reference 1 --sans-fin --temoins /chemin/absolu/temoins
```

Sur Mac, omettre `DISPLAY` et adapter `CHROME_BIN` (par défaut de la scène : `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). Le site doit **déjà** être servi à l'adresse indiquée, sur la version du commit détecté : le réveil ne construit, ne sert et ne déploie pas le site. Éviter de commettre plusieurs versions pendant un parcours local, puisque l'adresse locale suit le serveur de développement.

Au démarrage, le sommet de la branche devient le point de départ ; les commits existants ne sont pas rejoués. `--depuis <commit>` permet un rattrapage explicite, `--une-fois` attend/traite le premier commit pertinent puis sort. La surveillance interroge Git toutes les 500 ms (`--intervalle` en ms). Les commits sans changement du site sont ignorés ; plusieurs commits entre deux interrogations sont traités dans l'ordre, sans chevauchement. Un recul/divergence de la branche ou un échec d'impact/scène arrête visiblement le programme (sortie 2) ; corriger puis reprendre avec `--depuis <dernier commit traité avec succès>`. Ctrl+C arrête la surveillance. Il ne fait ni fetch ni push.

À chaque réveil, dans `.orchestrateur/reveil/<commit>-<suffixe unique>/` (ou `--sortie <dossier>`) :

- `impact.json` : **sortie exacte** de `impact.mjs --depuis <avant> --vers <après> --logiciel eugenia --json`, format `horama-impact-1`, retenus ET écartés avec raisons ;
- `vault-horama/` : export Git du même commit, copie privée pour les écritures de la scène ; le vault du dépôt reste intact ;
- `scene/` : résultat de `parcours.mjs --sans-agent --sans-base --impact <fichier> --base-url <adresse> --logiciel eugenia` ; aucun `--tests` ne remplace la sélection ;
- `reveil.json` : heures, délai détection → lancement du processus scène (`scene_lancee_ms`, **pas** la durée du parcours), durée complète si terminé (`total_ms`), état ou erreur.

Un impact vide est écrit, annoncé et ne lance pas la scène (qui refuserait une sélection vide). `--une-fois` sort alors normalement. Un rejeu du même commit reçoit un dossier neuf : il conserve les preuves précédentes sans recharger leurs décisions. Le profil Chrome est dans `<sortie>/profil`. Les options après `--` sont transmises à la scène ; sélection, cible, vault, profil, sortie et `--avec-base` sont réservés au réveil. `--sans-presentation` accélère la scène pour mesurer le déclenchement ; sans cette option, elle montre la bulle de sélection. `--sans-fin` évite d'attendre une décision humaine pendant un essai ; ce n'est pas un verdict de réussite du produit.

## Préparer le vrai site avec l'équipe

Sur la base de cette PR, `site-eugenia/` est absent et les notes Eugenia portent `code: []`. Il faut que le couloir du site fournisse la copie locale, son serveur, et que le couloir du vault relie les vrais fichiers aux notes (`code: [site-eugenia/…]`) ou ajoute une fiche de changement. Sans ces liens, impact peut retenir zéro test : le réveil le dit, il n'invente aucune sélection. Les références doivent correspondre au navigateur de démo. Les essais de ce module utilisent une copie isolée, jamais une modification du vrai site ou vault.

## Vercel (option, non implémentée)

Le repli local est utilisable sans compte ni clé. Après accord de l'école, une source Vercel devra fournir **le SHA du déploiement READY, celui du déploiement précédent et l'adresse de prévisualisation** à la même suite `wakeCommit({ before, after, baseUrl, output })` ; le vault sera lu au SHA déployé. Il faudra l'identifiant du projet (et de l'équipe si applicable), l'accès en lecture aux déploiements et une authentification autorisée pour un projet privé, ainsi qu'une adresse accessible à Chrome (protection de prévisualisation à traiter par l'équipe). Rien n'est publié ici, aucune API Vercel n'est appelée, aucun secret n'est nécessaire pour le local.

## Vérifier

```sh
node --test automatisation/reveil/*.test.mjs
pnpm install && pnpm -r --if-present run check
```

La preuve chronométrée et les limites de la scène réelle sont dans `docs/tests/2026-11-17-reveil-local.md`.
