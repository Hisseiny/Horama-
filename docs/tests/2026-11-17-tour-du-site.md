# Tour du site Eugenia : sept pages (issue #42)

Date : 17 novembre 2026. Ali, pôle A. Issue : https://github.com/Hisseiny/Horama-/issues/42. Base : `dev`, contrats `contrats-v2` (D7). Statut : **codé non testé** au sens de la checklist ; relecture humaine par Nathan restante.

## Test livré

`vault-horama/eugenia/tests/tour-du-site.md` reste `statut: propose`. Il demande sept relevés `defaut`, dans l'ordre ci-dessous, et une règle `etat` avec deux textes témoins par page. La Task commence par le refus des cookies si nécessaire et l'interdiction des formulaires. Aucune référence d'image créée ou promue, aucune note de `produit/` modifiée.

## Reconnaissance navigateur sur le site en ligne

Un parcours séquentiel dans Chrome, simple visiteur, depuis https://www.eugeniaschool.com/, sans formulaire ouvert, rempli ou envoyé, sans bannière de cookies observée. Après l'ouverture initiale, seuls les liens et menus du site ont servi. Chaque page a été relevée en haut, menu fermé. Le burger est nécessaire pour accéder aux rubriques du menu supérieur dans la fenêtre observée ; les liens du pied de page n'ont pas été utilisés.

| Écran | Chemin réel | Navigation depuis la page précédente |
|---|---|---|
| accueil | `/` | Ouverture initiale |
| bachelor | `/programme/bachelor-ia-business` | « DÉCOUVRIR LE BACHELOR » |
| msc | `/programme/master-ia-business-alternance` | Burger « Ouvrir le menu » → « PROGRAMMES + » → « MSc IA Applied to Business » |
| processus-admission | `/processus-admission` | Burger → « ADMISSIONS + » → « Processus d'admission » |
| notre-adn | `/notre-adn` | Burger → « L’ÉCOLE + » → « Notre ADN » |
| campus-paris | `/campus/paris` | Burger → « L’ÉCOLE + » → « Le campus » |
| faq | `/faq` | Burger → « ADMISSIONS + » → « FAQ » |

Les 14 textes du bloc `regles` sont des sous-chaînes exactes du `document.body.innerText` des pages ouvertes dans le navigateur. Les sauts de ligne des titres sont conservés sous forme `\n` dans le JSON ; les capitales viennent du texte rendu. Aucun témoin ne contient de date ni de chiffre variable.

## Vérification scriptée, sans autre visite du site

Sur une copie locale des notes et tests Eugenia, seul `tour-du-site` est rendu accepté pour l'essai ; le fichier du dépôt reste proposé. `lireTestsAcceptes` exclut bien le test proposé du dépôt. `construireConsigne` produit les sept chemins attendus, sans préfixe `/v1/`.

Le vérificateur existant `verifierReleve` a été appelé sur les sept textes sauvegardés par le navigateur, avec les règles lues par `lireTestsAcceptes` :

- Textes intacts : sept règles `PASS` ; les 14 témoins correspondent caractère pour caractère aux textes sauvegardés.
- En ne conservant localement que le deuxième témoin de chaque page : sept `VERIFIED_FAIL` (le premier manque, le second prouve l'état).
- Texte entièrement vide : sept `INCONCLUSIVE`, « état non atteint », conformément à D7 section 3. Ce n'est jamais une réussite.

Ces mutations ne concernent que des chaînes locales, jamais le site public. Ce contrôle scripté ne constitue pas un passage H.

## Passage H réel

Quota vérifié avec la clé Horama `HORAMA_HAI_API_KEY`, liée à `HAI_API_KEY` uniquement dans l'environnement du processus : `GET https://agp.eu.hcompany.ai/api/v2/sessions/quota` → HTTP 200, `scope: org`, `limit: 3`, `active: 0`, `available: 3`. Aucune clé de démonstration utilisée.

**Un seul passage réel : 7 relevés sur 7, C4 global `PASS`.** Session `d7d3bd7f-9121-474d-ab09-f59e1e39b3d0`, passage `2026-11-17-17h43-547f`.

Juste avant la création, le quota a été revérifié à `2026-11-17T17:43:09.854Z` : HTTP 200, limite 3, active 1, disponibles 2. Une garde de préparation exigeant inutilement zéro session active avait arrêté un premier préflight **avant toute création H** ; corrigée pour respecter le plafond de trois. Le passage a ensuite créé exactement une session (`sessionCalls=1`, `sessionCreationRequests=1`), sans relance.

### Commande et environnement réellement employés

La commande complète du ticket nécessite aussi les options obligatoires du CLI :

```sh
pnpm --filter @horama/agent passage -- --logiciel eugenia --version 1 --reference 1 --tests tour-du-site --base-url https://www.eugeniaschool.com --vault /home/ubuntu/eugenia-tour-vault --chrome-port 9333
```

Les identifiants Supabase n'étant pas disponibles, **cette commande pnpm n'a pas été exécutée telle quelle**. L'essai a appelé les mêmes `lireArguments` et `lancerCommande` depuis un harness TypeScript externe au dépôt, en injectant la `BaseMemoire` existante, avec le vrai `creerSessionH` et le vrai `navigateurLocal`. Aucun remplacement de la session H ou des captures par des mocks. La consigne produite par `construireConsigne` n'a pas été modifiée. Le harness bloque une éventuelle seconde création de session pour respecter le parcours unique autorisé.

Le passage réel a utilisé le moteur de `dev` au commit `6366c8c`. La synchronisation finale avec `dev` (`f543b1d`) a apporté l'option `--sans-base` : elle permet désormais de rejouer la commande pnpm ci-dessus sans Supabase en ajoutant ce drapeau. Aucun second passage H n'a été lancé. La vérification finale des sept PNG et textes du passage existant avec ce moteur synchronisé donne encore un C4 global `PASS` et sept C4 par règle `PASS`.

```ts
const options = lireArguments([
  "--logiciel", "eugenia", "--version", "1", "--reference", "1",
  "--tests", "tour-du-site", "--base-url", "https://www.eugeniaschool.com",
  "--vault", "/home/ubuntu/eugenia-tour-vault", "--chrome-port", "9333",
]);
const base = new BaseMemoire();
// lancerCommande(options, { base, runtime, createSession, env: process.env })
// runtime : navigateurLocal ; createSession : vrai creerSessionH, gardé à un appel.
```

Chrome dédié, anonyme, un seul onglet initialement `about:blank`, fenêtre de page 1280 × 900, DPR 1. H a effectué l'unique ouverture initiale de l'accueil, puis seulement les clics du parcours, sans rechargement ni formulaire. Les sept relevés ont le menu fermé et un défilement `[0, 0]`. Aucune bannière de cookies observée.

La copie de vault contient seulement les notes et tests Eugenia ; seul `tour-du-site` y est accepté pour l'essai. Les références d'images Mac n'y sont pas copiées : ce passage mesure les règles de texte, aucune comparaison d'images. Les fichiers du dépôt restent inchangés par l'essai.

| Mesure du C6 | Valeur |
|---|---|
| Début / fin UTC | `2026-11-17T17:43:09.874Z` / `2026-11-17T17:45:36.737Z` |
| Passage / test | `joue` / `termine` |
| Relevés | 7 sur 7, dans l'ordre du test |
| Durée du coureur | 146,863 s |
| Étapes H | 27 |
| Coût retourné par H | 0,0733082 USD |
| C4 global enregistré dans `BaseMemoire` | `PASS`, `niveau_de_preuve: releve + calcul`, 14 valeurs « affiché » |

### C4 de chaque règle sur les captures réelles

Le coureur enregistre **un seul C4 agrégé par test**, ici `PASS`. Pour détailler chaque règle sans créer d'autres sessions, `verifierTest` a ensuite été appelé sept fois sur les mêmes captures, chaque fois avec une seule règle du test. Les sept C4 ci-dessous sont des résultats de ce post-traitement, **pas sept lignes persistées par le coureur**. Ils ont tous le même `passage_id`, `test_id`, les versions `1`/`1`, deux valeurs « affiché » et le niveau `releve + calcul`.

| Écran réellement acquis | C4 par règle | `calcul` retourné |
|---|---|---|
| accueil | `PASS` | « L’ÉCOLE DE L’IA APPLIQUÉE AU BUSINESS. », « École IA, école tech et école growth, hors Parcoursup » affichés |
| bachelor | `PASS` | « BACHELOR AI APPLIED TO BUSINESS », « L'entrepreneuriat, l'IA et l'automatisation te branchent ? » affichés |
| msc | `PASS` | « MSC IA APPLIQUÉE AU BUSINESS », « Le Master en alternance de l’école de l’IA appliquée au business » affichés |
| processus-admission | `PASS` | « CANDIDATER. BACHELOR OU MSC. », « // ÉCOLE IA, TECH ET GROWTH · PROCESSUS D'ADMISSION » affichés |
| notre-adn | `PASS` | « DES PROFILS QUI SE DISTINGUENT. », « Eugenia est une école IA, tech et growth, hors Parcoursup, née d’une conviction. » affichés |
| campus-paris | `PASS` | « UN CAMPUS QUI VIT. », « Le campus d’une école IA hors Parcoursup : une verrière, un amphithéâtre, des salles où l’on construit. » affichés |
| faq | `PASS` | « TU AS DES QUESTIONS. », « École IA hors Parcoursup : admissions, Bachelor, Master en alternance, frais, financement. » affichés |

Les URL réelles acquises correspondent aux sept chemins du tableau de navigation, sur l'origine `https://www.eugeniaschool.com`. Les textes complets sauvegardés pendant H contiennent les 14 témoins caractère pour caractère, au-delà de la normalisation des espaces et de la casse faite par le juge.

### Preuves et portée

- [Replay retourné par H](https://agp.eu.hcompany.ai/share/api/v1/trajectories/d7d3bd7f-9121-474d-ab09-f59e1e39b3d0) ; accès public du replay non vérifié.
- [Vidéo du passage réel dans la session Devin](https://app.devin.ai/sessions/3b4e8374d9e04010a83d2297f11c2d42?testRecording=5dc74852-2459-4cf6-aa9b-11acb4395b44). Les exports C6, C4 global, C4 par règle, événements, textes et PNG sont conservés dans les artefacts de cette session.
- Aucune écriture ni persistance distante Supabase mesurée. Les URL `http://localhost/storage/...` générées par `BaseMemoire` dans les exports ne sont pas servies ; les sept vrais PNG ont été exportés séparément. Aucun lien de capture distant fonctionnel n'est revendiqué.

## Vérification du dépôt

`pnpm install && pnpm -r --if-present run check` : vert avant le passage H, puis vert après récupération et intégration de `origin/dev` (`f543b1d`). Lint et types passent ; aucun test en échec. Les contrôles des textes exacts, de l'exclusion du test proposé et des cas de témoin manquant/page vide ont aussi été rejoués localement après synchronisation, sans nouvelle visite du site.

## Limites et suite humaine

- Nathan doit relire le parcours et les témoins, puis passer le test à `accepte` ; aucune validation humaine n'est revendiquée ici.
- Le couloir Nathan prend les références d'images manquantes sur le Mac de démo. La comparaison d'images, les différences de polices Linux/Mac et la persistance Supabase ne sont pas validées par cette PR.
- **Décision d'équipe nécessaire pour l'exigence « page vide en défaut prouvé »** : D7 impose `INCONCLUSIVE` quand aucun témoin attendu n'apparaît. Deux témoins permettent `VERIFIED_FAIL` lorsqu'un seul manque, mais aucun choix de textes ne transforme une page entièrement vide en `VERIFIED_FAIL` avec ce contrat. Le juge et D7 ne sont pas modifiés dans cette tâche ; Nathan et Ali doivent trancher cette différence avec le libellé de #42.
