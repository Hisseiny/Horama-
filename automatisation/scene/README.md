# Scène : le parcours en direct, et la sonde T7

La scène de `docs/decisions/2026-11-16-scene-en-direct.md`, épurée le 18/11 (issue #69, `docs/decisions/2026-11-18-recadrage-grand-public-et-dev.md`) : le logiciel testé s'ouvre dans un Chrome local visible et l'agent H clique. **Pendant le parcours, à l'écran : le site, le curseur de l'agent, la mascotte qui change de tête, et un trait tracé comme à la main autour de ce qui cloche, au moment où c'est trouvé.** Aucun texte, aucune étiquette, aucun compteur, aucune annonce ; l'agent n'attend jamais. **À la fin, le récapitulatif porte tout le texte** : la sélection des tests, chaque défaut et chaque doute avec sa capture entourée, puis la question « bug » ou « voulu » de chacun, la correction de note, et ce qui a été écrit. Deux entrées : `parcours.mjs` (mode dev, les tests acceptés du vault) et `exploration.mjs` (mode grand public, n'importe quel site, sans test écrit). Les couleurs sont provisoires et neutres : la direction artistique vient après (méthode `/taste`).

- Installer : `pnpm install --ignore-workspace` dans ce dossier (`pngjs` pour la sonde, `rough-notation` pour les traits), et `pnpm install` à la racine (`parcours.mjs` lit le vault par `../../memoire/index.ts`, qui a besoin de `yaml`).
- Fichiers : `parcours.mjs` (la scène du mode dev), `exploration.mjs` (la scène du mode grand public), `recapitulatif.mjs` (la fin commune aux deux : récapitulatif, puis bug ou voulu), `note-passage.mjs` (la note du passage complétée après les décisions), `sonde-t7.mjs` (la preuve T7), `couche-horama.js` (curseur, mascotte, traits, bulle et panneau de la fin, dans la page), `scene.mjs` (Chrome, CDP, captures, clics), `agent-h.mjs` (pont `holo`, session H, règles données à l'agent), `decisions.mjs` (décisions et état du passage en base, Supabase ou mémoire), `controle-captures.mjs` (contrôle chiffré des captures J3). Ce qui vient de Nami est dit en tête de chaque fichier.
- `essais/` est hors Git : faux module de vérification, copie du vault, témoins, film.

## Le parcours (`parcours.mjs`)

- Avec l'agent (clé `HAI_API_KEY`, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`, outil `holo` installé) : `node --env-file=<.env.local> automatisation/scene/parcours.mjs`
- Sans H (le script fait lui-même les clics par CDP, au rythme d'un agent) : `node automatisation/scene/parcours.mjs --sans-agent`
- Essai complet sans rien écrire dans le vault du repo (depuis ce dossier) :
  ```
  cp -R ../../vault-horama essais/vault-copie
  node parcours.mjs --sans-agent --choix bug,bug,voulu --vault essais/vault-copie --sortie essais/passage-1 --temoins essais/temoins --film essais/film --fermer-chrome
  ```
- Écrire les références de la version 12 dans le vault : `node automatisation/scene/parcours.mjs --version 12 --ecrire-references --sans-agent --sans-fin`

### Le coureur d'Ali, la session H et la base

Le passage est joué par le coureur d'Ali (`creerCoureur` de `agent/index.ts`), dans les deux modes. La scène lui donne trois choses et garde tout le reste (Chrome, couche, captures, vérification, mascotte, fin du parcours) :

- `relever(ecran, vue)` : le crochet décrit plus bas (étape 3). Il rend un `ReleveCapture` (`agent/src/coureur.ts`) : PNG, texte, adresse, dimensions, défilement et la phrase lue par l'agent. Sur une autre page il ne vérifie ni ne présente rien et rend la capture avec la vraie adresse : c'est le coureur qui refuse le relevé (« Relevé refusé : écran non atteint… »). Un relevé déjà enregistré est répondu par le coureur, sans rappeler la scène.
- `navigateur` (avec l'agent) : à chaque session demandée, l'onglet revient à `about:blank` et un nouveau pont `holo local browser` démarre sur un nouveau canal (`startBridge` de `agent-h.mjs`, journal `pont-holo.log` dans le dossier de sortie).
- `identifiant` : l'identifiant du passage de la scène. La couche, le dossier de sortie, `passage.json`, la base et le rapport du vault portent le même.

D'où vient la session H : `creerSessionH` d'Ali (`agent/src/session.ts`). Elle crée l'agent `horama-testeur` avec la consigne de `construireConsigne` (instructions, tâche, outils `relever` et `terminer`), suit la session, abandonne une session muette après 45 s et la relance une fois après 35 s de pause. Sa consigne est écrite dans `consigne.md`, pour mémoire. La scène lui passe `h.settle_s` 1,2 s (PR #26 d'Ali) : le clic retenu arrive à la page 620 à 922 ms après le geste de l'agent, et à 0,5 s l'agent a recliqué une fois (sur « Factures ») sur trois parcours réels complets le 17/11 (14 h 51, 15 h 11, 15 h 15). Ctrl+C annule le coureur (option `signal`, PR #22 d'Ali : pont arrêté, session H supprimée), la scène attend cette annulation 10 s au plus puis sort avec 130. Le coureur borne chaque `relever` : la scène lui passe `hookTimeoutMs` 45 000 ms. `relever` n'attend plus la mascotte (56 à 121 ms sur 28 relevés mesurés le 17/11 sans l'agent, sur le Mac de Nathan) ; la borne reste pour une page qui ne répond pas. Un relevé qui dépasse est noté en échec et l'agent passe aux suivants.

Sans l'agent, la session est celle du script (`session` injectable du coureur) : identifiant `script-<passage>`, une étape par geste (ouvrir la page, chaque clic, chaque relevé, la fin), chaque relevé passe par l'outil `relever` du coureur, puis `terminer(etat="reussi")`. Coût inconnu (`null`).

Ce qui va en base, écrit par le coureur : la ligne `passages` (`en_cours`, puis `joue` ou `echec` avec durée et coût), une ligne `evenements` par étape, par relevé accepté le PNG dans le stockage `captures` et sa ligne `captures`, et à la fin de la session un `resultats` par test (le C4, calculé à la fin de la session, donc avant les choix de l'humain). Chaque étape est aussi dite dans le terminal (`étape n : …`). Le coureur écrit enfin son rapport dans `<vault>/<logiciel>/passages/<id>.md` : pour un essai, donner une copie du vault.

Ce que la scène écrit en base (`decisions.mjs`), à la fin du parcours et seulement quand le coureur a rendu le passage `joue`, dans cet ordre : chaque choix « bug » ou « voulu » est écrit dans le vault, puis la même `Decision` part en base (une ligne `decisions` `{ id, passage_id, payload }`, l'identifiant vaut date, écran et écart : rejouer le même jour réécrit la même ligne, comme le fichier du vault), puis `passages.etat` passe à `verifie` (le contrat C3 dit « Nathan writes verifie »). Une écriture refusée est dite avec le code HTTP seulement, les écritures suivantes continuent, l'état n'est pas passé à `verifie` et la sortie est 1. Passage `echec` ou non rendu : rien n'est écrit en base et la fin le dit. Avec `--sans-fin` : aucune décision, l'état passe quand même à `verifie`. Un seul écrivain par table : la scène n'écrit aucun `resultats`.

| Mode | Base par défaut | Autre choix |
|---|---|---|
| avec l'agent | Supabase (`creerBaseSupabase`) | `--sans-base` : en mémoire |
| `--sans-agent` | en mémoire (`BaseMemoire`), pour ne pas remplir la base partagée de passages scriptés | `--avec-base` : Supabase |

En mémoire, les mêmes écritures sont gardées en mémoire et la fin dit les comptes (passages, captures, événements, décisions) et l'état du passage, gardés sous `base` dans `passage.json`.

Ce qu'il fait :
1. Lit les tests acceptés (`lireTestsAcceptes`), les notes (`lireNotes`) et les décisions (`lireDecisions`) du vault. Les relevés de tous les tests, dans l'ordre et sans doublon, font un seul parcours. En version 12, `/v13/` devient `/v12/` et un test dont une vue n'existe pas dans cette version est écarté ; les tests restants sont donnés au coureur.
2. Chaque clic de l'agent est **retenu** le temps que le curseur arrive dessus, puis rendu à la page (voir « Le curseur »).
3. À chaque `relever(ecran, vue)` : l'adresse de la page est vérifiée, la couche est masquée, la capture et le texte sont pris et rangés dans `releves/`, puis `verifierReleve` est appelé, `texte_zone` est rempli pour chaque constat visuel, et `consoliderConstats` repasse sur tous les constats du parcours. **La réponse part à l'agent tout de suite** : `relever` n'attend ni la mascotte ni les traits.
4. Pendant que l'agent continue, sans un mot ni une bulle, dans une file de la scène que `relever` n'attend pas : la mascotte passe en `verification`, le trait de chaque constat nouveau de cet écran se dessine à la main (cercle rouge autour d'un défaut prouvé, cadre orangé pour un doute, sans texte ni numéro), un doute expliqué par un défaut prend le trait d'un défaut ; puis la mascotte prend l'expression du constat le plus grave de l'écran avec un sursaut (`defaut` si un défaut prouvé, sinon `interrogation` si un doute, sinon `repos` si un point n'a pas pu être vérifié, sinon `conforme`), la garde 1,2 s et revient à `repos`. Ordre des constats : ce qu'une décision a déjà tranché, puis les règles, puis les écarts d'image. Si l'agent change de page pendant un dessin, le trait est gardé pour l'adresse de son écran et apparaît quand l'agent y revient. Un agent rapide (le script à `--rythme 1`) peut quitter l'écran avant la fin de sa file : l'expression de la mascotte arrive alors sur l'écran suivant. Les phrases `annonce` et `resultat` de `formuler()` ne sont pas dites ici : elles servent à la fin.
5. À la fin du parcours (la file est d'abord vidée), la page s'assombrit et un panneau montre le **récapitulatif** (`recapitulatif.mjs`) : le bilan (« J'ai fini. 1 doute. »), la sélection des tests (avec `--impact` : chaque test rejoué et ses raisons, chaque test écarté et sa raison ; sinon les tests joués), puis chaque défaut prouvé et chaque doute en vignette : la capture du relevé (couche masquée), recadrée autour des zones entourées sur la page, et le `resultat` de `formuler`. Six vignettes au plus, les autres sont annoncées. Puis chaque constat, un à la fois, en grand dans le panneau : sa capture entourée, l'`annonce` et le `resultat` (un `resultat` que la question reprend mot pour mot n'est pas dit deux fois), la `question` et les boutons « C'est un bug » et « C'est voulu », qui se cliquent à la vraie souris ; le choix tombe en tampon. La page n'est plus rouverte pour la fin.
6. « Je range tout ça. » : chaque choix devient une `Decision` (`versDecision`). Pour chaque « voulu », `proposerCorrection(vault, decision, { indices: [question] })` reçoit la question de `formuler` de ce constat. Si une correction est proposée, une bulle montre la phrase `avant` barrée, la phrase `apres` et deux boutons cliquables à la souris, « Accepter » et « Refuser ». Accepter appelle `appliquerCorrection` : la note est corrigée et la décision écrite avec `correction_de_note.statut: "acceptee"`. Refuser appelle `refuserCorrection` : la note reste inchangée, la décision est écrite avec `statut: "refusee"`. Ces fonctions écrivent déjà la décision : la scène ne la réécrit pas. Sans proposition (y compris un échec du modèle), la mascotte montre la `raison`, puis la décision sans correction est écrite par `ecrireDecision`, comme un « bug ». **Repli** : si `proposerCorrection`, `appliquerCorrection` ou `refuserCorrection` lève une erreur (par exemple la phrase `avant` n'apparaît plus exactement une fois dans la note), la décision part sans correction (celle de `versDecision`, écrite par `ecrireDecision` puis envoyée en base comme les autres), le terminal donne le message de l'erreur et la mascotte dit « Je n'ai pas pu corriger la note : je garde ta décision sans correction. » (témoin `correction-impossible`). Le parcours continue et la sortie n'est pas en erreur pour ça. Les décisions sont relues par `lireDecisions`. L'écran de fin liste les fichiers écrits et le compte. La même décision finale est ensuite envoyée en base par `decisions.mjs`, avec sa correction et son statut, puis l'état du passage passe à `verifie`. `passage.json` conserve cette même décision, la fenêtre reste ouverte.
7. Au parcours suivant, les décisions du vault sont données à `verifierReleve` : un doute déjà tranché « voulu » compte comme bon et n'est plus demandé.
8. **La note du passage** (issue #71, point 2, `note-passage.mjs`) : le coureur écrit `<vault>/<logiciel>/passages/<id>.md` à la fin de la session H, avant tout choix. Après les décisions, la scène la complète d'une section « Après le passage » : les tests rejoués et écartés (avec `--impact`, leurs raisons), chaque défaut prouvé et chaque doute avec sa capture entourée (rangée dans `passages/<id>/<constat>.png`, cadre de la couleur de son genre) et la décision prise (lien vers le fichier de `decisions/`, statut de la correction de note), puis la PR (`--pr`). Rappelée deux fois, la section est remplacée ; la partie du coureur ne change pas. Sans note du coureur (passage non rendu), rien n'est écrit.

Ce qui s'écrit à l'écran, et quand : rien pendant le parcours ; à la fin, le panneau du récapitulatif, l'explication et la question de chaque constat à trancher, la correction de note après un « voulu » dans la bulle de la mascotte (ou sa raison d'absence, ou son repli), « Je range tout ça. », puis l'écran de fin (ce qui a été écrit). Le terminal ne dit aucune ligne « Mascotte » pendant le parcours (seulement les étapes, les relevés et, avec `--temoins`, les témoins `trait-pendant-agent`).

Options :

| Option | Effet |
|---|---|
| `--sans-agent` | les clics sont faits par le script (CDP) ; H n'est pas appelé |
| `--sans-base` | avec l'agent : la base est en mémoire au lieu de Supabase |
| `--avec-base` | sans l'agent : le passage scripté s'écrit dans Supabase |
| `--rythme <s>` | pause fixe entre deux gestes du script ; sans elle, entre 2 et 4 s au hasard |
| `--sans-presentation` | pour l'intégration continue : même parcours, même coureur, mêmes relevés, verdicts et décisions. Pendant le parcours rien ne change sauf l'expression gardée 1,2 s et l'attente de 800 ms d'un écran sans trait, retirées ; à la fin, le panneau s'affiche sans temps de lecture, aucune bulle (« Je range tout ça. »), `--choix` répond dès que la question est posée, pas d'attente de 900 ms pour regarder. Restent : la pause entre deux gestes du script (`--rythme`), le clic retenu, le dessin des traits (les questions de la fin en ont besoin), les questions, l'écran de fin. `sans_presentation` dans `passage.json`. Mesure : `docs/tests/2026-11-17-rythme-ci.md` |
| `--vitrine` | la scène agrandie en plein écran dans un Chrome séparé, comme en mode grand public (`vitrine.mjs`, voir plus bas) ; la page de la scène reste à 1280 × 900 ; si la vitrine ne démarre pas, la scène continue ; mesures sous `vitrine` dans `passage.json`. `--profil-vitrine`, `--vitrine-debug` comme pour `exploration.mjs` |
| `--clic-direct` | le clic n'est pas retenu : la page réagit tout de suite, le curseur suit |
| `--choix bug,voulu,…` | répond tout seul aux questions de la fin, dans l'ordre (essais, captures) ; une question sans réponse attend un vrai clic |
| `--sans-fin` | s'arrête au bilan : ni questions, ni écriture |
| `--par <nom>` | qui tranche, écrit dans chaque décision (défaut « Nathan ») |
| `--vault <dossier>` | défaut `../../vault-horama`. **Les décisions s'y écrivent** : pour un essai, donner une copie |
| `--verification <fichier>` | le module de vérification (défaut `../../jugement/verification/index.ts`) |
| `--correction <fichier>` | module exportant `proposerCorrection`, défaut `../../jugement/correction/index.ts` ; chemin relatif au dossier courant, comme `--verification` |
| `--correction-choix accepter\|refuser` | répond automatiquement à chaque proposition de correction, après un temps de lecture ; sans cette option, attend un vrai clic |
| `--logiciel`, `--version 13`, `--reference 12`, `--tests a,b,c`, `--r <ids>` | quoi jouer (défaut : tous les tests, par ordre d'identifiant) |
| `--base-url <adresse>` | origine du logiciel testé (défaut : `FAUX_SAAS_URL`, sinon Facturo en ligne). Le parcours (écrans, vues, adresses, page de départ) est celui que `construireConsigne` d'`agent/` donne à H : la scène n'a plus sa propre copie des vues ni des adresses |
| `--pr-doc <propriétaire/dépôt>` | après chaque correction de note **acceptée**, ouvre la PR de documentation par `ouvrirPrDoc` (`automatisation/pr-doc/`) dans ce dépôt ; un échec est dit (terminal et bulle) sans arrêter la scène ni changer la sortie ; l'adresse de la PR, ou la raison de l'échec, va dans la note du passage. `--pr-doc-base` (défaut `dev`), `--pr-doc-vault` (dossier du logiciel dans ce dépôt, défaut `vault-horama/<logiciel>`), `--pr-doc-remote` (autre dépôt distant, par exemple un dépôt Git local nu pour un essai), `--lien-passage` (lien du passage écrit dans la PR, défaut `http://localhost:3000/passages/<id>`) |
| `--pr <adresse>` | la PR dont le déploiement a réveillé le passage, écrite dans la note du passage |
| `--impact <fichier>` | la sélection des tests d'un changement (`horama-impact-1`) : sans `--tests`, les tests joués ; montrée au récapitulatif, jamais avant le parcours |
| `--ecrire-references` | range chaque capture par `ecrireReference` |
| `--temoins <dossier>` | captures avec la couche visible, nommées par ce qu'elles montrent (`curseur-a-mi-trajet`, `trait-pendant-agent` : un trait au tiers de son dessin, après la réponse du relevé à l'agent, le délai est dit dans le terminal ; `trait-defaut`, `trait-doute-deplacement`, `mascotte-defaut-sans-bulle`, `recapitulatif`, `examen-1`, `reponse-1`, `rangement`, `correction-proposee`, `correction-acceptee`, `correction-refusee`, `correction-absente`, `correction-impossible`, `fin`…) |
| `--film <dossier>` | une capture avec la couche toutes les 200 ms, du début à l'écran de fin (`<n>-<ms depuis le début>ms.jpg`) |
| `--sortie <dossier>` | défaut `/Users/nathan/Code/projet/horama/.orchestrateur/passages/<identifiant>/` |
| `--port 9333`, `--profil <dossier>`, `--fermer-chrome` | le Chrome dédié ; sans `--fermer-chrome` il reste ouvert à la fin |

`--plafond` est retiré : l'agent n'attend plus la mascotte. Passé quand même, il est ignoré.

Variables : `HAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FAUX_SAAS_URL`, `CHROME_BIN`, `HOLO_BIN`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. Sortie : 0 tous les relevés pris, passage `joue` selon le coureur et rien en erreur, 1 sinon, 2 il manque quelque chose (dont les variables Supabase quand la base est Supabase), 130 Ctrl+C. `settle_s` : voir plus haut (1,2 s, passé par la scène).

Zone de page : `fitViewport` (`scene.mjs`) règle d'abord la fenêtre, puis impose 1280 × 900 à la densité 1 par `Emulation.setDeviceMetricsOverride`, sur tout écran (l'écran du Mac seul ne donne que 1280 × 862 à la fenêtre). Mesuré le 17/11 sur l'écran du Mac seul : la zone tient après un changement de page (même origine, autre origine, `about:blank`) tant que la connexion CDP qui l'a posée reste ouverte, et se perd quand elle se ferme (retour à 1280 × 862) ; chaque `connectTab` est donc suivi de `fitViewport`. Les captures restent à 0 pixel des références prises sur grand écran sans émulation. L'effet sur les clics de H est à mesurer (sur l'écran du Mac seul, la fenêtre montre moins que la zone émulée).

`passage.json` : identifiant, version, référence, tests joués et écartés, relevés, `constats` (consolidés, avec `explique_par`, `nature`, `decision_id`), bilan, compteur, `decisions` (chaque décision écrite et son fichier), clics (avec `trajet_ms` et `retard_ms`), `retard_par_clic_ms`, `sans_presentation` (vrai avec `--sans-presentation`), `relever_ms` (durée de chaque `relever`, de l'appel de l'outil à la réponse rendue à l'agent), `relever_max_ms`, `delai_crochet_ms`, `fin_s` (du dernier relevé rendu à l'agent jusqu'à l'écran de fin, ou jusqu'au récapitulatif quand il n'y a rien à trancher ; comprend la fin de la session, la file des dessins, le récapitulatif, les questions et les corrections), film. `presentations` et `plafond_s` ont disparu : plus rien n'est présenté pendant le parcours. Depuis le `RapportPassage` du coureur : `duree_s` et `cout_usd` (`rapport.passage`), `etapes`, `session_h` et `replay_url` (répétés dans chaque entrée de test), `etat` (`joue` ou `echec`). `relances` : sessions demandées par le coureur moins une. `base` : les comptes de la base en mémoire (passages, captures, événements, décisions) et l'état du passage en base (`etat`, `verifie` quand tout s'est bien passé), ou `"supabase"`. Une valeur que le mode sans agent ne mesure pas vaut `null`.

### Le module de vérification

La scène ne fabrique aucune phrase sur un constat : elle les demande au module, qui doit exporter les quatre fonctions ci-dessous. Sans elles le script s'arrête avant tout lancement (sortie 2). `jugement/verification/` les exporte toutes les quatre depuis S3-B.

```ts
verifierReleve(entree): Constat[]
consoliderConstats(constats: Constat[]): Constat[]
formuler(constat: Constat): { annonce?: string; resultat: string; question?: string }
versDecision(constat, choix: "bug" | "voulu", contexte: { passage_id, test_id, logiciel, version, par, le }): Decision
// Constat porte : id, ecran, vue, nature? ("deplacement" | "changement"), zone_avant?, texte_zone?, explique_par?
```

Ce que la scène fait de chaque constat consolidé. Pendant le parcours aucun texte : la mascotte prend, pour tout l'écran, l'expression du constat le plus grave (colonne « Mascotte »). Le texte ne vient qu'à la fin, dans le panneau.

| Constat | Mascotte (parcours) | Page (parcours) | Fin |
|---|---|---|---|
| règle `PASS` | `conforme` | rien | rien |
| règle `VERIFIED_FAIL` | `defaut` | cercle rouge tracé à la main autour des `textes_a_surligner` | vignette, puis capture entourée, `annonce`, `resultat`, question |
| visuel `SUSPECTED` | `interrogation` | cadre orangé tracé à la main autour de la zone, élargie au texte de l'élément en son centre | vignette, puis capture entourée, `resultat` s'il diffère de la question, question |
| visuel `SUSPECTED`, `nature: "deplacement"` | `interrogation` | cadre au nouvel emplacement, cadre gris en pointillé sur `zone_avant` | comme un doute |
| visuel `PASS` avec `decision_id` | `conforme` | rien | rien |
| `INCONCLUSIVE` | `repos` (sans sursaut) | rien | compté dans le bilan (jamais une réussite) |
| porte `explique_par` | ne compte pas pour l'expression | s'il avait déjà son cadre, il prend le trait d'un défaut quand le défaut qui l'explique est dessiné | rien (la question est celle du défaut) |

`test_id` d'une décision : le test qui porte la règle du constat ; pour un écart d'image, le premier test qui demande cet écran.

### Essayer la correction sans agent H

Le module de correction doit exporter `proposerCorrection(vault, decision, { indices })`, avec le même résultat que `jugement/correction/index.ts` : `{ decision, raison, modele, duree_ms, essais }`. `indices` contient la question posée à l'humain (notamment la nouvelle position d'un élément). Sans proposition, `decision` revient sans `correction_de_note` et `raison` est affichée sans attendre un clic. Un module absent ou sans cet export arrête le lancement avec le code 2.

Dans `essais/` (ignoré par Git), préparer un faux module `faux-correction.ts` qui retourne la décision reçue enrichie de `correction_de_note: { fichier, avant, apres, statut: "proposee" }`. `fichier` est relatif au logiciel dans le vault. Prendre une phrase `avant` du corps de la note de l'écran, présente exactement une fois : `appliquerCorrection` refuse un remplacement absent ou ambigu. Le faux module permet d'essayer les boutons sans modèle distant, sans jeton et sans nouvelle dépendance.

Depuis `automatisation/scene/`, après installation des dépendances et démarrage du faux SaaS, sur une copie uniquement :

```sh
mkdir -p essais
cp -R ../../vault-horama essais/vault-copie
FAUX_SAAS_URL=http://localhost:3100 node parcours.mjs \
  --sans-agent --sans-base --rythme 1 --choix bug,bug,voulu \
  --vault essais/vault-copie --correction essais/faux-correction.ts \
  --correction-choix accepter --temoins essais/temoins-a --fermer-chrome
```

Adapter `CHROME_BIN`, `--profil` et `--sortie` à la machine. Si les références du vault ont été prises dans un autre environnement graphique, les renouveler **dans la copie seulement**, par un premier parcours `--sans-agent --sans-base --version 12 --reference 12 --ecrire-references --sans-fin`. Dupliquer ensuite cette copie vierge de décisions pour chaque essai, afin que les « voulu » antérieurs ne neutralisent pas les questions.

Vérifier par `diff` que seule la phrase attendue de la note a changé et que la décision porte `statut: "acceptee"`. Repartir d'une copie neuve avec `--correction-choix refuser` : `diff` vide et `statut: "refusee"`. Enfin, sans `--correction` et sans jeton du modèle, vérifier la raison d'absence de proposition et la fin normale du parcours. Les témoins `correction-proposee` et `correction-acceptee` montrent la proposition avec ses boutons, puis le statut final ; `correction-refusee` et `correction-absente` couvrent les autres cas. L'écriture des décisions, de la note et du rapport reste dans la copie ; `--sans-base` conserve les écritures de base en mémoire.

## Le mode grand public (`exploration.mjs`)

N'importe quel site, sans test écrit (issue #69, point 5). Le moteur d'exploration d'Ali (`agent/src/exploration/explorer.ts`, #64) trouve les pages et les fait visiter par l'agent H ; la scène lui donne son Chrome, ses captures (couche masquée, comme les relevés du mode dev) et le pont de chaque session H, et lit le fichier `horama-exploration-1` qu'il réécrit (`docs/decisions/2026-11-17-format-exploration.md`), toutes les 250 ms.

- Avec l'agent : `node --env-file=<.env.local> automatisation/scene/exploration.mjs --url https://exemple.org`
- Sans H et sans Holo (le script ouvre chaque page et appelle les outils comme l'agent ; les contrôles par le code tournent quand même), sur une copie du vault :
  ```
  cp -R vault-horama essais/vault-copie
  node automatisation/scene/exploration.mjs --url https://exemple.org --sans-agent --sans-holo --rythme 3 --vault essais/vault-copie --temoins essais/temoins --fermer-chrome
  ```
- Pendant le passage : dès qu'une page passe `visitee` et que l'agent y est encore, chaque défaut prouvé et chaque doute de la page reçoit son trait, sans texte. Où il est sur la page : son élément (`preuve.element`, le sélecteur du contrôle), sinon ses `textes_a_surligner`, sinon sa `zone` sur la capture de la page. Un défaut hors de l'écran (un lien mort en bas d'article) est d'abord amené à l'écran : l'agent ne lit plus la page après son relevé, son geste suivant est d'ouvrir l'adresse suivante. Puis la mascotte prend l'expression du pire constat de la page. Un doute qui porte `explique_par` n'a pas de trait à lui.
- À la fin : le même récapitulatif que le mode dev (`recapitulatif.mjs`) : pages visitées et trouvées, défauts, doutes, points non vérifiés, pages écartées par raison, puis chaque défaut prouvé et chaque doute sans `explique_par`, sa capture entourée (le fichier `capture` du constat et sa `zone`), sa page, sa description, la preuve en clair (« Mesuré : … Attendu : … » pour un contrôle ; « rien n'est prouvé » pour Holo), et « bug » ou « voulu ».
- La note du passage écrite par le coureur (`<vault>/<site>/passages/<id>.md`) est complétée comme en mode dev : pages visitées, non visitées et écartées à la découverte, chaque défaut et doute avec sa capture entourée et sa décision.
- Chaque choix devient une décision (C5) écrite dans la mémoire du site (`<vault>/<site>/decisions/`, `test_id` `exploration--<ecran>`, `ecart` = la description), puis en base (en mémoire sans l'agent, Supabase avec ; `--sans-base`, `--avec-base` comme en mode dev), et le passage passe à `verifie`.
- Le moteur écrit aussi, dans le vault donné, les références et les notes vides des pages vues la première fois : pour un essai, une copie.
- **Capture d'un défaut hors du premier écran** (crochet `capturerZone` du runtime, forme validée par Ali sur la PR #85) : le moteur donne la zone en pixels du document ; la scène (`captureZone` de `scene.mjs`) fait défiler la page **une seule fois, en douceur**, comme le public le voit, jusqu'à mettre la zone au milieu de l'écran (fin du défilement attendue 1,5 s au plus, quel que soit le `scroll-behavior` du site), masque sa couche et sort le pointeur pour la capture seulement, puis **laisse la page là** : le cercle se trace à cet endroit, sans aller-retour (retour de Nathan après la répétition réelle du 18/11). Elle rend `{ png, zone, defilement }`, `zone` en pixels de la capture, absente quand elle n'est pas dans l'image : le moteur se replie alors sur sa propre capture. Test sur un vrai Chrome : `node --test capture-zone.test.mjs` (depuis ce dossier, port 9334, page locale, sans réseau ; il vérifie le défilement doux, l'absence d'aller-retour, la zone centrée et la couche absente de la capture).
- **Au démarrage**, la scène ouvre tout de suite la page de départ (`--url`), la mascotte en lecture : on la voit pendant que les pages sont trouvées et que l'agent H démarre (environ 20 s mesurées le 18/11 à 11 h 45), au lieu d'une page blanche. Chaque session H part de la page où l'on est ; l'agent la rouvre par son `go_to`.
- **Visite comme un visiteur** (issue #91, PR #93 d'Ali) : `--pages-cliquees 4` est passé au moteur, qui fait lire et défiler la page de départ par H, puis lui fait atteindre ce nombre de pages par un vrai clic sur un lien visible ; les autres pages sont ouvertes par leur adresse. Les clics passent par le curseur de la couche comme en mode dev. Le champ facultatif `arrivee` d'une page (`depart`, `clic`, `adresse`, décidé dans #69) s'affiche s'il est présent : dans la question du récapitulatif (« Page … (atteinte par un clic de l'agent) »), dans le compte des pages (« 4 pages atteintes par un clic de l'agent, 3 ouvertes par leur adresse ») et dans la note du passage.
- **Vitrine** (`--vitrine`, `vitrine.mjs`, 18/11) : la scène agrandie en plein écran pour le public, dans un Chrome séparé (profil `--profil-vitrine`, mode application, sur le plus grand écran), retransmise par `Page.startScreencast` et un petit serveur local (`127.0.0.1:9400`). Le vrai Chrome de la scène garde sa page de 1280 × 900 pour H, les captures et les références. Si la vitrine ne démarre pas, la scène continue dans sa fenêtre. Ses mesures (images, images par seconde, délai) vont dans `scene.json`. `--vitrine-debug <port>` ouvre un port de débogage sur la vitrine (essais).
- Options : `--url` (requise), `--max 15`, `--pages-cliquees 4`, `--sans-agent`, `--sans-holo` (aucun appel à Holo, aucun coût), `--rythme <s>` (sans l'agent : pause avant et après chaque relevé, 2 s par défaut ; l'agent H met 8 à 10 s par étape), `--choix`, `--sans-fin`, `--par`, `--vault`, `--sortie` (défaut `.orchestrateur/exploration/<identifiant>/` : `exploration.json`, `captures/`, `scene.json`), `--temoins`, `--port`, `--profil`, `--fermer-chrome`.
- Sortie : 0 exploration `fini` et rien en erreur, 1 sinon, 2 il manque quelque chose.

## La couche dans la page (`couche-horama.js`)

Posée par `Page.addScriptToEvaluateOnNewDocument` avec le code de `rough-notation` (aucun appel réseau depuis la page), dans un Shadow DOM fermé. Tout ce qu'elle dessine y vit, traits compris : `masquer()` cache tout d'un coup pour une capture. Tout son état (curseur, place de la mascotte, bulle, zones par adresse de page) vit dans `sessionStorage` : il survit à un changement de page, et les traits d'un écran déjà annoté reviennent sans se redessiner. Un nouveau passage repart de zéro.

**Monde isolé.** La couche ne vit pas dans le monde JavaScript de la page testée mais dans un monde isolé nommé `horama`, comme le script de contenu d'une extension : `worldName` de `Page.addScriptToEvaluateOnNewDocument`, liaisons `horamaPress` et `horamaChoix` posées par `Runtime.addBinding` avec `executionContextName: "horama"`. Le DOM est partagé : la couche dessine dans la page et voit les vrais clics de l'agent. Mais le code du logiciel testé ne voit ni `window.__horama` ni les deux liaisons : il ne peut pas répondre « voulu » ou « accepter » à la place de l'humain. `installLayer` suit l'identifiant de ce monde dans le cadre principal (`Runtime.executionContextCreated`, `executionContextDestroyed`, `executionContextsCleared`) ; `layer()` et le masquage de `capture()` s'évaluent dans ce monde (`Runtime.evaluate` avec `contextId`). Ce qui lit la page testée (`evaluate`, `waitFor`, texte et adresse de `capture`, points de clic du script) reste dans le monde principal. Reste visible de la page : le DOM de l'hôte (son Shadow DOM est fermé) et l'entrée `horama` de `sessionStorage`, qu'elle peut lire ou réécrire (effet sur l'affichage seulement, aucun choix ne passe par là).

### Le curseur

- Une flèche noire de 40 px. À chaque appui de l'agent elle part de sa dernière position, suit une courbe, accélère puis freine, s'enfonce à l'arrivée avec une onde. Durée du trajet : 500 ms plus 0,4 ms par pixel, 800 ms au plus.
- **Clic retenu** : la couche arrête l'appui réel en phase de capture (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`), joue le trajet, puis rejoue ces cinq événements sur le même élément, au même point, 120 ms après l'arrivée. Le clic rejoué n'est pas « de confiance » (`isTrusted` faux) : un lien, un `<summary>` et un bouton réagissent (essayé sur Facturo), un site qui exige un clic de confiance non. Un champ de saisie reçoit le focus.
- `--clic-direct` : rien n'est retenu, le curseur rejoint le clic pendant que la page réagit (le trajet continue sur la page suivante). C'est ce que garde la sonde T7.
- Pendant les questions de la fin, le curseur de l'agent est caché et un clic sur la page est ignoré : seuls les deux boutons reçoivent les clics.

### La mascotte

- Pendant le parcours elle ne parle pas et attend dans un coin de la page (en bas à droite au départ). Elle change de coin quand le curseur va se poser sur elle, quand il s'est posé près d'elle, quand une page s'ouvre avec une zone sous elle et quand un trait va se dessiner sous elle : elle prend le coin qui cache le moins (le curseur et les zones d'abord, puis les textes et les boutons), le plus proche à égalité. Elle ne bouge pas pour un simple texte sous elle.
- À la fin, elle se tient à gauche du panneau ; pour la correction d'une note, sa bulle se place là où elle cache le moins.
- Elle rejoint sa place sur un ressort (raideur 130, amortissement 19, sans rebond visible), respire en permanence, et ses pupilles suivent le curseur pendant tout le parcours, droit devant à la fin.
- À chaque relevé : `verification` (cadre autour de l'œil, regard qui balaie) pendant le dessin des traits, puis l'expression de l'écran avec un sursaut, gardée 1,2 s, puis `repos`.

Commandes, appelées par `layer(page, "<commande>", ...)` de `scene.mjs` (`window.__horama` dans le monde `horama` de la page ; une promesse est attendue) :

| Commande | Effet |
|---|---|
| `etat(nom, sursaut)` | `repos`, `verification`, `interrogation`, `defaut`, `conforme` ; `sursaut` vrai : la mascotte saute une fois en le prenant |
| `surligner(adresse, rects, genre, id, avant, voir)` | trait tracé à la main en 800 ms autour de chaque rectangle (cercle rouge pour `defaut`, cadre orangé pour `doute`), sans texte ; `avant` : ancien emplacement, en pointillé gris ; gardé pour l'adresse donnée, dessiné tout de suite si c'est la page courante ; `voir` : une zone hors de l'écran est d'abord amenée à l'écran (mode grand public seulement, où l'agent ne relit pas la page après son relevé) |
| `requalifier(id, genre)` | le trait d'un constat change de forme et de couleur, sur toutes les pages |
| `trouver(texte)`, `element(selecteur)`, `autour(zone)` | rectangles des éléments dont le texte affiché vaut `texte` ; rectangle du premier élément du sélecteur CSS ; texte de l'élément au centre d'une zone (40 caractères au plus) et cadre qui contient la zone et ce texte |
| `revue(oui)` | la page s'assombrit, le curseur de l'agent sort, un clic sur la page est ignoré |
| `recap({ titre, lignes, selection, items })` | le panneau du récapitulatif : titre, phrases, sélection (`{ titre, lignes }`), vignettes (`{ id, genre, texte, image, zones, page }` : capture en adresse `data:`, zones en pixels de la capture, taille de la capture) ; rend la main quand les traits des vignettes sont dessinés |
| `examen({ id, rang, genre, etat, image, zones, page, textes, question })` | un constat en grand : capture entourée, phrases, question et boutons « C'est un bug », « C'est voulu » ; la réponse revient par la liaison CDP `horamaChoix` |
| `choisir(choix)` | répond à la place de l'humain (`--choix`) ; le verdict tombe en tampon (« BUG NOTÉ », « VOULU ») sur le panneau |
| `panneau()` | retire le panneau |
| `bulle(texte)` | une bulle de la mascotte (fin seulement), `null` pour la retirer ; rend la main quand la bulle est affichée |
| `correction({ id, file, before, after })` | affiche la proposition dans une bulle, avec la phrase précédente barrée et les boutons Accepter et Refuser |
| `chooseCorrection(choix)` | sélectionne `accepter` ou `refuser` (essais automatiques), une seule fois ; les clics de souris utilisent la même commande |
| `correctionResult(statut)` | affiche le résultat `acceptee` ou `refusee`, une fois la décision écrite par la mémoire |
| `fin({ titre, compte, legende, fichiers })` | l'écran de fin : ce qui a été écrit |
| `masquer()`, `montrer()` | pour une capture |

### Squelette (issue #69, 18 novembre)

- Rien d'autre à l'écran pendant le parcours que le site, le curseur, la mascotte et les traits. Le bandeau, ses compteurs, l'annonce de la sélection, les numéros, les tampons des zones et la loupe sont retirés.
- Couleurs provisoires et neutres, en tête de `couche-horama.js` : panneau blanc, texte graphite, rouge `#E5484D` pour un défaut prouvé, orangé `#E8A33D` pour un doute, vert `#2E9E5B` pour « voulu ». La mascotte (l'œil ailé de la CDO, 17/11) est gardée telle quelle en attendant la direction artistique.
- La direction artistique (couleurs, typographie, mascotte) vient ensuite, par la méthode `/taste` ; le thème de la PR #65 n'est pas branché.

### Remplacer la mascotte provisoire

La mascotte est dessinée en SVG dans `SPRITES`, en tête de `couche-horama.js` : une entrée par état, rien d'autre à toucher.

- États : `repos`, `verification`, `interrogation`, `defaut`, `conforme`.
- Taille : une boîte de 96 × 96 px (`M`). Plus de point d'ancrage ni de miroir : la mascotte n'est plus posée sur le clic.
- Pour une image : remplacer la chaîne de l'état par `<img src="data:image/png;base64,…">` (ou un autre `<svg>`). Une adresse de fichier local ne se charge pas dans la page testée.
- Les mouvements (respiration, inclinaison, sursaut, hochement) sont des animations CSS de la boîte, gardées avec une image. Le regard déplace ce qui porte la classe `pupils` dans le SVG : une image n'a pas de regard, sauf à garder des pupilles en SVG par-dessus.

## Bibliothèques

- `rough-notation` 0.5.1 (licence MIT) : le trait dessiné à la main autour d'une zone. Son code (`lib/rough-notation.iife.js`) est injecté avec la couche.
- Non installées : `driver.js` (l'assombrissement à plusieurs trous tient en un tracé SVG), `motion` (le ressort tient en quatre lignes), `ghost-cursor` (module Node qui dépend de `bezier-js` et `debug`, pas injectable tel quel dans la page : la courbe est écrite dans la couche).

## La sonde T7 (`sonde-t7.mjs`)

- Avec l'agent : `node --env-file=<.env.local> automatisation/scene/sonde-t7.mjs`
- Sans H : `node automatisation/scene/sonde-t7.mjs --sans-agent --passes 2 --sortie automatisation/scene/essais/captures --rapport automatisation/scene/essais/rapport.md`
- Options : `--passes 3`, `--port 9333`, `--profil <dossier>`, `--sortie <dossier>`, `--rapport <fichier.md>`, `--garder-chrome`. Sortie : 0 critère tenu (ou montage qui marche avec `--sans-agent`), 1 non tenu, 2 il manque quelque chose (clé, `holo`, Chrome), 130 Ctrl+C.
- Mesures, écrites dans le rapport (`docs/tests/2026-11-16-t7-navigateur-local.md` par défaut) : zone de page et densité de pixels, puis par passe la durée, les étapes, le coût, les relances, les clics vus par la couche avec l'élément touché, et les captures comparées pixel par pixel à la passe 1 et aux références sans tête.
- Elle utilise la même couche, sans mascotte, et garde son comportement d'origine : les clics ne sont pas retenus (`direct`), le curseur apparaît au premier clic et les suit, `settle_s` reste à 0,5.
