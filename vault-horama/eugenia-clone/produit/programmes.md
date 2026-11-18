---
ecran: programmes
url: /programmes
# La page, et le fichier de données du tableau « Bachelor ou Master ? » (lignes Durée, Rythme, Admission...).
code: ["src/pages/programmes.astro", "src/data/programmes.ts"]
vues: []
# Deux lectures du 18/11 à 1280 × 900 : 0 pixel d'écart sur le premier écran, aucune zone à ignorer.
zones_ignorees: []
---

# Programmes

Relevé le 18/11 sur le clone servi en local (commit `4e7dd32`), texte de la page tel qu'affiché.

Fil d'Ariane « Accueil / Programmes », titre « Programmes », puis « Deux entrées, un même socle en IA, data et no-code. Et des certifications pour valider une compétence précise. ». À 1280 × 900, le titre est coupé en « Programm » et « es » sur deux lignes.

Le tableau « Bachelor ou Master ? » compare les deux programmes, une ligne par critère :

| Critère | Bachelor | MSc |
|---|---|---|
| Pour qui | Après le bac. Ou après un Bac+2, en entrée directe en 3e année. | Après un Bac+3 ou un Bac+4. |
| Durée | 3 ans | 2 ans |
| Rythme | Cours et projets, puis 3e année en alternance | En alternance |
| Admission | Hors Parcoursup | Hors Mon Master |
| Bacs acceptés | Terminale générale, toutes spécialités, ou STMG | Licence, bachelor ou équivalent |
| Titre | Titre RNCP 41143, Concepteur de solutions no code | Titre RNCP 41993, Architecte en intelligence artificielle |

Ce tableau n'est pas un tableau HTML : le texte de la page met chaque case sur sa ligne (« Durée », puis « 3 ans », puis « 2 ans »). La ligne « Durée » se lit donc comme la durée du Bachelor seule.

Puis deux blocs : « 3 ans, après le bac » au-dessus de « Bachelor IA Applied to Business » (années 1 à 3 : « Le socle », « Ta trajectoire », « L'alternance »), et « 2 ans, après un Bac+3 ou +4 » au-dessus de « MSc IA Applied to Business ». Enfin les deux certifications, « Concepteur de solutions no code » et « Architecte IA ».

## Règles

- La « Durée » du Bachelor est celle de l'[[accueil]] : voir [[regles-entre-pages]].
- La durée du MSc est celle de l'[[accueil]] : voir [[regles-entre-pages]].
