# Horama

**Votre documentation devient vos tests. Sans documentation, Horama regarde quand même.**

Horama teste un site web comme le ferait une personne : un agent H (Agents API de H Company) le parcourt en direct dans Chrome, le code vérifie ce qui se prouve, un humain tranche le reste, et chaque décision est gardée pour le passage suivant.

Hackathon Eugenia « Build The Future », 16 au 20 novembre 2026, équipe 11. Horama prolonge la [démo QA de H Company](https://github.com/hcompai/agents-api-demos/tree/main/examples/software_qa) (licence MIT), dont il reprend le format de test Markdown. Produit et fonctionnalités : [cadrage](docs/cadrage.md).

Ce document décrit l'architecture rendue le 18 novembre à 17 h : ce qui existe, ce qui a été mesuré, ce qui reste à construire. Chaque chiffre renvoie à son rapport dans `docs/tests/` ; une valeur non mesurée est écrite « à mesurer ».

## Deux modes

Recadrés le 18/11 ([décision](docs/decisions/2026-11-18-recadrage-grand-public-et-dev.md)) ; ce qui reste à faire, par personne et par jour : [feuille de route](docs/feuille-de-route.md).

| | Mode développeur | Mode grand public |
|---|---|---|
| Pour qui | Une équipe produit qui documente son logiciel | N'importe qui, avec la seule adresse d'un site |
| Ce qu'Horama reçoit | Un vault Obsidian (une note par écran, des règles), le dépôt Git du site | Une adresse. Ni documentation, ni accès au code |
| Ce qui déclenche | Un déploiement Vercel : Horama lit la PR sur GitHub et le vault Obsidian, choisit les tests à rejouer, réécrit dans le vault où sont les erreurs et répond par une PR | Une demande : on colle l'adresse (extension Chrome ou page d'accueil) |
| Ce que l'agent H fait | Joue les tests acceptés par un humain, relève les écrans demandés | Visite toutes les pages trouvées (trois agents en parallèle à terme) |
| Ce qui est prouvé | Règles calculées (égalité, somme, filtre, format, présence, état) et comparaison d'images avec les références | Contrôles mécaniques (page en erreur, image cassée, texte qui déborde, lien mort, texte d'erreur affiché) |
| Ce qui reste un doute | Un écart d'image | Ce que Holo voit sur la capture, un écart d'image au passage suivant |
| Ce qui est gardé | Décisions bug ou voulu dans le vault, correction de note proposée par un modèle, PR de documentation | Captures de référence et décisions, pour comparer au passage suivant |
| État au 17/11 au soir | Construit, joué en réel sur le site d'Eugenia (voir « Chiffres mesurés ») | À construire (issue [#57](https://github.com/Hisseiny/Horama-/issues/57)) ; format de sortie fixé ; rien de mesuré |

Le mode grand public fait entrer un visiteur sans rien lui demander ; à la fin, Horama lui propose le mode développeur pour aller plus loin.

## Le site de la démo : Eugenia School

Facturo (notre faux SaaS de facturation, `faux-saas/`, en ligne sur `facturo-demo.vercel.app`) a servi de banc d'essai jusqu'au 17/11 ; il est abandonné pour la démo. La démo se joue sur le site de l'école : [déroulé validé par Nathan](docs/decisions/2026-11-17-deroule-demo-eugenia.md).

1. **D'abord le site en ligne**, https://www.eugeniaschool.com, en simple visiteur : aucun formulaire touché, un parcours à la fois, aucune écriture sur le site. Le vault `vault-horama/eugenia/` décrit 7 pages (accueil, Bachelor, MSc, processus d'admission, Notre ADN, campus de Paris, FAQ), avec leurs références d'image v1 prises sur le Mac de démo. Un changement du site y est simulé : l'écart est planté dans une copie du vault et la fiche de changement part dans un commit local jetable ([répétition](docs/demo/2026-11-17-repetition.md)).
2. **Puis le fork**, quand l'école l'accorde ([demandes faites à l'école](docs/decisions/2026-11-17-fork-eugenia.md)) : le vrai code du site, déployé à une adresse de l'équipe non indexée. Un vrai commit (la v2 : une nouveauté et une régression plantée) réveille Horama.

Il n'y a plus de copie locale du site.

## Mode développeur

### Le parcours, comme un spectateur le voit

```mermaid
flowchart LR
  V["1. Vault Obsidian<br/>notes, règles, tests acceptés"] --> R["2. Commit ou déploiement<br/>réveil, choix des tests"]
  R --> A["3. Agent H en direct<br/>Chrome local, mascotte muette"]
  A --> C["4. Récapitulatif<br/>PASS, défaut prouvé, doute"]
  C --> I["5. Avant / après<br/>image de chaque écart"]
  I --> H["6. Humain : bug ou voulu<br/>vault mis à jour, PR de doc"]
  H --> V
```

1. **Le vault** (`vault-horama/<logiciel>/`) : une note par écran avec son adresse, les règles écrites dans la note (par exemple le même chiffre réel affiché sur deux pages), les tests au format de la démo QA de H. Un modèle ouvert propose les tests depuis les notes (`jugement/generation`, routeur Hugging Face) ; un humain les accepte ou les refuse.
2. **Le réveil** (`automatisation/reveil/`) surveille une branche ; à chaque commit, **l'impact** (`automatisation/impact/`) compare les fichiers modifiés aux champs `code:` des notes et aux fiches de changement, et écrit la liste des tests retenus et écartés, avec la raison de chacun (format `horama-impact-1`, [décision](docs/decisions/2026-11-17-format-impact.md)).
3. **La scène** (`automatisation/scene/`) ouvre Chrome en local, annonce la sélection, puis l'agent H joue les tests. Un curseur suit chaque clic de l'agent ; la mascotte se tait pendant le parcours et dessine des traits sur ce qu'elle voit. À chaque `relever(ecran, vue)`, la scène capture la page (1280 × 900, pointeur écarté pour éviter un survol) et la vérifie aussitôt.
4. **La vérification** (`jugement/verification`) est du code, sans modèle : chaque règle sort `PASS`, `VERIFIED_FAIL` (défaut prouvé, avec les valeurs lues et le calcul) ou `INCONCLUSIVE` (valeur illisible, avec la raison) ; chaque écart d'image avec la référence sort `SUSPECTED` (doute), avec sa zone. `SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites.
5. **Le récapitulatif** montre chaque écart avec l'image avant et après.
6. **L'humain tranche** bug ou voulu. La décision s'écrit dans le vault (`decisions/`) et en base ; pour un « voulu », un modèle propose la phrase de la note à corriger (`jugement/correction`), l'humain l'accepte ou la refuse, et une PR de documentation peut partir sur GitHub (`automatisation/pr-doc/`). Au passage suivant, l'écart tranché « voulu » n'est plus un doute.

### Les briques

| Dossier | Rôle | Responsable |
|---|---|---|
| `vault-horama/` | Le vault : notes d'écran, règles, tests acceptés, références d'image, décisions, rapports de passage | Inès |
| `memoire/` | Lire et écrire le vault (notes, règles, tests, décisions), sans base ni réseau | Inès |
| `base/` | Schéma de la base Supabase partagée : passages, événements, captures, résultats, décisions | Inès |
| `jugement/` | Génération des tests (Hugging Face), vérification d'un écran (règles et images), correction de note | Leslie |
| `agent/` | Le coureur : sessions de l'Agents API de H, pont `holo local browser` vers le Chrome local, relevés, écriture en base, rapport C6, lien de replay | Ali |
| `automatisation/scene/` | La scène en direct : Chrome visible, curseur, mascotte, récapitulatif, questions bug ou voulu | Nathan |
| `automatisation/impact/`, `automatisation/reveil/` | Choisir les tests à rejouer depuis un diff ; réveiller la scène à chaque commit | Nathan, Ali |
| `automatisation/pr-doc/` | Ouvrir une PR de documentation pour une correction de note acceptée | Ali |
| `automatisation/demo/` | Répétition de la démo de bout en bout (`repetition.sh`) | Nathan |
| `accueil/` | La landing « L'envoyé » (issue #70) : HTML statique et modules ES, sans bundler ; formulaire encore en maquette | Nathan |
| `interface/` | L'application web Horama (Next.js) : les 8 étapes de la boucle, encore sur données factices | Axil |
| `faux-saas/` | Facturo, le faux SaaS du banc d'essai (abandonné pour la démo) | Nathan |
| `contrats/` | Formats échangés entre les briques, gelés (`contrats-v1`, puis `contrats-v2` pour la règle `etat`) | Ali (gardien) |
| `pitch/` | Récit de la démonstration | Noé |

### Ce que les briques s'échangent

```mermaid
flowchart TD
  V["vault-horama<br/>notes, règles, tests C2"] -->|notes| G["jugement/generation<br/>Hugging Face"]
  G -->|C1 test proposé| HU["Humain : accepte"]
  HU -->|C2 test accepté| V
  GIT["Commit / déploiement"] --> RE["reveil + impact<br/>horama-impact-1"]
  V --> RE
  RE --> SC["scene<br/>Chrome local, mascotte"]
  SC --> AG["agent : coureur<br/>Agents API H, holo local browser"]
  AG -->|relever| SC
  SC -->|capture + texte| JV["jugement/verification<br/>règles et images"]
  JV -->|C4 constats| SC
  AG -->|C3 passage, événements, captures<br/>C6 rapport| DB["Supabase partagé"]
  SC -->|question| H2["Humain : bug ou voulu"]
  H2 -->|C5 décision| V
  H2 -->|C5| DB
  H2 -->|voulu| JC["jugement/correction<br/>phrase de note proposée"]
  JC --> PR["pr-doc : PR de documentation"]
```

### Contrats

Définitions qui font foi : [`contrats/types.ts`](contrats/types.ts), [exemples](contrats/exemples/).

| Contrat | Échange |
|---|---|
| C1 `TestPropose` | Génération vers validation humaine : test proposé, règles, questions d'ambiguïté |
| C2 `TestAccepte` | Test accepté, fichier Markdown du vault, lu par le coureur |
| C3 `Passage`, `EvenementFil`, `Capture` | Coureur vers la base : le passage, son fil, ses captures |
| C4 `ResultatVerification` | Vérification : `PASS`, `SUSPECTED`, `VERIFIED_FAIL`, `INCONCLUSIVE`, avec valeurs, calcul, écarts d'image |
| C5 `Decision` | Humain vers vault et base : bug ou voulu, portée limitée, correction de note éventuelle |
| C6 `RapportPassage` | Rapport du passage, avec le lien de replay H facultatif |
| C7 `NotificationRelecture` | Vers n8n (non construit) |
| C8 `LigneMesure` | Vers les mesures |

Deux formats de fichier, hors contrats, relient les briques du couloir Nathan : `horama-impact-1` ([décision](docs/decisions/2026-11-17-format-impact.md)) et `horama-exploration-1` pour le mode grand public ([décision](docs/decisions/2026-11-17-format-exploration.md)).

## Mode grand public

Décidé par Nathan le 17/11 au soir (« mode visuel »), renommé et recadré le 18/11. Moteur à un agent fusionné (#64, `pnpm --filter @horama/agent explorer -- --url <adresse>`) ; marche sur n'importe quel site : #67 ; extension et service : #68 ; affichage dans la scène : #69.

### Le parcours, comme un spectateur le verra (validé par Nathan)

1. **L'adresse** : on colle l'adresse d'un site (par exemple eugeniaschool.com). Pas de documentation, pas d'accès au code.
2. **La visite** : Horama trouve les pages (plan du site, puis liens) ; un agent H les visite en direct, en commençant par la page de départ (l'onglet ouvert quand on lance Horama). Plusieurs agents en parallèle : après le hackathon (voir « Évolutions prévues »).
3. **Deux regards sur chaque page** : les contrôles automatiques donnent des défauts prouvés (page en erreur, image cassée, texte qui déborde de son bouton, lien mort, « undefined » affiché ; plus tard l'accessibilité chiffrée, issue [#55](https://github.com/Hisseiny/Horama-/issues/55)) ; Holo regarde la capture comme un humain et donne des doutes.
4. **Le récapitulatif** : chaque défaut avec sa capture entourée ; l'humain tranche bug ou voulu.
5. **Le passage suivant** : Horama a gardé les captures ; il compare et signale ce qui a bougé, puis propose le mode développeur (documentation et GitHub) pour aller plus loin.

### Architecture prévue

```mermaid
flowchart LR
  U["Adresse du site"] --> P["Pages trouvées<br/>sitemap.xml, puis liens, sans H"]
  P --> A1["Agent H"]
  A1 -->|capture par page| M["Contrôles mécaniques<br/>CDP : VERIFIED_FAIL"]
  A1 -->|capture par page| HO["Holo (Models API)<br/>SUSPECTED"]
  M & HO --> X["horama-exploration-1"]
  X --> SC["scène : récapitulatif, bug ou voulu"]
  X --> REF["vault-horama, références du site<br/>comparaison au passage suivant"]
```

- Les pages sont trouvées sans H (sitemap, puis liens internes du même domaine, plafond de 15 par défaut) ; formulaires, PDF et pages de connexion exclus ; `robots.txt` respecté.
- Les agents H visitent ; c'est le code qui contrôle. Un constat de Holo n'est jamais un défaut prouvé.
- Le plan gratuit de H permet 3 sessions simultanées par organisation : le moteur vérifie qu'il y a 3 places libres avant de lancer et ferme toutes ses sessions à la fin (contraintes détaillées dans l'issue #57). Pendant la démo, personne d'autre ne lance d'agent sur le compte.
- La sortie (un fichier `horama-exploration-1`, plus un C4 par page) est fixée dans [`docs/decisions/2026-11-17-format-exploration.md`](docs/decisions/2026-11-17-format-exploration.md) ; aucun contrat ne change.

### Le service que le jury essaie seul (décidé le 18/11, issue [#68](https://github.com/Hisseiny/Horama-/issues/68))

Option A, décidée par Nathan : **un service sur notre serveur, dans un conteneur Docker hébergé sur Railway**. Le jury n'installe que l'extension Chrome ; elle appelle le service, qui fait tourner Chrome, le pont `holo` et le moteur `explorer`. Railway parce qu'il garde un processus qui tourne en continu, accepte une image Docker et déploie depuis une branche GitHub ; Render est écarté (son offre gratuite met le service en veille). Étapes, par Ali :

1. Un `Dockerfile` (Node, Chrome, `holo`, le moteur) et un passage réel sur eugeniaschool.com dans ce conteneur, avant tout déploiement.
2. Le service : `POST /explorations`, `GET /explorations/:id` (format `horama-exploration-1`), les captures par lien ; une file d'attente au-delà de 3 sessions H simultanées, avec un message clair.
3. Le déploiement sur Railway, après deux conditions de sécurité : une clé H dédiée au service (supprimée après la démo de vendredi, jamais la clé de l'équipe) et Chrome sous un autre compte du conteneur que le moteur (ni la clé H ni les données du moteur ne lui sont visibles), prouvées par une commande dans le rapport.

L'extension (couloir Nathan) vient après la direction artistique.

## Chiffres mesurés

Tous sur le Mac de démo sauf mention, au 17/11. Les durées et coûts de l'agent H sont ceux rendus par l'API pour un passage.

| Mesure | Résultat | Preuve |
|---|---|---|
| Tour complet du site d'Eugenia en ligne par l'agent H (7 pages, menu burger compris) | 3 tours sur 3 en code 0 ; 21 relevés sur 21 ; 21 règles `etat` PASS ; 0 pixel d'écart avec les références sur les 7 pages à chaque tour ; 0 relance ; 115 à 152 s par tour ; 0,0716 à 0,0739 $ par tour | [tour du site en réel](docs/tests/2026-11-17-tour-du-site-reel.md) |
| Premier parcours réel sur Eugenia (accueil, Bachelor, MSc) | Code 0 ; 2 clics sur 2 sur l'élément attendu, dont un lien de pied de page après défilement ; 63,4 s ; 0,0229 $ ; règle « hackathons par an » PASS entre deux pages (« 3-5 » et « 3 À 5 ») | [Eugenia en ligne](docs/tests/2026-11-17-eugenia-en-ligne.md) |
| Stabilité des captures | Trois captures par page à des moments différents : 0 pixel d'écart sur 6 pages ; la photo du haut de l'accueil change d'une visite à l'autre (252 128 pixels) et est déclarée zone ignorée | [tour du site en réel](docs/tests/2026-11-17-tour-du-site-reel.md) |
| Répétition de la démo en scripté (sans agent H, gratuit) | Code 0, 54 à 71 s de bout en bout : sélection (1 test retenu, 1 écarté), parcours, doute, question, correction de note proposée et acceptée, décision en base | [mode d'emploi](docs/demo/2026-11-17-repetition.md), journal du 17/11 18 h 27 à 19 h 20 |
| Génération des tests par un modèle ouvert (`openai/gpt-oss-120b`, Hugging Face) | 9 passes sur 9 au format C1 valide avec les règles justes, temps médian 1,6 s (3 notes de Facturo, 3 passes chacune) | [T4](docs/tests/2026-11-17-t4-generation-rapide-3.md) |
| Correction de note proposée après un « voulu » | 11 sur 15 justes sur 5 cas de Facturo (un cas raté aux 3 passes) ; sur le cas d'Eugenia, 5 sur 6 avec les textes de la zone donnés au modèle, et le modèle varie d'un appel à l'autre à température 0 | [correction](docs/tests/2026-11-17-correction.md), journal du 17/11 18 h 53 |
| Réveil par commit | Impact écrit à 0,21 s du commit, scène lancée à 0,23 s (Linux, site d'essai synthétique, sans agent H ni base) | [réveil local](docs/tests/2026-11-17-reveil-local.md) |
| Coureur seul sur Facturo, 3 passages de suite | 3 sur 3 joués ; 64 à 88 s ; 0,026 à 0,034 $ | [A5](docs/tests/2026-11-17-a5-trois-passages-agent-h.md) |
| Mode grand public à un agent, sur eugeniaschool.com en ligne | 15 pages trouvées et visitées par H, 174 à 237 s, environ 0,07 $ par passage ; 8 constats relus à la main : 2 vrais (lien « portes ouvertes » en 404, chapô d'article coupé), 6 faux, tous venus de Holo ; second passage : 15 captures sur 15 identiques aux références | [mode grand public](docs/tests/2026-11-18-mode-visuel.md) |

Ce qui n'est pas mesuré : le taux de faux constats d'un vrai défaut sur le site d'Eugenia (aucune régression réelle n'y a été jouée par l'agent H ; les doutes de la répétition sont plantés dans une copie du vault), le parcours sur le fork, le mode grand public sur d'autres sites (#67), l'accessibilité.

## Ce qui n'est pas fait

- **Mode grand public** : moteur à un agent fusionné (#64) ; marche sur n'importe quel site à prouver (#67) ; extension Chrome et service que le jury essaie seul (#68).
- **Direction artistique** de la scène (le squelette épuré est fait, #69), page d'accueil (#70).
- **Mode dev de bout en bout** : réveil par un vrai déploiement Vercel, rapport dans Obsidian, commentaire sur la PR GitHub (#71).
- **Fork du site d'Eugenia** : en attente de l'accord de l'école ; tant qu'il n'est pas là, le changement du site est simulé dans une copie du vault.
- **Interface web** (`interface/`) : sur données factices ; la démo se joue dans la scène.
- **n8n** (C7, notification « cas à relire ») : non construit.
- **Limites connues** : le mode scripté (sans agent H) ne sait pas cliquer un lien hors de l'écran ni ouvrir le menu burger ; un clic humain dans la fenêtre de la scène passe avant les réponses automatiques ; la correction de note varie d'un appel à l'autre.

## Évolutions prévues

Après le hackathon, dans cet ordre de dépendance :

- **Plusieurs agents H en parallèle** (décision de Nathan, 18/11) : le moteur et le format `horama-exploration-1` sont prévus pour 1 à 3 agents qui se partagent les pages, mais la démo de vendredi tourne avec un seul agent. Pourquoi attendre : le plan gratuit de H plafonne à 3 sessions simultanées par organisation, et le mode à un agent doit d'abord être stable sur le banc de sites (#67).
- **Des consignes de Holo spécialisées**, une par sorte de doute (texte coupé, chevauchement, élément décalé, image déformée, contraste) au lieu d'une consigne générale, quand la base sera stable : aujourd'hui, la plupart des faux constats viennent de Holo (6 sur 8 sur eugeniaschool.com le 17/11), et une consigne ne s'affine qu'en mesurant ses faux constats sur un banc qui ne bouge plus.
- Le reste de la feuille de route (entrée « message d'un client », correction du code par Devin, autres sources de documentation et autres sorties que GitHub, accessibilité mesurée, notification par n8n) : [`docs/feuille-de-route.md`](docs/feuille-de-route.md).

## Essayer Horama

Pour le jury, sans rien installer côté serveur : le mode grand public, sur le site de votre choix. Les adresses marquées « à compléter » le seront quand le service sera en ligne (#68, #133).

**Par la page d'accueil.** Ouvrez `adresse de la page d'accueil, à compléter` (#136), collez l'adresse d'un site public dans le champ et cliquez « Envoyer Horama ».

**Par l'extension Chrome.**
1. Téléchargez `horama-extension.zip` (`lien de la release, à compléter`), puis dézippez-le.
2. Dans Chrome, ouvrez `chrome://extensions`, activez le « Mode développeur » et cliquez « Charger l'extension non empaquetée ». Choisissez le dossier dézippé.
3. Ouvrez le site à vérifier, cliquez sur l'icône Horama : l'adresse de l'onglet est déjà remplie. Cliquez « Envoyer Horama ».

Le rapport s'ouvre dans un onglet et se remplit page par page. Il montre :
- les défauts **prouvés par le code**, chacun avec sa capture marquée d'un trait rouge et sa mesure (« mesuré : … », « attendu : … ») ;
- à part, les doutes du regard de Holo, « à trancher » ;
- les pages visitées.

Le service visite 8 pages au plus. Sur le site d'Eugenia, 8 pages ont pris 212 s ([rapport](docs/tests/2026-11-18-a91-visite.md)). Un site qui bloque les robots, une page introuvable ou une connexion demandée finissent proprement, avec la raison.

Limites du service (`agent/scripts/exploration-service.mjs`, #143) :
- une exploration à la fois, 5 en file d'attente au plus ;
- 4 demandes par heure et par adresse IP, 12 par heure en tout ;
- seulement les adresses publiques en `http` ou `https`, sans identifiants.

L'agent ne remplit aucun formulaire.

**Pour l'équipe : régler l'adresse du service.** Une seule ligne, la constante `DEFAULT_SERVICE` de `extension/service.js` (aujourd'hui `http://127.0.0.1:8787`, le faux service). Une fois l'adresse réglée, `sh extension/empaqueter.sh` produit `extension/dist/horama-extension.zip` et rappelle l'adresse qu'il contient. Chaque utilisateur peut aussi la changer dans les options de l'extension. La publication du `.zip` en release GitHub attend le go de Nathan.

## Comment lancer

Prérequis : Node 22 avec exécution native de TypeScript, pnpm (version de `packageManager`), Google Chrome, shell POSIX. Pour un passage réel : `holo` (paquet `hai-agents[cli,browser]`, dans un environnement Python à part) et un `.env.local` à la racine avec `HAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN`. Les clés ne vont jamais dans Git ; `HAI_API_KEY_DEMO` est réservée à la démo.

Installer et tout vérifier (types, lint et tests sans réseau, n'appelle ni H ni la base) :

```sh
pnpm install
pnpm --dir automatisation/scene install --ignore-workspace
pnpm -r check
```

Répéter la démo du mode développeur sur le site d'Eugenia en ligne, sans agent H (gratuit, environ 60 s ; écrit dans `.orchestrateur/repetition/`, jamais dans le vault du dépôt) :

```sh
bash automatisation/demo/repetition.sh
```

Avec le vrai agent H, ajouter `--agent` (quelques centimes par parcours). Mode d'emploi, ce qu'on voit à chaque seconde et pièges : [répétition](docs/demo/2026-11-17-repetition.md). Tour complet du site en réel : commande dans le [rapport du tour](docs/tests/2026-11-17-tour-du-site-reel.md).

Voir la landing en local (les modules ES ne se chargent pas en `file://`), puis ouvrir http://127.0.0.1:4190/ :

```sh
cd accueil && python3 -m http.server 4190
```

Lancer l'interface en données factices (http://localhost:3000) et Facturo (http://localhost:3100) :

```sh
pnpm dev
```

Le coureur seul, en ligne de commande (couloir Ali) : `pnpm --filter @horama/agent passage -- --help`. Chrome doit écouter en CDP (port 9333 par défaut), lancé avec `--force-device-scale-factor=1` sur un écran Retina, sinon les clics tombent à côté. Commandes vérifiées et lectures de la base : [preuve du coureur](docs/tests/2026-11-17-readme-architecture.md).

## Pour aller plus loin

- [Règles communes aux IA de l'équipe](AGENTS.md), [plan de travail](docs/plan-de-travail.md), [avancement](docs/checklist.md), [missions](docs/missions/).
- [Feuille de route](docs/feuille-de-route.md) ; [décisions](docs/decisions/), une par fichier daté ; [rapports de test](docs/tests/), un par mesure.
- [Retours sur l'API de H](docs/retours-api-h.md).
- [Charte graphique](docs/da/charte-graphique.md) de la direction « L'envoyé » (marque, couleurs, polices, mascotte, signes de preuve).
