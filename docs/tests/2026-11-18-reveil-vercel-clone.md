# Réveil par PR : première prévisualisation Vercel réelle du clone (issue #71), 18 novembre 2026

Couloir Nathan. Premier essai de la chaîne réelle sur le clone (`Hisseiny/eugenia-school-website`), sans H et en lecture seule. Le support est la PR #11 du clone (formulaires HubSpot coupés, puis `vercel.json` ajouté). Ali l'a poussée à nouveau à 14 h 55 UTC, après le raccordement de Vercel à 14 h 46 UTC.

## Constat sur la PR #11 (tête `67c0569`)

- **Statut de commit « Vercel »** : `pending` à 14 h 55 min 48 s, puis `success` à 14 h 56 min 01 s, avec la description « Deployment has completed ». Son `target_url` mène au tableau de bord de Vercel (`vercel.com/ahissein-5983/…`), pas au site.
- **Contrôle `Vercel Preview Comments`** : `success`.
- **Déploiements GitHub** (`deployments`, donc aucun `deployment_status`) : 0 pour ce commit, 0 sur tout le dépôt. Le réveil, qui ne lisait que les déploiements GitHub, ne voyait donc rien et disait à tort « Vercel n'y est pas encore relié ».
- **Commentaire du bot `vercel[bot]`** sur la PR : une ligne cachée `[vc]: #…:<base64>`, dont le JSON donne `projects[0].previewUrl`, puis un tableau avec un lien « Preview ». Dans les deux cas, l'adresse est `https://eugenia-school-website-git-devin-179501037-feb21a-ahissein-5983.vercel.app`.
- **Accès sans connexion** : non. `/`, `/admissions`, `/admissions.html`, `/programmes`, `/programme/bachelor-ia-business` et `/programme/master-ia-business-alternance` répondent tous 302 vers `vercel.com/sso-api?…`. La protection des prévisualisations est active, il faut la couper dans le projet Vercel (issue #12 du clone). Les pages intérieures en 200 et l'absence de requête HubSpot ne sont donc pas vérifiables pour l'instant.
- **PR #13 du clone** (`vercel.json` seul), ouverte entre-temps : même constat (statut Vercel en succès, adresse dans le commentaire du bot, 302 vers la connexion).

## Adaptation du réveil (`automatisation/reveil/pr.mjs`)

- **Où il trouve la prévisualisation.** S'il n'y a pas de déploiement GitHub, il prend le statut de commit dont le contexte nomme Vercel. Quand ce statut est `success`, l'adresse vient du dernier commentaire de `vercel[bot]` sur la PR : la ligne cachée d'abord, sinon le lien « Preview ». Aucune adresse du clone n'est dans le code.
- **Ce qu'il fait d'une prévisualisation protégée.** Il demande l'adresse sans suivre les redirections. Une redirection vers `vercel.com`, ou un 401, veut dire que la prévisualisation demande une connexion : le réveil ne la joue pas, le dit une fois et réessaie au tour suivant. L'agent H ne tombe donc pas sur une page de connexion, et la session n'est pas payée pour rien.
- **Ce qu'affiche `--a-blanc`.** Pour chaque PR : la source de la prévisualisation, son adresse et l'accès sans connexion. La ligne trompeuse sur le dépôt est retirée.

## Ce qui a été lancé

1. `node --test automatisation/reveil/*.test.mjs` : 15 tests, 15 réussis. Les nouveaux tests couvrent :
   - le commentaire du bot (ligne cachée, lien « Preview », rien) ;
   - le lecteur sans déploiement, avec un statut Vercel `success`, `pending` ou absent, et un faux commentaire de Devin ignoré ;
   - l'accès (302 vers vercel.com, 401, 200, 308 interne, panne réseau) ;
   - le mode à blanc (prête et ouverte, protégée, sans prévisualisation, en cours).
2. À blanc sur le vrai dépôt :

   ```
   PR #13 (3c18296) « Servir les pages sans .html sur Vercel (cleanUrls) » : prévisualisation prête (statut et commentaire de Vercel), https://eugenia-school-website-git-devin-179501376-37fe91-ahissein-5983.vercel.app, pas jouable : la prévisualisation demande une connexion Vercel (code 302).
     1 fichier(s) : vercel.json
     tests rejoués : aucun ; écartés : accueil-vers-programmes, admissions, bachelor-vers-msc
   PR #11 (67c0569) « Désactiver les formulaires HubSpot par défaut sur la démo » : prévisualisation prête (statut et commentaire de Vercel), https://eugenia-school-website-git-devin-179501037-feb21a-ahissein-5983.vercel.app, pas jouable : la prévisualisation demande une connexion Vercel (code 302).
     8 fichier(s) : README.md, src/components/HubspotForm.astro, …, vercel.json
     tests rejoués : aucun ; écartés : accueil-vers-programmes, admissions, bachelor-vers-msc
   ```

   Aucune des deux PR ne touche un fichier listé dans le champ `code:` des notes : aucun test n'est rejoué.
3. `pnpm -r check` : code 0, 354 tests, 353 réussis, 0 échec.

## Ce qui n'est pas testé

- Une prévisualisation ouverte sans connexion : il faut d'abord que la protection soit coupée (Ali, projet Vercel).
- Les pages intérieures en 200 et l'absence de requête HubSpot sur une prévisualisation.
- Le cas d'un projet Vercel monorepo à plusieurs projets : le réveil prend le premier projet qui a une `previewUrl`.
- Aucun passage avec H.
