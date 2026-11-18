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

## Réveil par une PR du site cible (`pr.mjs`, issue #71)

Pour un site dont on a le code (le clone du site d'Eugenia d'Ali, `Hisseiny/eugenia-school-website`) : le Mac interroge GitHub, sans aucun serveur public, toutes les 20 s par défaut.

```sh
node automatisation/reveil/pr.mjs --depot <propriétaire/dépôt> --logiciel <logiciel du vault> -- --vitrine
```

- **Quand** : une PR ouverte dont le **dernier commit** a une prévisualisation Vercel prête, qui s'ouvre sans connexion. Il y a deux façons de la trouver :
  - un déploiement GitHub d'environnement Preview à l'état `success`, dont l'adresse est dans `environment_url` ;
  - sinon, comme sur le clone le 18/11 (aucun déploiement GitHub), le statut de commit « Vercel » à l'état `success` (son `target_url` mène au tableau de bord de Vercel, pas au site) et l'adresse donnée par le commentaire du bot `vercel[bot]` sur la PR. C'est l'alias de la branche, qui suit son dernier commit.

  Une prévisualisation qui redirige vers une connexion Vercel (protection active) n'est pas jouée : le réveil le dit une fois et réessaie au tour suivant. Une PR dont la prévisualisation n'est pas prête est attendue. Plusieurs poussées rapprochées : seul le dernier commit de la PR est joué, une fois.
- **Quoi** : les fichiers modifiés par la PR (`pulls/<n>/files`) choisissent les tests par `choisirTests` d'`impact.mjs`, sur le vault de ce dépôt : les écrans dont la note déclare un fichier modifié dans son champ `code:`, plus le socle d'`impact/socle.json`. Le fichier `impact.json` (format `horama-impact-1`, avec `depuis` = base de la PR, `vers` = son dernier commit, `fichiers`, et l'adresse de la PR dans `pr`) part à la scène.
- **Les scènes** : d'abord les tests du vault touchés par la PR, `parcours.mjs --impact <fichier> --base-url <prévisualisation> --logiciel <logiciel> --vault <vault> --pr <adresse de la PR> --sortie <dossier>/scene` (sautés si la PR ne touche aucune note). Puis l'exploration de tout le site de la prévisualisation, celle du mode grand public (issue #122) : `exploration.mjs --url <prévisualisation> --max 8 --pages-cliquees 4 --vault <vault> --sortie <dossier>/exploration`, avec les contrôles mécaniques et Holo. `--max` et `--pages-cliquees` du réveil la règlent, `--sans-exploration` la retire. Les options données après `--` vont aux deux scènes (par exemple `--vitrine`, ou `--sans-agent --sans-holo` pour un essai). La sélection, la cible, le vault, la sortie, la PR, `--url`, `--max` et `--pages-cliquees` sont réservés au réveil. Une scène qui échoue est notée dans `reveil.json`, l'autre tourne quand même, et le réveil passe à la PR suivante.
- **Le vault** : `--vault vault-horama` par défaut. Les décisions, la note du passage et les corrections de note s'y écrivent : c'est la mémoire du mode dev. Pour un essai, donner une copie.
- **Sorties** : `<sortie>/pr-<numéro>-<commit court>/` (`.orchestrateur/reveil-pr/` par défaut) : `impact.json`, `reveil.json` (état, `impact_ms`, `total_ms`, et pour `parcours` et `exploration` : état, `lance_ms`, erreur), `scene/`, `exploration/`.
- **Essai sans vraie PR** : `--faux-github <fichier.json>` lit `{ prs: [{ numero, adresse, titre, base, tete }], deploiements: { <sha>: { etat, adresse } }, fichiers: { <numéro>: [...] } }` à la place de GitHub.
- **À blanc** : `--a-blanc` regarde GitHub une fois et ne joue rien : ni scène, ni H, ni écriture. Pour chaque PR ouverte, il affiche :
  - la prévisualisation de son dernier commit : où elle a été trouvée, son adresse, et si elle s'ouvre sans connexion ;
  - ses fichiers ;
  - les tests qu'elle ferait rejouer, et ceux écartés.

  Pour le clone : `node automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --a-blanc`. Le dépôt est public, la lecture ne demande aucun accès.
- **Ce qu'il faut côté cible** (Ali, #78) : le dépôt relié à Vercel avec une prévisualisation par PR, la protection des prévisualisations coupée (sinon l'agent tombe sur la connexion Vercel), les formulaires désactivés sur la démo. `gh` doit être connecté avec un compte qui lit le dépôt.

## Vérifier

```sh
node --test automatisation/reveil/*.test.mjs   # wake.test.mjs et pr.test.mjs
pnpm install && pnpm -r --if-present run check
```

La preuve chronométrée et les limites de la scène réelle sont dans `docs/tests/2026-11-17-reveil-local.md`.
