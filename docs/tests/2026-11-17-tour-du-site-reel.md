# Tour du site d'Eugenia en réel, sur le Mac de démo (couloir Nathan)

Date : 17 novembre 2026, 19 h 05. Test `tour-du-site` (PR #46 d'Ali), accepté par Nathan le 17/11. Site en ligne https://www.eugeniaschool.com, en simple visiteur : aucun formulaire, un seul parcours.

## Avant le passage

**Références des 4 pages manquantes** (processus d'admission, Notre ADN, campus de Paris, FAQ), prises sur ce Mac avec la `capture` de la scène (pointeur sorti, aucun survol) par `.orchestrateur/references-eugenia.mjs` (hors Git) : trois captures par page, à 4 s puis 8 s du chargement, puis 6 s après un nouveau chargement.

| Page | 4 s contre 8 s | 4 s contre nouveau chargement |
|---|---|---|
| processus-admission | 0 pixel | 0 pixel |
| notre-adn | 0 pixel | 0 pixel |
| campus-paris | 0 pixel | 0 pixel |
| faq | 0 pixel | 0 pixel |
| accueil (déjà en référence) | 0 pixel | 252 128 pixels, x 680 à 1239, y 167 à 726 : la photo du haut, déjà déclarée dans `zones_ignorees` |
| bachelor, msc (déjà en référence) | 0 pixel | 0 pixel |

Aucun contenu qui bouge sur les 4 nouvelles pages : aucune `zones_ignorees` ajoutée. La capture de 4 s devient `references/<ecran>/defaut--v1.png`. Captures du jour de l'accueil, du Bachelor et du MSc contre leurs références existantes : 0 pixel (photo de l'accueil exclue).

**Les 14 témoins sur cet écran** (`.orchestrateur/temoins-eugenia.mjs`, même normalisation que le juge, `key()` de `jugement/verification/values.ts`) sur les textes de page des captures ci-dessus : **14 sur 14 trouvés**, dont les 6 titres écrits avec un retour à la ligne (la ligne est lue comme une espace, des deux côtés).

## Le passage

Commande (copie du vault pour l'essai, réponses automatiques pour ne pas attendre de clic ; aucune n'a servi) :

```
node --env-file=.env.local automatisation/scene/parcours.mjs --base-url https://www.eugeniaschool.com --logiciel eugenia --version 1 --reference 1 --tests tour-du-site --choix bug,bug,bug,bug,bug,bug,bug,bug,bug,bug --correction-choix refuser --vault <copie> --sortie <dossier> --temoins <dossier> --fermer-chrome
```

| Mesure | Valeur |
|---|---|
| Passage | `2026-11-17-19h05-1b54`, code de sortie 0 |
| Relevés | 7 sur 7, dans l'ordre : `/`, `/programme/bachelor-ia-business`, `/programme/master-ia-business-alternance`, `/processus-admission`, `/notre-adn`, `/campus/paris`, `/faq` |
| Durée du coureur | 148,5 s (153 s de bout en bout pour la scène) |
| Étapes H | 27, aucune relance |
| Clics vus par la couche | 16, retard ajouté de 768 à 922 ms par clic |
| Relevé le plus long | 294 ms |
| Coût retourné par H | 0,0716 $ |
| Bilan de la mascotte | « J'ai fini. Tout est bon. » : 7 bons, 0 problème, 0 doute, 0 sans conclusion |
| Base partagée | passage `verifie`, 27 événements, 7 captures (1280 × 900), résultat `tour-du-site` PASS, 0 décision |
| Replay H | https://agp.eu.hcompany.ai/share/api/v1/trajectories/4c0d0ecb-80dc-4186-b9d9-a5b45ff442ba (accès public non vérifié) |

### C4 par règle (constats de la scène, `passage.json`)

| Écran | Statut | Calcul |
|---|---|---|
| accueil | PASS | « L’ÉCOLE DE L’IA APPLIQUÉE AU BUSINESS. », « École IA, école tech et école growth, hors Parcoursup » affichés |
| bachelor | PASS | « BACHELOR AI APPLIED TO BUSINESS », « L'entrepreneuriat, l'IA et l'automatisation te branchent ? » affichés |
| msc | PASS | « MSC IA APPLIQUÉE AU BUSINESS », « Le Master en alternance de l’école de l’IA appliquée au business » affichés |
| processus-admission | PASS | « CANDIDATER. BACHELOR OU MSC. », « // ÉCOLE IA, TECH ET GROWTH · PROCESSUS D'ADMISSION » affichés |
| notre-adn | PASS | « DES PROFILS QUI SE DISTINGUENT. », « Eugenia est une école IA, tech et growth, hors Parcoursup, née d’une conviction. » affichés |
| campus-paris | PASS | « UN CAMPUS QUI VIT. », « Le campus d’une école IA hors Parcoursup : une verrière, un amphithéâtre, des salles où l’on construit. » affichés |
| faq | PASS | « TU AS DES QUESTIONS. », « École IA hors Parcoursup : admissions, Bachelor, Master en alternance, frais, financement. » affichés |

En base, le coureur garde un seul résultat par test (`tour-du-site` PASS) ; le détail par règle est celui de la scène.

### Écarts d'image

Aucun constat visuel. Relevés du passage contre les références v1 du vault : **0 pixel sur les 7 pages** (photo du haut de l'accueil exclue, zone déclarée).

## Ce qui reste à savoir

- Deux étapes H « Agit dans le navigateur » (26 et 27) arrivent après « Termine le parcours » (25), à 144 s : origine non cherchée (relance muette du coureur ou réponse finale), sans effet sur les relevés.
- Un seul passage : la stabilité sur plusieurs tours est à mesurer.
