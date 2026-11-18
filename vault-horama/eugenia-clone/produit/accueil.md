---
ecran: accueil
url: /
# La page, et le fichier de données qui porte ses textes (blocs « Trouver le programme… » et « Ce que tu vas apprendre »).
code: ["src/pages/index.astro", "src/data/home.ts"]
vues: []
# Deux lectures du 18/11 à 1280 × 900 : 0 pixel d'écart sur le premier écran, aucune zone à ignorer.
zones_ignorees: []
---

# Accueil

Relevé le 18/11 sur le clone servi en local (commit `4e7dd32`), texte de la page tel qu'affiché.

En haut de page : « 18 rue de Paradis, Paris 10e », le titre « Eugenia School », puis « L'école de l'IA appliquée au business. Bachelor et Master en alternance, hors Parcoursup. » et deux boutons, « Candidater » et « Voir les programmes ». La photo de deux étudiants occupe la moitié droite.

Le bloc « Trouver le programme qui te correspond » présente quatre entrées :
- « Après le bac » : « Bachelor IA Applied to Business », « Trois ans, hors Parcoursup. Premier projet en entreprise dès le semestre 1. », lien « Découvrir le Bachelor » ;
- « Après un Bac+2 » : « Bachelor, 3e année en alternance », lien « Découvrir la 3e année » ;
- « Après un Bac+3 ou +4 » : « MSc IA Applied to Business », « Deux ans en alternance pour basculer vers l'IA et la data. », lien « Découvrir le Master » ;
- « Pour les entreprises » : « Recruter, co-construire », lien « Travailler avec nous ».

Le bloc « Ce que tu vas apprendre, et construire. » écrit chaque durée juste au-dessus du nom du programme : « 3 ans » puis « Bachelor IA Applied to Business », « 2 ans » puis « MSc IA Applied to Business ».

Plus bas, « Futur étudiant » annonce « La candidature en 4 étapes, hors Parcoursup, gratuite pour les résidents UE » et « Les portes ouvertes du 12 décembre, sur le campus ». Le bloc « Ta prochaine étape. » reprend « Portes ouvertes, 12 décembre » et « Quatre étapes, hors Parcoursup, depuis ton espace candidat. ».

Les chiffres animés du bloc « De là où ils étaient à là où ils sont. » montent depuis 0 quand ils entrent à l'écran : un relevé pris en haut de page lit « 0 h » et « 0 ». Aucune règle ne porte sur eux.

## Règles

- La durée du Bachelor écrite au-dessus de « Bachelor IA Applied to Business » est celle de la ligne « Durée » de la page [[programmes]] : voir [[regles-entre-pages]].
- La durée du MSc écrite au-dessus de « MSc IA Applied to Business » est celle du MSc sur la page [[programmes]] : voir [[regles-entre-pages]].
