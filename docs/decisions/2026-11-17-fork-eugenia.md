# Le fork du site d'Eugenia School : ce qu'il faut demander à l'école

Date : 17 novembre 2026. Couloir Nathan. Pour Nathan, qui fait la demande à l'école. Temps 2, 4, 5 et 6 du déroulé (`docs/decisions/2026-11-17-deroule-demo-eugenia.md`) : une PR sur une copie modifiable du vrai site (bouton « Candidater » et sélecteur de langue en anglais, une régression plantée), déployée, qui réveille Horama. Tant que l'école n'a pas répondu, Horama travaille sur le site en ligne en simple visiteur (rien n'est copié ni déployé).

## Ce qu'on sait déjà (lu sur le site public le 17/11, rien téléchargé)

- Site statique **Astro** : ressources dans `/_astro/`, noms de fichiers hachés (relevé du 30/10 de Nathan, nouvelle maquette depuis).
- Textes et images dans **Sanity** : les images viennent de `cdn.sanity.io/images/m9nujjzs/production/…`, donc projet Sanity `m9nujjzs`, jeu de données `production`. L'identifiant de projet est public (il est dans chaque adresse d'image) ; on ne sait pas si le jeu de données est lisible sans jeton.
- Servi derrière **Cloudflare** (`server: cloudflare`) ; l'hébergeur d'origine (Vercel, Netlify, autre) n'est pas visible.
- La page charge 17 domaines de suivi (HubSpot et ses formulaires, Google Tag Manager et Analytics, TikTok, Snapchat, Facebook, LinkedIn, Twitter, Crazy Egg, Cloudflare Insights).

## Ce qu'il faut demander à l'école

| N° | Quoi | Pourquoi | Forme la plus simple |
|---|---|---|---|
| 1 | **Accès en lecture au dépôt du site** (GitHub, GitLab…) | Construire le site depuis son vrai code ; écrire la PR de démo dessus | Ajouter Nathan en lecture, ou nous autoriser à en faire une copie privée (fork privé) dans le compte de l'équipe |
| 2 | **L'identifiant du projet Sanity et le jeu de données** | Le build va chercher les textes dans Sanity | Déjà visibles : `m9nujjzs`, `production`. À confirmer, avec la **version d'API** utilisée par le site |
| 3 | **Un jeton Sanity en lecture seule** (rôle « Viewer »), si le jeu de données n'est pas public | Le build lit les textes ; jamais d'écriture dans le Sanity de l'école | Un jeton créé pour nous, révocable après le hackathon. Il ira dans `.env.local`, jamais dans le dépôt |
| 4 | **Les variables d'environnement du build** | Le build échoue sans elles | Le fichier `.env.example` du dépôt, ou la liste des noms (sans les valeurs, à part le jeton Sanity) |
| 5 | **La commande de build et la version de Node** | Reproduire le build tel qu'en production | Ce qui est dans `package.json` (souvent `npm run build`, sortie dans `dist/`) et `.nvmrc` ou `engines` |
| 6 | **L'accord pour déployer notre copie en ligne**, non indexée, à une adresse à nous | Le temps 2 : un déploiement réveille Horama ; le jury peut voir le site | Une adresse Vercel du compte de l'équipe (`*.vercel.app`), `noindex`, sans le nom de domaine de l'école, retirée après la démo |
| 7 | **L'accord pour retirer les traceurs et formulaires de notre copie** | Ni données de visiteurs envoyées à l'école ni fausses candidatures | Nous les retirons nous-mêmes : HubSpot, GTM, pixels publicitaires, bannière de cookies |
| 8 | **Une règle de citation** | Montrer le site devant un jury | « Copie de démonstration du site d'Eugenia School, avec l'accord de l'école » en bas de page, ou ce que l'école préfère |

Ce qu'on ne demande pas : aucun accès en écriture au dépôt de l'école, ni à Sanity, ni à leur hébergement ; aucun accès aux formulaires (HubSpot) ni aux données de candidats.

## Ce qu'on fera une fois l'accès reçu, et en combien de temps

Estimation pour un site Astro standard qui lit Sanity au build ; à corriger dès qu'on voit le dépôt.

| Étape | Temps estimé |
|---|---|
| Copie privée du dépôt, installation, `.env.local` (jeton Sanity), premier build local identique au site en ligne | 1 h (plus si le build dépend de services privés de l'école) |
| Retrait des traceurs, des formulaires et de la bannière de cookies, `noindex`, mention de démonstration | 1 h |
| Projet Vercel de l'équipe branché sur la copie, premier déploiement ; prévisualisations sans protection (réglage déjà fait pour Facturo) | 30 min |
| Contrôle : captures de la scène sur notre déploiement contre le site en ligne (même méthode que ce soir : 0 pixel de bruit sur l'accueil, le Bachelor, le MSc, hors photo tournante) | 30 min |
| Champs `code:` des notes du vault d'Eugenia (fichiers de chaque page) pour la sélection des tests | 30 min |
| Le commit v2 (nouveauté et régression plantée), après validation de son contenu en 5 lignes par Nathan, avec sa fiche de changement | 1 à 2 h |
| **Total** | **une demi-journée environ**, plus le temps de réponse de l'école |

Si l'école ne donne pas le dépôt mais accepte le reste : repli possible, une copie statique des pages construite depuis le site public (abandonnée le 17/11 à la demande de Nathan) ; la PR de démo porterait alors sur cette copie, sans le vrai code.

## Risques à dire à l'école

- Le build peut appeler d'autres services que Sanity (formulaires, analytics au build, images) : on ne le sait qu'en voyant le dépôt.
- Une copie en ligne, même non indexée, peut être trouvée : adresse peu parlante, `noindex`, retrait après la démo.
- Le contenu (témoignages, photos d'élèves) appartient à l'école et à ses élèves : rien n'est réutilisé hors de la démo.
