# « Envoyer Horama » sans ailes (décision de Nathan, 19/11 au soir)

- Tour : `.run-button::before, ::after { content: none; }` dans `tour.css`. Ni les ailes de la mascotte (ajoutées par #247), ni celles du prototype ne reviennent ; la règle de la barre repliée qui les cachait est simplifiée. `accueil/tour/` reconstruit.
- Accueil : les deux boutons « Envoyer Horama » de `accueil/index.html` perdent leurs deux `svg.aile`. Les styles `.bouton .aile` d'`accueil/envoye.css` restent : la page de la marque (`accueil/marque.html`, fiche de la charte) s'en sert encore, non touchée ici.

## Vérifié

Chromium, `accueil/` servi en local, 1440×900 et 390×844 : tour barre ouverte et barre repliée (`content` des pseudo-éléments à `none`), accueil (0 aile sur 2 boutons) ; aucune page plus large que la fenêtre. Captures : `2026-11-19-sans-ailes/`.
