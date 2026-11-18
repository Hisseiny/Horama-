---
logiciel: eugenia-clone
---

# Règles entre plusieurs pages

Ces règles relient deux pages du clone : une même durée, affichée sur chacune, doit être la même. Valeurs relevées le 18/11 sur le clone servi en local (commit `4e7dd32`), identiques sur la production de `main` (`3725b94`).

## Règles
- La durée du Bachelor sur l'[[accueil]] (« 3 ans », écrit juste au-dessus de « Bachelor IA Applied to Business ») est celle de la ligne « Durée » de la page [[programmes]] (« 3 ans »).
  regle: egalite | a: accueil.Bachelor IA Applied to Business (chiffre au-dessus) | b: programmes.Durée
- La durée du MSc sur l'[[accueil]] (« 2 ans », écrit juste au-dessus de « MSc IA Applied to Business ») est celle du MSc sur la page [[programmes]] (« 2 ans », colonne MSc de la ligne « Durée »).

## Ce que le code sait calculer, et ce qu'il ne sait pas encore

Vérifié le 18/11 avec le code de `jugement/` (`verifierReleve`) sur les textes relevés :

- Bachelor : conforme, « 3 ans = 3 ans ». Avec « 4 ans » à la place de « 3 ans » sur l'accueil, la règle échoue : « 4 ans ≠ 3 ans ».
- MSc : non concluante, d'où l'absence de ligne `regle:`. Sur la page Programmes, le tableau « Bachelor ou Master ? » n'est pas un tableau HTML. La ligne « Durée » se lit comme la durée du Bachelor seule. Le « 2 ans » du MSc, lui, est écrit à la ligne suivante, sans libellé. Le bloc du MSc écrit « 2 ans, après un Bac+3 ou +4 », séparé du titre par une ligne vide. Aucune convention actuelle ne le lit.
- Les pages [[bachelor]] et [[msc]] écrivent « 3 ans · 180 ECTS » et « 2 ans · 120 ECTS » : une égalité avec « 3 ans » ou « 2 ans » échouerait à tort.

Il manque une convention de lecture, à demander à Leslie (`jugement/`) : lire une colonne d'une grille dont chaque case est sur sa ligne (« Durée », puis Bachelor, puis MSc), ou comparer le début d'une valeur (« 2 ans » au début de « 2 ans · 120 ECTS »).
