# Scène : sonde T7 (navigateur local)

Sonde jetable de `docs/decisions/2026-11-16-scene-en-direct.md` : l'agent H joue un parcours sur Facturo dans un Chrome local visible, un curseur posé dans la page suit ses clics, nos captures sont prises par CDP à chaque `relever`.

- Installer : `pnpm install --ignore-workspace` dans ce dossier (seule dépendance : `pngjs`).
- Avec l'agent (clé `HAI_API_KEY`, outil `holo` installé) : `node --env-file=<.env.local> automatisation/scene/sonde-t7.mjs`
- Sans H (le script fait lui-même les clics, par CDP) : `node automatisation/scene/sonde-t7.mjs --sans-agent --passes 2 --sortie automatisation/scene/essais/captures --rapport automatisation/scene/essais/rapport.md`
- Options : `--passes 3`, `--port 9333`, `--profil <dossier>`, `--sortie <dossier>`, `--rapport <fichier.md>`, `--garder-chrome`. Variables : `FAUX_SAAS_URL`, `CHROME_BIN`, `HOLO_BIN`, `HAI_AGENT_MODEL`, `HAI_AGENT_REASONING`. Sortie : 0 critère tenu (ou montage qui marche avec `--sans-agent`), 1 non tenu, 2 il manque quelque chose (clé, `holo`, Chrome), 130 Ctrl+C.
- Mesures, écrites dans le rapport (`docs/tests/2026-11-16-t7-navigateur-local.md` par défaut) : zone de page et densité de pixels, puis par passe la durée, les étapes, le coût, les relances, les clics vus par la couche avec l'élément touché, et les captures comparées pixel par pixel à la passe 1 et aux références sans tête.
- Fichiers : `sonde-t7.mjs` (parcours, rapport), `scene.mjs` (Chrome, CDP, captures), `couche-curseur.js` (curseur dans la page), `agent-h.mjs` (pont `holo`, session H). Ce qui vient de Nami est dit en tête de chaque fichier.
