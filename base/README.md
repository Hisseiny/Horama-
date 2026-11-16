# base

Installer (une fois, dans `base/`) : `pnpm install --ignore-workspace`
Appliquer la migration, depuis la racine du repo : `node --env-file=.env.local base/appliquer.mjs`
Vérifier sans appliquer : `node --env-file=.env.local base/appliquer.mjs --verifier`
