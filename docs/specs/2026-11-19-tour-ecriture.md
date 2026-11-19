# Tour de contrôle en écriture : contrat entre le service et la tour (19/11)

Recopié tel quel de l'issue [#238](https://github.com/Hisseiny/Horama-/issues/238) le 19/11 au soir. L'issue fait foi si les deux divergent.

## Tour de contrôle en écriture : 8 écrans du Figma, connexion, on tranche dans la tour (Léon + couloir Nathan)

Décision de Nathan (19/11, ~18 h 15). La tour de contrôle devient l'effet « waouh » du pitch : **les 8 écrans du Figma d'Axil, à l'identique, sur de vraies données, et la tour peut écrire** (trancher, accepter un test). Cette issue est le **contrat** entre le couloir de Léon (service Railway) et le couloir Nathan (tour et réveil), pour coder en parallèle.

## Le déroulé du pitch, comme le public le voit

1. Léon pousse un commit sur la PR #16 (allemand) du clone `Hisseiny/eugenia-school-website`.
2. Vercel construit la prévisualisation ; le réveil (sur le Mac de Nathan) se réveille seul.
3. À l'écran : l'agent H visite le site, curseur, mascotte, traits (la scène, déjà prouvée).
4. À la fin, **sans question dans la scène**, Chrome bascule sur la tour, écran « À relire » (11.6) de ce passage : captures entourées, défauts prouvés, doutes, durée, coût.
5. Nathan, connecté, clique « C'est un bug » ou « C'est voulu » : la tour écrit par le service Railway ; quand tout est tranché, le réveil publie la réponse sur la PR.
6. La tour montre le reste : couverture, tests, comparaison avec le passage précédent, doc à corriger, historique.

## Décisions de Nathan

- Le passage du pitch tourne sur le Mac (réveil + scène). Railway sert la tour.
- On tranche dans la tour, pas dans la scène.
- Écriture protégée par **l'écran de connexion du Figma** : un seul compte d'équipe, vérifié par Railway, qui garde la clé GitHub. Sans connexion : tout se voit, en lecture.
- **Vraies données ou état vide honnête** : jamais de données d'exemple (Facturo, Jane Doe, v13, « 14/40 PRO »).

## Contrat du service (couloir de Léon, `agent/scripts/exploration-service.mjs`)

CORS : `https://horama-gold.vercel.app` (et `http://127.0.0.1:*` pour les tests). Aucun secret dans le dépôt : tout en variables Railway.

| Route | Accès | Rôle |
|---|---|---|
| `POST /tour/session` `{email, mot_de_passe}` | libre, 5 essais par minute et par IP | `200 {jeton, expire_le, nom}` ou `401`. Jeton signé (HMAC, `TOUR_SECRET`), 12 h. Compte : `TOUR_EMAIL`, `TOUR_MOT_DE_PASSE_HASH` (scrypt), `TOUR_NOM`. |
| `GET /tour/donnees` | libre | `{index, vault, explorations, agent}` : `index` = `index.json` de `horama/captures` du clone ; `vault` = `[{chemin, contenu}]` de `vault-horama/eugenia-clone/` du dépôt Horama- (branche `dev`) ; `explorations` = les explorations récentes du service (id, url, etat, date, pages, defauts, doutes, duree_s, cout_usd) ; `agent` = disponible ou non, file d'attente. Lu par l'API GitHub **côté serveur** avec le jeton (plus de limite de 60 par heure ni de cache de 5 min côté visiteur), cache serveur de 10 s. |
| `POST /tour/decision` | jeton (`Authorization: Bearer`) | `{passage, constat, decision: "bug" \| "voulu"}`. Écrit la décision (`decision`, `par`: TOUR_NOM, `le`: ISO) dans l'entrée du passage de `index.json` (branche `horama/captures` du clone) **et** une note de décision dans `vault-horama/eugenia-clone/decisions/` (dépôt Horama-, `dev`). Un commit par décision ; en cas de conflit de SHA, relire et réessayer. `409` si déjà tranché. |
| `POST /tour/test` | jeton | `{test, action: "accepter" \| "refuser" \| "modifier", task?, verification?}` : met à jour le test dans le vault (`accepte_par`, `accepte_le`, ou refus). |
| `POST /tour/doc` | jeton | `{note, correction, action}` : accepte ou refuse une correction de note (11.7). Si le temps manque, la route peut répondre `501` et l'écran le dit. |

Clé GitHub : un jeton à grain fin créé par Léon, limité à `Hisseiny/Horama-` et `Hisseiny/eugenia-school-website`, droit Contents en lecture et écriture, rangé seulement dans la variable Railway `GITHUB_TOKEN_TOUR`. Le mot de passe du compte d'équipe : Nathan le donne à Léon de vive voix, jamais sur GitHub.

Tests sans réseau : connexion bonne et mauvaise, jeton expiré ou falsifié, écriture sans jeton (`401`), conflit de SHA, double décision (`409`).

## Couloir Nathan (tour et réveil)

- **Tour** : les 8 écrans du Figma (11.1 à 11.8) + l'écran de connexion, lus par `GET /tour/donnees` (repli : raw.githubusercontent.com), écriture par les routes ci-dessus quand on est connecté. 11.3 montre le direct du service pour une exploration en cours ; pour un passage de PR, il dit qu'il tourne sur la machine de démo. 11.5 compare les captures d'une même page entre deux passages (PR #16 contre la copie corrigée PR #19 après la boucle verte). 11.7 vide et honnête tant qu'aucun « voulu » n'existe.
- **Réveil** : une option qui, à la fin du passage, publie captures et entrée d'index **avec `duree_s` et `cout_usd`** et sans décision, ouvre la tour sur « À relire » de ce passage (adresse du passage à son commit, pour échapper au cache), attend que tout soit tranché (lecture des décisions toutes les 5 s, au plus 10 min), puis publie la réponse sur la PR avec les décisions ; au-delà de 10 min, publie avec « à trancher ».

## Ordre

1. Léon : routes `session` et `donnees`, puis `decision` (indispensables au pitch), puis `test`, puis `doc`. Une PR par étape si ça va plus vite.
2. Couloir Nathan : tour sur `donnees` d'abord (lecture), connexion et 11.6 en écriture, puis le réveil, puis les autres écrans.
3. Répétition complète sur la copie PR #19 du clone (un passage H, go de Nathan), puis test de A à Z de Nathan.

