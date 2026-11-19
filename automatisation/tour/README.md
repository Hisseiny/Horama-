# Tour de contrôle (#149, #238)

Les passages d'Horama et leurs constats, en ligne, sur données réelles seulement. C'est le prototype d'Axil (Figma Make, PR #216, `docs/da/interface-envoye/prototype/`), copié ici et branché sur le service Horama, avec GitHub en repli. Le résultat construit est servi par la page d'accueil : https://horama-gold.vercel.app/tour/ (`accueil/tour/`, commité, car horama-gold ne construit rien).

## Ce qui est montré

| Écran du prototype | En ligne | Source |
|---|---|---|
| 11.8 Passages et rapports | oui, à l'ouverture | l'index des passages (entrée par une PR) et les explorations du service ou envoyées depuis ce navigateur (entrée par une adresse) ; le journal des décisions de l'index |
| 11.4 Rapport de passage | oui | les constats d'un passage, chacun sur sa capture : entourée par la scène (entrée par une PR), ou avec le trait miltos ou les points ocre dessinés ici (`src/trait.js`, la charte) sur la capture brute du service (entrée par une adresse) |
| 11.6 À relire | oui, et on y tranche une fois connecté | les constats, ceux sans décision d'abord, de tous les passages ou d'un seul (`#relire/<cle>`) ; la décision et son auteur viennent de l'index. Un cas d'un passage par une PR se tranche ici (« C'est un bug », « C'est voulu ») ; une exploration par une adresse garde le lien vers son rapport |
| Connexion (`#connexion`) | oui | le compte d'équipe vérifié par le service (`POST /tour/session`) |
| 11.1, 11.2, 11.3, 11.5, 11.7 | non | aucune source réelle : rien d'exemple n'est mis en ligne. Le journal de l'agent étape par étape de 11.8 non plus |

Les sources (`src/donnees.ts`), dans cet ordre :
- **le service Horama** (#238) : `GET <service>/tour/donnees` donne `index` (l'index des passages, entrée par une PR), `vault` (les notes de `vault-horama/eugenia-clone/`), `explorations` (les explorations récentes du service, entrée par une adresse) et `agent`. Le service lit GitHub avec sa clé : ni limite de 60 appels par heure, ni cache de 5 min côté visiteur. Par défaut, le service Railway (`https://explorations-production-70bf5b38.up.railway.app`, celui de `accueil/service.js`) ;
- **le repli GitHub**, si le service ne répond pas ou répond 404 (route pas encore en ligne) : l'index sur https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/horama/captures/index.json, écrit par le réveil après chaque réponse sur une PR du clone (`automatisation/reveil/README.md`, « L'index des passages »), mis en cache 5 min par GitHub ; le vault par `public/vault-manifeste.json` (la liste de ses fichiers, écrite au build) puis chaque note sur raw ;
- **entrée par une adresse**, dans les deux cas : la clé `horama-explorations` du `localStorage` de horama-gold, écrite par `accueil/envoye.js` à chaque envoi (id, service, adresse, date ; 30 au plus), plus les explorations que liste le service, sans doublon par id ; chacune relue sur son service (`GET /explorations/:id`, `horama-exploration-1`). Une exploration que le service ne garde plus est signalée, jamais remplacée.

La barre latérale dit quelle source a servi : « Données : service Horama » ou « Données : GitHub (service injoignable) ». La durée et le coût d'un passage par une PR viennent des champs `duree_s` et `cout_usd` de son entrée d'index, quand le réveil les écrit.

Paramètres de l'adresse :
- `?service=<url>` remplace le service ; seuls `http://127.0.0.1:<port>`, `http://localhost:<port>` et l'adresse Railway sont acceptés (une autre adresse est refusée, et dite) ;
- `?index=<sha>` : dans le repli GitHub, lit l'index à ce commit de la branche `horama/captures`, ce qui échappe au cache de 5 min ; sans effet si le service répond ;
- `#relire/<cle>` : « À relire » sur un seul passage (`dev:<passage>`, la même clé que `#rapport/<cle>`), avec un lien « Tous les cas à relire ». Le réveil ouvre `…/tour/?index=<sha>#relire/dev%3A<passage>`.

## Connexion et écriture (#238)

Sans connexion, tout se lit ; les boutons de 11.6 sont visibles mais désactivés, avec « Connectez-vous pour trancher ». L'écran de connexion (`#connexion`, repris de `interface/login/` sans compte d'exemple, SSO ni mot de passe oublié) envoie `POST <service>/tour/session {email, mot_de_passe}` ; le jeton, `expire_le` et `nom` sont gardés dans le `sessionStorage` de l'onglet (retirés quand ils expirent), puis la page revient à l'écran d'où l'on venait. La barre latérale montre le nom et « Se déconnecter », ou « Se connecter ».

Connecté, « C'est un bug » ou « C'est voulu » envoie `POST <service>/tour/decision {passage, constat, decision}` avec `Authorization: Bearer <jeton>` : `passage` est le champ `passage` de l'entrée d'index, `constat` l'`id` du constat. Le cas passe aussitôt dans « Déjà tranchés » (qui, quand), puis les données sont relues. Erreurs dites sur le cas : 401 « Session expirée : reconnectez-vous » (et déconnexion), 409 « Déjà tranché » (et relecture), autre « Le service n'a pas pu écrire ».

Le faux service local (`faux-service.mjs`, testé par `node --test faux-service.test.mjs`) imite le contrat de #238 sans rien écrire sur GitHub, pour essayer la tour avant le vrai service :

```
node automatisation/tour/faux-service.mjs --port 8788
```

puis la tour construite, servie en local (`python3 -m http.server 8765 --bind 127.0.0.1` depuis `accueil/`), sur http://127.0.0.1:8765/tour/?service=http://127.0.0.1:8788. `--index <fichier>` lui donne un autre index (par exemple sans décisions, pour trancher). Compte du faux service : `equipe@horama.test`, mot de passe `essai-local` (un faux compte, pas un secret).

Le manifeste du vault se régénère après `git fetch origin dev`, avant le build : `node automatisation/tour/scripts/manifeste-vault.mjs`.

Les écrans de la tour sont dans `src/tour/` (ils reprennent les feuilles de style, la barre latérale, le logo et la mascotte du prototype) ; `interface/` reste le prototype d'origine, dont seuls les styles et les icônes sont utilisés.

## Construire

Les dépendances (React, Vite, Tailwind, TypeScript ; environ 96 Mo) s'installent à part, hors de l'espace de travail pnpm du dépôt :

```
pnpm --dir automatisation/tour install --ignore-workspace
```

Puis, depuis `automatisation/tour/` :

```
./node_modules/.bin/tsc --noEmit -p tsconfig.json
FIGMA_PUBLIC_URL=. ./node_modules/.bin/vite build --outDir ../../accueil/tour --emptyOutDir
```

`FIGMA_PUBLIC_URL=.` donne des chemins relatifs : la tour marche sous `/tour/`. Pour retirer les dépendances : supprimer le seul dossier `automatisation/tour/node_modules`.

Le fichier de verrouillage du prototype a été refusé par la règle de délai de pnpm (`minimumReleaseAge` : `source-map-js@1.2.3`, publié la veille) ; `pnpm-lock.yaml` est une nouvelle résolution qui la respecte (`source-map-js@1.2.2`).
