# Coureur : vues YAML et zones ignorées (#35)

- `pnpm install` : terminé, pnpm 12.18.0, aucune nouvelle dépendance.
- `pnpm -r --if-present run check` : code de sortie 0 ; agent : 87 tests, 87 réussites, 0 échec.
- Les fixtures remplacent `vues:` si présent ; la consigne couvre aussi une note qui possède déjà ce champ.
- La vérification C4 du coureur lit `zones_ignorees` via `lireNotes`, indexé par `entete.ecran`, comme la scène. Format : liste de rectangles `{ x, y, largeur, hauteur }`, coordonnées en pixels.
- Des PNG synthétiques de 40 × 10 pixels vérifient six pixels modifiés dans la zone (PASS, aucun écart), puis hors zone (SUSPECTED, un écart). Champ absent et liste vide conservent le doute ; YAML illisible donne INCONCLUSIVE.
- Aucun appel H, aucune clé, aucune modification de Facturo ni du vault. Aucun parcours navigateur réel effectué.
