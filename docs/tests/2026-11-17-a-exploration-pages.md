# #57 — Brique A : trouver les pages (17 novembre 2026)

## Périmètre livré

Trois fichiers seulement : `agent/src/exploration/pages.ts`, `agent/exploration-pages.test.ts` et ce rapport.
Aucun H, navigateur, contrat, dépendance npm ou commande `explorer`. Aucun assemblage ni parallélisme H.

## API pour l'étape 2

```ts
export interface DiscoveryOptions {
  max?: number;
  fetch?: typeof globalThis.fetch;
}
export interface PageDiscovery {
  pages: string[];
  excluded: Array<{ url: string; reason: string }>;
  errors: Array<{ url: string; message: string }>;
}
export async function discoverPages(
  url: string,
  { max = 15, fetch: request = globalThis.fetch }: DiscoveryOptions = {},
): Promise<PageDiscovery>;
```

Import direct : `import { discoverPages } from "./src/exploration/pages.ts";` depuis la racine d'`agent/`.
`pages` contient les adresses HTTP(S) HTML effectivement lues, normalisées et dédoublonnées, dans l'ordre : accueil, parcours en profondeur des sitemaps, adresse d'entrée si différente, puis liens HTML en largeur. Les échecs ne deviennent pas des pages réussies : ils sont dans `errors` et/ou `excluded`. L'assemblage doit conserver ces informations dans son rapport, sans transformer une découverte partielle en succès global.

Mêmes hôtes avec ou sans `www` seulement, sans sous-domaines supplémentaires ni autre port ; protocole/hôte de sortie alignés sur l'adresse d'entrée. Suppression des fragments, slash final hors accueil, paramètres `utm_*`, identifiants publicitaires et de suivi connus ; paramètres fonctionnels gardés et triés.
Les doublons sont ignorés. Les formulaires et connexions sont filtrés par destination ; les actions de formulaires et liens de téléchargement repérés dans le HTML ne sont jamais suivis. Les extensions non HTML et réponses de type non HTML sont exclues. Aucun formulaire n'est rempli ni envoyé.

`robots.txt` est lu avant les autres ressources : groupes `*`, `Disallow`, `Allow` le plus spécifique, `*`, `$`, directives `Sitemap`. Un robots absent (404) autorise le repli ; une erreur réseau/HTTP arrête la découverte, visible dans la sortie. Les redirections sont manuelles et leur cible est validée avant chaque GET.
Toutes les requêtes sont en série, limitées à 10 s chacune ; cinq redirections au plus par lecture, 30 sitemaps au plus et `max * 3` tentatives de pages au plus pour ne pas boucler sur des erreurs. `max: 0` ne fait aucun appel.

Raisons d'exclusion : `form`, `login`, `file`, `external`, `scheme`, `credentials`, `robots`, `robots-unavailable`, `content-type`, `invalid-url`, `redirect`, `unavailable`, `limit`, `request-limit`, `sitemap-limit`.
`limit` signifie une page admissible laissée de côté sans GET à cause du plafond, pas une erreur du site.

## Vérification hors réseau

- `node --test exploration-pages.test.ts` depuis `agent/` : 18 tests, 18 réussites, aucun échec.
- `pnpm --filter @horama/agent lint` : vert.
- `git fetch origin dev && git merge --no-edit origin/dev`, puis `pnpm install && pnpm -r --if-present run check` : vert sur `dev` actualisé (`a746341fa5ba83ca2ff220be6bf8cf6371d0e73f`) ; les 106 tests d'`agent/` passent, dont les 18 nouveaux.

Les réponses factices couvrent : robots et arrêt fermé, sitemap XML, index imbriqués avec cycle/namespace/CDATA, liens sans sitemap, exclusions, normalisation, ordre stable, plafond, erreurs HTTP/réseau et types non HTML, redirections sûres et slash/www, base HTML, absence de requêtes concurrentes. Aucun appel réseau dans ces tests.

## Essai réel unique — Eugenia School

Appel : `await discoverPages("https://www.eugeniaschool.com", { max: 15 })`, avec un wrapper de `fetch` pour journaliser les réponses, sans modifier leur contenu.
Début : 2026-11-17T18:43:54.482Z. Fin : 2026-11-17T18:43:58.119Z. Durée mesurée côté client, journalisation incluse : 3.636 s.
19 GET en série : robots, trois ressources sitemap (dont le 404 attendu de `sitemap.xml`), puis 15 pages HTML toutes en HTTP 200.
144 adresses exclues : 6 formulaires/destinations assimilées, 58 externes, 1 fichier, 79 au-delà du plafond.
Aucune erreur dans `errors`. Aucun accès à `/studio`, aucune cible externe ou formulaire chargé, aucun envoi de formulaire.
Aucune session H ni Holo : durée/coût de ces modèles et constats visuels non mesurés ici.
La version finale a aussi été rejouée hors réseau contre les 19 réponses de cet unique essai archivées sur la VM : mêmes adresses trouvées/exclues et mêmes erreurs, sans nouveau passage réel.

Robots reçu (HTTP 200) :

```text
User-agent: *
Allow: /
Disallow: /studio

Sitemap: https://www.eugeniaschool.com/sitemap-index.xml
```

`sitemap.xml` est absent (404). Le `Sitemap` déclaré donne `sitemap-index.xml`, puis `sitemap-0.xml` (tous deux HTTP 200). L'ordre du plan du site sélectionne beaucoup d'articles de blog : aucun réordonnancement pour privilégier les programmes n'est appliqué.

### Pages trouvées et lues — ordre rendu

1. <https://www.eugeniaschool.com/>
2. <https://www.eugeniaschool.com/alternance>
3. <https://www.eugeniaschool.com/approche-pedagogique>
4. <https://www.eugeniaschool.com/blog/7-idees-de-business-a-lancer-pendant-ses-etudes>
5. <https://www.eugeniaschool.com/blog/agents-ia-tout-savoir-sur-ces-assistants-dintelligence-artificielle-et-leurs-applications-metiers>
6. <https://www.eugeniaschool.com/blog/algorithme-parcoursup-classement-2027>
7. <https://www.eugeniaschool.com/blog/chatgpt-vs-mistral-ai-deux-visions-de-lintelligence-artificielle>
8. <https://www.eugeniaschool.com/blog/choix-ecole-ia>
9. <https://www.eugeniaschool.com/blog/comment-lintelligence-artificielle-revolutionne-t-elle-lentrepreneuriat-dans-le-e-commerce-en-2025>
10. <https://www.eugeniaschool.com/blog/comment-trouver-premier-stage>
11. <https://www.eugeniaschool.com/blog/creer-agent-ia-sans-coder-tutoriel>
12. <https://www.eugeniaschool.com/blog/data-analyst-data-scientist-data-engineer-quelles-differences-et-quel-role-dans-le-cycle-de-la-donnee>
13. <https://www.eugeniaschool.com/blog/excel-vs-power-bi-vs-tableau-quel-outil-de-data-visualisation-choisir>
14. <https://www.eugeniaschool.com/blog/fin-de-parcoursup-ce-qui-change-premiere-terminale>
15. <https://www.eugeniaschool.com/blog/focus-sur-le-metier-de-sales-ops-en-startup>

### Adresses exclues — liste complète

Aucune des cibles ci-dessous n'a été chargée. `form` est volontairement conservateur : les pages éditoriales contenant « candidature » ou « admission » dans leur chemin sont aussi exclues.

| Adresse | Raison |
|---|---|
| <https://www.eugeniaschool.com/brochure> | `form` |
| <https://www.eugeniaschool.com/candidature> | `form` |
| <https://www.eugeniaschool.com/contact> | `form` |
| <https://www.eugeniaschool.com/evenements/webinar-candidature> | `form` |
| <https://www.eugeniaschool.com/processus-admission> | `form` |
| <https://www.youtube.com/watch?v=lF3Sju1MvIQ> | `external` |
| <https://www.eugeniaschool.com/guide-de-candidature> | `form` |
| <https://www.facebook.com/EugeniaSchoolGroupeAGDS/?profile_tab_item_selected=about&_rdr> | `external` |
| <https://www.instagram.com/eugenia.school/> | `external` |
| <https://www.youtube.com/@EugeniaSchool> | `external` |
| <https://www.linkedin.com/school/eugenia-school/?viewAsMember=true> | `external` |
| <https://www.eugeniaschool.com/docs/qualianor-certification.pdf> | `file` |
| <https://albert-school.notion.site/Data-Privacy-Politique-de-confidentialit-747674845ae54dafa6e41193471129b4?pvs=4> | `external` |
| <https://albert-school.notion.site/Mentions-L-gales-Eugenia-School-9a44309e169a4d99ba8ffbdb443ed6bc> | `external` |
| <https://www.youtube.com/watch?v=cPbEkqnoA18> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2F7-idees-de-business-a-lancer-pendant-ses-etudes.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2F7-idees-de-business-a-lancer-pendant-ses-etudes.html&text=7%20id%C3%A9es%20de%20business%20%C3%A0%20lancer%20pendant%20ses%20%C3%A9tudes> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2F7-idees-de-business-a-lancer-pendant-ses-etudes.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fagents-ia-tout-savoir-sur-ces-assistants-dintelligence-artificielle-et-leurs-applications-metiers.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fagents-ia-tout-savoir-sur-ces-assistants-dintelligence-artificielle-et-leurs-applications-metiers.html&text=Agents%20IA%20%3A%20d%C3%A9finition%20et%20applications%20m%C3%A9tiers> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fagents-ia-tout-savoir-sur-ces-assistants-dintelligence-artificielle-et-leurs-applications-metiers.html> | `external` |
| <https://www.parcoursup.gouv.fr/faq/thematiques/fonctionnement-de-parcoursup/examen-des-voeux-par-les-formations> | `external` |
| <https://lexpress-education.com/articles/selection-des-dossiers-parcoursup-qui-decide-et-comment/> | `external` |
| <https://www.letudiant.fr/educpros/actualite/parcoursup-algorithmes-locaux-pour-remettre-de-l-ordre.html> | `external` |
| <https://www.enseignementsup-recherche.gouv.fr/sites/default/files/content_migration/document/pr-sentation-des-algorithmes-de-parcoursup-7886.pdf> | `external` |
| <https://lcp.fr/actualites/parcoursup-transforme-suppressions-de-postes-annulees-les-reponses-du-gouvernement-a-la> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Falgorithme-parcoursup-classement-2027.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Falgorithme-parcoursup-classement-2027.html&text=Algorithme%20Parcoursup%20%3A%20comment%20les%20formations%20te%20classent%20(et%20ce%20qui%20change%20en%202027)> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Falgorithme-parcoursup-classement-2027.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fchatgpt-vs-mistral-ai-deux-visions-de-lintelligence-artificielle.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fchatgpt-vs-mistral-ai-deux-visions-de-lintelligence-artificielle.html&text=ChatGPT%20vs%20Mistral%20AI%20%3A%20deux%20visions%20de%20l%E2%80%99intelligence%20artificielle> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fchatgpt-vs-mistral-ai-deux-visions-de-lintelligence-artificielle.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fchoix-ecole-ia.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fchoix-ecole-ia.html&text=Qu%E2%80%99est-ce%20qu%E2%80%99une%20%C3%A9cole%20IA%20%3F%20Ce%20qu%E2%80%99on%20y%20apprend%2C%20et%20comment%20la%20choisir> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fchoix-ecole-ia.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcomment-lintelligence-artificielle-revolutionne-t-elle-lentrepreneuriat-dans-le-e-commerce-en-2025.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcomment-lintelligence-artificielle-revolutionne-t-elle-lentrepreneuriat-dans-le-e-commerce-en-2025.html&text=Comment%20l%E2%80%99IA%20r%C3%A9volutionne%20le%20e-commerce%20en%202025%20%3F> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcomment-lintelligence-artificielle-revolutionne-t-elle-lentrepreneuriat-dans-le-e-commerce-en-2025.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcomment-trouver-premier-stage.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcomment-trouver-premier-stage.html&text=Comment%20trouver%20son%20premier%20stage%20%3F> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcomment-trouver-premier-stage.html> | `external` |
| <https://help.openai.com/en/articles/8554397-creating-a-gpt> | `external` |
| <https://dust.tt/> | `external` |
| <https://n8n.io/> | `external` |
| <https://docs.n8n.io/advanced-ai/> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcreer-agent-ia-sans-coder-tutoriel.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcreer-agent-ia-sans-coder-tutoriel.html&text=Cr%C3%A9er%20un%20agent%20IA%20sans%20coder%20%3A%20le%20tutoriel%20pas%20%C3%A0%20pas%20(GPT%2C%20Dust%2C%20n8n)> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fcreer-agent-ia-sans-coder-tutoriel.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fdata-analyst-data-scientist-data-engineer-quelles-differences-et-quel-role-dans-le-cycle-de-la-donnee.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fdata-analyst-data-scientist-data-engineer-quelles-differences-et-quel-role-dans-le-cycle-de-la-donnee.html&text=Data%20Analyst%2C%20Data%20Scientist%2C%20Data%20Engineer%20%3A%20quelles%20diff%C3%A9rences%20et%20quel%20r%C3%B4le%20dans%20le%20cycle%20de%20la%20donn%C3%A9e%20%3F> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fdata-analyst-data-scientist-data-engineer-quelles-differences-et-quel-role-dans-le-cycle-de-la-donnee.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fexcel-vs-power-bi-vs-tableau-quel-outil-de-data-visualisation-choisir.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fexcel-vs-power-bi-vs-tableau-quel-outil-de-data-visualisation-choisir.html&text=Excel%20vs%20Power%20BI%20vs%20Tableau%20%3A%20quel%20outil%20de%20data%20visualisation%20choisir%20%3F> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Fexcel-vs-power-bi-vs-tableau-quel-outil-de-data-visualisation-choisir.html> | `external` |
| <https://www.publicsenat.fr/actualites/education/parcoursup-effectif-des-classes-emplois-du-temps-les-reponses-du-gouvernement-a-la-mobilisation-lyceenne> | `external` |
| <https://www.parcoursup.gouv.fr/> | `external` |
| <https://www.planetegrandesecoles.com/fin-de-parcoursup> | `external` |
| <https://www.enseignementsup-recherche.gouv.fr/> | `external` |
| <https://www.franceinfo.fr/societe/education/blocage-des-lycees/ce-qui-va-changer-pour-les-lyceens-apres-l-annonce-du-remplacement-de-parcoursup_8255467.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Ffin-de-parcoursup-ce-qui-change-premiere-terminale.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Ffin-de-parcoursup-ce-qui-change-premiere-terminale.html&text=Fin%20de%20Parcoursup%20%3A%20ce%20qui%20change%20en%20Premi%C3%A8re%20et%20en%20Terminale> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Ffin-de-parcoursup-ce-qui-change-premiere-terminale.html> | `external` |
| <https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Ffocus-sur-le-metier-de-sales-ops-en-startup.html> | `external` |
| <https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Ffocus-sur-le-metier-de-sales-ops-en-startup.html&text=Focus%20sur%20le%20m%C3%A9tier%20de%20Sales%20Ops%20en%20startup> | `external` |
| <https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.eugeniaschool.com%2Fblog%2Ffocus-sur-le-metier-de-sales-ops-en-startup.html> | `external` |
| <https://www.eugeniaschool.com/blog/gemini-chatgpt-claude-quelle-ia-choisir-pour-ses-etudes> | `limit` |
| <https://www.eugeniaschool.com/blog/geniathon-x-carrefour-links-un-defi-tech-et-business-releve-par-nos-etudiants> | `limit` |
| <https://www.eugeniaschool.com/blog/hackathon-welcome-to-the-jungle-x-eugenia-school-reinventer-la-vie-au-bureau-des-lecole> | `limit` |
| <https://www.eugeniaschool.com/blog/ia-embauches-jeunes-diplomes-metiers-exposes> | `limit` |
| <https://www.eugeniaschool.com/blog/importance-esprit-critique-decrypter-enjeux-monde> | `limit` |
| <https://www.eugeniaschool.com/blog/intelligence-artificielle-revolutionne-education> | `limit` |
| <https://www.eugeniaschool.com/blog/le-ghibli-style-et-lia> | `limit` |
| <https://www.eugeniaschool.com/blog/les-erreurs-classiques-des-jeunes-entrepreneurs-et-comment-les-eviter> | `limit` |
| <https://www.eugeniaschool.com/blog/maintenir-attentin-etudiants-enseignement-superieur> | `limit` |
| <https://www.eugeniaschool.com/blog/master-of-science-ai-applied-to-business-une-formation-pensee-pour-laction> | `limit` |
| <https://www.eugeniaschool.com/blog/msc-alternance-data-ia-salaire-rythme-contrat> | `limit` |
| <https://www.eugeniaschool.com/blog/orientation-post-bac-ces-chiffres-qui-montrent-quon-peut-et-doit-changer-de-cap> | `limit` |
| <https://www.eugeniaschool.com/blog/orientation-post-bac-comment-garder-le-cap-en-attendant-parcoursup> | `limit` |
| <https://www.eugeniaschool.com/blog/parcoursup-ne-decide-pas-de-tout-ces-ecoles-qui-recrutent-autrement> | `limit` |
| <https://www.eugeniaschool.com/blog/parcoursup-nest-pas-une-fin-en-soi-explorez-dautres-voies-vers-la-reussite> | `limit` |
| <https://www.eugeniaschool.com/blog/parcoursup-que-faire-maintenant-que-les-voeux-sont-clos> | `limit` |
| <https://www.eugeniaschool.com/blog/pourquoi-choisir-un-msc-en-alternance> | `limit` |
| <https://www.eugeniaschool.com/blog/projet-de-formation-motive-parcoursup-ia> | `limit` |
| <https://www.eugeniaschool.com/blog/que-faire-apres-un-bac-stmg> | `limit` |
| <https://www.eugeniaschool.com/blog/que-recherchent-vraiment-les-entreprises-chez-un-alternant-en-master> | `limit` |
| <https://www.eugeniaschool.com/blog/retour-sur-le-hackathon-des-3m> | `limit` |
| <https://www.eugeniaschool.com/blog/retour-sur-le-hackathon-go-fusion> | `limit` |
| <https://www.eugeniaschool.com/blog/stmg-specialisation-gf---une-voie-vers-les-metiers-de-la-gestion> | `limit` |
| <https://www.eugeniaschool.com/blog/stmg-specialisation-mercatique-un-tremplin-vers-le-marketing-et-lentrepreneuriat> | `limit` |
| <https://www.eugeniaschool.com/blog/top-5-des-debouches-apres-un-master-en-business-data> | `limit` |
| <https://www.eugeniaschool.com/campus/paris> | `limit` |
| <https://www.eugeniaschool.com/carrieres> | `limit` |
| <https://www.eugeniaschool.com/certification-architecte-ia> | `limit` |
| <https://www.eugeniaschool.com/certification-concepteur-solutions-no-code> | `limit` |
| <https://www.eugeniaschool.com/conseils-orientation> | `limit` |
| <https://www.eugeniaschool.com/entrepreneuriat> | `limit` |
| <https://www.eugeniaschool.com/entreprises-partenaires> | `limit` |
| <https://www.eugeniaschool.com/evenements> | `limit` |
| <https://www.eugeniaschool.com/evenements/apres-midi-portes-ouvertes> | `limit` |
| <https://www.eugeniaschool.com/evenements/atelier-coaching-m1---trouver-son-alternance> | `limit` |
| <https://www.eugeniaschool.com/evenements/atelier-entrepreneur> | `limit` |
| <https://www.eugeniaschool.com/evenements/creer-une-marque-avec-lia-generative> | `limit` |
| <https://www.eugeniaschool.com/evenements/event-4l-trophy-x-mario-kart> | `limit` |
| <https://www.eugeniaschool.com/evenements/immersion-du-6-decembre-2025> | `limit` |
| <https://www.eugeniaschool.com/evenements/job-dating> | `limit` |
| <https://www.eugeniaschool.com/evenements/job-dating-2> | `limit` |
| <https://www.eugeniaschool.com/evenements/job-dating-paris---special-alternance> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-12-dec> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-decouverte> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-decouverte-de-lia-du-samedi-6-juin-2026> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-decouverte-de-lia-samedi-14-mars-2026> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-du-6-decembre-2025> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-du-7-fevrier-2026> | `limit` |
| <https://www.eugeniaschool.com/evenements/matinee-portes-ouvertes> | `limit` |
| <https://www.eugeniaschool.com/evenements/matinee-portes-ouvertes-15-novembre> | `limit` |
| <https://www.eugeniaschool.com/evenements/webinaire-pedagogique> | `limit` |
| <https://www.eugeniaschool.com/evenements/webinaire-rencontrez-le-directeur-deugenia-school> | `limit` |
| <https://www.eugeniaschool.com/evenements/webinaire-summer-bootcamp-ia-albert-school-eugenia-school> | `limit` |
| <https://www.eugeniaschool.com/evenements/webinar-parcoursup-quelles-alternatives> | `limit` |
| <https://www.eugeniaschool.com/evenements/webinar-pedagogique-hackathon-des-3m-les-coulisses> | `limit` |
| <https://www.eugeniaschool.com/evenements/workshop-e-commerce-ia> | `limit` |
| <https://www.eugeniaschool.com/faq> | `limit` |
| <https://www.eugeniaschool.com/financement> | `limit` |
| <https://www.eugeniaschool.com/methode-eugenia> | `limit` |
| <https://www.eugeniaschool.com/notre-adn> | `limit` |
| <https://www.eugeniaschool.com/portfolio> | `limit` |
| <https://www.eugeniaschool.com/presse> | `limit` |
| <https://www.eugeniaschool.com/programme/bachelor-ia-business> | `limit` |
| <https://www.eugeniaschool.com/programme/bachelor-ia-business-3eme-annee-alternance> | `limit` |
| <https://www.eugeniaschool.com/programme/master-ia-business-alternance> | `limit` |
| <https://www.eugeniaschool.com/projets-entreprises> | `limit` |
| <https://www.eugeniaschool.com/projets-entreprises/dust-hackathon> | `limit` |
| <https://www.eugeniaschool.com/projets-entreprises/mistral-ai-hackathon> | `limit` |
| <https://www.eugeniaschool.com/projets-entreprises/openai-hackathon> | `limit` |
| <https://www.eugeniaschool.com/recruter-nos-etudiants> | `limit` |
| <https://www.eugeniaschool.com/simulateur-trajectoire> | `limit` |
| <https://www.eugeniaschool.com/tech-hub> | `limit` |
| <https://www.eugeniaschool.com/vie-etudiante> | `limit` |
| <https://www.eugeniaschool.com/curricula-bachelor> | `limit` |
| <https://www.eugeniaschool.com/programme/bachelor> | `limit` |
| <https://www.eugeniaschool.com/programme/msc> | `limit` |
| <https://www.eugeniaschool.com/programme/master> | `limit` |
| <https://www.eugeniaschool.com/debouches> | `limit` |
| <https://www.eugeniaschool.com/evenements/journee-portes-ouvertes-14-nov> | `limit` |

## Limites et suite

Extraction statique des attributs HTML et balises XML sans dépendance : pas de rendu JavaScript, pas de parseur HTML généraliste, pas de sitemap compressé `.gz`. Une interface SPA sans liens HTML n'est donc pas intégralement découverte. Les filtres par chemin restent conservateurs et ne garantissent pas de reconnaître tout formulaire derrière un nom opaque.
Les redirections inter-domaines sont refusées ; les règles robots sont appliquées au site d'entrée, avec `www` et sans `www` traités comme le même site.
Aucun verdict visuel n'est produit. Restent exclusivement pour l'étape 2 : consigne H, visite via le coureur, contrôles et Holo, C4 par page, références/notes d'écran, synthèse scène et commande d'exploration. L'étape 3 (`--agents 3`) n'est pas commencée.
Le format Nathan `docs/decisions/2026-11-17-format-exploration.md`, arrivé sur `dev` pendant ce travail, a été lu : l'adaptation vers `horama-exploration-1` appartient à l'assemblage. La présente API reste locale ; elle ne fournit pas encore la provenance fine `trouvee_par` par page attendue par cette synthèse.
