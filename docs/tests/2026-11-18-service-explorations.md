# Service HTTP d'exploration — #68, étape 2

## Vérifications

- `pnpm -r --if-present run check` sous Node 24 : 389 tests réussis (agent : 258 ; jugement : 79 ; mémoire : 34 ; faux SaaS : 10 ; interface : 8), aucun échec. Les trois tests du service utilisent uniquement HTTP sur boucle locale, un DNS et un moteur factices. Ils couvrent CORS, validation (y compris une résolution privée), file et positions, rapport et PNG, 429, 503 et réponse d'erreur sans clé. Le test préexistant avec Chrome derrière le proxy est également passé : la page ne reçoit rien de la boucle locale, d'une adresse de métadonnées ou d'un nom résolu en boucle locale.
- `docker build -t horama-explorations:68 .` : image construite. `docker image inspect horama-explorations:68 --format '{{.Size}}'` : 1 942 279 395 octets. `docker run --rm horama-explorations:68 --help` : affiche l'usage du moteur.
- Démarrage de l'image avec `docker run --rm --memory 1g -p 127.0.0.1:8790:8790 -e PORT=8790 -e HORAMA_MAX_PAGES=3 -e HAI_API_KEY horama-explorations:68`. Une valeur factice a servi pour cet essai HTTP et aucun appel H n'a été effectué. Après démarrage, `GET /sante` : 200 `{"ok":true}` ; `POST /explorations` avec `{"url":"http://127.0.0.1/"}` : 400 ; `OPTIONS /explorations` : 204. Le premier appel lancé avant que le serveur écoute a reçu `curl: (56) Recv failure: Connection reset by peer` ; l'appel avec attente du démarrage a obtenu 200 sur le même build.
- `docker stats --no-stream` : 31,54 Mio au repos, limite 1 Gio. Ce n'est pas une mesure de Chrome en exploration.

## Reprise avec comptes séparés et exploration réelle

- `pnpm -r --if-present run check` sous Node 24 : 390 tests réussis, aucun échec (259 côté agent, dont le test du lanceur sous le compte Chrome).
- `docker build -t horama-explorations:68-isolated .` : image construite, 1 945 920 192 octets selon `docker image inspect`. Le mode `--help` reste disponible sans clé.
- `docker run --rm --memory 1g -p 127.0.0.1:8790:8790 -e PORT=8790 -e HORAMA_MAX_PAGES=3 -e HAI_API_KEY horama-explorations:68-isolated` : essai avec la clé de développement dédiée injectée par l'environnement, jamais affichée. `POST /explorations` sur `https://eugenia-school-website.vercel.app` : 202, place 0. Le suivi retourne un rapport `horama-exploration-1` final, HTTP 200, état `fini`, 3 pages visitées sur 3. Le PNG indiqué par le rapport répond HTTP 200 `image/png` (516 709 octets, 1280 × 900).
- Pendant ce passage, `docker exec -u node -e HAI_API_KEY= …` a vérifié le propriétaire effectif du processus moteur via `/proc/177/status` et la présence de la variable dans `/proc/177/environ`, sans afficher sa valeur. `docker exec -u horama-chrome -e HAI_API_KEY= …` a identifié Chromium (PID 32) sous `horama-chrome`, sans la variable. Sous ce même compte, les tentatives de lecture de `/proc/177/environ` et de liste de `/data` ont chacune renvoyé `Permission denied` ; `ptrace(PTRACE_ATTACH, 177)` a renvoyé `EPERM`. Le rapport et le PNG servis par HTTP attestent que le moteur a écrit ses fichiers sous `/data`.
- `docker stats` : plus haut échantillon **541,90 Mio** sous une limite de 1 Gio, sur 160 échantillons. `memory.events` : `oom 0`, `oom_kill 0`. Ce résultat vaut pour cet essai de trois pages, pas pour le plafond de huit pages ni pour Railway.

## Non vérifié, avant mise en ligne

- Vérifier l'isolation effective et la mémoire sur Railway avant de publier le domaine. Si un volume est monté, préserver l'accès privé à `/data`. L'interdiction des soumissions s'appuie toujours sur les consignes de visite et les filtres existants ; ce n'est pas un blocage général de toutes les écritures dans Chrome.
- Aucun déploiement Railway ni test de l'extension connectée au vrai service. La file et les quotas sont en mémoire, pour une seule réplique ; un volume ne suffit pas à reprendre l'index des passages après redémarrage.
