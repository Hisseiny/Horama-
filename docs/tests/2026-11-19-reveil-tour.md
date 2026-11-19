# Réveil : trancher dans la tour (#238), 19/11 au soir

## Ce qui a été lancé

- Tests : `node --test automatisation/reveil/pr.test.mjs automatisation/pr-doc/commentaire.test.mjs`, 24 réussis sur 24, dont 3 nouveaux :
  - ordre index, tour, attente, réponse, mise à jour de l'index ; entrée publiée d'abord avec `duree_s` et `cout_usd`, sans décision ni réponse ; adresse de la tour `…/tour/?index=<commit>#relire/dev%3A<passage>` ; décisions de la tour dans la réponse ; seule l'adresse de la réponse est ajoutée ensuite à l'index ;
  - au-delà de 10 min (horloge simulée) : réponse publiée avec « voulu » pour le cas tranché et « à trancher » pour l'autre ;
  - `majEntreeIndex` garde les décisions écrites entre-temps et les autres entrées, avec le `sha` lu (pas d'écrasement en cas de course).
- Scène d'exploration en mode scripté (`--sans-agent --sans-holo --sans-base`, aucune session H), avec `--fin-dans-la-tour`, sur la prévisualisation de la PR #16 du clone, 3 pages, vault temporaire, Chrome sur un port et un profil à part : sortie 0. Récapitulatif « J'ai fini. 2 défauts prouvés », puis la carte de bascule. Aucune question posée, aucune décision écrite (`decisions: []`). Avec `--pr`, les éléments de la réponse portent `duree_s` (13,5 s ici) et `cout_usd` (`null` : sans agent H, pas de coût).

Captures : `2026-11-19-reveil-tour/recapitulatif.png` et `2026-11-19-reveil-tour/vers-la-tour.png`.

## Pas testé

- La chaîne entière avec une vraie PR, la vraie tour et le service de Léon : la tour doit savoir lire `?index=<commit>` et `#relire/<cle>` (étape 2 du couloir Nathan), et `POST /tour/decision` doit exister en ligne.
- L'ouverture de la tour dans le Chrome de la scène (port 9333) : même mécanisme que la page d'attente (`openChrome`, `connectTab`, `navigate`), non relancé ici.
