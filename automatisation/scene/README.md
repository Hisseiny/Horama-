# Scène : le parcours en direct, et la sonde T7

La scène de `docs/decisions/2026-11-16-scene-en-direct.md` : le logiciel testé s'ouvre dans un Chrome local visible et l'agent H clique. Deux personnages vivent dans la page : **le curseur**, une flèche qui va jusqu'à chaque clic de l'agent, et **la mascotte Horama**, qui flotte à côté de ce dont elle parle. À chaque écran la mascotte présente ce qu'elle trouve, une chose à la fois, et l'agent attend qu'elle ait fini. À la fin on repasse sur chaque problème, un humain dit « bug » ou « voulu », et chaque choix s'écrit dans le vault. Le parcours vient des tests acceptés du vault.

- Installer : `pnpm install --ignore-workspace` dans ce dossier (`pngjs` pour la sonde, `rough-notation` pour les traits), et `pnpm install` à la racine (`parcours.mjs` lit le vault par `../../memoire/index.ts`, qui a besoin de `yaml`).
- Fichiers : `parcours.mjs` (la scène), `sonde-t7.mjs` (la preuve T7), `couche-horama.js` (curseur, mascotte, bulle, traits, bandeau, fin, dans la page), `scene.mjs` (Chrome, CDP, captures, clics), `agent-h.mjs` (pont `holo`, session H, règles données à l'agent), `decisions.mjs` (décisions et état du passage en base, Supabase ou mémoire), `controle-captures.mjs` (contrôle chiffré des captures J3). Ce qui vient de Nami est dit en tête de chaque fichier.
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

D'où vient la session H : `creerSessionH` d'Ali (`agent/src/session.ts`). Elle crée l'agent `horama-testeur` avec la consigne de `construireConsigne` (instructions, tâche, outils `relever` et `terminer`), suit la session, abandonne une session muette après 45 s et la relance une fois après 35 s de pause. Sa consigne est écrite dans `consigne.md`, pour mémoire. La scène lui passe `h.settle_s` 1,2 s (PR #26 d'Ali) : le clic retenu arrive à la page 620 à 922 ms après le geste de l'agent, et à 0,5 s l'agent a recliqué une fois (sur « Factures ») sur trois parcours réels complets le 17/11 (14 h 51, 15 h 11, 15 h 15). Ctrl+C annule le coureur (option `signal`, PR #22 d'Ali : pont arrêté, session H supprimée), la scène attend cette annulation 10 s au plus puis sort avec 130. Le coureur borne chaque `relever` : la scène lui passe `hookTimeoutMs` 45 000 ms (la plus longue présentation mesurée le 17/11 : 21,1 s) ; un relevé qui dépasse est noté en échec et l'agent passe aux suivants.

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
3. À chaque `relever(ecran, vue)` : l'adresse de la page est vérifiée, la couche est masquée, la capture et le texte sont pris et rangés dans `releves/`, puis `verifierReleve` est appelé, `texte_zone` est rempli pour chaque constat visuel, et `consoliderConstats` repasse sur tous les constats du parcours.
4. La mascotte présente les constats nouveaux de cet écran, l'un après l'autre : l'`annonce` de `formuler(constat)`, le trait qui se dessine autour de ce qui est trouvé, puis le `resultat`. **La réponse à l'agent ne part qu'à la fin de cette présentation**, ou au plafond (`--plafond`, 12 s) : un constat commencé avant le plafond est dit jusqu'au bout, les suivants sont dessinés et comptés sans phrase (la fin y revient). Ordre : ce qu'une décision a déjà tranché, puis les règles, puis les écarts d'image.
5. À la fin du parcours : le bilan en une phrase, puis chaque défaut prouvé et chaque doute, un à la fois. Le script ramène la page à l'adresse du relevé, la page s'assombrit sauf la zone, la `question` du constat s'affiche avec « C'est un bug » et « C'est voulu », qui se cliquent à la vraie souris.
6. « Je range tout ça. » : chaque choix devient une `Decision` (`versDecision`). Pour chaque « voulu », `proposerCorrection(vault, decision, { indices: [question] })` reçoit la question de `formuler` de ce constat. Si une correction est proposée, une bulle montre la phrase `avant` barrée, la phrase `apres` et deux boutons cliquables à la souris, « Accepter » et « Refuser ». Accepter appelle `appliquerCorrection` : la note est corrigée et la décision écrite avec `correction_de_note.statut: "acceptee"`. Refuser appelle `refuserCorrection` : la note reste inchangée, la décision est écrite avec `statut: "refusee"`. Ces fonctions écrivent déjà la décision : la scène ne la réécrit pas. Sans proposition (y compris un échec du modèle), la mascotte montre la `raison`, puis la décision sans correction est écrite par `ecrireDecision`, comme un « bug ». Les décisions sont relues par `lireDecisions`. L'écran de fin liste les fichiers écrits et le compte. La même décision finale est ensuite envoyée en base par `decisions.mjs`, avec sa correction et son statut, puis l'état du passage passe à `verifie`. `passage.json` conserve cette même décision, la fenêtre reste ouverte.
7. Au parcours suivant, les décisions du vault sont données à `verifierReleve` : un doute déjà tranché « voulu » est dit par la mascotte (« Déjà vu et validé. ») et n'est plus demandé.

Options :

| Option | Effet |
|---|---|
| `--sans-agent` | les clics sont faits par le script (CDP) ; H n'est pas appelé |
| `--sans-base` | avec l'agent : la base est en mémoire au lieu de Supabase |
| `--avec-base` | sans l'agent : le passage scripté s'écrit dans Supabase |
| `--rythme <s>` | pause fixe entre deux gestes du script ; sans elle, entre 2 et 4 s au hasard |
| `--plafond <s>` | temps maximal pendant lequel l'agent attend la mascotte à un écran (défaut 12) |
| `--clic-direct` | le clic n'est pas retenu : la page réagit tout de suite, le curseur suit |
| `--choix bug,voulu,…` | répond tout seul aux questions de la fin, dans l'ordre (essais, captures) ; une question sans réponse attend un vrai clic |
| `--sans-fin` | s'arrête au bilan : ni questions, ni écriture |
| `--par <nom>` | qui tranche, écrit dans chaque décision (défaut « Nathan ») |
| `--vault <dossier>` | défaut `../../vault-horama`. **Les décisions s'y écrivent** : pour un essai, donner une copie |
| `--verification <fichier>` | le module de vérification (défaut `../../jugement/verification/index.ts`) |
| `--correction <fichier>` | module exportant `proposerCorrection`, défaut `../../jugement/correction/index.ts` ; chemin relatif au dossier courant, comme `--verification` |
| `--correction-choix accepter\|refuser` | répond automatiquement à chaque proposition de correction, après un temps de lecture ; sans cette option, attend un vrai clic |
| `--logiciel`, `--version 13`, `--reference 12`, `--tests a,b,c`, `--r <ids>` | quoi jouer (défaut : tous les tests, par ordre d'identifiant) |
| `--ecrire-references` | range chaque capture par `ecrireReference` |
| `--temoins <dossier>` | captures avec la couche visible, nommées par ce qu'elles montrent (`curseur-a-mi-trajet`, `trait-a-moitie-doute`, `question-1`, `correction-proposee`, `correction-acceptee`, `correction-refusee`, `correction-absente`, `fin`…) |
| `--film <dossier>` | une capture avec la couche toutes les 200 ms, du début à l'écran de fin (`<n>-<ms depuis le début>ms.jpg`) |
| `--sortie <dossier>` | défaut `/Users/nathan/Code/projet/horama/.orchestrateur/passages/<identifiant>/` |
| `--port 9333`, `--profil <dossier>`, `--fermer-chrome` | le Chrome dédié ; sans `--fermer-chrome` il reste ouvert à la fin |

Variables : `HAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FAUX_SAAS_URL`, `CHROME_BIN`, `HOLO_BIN`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. Sortie : 0 tous les relevés pris, passage `joue` selon le coureur et rien en erreur, 1 sinon, 2 il manque quelque chose (dont les variables Supabase quand la base est Supabase), 130 Ctrl+C. `settle_s` : voir plus haut (1,2 s, passé par la scène).

Zone de page : `fitViewport` (`scene.mjs`) règle d'abord la fenêtre, puis impose 1280 × 900 à la densité 1 par `Emulation.setDeviceMetricsOverride`, sur tout écran (l'écran du Mac seul ne donne que 1280 × 862 à la fenêtre). Mesuré le 17/11 sur l'écran du Mac seul : la zone tient après un changement de page (même origine, autre origine, `about:blank`) tant que la connexion CDP qui l'a posée reste ouverte, et se perd quand elle se ferme (retour à 1280 × 862) ; chaque `connectTab` est donc suivi de `fitViewport`. Les captures restent à 0 pixel des références prises sur grand écran sans émulation. L'effet sur les clics de H est à mesurer (sur l'écran du Mac seul, la fenêtre montre moins que la zone émulée).

`passage.json` : identifiant, version, référence, tests joués et écartés, relevés, `constats` (consolidés, avec `explique_par`, `nature`, `decision_id`), bilan, compteur, `decisions` (chaque décision écrite et son fichier), clics (avec `trajet_ms` et `retard_ms`), `retard_par_clic_ms`, `relever_ms` (durée de chaque `relever`, de l'appel de l'outil à la réponse rendue à l'agent), `relever_max_ms`, `delai_crochet_ms`, `presentations` (durée par écran, constats dits et montrés sans phrase), film. Depuis le `RapportPassage` du coureur : `duree_s` et `cout_usd` (`rapport.passage`), `etapes`, `session_h` et `replay_url` (répétés dans chaque entrée de test), `etat` (`joue` ou `echec`). `relances` : sessions demandées par le coureur moins une. `base` : les comptes de la base en mémoire (passages, captures, événements, décisions) et l'état du passage en base (`etat`, `verifie` quand tout s'est bien passé), ou `"supabase"`. Une valeur que le mode sans agent ne mesure pas vaut `null`.

### Le module de vérification

La scène ne fabrique aucune phrase sur un constat : elle les demande au module, qui doit exporter les quatre fonctions ci-dessous. Sans elles le script s'arrête avant tout lancement (sortie 2). `jugement/verification/` les exporte toutes les quatre depuis S3-B.

```ts
verifierReleve(entree): Constat[]
consoliderConstats(constats: Constat[]): Constat[]
formuler(constat: Constat): { annonce?: string; resultat: string; question?: string }
versDecision(constat, choix: "bug" | "voulu", contexte: { passage_id, test_id, logiciel, version, par, le }): Decision
// Constat porte : id, ecran, vue, nature? ("deplacement" | "changement"), zone_avant?, texte_zone?, explique_par?
```

Ce que la scène fait de chaque constat consolidé :

| Constat | Mascotte | Bulle | Page | Compteur |
|---|---|---|---|---|
| règle `PASS` | `verification` puis `conforme` | `annonce`, puis `resultat` (vert) | rien | bon |
| règle `VERIFIED_FAIL` | `verification` puis `defaut` | `annonce`, puis `resultat` (corail) | trait corail autour des `textes_a_surligner` | problème |
| visuel `SUSPECTED` | `interrogation` | `resultat` (jaune) | trait jaune autour de la zone, élargie au texte de l'élément en son centre | doute |
| visuel `SUSPECTED`, `nature: "deplacement"` | `interrogation` | `resultat` (jaune) | trait jaune au nouvel emplacement, cadre en pointillé « avant » sur `zone_avant` | doute |
| visuel `PASS` avec `decision_id` | `conforme` | `resultat` (« Déjà vu et validé. ») | rien | bon |
| `INCONCLUSIVE` | `repos` | `resultat` | rien | aucun (jamais une réussite), dit dans le bilan |
| porte `explique_par` | n'est pas présenté | | s'il avait déjà son trait jaune, le trait passe en corail quand le défaut qui l'explique est montré | n'est plus un doute |

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

## La couche dans la page (`couche-horama.js`)

Posée par `Page.addScriptToEvaluateOnNewDocument` avec le code de `rough-notation` (aucun appel réseau depuis la page), dans un Shadow DOM fermé. Tout ce qu'elle dessine y vit, traits compris : `masquer()` cache tout d'un coup pour une capture. Tout son état (curseur, place de la mascotte, bulle, compteur, zones par adresse de page) vit dans `sessionStorage` : il survit à un changement de page, et les traits d'un écran déjà annoté reviennent sans se redessiner. Un nouveau passage repart de zéro.

### Le curseur

- Une flèche noire de 40 px. À chaque appui de l'agent elle part de sa dernière position, suit une courbe, accélère puis freine, s'enfonce à l'arrivée avec une onde. Durée du trajet : 500 ms plus 0,4 ms par pixel, 800 ms au plus.
- **Clic retenu** : la couche arrête l'appui réel en phase de capture (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`), joue le trajet, puis rejoue ces cinq événements sur le même élément, au même point, 120 ms après l'arrivée. Le clic rejoué n'est pas « de confiance » (`isTrusted` faux) : un lien, un `<summary>` et un bouton réagissent (essayé sur Facturo), un site qui exige un clic de confiance non. Un champ de saisie reçoit le focus.
- `--clic-direct` : rien n'est retenu, le curseur rejoint le clic pendant que la page réagit (le trajet continue sur la page suivante). C'est ce que garde la sonde T7.
- Pendant les questions de la fin, le curseur de l'agent est caché et un clic sur la page est ignoré : seuls les deux boutons reçoivent les clics.

### La mascotte

- Elle ne suit pas le clic. Elle se place à côté de ce dont elle parle (le rectangle `cible` de la bulle, sinon le curseur), là où elle et sa bulle cachent le moins : jamais sur une zone surlignée ni sur le curseur, le moins possible sur un texte ou un bouton de la page, toujours entière à l'écran et sous le bandeau. Elle s'écarte quand le curseur va se poser sur elle, et quand une page s'ouvre sous elle.
- Elle rejoint sa place sur un ressort (raideur 130, amortissement 19, sans rebond visible), respire en permanence, et ses pupilles regardent la zone dont elle parle, sinon le curseur ; droit devant quand elle nous parle sans rien montrer.
- La bulle est accrochée à la mascotte, à sa droite ou à sa gauche. Une seule à la fois : la mascotte se déplace d'abord, la bulle apparaît ensuite. Sa couleur dit le résultat (vert bon, corail problème, jaune doute, sombre pour le reste). Une bulle ne suit pas l'agent sur un autre écran : si la page change sous elle, elle disparaît.

Commandes, appelées par `layer(page, "<commande>", ...)` de `scene.mjs` (`window.__horama` dans la page ; une promesse est attendue) :

| Commande | Effet |
|---|---|
| `etat(nom)` | `repos`, `verification`, `interrogation`, `defaut`, `conforme` |
| `correction({ id, file, before, after })` | affiche la proposition dans une bulle, avec la phrase précédente barrée et les boutons Accepter et Refuser |
| `chooseCorrection(choix)` | sélectionne `accepter` ou `refuser` (essais automatiques), une seule fois ; les clics de souris utilisent la même commande |
| `correctionResult(statut)` | affiche le résultat `acceptee` ou `refusee`, une fois la décision écrite par la mémoire |
| `bulle(texte, genre, cible)` | une bulle, `null` pour la retirer ; `genre` : `""`, `conforme`, `defaut`, `doute` ; `cible` : rectangle de la page dont elle parle ; rend la main quand la bulle est affichée |
| `compteur(bons, problemes, doutes)` | chiffres du bandeau ; celui qui change grossit un instant |
| `surligner(adresse, rects, genre, id, avant)` | trait dessiné en 800 ms autour de chaque rectangle, puis le numéro ; `avant` : ancien emplacement, en pointillé ; gardé pour l'adresse donnée, dessiné tout de suite si c'est la page courante |
| `requalifier(id, genre)` | le trait et le numéro d'un constat changent de couleur, sur toutes les pages |
| `trouver(texte)`, `autour(zone)` | rectangles des éléments dont le texte affiché vaut `texte` ; texte de l'élément au centre d'une zone (40 caractères au plus) et cadre qui contient la zone et ce texte |
| `revue(oui)` | la page s'assombrit, le curseur de l'agent sort |
| `question({ id, texte, rang, etat })` | met en lumière les zones du constat `id` et pose la question avec ses deux boutons ; la réponse revient par la liaison CDP `horamaChoix` |
| `choisir(choix)` | répond à la place de l'humain (`--choix`) ; le verdict tombe en tampon (« BUG NOTÉ », « VOULU ») sur la question et sur la zone |
| `loupe(oui)` | troisième bouton de la question, « Voir à la loupe » : la zone du constat, grossie 2,4 fois dans une loupe ronde à côté de la question (copie de la page, sans flou ni capture) |
| `fin({ titre, compte, legende, fichiers })` | l'écran de fin |
| `masquer()`, `montrer()` | pour une capture |

### Direction artistique (CDO, 17 novembre)

- La mascotte est l'œil ailé du logo : ailes lavande `#AFA9EC`, trait graphite `#2B2B2B`, iris violet `#7F77DD`. Elle bat des ailes et cligne. `verification` : un cadre violet se ferme autour de l'œil et le regard balaie ; `interrogation` : regard de côté et « ? » ; `defaut` : iris corail `#F26B5B` et secousse ; `conforme` : iris vert `#B6E36B`, coche et tour sur elle-même.
- Fond violet de l'œil `#2A2163` pour le bandeau, les questions et l'écran de fin. Angles droits partout, sauf l'œil, le O du logo et la loupe. Aucun contour, sauf les tampons (3 px, inclinés de -6°).
- Bandeau : le logo HORAMA (l'œil dans le O), puis les compteurs en tampons « OK », « DÉFAUTS », « À TRANCHER ».
- Sur la page : un défaut prouvé est entouré en corail ; un doute a un cadre lavande en pointillé. Chaque zone porte son tampon (« DÉFAUT PROUVÉ », « À TRANCHER », puis « BUG NOTÉ » ou « VOULU » une fois tranché).
- Fin : « TOUT EST TRANCHÉ » en tampon, et le nom des décisions écrites (sans le chemin complet).
- Le fonctionnement ne change pas : mêmes commandes, mêmes arguments, mêmes moments. Seule `loupe(oui)` s'ajoute.

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
- Elle utilise la même couche, sans bandeau ni mascotte, et garde son comportement d'origine : les clics ne sont pas retenus (`direct`), le curseur apparaît au premier clic et les suit, `settle_s` reste à 0,5.
