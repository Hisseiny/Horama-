# #170 — Comparaison des traductions, 19 novembre 2026

## Prévisualisation de la PR Eugenia #16

Relevé en simple visiteur sur [la page école allemande](https://eugenia-school-website-git-devin-179503024-b6c714-ahissein-5983.vercel.app/ecole), avec Chrome 156.0.8078.47 à 1280 × 900, DPR 1. Le moteur utilise `prepareCapture` puis `controlerPage` avec `maxLiens: 0` et la comparaison activée. Le chronomètre couvre `controlerPage`, après chargement de la page inspectée. Aucun formulaire manipulé.

La page déclare `de` et n’annonce aucune version française. En 25 ms, le contrôle par mots outils a émis un `VERIFIED_FAIL` pour « Pendant trois ans, chaque étudiant mène un vrai projet de création d’entreprise… », sous « Starten. Testen. Neu anfangen. » : 28 mots, 6 mots outils français, 0 allemand. Aucun débordement mécanique n'a été relevé sur cette page.

## Comparaison des deux révisions

Les deux versions ont été construites avec `pnpm install --frozen-lockfile && pnpm build` dans des arbres de travail séparés : [tête allemande de la PR #16](https://github.com/Hisseiny/eugenia-school-website/commit/998767b7869cc566696c1cb5c69d2bcf61555c15), [base française](https://github.com/Hisseiny/eugenia-school-website/commit/3725b94e020426e4944854ab0069a60e5dd8435c). Le serveur de mesure a servi les deux builds sur la même origine, le français sous `/fr/`. Sur chaque document DE testé, il a ajouté uniquement un `link rel="alternate" hreflang="fr"` vers son équivalent FR. Les contenus et styles étaient ceux des builds.

| Page | Résultat comparé |
| --- | --- |
| `/ecole` | Le paragraphe témoin est identique dans les deux versions et figure une seule fois au résultat, avec la mesure par mots outils et la comparaison. Deux titres de 5 mots restent en français et sont prouvés par la comparaison (« Ce qui nous fait avancer. » et « Ils enseignent ce qu'ils font. »). Six mots isolés restent des doutes. Aucun débordement attribué à la traduction. |
| `/` | Un débordement prouvé, capture côte à côte : « Zertifikatskurs » mesure 158 × 35 px dans une boîte de 120 × 35 px, où « Certifiant » tient. |
| `/programmes` | Trois débordements prouvés, captures côte à côte : les libellés « 1. / 2. / 3. Studienjahr » mesurent chacun 129 × 89 px dans une boîte de 96 × 89 px. Les libellés français des mêmes composants tiennent. |
| `/admissions` | Deux mots isolés identiques classés en doutes. Aucun débordement attribué à la traduction. |

Sur `/ecole`, trois relevés locaux sans comparaison ont duré 26, 17 et 15 ms. Les trois relevés avec comparaison ont duré 1 752, 1 745 et 1 757 ms. Écart des médianes : **1 735 ms**. La comparaison a chargé une page FR par relevé, avec ses ressources, et consulté `robots.txt`. Coût API ajouté : **0**, aucun appel à H, Holo ou Hugging Face dans le contrôle. Le temps d'un parcours H complet n'a pas été mesuré ici.

## Cas Chrome sans réseau externe

`node --test agent/exploration-controles.test.ts` exerce un serveur local. Bouton de deux mots identiques prouvé, mot isolé en doute, exclusions de visibilité et de contenu, débordement en DE seul avec PNG côte à côte, débordements ordinaires dans les deux versions ou sans composant apparié, aucun chargement FR en l’absence d’annonce.

Le moteur compare une référence de même origine, lorsque le site indique un autre lien de langue unique ou une référence `x-default` non ambiguë. Un sélecteur fondé sur des liens de langue requiert aussi un lien retour. En l'absence de référence exploitable, le contrôle par mots outils peut encore signaler le texte long. La capture comparée est exposée dans la preuve du constat d'exploration.
