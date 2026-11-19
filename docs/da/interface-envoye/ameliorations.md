# Améliorations des écrans, alignées sur le cadrage et les contrats (CDO, 19/11)

Cette analyse passe les 8 écrans du prototype Figma Make en revue. Pour chacun, elle note ce qui manque par rapport aux fonctionnalités du cadrage (`docs/cadrage.md`, F1 à F39) et aux contrats de données gelés (`contrats/types.ts`, C1 à C8). Rien ici n'ajoute de champ à un contrat : chaque information affichée existe déjà dans un contrat.

**État (19/11) : fait**, dans le fichier de référence ([lien](https://www.figma.com/make/zCoXOHbz3ijbLqUosBzAgj)). Vérifié en cliquant sur chaque écran : pastille et règles sans test (11.1), test 1 / 2 et lien vers la note (11.2), capture au clic sur une étape et session relancée (11.3), statut « non concluant » (11.4), valeurs relevées (11.5), pourquoi, portée et issue GitHub (11.6), journal détaillé de l'agent (11.8). Reste à corriger, demandé le 19/11 : les chemins `facturation-pro` en `facturo`, et l'adresse de l'appli testée (`https://facturo-demo.vercel.app/v13/…`) sur 11.3, 11.7 et 11.8.

## Priorité 1 : un journal détaillé de l'agent (11.8 et 11.3)

Le but : savoir exactement où et quand chaque chose s'est passée pendant un passage, pour pouvoir la retrouver.

Sur 11.8, chaque ligne de passage se déplie et montre le **journal de l'agent**, test par test. Chaque étape affiche des champs qui existent déjà dans les contrats :

| Affiché | Champ du contrat |
|---|---|
| heure exacte et numéro d'étape | `EvenementFil.horodatage`, `etape` (C3) |
| test en cours | `EvenementFil.test_id` (C3) |
| action de l'agent (« Ouvre « Factures » ») | `EvenementFil.action` (C3) |
| page où il se trouve (adresse) et écran reconnu | `Capture.url_page`, `ecran`, `vue` (C3) |
| position de défilement | `Capture.defilement` (C3) |
| vignette de la capture, qui s'agrandit au clic | `Capture.url`, `EvenementFil.capture_url` (C3) |
| état de la session : en cours, attente d'un outil, relancée, abandonnée | `EvenementFil.etat_session` (C3), relance F16 |
| résultat de la vérification à cette étape (« mesuré / attendu ») | `ResultatVerification` (C4) |
| lien vers le replay de la session H | F15 |

Le journal se filtre par test, par écran et par statut (conforme, suspect, défaut prouvé, non concluant). On peut aussi y chercher une adresse ou un texte. Une étape « non concluant » montre pourquoi : session figée, relance, abandon après 45 s.

Sur 11.3 (passage en direct), un clic sur une étape du fil affiche sa capture à droite. Le fil de 11.3 et le journal de 11.8 sont donc le même objet : l'un en direct, l'autre après coup.

Dans le journal des décisions de 11.8, chaque décision montre aussi sa portée (« cet écart, cet écran, cette version »), la zone, la version, le « pourquoi » s'il a été donné, et la correction de note proposée, acceptée ou refusée (`Decision`, C5).

## Écran par écran

| Écran | Ce qui manque | Fonctionnalité ou contrat |
|---|---|---|
| 11.1 Couverture | Repérer les notes modifiées depuis le dernier passage (pastille « modifiée ») | F4 |
| 11.1 Couverture | La carte de couverture : pour chaque note, quelles règles ont un test et lesquelles n'en ont pas | F9 |
| 11.2 Tests à valider | Passer d'un test proposé à l'autre (« 2 tests proposés », un seul est visible) | F10, C1 |
| 11.2 Tests à valider | Un lien vers la note source dans le vault | F3, C1 |
| 11.3 Passage en direct | Un clic sur une étape affiche sa capture ; l'état de la session (relance, abandon) est visible | F13, F16, C3 |
| 11.3 Passage en direct | La question que l'agent pose pendant la session, à laquelle on répond sans quitter l'écran | F29 (P1) |
| 11.4 Rapport | Le 4e statut, « non concluant », dans le résumé et le tableau (seuls 3 statuts sont montrés) | F25, section 8.1 du cadrage |
| 11.4 Rapport | Le chemin où le rapport est écrit dans le vault, avec le logiciel (`vault-horama/<logiciel>/passages/`) | F36, C6 |
| 11.5 Comparaison | Le tableau des valeurs relevées : version précédente, version testée, attendu selon la règle | F21, C4 |
| 11.6 À relire | Le « pourquoi » facultatif sous les boutons « C'est un bug » et « C'est voulu » | F27, `Decision.pourquoi` (C5) |
| 11.6 À relire | La portée de la décision, écrite clairement (« cet écart, cet écran, cette version ») | F31, `Decision.portee` (C5) |
| 11.6 À relire | « Créer l'issue GitHub » pour un bug confirmé, avec captures et replay | F30 (P1) |
| 11.7 Dérive documentaire | Le statut de la correction (proposée, acceptée, refusée) affiché dans le journal | F33, `Decision.correction_de_note` (C5) |
| 11.8 Historique | Le journal détaillé de l'agent (voir plus haut) | F13, F35, C3, C4, C5 |
| Barre latérale | Une notification quand des cas attendent (badge sur « À relire », déjà présent) : rien à ajouter | F28 |

## Ce qui est volontairement laissé de côté

- Les tableaux des maquettes affichent « à mesurer » ou des valeurs d'exemple : aucun chiffre n'est inventé comme s'il était mesuré.
- L'import Notion et Confluence (F5) et le tableau de bord du banc (F38) ne sont pas des écrans de cette application.
- Aucun champ n'est ajouté aux contrats : s'il en fallait un, la demande passerait par le gardien du contrat.
