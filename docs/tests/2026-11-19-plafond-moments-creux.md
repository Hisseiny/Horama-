# Plafond du service et moments creux

- Installation : `pnpm install`, terminée avec pnpm 12.18.0. Aucun répertoire `.husky`, fichier `.pre-commit-config.yaml` ou hook Git actif trouvé ; seulement les exemples Git.
- Environnement Node chargé depuis `~/.nvm/nvm.sh` (pnpm absent du PATH initial).
- Plafond : 380 et 420 secondes acceptées ; 421 refusé. Le défaut reste 240 secondes. Test isolé avant tout démarrage du service, sans réseau.
- Lecture : dimensions CDP 966/900 → aucun défilement ; 3000/900 → cinq petits défilements. Mesure absente ou exception CDP → ancienne consigne.
- Fin autonome : H simulé relève toutes les pages sans appeler terminer, puis attend son arrêt. L'explorateur transmet lui-même `terminer(etat="reussi")` au coureur et ferme la session. Une erreur due à cette suppression ne transforme pas le rapport en interruption : `etat="fini"`, agents `etat="fini"`, valeurs aussi vérifiées dans exploration.json. Une fermeture non confirmée reste une interruption.
- Chrome du service : `--lang=fr-FR` et préférence `intl.accept_languages="fr-FR,fr"` pour l'en-tête français ; protection WebRTC conservée.

## Vérifications

`node --test agent/exploration-explorer.test.ts agent/container.test.mjs` :

```text
ℹ tests 91
ℹ suites 0
ℹ pass 91
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Vérification complète : `CHROME_BIN=/opt/.devin/chrome/chrome/linux-156.0.8078.47/chrome-linux64/chrome pnpm -r --if-present run check`, code de sortie 0. Le premier lancement utilisant le shim google-chrome de la machine restait bloqué dans exploration-pages.test.ts ; arrêté, puis relancé avec le binaire Chrome explicite, sans modification des tests de découverte.

Fin de la sortie :

```text
agent check: ℹ tests 302
agent check: ℹ suites 0
agent check: ℹ pass 302
agent check: ℹ fail 0
agent check: ℹ cancelled 0
agent check: ℹ skipped 0
agent check: ℹ todo 0
agent check: ℹ duration_ms 20523.095168
agent check: Done
```

Pas d'appel réel à H, aucune clé de démonstration utilisée. Pas de vérification visuelle ni de mesure de gain de temps réel. L'en-tête français n'a pas été relevé sur un service déployé ; la préférence de profil est testée hors ligne.
