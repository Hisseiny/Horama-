---
logiciel: eugenia
---

# Règles entre plusieurs pages

Ces règles relient deux pages du site : un même chiffre réel, affiché sur chacune, doit être le même. Sur ce site, un chiffre est écrit juste au-dessus de son libellé (« 3-5 » puis « HACKATHONS PAR AN ») : le champ d'une règle le désigne alors par `<libellé> (chiffre au-dessus)`. Une plage s'écrit de plusieurs façons (« 3-5 », « 3 à 5 », « de 3 à 5 ») et vaut la même chose.

## Règles
- Le nombre de hackathons par an affiché sur la page du [[bachelor]] est le même que celui de la page du [[msc]] (relevé le 17/11 : « 3-5 » sur le Bachelor, « 3 À 5 » sur le MSc).
  regle: egalite | a: bachelor.HACKATHONS PAR AN (chiffre au-dessus) | b: msc.HACKATHONS PAR AN (chiffre au-dessus)

Limite de la lecture `(chiffre au-dessus)` : elle prend le nombre écrit sur la ligne juste avant le libellé, sans pouvoir savoir si ce nombre appartient à un autre bloc. Si le chiffre d'un libellé disparaît de la page alors que la ligne d'avant porte un autre nombre, ce nombre est lu à sa place. Un libellé sans aucun nombre juste avant, ou affiché plusieurs fois, rend la règle non concluante.
