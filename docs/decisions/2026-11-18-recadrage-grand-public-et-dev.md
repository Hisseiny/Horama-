# Recadrage du 18 novembre : mode grand public, mode dev, une scène épurée

Date : mercredi 18 novembre 2026, matin. **Décidé par Nathan**, après un bilan point par point du cadrage V3 (`docs/cadrage.md`) contre l'état réel du dépôt, et après lecture de l'architecture proposée par Ali (trois entrées, sources de documentation, sorties en tickets). Là où ce document contredit une décision antérieure, c'est lui qui fait foi. Feuille de route qui en découle : [`docs/feuille-de-route.md`](../feuille-de-route.md).

## Pourquoi

- **L'écran n'est pas épuré.** Les bulles ont disparu le 17/11, mais pendant le parcours il reste un bandeau avec une phrase, trois compteurs, une annonce de départ, et le thème proposé ajoute des étiquettes. Nathan avait validé (16/11 et 17/11) un parcours où l'on ne voit que l'agent qui clique et la mascotte.
- **Le périmètre grossit.** Le schéma d'Ali est juste comme vision produit, mais trois entrées, cinq sources, quatre sorties et la correction du code par Devin ne tiennent pas d'ici vendredi.
- **Le jury testera le code lui-même**, en détail, avant le rendu. Un fonctionnement qui ne marche que sur un site, ou codé en dur pour lui, serait éliminatoire.
- **La valeur est prouvée.** Le 17/11, le mode visuel a trouvé deux vrais défauts sur eugeniaschool.com en ligne : le lien « portes ouvertes du 12 décembre » mène à une page introuvable (404), et le chapô d'un article de blog est coupé. S'ils sont encore en ligne, c'est que personne ne les a vus. C'est exactement ce qu'Horama doit trouver sur n'importe quel site.

## Deux modes

### Mode grand public (l'ancien « mode visuel »)

On donne l'adresse de **n'importe quel site**, par l'extension Chrome ou la page d'accueil d'Horama. L'agent H le parcourt et vérifie que tout va bien : liens morts, texte coupé, image cassée, page en erreur, texte d'erreur affiché, puis le regard de Holo en doutes.

- **Rien de codé en dur pour un site.** Banc : eugeniaschool.com, plus quatre sites pris au hasard (fournis par Nathan), plus ce que le jury voudra essayer.
- **Le jury doit pouvoir l'essayer seul**, sans notre Mac de démo.
- Les défauts trouvés sont **prouvés** par le code ; Holo ne donne que des doutes.

### Mode dev (avec accès au code)

Le parcours, dans les mots de Nathan : **déploiement Vercel → GitHub → Obsidian → l'agent travaille → il réécrit dans Obsidian où sont les erreurs → comparaison avec le code et test de non-régression → PR sur GitHub.**

- Il exige l'accès au code du site. Pour Eugenia, on ne l'a pas : le fork est demandé à l'école ([demandes](2026-11-17-fork-eugenia.md)).
- **Cible du mode dev à trancher par Nathan** si l'école ne répond pas : un dépôt dont on a le code (par exemple la refonte du site d'Eugenia faite par Nathan le 30/10, en HTML statique, ou Facturo).

## La scène, épurée

**Pendant le parcours** : le site, le curseur de l'agent qui clique, et la mascotte, qui change de tête. Quand un défaut est trouvé, au moment même où il l'est (par exemple le lien contrôlé qui répond 404), un **trait coloré tracé comme à la main** l'entoure ou le surligne, **sans texte ni étiquette**, et l'agent **ne s'arrête pas**.

**Retirés de l'écran pendant le parcours** : le bandeau, les compteurs, l'annonce de départ, les étiquettes, les lettres, les bulles.

**À la fin, le récapitulatif** porte tout le texte : chaque défaut avec sa capture entourée, la question bug ou voulu, puis ce qui part (documentation corrigée, ticket ou PR).

## Direction artistique, page d'accueil et extension

- **Nathan refait la direction artistique**, dans cet ordre : le squelette (ce qui est à l'écran pendant le parcours, puis au récapitulatif), validé avant toute couleur ; puis le récapitulatif ; puis la direction artistique (couleurs, typographie, mascotte), par la méthode `/taste` (références regardées, juge à l'aveugle). Le thème grec reste une inspiration, en plus épuré et plus tech.
- Le thème « Musée grec » de la PR #65 **n'est pas branché**.
- **Une page d'accueil** (structure inspirée du site de Naskell, images générées) **et une extension Chrome**, dans la même direction artistique. L'extension est l'entrée du mode grand public : on colle le lien d'un site, Horama cherche les défauts.

## Ce qui part en feuille de route (après le hackathon)

- L'entrée « message d'un client » (support).
- « Devin corrige le code, puis rejoue » (le cadrage V3 mettait la correction du code hors périmètre).
- Les sources Confluence, Notion, Google Docs, PDF, centre d'aide ; le vault reste la seule source vendredi.
- Les sorties GitLab, Jira, Linear ; GitHub seul vendredi.
- L'accessibilité mesurée (#55), mise en pause le 18/11 (Nathan n'a pas demandé à la garder ; à reprendre s'il le décide).
- La notification par n8n.

## Ce qui ne change pas

Le moteur (coureur, vérification par le calcul, comparaison d'images, mémoire des décisions, correction de note, PR de documentation, réveil, impact), les contrats `contrats-v2`, les formats `horama-impact-1` et `horama-exploration-1`, la règle « un défaut n'est affirmé que s'il est prouvé ».

## À trancher

1. **L'architecture de l'extension et du service que le jury peut essayer seul** : où tournent l’agent H et Chrome quand ce n’est pas notre Mac (#68).
2. **La cible du mode dev** si l'école ne donne pas l'accès au dépôt.
3. **Prévenir l'école** des deux défauts trouvés sur son site avant de les montrer au jury (Eugenia fait partie du jury).
