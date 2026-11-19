# Banc du pôle CDO, passage 1 (tâche 4.12), 19 novembre 2026

Pôle CDO. Ce fichier ne donne que les chiffres globaux : le détail des cas reste dans `banc/`, qui ne se lit pas quand on travaille pour le CTO ou la CAIO (`AGENTS.md`).

## Ce qui a été lancé

```
node banc/scripts/passage-banc.mjs --vault-base <copie du vault, références v12 reprises sur la même machine> --travail <dossier hors dépôt>
```

- Chaque cas de `faux-saas/verite.json` est joué seul (v13 avec `r=<id>`), plus un témoin (`r=aucun`), par `automatisation/scene/parcours.mjs --sans-agent --sans-fin --sans-base`.
- **Sans l'agent H** : les clics sont faits par le script (CDP). Le banc mesure la vérification d'Horama (relevés, règles calculées, comparaison aux références), pas la navigation de H.
- Site : https://facturo-demo.vercel.app ; Chrome headless, 1280 × 900.
- Aucune écriture dans `vault-horama/` ni dans la base. Coût : 0 $.

## Ce qui en est sorti

Sortie de `banc/scripts/passage-banc.mjs`, enregistrée telle quelle dans `banc/resultats/passage-1.json` :

| | Valeur |
|---|---|
| Passages joués | 19 sur 19 (18 cas et le témoin), 615 s au total |
| Témoin, v13 sans changement | 0 défaut prouvé, 0 doute |
| Bugs prouvés | 4 sur 13 |
| Bugs envoyés à l'humain en doute | 5 sur 13 (ne comptent pas comme des réussites) |
| Bugs manqués | 4 sur 13 |
| Défauts prouvés faux | 0 sur 4 |
| Changements voulus envoyés à l'humain | 5 sur 5 ; 0 faux défaut prouvé |
| Doutes hors de la zone du cas | 0 |

## Incident pendant la mise au point

Avec les références v12 du vault, prises sur une autre machine, un seul cas a donné 69 doutes : le rendu du texte diffère d'un environnement à l'autre. Les références ont été reprises sur la même machine dans une copie du vault, et le témoin est alors revenu à 0 doute. À retenir pour la démo : références et passages doivent venir du même environnement.

## Ce qui n'est pas testé

- Le banc avec l'agent H (clé nécessaire, environ 0,03 $ par cas d'après `docs/tests/2026-11-17-a5-trois-passages-agent-h.md`).
- Une seconde exécution pour vérifier la stabilité des résultats.
