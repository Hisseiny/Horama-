# #170 — texte non traduit, captures douces et lecture des pages

## Changement et seuil

`agent/src/exploration/controles.ts` compare les blocs visibles à `html[lang]`
(fr, de, en, variantes régionales comprises). Un bloc regroupe ses nœuds de
texte et ses éléments en ligne, sans agréger des paragraphes distincts.
Le contrôle exige au moins 8 mots, 3 occurrences de mots outils non ambigus,
au moins 2 mots outils distincts et une majorité stricte pour une langue étrangère.
Les mots communs aux listes (par exemple « des ») sont ignorés pour le vote.
Les cas sous le seuil sont silencieux, jamais `VERIFIED_FAIL`.

Sont exclus : code/pre (également kbd/samp/var), texte masqué ou découpé pour
lecteur d'écran, suites composées uniquement de mots à initiale majuscule,
langue explicite du bloc ou héritée correspondant à la langue détectée.
Ce dernier filtre n'exempte pas un bloc français incorrectement marqué `lang=en`.
Le sélecteur, la zone et la mesure accompagnent le défaut.

`Defaut.sorte` est une union interne à agent/, pas un champ de contrat gelé.
`explorer.ts` ajoute uniquement la correspondance de code et l'attendu.
Aucun contrat, aucune dépendance ni automatisation/ modifiés.

## Vérifications locales

`pnpm install` : terminé, sans modification suivie des manifests ou du lockfile.

`pnpm -r --if-present run check` (code de sortie 0), extrait de fin :

```text
agent check: 1..256
agent check: # tests 262
agent check: # suites 0
agent check: # pass 262
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 17262.456486
agent check: Done
```

Les autres paquets vérifiés terminent aussi : contrats, faux-saas (10 tests),
memoire (34), interface (8), jugement (79).
Le test Chrome local existant couvre désormais les blocs français, allemands,
anglais, courts, vides, masqués, les noms propres, code/pre, `lang` explicite,
les langues absentes/inconnues et le texte fragmenté par un élément `strong`.
Aucun réseau externe dans ces nouveaux cas.

Premier lancement : erreur TypeScript d'inférence HTMLElement/Element, corrigée.
Premier relevé réel : un texte réservé au lecteur d'écran était compté ; filtre
de découpage ajouté, testé puis relevé rejoué. Le nettoyage du profil Chrome
a également nécessité des tentatives de suppression dans le script d'essai.

`git diff --check` : code 0. Recherche de domaine dans les lignes ajoutées à
`agent/src/` : **0**. Une recherche globale non limitée au diff trouve déjà
`facturo-demo.vercel.app` dans consigne.ts et les domaines API H dans session.ts
et exploration/holo.ts : préexistants, laissés intacts hors du périmètre.

## Relevé réel

Prévisualisation :
<https://eugenia-school-website-git-devin-179503024-b6c714-ahissein-5983.vercel.app>.

Google Chrome for Testing 156.0.8078.47, headless, fenêtre 1280×900, DPR 1.
Script hors dépôt : `/home/ubuntu/verify-horama-170.ts`, lancé par
`node /home/ubuntu/verify-horama-170.ts` (code 0).
Il utilise `connecterCdp`, `prepareCapture`, puis `controlerPage({maxLiens:0})`.
Lecture visiteur uniquement : navigation, aucun champ rempli ni formulaire envoyé.
Résultats détaillés : `/home/ubuntu/horama-170-measures.json` ; journal :
`/home/ubuntu/horama-170-real.log`. Aucun appel à H ni clé API.

Tous les documents déclarent `de`. Chaque bloc signalé a été relu dans le
relevé textuel : tous sont français ; aucun faux positif linguistique observé.
Ce n'est pas une validation visuelle par capture d'écran ni un audit exhaustif
de tous les contenus cachés ou interactifs.

| Page | Blocs trouvés | Mesure d'un bloc représentatif | Faux positifs observés |
|---|---:|---|---:|
| Karriere `/carrieres` | 9 | 24 mots, 6 mots outils français, 0 allemands ; page déclarée de | 0 |
| Unternehmen `/entreprises` | 7 | 21 mots, 7 mots outils français, 0 allemands ; page déclarée de | 0 |
| Die Hochschule `/ecole` | 16 | 10 mots, 4 mots outils français, 0 allemands ; page déclarée de | 0 |
| Événements `/evenements` | 1 | 17 mots, 6 mots outils français, 0 allemands ; page déclarée de | 0 |
| Bachelor 3 `/programme/bachelor-ia-business-3eme-annee-alternance` | 12 | 51 mots, 12 mots outils français, 0 allemands ; page déclarée de | 0 |
| Accueil `/` | 0 | Aucun bloc au-dessus du seuil | 0 |
| `/programmes` | 0 | Aucun bloc au-dessus du seuil | 0 |

Total initial : 45 blocs signalés sur les cinq pages attendues, 0 sur les deux témoins.
Sur événements, le bloc trouvé est le texte de conservation des réponses
« Les réponses sont conservées dans cet onglet jusqu'à la fin de la simulation,
pendant 12 heures maximum. Effacer mes réponses ». Aucun formulaire manipulé.
Le titre « Rencontrons-nous sur le campus » est trop court pour ce contrôle.

### Mesures de tous les blocs

Couples ci-dessous : nombre de mots / nombre de mots outils français.
Pour chacun : 0 mot outil allemand, page déclarée `de`.

- Karriere : 24/6, 16/5, 9/3, 8/3, 10/3, 16/3, 15/6, 13/3, 14/6.
- Unternehmen : 21/7, 13/3, 26/8, 27/8, 25/4, 26/6, 9/4.
- Die Hochschule : 10/4, 19/7, 11/3, 28/6, 21/6, 10/3, 12/5, 8/3,
  8/3, 24/4, 23/5, 20/3, 23/5, 23/4, 23/3, 24/9.
- Événements : 17/6.
- Bachelor 3 : 51/12, 41/14, 12/3, 13/6, 33/11, 25/4, 14/3, 20/5,
  35/10, 32/8, 35/6, 27/9.

Limites : heuristique volontairement prudente, pas un modèle de traduction.
Les titres courts, les blocs pauvres en mots outils et les langues non prises
en charge ne prouvent aucun défaut. Pas de passage H de huit pages, de mesure
de durée/coût ni de changement de défilement : points 1 et 2 de #170 hors tâche.

## A — regroupement par page

Le contrôle émet désormais **un seul défaut par page**, avec le nombre de blocs
par langue et la mesure du bloc le plus long (nombre de mots). Le sélecteur et
la zone sont ceux de ce bloc. Le tableau précédent et les couples de mesures
décrivent les blocs détectés avant regroupement, pas le nombre final de défauts.
Un test supplémentaire couvre deux blocs français et un anglais sur la même
page, la sélection du plus long et l'unicité du défaut.

Relevé Chrome rejoué avec le même script (code 0) :

| Page | Défauts après regroupement | Blocs français | Mesure du plus long (mots / outils français / allemands) |
|---|---:|---:|---|
| `/carrieres` | 1 | 9 | 24 / 6 / 0 |
| `/entreprises` | 1 | 7 | 27 / 8 / 0 |
| `/ecole` | 1 | 16 | 28 / 6 / 0 |
| `/evenements` | 1 | 1 | 17 / 6 / 0 |
| Bachelor 3 | 1 | 12 | 51 / 12 / 0 |
| `/` | 0 | 0 | — |
| `/programmes` | 0 | 0 | — |

Soit **5 défauts pour 45 blocs**, aucun faux positif linguistique observé.
`node --test exploration-controles.test.ts` depuis agent/ :

```text
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1140.57808
```

## B — captures douces optionnelles

`captureDefect(client, zone, scroll, { doux: true })` utilise un défilement
smooth à l'aller **et au retour**. Il attend quatre positions stables espacées
de 50 ms, avec une borne de 5 s par trajet. Une instabilité persistante remonte
une erreur sans capturer une position intermédiaire. Le retour doux est tenté
également si la capture échoue. Sans option : trajet instantané et restauration
instantanée conservés, comme avant.

`ExplorerOptions.doux` est transmis au repli CDP `captureDefect`. Aucun contrat
gelé ni type partagé BrowserRuntime modifié. Les tests couvrent la propagation,
le trajet local Chrome (positions intermédiaires aller/retour, cadrage, retour à
l'origine), le cas déjà stable, l'expiration, l'erreur de capture et l'exception
CDP. Il ne s'agit pas d'une vérification visuelle de la scène.

### Changement à demander au couloir Nathan (non effectué ici)

- `automatisation/scene/exploration.mjs`, appel `explorer` vers la ligne 248 :
  ajouter `doux: true` au premier argument pour couvrir le **repli** CDP.
- Son `runtime.capturerZone(zone)` (vers 130) reste prioritaire sur ce repli.
  Il appelle `captureZone(page, zone)` de `automatisation/scene/scene.mjs`.
  L'option de l'explorateur ne modifie donc **pas** le trajet normal de ce hook.
- `scene.mjs`, `captureZone` vers 302, utilise déjà smooth, attend la cible
  pendant 1500 ms puis emploie **instant** en cas de dépassement ; il reste à
  la zone après capture. Remplacer ce repli instantané par une attente bornée
  de position stable, et en cas d'expiration lever une erreur, sans saut.
  Conserver le masquage/réaffichage de la couche et le déplacement du pointeur.
  Si le hook échoue, l'explorateur utilisera alors son repli doux.

Aucun fichier automatisation/ modifié.

Vérification B : `pnpm -r --if-present run check`, code 0 :

```text
agent check: # tests 266
agent check: # pass 266
agent check: # fail 0
agent check: # skipped 0
agent check: # duration_ms 21003.031184
agent check: Done
```

Un premier lancement a rencontré `Onglet du relevé introuvable.` dans le test
Chrome de découverte (exploration-pages.test.ts:172, connexion about:blank),
hors du trajet de capture modifié, puis est resté ouvert : processus arrêté.
Le lancement complet ci-dessus, après le dernier ajout de test CDP, est vert ;
aucun changement effectué dans les tests ou le code de découverte.

## Revue 1 — mots outils ambigus

Retrait de `a`, `on`, `in`, `an`, `or` de la liste anglaise : formes françaises
ou allemandes usuelles aussi, même si elles manquaient aux autres listes.
`be` n'était dans aucune liste ; `die` reste un article allemand, pas un mot
outil anglais. Les chevauchements explicites (`des`, `en`, etc.) restent
exclus par le vote existant. Trois cas négatifs ajoutés : français « on a »,
français « or on a », allemand « in … an ».

`node --test exploration-controles.test.ts` : code 0, `# tests 1`, `# pass 1`,
`# fail 0`, `# skipped 0`, `# duration_ms 1200.733867`.

## Revue 2 — display: contents

Pour le parent immédiat du texte, le contrôle cherche désormais le premier
ancêtre possédant une boîte plutôt que d'exiger un rectangle du span
`display:contents`. Les styles de visibilité/opacité et le découpage de toute
la chaîne restent vérifiés, y compris sur les éléments sans boîte.
Tests ajoutés : span sans boîte autour du texte, autour d'un paragraphe,
span sans boîte masqué et span sans boîte avec `lang=fr` explicite.
Deux cas supplémentaires vérifient `lang=de` et `lang=en` non conformes au
texte français. La preuve utilise la première boîte ancêtre si le bloc a
`display:contents` ; les tests exigent une zone non vide pour tout défaut.

Relevé réel rejoué après les corrections de revue : toujours 5 défauts pour
45 blocs (9, 7, 16, 1, 12), aucun sur accueil et programmes ; mesures du plus
long inchangées, aucun faux positif linguistique observé.

Le dernier contrôle récursif a de nouveau rencontré :

```text
agent check: not ok 161 - Chrome réel découvre une page JS locale sans masquer la scène et ferme ses onglets
agent check:   error: 'Onglet du relevé introuvable.'
agent check:     async TestContext.<anonymous> (file:///home/ubuntu/repos/Horama-/agent/exploration-pages.test.ts:172:22)
```

Il s'agit de la connexion de nettoyage `connecterCdp(chromePort, "about:blank")`
du test de découverte ; ce test et le corps de connecterCdp n'ont pas été
modifiés. Le processus restait ouvert après l'échec et a été arrêté. Aucun
correctif de découverte tenté hors périmètre. L'intermittence est observée
(un lancement complet vert entre deux échecs), mais non reproduite sur dev.
La vérification récursive verte de B précède les deux corrections de revue ;
elle ne doit pas être présentée comme une validation complète de l'état final.

Contrôle ciblé après la dernière modification :
`node --test exploration-controles.test.ts`, code 0 :

```text
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1251.348003
```

## Contre-vérification après inspection des processus

État testé : branche `a-170-texte-non-traduit`, commit `cafb70f`.
Inspection `pgrep -af chrome` et des processus Node de test : aucun Chrome de
test ni processus Node de test résiduel ; seul Chrome bureau (CDP 29229) et
ses sous-processus sont présents. Rien à tuer ; Chrome bureau laissé intact.

Premier essai de `pnpm -r --if-present run check` : **vert**, code 0 :

```text
agent check: 1..259
agent check: # tests 266
agent check: # suites 0
agent check: # pass 266
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20744.138332
agent check: Done
EXIT_CODE=0
```

Journal : `/home/ubuntu/horama-170-clean-check-1.log`.
Pas de deuxième/troisième essai global nécessaire après ce succès.

Worktree détaché de dev (`268fd28`) :
`/home/ubuntu/repos/Horama-dev-check`, dépendances installées par
`pnpm install --offline --frozen-lockfile`. Trois exécutions séquentielles de
`node --test exploration-pages.test.ts` depuis agent/, sans autre test Chrome
lancé simultanément :

| Essai dev | Code | Tests | Réussites | Échecs | Ignorés | Durée imprimée (ms) |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 39 | 39 | 0 | 0 | 5051.49283 |
| 2 | 0 | 39 | 39 | 0 | 0 | 4985.950412 |
| 3 | 0 | 39 | 39 | 0 | 0 | 5104.263255 |

Journaux : `/home/ubuntu/horama-170-dev-discovery-{1,2,3}.log`.
Le test Chrome réel s'exécute (non ignoré) dans chaque essai.

Conclusion limitée : échec antérieur non reproduit, ni dans le check global
de la branche ni lors des trois essais isolés sur dev. Cela ne prouve pas
que dev est exempt d'intermittence. Aucune cause attribuée aux processus
résiduels (aucun présent), ni aux changements de cette branche. Aucun correctif
de gestion d'onglets effectué. Le test de découverte importe pages.ts/CDP,
pas explorer.ts ; le corps de connecterCdp, waitForVisibleStable et pages.ts
est identique à dev, et ce test n'appelle pas captureDefect/scrollSmooth.
Le nettoyage à la ligne 172 peut masquer une erreur antérieure : déterminer
la première erreur demanderait une reproduction instrumentée, non obtenue ici.

## Point 1 de #170 — lecture de chaque page et démarrage H

### Changements ciblés — historique Après 1 et Après 2

Les mesures de cette section décrivent l'ancienne lecture exhaustive.
**Arbitrage Après 3 :** cette lecture est remplacée par cinq petits pas
maximum et de grands trajets bornés ; la préchauffe du pont CLI est retirée.
Le détail de cette décision et les mesures Après 3 figurent plus bas.

- `construireExploration` et les réponses dynamiques à `relever` demandent la
  même lecture sur chaque page, y compris le départ, les replis par adresse et
  la dernière page : descente jusqu'au bas, un geste facultatif de visiteur,
  remontée vers le menu, puis clic vers une page non relevée. Aucune saisie,
  aucun formulaire ni connexion ; les gestes ne sont pas des soumissions.
- `scroll_web` accepte bien `direction`, `num_pixels` et `scroll_element` :
  observé dans les événements réels H du passage dev (2500 puis 3500 pixels).
  La nouvelle consigne demande `num_pixels` d'environ une demi-hauteur
  d'écran, soit 450 pixels à 1280 × 900, dans les deux sens. L'ancien plafond
  de 3 grands défilements au départ et 1 ou 2 ailleurs est supprimé.
  La garde anti-boucle est le bas/haut atteint ou deux essais sans déplacement,
  pas une limite de 2 ou 3 pas qui couperait une page longue.
- `go_to` reste un dernier recours dans le quota de clics, après recherche
  dans le menu. Le paramètre facultatif `raison_go_to` de l'outil interne
  `relever` est journalisé ; aucun contrat ni format de rapport n'est changé.
  Une raison absente reste explicitement « à mesurer », sans l'inventer.
  Les modes d'arrivée et les compteurs existants sont conservés : le départ
  reste `depart`, les sept transitions restantes sont les candidates au clic.
- Budget : `70 × pages + 13 + 3 × transitions par clic`, contre
  `4 × pages + 13 + 3 × transitions`. Les 66 étapes supplémentaires par page
  provisionnent 64 petits défilements (32 aller, 32 retour), un geste et une
  fermeture éventuelle. Ce n'est pas un plafond de défilement dans la consigne.
  Huit pages avec `--pages-cliquees 8` reçoivent **594 étapes**, contre 66,
  et **4752 secondes**, contre 528. La borne globale de temps passe de
  600 à 7200 secondes, toujours à 8 secondes provisionnées par étape et
  240 secondes minimum. Les étapes inutilisées ne sont pas consommées.
  Le timeout d'un relevé reste 30 s ; le `timeout_s: 600` de chaque test
  concerne ce hook, pas la durée de lecture/navigation de la session.
- Démarrage CLI : le premier pont Holo démarre pendant la découverte ; sa
  promesse est consommée une seule fois par la création de session. Une
  relance obtient un pont neuf ; `runtime.close()` ferme aussi un pont préparé
  mais inutilisé si la découverte est vide. Aucun changement du redémarrage
  interne du pont (#178), ni de la sélection d'adresse ou du maintien sur site.
- Le regard Holo sur la capture démarre en parallèle des contrôles réseau/DOM.
  La fusion attend toujours les contrôles pour dédupliquer les zones. Un rejet
  précoce de Holo est observé immédiatement et demeure `INCONCLUSIVE`.
  L'aide CLI ne promet plus 2 à 3 minutes pour une lecture intégrale de huit
  pages longues, contrairement à l'ancien survol.

### Protocole réel avant/après

Une seule session H à la fois. Avant : dev détaché au commit `268fd28`,
`origin/dev` récupéré et identique au moment du passage. Après : branche
`a-170-texte-non-traduit`, sur les changements ci-dessus. Chaque passage a
son Chrome headless dédié, 1280 × 900, DPR 1, profil/vault/sortie indépendants.
Le Chrome bureau CDP 29229 n'est pas utilisé. Aucune saisie de formulaire ni
connexion demandée. La clé de développement est liée uniquement à
l'environnement d'exécution par `secret:org:HORAMA_HAI_API_KEY`.

Commande CLI (mêmes options avant/après, ports 9341 et 9342) :

```sh
node --import /home/ubuntu/horama-170-probe.mjs agent/explorer.ts \
  --url https://eugenia-school-website-git-devin-179503024-b6c714-ahissein-5983.vercel.app \
  --max 8 --pages-cliquees 8 --sans-base --chrome-port PORT \
  --sortie DOSSIER/output --vault DOSSIER/vault
```

Le lanceur `/home/ubuntu/horama-170-run.mjs` prépare le Chrome puis lance cette
commande. Le chronomètre part au lancement du processus CLI, pas au lancement
préalable du Chrome. Une sonde externe, commune aux deux passages, observe les
logs, le démarrage/ready du pont, les requêtes de création H, les événements
`policy_event`, les métriques et les appels Holo. Elle n'enregistre aucune
clé et ne modifie ni consigne ni résultat d'outil. Les durées de première
étape/action sont des temps de réception de l'événement API, non une mesure
vidéo du déplacement du pointeur. Les actions peuvent avoir lieu entre deux
réceptions ; il ne faut pas présenter ces temps comme une mesure visuelle.
La préparation et la découverte sont séparées grâce à `exploration.json.le`
et au log « pages trouvées » ; la découverte inclut aussi la construction
locale du plan et du rapport, pas seulement le réseau.

Artefacts persistants : `/home/ubuntu/horama-170-before/` et
`/home/ubuntu/horama-170-after/` : `run.json`, `probe.jsonl`, `cli.log`,
`output/exploration.json`, captures et vault. Avant la première session,
le pré-lancement Chrome a rencontré « Execution context was destroyed » ;
aucune session H n'avait été créée. Le lanceur attend maintenant
`Page.loadEventFired` avant de commencer le chronomètre CLI.

### Vérifications après les changements

Le premier check a révélé deux erreurs TypeScript dans le nouveau test :
`Property 'required' does not exist on type 'object'` et
`Property 'properties' does not exist on type 'object'`. Le type local du
schéma est maintenant explicite ; aucun type partagé n'a été changé.

`node --test exploration-explorer.test.ts`, code 0 :

```text
# tests 65
# pass 65
# fail 0
# skipped 0
# duration_ms 938.159078
```

`pnpm -r --if-present run check`, code 0 après correction :

```text
agent check: 1..263
agent check: # tests 270
agent check: # suites 0
agent check: # pass 270
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20576.463767
agent check: Done
```

Journal : `/home/ubuntu/horama-170-point1-check-2.log`.

### Premier passage après modification : non validant, arrêté

Session `53913d6d-ac9d-4dbd-8996-35d497b4fda8`, sortie
`/home/ubuntu/horama-170-after/`, durée CLI **445,568 s**, code 1 après
Ctrl+C volontaire. Six pages relevées : départ, programmes, carrières,
école, événements, entreprises. Quatre transitions par clic, une par adresse,
une arrivée `depart`. **78 étapes reçues** avant l'annulation, **66 scrolls**
(tous de 450 pixels), un survol de menu, aucun clic d'accordéon/onglet/FAQ.
Dernier coût API reçu : **0,3056856 USD** ; Holo du rapport : **0,003889 USD**.
Ce sont des montants observés avant finalisation, pas un coût final garanti :
le statut interrogé après l'annulation indique 79 étapes et `idle`, sans
outil ni approbation en attente. Le coût total du rapport interrompu ne
contient que Holo ; ne pas le comparer au coût complet d'un passage fini.

| Page | Descente | Remontée | Geste offert observé | Arrivée | Défaut langue |
|---|---:|---:|---|---|---:|
| Accueil | 20 | 4 | 1 survol du menu, sans ouverture | départ | 0 |
| Programmes | 11 | 0 | aucun activé | clic | 0 |
| Carrières | 12 | 0 | aucun activé | clic | 1 |
| École | 16 | 0 | aucun activé | clic | 1 |
| Événements | 1 | 0 | aucun activé | clic | 1 |
| Entreprises | 2 | 0 | aucun activé | adresse | 1 |
| Admissions | — | — | non visitée | — | — |
| Bachelor IA Business | — | — | non visitée | — | — |

Le repli adresse a bien transmis sa raison, journalisée sans nouveau champ
de contrat : « La page Événements est un formulaire plein écran sans menu de
navigation visible, aucun lien vers /entreprises n'était accessible par
clic ». C'est l'explication déclarée par H, pas une preuve d'absence de tout
chemin indirect. Aucun formulaire n'a été rempli ou soumis.

Une sonde CDP passive a été ajoutée pendant le passage. Elle relève par
exemple un maximum de 4950 px sur Programmes pour un bas à 5699 px, et
5400 px sur Carrières pour un bas à 6225 px. Le clic suivant part de cette
position, sans remontée. Le menu fixe était visible, mais la page n'était
pas revenue en haut. Cela **invalide** l'exécution malgré les bons petits pas.
Les événements API corroborent le raccourci : H dit voir le footer dans le
texte et clique une carte « Weiter auf Entdeckungstour » sans achever la
remontée. La disponibilité d'un vrai contrôle facultatif sur chaque page
n'a pas été établie ; zéro geste ne prouve donc pas à lui seul une violation.

La consigne a été renforcée avant le second et dernier passage autorisé :
séquence numérotée obligatoire avant tout clic de départ, cartes de liens
distinctes du vrai bas, deux essais sans déplacement exigés en bas **et**
en haut, menu fixe explicitement insuffisant pour éviter la remontée, et
checklist finale. Pas de garde site-spécifique ni de modification #178.

Après cette dernière édition de code, tests ciblés (code 0) :

```text
# tests 65
# pass 65
# fail 0
# skipped 0
# duration_ms 1013.92201
```

Puis check global (code 0) :

```text
agent check: 1..263
agent check: # tests 270
agent check: # suites 0
agent check: # pass 270
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20774.438323
agent check: Done
```

Journaux : `/home/ubuntu/horama-170-explorer-test-3.log` et
`/home/ubuntu/horama-170-point1-check-3.log`. Aucun test relancé ensuite
pour les seules éditions de documentation.

### Démarrage mesuré (secondes depuis le lancement de la CLI)

| Jalon | Avant, dev | Après, premier passage interrompu |
|---|---:|---:|
| Préparation locale jusqu'à l'entrée d'explorer | ≈ 0,779 | ≈ 0,649 |
| Découverte + plan local (durée) | ≈ 0,420 | ≈ 0,345 |
| Pages trouvées, temps cumulé | 1,199 | 0,994 |
| Démarrage du pont Holo CLI | 1,201 | 0,645 |
| Pont prêt | 2,212 | 1,149 |
| Création de session H, début | 2,213 | 1,149 |
| Création de session H, fin | 2,816 | 2,022 |
| Durée POST de création | 0,603 | 0,872 |
| Première étape H reçue | 11,479 | 14,904 |
| Premier appel Holo visuel, début → fin | 14,395 → 14,824 | 15,860 → 16,325 |
| Premier relevé rendu à H | 14,828 | 17,866 |
| Premier geste navigateur reçu (scroll) | 19,326 | 19,787 |

Les préparations sont approximatives au milliseconde : reconstruites par
`exploration.json.le/fin/duree_s` et le temps du log final de la sonde.
Le pont recouvre bien la découverte après modification (0,645 → 0,994 s).
Le chemin local jusqu'à la session créée passe de 2,816 à 2,022 s, sans
constituer une mesure statistique. Le premier geste n'est **pas sous 15 s**.
Le délai création → première étape vaut 8,663 s avant, 12,882 s après ;
ce délai API/modèle varie davantage que le gain local sur ces deux essais.
On ne peut donc pas conclure que la nouvelle consigne accélère l'inférence.
Holo visuel ne bloque pas la création H : il n'est appelé qu'après une
capture par `relever` et recouvre désormais les contrôles du relevé.

### Raccordement scène envisagé pour Après 1/2 — préchauffe abandonnée

**Ne pas appliquer la préchauffe décrite dans le paragraphe historique
suivant :** le helper `preparerNavigateur` a été retiré pour Après 3 après
arbitrage ; le faible gain ne justifie pas de chevaucher #178.
Les jalons de mesure de scène restent pertinents, mais aucune modification
d'`automatisation/` n'est faite ici.

La mesure ci-dessus est celle de la **CLI**, Chrome déjà prêt ; le démarrage
de la scène graphique reste à mesurer. Dans
`automatisation/scene/exploration.mjs`, le runtime propre à la scène est
créé vers la ligne 112, `creerSessionH({ navigateur: runtime.navigateur, ... })`
vers 163, puis `explorer(...)` vers 248. La préchauffe CLI ne s'applique donc
pas automatiquement à la scène. Pour reproduire le recouvrement : importer
`preparerNavigateur` de `agent/src/exploration/cli.ts`, préparer le navigateur
une seule fois hors du mode `SANS_AGENT`, puis fournir cette fonction à
`creerSessionH` à la place de `runtime.navigateur`. Conserver `runtime.close()`
et les options `settle_s`, `key`, `signaler` existantes. Ne pas réutiliser
le pont préparé lors des relances ; le helper garantit une consommation unique.

Ajouter les jalons dès l'entrée de la scène, autour du lancement Chrome,
de `fitViewport`, de la préparation de couche/animation et du premier geste
H : ils ne sont pas inclus dans cette mesure CLI. Sans mesure de ces étapes,
il serait trompeur de promettre 15 secondes pour la scène. La création H a
besoin du canal du pont et de la consigne construite avec les pages découvertes ;
la lancer avant ces deux entrées demanderait une autre orchestration/API,
pas simplement un `Promise.all` autour de l'appel existant.

### Second passage après renforcement — interruption avant nouvel arbitrage

Sortie `/home/ubuntu/horama-170-after-2/`, durée CLI **959,897 s**, code 1.
Deux réponses HTTP 429 sur la création, puis création de
`0116ab1a-b104-4f30-9cf7-bda06ed853d3` à 73,668 s, sans aucune étape reçue.
Le client la ferme/confirme son arrêt avant la relance existante, annoncée
à 146,634 s. Le statut de quota interrogé pendant les 429 était
`{"scope":"org","limit":3,"active":2,"available":1}` : cela ne permet pas
d'attribuer avec certitude les 429 au seul quota de sessions.

La seconde session interne, `3de51202-1156-435f-adee-2f8572615743`, est créée
à 183,145 s après le délai de reprise de 35 s déjà présent. Première étape
à 192,778 s, premier geste navigateur à **207,812 s**. Holo du premier relevé
commence à 195,511 s et finit à 195,925 s ; relevé rendu à 197,676 s.
Préparation locale ≈ 0,607 s, découverte + plan ≈ 0,377 s, pont prêt à
1,608 s. Ces incidents API rendent ce lancement impropre à une conclusion
de performance normale ; l'objectif de 15 secondes n'est pas atteint.

La relance remet **déjà sur dev** le quota de clics à zéro : dans
`explorer.ts`, `launch` utilise `launches === 1 ? clickTarget : 0`, et le plan
de reprise est reconstruit avec `construireExploration(remaining, site,
version, 0)`. Cette logique de reprise, dans le périmètre parallèle #178,
n'a pas été modifiée. Elle explique de façon vérifiable les consignes
« page hors quota de clics demandé » puis les arrivées par adresse du second
passage. Il ne s'agit pas d'une preuve que les liens manquent sur le site.
**Le critère huit pages par clic reste donc non validé.**

La session reprise s'interrompt après quatre pages avec la raison du client :
`La session H est interrompue (erreur réseau ou outil).` La dernière action
reçue est un scroll sur Carrières à 880,646 s ; aucun `terminer` réussi.
Le `catch` de `creerSessionH` remplace la cause originale par cette phrase :
on ne peut pas en déduire une panne réseau précise ni exclure une erreur
d'outil/callback. Aucun correctif spéculatif du pont ou des reprises.
Ce n'est pas un épuisement démontré du budget : 121 étapes reçues pour un
budget de reprise de 573, durée de l'agent reprise 813,232 s pour 4584 s
autorisées. Les quatre pages manquantes sont bien `INCONCLUSIVE`.

| Page | Descente / remontée H | Geste de visiteur tenté | Bas réel / retour au haut observés CDP | Arrivée | Défaut langue |
|---|---:|---|---|---|---:|
| Accueil | 22 / 21 | 1 clic flèche du carrousel de témoignages | oui (9418 px) / oui (0) | adresse, déjà ouverte à la reprise | 0 |
| Programmes | 14 / 13 | 1 clic accordéon « 2. Studienjahr » | oui (5699 px) / oui (0) | adresse | 0 |
| Entreprises | 14 / 13 | aucun activé | oui (5618 px) / oui (0) | adresse | 1 |
| Carrières | 15 / 0 | aucun avant l'interruption | oui (6225 px) / non, interruption à 5775 px | adresse | 1 |
| Admissions | — | non visitée | à mesurer | — | à mesurer |
| École | — | non visitée | à mesurer | — | à mesurer |
| Événements | — | non visitée | à mesurer | — | à mesurer |
| Bachelor IA Business | — | non visitée | à mesurer | — | à mesurer |

Tous les 112 appels `scroll_web` reçus demandent 450 px. La mesure CDP
passive est installée avant la CLI pour ce second passage (`viewport.jsonl`).
Les chiffres de descente/remontée comptent les appels H, y compris ceux sans
déplacement à une extrémité, pas les nombreux événements de l'animation.
Les clics du carrousel et de l'accordéon sont observés dans le DOM ; leur
rendu ouvert n'a pas fait l'objet d'une capture visuelle dédiée. Aucun outil
de saisie, de connexion ou de soumission n'a été appelé. Aucune validation
visuelle de la scène graphique n'est revendiquée.

Constats de langue de ce passage, tous `VERIFIED_FAIL` :

- Entreprises : « 7 blocs en français ; le plus long : 27 mots, 8 mots outils
  français, 0 allemands ; page déclarée de ».
- Carrières : « 9 blocs en français ; le plus long : 24 mots, 6 mots outils
  français, 0 allemands ; page déclarée de ».

Le plafond de huit pages de la découverte choisit Bachelor IA Business,
pas Bachelor 3 : les mesures Bachelor 3 du début du document restent un
contrôle CDP distinct, pas une visite H dans ces passages.

### Bilan comparatif des passages réels

| Mesure | Avant, dev | Après 1, arrêté pour consigne insuffisante | Après 2, consigne renforcée | Après 3, lecture bornée |
|---|---:|---:|---:|---:|
| Durée CLI (s) | 145,969 | 445,568 | 959,897 | 434,503 |
| Pages relevées / prévues | 8/8 | 6/8 | 4/8 | 8/8 |
| Arrivées : départ / clic / adresse | 1 / 6 / 1 | 1 / 4 / 1 | 0 / 0 / 4 | 1 / 6 / 1 |
| Appels `go_to` | 1 | 1 | 3 | 1, motif consigné ci-dessous |
| Étapes H reçues, proxy de coût | 28 | 78 | 121, plus session muette sans étape reçue | 69 |
| Scrolls H | 11 | 66 | 112 | 50 |
| Gestes non navigants | 0 | 1 survol sans ouverture | 2 clics de visiteur | 0 |
| Défauts `texte_non_traduit` | 0, contrôle absent sur dev | 4 | 2, quatre pages non visitées | 4 |
| Coût H dernière métrique reçue par la CLI (USD) | 0,0826736 | 0,3056856 | 0,517908, session muette inconnue de la CLI | 0,2627944 |
| Coût H consulté après arrêt dans les événements API (USD) | 0,0826736 | 0,3106464 | 0,53733 (0,0048292 + 0,5325008) | 0,2627944 |
| Holo additionné dans le rapport (USD) | 0,0051582 | 0,003889 | 0,0026274 | 0,0052122 |
| Total du rapport (USD) | 0,0878318 | 0,003889, partiel après annulation | 0,5205354, coût de la session muette inconnu | 0,2680066 |
| Somme coûts API après arrêt + Holo (USD) | 0,0878318 | 0,3145354 | 0,5399574 | 0,2680066 |
| Crédits distincts des USD | à mesurer, non renvoyés | à mesurer | à mesurer | à mesurer, non renvoyés |
| Premier geste H reçu (s) | 19,326 | 19,787 | 207,812, avec 429/session muette/reprise | 27,756 |
| État | fini | interrompu | interrompu | fini, écarts à la consigne détaillés plus bas |

Avant, scrolls par page (tous descendants) : accueil 3, programmes 2,
carrières 2, école 1, entreprises 1, admissions 1, événements 1,
Bachelor IA Business 0. Les six clics sont navigants, aucun geste de lecture
non navigant. L'unique `go_to` mène d'Événements à Bachelor IA Business ;
sa raison n'est pas transmise par dev et reste **à mesurer**. Zéro défaut
de langue sur dev ne démontre pas une traduction correcte : le contrôle
n'y existe pas. Les contrôles réels du début de ce document prouvent bien
le français sur les pages concernées.

Vérification finale en lecture seule : les trois sessions après sont toutes
`interrupted`, sans outil ni approbation en attente. Les derniers événements
`MetricsUpdateEvent` ont été relus après fermeture des Chrome et fournissent
les coûts de la nouvelle ligne API ci-dessus ; ils dépassent les métriques
reçues avant interruption par la CLI. Les nombres d'étapes serveur sont
79 pour Après 1, puis 1 + 123 pour Après 2 (dont des étapes jamais reçues
par le client). Le `GET /sessions/{id}` restitue les limites effectivement
envoyées : 594 étapes/4752 s pour les sessions initiales et 573/4584 pour la
reprise. La limite augmentée est donc bien transmise à H ; rien n'étaye un
arrêt à cause d'un plafond de 120 étapes. Les causes des pertes de réception
restent non établies. Sources : `/home/ubuntu/horama-170-final-costs.jsonl`
et `/home/ubuntu/horama-170-after-2/final-status.log`.

Décision à prendre avec #178 avant un nouveau passage payant : conserver
le quota de clics pour les pages restantes après une reprise, au lieu de
forcer l'adresse. Ne pas confondre les deux clics de visiteur avec des
arrivées par clic. Même après cette coordination, une nouvelle exécution H
sera nécessaire pour valider les huit pages et mesurer un démarrage sans
incident. Aucun troisième lancement après n'a été effectué.

### État livré avant l'arbitrage Après 3

Le test du parallélisme Holo a été durci lors de la lecture finale du diff :
l'assertion est faite hors du callback de contrôle, dont les exceptions sont
normalement converties en constats. Ainsi l'ancien ordre séquentiel ferait
bien échouer ce test au lieu de masquer l'assertion dans un `INCONCLUSIVE`.
Cette dernière édition ne change aucun code de production mesuré ci-dessus.

Après cette dernière édition du test, `node --test exploration-explorer.test.ts`
(code 0) :

```text
# tests 65
# pass 65
# fail 0
# skipped 0
# duration_ms 1002.785285
```

Puis `pnpm -r --if-present run check`, code 0 :

```text
agent check: 1..263
agent check: # tests 270
agent check: # suites 0
agent check: # pass 270
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20466.639668
agent check: Done
```

Journaux finaux : `/home/ubuntu/horama-170-explorer-test-final.log` et
`/home/ubuntu/horama-170-point1-check-final.log`. `git diff --check` : code 0.
Aucun domaine ajouté dans `agent/src/`, aucun contrat ni fichier
d'`automatisation/` modifié. Aucun processus Chrome des ports 9341/9342/9343
ni lanceur/observateur de mesure ne subsiste ; le Chrome bureau 29229 est
laissé intact. Les coûts Holo du tableau sont calculés par `askHolo` à
partir des tokens, pas des crédits distincts renvoyés par l'API.

Livraison du code et des mesures, **pas** une validation complète de huit
pages par clic ni d'un démarrage sous 15 secondes. Ces deux objectifs restent
ouverts, avec les limites et l'action #178 précisées ci-dessus.

## Après 3 — arbitrage pour une lecture bornée de démonstration

### Changements et limites

- Commit `661ed37` : retrait du helper `preparerNavigateur`, de son import,
  de son appel dans la CLI et du test devenu sans objet. Le pont retrouve
  sa création à la demande par `runtime.navigateur`, après la découverte.
  Ce retrait évite le chevauchement de la préchauffe avec #178.
- Commit `244ce54` : chaque page, départ et dernière compris, demande au
  plus cinq descentes de 450 px ; si le bas n'est pas atteint, un seul grand
  `scroll_web` descendant (`num_pixels: 100000`), puis un geste facultatif
  de visiteur visible et une seule grande remontée (`num_pixels: 100000`).
  Pas de scroll supplémentaire pour chercher un contrôle ; arrêt des petits
  pas dès le bas ou l'absence de mouvement ; pas de répétition aux extrémités.
  Les formulaires et connexions restent interdits.
- Budget : `12 × pages + 13 + 3 × transitions par clic`, soit **130 étapes**
  pour huit pages, contre 594. Les 12 par page réservent cinq petits pas,
  un grand descendant, un grand remontant, un geste et quatre autres étapes
  de relevé/attente/navigation. La réserve globale et celle des clics restent
  disponibles. Temps : 8 s/étape, minimum 240 s, plafond global ramené de
  7200 à 1800 s ; pour ce passage **1040 s**, contre 4752 s.
- Holo reste en parallèle des contrôles. `raison_go_to`, les compteurs et
  les règles de choix de liens sont conservés. Aucun changement de contrat,
  de maintien sur site, de pont/reprise ou d'`automatisation/`.
- **Problème connu #178 maintenu** : `launches === 1 ? clickTarget : 0` et
  la reconstruction du plan avec un quota nul à la reprise n'ont pas changé.
  Aucun redémarrage n'a été nécessaire pendant Après 3 ; ce passage ne
  valide donc pas une correction de ce défaut.

### Check avant le passage payant

Après la dernière édition de code, `node --test exploration-explorer.test.ts`,
code 0 :

```text
# tests 64
# pass 64
# fail 0
# skipped 0
# duration_ms 1032.541695
```

`pnpm -r --if-present run check`, code 0 :

```text
agent check: 1..262
agent check: # tests 269
agent check: # suites 0
agent check: # pass 269
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20513.643458
agent check: Done
```

Journaux : `/home/ubuntu/horama-170-bounded-explorer-test.log` et
`/home/ubuntu/horama-170-bounded-check.log`. La baisse de 270 à 269 tests
vient du retrait du test du helper de préchauffe supprimé. Les tests Holo
parallèle, repli motivé, page unique/dernière page et reprise sont conservés.
Seule la documentation a changé après ces vérifications.

### Passage réel unique

Même commande que les autres passages : `--max 8 --pages-cliquees 8
--sans-base`, sur le même aperçu allemand, Chrome dédié **9344**, 1280 × 900,
DPR 1. Sonde CDP passive installée avant la CLI. Clé dev liée uniquement
dans l'environnement. Session `09fb7b77-8495-4c19-a38f-3a8061eb63e0`.
Un seul lancement ; aucune réponse HTTP 429, erreur réseau observée ou
session muette. La relance exceptionnelle autorisée n'a pas été utilisée.

Code CLI **0**, rapport `fini`, huit pages visitées, zéro sans conclusion.
Durée commande **434,503 s** ; durée interne du rapport **433,279 s**.
Le statut API final est `completed`, `outcome: success`, **69 étapes**,
aucun outil ni approbation en attente ; limites restituées par l'API :
130 étapes / 1040 s. Ce statut indique la fin du parcours, pas l'absence
de défaut : quatre constats de langue `VERIFIED_FAIL` sont bien produits.

```text
8 pages visitées ; durée 433.279 s ; coût 0.2680066 USD.
Navigation : 6 pages par clic, 1 par adresse ; 6 clics, 50 défilements, 1 go_to ; départ : 7 défilements.
```

Le repli mène d'Événements à Bachelor IA Business. Motif transmis par H à
`relever`, puis journalisé, sans le reconstruire a posteriori :

> La page evenements est un formulaire sans menu de navigation standard, aucun lien vers programme-bachelor-ia-business visible

C'est la justification de H, pas une preuve indépendante d'absence de lien.
Aucune saisie ni soumission : les six clics observés par CDP portent tous
sur des liens navigants ; aucun clic non navigant ni outil de saisie,
sélection de champ ou connexion. Les événements de validation H ne signalent
aucune erreur de schéma : les grands `num_pixels: 100000` sont acceptés.

### Détail par page Après 3

Les nombres sont les appels H, pas les événements multiples de l'animation
CDP ni les déplacements automatiques des captures de preuves.

| Page, ordre de visite | Petits descendants 450 px | Grand descendant 100000 px | Grand remontant 100000 px | Geste non navigant | Dernier y CDP | Arrivée | Défaut langue |
|---|---:|---:|---:|---:|---:|---|---:|
| Accueil, 1 | 5 | 1 | 1 | 0 | 0 | départ | 0 |
| Programmes, 2 | **6** | 1 | 1 | 0 | 0 | clic | 0 |
| Carrières, 3 | 5 | 1 | 1 | 0 | 0 | clic | 1 |
| Entreprises, 4 | 5 | 1 | 1 | 0 | 0 | clic | 1 |
| Admissions, 5 | 5 | 1 | 1 | 0 | 0 | clic | 0 |
| École, 6 | 5 | 1 | 1 | 0 | 0 | clic | 1 |
| Événements, 7 | 1 | 0 | **0** | 0 | 51 | clic | 1 |
| Bachelor IA Business, 8 | 5 | 1 | **0** | 0 | 23202 | adresse | 0 |
| **Total** | **37** | **7** | **6** | **0** | — | 1 départ / 6 clics / 1 adresse | **4** |

Le bas est observé sur chaque page. Les six départs par lien ont tous lieu
à `y=0`. Événements mesure 951 px pour un viewport de 900 : le seul petit
pas atteint le bas à 51 px. Bachelor atteint le bas à 23202 px d'un document
de 24102 px. **Écarts réels à la consigne** : Programmes reçoit six petits
pas au lieu de cinq ; Événements et surtout la dernière page ne reçoivent
pas la remontée prescrite. La borne est une instruction à H, pas un filtre
impératif de ses outils navigateur. Aucun geste facultatif n'est activé ;
cela ne démontre pas qu'aucun contrôle n'était proposé sur les pages.
Le parcours fini n'est donc pas présenté comme un respect strict de toute
la chorégraphie ni comme huit arrivées par clic.

Défauts de langue, un par page :

- Carrières : 9 blocs en français ; plus long : 24 mots, 6 mots outils
  français, 0 allemands ; page déclarée `de`.
- Entreprises : 7 blocs ; plus long : 27 mots, 8 outils français,
  0 allemands ; page déclarée `de`.
- École : 16 blocs ; plus long : 28 mots, 6 outils français,
  0 allemands ; page déclarée `de`.
- Événements : 1 bloc ; 17 mots, 6 outils français, 0 allemands ;
  page déclarée `de`.

### Démarrage Après 3, secondes depuis la commande CLI

| Jalon | Temps / intervalle (s) |
|---|---:|
| Entrée sonde du processus CLI | 0,026 |
| Préparation avant `explorer`, approximation horodatages rapport/log | ≈ 0,600 |
| Découverte + plan après cette préparation | ≈ 0,340 |
| Huit pages trouvées | 0,940 |
| Pont : démarrage → prêt | 0,942 → 1,446 (0,504) |
| POST création session H | 1,447 → 2,322 (0,875) |
| Première étape H reçue, `relever(accueil)` | 17,495 |
| Premier Holo visuel | 23,342 → 23,797 (0,455) |
| Premier relevé rendu à H | 25,375 |
| Premier geste H reçu, `scroll_web down 450` | **27,756** |
| Début du mouvement CDP correspondant | ≈ 27,780 |

Le pont ne recouvre plus la découverte. Holo reste parallèle aux contrôles
du relevé, pas à la création H : il a besoin de sa capture. Le délai création
de session → première étape vaut **15,173 s**, sans erreur HTTP observée ;
le premier geste n'est toujours pas sous 15 s. Le scroll CDP antérieur à
24,837 s est une capture de preuve (`y=3954` puis retour à zéro pendant
`relever`), pas un geste de H. Il n'est pas utilisé pour raccourcir la mesure.
Les durées CDP sont approximatives, corrélées aux horodatages rapport/log,
pas à une vidéo ; leur incertitude fine reste à mesurer. La scène graphique
reste visuellement non vérifiée.

### Coûts, artefacts et conclusion

Coût H renvoyé par la CLI et confirmé par le dernier événement API :
**0,2627944 USD**. Holo calculé à partir des tokens : **0,0052122 USD** ;
total rapport **0,2680066 USD**. Aucun chiffre de crédits distincts n'est
renvoyé : **à mesurer**. Les étapes reçues et le statut serveur concordent
à 69 ; les deux étapes sans appel d'outil et la réponse finale sont incluses.

Artefacts : `/home/ubuntu/horama-170-after-3/` (`run.json`, `probe.jsonl`,
`viewport.jsonl`, `cli.log`, `output/exploration.json`, `final-status.json`,
captures et vault). Le lanceur externe active l'observateur pour Après 3 ;
la sonde ajoute seulement la trace des erreurs HTTP/réseau et des erreurs
de validation pour distinguer une panne d'un écart de consigne. Elle ne
change ni les demandes H ni les résultats d'outil. Aucun Chrome de ce
passage ni lanceur/observateur ne subsiste ; Chrome bureau 29229 inchangé.

**Conclusion :** huit pages terminées cette fois, mais **434,503 s**, presque
trois fois les 145,969 s du survol dev. Ce n'est pas une démonstration d'un
parcours revenu à deux ou trois minutes. La comparaison avec Après 2
(959,897 s) est perturbée par ses 429 et sa reprise ; Après 1 (445,568 s)
était arrêté après six pages. Aucun gain statistique revendiqué. Restent
ouverts : cadence de démonstration, respect strict des cinq petits pas et
de la remontée finale, premier geste sous 15 s ; le quota nul de reprise
reste explicitement à traiter dans #178. Aucun second lancement n'a été
effectué, puisque Après 3 s'est terminé sans incident API.

## PR #179 — fusion de dev après #178

Fusion normale de `origin/dev` (`23ca4bb`), sans rebase ni réécriture
d'historique. Deux fichiers en conflit :

- `agent/src/exploration/cdp.ts` : conserver ensemble `PageLink`,
  `pageLinks` et `readLinks` de dev, puis `scrollSmooth` et la signature
  optionnelle `captureDefect(..., { doux })` de #170. Le comportement par
  défaut reste instantané ; les erreurs et la restauration douce sont gardées.
- `agent/src/exploration/explorer.ts` : conserver **mot pour mot**
  `readingInstruction` (cinq petits pas de 450 px maximum, grands trajets
  bornés, geste facultatif), et combiner son appel avec `pathOf`, la liste
  des chemins/adresses et le choix de lien par adresse de #178. La réponse
  dynamique ajoute `linkHints` tout en conservant la lecture, la dernière
  page et `raison_go_to`. Enfin, garder à la fois l'option `doux` au repli
  CDP et la déduplication des contrôles recapturés apportée par dev.

Les ajouts fusionnés sans conflit sont conservés : retour sur le site,
relevés hors site refusés, indications de liens réels, détection Selenium
`invalid session id` et journal neuf par pont. `browser.ts` et son test
sont identiques à dev. Les tests de l'explorateur se sont combinés sans
résolution manuelle. Le contrôle de langue et Holo parallèle sont conservés.
Budgets #170 inchangés : 130 étapes / 1040 s pour huit pages.

**Le quota de clics à la reprise n'est pas corrigé dans ce dev.** Vérifié
dans `origin/dev` puis dans le résultat fusionné :

```ts
const clicked = launches === 1 ? clickTarget : 0;
await launch(construireExploration(remaining, site, version, 0));
```

Ces deux mises à zéro restent présentes. La correction du pont de #178
ne doit donc pas être décrite comme une correction du quota de clics.

Premier check : 275/276, échec du test Chrome de découverte déjà rencontré :

```text
agent check: not ok 171 - Chrome réel découvre une page JS locale sans masquer la scène et ferme ses onglets
agent check:   error: 'Onglet du relevé introuvable.'
agent check:     async TestContext.<anonymous> (file:///home/ubuntu/repos/Horama-/agent/exploration-pages.test.ts:172:22)
agent check: # tests 276
agent check: # pass 275
agent check: # fail 1
```

Le nettoyage restait ouvert ; seuls son Node et son Chrome dédiés ont été
arrêtés, sans toucher au Chrome bureau 29229. `pages.ts`, le test et le corps
de `connecterCdp` sont identiques à dev ; la cause de cette intermittence
n'est pas établie. Aucun changement spéculatif de gestion d'onglets.
Journal : `/home/ubuntu/horama-179-merge-check.log`.

Le contrôle des espaces de l'index complet signale six fins de ligne avec
espaces dans un passage du vault importé de dev ; ce fichier est identique
à dev et laissé intact. Le contrôle limité aux fichiers de résolution et
aux tests fusionnés passe. Aucun fichier d'un autre pôle n'est modifié
manuellement : les autres fichiers proviennent de la fusion de dev.
Aucune nouvelle session H ni vérification visuelle de scène pour cette fusion.

Après nettoyage, deuxième `pnpm -r --if-present run check`, sans modification
de code entre les deux essais : code **0**.

```text
agent check: 1..269
agent check: # tests 276
agent check: # suites 0
agent check: # pass 276
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20450.321624
agent check: Done
```

Journal : `/home/ubuntu/horama-179-merge-check-2.log`. Les tests de capture
douce, langue, Holo parallèle, consigne bornée, retour sur site, liens par
adresse et nouveau pont sont inclus. Seule cette documentation a changé
après le check vert ; aucune mesure H antérieure n'est présentée comme
une validation réelle de la combinaison après fusion.

### Nouvelle fusion de dev : #180, #182, #186 et #181

Fusion normale de `origin/dev` (`aa56a5e`) après lecture des diffs des quatre
PR. #180 et #182 sont déjà dans notre historique ; leurs regroupements,
références et protections de navigation restent conservés.

Seul `controles.ts` présente cette fois un conflit réel : l'union des sortes
conserve `texte_non_traduit` et le type de #186 conserve `SUSPECTED` et
`raison`. Le contrôle de langue reste agrégé à un défaut par page avec ses
seuils et exclusions inchangés. Les règles de #186 propres aux liens,
débordements et textes techniques ne deviennent pas des règles linguistiques.

`cdp.ts` fusionne automatiquement la vérification des clics dans un contexte
isolé de #186 avec la capture douce existante. `explorer.ts` fusionne
automatiquement la propagation du statut et de la raison, le regroupement
tenant compte du statut, les rapprochements Holo entre pages et l'exclusion
des minuscules zones visuelles. La consigne 5 × 450 px est identique mot pour
mot à celle d'avant fusion ; `raison_go_to`, Holo parallèle, capture douce et
quota de reprise sont inchangés. Le direct de #181 est importé tel quel :
service/conteneur en mode direct par défaut (`HORAMA_DIRECT=0` pour l'ancien
mode), images JPEG du screencast et parcours direct associé.

`pnpm -r --if-present run check` passe dès le premier essai, code **0** :

```text
agent check: 1..277
agent check: # tests 284
agent check: # suites 0
agent check: # pass 284
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 20463.309536
agent check: Done
```

Journal : `/home/ubuntu/horama-179-merge-2-check.log`. Aucun nettoyage de
Chrome ni nouvel essai nécessaire. Aucun nouveau passage H ni vérification
visuelle ; seule cette documentation a changé après le check vert.
