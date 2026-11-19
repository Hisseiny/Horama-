# Réponse sur la PR avec l'exploration, et mémoire des « voulu » (issue #122, points 3 et 4), 18 novembre 2026

Couloir Nathan. Pour la démo du mode dev (#122), la réponse sur la PR doit contenir les constats de l'exploration de tout le site :
- chaque défaut prouvé, avec sa zone ;
- les doutes de Holo à part ;
- le bug ou voulu de l'humain.

Un « voulu » doit être retenu, pour que le constat accepté ne revienne pas au passage suivant. Capture dans le commentaire : option (b) pour l'instant, en texte seul. L'option (a), une branche dédiée du dépôt cible, attend le go de Nathan.

## Ce qui change

- **`pr-doc/commentaire.mjs`** : `ecrireSectionExploration`. La partie de l'exploration contient :
  - le nombre de pages ;
  - les défauts prouvés, chacun avec sa page, sa preuve (« Mesuré … Attendu … »), sa zone en pixels de la capture et sa décision ;
  - les doutes de Holo, à part ;
  - les constats déjà déclarés voulus ;
  - les pages non visitées ;
  - le chemin de la note du passage, où sont les captures entourées.

  Un site non visité ne dit que la raison.
- **`scene/recapitulatif.mjs`** : `dejaVoulu`. Un constat correspond à un « voulu » déjà écrit quand il a même page, même description et une zone qui recoupe.
- **`scene/exploration.mjs`** :
  - **Mémoire des « voulu ».** Les constats déjà voulus sur ce site ne sont plus demandés. Ils sont comptés au récapitulatif (« constats déjà déclarés voulus, non redemandés ») et listés dans la réponse. Le moteur n'applique les décisions qu'aux écarts d'image : ce filtre, côté scène, couvre aussi les contrôles et Holo.
  - **Nouvelle option `--pr`.** La partie de la réponse est écrite dans `scene.json`, et publiée seule avec `--commenter`.
- **`scene/parcours.mjs`** : avec `--pr`, la partie des tests du vault est écrite dans `passage.json` (`commentaire_corps`). Elle n'est publiée qu'avec `--commenter`, comme avant.
- **`reveil/pr.mjs`** :
  - le réveil passe `--pr` à l'exploration ;
  - avec `--commenter`, il publie une seule réponse : la partie des tests du vault, puis celle de l'exploration. Sans tests du vault joués, un titre dit pourquoi (« Langue du site changée (fr → de) : tests de la documentation non joués. », ou aucune note touchée).

## Ce qui a été lancé

1. Tests sans Chrome ni réseau : `reveil/pr.test.mjs` (11 sur 11), `pr-doc/commentaire.test.mjs` (5 sur 5), `scene/recapitulatif.test.mjs` (4 sur 4). Ils couvrent :
   - la réponse unique : les deux parties, le titre sans tests, rien publié si rien n'est écrit, rien sans `--commenter` ;
   - la partie de l'exploration : défauts avec zone et preuve, doutes, déjà voulus, pages non visitées, site bloqué ;
   - la correspondance des « voulu » : même page, description et zone ; pas une décision « bug », pas une autre page ni une zone éloignée.
2. **Point 4, essai sans H ni Holo.**
   - Page locale construite pour l'occasion : `<html lang="de">`, deux pages, et deux boutons de 160 px avec un mot allemand long. « Studienberatungsgespräch » déborde de son bouton ; « Bewerbungsunterlagen » est rogné par `overflow: hidden`.
   - Faux GitHub : une PR qui modifie `src/data/home.ts` et `src/data/programmes.ts`, avec la page locale comme prévisualisation. Copie du vault du clone.
   - Commande : `--une-fois --max 2 --pages-cliquees 0 -- --sans-agent --sans-holo --sans-base`.
   - **Passage 1, réponses `--choix voulu`** :
     - les 3 tests du vault sont écartés, « langue du site changée (fr → de) : tests de la documentation non joués » ;
     - l'exploration visite 2 pages sur 2 et prouve 2 défauts : `debordement` « Le texte dépasse la boîte de son conteneur », mesuré « 245×44 > 184×44 », zone x 40, y 209, 184 × 44 px, sur chaque page ;
     - 2 décisions « voulu » sont écrites.
   - **Passage 2, même PR** : « Déjà déclarés voulus, non redemandés : accueil--controle--1, programme--controle--1 ». Aucune question n'est posée.
   - Le bouton rogné (« Bewerbungsunterlagen ») n'est pas trouvé : c'est le contrôle `texte_rogne` qu'Ali ajoute (#122), pas encore dans `dev`.
   - Réponse reconstruite depuis les dossiers des deux passages, telle qu'elle serait publiée :

```
## Horama : PR #40 (deutsch)

Tests de la documentation : langue du site changée (fr → de) : tests de la documentation non joués.

### Exploration de tout le site de la prévisualisation

http://127.0.0.1:9414 : 2 pages visitées sur 2 trouvées.

**2 défauts de mise en page prouvés.**

#### Défauts prouvés par le code

- / : Le texte dépasse la boîte de son conteneur. Mesuré : 245×44 > 184×44. Attendu : Le contenu tient dans sa boîte.. (zone x 40, y 209, 184 × 44 px sur la capture, décision : voulu)
- /programme : (même défaut, même zone, décision : voulu)
```

   Après l'essai, deux défauts de forme sont corrigés : le double point après « Attendu », et le titre, qui devient « Langue du site changée (fr → de) : tests de la documentation non joués. ». Au passage 2, la réponse dit « **Aucun défaut prouvé.** », puis liste les deux constats sous « Déjà déclarés voulus, non redemandés ».
3. `pnpm -r check` : 380 tests, 377 réussis, 1 échec qui ne vient pas de ce changement : `agent/exploration-reseau.test.ts` (#121) lance `google-chrome`, absent du Mac.

## Ce qui n'est pas testé

- La publication réelle sur une PR : `gh pr comment` n'est appelé que par un double dans les tests. Aucune écriture sur le clone sans le go de Nathan.
- Les captures dans la réponse : option (a), après le go de Nathan.
- La mémoire d'une PR à l'autre : le site de l'exploration est tiré du nom d'hôte, et chaque branche Vercel est un site à part. L'option `site` est demandée à Ali (#122).
- La vraie PR en allemand d'Ali, et `texte_rogne` : à blanc dès qu'ils existent.
- Aucun passage avec H ni Holo.
