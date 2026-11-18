# #170, point 3 — texte non traduit

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
