---
id: tour-du-site
logiciel: eugenia
source: produit/accueil.md
releves: [{ ecran: accueil, vue: defaut }, { ecran: bachelor, vue: defaut }, { ecran: msc, vue: defaut }, { ecran: processus-admission, vue: defaut }, { ecran: notre-adn, vue: defaut }, { ecran: campus-paris, vue: defaut }, { ecran: faq, vue: defaut }]
url_depart: /
version_cible: "1"
timeout_s: 240
statut: accepte
accepte_par: Nathan
accepte_le: 2026-11-17
---

# Tour du site d'Eugenia : sept pages par les liens et le menu

## Setup
Sur la page d'accueil du site d'Eugenia School, en haut de page, sans être connecté, menu fermé.

## Task
1. Si une bannière de cookies s'affiche, la fermer en refusant les cookies. Ne remplir aucun formulaire.
2. Parcourir une seule fois les sept pages ci-dessous, uniquement par les liens et le menu du site. Ne jamais taper une adresse après l'ouverture initiale de l'accueil. Ne pas ouvrir les formulaires de candidature, brochure ou contact.
3. L'accueil est affiché en haut de page, menu fermé : appeler relever(ecran="accueil", vue="defaut").
4. Cliquer sur « DÉCOUVRIR LE BACHELOR ». Une fois la page du Bachelor chargée, menu fermé et en haut de page, appeler relever(ecran="bachelor", vue="defaut").
5. Pour les pages suivantes, utiliser le bouton burger « Ouvrir le menu » en haut de page : les rubriques du menu supérieur sont accessibles par ce bouton. Ouvrir « PROGRAMMES + », puis cliquer sur « MSc IA Applied to Business ». Une fois la page du MSc chargée, menu fermé et en haut de page, appeler relever(ecran="msc", vue="defaut").
6. Ouvrir le burger « Ouvrir le menu », puis « ADMISSIONS + » et cliquer sur « Processus d'admission ». Une fois la page chargée, menu fermé et en haut de page, appeler relever(ecran="processus-admission", vue="defaut").
7. Ouvrir le burger « Ouvrir le menu », puis « L’ÉCOLE + » et cliquer sur « Notre ADN ». Une fois la page chargée, menu fermé et en haut de page, appeler relever(ecran="notre-adn", vue="defaut").
8. Ouvrir le burger « Ouvrir le menu », puis « L’ÉCOLE + » et cliquer sur « Le campus ». Une fois la page du campus de Paris chargée, menu fermé et en haut de page, appeler relever(ecran="campus-paris", vue="defaut").
9. Ouvrir le burger « Ouvrir le menu », puis « ADMISSIONS + » et cliquer sur « FAQ ». Une fois la page chargée, menu fermé et en haut de page, appeler relever(ecran="faq", vue="defaut").
10. Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.

## Expected Result
Les sept pages s'ouvrent dans l'ordre : accueil, Bachelor, MSc, processus d'admission, Notre ADN, campus de Paris, FAQ. Chaque page affiche ses deux textes témoins et produit un relevé en vue defaut, menu fermé et en haut de page.

## Verification
- FAIL if une des sept pages ne s'ouvre pas par les liens et le menu du site.
- FAIL if un texte témoin attendu manque sur une des sept pages.
- FAIL if un relevé demandé manque ou correspond à une autre page.

```regles
[
  { "type": "etat", "ecran": "accueil", "vue": "defaut", "texte_present": ["L’ÉCOLE DE L’IA\nAPPLIQUÉE AU\nBUSINESS.", "École IA, école tech et école growth, hors Parcoursup"] },
  { "type": "etat", "ecran": "bachelor", "vue": "defaut", "texte_present": ["BACHELOR\nAI APPLIED TO BUSINESS", "L'entrepreneuriat, l'IA et l'automatisation te branchent ?"] },
  { "type": "etat", "ecran": "msc", "vue": "defaut", "texte_present": ["MSC\nIA APPLIQUÉE AU BUSINESS", "Le Master en alternance de l’école de l’IA appliquée au business"] },
  { "type": "etat", "ecran": "processus-admission", "vue": "defaut", "texte_present": ["CANDIDATER.\nBACHELOR OU MSC.", "// ÉCOLE IA, TECH ET GROWTH · PROCESSUS D'ADMISSION"] },
  { "type": "etat", "ecran": "notre-adn", "vue": "defaut", "texte_present": ["DES PROFILS QUI\nSE DISTINGUENT.", "Eugenia est une école IA, tech et growth, hors Parcoursup, née d’une conviction."] },
  { "type": "etat", "ecran": "campus-paris", "vue": "defaut", "texte_present": ["UN CAMPUS\nQUI VIT.", "Le campus d’une école IA hors Parcoursup : une verrière, un amphithéâtre, des salles où l’on construit."] },
  { "type": "etat", "ecran": "faq", "vue": "defaut", "texte_present": ["TU AS DES QUESTIONS.", "École IA hors Parcoursup : admissions, Bachelor, Master en alternance, frais, financement."] }
]
```
