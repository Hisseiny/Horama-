# #68 — refus du réseau privé (avant tout déploiement public)

## Verdict

Dans le conteneur, Chrome et les fetch Node du moteur refusent toute requête
vers une adresse de boucle locale, privée, link-local, de métadonnées ou du
réseau interne Railway, y compris quand un nom se résout vers une telle
adresse. Tests hors réseau externe : **5/5 réussis** sur la VM (Chrome for
Testing 156.0.8078.47) et **5/5 réussis dans l'image Docker lancée avec
`--network none`** (Chromium 156.0.8078.79). `pnpm -r --if-present run check`
vert (agent : 252 tests réussis, 0 échec).

## Choix et justification

- **Proxy HTTP local devant Chrome** (`agent/src/exploration/reseau.ts`,
  `startPublicProxy`), lancé par `agent/scripts/container.mjs` avec
  `--proxy-server=http://127.0.0.1:<port>` et `--proxy-bypass-list=<-loopback>`
  (supprime l'exception implicite de Chrome pour `localhost`/`127.0.0.1`).
  Toutes les requêtes réseau de Chrome passent par lui : documents,
  sous-ressources, fetch/XHR, beacon ; HTTPS et WebSocket via `CONNECT`.
  Chrome ne résout plus aucun nom lui-même : le proxy résout une seule fois,
  vérifie **toutes** les adresses renvoyées, puis se connecte à l'adresse
  vérifiée (pas de seconde résolution, donc pas de « DNS rebinding »).
- Écarté : `Fetch.enable` sur tous les types de ressources. Il voit l'URL mais
  pas l'IP à laquelle Chrome se connecte (une résolution moteur puis une
  résolution Chrome peuvent différer), ne couvre pas les WebSocket et entre en
  conflit avec le `Fetch.enable` déjà utilisé par le pont H et le moteur.
  `--host-resolver-rules` ne sait pas filtrer selon l'IP résolue.
- **WebRTC** sort en UDP hors proxy. Mesuré : le drapeau
  `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` laisse passer
  5 paquets STUN vers 127.0.0.1 ; la préférence de profil
  `webrtc.ip_handling_policy = disable_non_proxied_udp`
  (`writePublicChromePreferences`) : 0 paquet. C'est elle qui est utilisée.
- **Fetch Node** (robots, sitemaps, pages, résolution des redirections,
  contrôle des liens) : `fetchPublic`, même résolution contrôlée, connexion à
  l'IP vérifiée, chaque redirection revérifiée (20 au plus), GET/HEAD seuls.
  Les appels à l'API H restent sur le `fetch` global.
- Adresses refusées : `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`
  (dont `169.254.169.254`), `172.16/12`, `192.0.0/24`, `192.168/16`,
  `198.18/15`, multicast et réservé (`224/4`, `240/4`), `::`, `::1`,
  IPv4 mappée en IPv6 (contrôlée comme l'IPv4), `64:ff9b::/96`, `2002::/16`,
  `fc00::/7` (le réseau privé Railway est en `fd12::/16`), `fe80::/10`,
  `ff00::/8`, et les noms `localhost`, `*.local`, `*.internal`
  (dont `*.railway.internal`).
- **Option explicite** `--reseau-public`, désactivée par défaut : le mode dev
  et la scène continuent de visiter `localhost`. Le conteneur l'active
  toujours et refuse qu'on la repasse. Réponse du proxy : 403
  « Adresse refusée par Horama. » pour une adresse privée, 502 si le nom ne
  se résout pas.
- Aucune dépendance ajoutée (modules Node intégrés). `Dockerfile` inchangé :
  le conteneur copie déjà `agent/`.

## Ce qui a été lancé

`agent/exploration-reseau.test.ts` (`node --test`, dans `pnpm run check`) :

1. Classement des adresses : 20 adresses privées, de boucle, link-local, de
   métadonnées, IPv6 privées et IPv4 mappées refusées ; 6 adresses publiques
   acceptées (dont `172.32.0.1` et `172.15.255.255`, juste hors de `172.16/12`).
2. `fetchPublic` : `127.0.0.1`, `[::1]`, `2130706433`, `0x7f.1`,
   `localhost`, `app.railway.internal`, `169.254.169.254`, un nom résolu en
   `127.0.0.1` ou en `169.254.169.254` (HTTP et HTTPS) et une redirection d'un site « public » vers les métadonnées
   sont refusés, **sans aucune requête reçue** par le serveur local ;
   redirection et gzip fonctionnent vers le site autorisé.
3. L'option est absente par défaut et lue par la ligne de commande.
4. Proxy brut : 7 requêtes (HTTP absolu, `CONNECT` en IPv4, IPv6, nom résolu
   en 127.0.0.1, IPv4 mappée) refusées, 0 requête reçue par le serveur
   local ; une requête HTTP et un `CONNECT` vers une adresse autorisée sont
   relayés.
5. **Chrome derrière le proxy**, page servie par CDP (aucun réseau) qui tente :
   `fetch('http://127.0.0.1:…')`, `fetch('http://169.254.169.254/…')`, fetch
   vers un nom résolu en 127.0.0.1, fetch `[::1]`, XHR, image, script,
   feuille de style, iframes, `sendBeacon`, WebSocket direct et via un nom
   résolu en 127.0.0.1, WebRTC/STUN vers 127.0.0.1, puis navigation vers
   127.0.0.1. Résultat : **0 requête reçue par le serveur local, 0 paquet
   UDP**, fetch/XHR/WebSocket en erreur, la navigation affiche le refus.

Dans l'image Docker (`docker build`, puis `--network none`, 2 GiB) :

- la même suite : 5/5 ;
- `container.mjs --url http://127.0.0.1:8080/ --max 2 --sans-base` avec un
  serveur local dans le conteneur et une clé H factice (aucun accès réseau,
  donc aucune session H) : « Découverte impossible :
  http://127.0.0.1:8080/robots.txt : Adresse privée refusée : 127.0.0.1. »,
  0 page visitée, sortie 1, **le serveur local n'a reçu aucune requête**.
  Le proxy journalise aussi les appels de fond de Chromium (mises à jour
  Google), refusés faute de réseau.

## Non testé

- Passage réel avec H et un site public HTTPS à travers le proxy dans le
  conteneur (aucun passage H fait ; le relais `CONNECT` vers une adresse
  autorisée est testé en local seulement).
- Sites publics en IPv6, HTTP/2 ou QUIC à travers le proxy (Chrome n'utilise
  pas QUIC derrière un proxy HTTP).
- Performance du proxy sur 15 pages ; mémoire à mesurer.
- Le pont `holo` ouvre-t-il des connexions de Chrome hors du profil lancé ?
  Il se rattache au CDP du Chrome existant : à vérifier lors du premier
  passage H dans le conteneur.
- `--no-sandbox` reste nécessaire (voir `2026-11-18-a68-conteneur.md`) : le
  filtrage réseau ne remplace pas l'isolation du processus.
