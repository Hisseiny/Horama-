# Répétition de la démo : mode d'emploi

Date : 17 novembre 2026. Couloir Nathan. Déroulé validé : `docs/decisions/2026-11-17-deroule-demo-eugenia.md`.

Ce document dit comment rejouer la démo de bout en bout sur le site d'Eugenia School en ligne, en simple visiteur (aucun formulaire touché, aucune écriture sur le site), et ce qu'on voit à chaque temps. Tant que le fork du site n'est pas là (`docs/decisions/2026-11-17-fork-eugenia.md`), le changement du site est simulé : l'écart est planté dans une **copie** du vault, et la fiche de changement part dans un commit local jetable. Le vault du dépôt n'est jamais modifié.

## Avant de lancer

- Être à la racine du dépôt, sur `dev-nathan` à jour, `pnpm install` fait.
- `.env.local` contient `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (base partagée) et `HF_TOKEN` (modèle de correction de note). Avec `--agent` seulement : `HAI_API_KEY` (jamais `HAI_API_KEY_DEMO` en répétition).
- Aucun Chrome de scène ouvert (port 9333). Le script ferme le sien à la fin.
- **Ne pas cliquer dans la fenêtre Chrome de la scène** : un clic humain passe avant `--choix` (premier essai du 17/11 : un clic a enregistré « bug » au lieu de « voulu »).

## La commande

En scripté (sans agent H, gratuit) :

```
bash automatisation/demo/repetition.sh
```

Avec le vrai agent H (environ 0,03 $ par parcours, mesuré le 17/11) : ajouter `--agent`.

Tout est écrit dans `.orchestrateur/repetition/<horodatage>/` : `vault/` (la copie), `impact.json`, `passage/` (passage, relevés, témoins), `scene.log`.

## Ce que fait le script, dans l'ordre

| Temps du déroulé | Étape du script | Commande lancée |
|---|---|---|
| (préparation) | 1. Copie du vault, écart planté : la référence v1 du Bachelor a le bouton « CANDIDATER → » repeint en gris, la note dit « le bouton est gris » | `node automatisation/demo/preparer-ecart.mjs <dossier>/vault` |
| 2. Le changement | 2. Fiche `bouton-candidater-anglais` (`ecrans_vises: [accueil]`) dans un commit détaché, fait dans un dossier de travail jetable (`../horama-wt/repetition-<horodatage>`, retiré aussitôt ; aucune branche créée) | `git worktree add --detach`, `git commit`, `git worktree remove` |
| 2. Le réveil | 3. Choix des tests entre `HEAD` et ce commit, détail lisible dans le terminal | `node automatisation/impact/impact.mjs --depuis <HEAD> --vers <commit> --logiciel eugenia --json > impact.json` |
| 2 à 6 | 4. La scène : annonce de la sélection, parcours, récapitulatif, question, correction de note, décision | `node --env-file=.env.local automatisation/scene/parcours.mjs --sans-agent --avec-base --base-url https://www.eugeniaschool.com --logiciel eugenia --version 1 --reference 1 --impact impact.json --choix voulu --correction-choix accepter --vault <copie> --sortie <dossier>/passage --fermer-chrome` |
| (contrôle) | 5. Lignes du passage dans la base partagée, décision écrite dans la copie | `node --env-file=.env.local automatisation/demo/compter-base.mjs <passage>` |

## Mesuré le 17/11 à 18 h 27 (passage `2026-11-17-18h27-6377`, scripté)

Code 0, **71 s** de bout en bout.

| Instant | Ce qu'on voit |
|---|---|
| 0 à 1 s | Copie du vault, commit `77bd6af`, sélection : 1 test retenu (`accueil-vers-bachelor`, relève l'accueil), 1 écarté (`bachelor-vers-msc`, page non touchée) |
| 3 s (scène) | Bulle : « Nouvelle version (77bd6af) : 1 test rejoué, 1 écarté : page non touchée. » |
| 12 à 26 s | Parcours : accueil, clic sur « DÉCOUVRIR LE BACHELOR », Bachelor ; mascotte muette, traits |
| 27 s | « J'ai fini. 1 doute. On le regarde ensemble. » puis « Petit récapitulatif : j'ai besoin de toi pour voir certaines choses. » |
| 41 s | « Quelque chose a changé ici, autour de « CANDIDATER → ». Bug ou voulu ? » Réponse : voulu |
| 55 s | **Pas de correction de note proposée** (voir « Ce qui manque ») |
| 69 s | Décision écrite dans la copie du vault (`eugenia/decisions/2026-11-17-bachelor-candidater.md`) et en base, passage `verifie` |

Base : passage `verifie`, 5 événements, 2 captures (accueil, Bachelor), résultat `accueil-vers-bachelor` SUSPECTED, 1 décision « voulu ».

## Ce qui manque par rapport au déroulé

- **Correction de note sur un doute visuel** (temps 6) : le modèle ne reçoit que le libellé de la zone, pas son texte actuel ; il refuse de proposer une correction. Chantier suivant du couloir Nathan.
- **Le vrai changement du site** (temps 2) : simulé par la copie du vault et une fiche sans code. Il faut le fork pour un vrai commit (bouton « Candidater » et sélecteur de langue en anglais).
- **Les trois verdicts du récapitulatif** (temps 4) : la répétition n'en montre qu'un (un doute visuel). La règle `etat` de la nouveauté et la régression qui déborde viennent avec le commit v2 du fork. La cohérence entre pages (hackathons par an) est sur le test écarté ici : elle s'est vérifiée PASS dans le parcours réel `2026-11-17-18h13-f9d4`.
- **Agent H** : la répétition scriptée ne le lance pas ; `--agent` le fait. Le mode scripté ne sait pas cliquer un lien hors de l'écran (pied de page), d'où le choix de la fiche sur l'accueil.

## Après

- La copie et les sorties restent dans `.orchestrateur/repetition/` (hors Git).
- Le commit de la fiche n'est sur aucune branche : Git l'effacera seul au prochain nettoyage.
- La ligne du passage reste dans la base partagée, comme celles des autres essais du 17/11.
