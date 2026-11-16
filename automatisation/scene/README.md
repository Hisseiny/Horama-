# Scène : le parcours en direct, et la sonde T7

La scène de `docs/decisions/2026-11-16-scene-en-direct.md` : le logiciel testé s'ouvre dans un Chrome local visible, l'agent H clique, la mascotte Horama se pose là où il clique, dit ce qu'elle vérifie, surligne ce qu'elle trouve et ne le fait jamais attendre. Le parcours vient des tests acceptés du vault.

- Installer : `pnpm install --ignore-workspace` dans ce dossier (seule dépendance : `pngjs`, pour la sonde), et `pnpm install` à la racine (`parcours.mjs` lit le vault par `../../memoire/index.ts`, qui a besoin de `yaml`).
- Fichiers : `parcours.mjs` (la scène), `sonde-t7.mjs` (la preuve T7, inchangée dans ses mesures), `couche-horama.js` (mascotte, bulle, zones, bandeau, dans la page), `scene.mjs` (Chrome, CDP, captures, clics), `agent-h.mjs` (pont `holo`, session H, règles données à l'agent). Ce qui vient de Nami est dit en tête de chaque fichier.

## Le parcours (`parcours.mjs`)

- Avec l'agent (clé `HAI_API_KEY`, outil `holo` installé) : `node --env-file=<.env.local> automatisation/scene/parcours.mjs`
- Sans H (le script fait lui-même les clics par CDP, au rythme d'un agent) : `node automatisation/scene/parcours.mjs --sans-agent`
- Écrire les références de la version 12 dans le vault : `node automatisation/scene/parcours.mjs --version 12 --ecrire-references --sans-agent`

Ce qu'il fait :
1. Lit les tests acceptés (`lireTestsAcceptes`) et les notes (`lireNotes`) du vault. Les relevés de tous les tests, dans l'ordre et sans doublon, font un seul parcours ; les sections Setup et Task de chaque test, mises bout à bout (« Partie 1 », « Partie 2 »…), font une seule consigne, écrite dans `consigne.md`. Départ : le `url_depart` du premier test. En version 12, `/v13/` devient `/v12/` et un test dont une vue n'existe pas dans cette version est écarté (le script dit lequel).
2. À chaque `relever(ecran, vue)` : l'adresse de la page est vérifiée (chemin de l'écran lu dans sa note, paramètre `filtre` de la vue : table `VIEWS` du script), la couche est masquée, la capture et le texte sont pris et rangés dans `releves/`, puis `verifierReleve` de `jugement/verification/index.ts` est appelé s'il existe. La réponse part aussitôt vers l'agent.
3. Les zones sont surlignées tout de suite, tant que la page est encore cet écran. Ce que la mascotte en dit se joue en file, à côté : « La doc dit : … » (la phrase de la règle dans sa note, à défaut « Le test dit : … » avec la ligne Verification du test), puis le résultat. Si l'agent est déjà sur un autre écran, la phrase commence par le nom de l'écran dont elle parle.
4. À la fin : bulle de bilan qui reste, `passage.json`, et la fenêtre reste ouverte.

Options : `--sans-agent`, `--rythme <s>` (pause fixe entre deux gestes du script ; sans elle, entre 2 et 4 s au hasard), `--vault <dossier>` (défaut `../../vault-horama`), `--logiciel facturo`, `--version 13`, `--reference 12`, `--tests a,b,c` (défaut : tous, par ordre d'identifiant), `--r <ids>` (changements de Facturo, ajoutés à l'adresse de départ), `--verification <fichier>` (un autre `verifierReleve`), `--ecrire-references` (range chaque capture par `ecrireReference` : seul cas où le script écrit dans le vault), `--temoins <dossier>` (captures avec la couche visible : une à chaque réaction de la mascotte, trois après chaque clic, nommées `<n>-<état affiché>-<moment>.png`), `--sortie <dossier>` (défaut `/Users/nathan/Code/projet/horama/.orchestrateur/passages/<identifiant>/`), `--port 9333`, `--profil <dossier>`, `--fermer-chrome` (sans elle, le Chrome reste ouvert à la fin, mascotte et zones visibles). Variables : `FAUX_SAAS_URL`, `CHROME_BIN`, `HOLO_BIN`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. Sortie : 0 tous les relevés pris et rien en erreur, 1 sinon, 2 il manque quelque chose, 130 Ctrl+C.

`passage.json` : identifiant, version, référence, tests joués et écartés, relevés (chemins des captures et des textes), constats (avec `remarque: "même endroit qu'un défaut prouvé"` pour un constat visuel non montré), bilan, clics vus, durée, étapes, coût, session H. Une valeur que le mode sans agent ne mesure pas vaut `null`.

Réactions de la mascotte, par constat :

| Constat | État | Bulle | Page |
|---|---|---|---|
| règle `PASS` | `verification` puis `conforme` | « La doc dit : … » | compteur |
| règle `VERIFIED_FAIL` | `verification` puis `defaut` | « La doc dit : … », puis le calcul | textes de `textes_a_surligner` en corail, compteur |
| visuel `SUSPECTED` | `interrogation` | « Ça a changé ici, autour de « … ». Bug ou voulu ? » | zone en jaune, compteur |
| visuel `PASS` avec décision | `conforme` | « Déjà validé : <identifiant> » | |
| `INCONCLUSIVE` | `repos` | « Je ne peux pas conclure : <raison> » | jamais compté comme réussite |

Un constat visuel dont la zone recouvre un texte déjà surligné en corail sur cet écran n'est pas montré. Sans `jugement/verification/`, la mascotte passe en `verification` à chaque relevé et dit les règles des tests que ce relevé termine, sans verdict.

## La couche dans la page (`couche-horama.js`)

Posée par `Page.addScriptToEvaluateOnNewDocument`, dans un Shadow DOM fermé, sans jamais recevoir un clic. Tout son état (point de la mascotte, état, bulle, compteur, zones par adresse de page) vit dans `sessionStorage` : il survit à un changement de page, et les zones reviennent quand on repasse par leur écran. Un nouveau passage repart de zéro.

Commandes, appelées par `layer(page, "<commande>", ...)` de `scene.mjs` (`window.__horama` dans la page) :

| Commande | Effet |
|---|---|
| `etat(nom)` | `repos`, `verification`, `interrogation`, `defaut`, `conforme` (revient à `repos` après 1 s) |
| `bulle(texte, genre, ms)` | une seule bulle à la fois ; `genre` : `""`, `conforme`, `defaut`, `doute` (couleur du bord) ; sans `ms`, elle reste |
| `compteur(conformes, defauts, doutes)` | chiffres du bandeau |
| `surligner(rectangle, genre)` | cadre numéroté sur la page ; `genre` : `doute` (jaune `#F4DF73`) ou `defaut` (corail `#FF6E57`) ; rend le numéro |
| `surlignerTexte(texte, genre)` | surligne les plus petits éléments dont le texte affiché vaut exactement `texte` ; rend leurs rectangles |
| `trouver(texte)`, `autour(zone)` | les mêmes rectangles sans surligner ; le texte de l'élément au centre d'une zone |
| `masquer()`, `montrer()` | pour une capture |
| `etatAffiche()` | l'état montré à cet instant (`deplacement` et `clic` compris) |

Les états `deplacement` (glisse en 450 ms vers le clic) et `clic` (s'écrase, onde) sont joués par la couche à chaque appui de souris. La bulle se place au plus près de la mascotte sans cacher ni texte ni zone, un trait la relie quand elle a dû s'éloigner.

### Remplacer la mascotte provisoire

La mascotte est dessinée en SVG dans `SPRITES`, en tête de `couche-horama.js` : une entrée par état, rien d'autre à toucher.

- États : `repos`, `deplacement`, `clic`, `verification`, `interrogation`, `defaut`, `conforme`.
- Taille : une boîte de 56 × 56 px (`SIZE`).
- Point d'ancrage : le point (2, 2) de la boîte, en haut à gauche (`ANCHOR`), posé exactement sur le clic. C'est la pointe de la goutte ; le corps est en bas à droite.
- Pour une image : remplacer la chaîne de l'état par `<img src="data:image/png;base64,…">` (ou un autre `<svg>`). Une adresse de fichier local ne se charge pas dans la page testée.
- Miroir : quand le corps cacherait moins de texte à gauche du clic, l'image est retournée horizontalement autour de la pointe. Dans le SVG provisoire, ce qui porte la classe `mark` (les signes ? ! ✓) est remis à l'endroit.
- Les mouvements (respiration, écrasement, sursaut, inclinaison) sont des animations CSS de la boîte, gardées avec une image. Seuls les yeux qui lisent (`verification`) sont animés dans le SVG : une image de cet état doit porter son propre mouvement, ou rester fixe.

## La sonde T7 (`sonde-t7.mjs`)

- Avec l'agent : `node --env-file=<.env.local> automatisation/scene/sonde-t7.mjs`
- Sans H : `node automatisation/scene/sonde-t7.mjs --sans-agent --passes 2 --sortie automatisation/scene/essais/captures --rapport automatisation/scene/essais/rapport.md`
- Options : `--passes 3`, `--port 9333`, `--profil <dossier>`, `--sortie <dossier>`, `--rapport <fichier.md>`, `--garder-chrome`. Sortie : 0 critère tenu (ou montage qui marche avec `--sans-agent`), 1 non tenu, 2 il manque quelque chose (clé, `holo`, Chrome), 130 Ctrl+C.
- Mesures, écrites dans le rapport (`docs/tests/2026-11-16-t7-navigateur-local.md` par défaut) : zone de page et densité de pixels, puis par passe la durée, les étapes, le coût, les relances, les clics vus par la couche avec l'élément touché, et les captures comparées pixel par pixel à la passe 1 et aux références sans tête.
- Elle utilise la même couche, sans bandeau : la mascotte apparaît au premier clic et le suit.
