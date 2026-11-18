# Parcours utilisateur d'Horama (premier jet, 18 novembre 2026)

Rendu du mercredi (issue #73). Premier jet du couloir Nathan, à corriger par Nathan. Sources : le [recadrage du 18/11](../decisions/2026-11-18-recadrage-grand-public-et-dev.md), la [feuille de route](../feuille-de-route.md) et le [README](../../README.md).

**Votre documentation devient vos tests. Sans documentation, Horama regarde quand même.**

Légende : **Fait**, prouvé par un rapport de `docs/tests/` ; **En cours**, le code existe mais l'étape n'est pas encore jouée pour de vrai ; **Feuille de route**, après le hackathon.

## 1. La responsable du site (mode grand public)

Elle publie les pages et les articles, sans accès au code.

**Aujourd'hui, sans Horama.** Elle relit à la main quelques pages après une mise à jour. Les défauts qu'elle ne voit pas restent en ligne jusqu'à ce qu'un visiteur les signale. Exemple réel : sur eugeniaschool.com, le lien « journée portes ouvertes » d'un article de blog mène à une page introuvable (404). Horama l'a trouvé le 17/11 ; le lien était toujours cassé le 18/11.

**Avec Horama.**

| Étape | Ce qu'elle fait, ce qu'elle voit | État |
|---|---|---|
| 1 | Elle est sur la page qu'elle veut vérifier (un article), clique sur l'extension Horama : l'adresse de l'onglet est déjà remplie. Elle clique « Lancer ». | **En cours** : extension essayée contre un faux service ([preuve](../tests/2026-11-18-extension-squelette.md)) ; service en ligne sur Railway (#68, Ali) |
| 2 | L'agent H visite : d'abord la page ouverte, qu'il lit et fait défiler, puis d'autres pages qu'il atteint par de vrais clics sur les liens du site, et le reste par leur adresse (8 pages pour la démo). | **Fait** : 15 pages sur 15 ([répétition réelle](../tests/2026-11-18-repetition-reelle.md), 262 s, 0,08 $) ; 4 pages atteintes par un vrai clic sur Eugenia ([#91](../tests/2026-11-18-a91-visite.md), 317 s, 0,19 $) |
| 3 | Pendant la visite, à l'écran : le site, le curseur de l'agent, la mascotte, et un trait tracé à la main autour de ce qui cloche, au moment où c'est trouvé. Aucun texte. | **Fait** dans la scène : le lien en 404 entouré en direct ([répétition réelle](../tests/2026-11-18-repetition-reelle.md)) ; la scène agrandie en plein écran ([vitrine](../tests/2026-11-18-vitrine.md)) |
| 4 | Le récapitulatif : chaque défaut **prouvé par le code**, avec sa preuve en clair (« Mesuré : … 404. Attendu : une réponse inférieure à 400. ») et sa capture entourée ; à part, les doutes du regard de Holo, « à vérifier ». | **Fait** : 1 défaut vrai sur 3 constats lors de la répétition ; les 2 faux venaient de Holo et sont restés des doutes, jamais présentés comme prouvés |
| 5 | Pour chaque constat, elle clique « C'est un bug » ou « C'est voulu ». Sa décision est gardée dans la mémoire du site, et la note du passage s'y écrit. | **Fait** ([note du passage](../tests/2026-11-18-note-passage-et-banc.md)) |
| 6 | Au passage suivant, Horama compare chaque page à la précédente et ne redemande pas ce qui a été déclaré voulu. | **Fait** côté moteur : second passage, 15 captures sur 15 identiques aux références ([README](../../README.md#chiffres-mesurés)) |

**Feuille de route** : plusieurs agents en parallèle ; tout le site au-delà de 15 pages (avec un plan payant de H) ; des consignes de Holo spécialisées, quand la base sera stable.

## 2. Le développeur (mode dev)

Il pousse le code du site, déployé par Vercel. L'équipe produit décrit les écrans et leurs règles dans un vault Obsidian.

**Aujourd'hui, sans Horama.** À chaque déploiement, il vérifie quelques écrans à la main. Les tests de bout en bout, quand ils existent, sont à écrire et à maintenir à part. La documentation et le site divergent sans que personne ne le remarque.

**Avec Horama.**

| Étape | Ce qu'il fait, ce qu'il voit | État |
|---|---|---|
| 1 | Il pousse sur une PR ; Vercel déploie la prévisualisation, ce qui réveille Horama. | **Feuille de route pour vendredi** : le réveil par un vrai déploiement Vercel (#71, Ali). **Fait** : le réveil sur un commit local, avec l'impact écrit 0,21 s après le commit, sur un site d'essai ([preuve](../tests/2026-11-17-reveil-local.md)) |
| 2 | Horama lit le vault (notes d'écrans, règles) et choisit les tests que le changement touche : les autres sont écartés, avec leur raison. | **Fait** : 1 test retenu, 1 écarté ([répétition](../demo/2026-11-17-repetition.md)) |
| 3 | L'agent H joue les tests sur le site ; le code vérifie les valeurs relevées par le calcul et compare chaque capture à sa référence. | **Fait** : 3 tours sur 3 du site d'Eugenia en ligne, 21 règles conformes, 0 pixel d'écart ([preuve](../tests/2026-11-17-tour-du-site-reel.md)) |
| 4 | Au récapitulatif, il tranche chaque écart : bug ou voulu. Un « voulu » propose la correction de la note du vault, qu'il accepte ou refuse. | **Fait** : correction juste dans 11 cas sur 15 sur Facturo ([preuve](../tests/2026-11-17-correction.md)) |
| 5 | La note du passage s'écrit dans Obsidian : tests rejoués et écartés, chaque défaut avec sa capture entourée, la décision prise, la PR. | **Fait** ([preuve](../tests/2026-11-18-note-passage-et-banc.md)) |
| 6 | Réponse sur GitHub : une PR de documentation pour chaque correction acceptée, et un commentaire sur sa PR avec le résultat. | **En cours** : PR de documentation branchée, essayée sur un dépôt local, sans vraie PR ([preuve](../tests/2026-11-18-depart-article-et-pr-doc.md)) ; commentaire sur la PR : feuille de route pour vendredi (#71, Ali) |

Le site d'Eugenia sert de cible au mode dev, mais nous n'avons pas son code : le changement est simulé dans une copie du vault, en attendant l'accès au dépôt demandé à l'école.

**Feuille de route** : Devin corrige le code, puis Horama rejoue ; l'entrée « message d'un client » (le support signale, Horama reproduit) ; d'autres sources de documentation (Confluence, Notion, Google Docs, PDF) et d'autres sorties (GitLab, Jira, Linear).
