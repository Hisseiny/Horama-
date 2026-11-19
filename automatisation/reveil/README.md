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
  - sinon, comme sur le clone le 18/11 (aucun déploiement GitHub), le statut de commit « Vercel » à l'état `success`. Son `target_url` mène au tableau de bord de Vercel, pas au site. L'adresse est alors lue dans le résumé du contrôle « Vercel Preview Comments » du commit (`vercel.live/open-feedback/<adresse>`), présent même quand le bot n'écrit aucun commentaire (PR #14 du clone). À défaut, elle vient du commentaire du bot `vercel[bot]` sur la PR. C'est l'alias de la branche, qui suit son dernier commit.

  Une prévisualisation qui redirige vers une connexion Vercel (protection active) n'est pas jouée : le réveil le dit une fois et réessaie au tour suivant. Une PR dont la prévisualisation n'est pas prête est attendue. Plusieurs poussées rapprochées : seul le dernier commit de la PR est joué, une fois.
- **Quoi** : les fichiers modifiés par la PR (`pulls/<n>/files`) choisissent les tests par `choisirTests` d'`impact.mjs`, sur le vault de ce dépôt : les écrans dont la note déclare un fichier modifié dans son champ `code:`, plus le socle d'`impact/socle.json`. Le fichier `impact.json` (format `horama-impact-1`, avec `depuis` = base de la PR, `vers` = son dernier commit, `fichiers`, et l'adresse de la PR dans `pr`) part à la scène.
- **La langue** : une note peut déclarer la langue de sa page (`langue: fr` dans son en-tête). Le réveil demande à la prévisualisation le `<html lang>` de chaque page dont un test retenu dépend. Si la langue diffère (une traduction, #122), ce test est écarté avec la raison « langue du site changée (fr → de) : tests de la documentation non joués », et seule l'exploration tourne. Une note sans `langue`, ou une page qui ne dit pas la sienne, n'écarte rien. Le mode à blanc l'affiche, et `reveil.json` le garde dans `langue`.
- **La page d'attente** (S1, 19/11) : au lancement (hors `--a-blanc`), le réveil ouvre le Chrome de la scène (port 9333, profil de la scène) sur `automatisation/scene/attente.html` : le ciel de la charte, la mascotte, « Horama attend la prochaine pull request. » et le dépôt surveillé. Quand une PR arrive, la scène reprend cet onglet et y ouvre la prévisualisation : plus d'onglet vide à l'écran. Pas avec une option de scène qui change le Chrome (`--port`, `--profil`).
- **Les scènes** : d'abord les tests du vault touchés par la PR, `parcours.mjs --impact <fichier> --base-url <prévisualisation> --logiciel <logiciel> --vault <vault> --pr <adresse de la PR> --sortie <dossier>/scene` (sautés si la PR ne touche aucune note). Puis l'exploration de tout le site de la prévisualisation, celle du mode grand public (issue #122) : `exploration.mjs --url <prévisualisation> --max 8 --pages-cliquees 8 --vault <vault> --site <logiciel> --sortie <dossier>/exploration`, avec les contrôles mécaniques et Holo. `--site <logiciel>` range chaque passage dans le dossier du logiciel du vault (par exemple `eugenia-clone`), quel que soit le nom d'hôte de la prévisualisation : les décisions « voulu » d'une PR valent pour la suivante. `--max` et `--pages-cliquees` du réveil la règlent (8 et 8 par défaut : toutes les pages après la page de départ sont atteintes par un clic de l'agent, l'explorateur plafonnant les clics au nombre de pages moins un ; une page ouverte par son adresse est un saut à l'écran), `--sans-exploration` la retire. Les options données après `--` vont aux deux scènes (par exemple `--vitrine`, ou `--sans-agent --sans-holo` pour un essai). La sélection, la cible, le vault, la sortie, la PR, `--site`, `--url`, `--max` et `--pages-cliquees` sont réservés au réveil. Une scène qui échoue est notée dans `reveil.json`, l'autre tourne quand même, et le réveil passe à la PR suivante.
- **Le vault** : `--vault vault-horama` par défaut. Les décisions, la note du passage et les corrections de note s'y écrivent : c'est la mémoire du mode dev. Pour un essai, donner une copie.
- **La réponse sur la PR** (`--commenter`) : une fois les deux scènes finies, le réveil publie une seule réponse, avec `gh pr comment`. Elle contient la partie des tests du vault (`scene/passage.json`, `commentaire_corps`) puis celle de l'exploration (`exploration/scene.json`, `commentaire.corps`) :
  - chaque défaut prouvé avec sa page, sa zone en pixels de la capture, sa preuve et la décision de l'humain ;
  - les doutes de Holo à part ;
  - les constats déjà déclarés voulus, que la scène ne redemande plus ;
  - les pages non visitées ;
  - le chemin de la note du passage, où sont les captures entourées.

  Sans tests du vault joués, un titre dit pourquoi (langue changée, ou aucune note touchée). Le résultat de la publication est gardé dans `reveil.json`, champ `commentaire`.
- **Les captures dans la réponse** (`--captures-sur-branche horama/captures`, avec `--depot` et `--commenter`, désactivé par défaut, décision de Nathan du 18/11) :
  - les captures entourées des défauts et des doutes de l'exploration sont poussées sur cette branche du dépôt cible par l'API GitHub, sans clone, à `pr-<numéro>/<commit court>/<constat>.png` ;
  - la branche est créée depuis la branche par défaut si elle n'existe pas, et n'est jamais fusionnée ;
  - la réponse affiche chaque image par son adresse `raw.githubusercontent.com/<dépôt>/<commit>/<chemin>`, qui reste valable quoi que devienne la branche, et qui se lit sans connexion si le dépôt est public ;
  - une capture refusée laisse son constat en texte ;
  - le nombre de captures poussées est gardé dans `reveil.json`, champ `captures`.
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

## L'index des passages (tour de contrôle, #149)

Avec `--commenter --captures-sur-branche <branche>`, après chaque réponse publiée, le réveil met à jour `index.json` à la racine de cette branche du dépôt cible (la même que les captures, publique pour le clone). Il se lit sans connexion : `https://raw.githubusercontent.com/<dépôt>/<branche>/index.json` (par exemple `https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/horama/captures/index.json`, mis en cache quelques minutes par GitHub).

```json
{
  "format": "horama-passages-1", "depot": "Hisseiny/eugenia-school-website", "maj": "2026-11-19T15:00:00.000Z",
  "passages": [{
    "passage": "2026-11-19-10h55-4163", "date": "2026-11-19T10:55:10.000Z", "site": "eugenia-clone",
    "previsualisation": "https://…vercel.app", "pr": { "numero": 16, "adresse": "https://github.com/…/pull/16", "titre": "…" }, "commit": "998767b…",
    "reponse": "https://github.com/…/pull/16#issuecomment-…", "etat": "termine", "totaux": { "defauts": 2, "doutes": 2, "pages_visitees": 8, "…": "…" },
    "constats": [{ "id": "accueil--controle--1", "statut": "VERIFIED_FAIL", "genre": "defaut", "page": "/", "texte": "Le texte dépasse la boîte de son conteneur.",
      "preuve": "Mesuré : 158×35 > 120×35. Attendu : …", "zone": { "x": 32, "y": 432, "largeur": 120, "hauteur": 35 },
      "capture": "https://raw.githubusercontent.com/…/accueil--controle--1.png", "decision": { "choix": "bug", "par": "Nathan", "le": "…" } }]
  }]
}
```

Une entrée par PR et par commit (rejouer le même commit la remplace), la plus récente d'abord. `capture` est la capture entourée poussée sur la branche (ou `null`), `decision` est `null` tant que personne n'a tranché. Un refus de GitHub ne bloque pas le réveil : `reveil.json` garde la raison (`index.raison`).

