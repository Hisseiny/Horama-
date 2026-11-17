# #57 — Réduction des faux constats Holo

Suite de #57 et du moteur de la PR #64. Classements vrai/faux fournis par
l'utilisateur après lecture des cadres ; ils ne sont pas déduits par le modèle.
Les mesures ci-dessous distinguent le rejeu d'images et un passage réel avec H.

## Ce qui est fait

`filterFindings`, fonction pure exportée de `agent/src/exploration/holo.ts`,
s'applique dans `askHolo` après le parsing :

- écarte les constats `SUSPECTED` dont le cadre atteint les derniers 1 % du
  bas ou de la droite de l'image (`y+h >= hauteur*0.99` ou
  `x+w >= largeur*0.99`) ; pour 1280 × 900, seuils 891 et 1267,2 pixels ;
- dédoublonne les cadres de même sorte (`kind`) avec IoU strictement supérieur
  à 0,5, en conservant le premier ;
- conserve inchangés les constats `INCONCLUSIVE`, sans zone.

La consigne finale est **identique à celle de `origin/a-57-explorer`**.
Les cinq formulations suivantes ont été essayées, sans réglage propre au site.
Elles déplaçaient les faux constats ou perdaient le vrai chapô ; aucune n'a été
retenue. Les variantes V0 à V3 ont chacune été criblées sur un essai des
16 captures ; la formulation de `8c9f213` a été mesurée sur trois essais.

| Formulation | Effet mesuré |
|---|---|
| `8c9f213` : fenêtre et conteneur entièrement visible, phrase complète, image cassée non étirée | Eugenia : 3 constats par essai, le chapô vrai et deux nouveaux faux sur des titres entièrement visibles (agents-ia et e-commerce) ; témoin : 2 vrais. |
| V1 : ajoute ligne finale complète, lettres entièrement dessinées et interligne comme choix graphique | Eugenia : faux titre agents-ia conservé, vrai chapô perdu ; témoin : 2 constats. |
| V2 : V1 + citation exacte des derniers caractères visibles | Eugenia : titre agents-ia et nouveau constat sur une phrase sans point final dans 7-idées ; chapô décrit dans une réponse non conforme (seule clé d0), donc `INCONCLUSIVE` ; témoin : 2 constats. |
| V3 : V2 sans exemple de phrase finissant au milieu d'un mot, exige une lettre coupée ou un mot final incomplet et exclut l'absence de ponctuation seule | Aucun constat Eugenia : chapô perdu ; témoin : 2 constats. |
| V0 : consigne originale + une seule phrase sur la fenêtre et son bord | Chapô perdu et nouveau constat de chevauchement de lettres dans le titre agents-ia ; témoin : 2 constats. |

Formats `d0…d4`, schéma sans liste, contrats et `horama-exploration-1` inchangés.
Aucune dépendance ajoutée.

## Protocole du rejeu

Les captures de #64 n'étaient pas présentes sur la VM : elles ont été reprises
avec Chrome seul, sans agent H, sur les 15 pages de `discoverPages` au plafond
par défaut. Une page à la fois, simple visiteur, aucun formulaire, robots.txt
respecté. Viewport 1280 × 900, DPR 1, options
`--force-device-scale-factor=1` et `--force-color-profile=srgb`, pointeur écarté,
capture du viewport uniquement. Attente du chargement du document, des polices
et des images visibles ; pas d'attente des images lazy hors viewport.

Le témoin local de #59 a aussi été recapturé : comparaison des pixels avec le
PNG du dépôt, `compare -metric AE` = **0**. Ses quatre défauts injectés sont le
chevauchement des titres, le bouton au texte coupé, le texte gris clair et
l'image cassée.

16 captures × 3 essais séquentiels avant, puis après avec le code commité
`bd17e00`. `temperature: 0` ; variation observée : **aucune**, findings identiques
sur les trois essais de chaque capture dans ces séries. Ce n'est pas une garantie
de déterminisme général. Les réponses brutes et les findings parsés avant filtre
sont conservés hors dépôt ; aucun appel supplémentaire pour les obtenir.

Incident initial : HTTP 429, quota annoncé de **30 RPM** pour `holo4-27b`.
Premier passage : 18 essais non concluants ; second avec intervalle de 2,2 s :
14 essais encore en 429 au début. Après attente de 120 s, reprise uniquement de
ces 14 essais, espacés de 4 s : 14 réponses exploitables dès la première
tentative, 34 autres essais inchangés. Provenance et anciennes réponses
conservées. Les séries suivantes utilisent un espacement de 4 s.
Une erreur 429 n'est jamais comptée comme absence de constat ni comme réussite.

## Avant / après sur les captures rejouées

Chiffres **par essai**, identiques sur les trois essais. Pourcentage = faux /
constats, arrondi ; ce n'est ni un taux de défaut des pages ni le rappel.

| Échantillon | État | Constats gardés | Vrais | Faux | Faux / constats | Manqués |
|---|---|---:|---:|---:|---:|---|
| Eugenia, 15 captures | Avant | 7 | 1 | 6 | 86 % | À mesurer |
| Eugenia, 15 captures | Après | 2 | 1 | 1 | 50 % | À mesurer |
| Témoin local | Avant | 2 | 2 | 0 | 0 % | 2 : bouton coupé, image cassée |
| Témoin local | Après | 2 | 2 | 0 | 0 % | 2 : bouton coupé, image cassée |

Le rappel sur Eugenia n'est pas mesurable sans revue exhaustive des pages.
Le faux « image étirée » observé dans #59 n'est plus apparu dans la base de
cette mesure, **déjà avant le filtre** ; le bouton restait manqué. Cette absence
ne doit donc pas être attribuée au filtre.

Total final des trois essais : 27 findings bruts, 12 gardés, aucun
`INCONCLUSIVE`. Tous les rejets mesurés viennent du bord bas ; aucun de la
droite ou du dédoublonnage.

### Détail des findings rejoués

Zones en pixels `x,y,largeur,hauteur`, mêmes résultats aux trois essais.
Identifiants F1 à F9 utilisés pour la revue humaine, pas nouveaux identifiants
du format d'exploration.

| Finding | Zone | Constat et classement humain | Sort du filtre |
|---|---|---|---|
| F1, 7-idées | 960,837,141,63 | Logo MISTRAL AI au bord du viewport : faux | Écarté, bas à 900 |
| F2, agents-ia | 40,725,1184,175 | Illustration continuant sous le viewport : faux | Écarté, bas à 900 |
| F3, chatgpt-vs-mistral | 40,585,852,90 | Paragraphe entièrement lisible, phrase complète : faux | Gardé, intérieur |
| F4, choix-école | 40,758,1184,142 | Illustration continuant sous le viewport : faux | Écarté, bas à 900 |
| F5, e-commerce | 40,680,1225,220 | Illustration continuant sous le viewport : faux | Écarté, bas à 900 |
| F6/C, data-analyst | 40,738,884,60 | Chapô tronqué « …dans la cha » : vrai | Gardé, intérieur |
| F7, Excel | 42,716,1182,184 | Illustration continuant sous le viewport : faux | Écarté, bas à 900 |
| F8/D, témoin | 40,44,740,70 | Titres superposés : vrai | Gardé, intérieur |
| F9/E, témoin | 40,201,565,23 | Contraste du texte gris clair : vrai | Gardé, intérieur |

## Passage réel complet avec H

Un seul passage après synchronisation, code commité `bd17e00`. PR #64 encore
ouverte lors du contrôle : `git merge origin/a-57-explorer` répond
`Already up to date.` Chrome **visible**, CDP 9333, 1280 × 900, DPR 1.
Clé Horama de développement injectée dans `HAI_API_KEY`, jamais clé de démo.
Mode `--sans-base`, vault isolé hors dépôt, aucun formulaire soumis.

| Passage | Trouvées / visitées | Constats | Vrais | Faux | Faux / constats | Durée | Coût H USD |
|---|---|---:|---:|---:|---:|---:|---:|
| #64, passage 1 | 15 / 15 | 8 | 2 | 6 | 75 % | 237,0 s | 0,0745 |
| Ce passage | 15 / 15 | 3 | 2 | 1 | 33 % | 215,219 s | 0,072799 |

Référence : [rapport de #64](2026-11-18-mode-visuel.md).

Replay #64 passage 1 : https://agp.eu.hcompany.ai/share/api/v1/trajectories/14d93d7d-654a-4377-945a-c6f4285b1174

Replay de ce passage : https://agp.eu.hcompany.ai/share/api/v1/trajectories/6e0125dc-7020-469f-a769-7c91ebd6cabc

État final `fini`, 2 `SUSPECTED` Holo, 1 `VERIFIED_FAIL` mécanique, aucun
`INCONCLUSIVE`. Les trois classements suivants sont ceux de l'utilisateur.

| Constat (ID abrégé) | Source / sorte | Zone pixels | Description et verdict humain |
|---|---|---|---|
| `blog-chatgpt-vs-mistral…--holo--1` | holo / texte-coupe | 40,702,128,18 | Ligne auteur « Eugenia School » dite coupée : FAUX, même faux que #64 sans son doublon. |
| `blog-data-analyst…--holo--1` | holo / texte-coupe | 40,738,883,59 | Chapô « …dans la cha » : VRAI, retrouvé. |
| `blog-fin-de-parcoursup…--controle--1` | controle / lien-casse | 0,0,801.03125,55.5 | Lien interne HTTP 404 : VRAI, retrouvé. Zone dans la capture dédiée de l'élément, 802 × 56. |

Lien contrôlé : https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov

Les cadres des trois constats ont été dessinés hors dépôt, sans reclassement
automatique. Le faux auteur du passage réel et le faux paragraphe F3 du rejeu
ne sont pas la même zone : captures reprises, pas des images identiques à #64.

### Sessions avant / après

GET authentifiés sur `/sessions/quota` et
`/sessions?status=running&owner=organization&size=100` : HTTP 200 avant et après.
Même réponse dans les deux cas :

```json
{"scope":"org","limit":3,"active":0,"available":3}
```

```json
{"items":[],"total":0,"page":1}
```

Donc 0 `running` avant et après, aucune fermeture supplémentaire nécessaire.

## Vérifications et limites

Tests hors réseau : bord bas, bord droit, conservation du vrai type F6,
doublons, kinds différents sur une même zone, entrée vide, maintien des
`INCONCLUSIVE` et application du filtre dans `askHolo`. Vérification avant le
passage réel : 148 tests agent, 148 réussis, 0 échec.

- Un vrai défaut dont le cadre touche le bas ou la droite serait aussi écarté :
  risque assumé dans ce filtre, à trancher par un humain.
- Le dédoublonnage n'a rien retiré dans ces mesures ; il est testé hors ligne
  seulement. La disparition du doublon de #64 ne prouve pas son effet en ligne.
- Le faux constat sur la ligne auteur reste dans le passage réel.
- Recoupement avec `controlerPage` non fait dans cette étude.
- Un seul site et un seul témoin ; pas de revue exhaustive ni de rappel mesuré
  sur Eugenia. Les résultats ne se généralisent pas à d'autres sites.
- Le bouton coupé et l'image cassée du témoin restent manqués.
- À décider par un humain : garder la consigne telle quelle ou chercher une
  meilleure consigne avec un banc plus large.
- Aucun vault, PNG, cadre, journal d'essai ou secret ajouté au dépôt.
