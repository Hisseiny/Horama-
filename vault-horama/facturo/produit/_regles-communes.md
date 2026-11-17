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

## Le champ `code` des notes d'écran
L'en-tête de chaque note d'écran liste, dans `code`, les fichiers de code qui font cet écran : sa page, puis les fichiers communs à tous les écrans (données, session, cadre, mise en page, styles, catalogue des changements). Quand un déploiement modifie l'un de ces fichiers, Horama rejoue les tests de cet écran, en plus du socle joué à chaque fois (décision D6, option B). Les chemins s'écrivent entre guillemets, sinon les crochets de `[version]` rendent l'en-tête illisible.

## Comment une règle vérifiable s'écrit
Sous la phrase de la règle, une ligne `regle:` la rend calculable. Cinq types : `somme`, `egalite`, `filtre`, `format`, `presence`. Une règle sans ligne `regle:` n'est pas testée par le calcul.
