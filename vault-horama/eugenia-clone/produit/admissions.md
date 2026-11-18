---
ecran: admissions
url: /admissions
# La page, et le fichier de données des étapes, des chiffres et des questions.
code: ["src/pages/admissions.astro", "src/data/admissions.ts"]
vues: []
# Langue de la page (<html lang>) : une prévisualisation dans une autre langue écarte les tests de cette page (réveil par PR, #122).
langue: fr
# Production de main (3725b94), 18/11, 1280 × 900 : deux lectures sans zone d'écart pour le moteur (photos à 3/255 au plus), aucune zone à ignorer.
zones_ignorees: []
---

# Admissions

Relevé le 18/11 sur le clone servi en local (commit `4e7dd32`), texte de la page tel qu'affiché ; texte identique sur la production de `main` (`3725b94`, après les PR #11 et #14 du clone), relevée le même jour.

Fil d'Ariane « Accueil / Admissions », titre « Admissions », puis « Quatre étapes, hors Parcoursup. La candidature est gratuite pour les résidents de l'Union européenne. »

« Comment se passe ta candidature. » décrit quatre étapes :
1. « Candidature en ligne » : « Ton dossier, en ligne. Gratuit pour les résidents UE. »
2. « Étude d'éligibilité » : « L'équipe d'admission étudie ton dossier. », puis « Réponse sous 10 jours. »
3. « Entretien d'admission » : « Trois temps : faire connaissance, un casse-tête logique, tes motivations. »
4. « Décision finale » : « Réponse sous 10 jours. La rentrée a lieu en septembre, uniquement. »

Trois chiffres suivent : « 0 € » (« pour candidater, si tu es résident de l'Union européenne »), « 4 étapes » (« de ton dossier à la décision finale ») et « Septembre » (« pour la rentrée 2027 »). Le chiffre des étapes monte depuis 0 quand il entre à l'écran : un relevé pris en haut de page lit « 0 étapes » alors que le code de la page porte « 4 étapes ». Aucune règle calculée ne porte sur lui.

Puis « Pour les parents » (« Ce qui doit vous rassurer. ») et les questions fréquentes, dont « Combien coûte la candidature ? ».

Le bouton « Commencer ma candidature » mène au vrai formulaire HubSpot de l'école : aucun test ne l'ouvre.

## Règles

- Le nombre d'étapes de la candidature est le même ici (« Quatre étapes ») et sur l'[[accueil]] (« La candidature en 4 étapes »). À vérifier à l'œil : les deux s'écrivent en lettres d'un côté et en chiffres de l'autre, au milieu d'une phrase.
