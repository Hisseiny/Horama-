# Déroulé de la démo sur le site d'Eugenia School

Date : 17 novembre 2026. **Validé par Nathan**, écrit tel qu'il l'a donné : le mode développeur dans la journée, le mode visuel le soir. Facturo est abandonné : plus de démo de secours.

**Mise à jour du 17/11 au soir : plus de copie locale du site.** La démo se joue d'abord sur le site en ligne (https://www.eugeniaschool.com), puis sur le fork quand l'école l'accorde. La copie locale `site-eugenia/` (E0) est abandonnée.

## Où se joue la démo

1. **Le site en ligne, dès maintenant.** En simple visiteur : aucun formulaire touché, un parcours à la fois, aucune écriture sur le site. Le site ne change pas sous nos mains : le changement est simulé. L'écart est planté dans une **copie** du vault (la note et la référence d'image disent autre chose que le site), et la fiche de changement part dans un commit local jetable qui réveille Horama comme le ferait un déploiement. Le vault du dépôt n'est jamais modifié. Mode d'emploi : `docs/demo/2026-11-17-repetition.md` (`bash automatisation/demo/repetition.sh`).
2. **Le fork, quand l'école l'accorde** (demandes : `docs/decisions/2026-11-17-fork-eugenia.md`). Le vrai code du site, déployé à une adresse de l'équipe non indexée. Le commit v2 (la nouveauté et la régression plantée) est un vrai changement du site, et son déploiement réveille Horama.

Le déroulé du mode développeur est le même dans les deux cas ; seul le temps 2 change (changement simulé, puis vrai commit).

## Mode développeur

1. Le vault Obsidian du site d'Eugenia : une note par page, en français, avec des règles de cohérence (un même chiffre réel affiché sur deux pages).
2. Un développeur pousse une PR : le bouton « Candidater » et un sélecteur de langue passent en anglais. Le déploiement réveille Horama, qui lit la PR et sa fiche de changement et choisit les tests à rejouer, en montrant aussi ceux qu'il écarte. Sur le site en ligne : la fiche part dans un commit local, l'écart est planté dans la copie du vault.
3. L'agent H parcourt le site en direct dans Chrome ; la mascotte suit sans parler, traits colorés.
4. Récapitulatif, trois verdicts : la nouveauté est là (règle etat), une régression est trouvée (un bouton traduit qui déborde, ou une page sans rapport qui a bougé), la cohérence entre pages tient (calcul).
5. Une image avant/après pour chaque écart.
6. L'humain tranche bug ou voulu ; le vault se met à jour ; en option, une PR de documentation part sur GitHub.

Sur le site en ligne, le temps 4 ne peut montrer ni la nouveauté ni la régression réelles : le site n'a pas changé. Il montre les règles tenues (tour du site : 7 règles `etat` PASS ; hackathons par an : PASS) et l'écart planté dans la copie (un doute). La nouveauté et la régression arrivent avec le commit v2 du fork.

### Consignes de Nathan qui l'accompagnent

- **Le commit v2** (la nouveauté et la régression plantée) se code dans le fork, une fois l'accès reçu. Avant de le coder, son contenu exact est écrit en 5 lignes à Nathan : la nouveauté, la régression plantée, la page sans rapport touchée.
- **Leçon de J6c** : la règle `etat` de la nouveauté a un texte témoin qui s'affiche après l'action et reste là même quand la fonction casse ; sinon la casse sort `INCONCLUSIVE` au lieu d'un défaut prouvé (condition 1 d'Ali, D7 section 3).
- **La sélection écarte au moins un test à l'écran** (temps 2) : le vault a au moins un test qui ne relève qu'une page non touchée par la v2. Sur le site en ligne, c'est déjà le cas (`bachelor-vers-msc` écarté, « page non touchée »).
- **Réveil** : sur le site en ligne, un commit local réveille la scène (fiche de changement, `automatisation/impact/`, puis la scène). Sur le fork, le déploiement à l'adresse de l'équipe la réveille, seulement après l'accord de l'école.

## Mode visuel

Validé par Nathan le 17/11 au soir. Texte d'origine : commentaire de l'issue [#57](https://github.com/Hisseiny/Horama-/issues/57#issuecomment-6957302010). Ce que verra le jury :

1. **L'adresse** : on colle l'adresse d'un site dans Horama (ex. eugeniaschool.com). Pas de documentation, pas d'accès au code.
2. **La visite** : Horama trouve les pages (plan du site, puis liens) ; trois agents H se les partagent et les visitent en direct, chacun dans sa fenêtre Chrome.
3. **Deux regards sur chaque page** : les contrôles automatiques (défauts prouvés : page en erreur, image cassée, texte qui déborde de son bouton, lien mort, « undefined » affiché, plus tard l'accessibilité chiffrée, #55) et Holo qui regarde la capture comme un humain (des doutes).
4. **Le récapitulatif** : chaque défaut avec sa capture entourée ; l'humain tranche bug ou voulu.
5. **Le passage suivant** : Horama a gardé les captures ; au passage suivant (ou après une mise à jour du site), il compare et signale ce qui a bougé, puis propose de passer en mode développeur (documentation et GitHub) pour aller plus loin.

Moteur : issue #57 (Ali, `agent/`). Affichage : la scène (couloir Nathan), qui lit le fichier `horama-exploration-1` (`docs/decisions/2026-11-17-format-exploration.md`). Le mode visuel se joue sur le site en ligne, en simple visiteur, sans attendre le fork. Pendant la démo, personne d'autre ne lance d'agent sur le compte H (3 sessions simultanées par organisation).
