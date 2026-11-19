# S7 : jamais de trait autour de rien (19/11)

Retour de Nathan sur la vidéo du Louvre (2:22 et 2:52) : des ronds autour de rien. Ce sont les zones de 1 px de large des faux débordements sur du texte réservé aux lecteurs d'écran (constats `visiter-plan-acces-transports--controle--1` et `visiter-venir-en-groupe--controle--1`, mesures 252 × 22 et 285 × 22 dans une boîte de 1 × 22). Ali les retire côté contrôles (#186) ; la scène ne doit de toute façon jamais dessiner autour d'une zone invisible.

## Ce qui change

- `couche-horama.js`, `surligner` : une zone de moins de 4 px dans une dimension n'est ni gardée ni dessinée.
- `couche-horama.js`, `element` : un élément non visible (`checkVisibility` avec opacité et visibilité : caché, transparent, ou découpé pour les lecteurs d'écran) ou de moins de 4 px n'a pas de zone.
- `exploration.mjs`, `showPage` : les zones de moins de 4 px sont écartées avant d'appeler la mascotte (pas d'expression ni de vol pour rien).

## Ce qui a été lancé, et ce qui en est sorti

- `zones-invisibles.test.mjs` (nouveau, Chrome local, sans H) : un texte en `clip` de 1 px, un paragraphe à `opacity: 0`, un autre en `visibility: hidden` n'ont pas de zone ; une zone de 1 × 22 px n'est pas gardée ; le titre visible est entouré. Il passe ; sans le changement de la couche, il échoue (« lecteur : pas de zone »).
- Tests de la scène : 7 fichiers, 0 échec (le test de la mascotte a échoué une fois au premier tour, puis 3 fois de suite sans échec : instabilité déjà notée la nuit du 18 au 19/11).

## Ce qui n'est pas testé

Avec H : passage filmé de vérification, après S2 et S9.
