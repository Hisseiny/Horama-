# Mode visuel — passages réels et revue humaine

Site : https://www.eugeniaschool.com ; un agent H, Chrome visible, CDP 9333,
captures 1280 × 900. Vault d'essai `~/essais/vault`, hors dépôt.
Les trois passages utilisent `--sans-base` : aucune écriture Supabase.
La clé Horama de développement est injectée dans l'environnement, jamais archivée.

## Commandes et mesures

Depuis `~/repos/Horama-`, pour chacune des sorties `explo1`, `explo2`, `explo2b` :

```sh
pnpm --filter @horama/agent explorer -- \
  --url https://www.eugeniaschool.com \
  --vault ~/essais/vault --sortie ~/essais/explo1 \
  --sans-base --chrome-port 9333
```

Le chemin `--sortie` est remplacé par `~/essais/explo2`, puis `~/essais/explo2b`.
Sources : `~/essais/explo{1,2,2b}/exploration.json` et journaux voisins.

| Passage | Pages trouvées | Visitées par H | Durée | Coût USD | Constats |
|---|---:|---:|---:|---:|---|
| 1 | 15 | 15 | 237,0 s | 0,0745 | `texte-coupe` : 7 ; `lien-casse` : 1 |
| 2, incomplet | 15 | 1 | 25,4 s | 0,0055 | `non-conclu` : 14 |
| 2b, après correction | 15 | 15 | 173,7 s | 0,0712 | `texte-coupe` : 7 ; `lien-casse` : 1 |

Replay du passage 1 : https://agp.eu.hcompany.ai/share/api/v1/trajectories/14d93d7d-654a-4377-945a-c6f4285b1174

Replay du passage 2b : https://agp.eu.hcompany.ai/share/api/v1/trajectories/65afc19e-0202-4d02-bab3-f699717d203d

## Revue humaine du passage 1

Classification transmise par l'utilisateur après lecture des captures de
`~/essais/explo1`, complétée par sa vérification de la page et du lien en ligne.
Les identifiants ci-dessous sont abrégés par `…` ; ce ne sont pas de nouveaux identifiants.

| Constat | Verdict humain | Motif |
|---|---|---|
| `blog-7-idees…--holo--1` | FAUX | Logo MISTRAL AI : l'illustration continue simplement sous le bord du viewport. |
| `blog-agents-ia…--holo--1` | FAUX | Zone y725–900 : image coupée uniquement par le viewport. |
| `blog-chatgpt-vs-mistral…--holo--1` | FAUX | Ligne auteur/date entièrement lisible, zone x40 y702 128 × 18. |
| `blog-chatgpt-vs-mistral…--holo--2` | FAUX | Doublon exact du précédent, même zone ; absence de déduplication moteur/Holo. |
| `blog-choix-ecole-ia--holo--1` | FAUX | Image coupée par le bord inférieur du viewport. |
| `blog-comment-lintelligence…--holo--1` | FAUX | Image coupée par le bord inférieur du viewport. |
| `blog-data-analyst…--holo--1` | VRAI | Chapô visiblement tronqué « …dans la cha » sur la page en ligne. |
| `blog-fin-de-parcoursup…--controle--1` | VRAI | `VERIFIED_FAIL` : lien cassé, HTTP 404 confirmé par l'utilisateur avec curl. |

Lien vérifié : https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov

**8 constats, 2 vrais, 6 faux : taux de faux constats = 6/8 = 75 %.**
Holo seul : **6/7 ≈ 86 %** ; contrôles mécaniques : **0/1 = 0 %**.
Ces proportions décrivent ces constats, pas le rappel ni un taux généralisable.
La cause principale est la confusion entre découpe par le viewport et défaut
de texte. Le détail de la revue attribue explicitement quatre faux constats à
ce bord (lignes 1, 2, 5, 6) ; le résumé fourni disait cinq sur six, mais ce
cinquième cas n'est pas identifié dans la table. Sa répartition reste à mesurer.

## Échec du passage 2 et correction

H démarre sur la dernière page laissée ouverte. Ses événements montrent un seul
`relever`, puis `terminer(reussi)` : il suppose à tort les pages précédentes déjà
acquises. Le moteur accepte cette fin et écrit `fini` malgré 14 pages manquantes.
H est `completed`, `outcome: success` ; la comparaison de la page acquise est
`PASS`. Il ne s'agit pas d'un crash de comparaison ni d'un échec de transport H.

Correction : consigne de passage neuf, indication des pages réellement restantes,
refus d'une fin réussie prématurée ; état final `interrompu` si des pages manquent.
Un test hors ligne reproduit cette séquence et la reprise des relevés.
Voir le [diagnostic détaillé et les checks](2026-11-17-a57-explorer.md).

Le passage 2b donne **0 constat de comparaison** : les **15/15 PNG sont identiques
octet pour octet aux références v1**, aucune page avec différence d'image.
Version du passage : 3, l'essai incomplet ayant consommé la version 2.

Les contrôles authentifiés de `/sessions/quota` et
`/sessions?status=running&owner=organization&size=100` ont trouvé **0 session
active avant et après la relance** ; après : HTTP 200, `active: 0`,
`available: 3`, liste vide. Aucune fermeture nécessaire. Pas de nouvel appel H
pour cette rédaction.

## Vérifications et limites

Commandes de vérification : `pnpm install && pnpm -r --if-present run check`.
Après correction : 144 tests agent réussis, aucun échec ; autres paquets `Done`.
La checklist reste **« codé non testé »**, sans promotion automatique du statut.

- Faux positifs au bord du viewport ; pas de filtrage corrigé dans cette étape.
- Doublon Holo de même zone conservé ; déduplication non corrigée ici.
- Provenance sitemap indicative, pas une traçabilité exacte par page.
- Lecture d'`exploration.json` et rendu dans la scène non vérifiés : à mesurer.
- `--agents 3` non réalisé ; parallélisme et mesures correspondantes : à mesurer.
- Aucun vault, journal, événement H ou PNG d'essai committé.
- Deux preuves copiées hors dépôt dans `~/essais/pr/` : capture data-analyst et
  capture dédiée du lien cassé, issues de `explo1/captures`.
