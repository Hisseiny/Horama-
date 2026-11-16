# Horama : document de cadrage (V3)

Hackathon Eugenia « Build The Future », du 16 au 20 novembre 2026. Équipe 11.

Version 3 du lundi 16 novembre. Horama vient du grec ancien et signifie « ce qui est vu ». Repo de l'équipe (privé) : https://github.com/Hisseiny/Horama-

**Ce qui change par rapport à la V2.**

- **On assume que H a déjà un outil de QA** (son dépôt officiel, sous licence MIT) et on construit ce qui lui manque, au lieu de le refaire.
- **Le cœur devient : « Votre documentation devient vos tests. »** Horama lit la connaissance de l'équipe (documentation produit, règles métier, notes de version) dans un vault Obsidian, écrit les tests au format de H, les fait valider par un humain, les fait jouer par l'agent H, et garde le vault et les tests synchronisés.
- **Nouveau : la dérive documentaire.** Quand un humain valide un changement voulu qui contredit la documentation, Horama propose la mise à jour de la note. La documentation reste vraie.
- **Hugging Face** écrit les tests (modèle de langage open source) ; le second lecteur passe en P1.
- **Ce qui reste de la V2** : 4 statuts, preuve par le calcul, validation limitée à un écart, comparaison des versions, escalade humaine, benchmark rigoureux.
- **Nouveau : la liste complète des fonctionnalités, les écrans du produit, et une chorégraphie de démo pensée pour être fluide.**

---

## 0. L'essentiel en 2 minutes

**Horama en une phrase.** Horama transforme ce que votre équipe sait déjà (documentation, règles métier, notes de version) en tests qu'un agent IA joue sur votre vrai logiciel à chaque livraison, prouve ce qu'il signale, consulte un humain quand il doute, et garde documentation et tests à jour l'une par rapport à l'autre.

**Slogan.** Votre documentation devient vos tests.

**Le pitch face à H.** « Vous avez montré qu'un agent sait jouer un test écrit en Markdown. Le problème, c'est que quelqu'un doit écrire et maintenir chaque test. Horama les écrit à partir de ce que l'équipe sait déjà, et les tient à jour à chaque livraison. »

**Ce que le jury verra vendredi.**

1. Un vault Obsidian avec la documentation du SaaS pilote.
2. On écrit en direct une note de version : « Nouveau filtre Échéance dépassée ».
3. Horama propose le test correspondant en quelques secondes ; un humain le valide d'un clic.
4. L'agent H le joue sur le vrai logiciel ; on voit chaque étape et chaque capture.
5. Le test révèle un bug, prouvé par les valeurs relevées.
6. Le passage complet (lancé avant le pitch) montre une incohérence entre deux écrans que personne n'avait testée, et un bouton déplacé.
7. La vue de comparaison : la comparaison de pixels voit rouge partout, Horama ne montre que 2 écarts expliqués.
8. L'humain dit « voulu » pour le bouton ; Horama propose de corriger la documentation ; la note change dans Obsidian sous nos yeux.

**Les 5 choses à retenir.**

1. Le jury (ingénieurs H Company, Vercel, Eugenia) note un agent qui tourne en live sur un vrai cas, avec des résultats chiffrés.
2. On ne cache pas l'outil QA de H : on le cite et on le prolonge. Le brief le demande presque : « Vous construisez aussi pour H Company. »
3. Notre différence tient en une phrase : les tests ne s'écrivent plus à la main, et ils ne pourrissent plus.
4. L'humain valide les tests écrits, tranche les doutes, et chaque décision met à jour le vault.
5. Une démo fluide : tout ce qui est long est lancé avant, tout ce qui est en direct dure moins de 90 secondes, et chaque étape a sa vidéo de secours.

---

## 1. Le hackathon : ce qu'on nous demande

**Le défi.** Créer en 4 jours une startup autour d'agents IA qui se servent d'un ordinateur comme un humain, avec l'Agent API de H Company. Stack obligatoire : H Company, Hugging Face (50 € de crédits), GitHub. Partenaires : H Company, Vercel, Hugging Face. Jury : H Company, Vercel, Eugenia.

**Notre posture (brief).** Une équipe de fondateurs. À chaque décision : « Est-ce qu'un vrai utilisateur paierait ou changerait ses habitudes pour ça ? »

**Les critères de notation.**

| Poids | Critère |
|---|---|
| 25 % | Pertinence et impact |
| 30 % | Excellence technique et usage de l'Agents API |
| 25 % | Faisabilité, adoption, apprentissages |
| 20 % | UX, démo et pitch |

**Les livrables.**

| Quand | Quoi |
|---|---|
| Lundi avant 17 h | Validation d'idée : nom et slogan, problème, solution en une phrase, personae, stack, rôles |
| Mardi 11 h et 15 h | Points techniques avec H Company (CTO) |
| Mercredi avant 17 h | Parcours utilisateur, architecture, Loom de 2 min, roadmap jusqu'à jeudi |
| Jeudi après-midi | Point business (CEO) |
| Vendredi avant 11 h | Prototype en live ; fiche et repo GitHub (problème, solution, stack, architecture, lien, comment tester) ; vidéo démo de 5 min |
| Vendredi avant 15 h | Deck de 8 à 12 slides : problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run |
| Vendredi après-midi | Top 6 : pitch de 6 min et 4 min de questions |
| Chaque soir, 17 h à 9 h | Peer review dans l'équipe |

**Les pièges des éditions précédentes et notre parade.**

| Piège | Notre parade |
|---|---|
| Idée trop large | Une capacité : de la documentation aux tests joués, sur un SaaS, sur ordinateur |
| Sur-concevoir | P0 = une boucle complète, critères de réussite écrits (section 7) |
| Projet IA sans agent | L'agent H joue chaque test, navigue entre les écrans, relève et enquête |
| Slides sans prototype | Démo live sur le SaaS pilote, vidéo de secours par étape |
| Ne pas mesurer | Protocole de benchmark (section 15) |
| Support sans diagnostic | On va voir les mentors avec le bug, ce qu'on a testé et une capture |
| Liens inaccessibles | Contrôle vendredi matin en fenêtre privée |

---

## 2. Le problème

Un éditeur de SaaS B2B sait énormément de choses sur son produit : comment chaque écran doit se comporter, quelles règles métier s'appliquent (un total, un statut, une échéance), ce qui change à chaque version. Ce savoir est écrit quelque part : documentation produit, spécifications, notes de version, tickets.

Mais les tests, eux, sont écrits à part, à la main, par des développeurs. Résultat :

- **Les tests ne couvrent que ce que quelqu'un a pensé à tester.** Une règle écrite dans la documentation (« le CA du mois du tableau de bord égale le total des factures du mois ») n'est vérifiée par aucun test.
- **Chaque nouveauté demande un test de plus**, que personne n'a le temps d'écrire avant la livraison.
- **Les tests et la documentation divergent.** Une refonte change l'interface : les tests cassent, la documentation devient fausse, et personne ne sait lequel croire.
- **Les petites équipes n'ont pas de testeur dédié** : la recette se fait à la main, vite, avant chaque livraison.

Les agents de QA (dont celui de H) savent **jouer** un test écrit en langage naturel. Ils ne règlent pas le problème de fond : **qui écrit les tests, et qui les tient à jour ?**

**Chiffres du client pilote, à recueillir cette semaine (CEO).** Le temps passé en recette avant une livraison. Le nombre de bugs arrivés chez des clients ces derniers mois, avec un ou deux exemples. Où vit leur documentation et leurs notes de version. Ce que couvre leur suite de tests. On n'invente aucun chiffre.

---

## 3. Ce que H fait déjà, et ce qu'Horama ajoute

**Ce qu'on a lu dans le dépôt officiel de H** (`hcompai/agents-api-demos`, licence MIT) :

- `examples/software_qa` : des tests écrits à la main en Markdown (`qa/*.md` : contexte, étapes, résultat attendu, règles « FAIL if… »), joués par l'agent H depuis Claude Code, qui corrige ensuite le code et rejoue le test. Des régressions injectées par un paramètre d'URL pour la démo.
- `examples/qa` : un agent relecteur générique (`qa-cli review`) qui rend un verdict pass, warning ou fail, avec des constats classés par gravité (utilisabilité, accessibilité, liens cassés, erreurs de la console, contenu faux).
- Des skills chargées depuis des fichiers Markdown.

**Ce qu'Horama reprend (en le citant).** Le format de test en Markdown de H, la façon de rédiger la tâche de l'agent, les régressions injectées pour la démo.

**Ce qu'Horama ajoute.**

| Fonction | Outil QA de H | Horama |
|---|---|---|
| Qui écrit les tests | Un développeur, à la main | Horama, à partir de la documentation, validé par un humain |
| Nouveauté livrée | Quelqu'un doit écrire le test | La note de version génère le test |
| Documentation et tests | Séparés | Synchronisés dans les deux sens |
| Comparaison avec la version précédente | Non | Oui, écran par écran, avec zones et valeurs |
| Bug ou changement voulu | Non | Tri humain, limité à un écart |
| Mémoire d'un passage à l'autre | Non (chaque passage repart de zéro) | Oui (décisions, historique) |
| Preuve | Jugement de l'agent | Valeurs relevées et calcul en code |
| Cohérence entre écrans | Si quelqu'un l'a écrite | Règles tirées de la documentation |
| Interface pour non-codeurs | Non (tout passe par Claude Code) | Oui |
| Correction du code | Oui (Claude Code) | Non (hors périmètre ; possible en sortie vers leur boucle) |

**Comment on le dit au jury.** « On a lu votre démo QA. Elle prouve qu'un agent sait jouer un test. On a construit ce qui manque pour qu'une équipe s'en serve chaque semaine : les tests qui s'écrivent depuis la documentation, et qui ne pourrissent pas. Nos tests sont au format de votre démo : ils peuvent repartir dans votre boucle Claude Code. »

---

## 4. La proposition de valeur

**Horama couvre ce que personne n'avait testé, sans que personne ait à écrire les tests, et garde documentation et tests vrais à chaque livraison.**

Ce qui rend Horama difficile à reproduire avec un agent de QA générique :

1. **La documentation comme source des tests** : chaque règle écrite devient un test joué.
2. **La synchronisation dans les deux sens** : une note change, le test change ; l'écran change pour de bon, la note est corrigée.
3. **La preuve** : un défaut n'est affirmé que si les valeurs relevées et le calcul le confirment.
4. **La mémoire des décisions** : chaque validation humaine est gardée, avec sa portée exacte, sans jamais masquer une nouvelle régression.

**Ce qu'on assume.** Un agent est plus lent et plus cher qu'un test Playwright. Horama ne remplace pas les tests unitaires : il couvre ce que la documentation dit et que personne n'avait transformé en test.

---

## 5. La boucle Horama

| Étape | Qui | Ce qui se passe |
|---|---|---|
| 1. Connaître | Vault Obsidian | La documentation, les règles métier et les notes de version vivent dans le vault |
| 2. Écrire | Hugging Face (modèle de langage) | Horama rédige les tests au format de H à partir des notes ; il signale ce qui est ambigu |
| 3. Valider | Humain | Accepte, corrige ou refuse chaque test proposé, d'un clic |
| 4. Jouer | Agent H | Se connecte, navigue, applique les filtres, ouvre les détails, capture chaque étape |
| 5. Vérifier | Holo et code | Compare à la version précédente, relève les valeurs, recalcule (somme, égalité entre écrans, filtre, format) |
| 6. Faire relire | Humain | Ne voit que les cas suspects et les défauts prouvés, avec les preuves ; tranche |
| 7. Synchroniser | Horama | La décision est gardée ; si elle contredit la documentation, Horama propose la correction de la note |

```
   VAULT OBSIDIAN (documentation, règles, notes de version)
            |                                   ^
            v                                   |
   2. ÉCRIRE les tests (format H)        7. SYNCHRONISER
            |                            (correction de la note proposée)
            v                                   ^
   3. VALIDER (humain, un clic)                 |
            |                                   |
            v                                   |
   4. JOUER (agent H, captures)                 |
            |                                   |
            v                                   |
   5. VÉRIFIER (comparaison des versions, relevés, calcul)
            |                                   |
   +--------+---------+----------------+--------+--------+
   |                  |                |                 |
 CONFORME          SUSPECT       DÉFAUT PROUVÉ     NON CONCLUANT
   |                  |                |                 |
   |                  +-------+--------+          rapport technique
   |                          v
   |               6. FAIRE RELIRE : bug ou voulu ?
   |                          |
   +--------------------------+----> mémoire, historique, vault
```

---

## 6. Toutes les fonctionnalités

Chaque fonctionnalité a sa priorité : **P0** (indispensable vendredi), **P1** (si le P0 tient ses critères), **P2** (roadmap du pitch, pas de code).

### 6.1 Connaître : le vault

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F1 | Connexion d'un vault Obsidian (un dossier Markdown versionné dans Git) | P0 |
| F2 | Structure de vault proposée : produit, écrans, règles, notes de version, tests, passages, décisions (section 10) | P0 |
| F3 | Lecture des notes d'écran et des règles métier en clair, avec un bloc structuré pour les règles vérifiables par le calcul | P0 |
| F4 | Détection des notes modifiées depuis le dernier passage (différence Git) | P1 |
| F5 | Import d'autres sources : export Notion, page de documentation, ticket support | P2 (ticket support en P1 si le temps le permet) |

### 6.2 Écrire : la génération des tests

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F6 | Génération d'un test au format de H (contexte, étapes, résultat attendu, règles « FAIL if », règles calculables) à partir d'une note d'écran, d'une règle ou d'une note de version | P0 |
| F7 | Questions sur l'ambiguïté : quand la documentation est floue (« le total inclut-il la TVA ? »), le test n'est pas écrit au hasard, la question part à l'humain | P0 |
| F8 | Régénération ciblée : une note modifiée régénère seulement ses tests | P1 |
| F9 | Carte de couverture : quelles notes et quelles règles ont un test, lesquelles n'en ont pas | P1 |

### 6.3 Valider : l'humain approuve les tests

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F10 | Revue d'un test proposé : la note source à gauche, le test à droite, la règle surlignée dans les deux ; boutons Accepter, Modifier, Refuser | P0 |
| F11 | Un test accepté est écrit dans le vault (`tests/`) et versionné | P0 |

### 6.4 Jouer : l'agent H

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F12 | Passage : l'agent H se connecte au SaaS (compte de test), joue les tests acceptés, navigue entre les écrans, applique les filtres, ouvre les détails | P0 |
| F13 | Fil en direct : chaque étape de l'agent s'affiche avec son heure, son action et sa capture d'écran, au fur et à mesure | P0 |
| F14 | Capture de chaque écran vérifié, rangée par passage et par version | P0 |
| F15 | Replay public de chaque session H (lien sans compte) | P0 |
| F16 | Relance automatique d'une session muette ou figée (abandon après 40 à 45 s, une relance) | P0 |
| F17 | Lancement manuel (bouton), puis automatique à chaque livraison (webhook GitHub ou Vercel) ou planifié la nuit | Manuel P0, automatique P1 |

### 6.5 Vérifier : comparaison des versions et preuve

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F18 | Comparaison des versions : écran de la version précédente validée et écran de la version testée, côte à côte | P0 |
| F19 | Rideau avant / après : un curseur qu'on fait glisser sur l'image pour passer d'une version à l'autre | P0 |
| F20 | Zones d'écart entourées sur la capture (localisation d'élément de Holo) | P0 |
| F21 | Tableau des valeurs relevées : version précédente, version testée, attendu selon la règle | P0 |
| F22 | Vérification par le calcul : somme, égalité entre deux écrans, filtre et statut, format, présence | P0 |
| F23 | Vue « ce qu'aurait vu une comparaison de pixels » : la différence brute en rouge, pour montrer le bruit qu'Horama évite | P0 (petit script) |
| F24 | Second lecteur indépendant des valeurs (modèle de vision Hugging Face) | P1 |
| F25 | 4 statuts : conforme, suspect, défaut prouvé, non concluant (section 8) | P0 |

### 6.6 Faire relire : les escalades vers l'humain

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F26 | File de relecture : uniquement les cas qui demandent un humain, le plus grave d'abord | P0 |
| F27 | Décision « bug » ou « voulu » en un clic, avec un « pourquoi » facultatif | P0 |
| F28 | Notification quand des cas attendent (e-mail ou Slack, par n8n) | P0 (minimal) |
| F29 | Question posée par l'agent pendant la session (il attend la réponse avant de continuer) | P1 |
| F30 | Issue GitHub créée pour un bug confirmé, avec captures et replay | P1 |

Les 5 types d'escalade sont détaillés en section 9.

### 6.7 Retenir et synchroniser

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F31 | Mémoire des décisions limitée à un écart (écran, zone, description, version) | P0 |
| F32 | Référence d'écran mise à jour seulement quand tous ses écarts sont tranchés et qu'aucun n'est un bug | P0 |
| F33 | Dérive documentaire : un « voulu » qui contredit une note déclenche une proposition de correction de la note, que l'humain accepte d'un clic | P0 |
| F34 | Retest : au passage suivant, l'écart validé ne revient plus, tout le reste est vérifié | P0 |
| F35 | Historique par écran et par règle (quand ça a cassé, qui a tranché) | P1 |

### 6.8 Rapports et mesures

| N° | Fonctionnalité | Priorité |
|---|---|---|
| F36 | Rapport de passage : version, tests joués, statuts, durée, coût, liens de replay ; écrit aussi comme note dans le vault | P0 |
| F37 | Base de mesures (Supabase ou Sheets) et notebook Pandas pour les chiffres du deck | P0 |
| F38 | Tableau de bord des mesures du banc (rappel, précision, charge humaine, durée, coût) | P1 |
| F39 | Export des tests au format de H pour la boucle Claude Code de leur démo | P1 |

### 6.9 Roadmap (P2, pour le pitch)

- Mobile.
- Permissions : jouer les mêmes tests avec plusieurs comptes de test aux droits différents.
- Sources supplémentaires : Notion, Confluence, tickets support (reproduire un bug signalé par un client et en faire un test).
- Plusieurs SaaS, plusieurs clients ; tendances (écrans et règles les plus fragiles).

**Hors périmètre.** Corriger le code, tests de charge, tests de sécurité, tout paiement réel.

---

## 7. Le P0 et ses critères de réussite

**Le P0 en une phrase.** Une note de version écrite dans le vault devient un test validé, joué par l'agent H sur 3 écrans du SaaS pilote ; un bug est prouvé par le calcul ; un changement voulu est tranché par un humain ; la documentation est corrigée ; le retest le confirme.

**Le périmètre.**

- 3 écrans du SaaS pilote, sur ordinateur (par exemple le tableau de bord, la liste des factures, le détail d'une facture).
- 3 notes d'écran, 1 note de règles entre écrans, 1 note de version.
- Les fonctionnalités P0 de la section 6.

**Critères de réussite (à tenir avant d'ajouter quoi que ce soit).**

| Critère | Seuil |
|---|---|
| Une note de version produit un test valide, accepté sans modification ou avec une modification mineure | 3 notes sur 3 au banc |
| La boucle complète tourne sans intervention manuelle dans le code | 3 passages de suite |
| La régression entre écrans est en « défaut prouvé » | 3 passages sur 3 |
| Le changement voulu validé ne revient pas au retest | 3 passages sur 3 |
| Une régression placée sur le même écran que le changement validé reste détectée | 3 passages sur 3 |
| La dérive documentaire propose la bonne correction de note | 3 cas sur 3 |
| Le test en direct de la démo (1 écran) dure moins de 90 secondes | Médiane sur 5 essais |
| Durée et coût d'un passage complet | Mesurés et affichés |

**Répartition du P0 par pôle.**

| Pôle | Livrable P0 |
|---|---|
| A. Moteur (CTO + renfort) | Agent H, orchestrateur, fil en direct, captures, replays, relance des sessions figées |
| B. Écriture et vérification (CAIO) | Génération des tests (Hugging Face), questions d'ambiguïté, relevé des valeurs et zones (Holo), calcul des règles, 4 statuts |
| C. Vault et mesures (CDO) | Structure du vault, mémoire et dérive documentaire, banc de régressions, base de mesures, notebook Pandas |
| D. Interface et design (CPO) | Les 7 écrans du produit (section 11), direction artistique, design du deck |
| E. Automatisation (CAO) | Workflow n8n (notification, ligne de mesures), renfort du pôle A |
| F. Business et pitch (CEO) | Pilote (accès, documentation, chiffres, retour écrit sur le prix), go-to-market, deck, pitch, chorégraphie de la démo |

---

## 8. Les statuts et les règles

### 8.1 Quatre statuts

| Statut | Code | Signification | Qui le voit |
|---|---|---|---|
| Conforme | `PASS` | Aucun problème sur ce que le test vérifie | Rapport |
| Suspect | `SUSPECTED` | Anomalie probable, non confirmée par le calcul, ou changement visuel à faire trancher | L'humain |
| Défaut prouvé | `VERIFIED_FAIL` | Valeurs relevées et calcul qui confirment la violation d'une règle | L'humain, en priorité |
| Non concluant | `INCONCLUSIVE` | Écran non atteint, session figée, valeurs illisibles | Rapport technique |

- `SUSPECTED` et `INCONCLUSIVE` ne comptent jamais comme des réussites dans les mesures.
- Pas de « confiance à 62 % » affichée : un score donné par un modèle n'est pas une probabilité calibrée. On affiche le **niveau de preuve** : relevé à l'écran, confirmé par le calcul, confirmé par deux lecteurs (P1).

### 8.2 Les règles vérifiables par le calcul

| Type | Exemple | Vérification |
|---|---|---|
| Somme | Le total du tableau = la somme de la colonne « Montant TTC » | Calcul sur les valeurs relevées |
| Cohérence entre écrans | Le CA du mois du tableau de bord = le total des factures du mois de la liste | Égalité de deux valeurs relevées sur deux écrans |
| Filtre et statut | Avec le filtre « Échéance dépassée », chaque ligne a une échéance passée | Contrôle ligne par ligne |
| Format | Montants au format 1 240,50 € ; dates entre 2020 et aujourd'hui | Expression régulière, bornes |
| Présence | La colonne « Échéance » est remplie pour chaque ligne | Contrôle des cases vides |

Les écarts purement visuels (bouton déplacé, bloc qui en recouvre un autre) ne se prouvent pas par le calcul : ils restent « suspects » et passent par l'humain.

---

## 9. Les escalades vers l'humain

Horama ne décide jamais seul de ce qui est ambigu. Cinq situations remontent à l'humain :

| Situation | Exemple | Ce que voit l'humain | Ce que produit sa réponse |
|---|---|---|---|
| 1. Documentation ambiguë (à l'écriture) | « Le total inclut-il la TVA ? » | La phrase de la note, la question, 2 ou 3 réponses proposées | Le test est écrit ; la note est précisée |
| 2. Test proposé à valider | Nouveau test pour le filtre « Échéance dépassée » | La note source et le test, côte à côte | Test accepté, modifié ou refusé |
| 3. Écart visuel : bug ou voulu ? | Le bouton « Exporter » a changé de place | Avant / après, zone entourée, la question | Règle limitée à cet écart, ou bug confirmé |
| 4. Dérive documentaire | La note dit « bouton Exporter en bas du tableau », l'écran validé le montre en haut | La phrase actuelle de la note et la correction proposée | Note corrigée dans le vault |
| 5. Agent bloqué | Page de connexion inattendue, écran non atteint | Le replay et la dernière capture | Relance, ou cas marqué non concluant |

**Canaux.** La file de relecture dans l'interface (P0), une notification par n8n (P0 minimal), la question posée pendant la session (P1).

---

## 10. Le vault Obsidian et la mémoire

**Principe.** Le vault est un dossier de fichiers Markdown et d'images, versionné dans Git. Obsidian sert à le lire et à l'écrire (vue graphe, liens entre notes), mais Horama fonctionne sans lui. C'est à la fois la source des tests et leur mémoire.

**Structure.**

```
vault-horama/
  saas-pilote/
    produit/
      _regles-communes.md          formats des montants, des dates, langue
      tableau-de-bord.md           ce que l'écran doit montrer, ses règles
      liste-des-factures.md
      detail-facture.md
      regles-entre-ecrans.md       cohérences entre plusieurs écrans
    notes-de-version/
      v13.md                       ce qui change dans la version 13
    tests/                         tests générés et acceptés (format H)
      liste-factures-filtre-echeance.md
      ca-du-mois-egal-total.md
    decisions/
      2026-11-18-bouton-exporter.md
    references/                    captures validées, par écran et version
    passages/
      2026-11-18-14h02.md          rapport de passage
```

**Exemple de note d'écran (écrite par l'équipe produit).**

```
---
ecran: liste-des-factures
chemin: Menu > Facturation > Factures
---

# Liste des factures

Liste toutes les factures du client, la plus récente en premier.
Le bouton « Exporter » se trouve en bas du tableau.

## Règles
- Le total en bas du tableau est la somme de la colonne « Montant TTC ».
  regle: somme | colonne: Montant TTC | cible: ligne Total
- Les montants s'affichent au format 1 240,50 €.
  regle: format | colonne: Montant TTC | motif: montant-fr
```

**Exemple de note de version.**

```
---
version: 13
date: 2026-11-18
---

# Version 13

- Nouveau filtre « Échéance dépassée » sur la liste des factures :
  il n'affiche que les factures dont la date d'échéance est passée.
- Refonte de la barre d'actions : le bouton « Exporter » passe en haut à droite.
```

**Exemple de test généré par Horama (format de H, plus un bloc de règles calculables).**

```
---
id: liste-factures-filtre-echeance
source: notes-de-version/v13.md
url: <url de préproduction du pilote>/factures
timeout_s: 180
viewport: { width: 1280, height: 900 }
genere-par: horama, accepte par Léa le 2026-11-18
---

# Liste des factures : filtre « Échéance dépassée »

## Setup
Connecté avec le compte de test, sur la liste des factures, filtre sur « Toutes ».

## Task
1. Ouvrir le menu des filtres et choisir « Échéance dépassée ».
2. Relever, pour chaque ligne, le numéro et la date d'échéance.

## Expected Result
Seules les factures dont l'échéance est antérieure à aujourd'hui sont affichées.

## Verification
- FAIL if une ligne affichée a une échéance égale ou postérieure à aujourd'hui.
- FAIL if la liste est vide alors que des factures sont en retard.
  regle: filtre | filtre: Échéance dépassée | colonne: Échéance | condition: < aujourd'hui
```

**Exemple de décision (limitée à un écart).**

```
---
date: 2026-11-18
version: 13
ecran: liste-des-factures
par: Léa
---

Écart : bouton « Exporter » déplacé du bas du tableau vers le haut à droite.
Décision : voulu (refonte de la barre d'actions, note de version v13).
Portée : ce bouton, cette zone, cet écran. Le reste de l'écran reste vérifié.
Documentation : liste-des-factures.md corrigée (proposition acceptée).
```

**Les règles de sécurité de la mémoire.**

- Une validation ne vaut que pour un écart précis : écran, zone, description, version.
- La capture de référence d'un écran n'est mise à jour que lorsque tous ses écarts sont tranchés et qu'aucun n'est un bug.
- Seules les décisions humaines créent des règles ou modifient une note. Horama propose, l'humain accepte.

---

## 11. Les écrans du produit

Sept écrans, pensés pour la démo autant que pour l'usage. Maquettes indicatives : le CPO en fera la version dessinée pour mercredi.

### 11.1 Accueil : le produit et sa couverture

Le vault connecté, la liste des écrans du SaaS, et pour chacun : ses règles, ses tests, son dernier statut. Une barre de couverture (« 14 règles dans la documentation, 11 testées »). Le bouton « Lancer un passage ».

### 11.2 De la note au test

```
+--------------------------------------------------------------------------+
| Horama | Note de version v13 | 2 tests proposés | 1 question             |
+--------------------------------------------------------------------------+
|  NOTE (vault)                     |  TEST PROPOSÉ (format H)             |
|                                   |                                      |
|  Nouveau filtre « Échéance        |  Task                                |
|  dépassée » sur la liste des      |  1. Choisir « Échéance dépassée »    |
|  factures : il n'affiche que      |  2. Relever numéro et échéance       |
|  [les factures dont la date       |  Verification                        |
|  d'échéance est passée].          |  FAIL if [échéance >= aujourd'hui]   |
|                                   |                                      |
|     [ Accepter ]    [ Modifier ]    [ Refuser ]                          |
+--------------------------------------------------------------------------+
|  QUESTION : « échéance passée » inclut-elle le jour même ?               |
|     [ Oui ]   [ Non ]   [ Autre réponse ]                                |
+--------------------------------------------------------------------------+
```

La règle est surlignée de la même couleur dans la note et dans le test : on voit d'où vient chaque vérification.

### 11.3 Passage en direct

```
+--------------------------------------------------------------------------+
| Horama | Passage en cours | Version 13 | 2 / 5 tests | 01:12             |
+--------------------------------------------------------------------------+
|  FIL DE L'AGENT                   |  CAPTURE EN COURS                    |
|  00:04  Connexion                 |  +--------------------------------+  |
|  00:19  Ouvre « Factures »        |  |                                |  |
|  00:31  Ouvre le menu Filtres     |  |   [ capture de l'écran ]       |  |
|  00:42  Choisit « Échéance        |  |                                |  |
|         dépassée »                |  |                                |  |
|  00:55  Relève 6 lignes           |  +--------------------------------+  |
|  01:08  Vérifie la règle...       |  [ Voir le replay H ]                |
+--------------------------------------------------------------------------+
```

Le fil se remplit au rythme réel de l'agent : chaque étape arrive avec sa capture. Le temps d'attente devient le spectacle, sans animation qui maquille la lenteur.

### 11.4 Rapport de passage

La liste des tests joués avec leur statut, le plus grave d'abord ; pour chaque test, la règle, la note source, les écrans visités, la durée et le coût. Un résumé : « 5 tests, 3 conformes, 1 défaut prouvé, 1 suspect, 4 min 10, 0,0x $ ».

### 11.5 Comparaison des versions

```
+--------------------------------------------------------------------------+
| Liste des factures | v12 (référence) <> v13 (testée)                     |
| Vue : [ Côte à côte ]  [ Rideau ]  [ Pixels bruts ]                      |
+--------------------------------------------------------------------------+
|  v12                              |  v13                                 |
|  +-----------------------------+  |  +-----------------------------+     |
|  |                             |  |  |  (1) [ bouton déplacé ]     |     |
|  |                             |  |  |                             |     |
|  |                             |  |  |  (2) [ ligne total ]        |     |
|  +-----------------------------+  |  +-----------------------------+     |
|                                                                          |
|  Écart 1 : bouton Exporter déplacé            SUSPECT                    |
|  Écart 2 : total 1 240,00 €, somme 1 420,00 €  DÉFAUT PROUVÉ             |
|                                                                          |
|  Pixels bruts : 312 zones différentes. Horama : 2 écarts qui comptent.   |
+--------------------------------------------------------------------------+
```

Trois vues : côte à côte, rideau (un curseur qu'on fait glisser sur l'image), et pixels bruts (la différence en rouge, pour montrer le bruit qu'une comparaison classique imposerait à l'humain).

### 11.6 Relecture et escalade

```
+--------------------------------------------------------------------------+
| À relire : 2 | Défaut prouvé : 1 | Suspect : 1                           |
+--------------------------------------------------------------------------+
|  DÉFAUT PROUVÉ  Tableau de bord <> Liste des factures                    |
|  Règle (regles-entre-ecrans.md) : CA du mois = total des factures        |
|  Relevé : tableau de bord 1 240,00 €  |  liste 1 420,00 €                |
|  Preuve : valeurs relevées, écart de 180,00 € calculé                    |
|  [ capture 1 ]  [ capture 2 ]  [ replay ]                                |
|        [ C'est un bug ]                  [ C'est voulu ]                 |
+--------------------------------------------------------------------------+
|  SUSPECT  Liste des factures : le bouton Exporter a changé de place.     |
|  [ avant ]  [ après, zone entourée ]                                     |
|        [ C'est un bug ]                  [ C'est voulu ]                 |
+--------------------------------------------------------------------------+
```

### 11.7 Dérive documentaire

```
+--------------------------------------------------------------------------+
| La documentation ne correspond plus à l'écran validé                     |
+--------------------------------------------------------------------------+
|  liste-des-factures.md                                                   |
|                                                                          |
|  - Le bouton « Exporter » se trouve en bas du tableau.                   |
|  + Le bouton « Exporter » se trouve en haut à droite du tableau          |
|  +   (depuis la version 13).                                             |
|                                                                          |
|     [ Corriger la note ]          [ Laisser la note telle quelle ]       |
+--------------------------------------------------------------------------+
```

Un clic, et la note change dans le vault : on bascule sur Obsidian pour le montrer.

---

## 12. Architecture

### 12.1 Les briques

| Brique | Rôle | Pourquoi elle |
|---|---|---|
| **Vault Obsidian (Markdown, Git)** | Documentation, règles, notes de version, tests, décisions, rapports | Source des tests et mémoire, lisible par l'équipe |
| **Hugging Face (Inference Providers)** | Modèle de langage open source qui écrit les tests et repère les ambiguïtés ; second lecteur de vision en P1 | Rôle de fond, mesurable (taux de tests valides) ; on change de modèle en une ligne |
| **H Agents API** | Joue les tests : connexion, navigation, filtres, détails, relevés, captures, replays | Le cœur computer use |
| **H Holo (Models API)** | Compare les versions, relève les valeurs, pointe les zones | Modèle de vision de H, spécialisé dans la lecture d'interfaces |
| **Vérification en code** | Somme, égalité entre écrans, filtre, format, présence ; différence de pixels brute | La réponse exacte ne dépend pas d'un modèle |
| **Next.js sur Vercel** | Les 7 écrans, le fil en direct, la relecture, l'accès du jury | Déploiement simple, partenaire du jury |
| **Base de mesures** (Supabase ou Sheets) | Passages, statuts, décisions, durées, coûts | Chiffres du deck (Pandas) |
| **n8n** | Notifications, ligne de mesures, issue GitHub (P1) | Le volet automatisation du brief |
| **GitHub** | Code, vault, contrats, tests, benchmark, documentation | Source de vérité unique |

**Vercel eve, à tester.** Cadre d'agents de Vercel (préversion publique) avec approbation humaine native. Essai limité à 30 minutes mardi par le pôle Moteur ; sinon Next.js et un orchestrateur simple.

### 12.2 Ce que fait l'Agents API

- **Un agent enregistré** (`horama-testeur`) : navigateur, consigne (inspirée du modèle de tâche de la démo QA de H), skills, outils.
- **Les skills** : les règles communes et les notes d'écran utiles, synchronisées avant chaque passage.
- **Le test à jouer** : envoyé comme tâche de la session, au format de H.
- **Outil personnalisé `relever(ecran)`** : Horama récupère la capture, Holo compare et relève, le code vérifie ; le résultat revient à l'agent avec ce qu'il doit regarder ensuite (après le résultat d'un outil, l'agent ne reçoit pas de nouvelle capture : mesuré le 8/11).
- **Outil personnalisé `rendre_verdict(...)`** : statut final du test, après enquête si besoin.
- **Sortie structurée**, **replay partagé**, **webhooks** vers n8n.
- **Suivi en direct** : les événements de la session (étapes, horodatages, captures) alimentent le fil de l'écran 11.3.

### 12.3 Le flux

```
[Note de version écrite dans le vault]
   -> Horama lit la note -> modèle Hugging Face -> test proposé + questions
   -> écran 11.2 : l'humain accepte -> test écrit dans vault/tests (commit)
[Lancer un passage]
   -> synchronisation des skills -> session H par test (3 en parallèle au plus)
   -> agent : navigation -> outil relever -> capture -> Holo -> calcul -> agent
   -> outil rendre_verdict -> statuts en base -> écrans 11.4, 11.5, 11.6
   -> webhook -> n8n -> notification
[Humain : bug / voulu]
   -> décision dans vault/decisions -> si la note est contredite : écran 11.7
   -> note corrigée -> commit -> retest au passage suivant
```

### 12.4 Contrats de données (à geler mardi matin)

Test proposé :

```json
{
  "id": "liste-factures-filtre-echeance",
  "source": "notes-de-version/v13.md",
  "passages_de_la_source": ["il n'affiche que les factures dont la date d'échéance est passée"],
  "test_markdown": "contenu du test au format H",
  "regles_calculables": [{ "type": "filtre", "colonne": "Échéance", "condition": "< aujourd'hui" }],
  "questions": [{ "texte": "« échéance passée » inclut-elle le jour même ?", "choix": ["Oui", "Non"] }],
  "statut": "propose"
}
```

Résultat d'une vérification :

```json
{
  "passage_id": "2026-11-18-14h02",
  "version_testee": "13",
  "version_reference": "12",
  "test_id": "ca-du-mois-egal-total",
  "statut": "VERIFIED_FAIL",
  "ecrans": ["tableau-de-bord", "liste-des-factures"],
  "valeurs": { "a": "1240.00", "b": "1420.00" },
  "calcul": "1240.00 != 1420.00, écart 180.00",
  "niveau_de_preuve": "relevé + calcul",
  "ecarts_visuels": [{ "ecran": "liste-des-factures", "description": "bouton Exporter déplacé", "zone": { "x": 870, "y": 120 }, "statut": "SUSPECTED" }],
  "captures": ["captures/2026-11-18-14h02/tableau-de-bord.png"],
  "replay": "lien public de la session",
  "duree_s": 0,
  "cout_usd": 0
}
```

Décision humaine et proposition de correction de note :

```json
{
  "decision": "voulu",
  "ecran": "liste-des-factures",
  "ecart": "bouton Exporter déplacé en haut à droite",
  "zone": { "x": 870, "y": 120 },
  "version": "13",
  "portee": "cet écart, cet écran",
  "par": "Léa",
  "correction_de_note": {
    "fichier": "produit/liste-des-factures.md",
    "avant": "Le bouton « Exporter » se trouve en bas du tableau.",
    "apres": "Le bouton « Exporter » se trouve en haut à droite du tableau (depuis la version 13).",
    "statut": "acceptee"
  }
}
```

---

## 13. Direction artistique

À finaliser par le CPO avec l'équipe (le design final passe par une vraie phase de direction, pas par le premier jet). Les principes :

- **Éviter le look générique de SaaS IA** : barre latérale standard, rangées de cartes de chiffres, dégradés bleu-violet, chatbot géant, animations qui masquent la lenteur.
- **Deux ambiances** : fond crème clair pour le vault, la note et le rapport (le monde de la documentation) ; fond graphite pour le passage en direct et l'inspection (le monde de l'agent).
- **Deux couleurs de sens** : vert lime pour conforme et validé, corail pour les défauts. Une troisième couleur, discrète, pour le surlignage des règles (note et test).
- **Typographie lisible et hiérarchie forte** : les valeurs relevées et l'écart doivent se lire de loin, sur un projecteur.
- **Une mise en scène du lien note ↔ test** : la même règle surlignée de la même couleur dans la note, dans le test et dans le rapport. C'est la signature visuelle d'Horama.
- **Micro-interactions sobres** : le fil de l'agent qui se remplit, le rideau avant / après, la note qui se corrige.
- **Mascotte** : seulement pour le deck et la page d'accueil, s'il reste du temps.

---

## 14. La démo : une chorégraphie fluide

### 14.1 Les règles de fluidité

- **Tout ce qui est long est lancé avant.** Un passage complet sur 3 écrans dure plusieurs minutes : il est lancé 10 minutes avant le pitch. En direct, on ne joue qu'**un test sur un écran** (moins de 90 secondes).
- **Pas de temps mort.** Pendant que l'agent travaille en direct, l'orateur parle et le fil de l'agent se remplit à l'écran : l'attente fait partie du spectacle.
- **Rien à taper de long.** La note de version tient en une ligne ; le reste est préparé.
- **Tout est déjà ouvert et connecté** : Obsidian à gauche, Horama à droite, compte de test connecté, notifications coupées, zoom réglé pour le projecteur.
- **Une vidéo de secours par étape**, découpée en chapitres : si une étape casse, on enchaîne sur son chapitre sans recommencer.
- **Répétée 5 fois chronométrée** depuis un état de départ écrit dans le repo, avec l'étiquette Git exacte jouée.

### 14.2 Le déroulé (6 minutes)

| Temps | Ce qu'on montre | En direct ou préparé |
|---|---|---|
| 0:00 | Le problème : un vrai bug du pilote arrivé chez un client, alors que la règle était écrite dans leur documentation | Préparé (slide) |
| 0:40 | « H a montré qu'un agent sait jouer un test. Qui écrit les tests ? » La boucle Horama | Préparé |
| 1:10 | Dans Obsidian, on écrit la note de version : « Nouveau filtre Échéance dépassée » | En direct |
| 1:30 | Horama propose le test en quelques secondes, avec une question d'ambiguïté ; on répond et on accepte | En direct |
| 1:50 | L'agent H joue le test : le fil se remplit, captures à l'appui | En direct (moins de 90 s) |
| 3:10 | Défaut prouvé : une facture non échue apparaît dans le filtre, valeurs à l'appui | En direct |
| 3:30 | Le passage complet lancé avant : une incohérence entre le tableau de bord et la liste, que personne n'avait testée | Préparé (vrai passage du jour) |
| 4:00 | Comparaison des versions : pixels bruts (rouge partout) puis Horama (2 écarts) ; rideau avant / après | Préparé, manipulé en direct |
| 4:20 | Le bouton déplacé : « C'est voulu » ; Horama propose la correction de la note ; on accepte ; la note change dans Obsidian | En direct |
| 4:50 | Les chiffres du banc | Préparé |
| 5:20 | Business model, go-to-market, coût de run | Préparé |
| 5:40 | Limites et roadmap | Préparé |

**L'effet recherché.** « On écrit une ligne de documentation ; trois minutes plus tard, un agent l'a testée sur le vrai logiciel, a trouvé un bug, et la documentation s'est corrigée d'elle-même là où l'écran a changé pour de bon. »

### 14.3 Préparation sur le SaaS pilote

- Une version de référence (12) validée, et une version candidate (13) qui contient : le nouveau filtre avec un bug, une incohérence entre le tableau de bord et la liste, le bouton déplacé.
- Si le pilote a une suite de tests, on la lance sur la version 13 : elle passe au vert. C'est une slide.
- Plan B : un faux SaaS de gestion sur Vercel, avec les mêmes régressions activables (comme dans la démo QA de H).

### 14.4 Les questions probables du jury (4 min)

| Question | Élément de réponse |
|---|---|
| Ce n'est pas notre démo QA ? | Si, et on le dit : on joue vos tests ; on a construit qui les écrit et qui les tient à jour |
| Pourquoi pas Playwright ? | Il vérifie ce qu'un développeur a écrit ; Horama couvre ce que la documentation dit et que personne n'avait transformé en test |
| Et si le test généré est faux ? | Un humain le valide avant qu'il tourne ; taux de tests valides mesuré |
| Et si l'agent lit mal un chiffre ? | Preuve par le calcul ; second lecteur en P1 ; sinon « non concluant » |
| La mémoire ne masque-t-elle pas un bug ? | Validation limitée à un écart ; démontré au banc |
| Pourquoi Hugging Face ? | Un modèle open source écrit les tests ; comparé sur le banc |
| Combien ça coûte, combien de temps ? | Mesuré par test et par passage |
| Le pilote paierait-il ? | Sa réponse écrite |
| Et si l'équipe n'a pas de documentation ? | Horama démarre avec 30 minutes d'entretien pour écrire les règles clés ; la carte de couverture montre ce qui manque |

---

## 15. Le protocole de benchmark

**Le banc.** Une personne qui n'écrit pas les consignes de l'agent prépare, sur l'environnement de test du pilote (ou le plan B) :

- environ 10 régressions métier connues, dont au moins 3 entre écrans ;
- environ 5 changements voulus, dont au moins 2 qui contredisent la documentation ;
- au moins un écran qui contient à la fois un changement voulu et une régression ;
- 5 notes de version réalistes, pour mesurer l'écriture des tests ;
- des cas jamais vus pendant le réglage.

La vérité est écrite à l'avance pour chaque cas.

**Les mesures.**

| Mesure | Définition |
|---|---|
| Tests valides | Part des tests générés acceptés sans modification, avec modification mineure, ou refusés |
| Ambiguïtés repérées | Questions posées qui étaient de vraies ambiguïtés de la documentation |
| Rappel | Part des vrais bugs signalés |
| Précision | Part des « défauts prouvés » qui sont de vrais bugs |
| Fausses alertes | Changements voulus signalés comme défauts |
| Charge de relecture humaine | Cas à relire, comparés à la différence de pixels et à la recette manuelle |
| Dérive documentaire | Corrections de notes proposées justes, sur le nombre de changements voulus qui contredisent la doc |
| Mémoire | Alertes répétées sur des écarts déjà validés ; régressions masquées (doit rester à 0) |
| Parcours terminés | Part des tests où l'agent H atteint tous les écrans (« non concluant » = échec) |
| Latence | Médiane et distribution, par test et par passage |
| Coût | Par test et par passage |

**Les comparaisons (mêmes cas, mêmes conditions).**

- La suite de tests du pilote, si elle existe.
- La différence de pixels.
- La démo QA de H avec des tests écrits à la main par l'équipe (même temps alloué) : combien de bugs sont couverts quand il faut tout écrire soi-même ?
- Horama sans mémoire, puis avec.
- Deux modèles Hugging Face pour l'écriture des tests (qualité, coût, latence).

**Les garde-fous.** Banc préparé par une autre personne ; cas de test jamais utilisés pour le réglage ; vérité écrite avant ; échecs publiés ; 2 répétitions au minimum.

---

## 16. Modèle économique, ROI, go-to-market et coût de run

**Qui paie.** Les éditeurs de SaaS B2B de 5 à 50 développeurs, sans testeur dédié, avec un produit riche en règles métier (facturation, gestion, CRM, finance, RH).

**Le ROI (à chiffrer avec le pilote).**

- Temps de recette évité = heures par livraison × livraisons par mois × coût horaire.
- Temps d'écriture de tests évité = tests générés et acceptés × temps moyen d'écriture d'un test.
- Incidents évités = bugs arrivés chez des clients par an × coût d'un incident.
- Bonus : une documentation qui reste vraie (support, onboarding, commerciaux).

**Comment on facture.** Prix à fixer par le CPO avec le retour du pilote : un essai (une application, quelques passages par mois), puis un abonnement par application, avec un nombre de passages inclus, largement au-dessus du coût de run.

**Go-to-market.**

1. Le pilote, transformé en témoignage chiffré.
2. Son réseau d'éditeurs SaaS.
3. Là où vivent la documentation et les livraisons : un vault Obsidian ou Notion, le commentaire de pull request GitHub, la prévisualisation Vercel (piste à vérifier : place de marché des intégrations Vercel).
4. Les communautés de fondateurs SaaS et de développeurs en France, avec une démo courte : une ligne de documentation, un bug trouvé.

**Coût de run.**

- Session d'agent H de 14 à 19 étapes : environ 0,05 $ (mesuré le 8/11 sur un autre site), à remesurer.
- Holo (Models API) : `holo4-27b` à 0,40 $ par million de jetons en entrée, 3,00 $ en sortie (doc H, 16/11), à mesurer par relevé.
- Écriture d'un test par un modèle Hugging Face : à mesurer selon le modèle.
- Formule : coût d'un passage = tests × (coût d'une session + relevés × coût Holo) + tests générés × coût d'écriture.

---

## 17. Le client pilote : prérequis et adoption

À régler aujourd'hui ou demain matin (CEO, avec le collègue) :

1. Un environnement de test avec une version de référence et une version candidate, sans toucher à la production.
2. Un compte de test avec des données fictives (les captures partent chez H et chez le fournisseur Hugging Face).
3. L'accord écrit de l'entreprise : utiliser le SaaS, montrer ses écrans, envoyer des captures et des extraits de documentation aux fournisseurs de modèles, publier ou non (concours LinkedIn).
4. Une connexion sans captcha ni double authentification, sinon un profil de navigateur connecté ou le coffre d'identifiants de H.
5. **Leur documentation et leurs notes de version** (ou 30 minutes d'entretien pour écrire les règles des 3 écrans), et l'accès à leur suite de tests si elle existe.
6. Les chiffres du problème (section 2).

**La preuve d'adoption.** D'ici jeudi, après leur avoir montré un passage : « Utiliseriez-vous Horama ? Paieriez-vous pour ça, et combien ? Qu'est-ce qui manque pour l'utiliser à chaque livraison ? » Réponse écrite, dans le deck.

**Plan B.** Un faux SaaS de gestion sur Vercel, avec sa documentation et ses régressions activables ; le vrai SaaS montré en lecture seule.

---

## 18. Questions à poser aux mentors

**H Company (mardi 11 h et 15 h).**

- Depuis un outil personnalisé, comment récupérer la capture de l'écran en cours (ressources ou événements de la session) ?
- Comment afficher en direct les étapes et les captures d'une session dans notre interface ?
- Capture de la page entière ou de la partie visible ?
- Combien de skills, quelle taille ; comment l'agent choisit-il les bonnes ?
- Relever des valeurs précises : Holo en Models API, ou la réponse de l'agent ?
- Sessions figées : comment les libérer quand la suppression reste sans effet ?
- Limites de la Models API avec les crédits du hackathon.
- Peut-on présenter Horama comme une extension de votre démo QA, et citer le dépôt ?

**Vercel.**

- eve est-il assez stable pour un prototype en 3 jours ; l'approbation humaine peut-elle venir de notre interface ?
- Déclencher un passage à chaque déploiement de prévisualisation.
- Stocker captures et résultats pour une démo accessible au jury.
- Afficher un fil en direct (flux d'événements) dans une app Next.js déployée.

---

## 19. Ce qu'on sait déjà de l'API H (pièges mesurés les 7 et 8 novembre)

- **Quota** : 3 sessions simultanées par organisation en offre gratuite ; au-delà, file d'attente sans erreur (`queue: false` pour échouer tout de suite). Donc 3 tests en parallèle au plus.
- **Sessions figées** : 3 sur 17 bloquées à la première étape ; la suppression reste sans effet. Abandonner une session muette après 40 à 45 s, relancer une fois.
- **Démarrages muets** : prévoir « réessayer ».
- **Rythme** : 8 à 10 s par étape ; un test de 8 à 10 étapes dure 1 min 10 à 1 min 40.
- **Outils personnalisés** : la session attend le résultat ; garder les appels déjà traités ; la durée maximale de la session borne l'attente.
- **Chrome local sur écran Retina** : clics à coordonnées doublées ; `--force-device-scale-factor=1`.
- **Fenêtre cachée** : `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`.
- **Pas de captcha** géré par H. **Navigateur cloud** : l'humain ne reprend pas la main.
- **Pas d'action « capture d'écran »** : écrire « regarde la page avec wait_web ».
- **Lecture d'image variable** d'un appel à l'autre : température à 0, relecture en cas de doute.
- **Sortie JSON contrainte** : préférer des clés fixes.
- **Mesurer avant de théoriser.**

---

## 20. Organisation de l'équipe

**Pôles et rôles officiels.** Détail dans `reunion-repartition.pdf`. Moteur (2 personnes, CTO), Écriture et vérification (1, CAIO), Vault et mesures (1, CDO), Interface et design (1, CPO), Automatisation (0,5, CAO), Business et pitch (1, CEO).

**Façon de travailler.**

- GitHub, seule source de vérité : code, vault, ce document (`docs/cadrage.md`), tickets, checklist.
- Un ticket = un propriétaire = une branche = une pull request, relue par une autre personne.
- Contrats JSON gelés mardi matin ; versions factices pour ne pas s'attendre.
- `main` gelé pendant les tests de la démo ; une étiquette Git sur chaque version qui marche.
- Trois points de 10 minutes par jour (9 h 30, 14 h, 17 h) ; peer review le soir.
- Journal `docs/retours-api-h.md` tenu chaque jour (fait partie du livrable).
- Support des mentors : le bug exact, ce qu'on a testé, une capture.
- Le dépôt QA de H est cité dans le README (licence MIT) pour tout ce qu'on en reprend.

---

## 21. Planning

| Jour | Objectif |
|---|---|
| Lundi | Rendu de l'idée avant 17 h. Prérequis du pilote, dont sa documentation. Crédits H et Hugging Face activés. Ce soir : l'agent H se connecte au pilote et atteint 2 écrans ; un modèle Hugging Face écrit un test au format H à partir d'une note ; Holo relève un montant |
| Mardi | Contrats gelés. Points techniques H. Essai de 30 min d'eve. Vault des 3 écrans écrit. Premier test généré, accepté, joué de bout en bout sur 1 écran |
| Mercredi | Rendu avant 17 h (parcours, architecture, Loom, roadmap). Règle entre écrans prouvée par le calcul. Écrans 11.2, 11.3, 11.6 branchés. Banc prêt |
| Jeudi | Comparaison des versions (11.5), dérive documentaire (11.7), retest. Critères P0 vérifiés. Mesures complètes. Retour écrit du pilote. Vidéo de secours par chapitre. 5 répétitions chronométrées. Gel le soir |
| Vendredi | Avant 11 h : prototype, fiche et repo, vidéo de 5 min, contrôle des liens. Avant 15 h : deck. Pitch |

---

## 22. Fiche projet et « comment tester » (vendredi 11 h)

Le README donne au jury trois façons de voir Horama fonctionner :

1. L'interface en ligne sur Vercel, en lecture, avec les passages enregistrés (tests générés, statuts, comparaisons, décisions, corrections de notes).
2. Les replays publics des sessions H.
3. La vidéo de 5 minutes.

Et pour un développeur : lancer Horama sur le faux SaaS du plan B avec sa propre clé H et un vault d'exemple (étapes copiables, variables d'environnement, durée attendue).

**Contrôle des liens, vendredi matin** : chaque lien ouvert en fenêtre privée, sans être connecté.

---

## 23. Risques et parades

| Risque | Parade |
|---|---|
| Le jury voit sa propre démo QA | On la cite d'entrée et on montre ce qu'on ajoute ; mesure face à des tests écrits à la main |
| Tests générés faux ou vagues | Validation humaine avant tout passage ; questions d'ambiguïté ; taux de tests valides mesuré |
| Pas de documentation chez le pilote | 30 minutes d'entretien pour écrire les règles des 3 écrans |
| Faux positifs | « Défaut prouvé » réservé aux cas confirmés par le calcul ; relecture humaine pour le reste |
| La mémoire masque une régression | Validation limitée à un écart ; testé au banc |
| La démo live est lente ou plante | Passage complet lancé avant ; un seul test en direct (moins de 90 s) ; vidéo de secours par chapitre |
| Sessions H figées, quota de 3 | Abandon et relance ; 3 tests en parallèle au plus |
| Un nouveau cadre (eve) fait perdre du temps | Essai de 30 minutes, repli prévu |
| Pilote indisponible | Faux SaaS sur Vercel avec documentation et régressions |
| Données confidentielles | Comptes de test, données fictives, accord écrit |

---

## 24. Conformité au brief (à cocher vendredi matin)

| Exigence du brief | Où on la couvre |
|---|---|
| Problème réel et précis | Section 2, chiffres du pilote |
| Cible identifiable et trouvable | Sections 16 et 17 |
| Usage justifié de l'agent | Sections 3 et 4 |
| MVP réaliste en 4 jours | Section 7 |
| Modèle crédible et coût de run | Section 16 |
| IA et automatisation intégrées | Hugging Face, agent H, Holo, calcul, n8n |
| Agent qui agit sur une vraie interface | Agent H sur le SaaS pilote, entre plusieurs écrans |
| Démo live, résultats chiffrés | Sections 14 et 15 |
| Un vrai utilisateur paierait-il ? | Section 17 |
| Retours sur l'Agent API | Section 20 |
| Stack H, Hugging Face, GitHub | Section 12 |
| 6 rôles avec leurs attendus | Section 20 et `reunion-repartition.pdf` |
| Rendus lundi, mercredi, vendredi | Sections 1, 21 et 22 |
| Deck dans l'ordre imposé, go-to-market compris | Sections 14 et 16 |
| Liens accessibles | Section 22 |

---

## 25. Questions ouvertes

- Python ou TypeScript pour l'orchestrateur (TypeScript si eve est retenu) : pôle Moteur, mardi matin.
- Récupération des captures et affichage en direct des étapes : questions à H, mardi.
- Modèle Hugging Face pour écrire les tests : 2 candidats à comparer ce soir sur les Inference Providers.
- Supabase ou Google Sheets pour la base de mesures : CDO.
- Documentation du pilote : existe-t-elle, sous quelle forme ?

**Ce qu'on attend de chacun d'ici ce soir.** Lire ce document, surtout « Ce qui change par rapport à la V2 » et la section 6. Noter ses objections : c'est maintenant qu'on change le périmètre, pas jeudi.
