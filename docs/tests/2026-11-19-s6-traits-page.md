# S6 : un trait appartient à sa page et à ce qu'il entoure (19/11)

Retour de Nathan sur la vidéo du Louvre : à 1:23, les quatre ronds de l'accueil restent par-dessus le méga-menu « Visiter » ouvert par H ; à 2:47 et 2:54, des ronds de l'accueil reviennent sur d'autres pages. Cause vue sur la vidéo : louvre.fr change de page sans nouveau document (son propre routeur) ; la couche ne redessinait ses traits qu'à chaque nouveau document, en coordonnées de page, au-dessus de tout. Les ronds de l'accueil sont réapparus sur une autre page au même endroit (x 30 à 250 dans les deux images).

## Ce qui change (`couche-horama.js`)

- Toutes les 300 ms et après chaque défilement : si l'adresse a changé, les traits de l'adresse quittée sont retirés et ceux de la nouvelle adresse dessinés (sans animation).
- Chaque trait retient l'élément sous le milieu de sa zone (au dessin, ou la première fois que la zone est à l'écran). Si l'élément au milieu n'est plus celui-là, ni un de ses parents ou enfants (un menu, une fenêtre, une barre collante par-dessus), le trait s'efface (160 ms) ; il revient quand la zone est dégagée. Une zone hors de l'écran garde son état.

## Ce qui a été lancé, et ce qui en est sorti

- `traits-page.test.mjs` (nouveau, Chrome local, sans H) : un site local avec son routeur (`history.pushState`) et un menu fixe qui s'ouvre par-dessus la zone. Le trait, retrouvé sur des captures par sa couleur miltos, est dessiné, se cache sous le menu ouvert, revient quand il se ferme, part au changement d'adresse et revient avec son adresse. Il passe ; sans le changement, il échoue (« le trait se cache sous le menu »).
- Tests de la scène : 8 fichiers, 0 échec.
- Page d'essai de la charte (sans H) : le trait miltos du lien et les points ocre du prix sont toujours dessinés.

## Ce qui n'est pas testé

Avec H, sur louvre.fr et le clone : passage filmé de vérification (après S2 et S9). Un carrousel qui fait glisser la zone cache aussi son trait (l'élément au milieu change) : voulu, à vérifier sur la vidéo.
