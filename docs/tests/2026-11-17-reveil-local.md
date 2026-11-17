# Réveil local par commit — issue #36, point 1

17 novembre 2026. Ali, **codé non testé** : aucune validation par une autre personne n'est attestée. Branche de travail issue de `dev` ; `dev-nathan` était derrière `dev` d'un commit, donc PR vers `dev` selon la consigne.

## Ce qui a réellement tourné

Sur Linux, Node 22.23.5, dépôt d'essai isolé `/tmp/horama-reveil-e2e`, branche `demo`, site **synthétique d'essai** déjà servi sur `http://127.0.0.1:4173`. Le surveillant attendait **avant** la création de chaque nouveau commit (sans `--depuis`). Les vrais modules impact, scène, agent et mémoire ont tourné ; aucune API H ni base distante, aucun secret. Le commit déclencheur ne change que `site-eugenia/index.html` (ajout d'un commentaire HTML).

Le vrai dépôt n'a pas de `site-eugenia/` à cette révision et ses notes Eugenia ont `code: []`. Dans le dépôt d'essai uniquement : deux pages HTML locales, lien « DÉCOUVRIR LE BACHELOR », et `code: [site-eugenia/index.html]` sur la note accueil. Les tests acceptés Eugenia sont ceux du dépôt. Aucune copie fidèle du vrai site n'est revendiquée ; aucun accès à `banc/`.

## Commande du passage complet sous 10 s

Depuis le dépôt d'essai, avec `chrome-local` un wrapper vers Chrome local qui bloque la résolution distante et écrit un netlog :

```sh
DISPLAY=:0 \
CHROME_BIN=/tmp/horama-reveil-preuves/sans-presentation/chrome-local \
node automatisation/reveil/wake.mjs \
  --branche demo --base-url http://127.0.0.1:4173 --une-fois \
  -- --version 1 --reference 1 \
  --sans-presentation --sans-fin --rythme 0.05 \
  --ecrire-references \
  --temoins /tmp/horama-reveil-preuves/sans-presentation/temoins \
  --port 9444
```

Après le journal « surveillance », ajout du commentaire puis :

```sh
git add site-eugenia/index.html
git commit -m "Essai isolé : réveiller la scène après changement accueil"
```

Commit précédent : `be408bf2abc2f346c7f3f55b6be8463d623bab9d` ; nouveau commit : `411d6f1c883d233bc5edbcd28ca45e13864b4ac1`. Ces commits appartiennent uniquement au dépôt d'essai, pas à la PR.

Horloge monotone externe, début **avant** `git commit` ; processus scène observé par sondage toutes les 5 ms. Délais observés, sans prétention à une précision garantie du lancement système :

| Événement | Depuis avant `git commit` | Depuis retour de `git commit` |
|---|---:|---:|
| Impact écrit | 209,744788 ms | 205,108390 ms |
| Processus scène observé | 228,997261 ms | 224,360863 ms |
| Chrome prêt (journal) | 892,285441 ms | 887,649043 ms |
| `passage.json` écrit | 3 627,176100 ms | 3 622,539702 ms |
| Sortie complète du surveillant, code 0 | **3 636,044147 ms** | **3 631,407749 ms** |

La création du commit a pris 4,636398 ms. Les mesures internes ont d'autres bornes : `reveil.json.scene_lancee_ms = 138.89386399999967` (détection → lancement), `total_ms = 3547.522665999999` (traitement après détection), `passage.duree_s = 1.668` (coureur seulement). Aucune de ces trois valeurs n'est le temps complet depuis le commit.

Résultat : impact réel au format `horama-impact-1`, bons SHA `depuis`/`vers`, `accueil-vers-bachelor` retenu, `bachelor-vers-msc` écarté pour « page non touchée ». La scène reçoit ce fichier par `--impact`, sans `--tests`, et `--sans-agent --sans-base`. Un clic, deux relevés sur les routes attendues ; seul le test retenu figure dans `passage.json.tests`, passage `joue`, aucune erreur, réveil `termine`.

## Preuve avec présentation visible

Un autre nouveau commit (`884cb65e695e641c42ebef0a229ec67d5152f8ec` → `be408bf2abc2f346c7f3f55b6be8463d623bab9d`) a lancé le même parcours **sans** `--sans-presentation`, avec `CHROME_BIN=/tmp/horama-reveil-preuves/chrome-local` et `--temoins /tmp/horama-reveil-preuves/temoins`. Scène observée à 458,277077 ms, capture de la bulle sélection à 2 366,534065 ms (sondage toutes les 10 ms), sortie complète à **13 966,626535 ms**, depuis avant le commit. Ce passage visible ne respecte pas un critère de durée complète sous 10 s ; le passage sans présentation ci-dessus le respecte.

Vidéo principale et captures de la sélection/récapitulatif jointes à la session de travail et capture de sélection à la PR. La vidéo contient aussi deux tentatives initiales échouées : route Bachelor redirigée avec `/` final, puis redirection en cache Chrome. Le serveur synthétique et le profil d'essai ont été corrigés, **sans changer scène, impact ou agent**. Le passage final visible sort avec 0. Preuves et mesures brutes conservées hors Git ; les fichiers temporaires ne sont pas des dépendances du module.

## Vérifications et limites

- `node --test automatisation/reveil/*.test.mjs` : 5 tests réussis (commits hors site et successifs, fusion, branche reculée, chaînage/JSON/copie du vault, sélection vide et échecs visibles).
- `pnpm install && pnpm -r --if-present run check` : sortie 0 ; relancé après récupération de la branche cible avant ouverture de la PR.
- Intégrité avant/après le navigateur : sommes SHA-256, statut Git et diff du vrai dépôt identiques. Les rapports et références sont écrits dans le vault privé exporté par le réveil. Les connexions TCP du Chrome dédié sont locales seulement (4 pour le passage sans présentation, 5 pour le passage visible), aucun événement H Company ; services Google de Chrome bloqués par résolution locale.
- `--ecrire-references` n'a servi que dans la copie privée : **aucune comparaison aux références graphiques historiques n'est prouvée**. Le récapitulatif visuel ne prouve pas la conformité du vrai site.
- Non vérifiés : vrai site Eugenia, API H, base distante, déploiement Vercel. Le vrai site, ses liens `code:` et les références de démo restent à fournir/valider par les couloirs concernés. Le module ne publie rien. Vercel reste une option documentée, non implémentée.
