# Spec technique Horama : deux couloirs, deux orchestrateurs

Lundi 16 novembre 2026. Validée par Nathan (reformulation acceptée le 16/11). Cette spec fait foi pour la partie technique ; elle remplace, pour la technique, la répartition de `docs/plan-de-travail.md` (Inès passe sur la direction artistique, Leslie compare les modèles Hugging Face après coup, Nathan et Ali font toute la technique).

Produit : `docs/cadrage.md`. Règles communes aux IA : `AGENTS.md`.

---

## 1. Intention

Construire d'ici mardi 9 h 30 la boucle Horama de bout en bout sur un faux SaaS de facturation, avec deux orchestrateurs Claude Code (Fable 5.2) qui font coder Devin CLI (Fable 5.2), un chez Nathan, un chez Ali, chacun sur sa moitié. La boucle : une note du vault devient un test, un humain l'accepte, l'agent H le joue, Horama vérifie par le calcul et compare les versions (double vision), l'humain tranche, le vault se met à jour.

**Inclus.** Faux SaaS « Facturo » en versions 12 et 13 avec régressions activables ; vault du faux SaaS ; génération des tests par Hugging Face ; agent H et passages ; captures par écran ; vérification par le calcul ; comparaison des versions (côte à côte, rideau, pixels bruts, zones) ; relecture bug ou voulu ; mémoire limitée à un écart ; dérive documentaire ; app Next.js des 8 étapes ; base Supabase ; script de passage pour le banc ; n8n si un webhook existe.

**Exclu.** Le SaaS du pilote (ajouté plus tard comme second logiciel du vault) ; la question posée par l'agent pendant la session (P1) ; l'enquête de l'agent guidée par Holo pendant la session (P1 : ici, la vérification se fait après la session) ; le second lecteur (P1) ; le mobile ; la direction artistique finale (Inès, elle remplace les jetons provisoires).

---

## 2. Les deux couloirs

| | Couloir Ali (l'agent) | Couloir Nathan (la mémoire et la preuve) |
|---|---|---|
| Paquets | `agent/` (`@horama/agent`) | `faux-saas/`, `memoire/` (`@horama/memoire`), `jugement/` (`@horama/jugement`), `interface/`, `automatisation/`, contenu de `vault-horama/` |
| Fait | Définition de l'agent H `horama-testeur`, lancement des sessions (3 au plus), suivi des événements, outil `relever`, téléchargement des captures, relance des sessions muettes, coût et durée, rapport de passage, script de passage en ligne de commande, outillage du repo (lint, types, tests) | Faux SaaS déployé, vault, génération des tests, relevé des valeurs, calcul et statuts, double vision, mémoire, dérive documentaire, app des 8 étapes, n8n |
| Écrit en base | `passages`, `evenements`, `captures` (et le stockage `captures`) | `resultats`, `decisions`, `mesures`, colonne `references` |
| Lit | Les tests acceptés (C2) dans le vault, l'URL du faux SaaS | Tout ce qu'écrit Ali |
| Branche de couloir | `dev-ali` | `dev-nathan` |

**La frontière** : `contrats/` (types TypeScript et exemples) et `base/migrations/001_init.sql`. Ils sont posés avant le lancement des deux orchestrateurs, relus par Ali et Nathan, puis gelés (étiquette `contrats-v1`). Aucun orchestrateur ne les modifie seul : un besoin de changement s'écrit dans `docs/decisions/` et se règle entre Nathan et Ali.

**Fichiers de la racine** (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`) : seul le couloir Ali y touche après le gel. Chaque paquet a son propre `package.json` : ajouter une dépendance à son paquet ne touche pas la racine.

---

## 3. GitHub

- `main` : ce que voient l'équipe et le jury. Rien n'y arrive sans Nathan.
- `dev` : l'intégration. Les couloirs y arrivent par pull request (`dev-nathan` vers `dev`, `dev-ali` vers `dev`), que Nathan fusionne (`gh pr merge` est souvent refusé à Claude).
- `dev-nathan`, `dev-ali` : la branche de chaque orchestrateur. Chaque tâche de Devin part d'une branche tirée du couloir (`n3-app-maquettes`), dans son propre worktree ; l'orchestrateur relit, teste, fusionne la tâche dans son couloir (`git merge --no-ff`) et pousse le couloir. Un orchestrateur ne pousse jamais sur `dev` ni sur `main`.
- Chaque couloir récupère `dev` à chaque pull request fusionnée (`git merge origin/dev`), pour voir le travail de l'autre.
- Étiquettes : `contrats-v1`, `porte-direction`, `boucle-1-ecran`, `demo-ok-mardi`.

---

## 4. La chaîne et la capacité de chaque maillon

| N° | Maillon | Peut-il porter ce qu'attend le suivant ? | Statut |
|---|---|---|---|
| 1 | Note du vault (écran, règles, note de version) | Oui si chaque règle vérifiable porte une ligne structurée (`regle: somme | colonne: … | cible: …`). Le vault est écrit par nous pour le faux SaaS. | Tranché |
| 2 | Génération du test par Hugging Face (C1) | À prouver : un modèle ouvert doit rendre un test au format H et des règles JSON valides. | Test T4 |
| 3 | Acceptation humaine, test écrit dans le vault (C2) | Oui : format fixe, écrit par `@horama/memoire`. | Tranché |
| 4 | Session H sur le faux SaaS | Oui pour naviguer (mesuré le 7-8/11 sur d'autres sites). Taille d'écran fixée par l'environnement de l'agent (`environments`, `width`, `height`, `start_url` : doc H, lue le 16/11). | T1 |
| 5 | Capture et texte de chaque écran (C3) | Doc H, lue le 16/11 : chaque `observation_event` porte `image` (URL servie par H, à télécharger avec la clé), `viewport_size`, `scroll_position`, et `metadata.text` (la page visible en Markdown), **vide sauf si l'environnement de l'agent fixe `markdown: true`** : réglage obligatoire. L'agent appelle `relever(ecran, vue)` sur chaque écran du test ; la dernière observation avant l'appel est la capture, **acceptée seulement si `metadata.url` correspond à l'écran** (sinon `INCONCLUSIVE`). L'outil peut être exécuté plus d'une fois : écriture par upsert sur (passage, test, écran, vue). | T1, T5 |
| 6 | Relevé des valeurs | À prouver : le texte de la page contient-il les montants et les dates du tableau ? Sinon, Holo lit l'image. | T2 |
| 7 | Calcul et statut (C4) | Oui une fois les valeurs relevées : somme, égalité entre écrans, filtre, format, présence, en code. | Tranché |
| 8 | Double vision : capture de référence (v12) contre capture testée (v13), même écran **et même vue** | Exige des captures de même taille, en haut de page, sur des données identiques, dans le même état de l'écran. Une **vue** nomme cet état (`defaut` = sans filtre, en haut de page ; `filtre-echeance`…). La double vision ne compare que des captures de même (écran, vue) ; une vue sans référence (le filtre n'existe pas en v12) n'est pas comparée, elle est seulement vérifiée par ses règles. Le faux SaaS fixe la date du jour (`FACTURO_TODAY=2026-11-18`), n'a ni survol ni focus visible au chargement, et tient sans défilement dans 1280 × 900. Les zones d'écart : Holo à prouver. | T1, T3 |
| 9 | Relecture humaine (C5), mémoire, dérive documentaire | Oui : écrit par `@horama/memoire` dans le vault, règles du cadrage section 10. | Tranché |
| 10 | Mesure du succès (banc) | Exige une comparaison à la règle triviale (voir section 6). | Tranché |

**Simplification assumée.** Dans le cadrage, l'outil `relever` renvoie à l'agent ce qu'il doit regarder ensuite. Ici, `relever` enregistre seulement la capture et répond « continue » ; la vérification se fait après la session. Les deux couloirs ne dépendent ainsi que de la base. L'enquête guidée passe en P1.

**Processus.** Les outils personnalisés de H ne sont servis que tant que le programme qui suit la session tourne. Le passage tourne donc dans un processus Node détaché (le script du couloir Ali, `passage`), lancé par l'app ou à la main, qui écrit tout en base. Le couloir Nathan déclenche la vérification quand `passages.etat` passe à `joue`, et écrit lui-même `verifie` (seule écriture du couloir Nathan dans une table du couloir Ali).

**Mémoire et références.** Une décision « voulu » neutralise un écart précis (écran, vue, zone, version) : au passage suivant, l'écart qui recouvre la zone est marqué `PASS` avec l'identifiant de la décision. La référence d'un écran ne change jamais automatiquement : c'est un geste explicite (« Valider v13 comme référence »), possible seulement si tous les écarts de l'écran sont tranchés et qu'aucun n'est un bug (F32). Le retest de démonstration se fait donc contre la référence v12, la décision faisant le tri : c'est bien la mémoire qui est testée.

---

## 5. Registre des faits

| Fait | Statut | Source ou voie de vérification |
|---|---|---|
| La branche `dev` existe sur le repo | OBSERVÉ | `gh api …/branches`, 16/11 |
| Devin CLI 3000.12.57 installé chez Nathan, modèles `claude-fable-5-2-*` disponibles, mode `-p` non interactif, `--prompt-file`, `--export`, `--permission-mode` | OBSERVÉ | `devin --help`, `devin models`, 16/11 |
| Vercel connecté chez Nathan (`solanathouu`), GitHub connecté | OBSERVÉ | `vercel whoami`, `gh auth status`, 16/11 |
| Supabase CLI et `psql` absents chez Nathan ; Node 26 et pnpm présents | OBSERVÉ | `which`, 16/11 |
| Chromium de Playwright 1243 en cache ; Google Chrome installé | OBSERVÉ | `~/Library/Caches/ms-playwright`, 16/11 |
| Capture et texte de page dans `observation_event` (texte seulement avec `markdown: true` dans le mode de l'environnement) ; taille d'écran et URL de départ dans `environments` de l'agent ; format de réponse par `overrides.agent.answer_format` ; `queue: false` renvoie 429 à la limite ; outils personnalisés exécutés « au moins une fois » et servis seulement tant que le programme suit la session ; coût des métriques parfois `null` | OBSERVÉ (doc) | hub.hcompany.ai, pages `event-object`, `sessions/create`, `sessions/resources`, `custom-tools`, `sessions/changes`, lues le 16/11 ; à confirmer par T1 |
| Une session figée garde sa place dans le quota de 3 | SUPPOSÉ (cohérent avec la mesure du 8/11 : 3 sessions figées ont bloqué le compte) | T1 |
| 3 sessions simultanées par organisation, sessions figées (3 sur 17), 8 à 10 s par étape, environ 0,05 $ par session de 14 à 19 étapes | MESURÉ | 7 et 8/11, autres sites (`h-company-agents-api` du vault de Nathan) |
| Le lien `agent_view_url` exige une connexion à la plateforme H (pas d'iframe) | OBSERVÉ | 7/11 |
| Clé H, token Hugging Face, projet Supabase prêts chez Nathan | DIT (Nathan, 16/11) | T0 : un appel réel par clé, le script n'affiche que le code HTTP |
| Ali a Claude Code avec Fable et Devin CLI | DIT (Nathan, 16/11) | T0 du couloir Ali |
| La Models API Holo accepte la même clé H | SUPPOSÉ | T3 |
| Les captures de H ne montrent pas le curseur et restent téléchargeables après la fin de la session | SUPPOSÉ | T1 |
| Devin en mode `-p` avec `--permission-mode dangerous` peut être lancé par l'orchestrateur sans refus et rend la main | SUPPOSÉ | T6 |
| Un mentor H accepte qu'on construise autour de leur démo QA | OBSERVÉ | message reçu par Nathan, 16/11 |

---

## 6. Ordres de grandeur

- **Passage de démo** : 3 écrans, 5 tests de 8 à 10 étapes, 3 sessions en parallèle : 2 vagues de 70 à 100 s, soit 3 à 4 min et environ 0,25 $ (à mesurer).
- **Test en direct** : 1 écran, 6 à 8 étapes : 50 à 80 s, sous la limite de 90 s du cadrage si le départ est rapide (à mesurer, médiane sur 5).
- **Banc** : environ 15 cas (10 régressions, 5 changements voulus) joués 2 fois : 30 sessions, environ 1,5 $ et 20 min.
- **Holo** : 2 images par comparaison, quelques milliers de jetons : négligeable devant les sessions.
- **Hugging Face** : environ 2 000 jetons par test généré : négligeable devant les 50 € de crédits.
- **Devin** : pour mémoire, 5 sessions de recherche sur Fable 5.2 High ont pris 29 % du quota hebdomadaire Max de Nathan (novembre), une vague de 10 vidéos 17 %. Deux couloirs complets peuvent prendre une part comparable. Règle : l'orchestrateur relit le quota avant chaque tâche et s'arrête si moins de 20 % restent.
- **Sessions figées** : 3 sur 17 le 8/11. Sur un passage de 5 sessions, la chance qu'aucune ne gèle est d'environ 0,82^5, soit 37 % : « 3 passages de suite sans relance » n'est pas acquis. D'où `queue: false`, `max_time_s` court (180 s par test), abandon à 45 s sans action et une relance ; un passage réussi est un passage où chaque test finit, relance comprise.
- **Test en direct** : la connexion coûte 3 à 4 étapes (30 à 40 s). Le faux SaaS a donc une entrée déjà authentifiée (section 8) ; le test en direct ne passe pas par le formulaire.
- **Preuve** : une réussite prouve un cas, pas un taux. Chaque critère se tient sur 3 passages de suite. Au banc, `SUSPECTED` et `VERIFIED_FAIL` comptent comme alertes ; le rappel porte sur **toutes** les régressions (de règles et visuelles) ; la précision sur les alertes. Trois références triviales, sur les mêmes cas : (1) « tout écran dont les pixels diffèrent est un défaut » ; (2) la même, après masquage des zones déjà validées comme voulues ; (3) « rien n'est un défaut ». Si Horama ne bat pas (2) en précision à rappel égal, Holo n'apporte rien et on le dit. Avec 5 changements voulus joués 2 fois, la précision repose sur 10 cas négatifs : le chiffre se donne avec ses effectifs, pas en pourcentage seul.

---

## 7. Tests de faisabilité (à passer avant de construire dessus)

| N° | Couloir | Test | Go | Sinon |
|---|---|---|---|---|
| T0 | Les deux | Chaque clé répond (H, Hugging Face, Supabase, Vercel) | 4 codes HTTP 200 | Nathan ou Ali recolle la clé ; rien ne démarre avant |
| T6 | Les deux | L'orchestrateur lance Devin en `-p` dans un worktree, Devin crée un fichier et rend la main | Fichier créé, sortie 0, en moins de 5 min | Pilotage interactif de Devin dans un onglet Ghostty (voir prompt) |
| T1 | Ali | Session H sur le faux SaaS (agent à 1280 × 900, `markdown: true`, URL de départ) ; captures téléchargées, texte de page non vide ; **deux sessions v12 sur le même écran et la même vue donnent 0 zone de différence** au-dessus du seuil de bruit fixé par le couloir Nathan ; on observe aussi si une session abandonnée garde sa place dans le quota | 3 sur 3 | Le noter dans `docs/retours-api-h.md`, question aux mentors H ; si les images diffèrent, chercher la cause (survol, focus, compression) dans le faux SaaS avant tout |
| T5 | Ali | L'agent appelle `relever(ecran, vue)` sur 2 écrans, la session attend, la réponse la relance ; un appel exécuté deux fois ne crée pas de doublon | 3 sur 3 | Captures prises par écran d'après l'URL de l'observation (`metadata.url`) |
| T2 | Nathan | Le texte de la page (`metadata.text`) contient les 4 montants, les 4 échéances et le total de la liste | 3 sur 3 | Relevé par Holo sur l'image, température 0 |
| T3 | Nathan | Holo, avec les captures v12 et v13 de la liste, nomme le bouton Exporter déplacé et donne une zone dont le centre est à moins de 40 px de la vraie (la vérité vient des positions mesurées dans le faux SaaS) | 3 sur 3 | Zones calculées par la différence de pixels (regroupement), Holo décrit et trie chaque zone |
| T4 | Nathan | Deux modèles Hugging Face écrivent les tests de 3 notes : format C1 valide, règles justes, temps de réponse mesuré. L'en-tête du test et la phrase finale qui demande `relever` sont ajoutés par le code, jamais par le modèle | 3 sur 3 pour un modèle, temps de réponse médian sous 10 s | Gabarit fixe, le modèle remplit les cases ; si trop lent, test pré-généré affiché comme tel |

Les sondes de T2 et T3 lancent elles-mêmes une session H minimale (script jetable `jugement/scripts/sonde-h.ts`) pour ne pas attendre le couloir Ali.

---

## 8. Le faux SaaS « Facturo »

- Application Next.js dans `faux-saas/`, déployée sur Vercel (projet à part), URL publique (le navigateur cloud de H en a besoin). Présentée au jury comme une application de démonstration.
- Connexion factice (`/login`, identifiants de démo dans les variables d'environnement) et **entrée déjà authentifiée** `/v13/entrer?suite=/v13/factures` (pose le cookie de démo et redirige, sans formulaire) : c'est l'URL de départ des tests, pour tenir le test en direct sous 90 s. Puis 3 écrans : `tableau-de-bord`, `liste-des-factures`, `detail-facture/[numero]`.
- Version par chemin : `/v12/…` et `/v13/…`. Régressions activables par paramètre : `?r=ca-mois,filtre-echeance`. La v13 active par défaut ses trois changements : CA du mois faux (bug), filtre « Échéance dépassée » qui laisse passer une facture non échue (bug), bouton Exporter en haut à droite (voulu).
- Date du jour fixée (`FACTURO_TODAY=2026-11-18`), aucune donnée aléatoire, aucune animation : deux visites de la même page donnent la même image.
- Tout tient dans 1280 × 900 sans défilement.
- Données (factices) : F-118, Atelier Brun, 320,00 €, échéance 05/11 ; F-119, Studio Lune, 480,00 €, 12/11 ; F-120, Café Mira, 180,00 €, 30/11 ; F-121, Garage Vélo, 440,00 €, 10/11. Total 1 420,00 €. CA du mois v12 : 1 420,00 € ; v13 : 1 240,00 €.
- Catalogue `faux-saas/regressions.ts` : environ 10 régressions (dont 3 entre écrans : CA du mois, total du détail différent du montant de la liste, nombre de factures du tableau de bord) et 5 changements voulus (dont 2 qui contredisent la doc : bouton déplacé, colonne renommée). Chacun a un identifiant et sa vérité écrite (`faux-saas/verite.json` : écran, nature, règle touchée, bug ou voulu).
- `faux-saas/positions.json` : les zones réelles des éléments qui bougent, mesurées par un script Playwright (Chrome installé, `channel: "chrome"`), pour T3 et le banc.

**Garde-fou de mesure (compromis assumé).** Le couloir Nathan code à la fois les régressions et la vérification. Pour que le banc reste honnête, le choix des cas joués au banc final est fait à l'aveugle par une autre personne (Leslie ou Noé), parmi le catalogue, et la vérification n'est pas retouchée après ce tirage.

---

## 9. Le vault

```
vault-horama/
  facturo/
    produit/
      _regles-communes.md
      tableau-de-bord.md
      liste-des-factures.md
      detail-facture.md
      regles-entre-ecrans.md
    notes-de-version/
      v13.md
    tests/                (C2, écrits à l'acceptation ; 3 tests écrits à la main dès le départ pour le couloir Ali)
    decisions/
    references/
      <ecran>/<vue>--v12.png   (et la ligne correspondante en base, table references_ecran)
    passages/
```

Notes au format du cadrage (section 10). Une règle vérifiable porte sa ligne structurée. Le vault s'ouvre dans Obsidian sans plugin. Un second logiciel (le pilote) s'ajoute comme un dossier frère de `facturo/`.

---

## 10. Base Supabase

Schéma : `base/migrations/001_init.sql` (frontière, gelé). Tables `passages`, `evenements`, `captures`, `resultats`, `decisions`, `mesures`, `references_ecran` ; stockage `captures`. RLS activée partout : lecture publique (la version Vercel du jury lit), écriture seulement par la clé de service, utilisée côté serveur en local. Sans `psql` ni CLI Supabase, la migration s'applique par un script Node (`base/appliquer.mjs`, paquet `postgres`, variable `SUPABASE_DB_URL`) ou par Nathan dans l'éditeur SQL.

---

## 11. L'app Horama (`interface/`)

Next.js (App Router, TypeScript). En local pour la démo (elle écrit dans le vault et lance les passages) ; sur Vercel en lecture pour le jury.

| Étape | Route | Écran du cadrage |
|---|---|---|
| 1 | `/` | 11.1 Accueil et couverture |
| 2-3 | `/notes/[logiciel]/[version]` | 11.2 De la note au test |
| 4 | `/passages/[id]/direct` | 11.3 Passage en direct |
| 5 | `/passages/[id]/comparaison/[ecran]` | 11.5 Comparaison des versions |
| 6 | `/relecture` | 11.6 Relecture et escalade |
| 7 | `/derive` | 11.7 Dérive documentaire |
| 8 | `/passages/[id]` | 11.4 Rapport et retest |

- Un panneau discret « Vault » liste les derniers fichiers écrits dans le vault (le jour de la démo, Obsidian est ouvert à gauche).
- `USE_MOCKS=1` : tout tourne sur les exemples de `contrats/exemples/`.
- Jetons de couleur provisoires dans `interface/app/tokens.css` (crème `#F2EEE5`, graphite `#232629`, lime `#C9EE63` conforme, corail `#FF6E57` défaut, jaune `#F4DF73` à trancher) : Inès les remplace. Composants standard, une seule signature : la même règle surlignée de la même couleur dans la note, le test et le rapport. Pas d'animation qui cache la lenteur de l'agent ; valeurs et écarts lisibles de loin.
- Le passage se lance depuis l'app en démarrant le script de passage du couloir Ali **en processus détaché** ; l'app suit la base (fil en direct) et lance `verifierPassage` quand `passages.etat` vaut `joue`. Tant que `dev-ali` n'a pas livré, le couloir Nathan utilise sa propre version factice du coureur (rejoue un passage enregistré dans la base).

---

## 12. Tests d'acceptation (fin de la spec)

1. Une note de version v13 produit 2 tests proposés au format C1, acceptés, écrits dans le vault : 3 fois sur 3.
2. Un passage v13 joue les tests acceptés sur les 3 écrans ; chaque écran a sa capture et son texte en base : 3 passages de suite.
3. La règle entre écrans (CA du mois = total de la liste) sort en `VERIFIED_FAIL`, valeurs et calcul affichés : 3 sur 3.
4. Le bouton déplacé sort en `SUSPECTED`, zone entourée ; « C'est voulu » crée la décision, propose la correction de `liste-des-factures.md`, l'accepter modifie le fichier : 3 sur 3.
5. Retest **contre la référence v12** : le bouton validé sort en `PASS` avec l'identifiant de la décision qui l'a neutralisé ; une régression ajoutée sur le même écran (`?r=total-liste`) reste détectée : 3 sur 3.
6. La vue « pixels bruts » affiche le nombre de zones calculé, Horama n'en garde que les écarts qui comptent.
7. Durée et coût de chaque passage affichés, issus des métriques de H ; un coût « inconnu » compte comme un échec du critère.
8. Le banc sort rappel, précision, fausses alertes avec leurs effectifs, et la comparaison aux trois références triviales (section 6).

---

## 13. Intégration de nuit et ce qui saute en premier

- **Sans attendre les fusions** : chaque couloir peut fusionner en local, dans un worktree jetable, la branche de l'autre (`origin/dev-ali` ou `origin/dev-nathan`) pour tester l'assemblage. Rien n'est poussé depuis ce worktree.
- **Heure d'intégration** : mardi 8 h, Nathan et Ali fusionnent les PR ouvertes dans `dev`, puis l'orchestrateur de Nathan joue les tests d'acceptation sur `dev` et étiquette `demo-ok-mardi`.
- **Si le temps ou le quota manque, on coupe dans cet ordre** : n8n ; banc (garder un rapport sur 3 cas) ; rideau (garder côte à côte et pixels bruts) ; deuxième modèle Hugging Face ; écran d'accueil et couverture ; zones par Holo (garder le repli par regroupement de pixels). On ne coupe jamais : faux SaaS, vault, génération, passage avec captures, calcul entre écrans, relecture, dérive documentaire.

## 14. Retour arrière et exploitation

- Toute tâche de Devin vit sur sa branche : une tâche ratée se jette sans toucher au couloir.
- Chaque étape franchie reçoit une étiquette ; `dev` et `main` ne bougent que par Nathan.
- Clés dans `.env.local` (jamais dans le repo ni affichées) ; clé H de démo réservée à la démo.
- Captures de progression : `docs/captures/AAAA-MM-JJ-<etape>/`, avec une planche HTML ouverte dans Chrome à chaque porte.
- Journal de chaque couloir : `docs/journal-nathan.md`, `docs/journal-ali.md` (ce qui est fait, testé, bloqué, décidé, avec l'heure).

---

## 15. Questions ouvertes (aucune ne bloque le départ)

- L'URL n8n existe-t-elle ? Sinon la notification passe en dernier et peut sauter.
- La version Vercel du jury lit-elle Supabase directement ou un export figé des passages ? À trancher jeudi.
- Le SaaS du pilote : dossier frère dans le vault quand la doc arrive.
