---
logiciel: facturo
---

# Règles communes à tous les écrans

Facturo est une application de facturation en français. Ces règles valent pour tous les écrans ; les règles vérifiables sont rappelées dans la note de chaque écran, avec leur ligne `regle:`.

## Formats
- Les montants s'affichent avec deux décimales, une virgule, une espace entre les milliers et le symbole € à la fin : 1 420,00 €.
- Les dates s'affichent au format JJ/MM/AAAA : 05/11/2026.
- L'en-tête de chaque écran rappelle la date du jour (« Aujourd'hui : 18/11/2026 »).

## Écrans
- [[tableau-de-bord]]
- [[liste-des-factures]]
- [[detail-facture]]
- Cohérences entre plusieurs écrans : [[regles-entre-ecrans]]

## Comment une règle vérifiable s'écrit
Sous la phrase de la règle, une ligne `regle:` la rend calculable. Cinq types : `somme`, `egalite`, `filtre`, `format`, `presence`. Une règle sans ligne `regle:` n'est pas testée par le calcul.
