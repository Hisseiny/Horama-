# Adresse du service en ligne (#68) : page d'accueil et extension

Date : 18/11, soir. Branche `nathan-68-adresse-service`. Aucune exploration lancée, aucune session H.

## Ce qui change

- `accueil/service.js` : `SERVICE = "https://explorations-production-70bf5b38.up.railway.app"` (le service d'Ali sur Railway). `RAPPORT_URL` reste vide : le suivi s'écrit sous le champ.
- `extension/service.js` : `DEFAULT_SERVICE` = la même adresse. Les options de l'extension peuvent toujours la remplacer (par exemple `http://127.0.0.1:8787` pour le faux service).
- `extension/README.md` : l'adresse par défaut indiquée.

## Ce qui a été lancé, et ce qui en est sorti

1. `curl` sur `GET /sante` : `200 {"ok":true}`.
2. `curl -X OPTIONS /explorations` avec `Origin: https://horama-gold.vercel.app`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type` : `204`, `access-control-allow-origin: *`, `access-control-allow-methods: GET, POST, OPTIONS`, `access-control-allow-headers: Content-Type`.
3. Même préflight avec `Origin: chrome-extension://…` : mêmes en-têtes, `204`.
4. Chrome sans écran sur la page d'accueil en ligne (https://horama-gold.vercel.app) : `fetch` de `/sante` = `200 {"ok":true}` ; `fetch` de `GET /explorations/inconnu` avec `Content-Type: application/json` (préflight forcé) = `404 {"erreur":"Exploration inconnue."}`, lisible par la page, donc le CORS passe.
5. L'extension de cette branche chargée dans Chrome : depuis sa page d'options (origine `chrome-extension://`), l'adresse par défaut lue dans `service.js` est celle de Railway ; `/sante` = `200`, le GET préflighté = `404 {"erreur":"Exploration inconnue."}`, lisible.

Scripts d'essai (hors dépôt) : `cors.mjs` et `ext.mjs`, dans le dossier temporaire de la session.

## Ce qui n'est pas testé

- L'envoi réel d'une adresse (`POST /explorations`) : il lance une exploration et consomme la clé H d'Ali. Il attend le go de Nathan.
- La page d'accueil en ligne pointe encore vers `127.0.0.1:8787` tant que cette PR n'est pas fusionnée dans `dev` (Vercel se redéploie au push sur `dev`).
- Le `.zip` de l'extension pour le jury n'est pas refait : `sh extension/empaqueter.sh` après la fusion.
