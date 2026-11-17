# 5.2 : correction de note proposée après un « voulu »

Fichier écrit par `jugement/scripts/t52-correction.ts` : aucun chiffre n'y est écrit à la main.

## Ce qui a été lancé

- Commande, depuis la racine : `node --env-file=.env.local jugement/scripts/t52-correction.ts openai/gpt-oss-120b`
- Début : 2026-11-17T13:04:05.905Z ; code : commit `e6ded9f`.
- Cas : les 5 changements « voulu » de `faux-saas/verite.json`, 3 passes chacun, température 0, un second essai au plus après un refus du code.
- Juste : pour un changement qui contredit la doc, la phrase remplacée est la bonne phrase de la note et la nouvelle dit le nouvel état ; pour un changement qui ne la contredit pas, aucune correction n'est proposée.

## Ce qui en est sorti

- `openai/gpt-oss-120b` : **11 sur 15** propositions justes ; temps médian 2,5 s.
- Critère de la tâche 5.2 : correction juste 3 cas sur 3 (ici, toutes les passes des cas qui contredisent la doc).

| Modèle | Cas | Contredit la doc | Passe | Juste | Essais | Temps (ms) | Jetons en entrée | Proposition ou raison |
|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b` | `export-haut` | oui | 1 | oui | 1 | 5266 | 861 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `export-haut` | oui | 2 | oui | 1 | 7101 | 861 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `export-haut` | oui | 3 | oui | 1 | 1600 | 861 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 1 | non | 1 | 2257 | 838 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 2 | non | 1 | 876 | 838 | Pas de correction proposée : Aucune phrase de la note de l'écran ne mentionne « Société », donc aucune phrase à contredire. |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 3 | non | 1 | 2304 | 838 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 1 | oui | 1 | 1188 | 839 | Pas de correction proposée : Aucune phrase de la note de l'écran ne mentionne « Nouvelle facture » ou l'élément modifié. |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 2 | oui | 1 | 1148 | 839 | Pas de correction proposée : Aucune phrase de la note ne mentionne le changement autour de « Nouvelle facture ». |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 3 | non | 1 | 6326 | 839 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 1 | oui | 1 | 2997 | 761 | Pas de correction proposée : Aucune phrase de la note ne concerne le changement indiqué |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 2 | oui | 1 | 1223 | 761 | Pas de correction proposée : Aucune phrase de la note de l'écran ne concerne « Vue d'ensemble », donc rien à corriger. |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 3 | oui | 1 | 2545 | 761 | Pas de correction proposée : Aucune phrase de la note ne concerne le changement autour de « Vue d'ensemble » |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 1 | oui | 1 | 2849 | 780 | Pas de correction proposée : Le badge « En attente de paiement » a été modifié, mais le nouveau libellé n’est pas indiqué. |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 2 | oui | 1 | 2860 | 780 | Pas de correction proposée : Le changement affecte le badge « En attente de paiement » et rend la phrase actuelle incorrecte, mais le nouvel état n'est pas précisé. |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 3 | oui | 1 | 2763 | 780 | Pas de correction proposée : Le texte mentionne le badge « En attente de paiement » qui a été modifié. |

---

## Lancement du 2026-11-17T13:07:52.963Z

### Ce qui a été lancé

- Commande, depuis la racine : `node --env-file=.env.local jugement/scripts/t52-correction.ts openai/gpt-oss-120b`
- Début : 2026-11-17T13:07:52.963Z ; code : commit `8800fa8`.
- Indices donnés : la question de la mascotte pour `export-haut` ; le texte de la même zone dans la version de référence pour `colonne-renommee` (à fournir par la scène, demandé à Nathan).
- Cas : les 5 changements « voulu » de `faux-saas/verite.json`, 3 passes chacun, température 0, un second essai au plus après un refus du code.
- Juste : pour un changement qui contredit la doc, la phrase remplacée est la bonne phrase de la note et la nouvelle dit le nouvel état ; pour un changement qui ne la contredit pas, aucune correction n'est proposée.

### Ce qui en est sorti

- `openai/gpt-oss-120b` : **14 sur 15** propositions justes ; temps médian 2,8 s.
- Critère de la tâche 5.2 : correction juste 3 cas sur 3 (ici, toutes les passes des cas qui contredisent la doc).

| Modèle | Cas | Contredit la doc | Passe | Juste | Essais | Temps (ms) | Jetons en entrée | Proposition ou raison |
|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b` | `export-haut` | oui | 1 | oui | 1 | 2255 | 901 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `export-haut` | oui | 2 | oui | 1 | 1761 | 901 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `export-haut` | oui | 3 | oui | 1 | 2361 | 901 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 1 | non | 1 | 1967 | 894 | Pas de correction proposée : Aucune phrase de la note ne mentionne « Société » à mettre à jour. |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 2 | oui | 1 | 3596 | 894 | Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ». → Le tableau a quatre colonnes : « Numéro », « Société », « Échéance », « Montant TTC » (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 3 | oui | 1 | 3872 | 894 | Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ». → Le tableau a quatre colonnes : « Numéro », « Société », « Échéance », « Montant TTC » (depuis la version 13). |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 1 | oui | 2 | 3007 | 879+1011 | Pas de correction proposée : Aucune phrase de la note de l'écran ne parle de « Nouvelle facture », donc aucune correction n'est nécessaire. |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 2 | oui | 2 | 5913 | 879+1013 | Pas de correction proposée : Aucune phrase de la note ne concerne le changement autour de « Nouvelle facture ». |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 3 | oui | 2 | 2799 | 879+1005 | Pas de correction proposée : Aucune phrase de la note de l'écran ne concerne « Nouvelle facture ». |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 1 | oui | 1 | 973 | 801 | Pas de correction proposée : Aucune phrase de la note ne concerne le changement autour de « Vue d'ensemble ». |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 2 | oui | 1 | 1352 | 801 | Pas de correction proposée : Aucune phrase de la note d'écran ne porte sur « Vue d'ensemble » ou n'est affectée par le changement. |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 3 | oui | 1 | 1349 | 801 | Pas de correction proposée : Aucune phrase de la note d'écran ne concerne la zone « Vue d'ensemble » modifiée. |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 1 | oui | 1 | 3141 | 820 | Pas de correction proposée : Le badge « En attente de paiement » a changé, rendant la phrase actuelle inexacte. |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 2 | oui | 1 | 2760 | 820 | Pas de correction proposée : Le texte mentionne le badge « En attente de paiement » qui a changé, mais la nouvelle valeur n’est pas précisée. |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 3 | oui | 1 | 3357 | 820 | Pas de correction proposée : Le badge a été modifié mais la nouvelle libellé n’est pas précisée. |

---

## Lancement du 2026-11-17T13:11:50.538Z

### Ce qui a été lancé

- Commande, depuis la racine : `node --env-file=.env.local jugement/scripts/t52-correction.ts openai/gpt-oss-120b`
- Début : 2026-11-17T13:11:50.538Z ; code : commit `55470aa`.
- Indices donnés : la question de la mascotte pour `export-haut` ; le texte de la même zone dans la version de référence pour `colonne-renommee` (à fournir par la scène, demandé à Nathan).
- Cas : les 5 changements « voulu » de `faux-saas/verite.json`, 3 passes chacun, température 0, un second essai au plus après un refus du code.
- Juste : pour un changement qui contredit la doc, la phrase remplacée est la bonne phrase de la note et la nouvelle dit le nouvel état ; pour un changement qui ne la contredit pas, aucune correction n'est proposée.

### Ce qui en est sorti

- `openai/gpt-oss-120b` : **14 sur 15** propositions justes ; temps médian 2,2 s.
- Critère de la tâche 5.2 : correction juste 3 cas sur 3 (ici, toutes les passes des cas qui contredisent la doc).

| Modèle | Cas | Contredit la doc | Passe | Juste | Essais | Temps (ms) | Jetons en entrée | Proposition ou raison |
|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b` | `export-haut` | oui | 1 | oui | 1 | 1785 | 901 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `export-haut` | oui | 2 | oui | 1 | 4041 | 901 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `export-haut` | oui | 3 | oui | 1 | 3786 | 901 | Le bouton « Exporter » se trouve en bas du tableau. → Le bouton « Exporter » se trouve en haut à droite (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 1 | oui | 1 | 1693 | 894 | Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ». → Le tableau a quatre colonnes : « Numéro », « Société », « Échéance », « Montant TTC » (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 2 | oui | 1 | 1462 | 894 | Le tableau a quatre colonnes : « Numéro », « Client », « Échéance », « Montant TTC ». → Le tableau a quatre colonnes : « Numéro », « Société », « Échéance », « Montant TTC » (depuis la version 13). |
| `openai/gpt-oss-120b` | `colonne-renommee` | oui | 3 | non | 1 | 1294 | 894 | Pas de correction proposée : Aucune phrase de la note ne mentionne « Société » ou le changement, donc rien à corriger. |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 1 | oui | 2 | 2818 | 879+1011 | Pas de correction proposée : Aucune phrase de la note de l'écran ne concerne le changement autour de « Nouvelle facture ». |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 2 | oui | 1 | 2104 | 879 | Pas de correction proposée : Aucune phrase de la note ne concerne le changement autour de « Nouvelle facture ». |
| `openai/gpt-oss-120b` | `bouton-nouvelle-facture` | non | 3 | oui | 2 | 2902 | 879+1015 | Pas de correction proposée : Aucune phrase de la note d'écran ne mentionne « Nouvelle facture », donc aucune correction n'est nécessaire. |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 1 | oui | 1 | 1101 | 801 | Pas de correction proposée : Aucune phrase de la note d'écran ne porte sur « Vue d'ensemble », donc rien à corriger. |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 2 | oui | 1 | 2530 | 801 | Pas de correction proposée : Aucune phrase de la note de l'écran ne porte sur « Vue d'ensemble », donc rien à corriger. |
| `openai/gpt-oss-120b` | `titre-tableau-de-bord` | non | 3 | oui | 1 | 2294 | 801 | Pas de correction proposée : Aucune phrase de la note ne concerne le changement autour de « Vue d'ensemble » |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 1 | oui | 1 | 1221 | 820 | Pas de correction proposée : Aucune information précise sur le nouvel état de « En attente de paiement » n'est fournie |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 2 | oui | 1 | 2559 | 820 | Pas de correction proposée : Le changement mentionne « En attente de paiement » mais ne précise pas le nouveau libellé à afficher. |
| `openai/gpt-oss-120b` | `badge-statut-detail` | non | 3 | oui | 1 | 2158 | 820 | Pas de correction proposée : Le changement porte sur le badge « En attente de paiement » mais la note ne décrit pas le nouvel état |
