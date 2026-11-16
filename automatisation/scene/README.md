# Scène : le parcours en direct, et la sonde T7

La scène de `docs/decisions/2026-11-16-scene-en-direct.md` : le logiciel testé s'ouvre dans un Chrome local visible et l'agent H clique. Deux personnages vivent dans la page : **le curseur**, une flèche qui va jusqu'à chaque clic de l'agent, et **la mascotte Horama**, qui flotte à côté de ce dont elle parle. À chaque écran la mascotte présente ce qu'elle trouve, une chose à la fois, et l'agent attend qu'elle ait fini. À la fin on repasse sur chaque problème, un humain dit « bug » ou « voulu », et chaque choix s'écrit dans le vault. Le parcours vient des tests acceptés du vault.

- Installer : `pnpm install --ignore-workspace` dans ce dossier (`pngjs` pour la sonde, `rough-notation` pour les traits), et `pnpm install` à la racine (`parcours.mjs` lit le vault par `../../memoire/index.ts`, qui a besoin de `yaml`).
- Fichiers : `parcours.mjs` (la scène), `sonde-t7.mjs` (la preuve T7), `couche-horama.js` (curseur, mascotte, bulle, traits, bandeau, fin, dans la page), `scene.mjs` (Chrome, CDP, captures, clics), `agent-h.mjs` (pont `holo`, session H, règles données à l'agent). Ce qui vient de Nami est dit en tête de chaque fichier.
- `essais/` est hors Git : faux module de vérification, copie du vault, témoins, film.

## Le parcours (`parcours.mjs`)

- Avec l'agent (clé `HAI_API_KEY`, outil `holo` installé) : `node --env-file=<.env.local> automatisation/scene/parcours.mjs`
- Sans H (le script fait lui-même les clics par CDP, au rythme d'un agent) : `node automatisation/scene/parcours.mjs --sans-agent`
- Essai complet sans rien écrire dans le vault du repo (depuis ce dossier) :
  ```
  cp -R ../../vault-horama essais/vault-copie
  node parcours.mjs --sans-agent --choix bug,bug,voulu --vault essais/vault-copie --verification essais/fausse-verification.mjs --sortie essais/passage-1 --temoins essais/temoins --film essais/film --fermer-chrome
  ```
- Écrire les références de la version 12 dans le vault : `node automatisation/scene/parcours.mjs --version 12 --ecrire-references --sans-agent --sans-fin`

Ce qu'il fait :
1. Lit les tests acceptés (`lireTestsAcceptes`), les notes (`lireNotes`) et les décisions (`lireDecisions`) du vault. Les relevés de tous les tests, dans l'ordre et sans doublon, font un seul parcours ; les sections Setup et Task de chaque test, mises bout à bout, font une seule consigne, écrite dans `consigne.md`. En version 12, `/v13/` devient `/v12/` et un test dont une vue n'existe pas dans cette version est écarté.
2. Chaque clic de l'agent est **retenu** le temps que le curseur arrive dessus, puis rendu à la page (voir « Le curseur »).
3. À chaque `relever(ecran, vue)` : l'adresse de la page est vérifiée, la couche est masquée, la capture et le texte sont pris et rangés dans `releves/`, puis `verifierReleve` est appelé, `texte_zone` est rempli pour chaque constat visuel, et `consoliderConstats` repasse sur tous les constats du parcours.
4. La mascotte présente les constats nouveaux de cet écran, l'un après l'autre : l'`annonce` de `formuler(constat)`, le trait qui se dessine autour de ce qui est trouvé, puis le `resultat`. **La réponse à l'agent ne part qu'à la fin de cette présentation**, ou au plafond (`--plafond`, 12 s) : un constat commencé avant le plafond est dit jusqu'au bout, les suivants sont dessinés et comptés sans phrase (la fin y revient). Ordre : ce qu'une décision a déjà tranché, puis les règles, puis les écarts d'image.
5. À la fin du parcours : le bilan en une phrase, puis chaque défaut prouvé et chaque doute, un à la fois. Le script ramène la page à l'adresse du relevé, la page s'assombrit sauf la zone, la `question` du constat s'affiche avec « C'est un bug » et « C'est voulu », qui se cliquent à la vraie souris.
6. « Je range tout ça. » : chaque choix devient une `Decision` (`versDecision`), écrite par `ecrireDecision` puis relue par `lireDecisions`. L'écran de fin liste les fichiers écrits et le compte. `passage.json` est écrit, la fenêtre reste ouverte.
7. Au parcours suivant, les décisions du vault sont données à `verifierReleve` : un doute déjà tranché « voulu » est dit par la mascotte (« Déjà vu et validé. ») et n'est plus demandé.

Options :

| Option | Effet |
|---|---|
| `--sans-agent` | les clics sont faits par le script (CDP) ; H n'est pas appelé |
| `--rythme <s>` | pause fixe entre deux gestes du script ; sans elle, entre 2 et 4 s au hasard |
| `--plafond <s>` | temps maximal pendant lequel l'agent attend la mascotte à un écran (défaut 12) |
| `--clic-direct` | le clic n'est pas retenu : la page réagit tout de suite, le curseur suit |
| `--choix bug,voulu,…` | répond tout seul aux questions de la fin, dans l'ordre (essais, captures) ; une question sans réponse attend un vrai clic |
| `--sans-fin` | s'arrête au bilan : ni questions, ni écriture |
| `--par <nom>` | qui tranche, écrit dans chaque décision (défaut « Nathan ») |
| `--vault <dossier>` | défaut `../../vault-horama`. **Les décisions s'y écrivent** : pour un essai, donner une copie |
| `--verification <fichier>` | le module de vérification (défaut `../../jugement/verification/index.ts`) |
| `--logiciel`, `--version 13`, `--reference 12`, `--tests a,b,c`, `--r <ids>` | quoi jouer (défaut : tous les tests, par ordre d'identifiant) |
| `--ecrire-references` | range chaque capture par `ecrireReference` |
| `--temoins <dossier>` | captures avec la couche visible, nommées par ce qu'elles montrent (`curseur-a-mi-trajet`, `trait-a-moitie-doute`, `question-1`, `fin`…) |
| `--film <dossier>` | une capture avec la couche toutes les 200 ms, du début à l'écran de fin (`<n>-<ms depuis le début>ms.jpg`) |
| `--sortie <dossier>` | défaut `/Users/nathan/Code/projet/horama/.orchestrateur/passages/<identifiant>/` |
| `--port 9333`, `--profil <dossier>`, `--fermer-chrome` | le Chrome dédié ; sans `--fermer-chrome` il reste ouvert à la fin |

Variables : `FAUX_SAAS_URL`, `CHROME_BIN`, `HOLO_BIN`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. Sortie : 0 tous les relevés pris et rien en erreur, 1 sinon, 2 il manque quelque chose, 130 Ctrl+C. Avec l'agent, la session est créée avec `settle_s` 1,0 (le clic retenu arrive à la page 620 à 920 ms après le geste de l'agent).

`passage.json` : identifiant, version, référence, tests joués et écartés, relevés, `constats` (consolidés, avec `explique_par`, `nature`, `decision_id`), bilan, compteur, `decisions` (chaque décision écrite et son fichier), clics (avec `trajet_ms` et `retard_ms`), `retard_par_clic_ms`, `presentations` (durée par écran, constats dits et montrés sans phrase), film, durée, étapes, coût, session H. Une valeur que le mode sans agent ne mesure pas vaut `null`.

### Le module de vérification

La scène ne fabrique aucune phrase sur un constat : elle les demande au module, qui doit exporter les quatre fonctions ci-dessous. Sans elles le script s'arrête avant tout lancement (sortie 2). Tant que `jugement/verification/` ne les a pas, lancer avec `--verification essais/fausse-verification.mjs`.

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
| `bulle(texte, genre, cible)` | une bulle, `null` pour la retirer ; `genre` : `""`, `conforme`, `defaut`, `doute` ; `cible` : rectangle de la page dont elle parle ; rend la main quand la bulle est affichée |
| `compteur(bons, problemes, doutes)` | chiffres du bandeau ; celui qui change grossit un instant |
| `surligner(adresse, rects, genre, id, avant)` | trait dessiné en 800 ms autour de chaque rectangle, puis le numéro ; `avant` : ancien emplacement, en pointillé ; gardé pour l'adresse donnée, dessiné tout de suite si c'est la page courante |
| `requalifier(id, genre)` | le trait et le numéro d'un constat changent de couleur, sur toutes les pages |
| `trouver(texte)`, `autour(zone)` | rectangles des éléments dont le texte affiché vaut `texte` ; texte de l'élément au centre d'une zone (40 caractères au plus) et cadre qui contient la zone et ce texte |
| `revue(oui)` | la page s'assombrit, le curseur de l'agent sort |
| `question({ id, texte, rang, etat })` | met en lumière les zones du constat `id` et pose la question avec ses deux boutons ; la réponse revient par la liaison CDP `horamaChoix` |
| `choisir(choix)` | répond à la place de l'humain (`--choix`) |
| `fin({ titre, compte, legende, fichiers })` | l'écran de fin |
| `masquer()`, `montrer()` | pour une capture |

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
