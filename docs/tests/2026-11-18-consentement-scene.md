# Revérification des cookies avant capture, dans la scène (suite de la PR #102), 18 novembre 2026

Couloir Nathan. Depuis la #102, l'explorateur passe un 3e argument à `relever(ecran, vue, beforeCapture)` : il revérifie la bannière de cookies juste avant la capture. Le runtime de `agent/src/browser.ts` l'appelait, celui de la scène (`automatisation/scene/exploration.mjs`) ne le transmettait pas (commentaire de Devin sur la #102).

## Ce qui change

- `capture(page, beforeCapture)` de `scene.mjs` : la page est remontée en haut, immobile et sans survol, la couche Horama encore masquée. `beforeCapture` est alors appelé, le texte relu, puis l'image prise. C'est l'ordre de `agent/src/browser.ts`.
- Le `relever` de la scène transmet son 3e argument à `capture`.
- `parcours.mjs` (mode dev) n'est pas touché : il appelle `capture(page)` sans 3e argument, comme avant.

## Ce qui a été lancé

1. `node --test capture-consentement.test.mjs` (dossier `automatisation/scene/`), dans un vrai Chrome, sans réseau ni H. La page locale porte un bandeau de cookies fixé en bas.
   - Sans 3e argument : le bandeau est dans le texte et sur l'image (pixel 640, 850 rouge).
   - Avec un `beforeCapture` qui retire le bandeau : il est appelé une fois, la page déjà remontée (`scrollY` = 0). Le texte relu n'a plus « cookies », l'image est blanche à cet endroit.
   - Avec la vraie revérification du moteur (`dismissCookies` de `agent/src/exploration/cdp.ts`, sur son propre client CDP de l'onglet, comme l'explorateur) : elle répond `true` (« Tout refuser » cliqué), et ni le texte ni l'image n'ont le bandeau.
   - Résultat : 1 test, réussi. `capture-zone.test.mjs` relancé : réussi.
2. Exploration scriptée de bout en bout (`exploration.mjs --sans-agent --sans-holo --sans-base --sans-fin --max 1`) sur une page locale dont le bandeau apparaît 4 s après le chargement, avec et sans le changement. Les deux sortent avec le code 0, et les deux captures sont sans bandeau. Cet essai ne départage donc rien : à 4 s, le bandeau n'était pas encore là au moment du relevé. Il montre seulement que la scène tourne avec le changement.
3. `pnpm -r check` : code 0, 341 tests, 340 réussis, 0 échec. Les tests avec Chrome n'y sont pas, ils se lancent à la main.

## Ce qui n'est pas testé

- Un bandeau qui apparaît entre le premier refus de l'explorateur et la capture, dans une vraie exploration : la fenêtre est trop courte pour la viser avec une minuterie.
- Aucun passage avec H.
