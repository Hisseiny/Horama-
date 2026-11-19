# Albert School : passage interrompu par un second onglet (issue #91), 18 novembre 2026

Couloir Nathan. Constat d'Ali (PR #107, commentaire de #91 à 14 h 02) : sur `albertschool.com/en/blog/comment-fonctionne-lalgorithme-de-parcoursup/` (`--max 8 --pages-cliquees 4`), le passage est interrompu deux fois, à 2 puis 1 page sur 8. Exception d'origine : `CDP sans réponse : Page.captureScreenshot`, puis `Input.dispatchMouseEvent` (délai de 15 s de `scene.mjs`), une fois avec 2 onglets ouverts.

## Cause, trouvée sans H

Sonde dans le Chrome dédié de la scène (1280 × 900, profil jetable), sur la vraie page :

- **La page** : 557 Ko de HTML, 142 liens, 15 iframes, 9 346 px de haut. L'adresse `/en/` redirige vers `/fr/`.
- **Liens qui ouvrent un onglet** : 13 liens en `target="_blank"`, dont des liens du menu, visibles en haut de page (« Entreprises partenaires » vers `partners.albertschool.com`, « Institut Margaret », « Pour les organisations »), et le lien vers le Bachelor dans l'article.
- **Onglet seul** : après 3 défilements à la molette, 3 captures de 128 à 644 ms.
- **Après un vrai clic** sur « Entreprises partenaires » (`Input.dispatchMouseEvent`, comme les clics de H) :
  - un second onglet s'ouvre devant, et l'onglet de la scène passe en `hidden` ;
  - `capture()` y prend 5 714 ms, tout de suite comme 30 s plus tard, contre 131 ms au premier plan ;
  - à lui seul, le `Input.dispatchMouseEvent` du début de la capture prend 5 002 ms.
- **Retour au premier plan** : une fois l'onglet ramené devant (`Target.activateTarget`), la capture revient à 140 ms.

La cause : un lien qui ouvre un nouvel onglet emmène la visite dans un second onglet, et la scène continue de relever et de cliquer dans le sien, resté derrière. Chrome y répond tard : 5 s par événement de souris mesurées ici. Avec la charge d'un vrai passage (H, le pont, la page lourde), c'est compatible avec les 15 s dépassées chez Ali. L'autre cas d'Ali, avec un seul onglet, n'est pas reproduit.

## Correction (scène, `scene.mjs`)

`connectTab` garde un seul onglet. Un onglet ouvert par la page de la scène, par un lien `target="_blank"` ou par `window.open`, est fermé dès que son adresse est connue (`Target.setDiscoverTargets`, champ `openerId`). L'adresse s'ouvre alors dans l'onglet de la scène, remis devant. Un onglet ouvert autrement, par CDP, n'est pas touché. Le moteur passe par ce même `connectTab` (`agent/src/browser.ts`), il est donc couvert sans modification.

## Ce qui a été lancé

1. `node --test un-seul-onglet.test.mjs` (dossier `automatisation/scene/`, vrai Chrome, pages locales, sans réseau ni H). Trois cas sont cliqués pour de vrai : un lien `target="_blank"`, un lien `target="_blank" rel="noopener noreferrer"` et un bouton `window.open`. Dans les trois cas :
   - la page s'ouvre dans l'onglet de la scène, il reste un seul onglet, et il est visible ;
   - la capture prend moins de 3 s.

   Un onglet ouvert par CDP n'est pas fermé.
   - Avec la correction : 1 test, réussi.
   - Sans la correction (garde neutralisée) : en échec, « la page /b s'ouvre dans l'onglet de la scène ».
2. La sonde Albert School relancée avec la correction :
   - après le clic sur « Entreprises partenaires », un seul onglet (`partners.albertschool.com`), visible ;
   - `capture()` en 131 ms, puis 135 ms 30 s plus tard.
3. `capture-zone.test.mjs` et `capture-consentement.test.mjs` : réussis.
4. Exploration scriptée (`exploration.mjs --sans-agent --sans-holo`) sur une page locale : code 0.
5. `pnpm -r check` : code 0, 341 tests, 340 réussis, 0 échec.

## Ce qui n'est pas fait ni testé

- Aucun passage réel avec H sur Albert School : à faire seulement sur le go de Nathan.
- **Dégradation propre** : qu'une capture qui échoue rende la page `non_visitee` avec sa raison, sans interrompre le passage. Cela ne se règle pas dans la scène, et c'est demandé à Ali. Aujourd'hui, une exception du crochet `relever` donne à H « Relevé impossible : la capture a échoué. Réessaie ou appelle terminer en échec. » (`agent/src/coureur.ts`) : H peut terminer la session, et le passage s'arrête. Le délai dépassé, lui, donne déjà « Continue les autres relevés ». La demande : traiter l'exception comme le délai, c'est-à-dire mettre la page en `non_visitee` avec la raison (« La capture a échoué : <message> ») et dire à H de continuer.
- Le cas à un seul onglet d'Ali n'est pas expliqué.
