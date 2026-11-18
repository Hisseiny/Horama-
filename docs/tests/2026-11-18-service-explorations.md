# Service HTTP d'exploration — #68, étape 2

## Vérifications

- `pnpm -r --if-present run check` sous Node 24 : 389 tests réussis (agent : 258 ; jugement : 79 ; mémoire : 34 ; faux SaaS : 10 ; interface : 8), aucun échec. Les trois tests du service utilisent uniquement HTTP sur boucle locale, un DNS et un moteur factices. Ils couvrent CORS, validation (y compris une résolution privée), file et positions, rapport et PNG, 429, 503 et réponse d'erreur sans clé. Le test préexistant avec Chrome derrière le proxy est également passé : la page ne reçoit rien de la boucle locale, d'une adresse de métadonnées ou d'un nom résolu en boucle locale.
- `docker build -t horama-explorations:68 .` : image construite. `docker image inspect horama-explorations:68 --format '{{.Size}}'` : 1 942 279 395 octets. `docker run --rm horama-explorations:68 --help` : affiche l'usage du moteur.
- Démarrage de l'image avec `docker run --rm --memory 1g -p 127.0.0.1:8790:8790 -e PORT=8790 -e HORAMA_MAX_PAGES=3 -e HAI_API_KEY horama-explorations:68`. Une valeur factice a servi pour cet essai HTTP et aucun appel H n'a été effectué. Après démarrage, `GET /sante` : 200 `{"ok":true}` ; `POST /explorations` avec `{"url":"http://127.0.0.1/"}` : 400 ; `OPTIONS /explorations` : 204. Le premier appel lancé avant que le serveur écoute a reçu `curl: (56) Recv failure: Connection reset by peer` ; l'appel avec attente du démarrage a obtenu 200 sur le même build.
- `docker stats --no-stream` : 31,54 Mio au repos, limite 1 Gio. Ce n'est pas une mesure de Chrome en exploration.

## Non vérifié, avant mise en ligne

- La clé dédiée `HAI_API_KEY` n'était pas injectée dans cette session. L'exploration réelle de `https://eugenia-school-website.vercel.app`, le suivi jusqu'au rapport final, la récupération d'une capture réelle par HTTP et le pic de RAM sous limite 1 Gio restent à vérifier avec cette clé.
- Chrome ne reçoit pas la clé en variable d'environnement, mais tourne encore sous le même compte Unix que le moteur. L'isolation par comptes distincts et sa preuve restent un prérequis avant d'exposer le service. L'interdiction des soumissions s'appuie sur les consignes de visite et les filtres existants ; ce n'est pas un blocage général de toutes les actions d'écriture dans Chrome.
- Aucun déploiement Railway ni test de l'extension connectée au vrai service. La file et les quotas sont en mémoire, pour une seule réplique ; un volume ne suffit pas à reprendre l'index des passages après redémarrage.
