# Banc Railway après les PR #236 et #237

Le 19 novembre 2026 de 18 h 19 à 18 h 47 (heure de Paris), pour le point 3 de [#208](https://github.com/Hisseiny/Horama-/issues/208#issuecomment-7015322564).

Railway tournait sur `6e2003acd077e7eca2cb58f12bf79ec1ac6894b4`, qui contient le commit de fusion de #237 dans `dev` (`ec13efe`). Railway a déclaré ce déploiement réussi à 18 h 13 min 26 s. `GET /sante` a répondu `200 {"ok":true}` avant et après les trois passages. Le premier rapport confirme le comportement introduit par #236 avec quatre rognages auparavant prouvés qui ressortent en doute avec le motif « Le rognage par le conteneur peut être voulu ». [Statut du déploiement Railway](https://api.github.com/repos/Hisseiny/Horama-/deployments/7920325019/statuses/22648991919)

## Méthode

Même protocole que le [banc à 380 s](2026-11-19-banc-railway-380.md). Un `POST /explorations` avec l’URL de départ, suivi du rapport JSON toutes les deux secondes. Le passage suivant a été envoyé après le rapport terminal et le HTTP 410 de `/direct` du passage précédent. Les trois demandes sont passées par la file Railway. La première durée vient de `duree_s`, la seconde mesure le temps du `POST` au premier rapport terminal, file comprise.

Les visites sont comptées selon `pages[].arrivee` (`depart`, `clic`, `adresse` pour `go_to`). Les constats ont été relus sur les captures à 1 280 × 900 et, selon le cas, confrontés au contenu du site. La page publique `/rapport/` omet le coût et le replay. Les champs JSON `cout_usd`, `agents[].cout_usd` et `agents[].replay_url` donnent les valeurs ci-dessous. Les liens dépendent de la conservation du passage par Railway (une heure après la fin).

## Résultats

| Site | État | Visitées / 8 | Départ / clic / go_to | Défauts prouvés vrais / faux | Doutes | Durée rapport / depuis le POST | Total rapport / coût H | Replay H dans le JSON |
|---|---|---:|---:|---:|---:|---:|---|---|
| [vercel.com](https://horama-gold.vercel.app/rapport/?id=5e97d6df-780f-4318-85a5-871ee58fd801&service=https%3A%2F%2Fexplorations-production-70bf5b38.up.railway.app) | interrompu (agent `tombe`) | 5/8 | 1 / 4 / 0 | 0 / 0 | 9 | 376,768 s / 427,851 s | `null` / à mesurer | absent |
| [www.hcompany.ai](https://horama-gold.vercel.app/rapport/?id=47c4633e-0cfe-44b6-9b5e-0a72d522b0d3&service=https%3A%2F%2Fexplorations-production-70bf5b38.up.railway.app) | fini | 8/8 | 1 / 4 / 3 | 0 / 0 | 10 | 302,770 s / 630,363 s | `null` / à mesurer | présent |
| [Clone Eugenia](https://horama-gold.vercel.app/rapport/?id=469c3c93-fa81-43cc-aec0-6014fbd07cab&service=https%3A%2F%2Fexplorations-production-70bf5b38.up.railway.app) | fini | 8/8 | 1 / 4 / 3 | 0 / 0 | 0 | 277,778 s / 609,962 s | `null` / à mesurer | présent |

Après relecture des rapports terminés, le total et le coût de l’agent H sont toujours `null` pour les trois sites. Les coûts Holo remontés par les pages totalisent à eux seuls 0,0032478 USD pour Vercel, 0,0072118 USD pour H Company et 0,0048664 USD pour le clone. La lecture unique après l’arrêt local peut passer avant que H fournisse un état terminal et son coût final. Les rapports ne permettent pas de trancher cette hypothèse ni de connaître le montant facturé.

### vercel.com

- Quatre visites par clic (`/ai-sdk`, `/frameworks/nextjs`, `/products/previews` et `/security`). Les trois pages non visitées (`/docs`, `/ai`, `/customers`) restent sans conclusion. Le 4e clic aboutit à un relevé environ 340 s après le départ du rapport, et l’arrêt arrive environ 37 s plus tard. La durée est cohérente avec le plafond de 380 s appliqué au conteneur, avec trop peu de temps restant pour les trois visites.
- Les neuf doutes correspondent à des faux positifs de mise en page. Sur `/products/previews`, cinq rognages concernent des illustrations (commentaire du bot, fil de commentaires, feature flags, exemple d’édition et onglets d’environnement) et un sixième constat vise un titre entièrement présent, en bas de la capture. Sur `/security`, les deux ellipses appartiennent à des cartes d’un exemple (« Notebook · 24 KB » et « Churn dashboard »). Sur `/ai-sdk`, « Muse Ember » se trouve en bas d’une liste explicitement défilable.
- Aucun refus de cookies consigné (`cookies: aucune` sur les cinq pages).

### www.hcompany.ai

- Quatre visites par clic (`/research`, `/use-cases`, `/about`, `/privacy-policy`) et trois par adresse (`/h-platform`, `/enterprise`, `/technical-blog`). Le rapport se termine 1,645 s après le dernier relevé.
- Le bandeau Axeptio est visible sur les huit captures, avec « No, thanks » et `cookies: aucune` sur les huit pages. Le rapport n’atteste aucun refus. Six doutes montrent un recouvrement par le bandeau (accueil, `/h-platform`, `/enterprise`, premier doute de `/use-cases`, `/about`, corps de `/privacy-policy`). Quatre doutes sont faux sur les captures (deux autres zones d’onglets de `/use-cases`, date de `/privacy-policy`, texte du bandeau sur `/technical-blog`). Aucun de ces constats ne prouve un défaut de mise en page du site.
- Le repli de masquage reste en échec sur ce bandeau. Dans un nouveau contexte Chrome, les boutons Axeptio sont dans un Shadow DOM. Le refus automatique et le masquage de #237 interrogent le document sans traverser les racines Shadow DOM. Le libellé « No, thanks » vu sur Railway manque aussi à la liste des libellés reconnus par le refus automatique.

### Clone Eugenia

- Site testé sur [eugenia-school-website.vercel.app](https://eugenia-school-website.vercel.app/). Quatre visites par clic (`/programmes`, `/entreprises`, `/carrieres`, `/admissions`) et trois par adresse (`/ecole`, `/evenements`, `/programme/bachelor-ia-business`). Le rapport se termine 1,687 s après le dernier relevé.
- Huit pages relevées, zéro défaut prouvé, zéro doute et aucun refus de cookies consigné (`cookies: aucune` sur les huit pages).
