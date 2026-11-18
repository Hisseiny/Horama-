# Méthode commune des deux orchestrateurs

Pour l'orchestrateur Claude Code (Fable 5.2) de Nathan et celui d'Ali. Chacun pilote Devin CLI (Fable 5.2) sur sa moitié. Spec : `docs/specs/2026-11-16-technique.md`. Contrats : `contrats/`.

## 1. Rôle de l'orchestrateur

Tu ne codes pas toi-même, sauf un correctif de quelques lignes après une revue. Tu découpes, tu écris le brief de chaque tâche, tu lances Devin, tu vérifies toi-même le résultat (tu ne crois jamais le rapport de Devin sur parole), tu fusionnes dans ton couloir, tu tiens le journal, tu publies des captures. Tu vas au bout de ta liste de tâches sans demander, sauf à la porte de direction et dans les cas d'arrêt (section 8).

## 2. Mise en place (une fois)

1. Le repo est cloné ; `git fetch` ; la branche `dev` contient l'étiquette `contrats-v1` (sinon : arrêt, la frontière n'est pas posée).
2. Branche de couloir : `git checkout -b dev-<prenom> origin/dev` puis `git push -u origin dev-<prenom>`.
3. Clés : un seul fichier `.env.local` à la racine du repo (jamais commité, jamais affiché, jamais lu par toi : tu ne fais que lancer des scripts qui l'utilisent). Les applications Next.js y accèdent par un lien `interface/.env.local -> ../.env.local` (idem `faux-saas/`). Si une variable manque, crée la ligne vide, ouvre le fichier dans TextEdit (`open -a TextEdit .env.local`) et demande à la personne de coller la valeur.
4. **T0** : un script `scripts/verifier-cles-<prenom>.mjs` (dans ton couloir) appelle chaque service et n'affiche que le nom du service et le code HTTP. Tout à 200 ou arrêt.
5. **T6** : lance Devin sur une tâche jouet (créer `docs/tests/t6-<prenom>.md` contenant la date) selon la section 3. Go : fichier créé, sortie 0, moins de 5 minutes. Sinon, passe au pilotage interactif (section 4).

## 3. Lancer une tâche Devin (mode non interactif)

```
git worktree add ../horama-wt/<tache> -b <tache> dev-<prenom>
cd ../horama-wt/<tache>
devin -p --prompt-file ../../horama/.orchestrateur/briefs/<tache>.md \
  --model claude-fable-5-2-high --permission-mode dangerous \
  --respect-workspace-trust false --export ../../horama/.orchestrateur/logs/<tache>.md
```

- Toujours en arrière-plan (`run_in_background`), une seule tâche Devin à la fois par défaut, deux au plus si elles touchent des dossiers disjoints.
- `.orchestrateur/` est ignoré par Git (ajoute-le à `.gitignore` de ton couloir si absent).
- Un worktree par tâche : deux agents ne partagent jamais un dossier.
- Une session Devin neuve par tâche (le contexte grossit vite) ; pour une correction après revue : `devin -c -p "…"` dans le même worktree.

## 4. Repli : pilotage interactif (si T6 échoue)

Devin tourne dans un onglet Ghostty ouvert par la personne, dans le worktree, après qu'elle a tapé `/bypass` (tu n'as pas le droit de le taper). Tu envoies le brief par AppleScript (`tell application "Ghostty"`, cibler le terminal par `id` dont le `name` commence par `devin`, `input text` puis `send key "enter"`, relire l'écran, renvoyer l'Entrée si le texte est resté dans la saisie). Pas de guillemets doubles dans le texte envoyé. Lecture de l'écran par `write_screen_file:copy` seulement si l'action a réussi et que le chemin finit par `screen.txt`. Après chaque `/clear`, demander à la personne de retaper `/bypass`.

## 5. Le brief d'une tâche (gabarit)

```
# Tâche <id> : <titre>
Repo Horama, couloir <prenom>, worktree courant, branche <tache>.
Lis d'abord : AGENTS.md ; docs/specs/2026-11-16-technique.md (sections <n>) ; contrats/types.ts ; <fichiers utiles>.
But : <une phrase>.
Tu ne modifies que : <dossiers>. Interdit : contrats/, base/migrations/001_init.sql, fichiers de la racine (sauf couloir Ali), le dossier de l'autre couloir, tout .env*.
À faire : <liste courte>.
Fini quand (je le vérifierai moi-même) : <commande ou observation exacte>.
Installations permises : dépendances npm de ton paquet par pnpm. Interdit : installation globale, brew, téléchargement de navigateurs ou de modèles (Playwright passe par `channel: "chrome"`, le Chrome installé).
Données : n'invente aucun chiffre ; une valeur inconnue s'écrit « à mesurer ».
À la fin : commit sur ta branche (message en français), sans pousser ; écris .orchestrateur/rapports/<tache>.md : fait, comment tester, non testé, problèmes. Si tu es bloqué, écris BLOQUE et la raison en première ligne de ce rapport et arrête-toi.
```

## 6. Revue avant fusion (toi, à chaque tâche)

1. `git diff --name-only dev-<prenom>...<tache>` : aucun fichier hors des dossiers permis. Sinon, refus.
2. `pnpm install` puis `pnpm -r --if-present run check` (types, lint, tests) : vert.
3. Tu rejoues toi-même le critère « fini quand » (commande, appel réel, page ouverte). Un critère d'interface se vérifie par capture (`playwright-core`, `channel: "chrome"`, 1440 de large) que tu regardes.
4. Tu relis le diff : contrats respectés champ par champ, pas de clé en dur, pas de donnée inventée, pas de code mort.
5. OK : `git checkout dev-<prenom> && git merge --no-ff <tache>` puis `git push`. Sinon : correction par `devin -c -p` (deux tentatives au plus), puis la tâche passe en BLOQUE et tu continues avec la suivante qui n'en dépend pas.
6. `git worktree remove` après fusion.

## 7. Journal, captures et livraisons

- `docs/journal-<prenom>.md`, une entrée par tâche : heure, tâche, résultat vérifié (avec la commande), décision, blocage. Commité sur le couloir.
- Captures de chaque étape franchie dans `docs/captures/2026-11-16-<etape>/` (PNG + une planche `index.html` qui les montre côte à côte), commitées.
- À chaque jalon (fin d'un groupe de tâches qui marche), ouvre une pull request `dev-<prenom>` vers `dev` avec `gh pr create` (titre, ce qui marche, comment le vérifier, ce qui n'est pas testé), donne son lien. La personne fusionne. Ne fusionne jamais toi-même dans `dev` ou `main`, ne pousse jamais dessus.
- Après chaque fusion dans `dev`, fais `git merge origin/dev` dans ton couloir pour récupérer le travail de l'autre.
- Pour tester l'assemblage sans attendre une fusion : worktree jetable qui fusionne `origin/dev-<autre>` ; rien n'est poussé depuis ce worktree (spec section 13).
- Mardi 8 h : Nathan et Ali fusionnent les PR ouvertes ; si le temps ou le quota manque avant, coupe dans l'ordre de la spec section 13.

## 8. Quand t'arrêter et parler à la personne

- À la porte de direction de ton couloir (une seule).
- Une clé ou un compte manque.
- Un changement de contrat paraît nécessaire : écris la proposition dans `docs/decisions/` et préviens ; continue sur ce qui n'en dépend pas.
- Le quota Devin passe sous 20 % (page app.devin.ai/settings/usage) ou trois tâches de suite échouent.
- Ton propre contexte dépasse environ 60 % : écris l'état dans le journal (fait, reste, pièges), puis demande à la personne de relancer une session avec le même prompt et « reprends depuis docs/journal-<prenom>.md ».

## 9. Règles fixes

- Jamais de clé affichée, commitée, ou collée dans un brief. Jamais `HAI_API_KEY_DEMO` en développement.
- Quota H : 3 sessions simultanées par organisation, partagées entre les deux couloirs si la clé vient de la même organisation. Toujours `queue: false` ; sur 429, attendre 30 s et réessayer, 3 fois au plus. Le couloir Nathan n'ouvre jamais plus d'une session H à la fois.
- Pièges mesurés de l'API H : dans `AGENTS.md`.
- Documentation et journaux en français, code en anglais, pas de tiret cadratin ni demi-cadratin dans les textes visibles.
