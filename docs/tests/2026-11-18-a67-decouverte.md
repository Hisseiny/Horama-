# Découverte des pages — a-67

## Périmètre et méthode

[#67](https://github.com/Hisseiny/Horama-/issues/67), point 1 : uniquement les points 1 et 2 de [#63](https://github.com/Hisseiny/Horama-/issues/63). Corps et commentaires de #63, #67 et #78 lus. Format `horama-exploration-1` inchangé.

Priorité aux menus HTML, répartis entre sous-listes (premier, dernier, puis vers le centre) pour ne pas épuiser le budget dans le premier sous-menu ; puis header/footer, sitemap et liens du corps/des pages visitées. Les préfixes ayant plus de `sectionMax` candidats sont plafonnés à 2 par défaut. Un préfixe englobant un sous-préfixe répétitif n'est pas plafonné globalement, pour ne pas limiter tout un arbre linguistique à deux pages. Aucun domaine ni mot-clé propre au banc dans le code.

Pages d'admission/contact/candidature visitables. Seuls les chemins de soumission explicites, actions de formulaires et certains domaines tiers sont filtrés comme formulaires. Aucun envoi : seulement des GET. Filtres fichiers/connexion/robots conservés. Signature conservée, option additive `sectionMax`.

Appel direct à `discoverPages(url, { max: 15, fetch: compteurAutourDeFetch })`, Node 22.23.5. Temps par `performance.now()`, requêtes comptées avec redirections. Aucun navigateur, H/Holo ou clé. Une découverte par site Nathan, l'un après l'autre, sans boucle de relance. Eugenia : un premier essai (15 retenues, 115 exclusions, 19 requêtes, 1,476537069 s, 5 références sur 7), une lecture supplémentaire de l'accueil pour comprendre les sous-menus, puis l'essai final ci-dessous. Ce n'est donc pas un passage unique sur Eugenia.

Les exclusions sont des couples URL/raison, pas uniquement des pages HTML : liens externes, protocoles et sitemaps compris. Comptes exhaustifs par raison et exemples ci-dessous ; les dizaines de milliers d'URL exclues ne sont pas toutes recopiées. Résultats bruts locaux : `/home/ubuntu/a67-backup/{eugenia-final,albert,kpmg,skema,grant}.json` (non versionnés).

Le dernier garde-fou, ajouté après les mesures, protège l'adresse initiale interdite par robots et conserve les candidats du sitemap. Testé hors ligne ; aucune des cinq adresses mesurées n'était interdite, pas de nouveau passage réseau.

## Mesures

| Site | Retenues | Exclusions | Erreurs | Requêtes | Durée (s) |
|---|---:|---:|---:|---:|---:|
| Eugenia | 15 | 115 | 0 | 19 | 1.289575 |
| Albert School | 15 | 970 | 0 | 33 | 2.451577 |
| KPMG | 15 | 33808 | 0 | 46 | 10.222395 |
| SKEMA | 1 | 0 | 1 | 3 | 0.162459 |
| Grant Thornton | 15 | 1622 | 0 | 32 | 8.628768 |

### Eugenia

Adresse : https://www.eugeniaschool.com/

Pages retenues, dans l'ordre :

- https://www.eugeniaschool.com/
- https://www.eugeniaschool.com/programme/bachelor-ia-business
- https://www.eugeniaschool.com/notre-adn
- https://www.eugeniaschool.com/entreprises-partenaires
- https://www.eugeniaschool.com/processus-admission
- https://www.eugeniaschool.com/evenements
- https://www.eugeniaschool.com/tech-hub
- https://www.eugeniaschool.com/certification-architecte-ia
- https://www.eugeniaschool.com/carrieres
- https://www.eugeniaschool.com/recruter-nos-etudiants
- https://www.eugeniaschool.com/faq
- https://www.eugeniaschool.com/presse
- https://www.eugeniaschool.com/programme/master-ia-business-alternance
- https://www.eugeniaschool.com/campus/paris
- https://www.eugeniaschool.com/projets-entreprises

Exclusions :

- `external` : 32. Exemples : `https://www.facebook.com/EugeniaSchoolGroupeAGDS/?profile_tab_item_selected=about&_rdr` ; `https://www.instagram.com/eugenia.school/`.
- `file` : 1. Exemples : `https://www.eugeniaschool.com/docs/qualianor-certification.pdf`.
- `limit` : 81. Exemples : `https://www.eugeniaschool.com/financement` ; `https://www.eugeniaschool.com/conseils-orientation`.
- `section-limit` : 1. Exemples : `https://www.eugeniaschool.com/programme/bachelor-ia-business-3eme-annee-alternance`.

Erreurs : aucune.

Avis : Les sept références sont présentes : programmes, identité, campus et admission bien représentés. Aucun article de blog retenu : la découverte ne garantit donc pas de retrouver le chapô coupé de #63.

### Albert School

Adresse : https://www.albertschool.com/fr/

Pages retenues, dans l'ordre :

- https://www.albertschool.com/fr
- https://www.albertschool.com/fr/about
- https://www.albertschool.com/fr/campus/paris
- https://www.albertschool.com/fr/programs/msc-data-for-business
- https://www.albertschool.com/fr/corp-partners
- https://www.albertschool.com/fr/summer-school
- https://www.albertschool.com/fr/executive-education
- https://www.albertschool.com/fr/press
- https://www.albertschool.com/fr/faq
- https://www.albertschool.com/fr/campus/madrid
- https://www.albertschool.com/fr/programs/specialized-master-data-ai-for-business-leaders
- https://www.albertschool.com/fr/deep-dives
- https://www.albertschool.com/fr/join-the-team
- https://www.albertschool.com/fr/ai-at-albert-school
- https://www.albertschool.com/fr/programs/bachelor-business-data

Exclusions :

- `external` : 61. Exemples : `https://www.albertventures.vc/` ; `https://deepdive.albertschool.com/`.
- `scheme` : 1. Exemples : `mailto:summerschool@albertschool.com`.
- `section-limit` : 3. Exemples : `https://www.albertschool.com/fr/campus/marseille` ; `https://www.albertschool.com/fr/campus/geneva`.
- `limit` : 905. Exemples : `https://www.albertschool.com/fr/recruitment-and-employer-branding` ; `https://www.albertschool.com/fr/events`.

Erreurs : aucune.

Avis : Pages institutionnelles, programmes, campus et FAQ représentés. Sélection utile mais non exhaustive ; les admissions ne sont pas garanties dans ce budget.

### KPMG

Adresse : https://kpmg.com/fr/fr.html

Pages retenues, dans l'ordre :

- https://kpmg.com/fr/fr.html
- https://kpmg.com/fr/fr/insights.html
- https://kpmg.com/fr/fr/services.html
- https://kpmg.com/fr/fr/secteurs.html
- https://kpmg.com/fr/fr/carrieres.html
- https://kpmg.com/fr/fr/a-propos.html
- https://kpmg.com/fr/fr/misc/contactez-nous.html
- https://kpmg.com/fr/fr/media.html
- https://kpmg.com/fr/fr/misc/legal/mentions.html
- https://kpmg.com/fr/fr/misc/legal/accessibilite.html
- https://kpmg.com/fr/fr/misc/confidentialite-gestion-donnees.html
- https://kpmg.com/fr/fr/misc/confidentialite-gestion-donnees/notice-cookies.html
- https://kpmg.com/xx/en/misc/governance.html
- https://kpmg.com/ch/en.html
- https://kpmg.com/ch/en/about.html

Exclusions :

- `external` : 38. Exemples : `https://www.linkedin.com/company/kpmg-france/` ; `https://www.instagram.com/kpmg_france/`.
- `login` : 17. Exemples : `https://kpmg.com/ch/en/misc/register-for-masterclass.html` ; `https://kpmg.com/ch/de/misc/register-for-masterclass.html`.
- `sitemap-limit` : 147. Exemples : `https://kpmg.com/br/en/sitemap.xml` ; `https://kpmg.com/br/pt/sitemap.xml`.
- `file` : 18. Exemples : `https://kpmg.com/content/dam/kpmgsites/fr/pdf/a-propos/our-impact-plan-2026.pdf.coredownload.inline.pdf` ; `https://kpmg.com/content/dam/kpmgsites/fr/pdf/a-propos/our-impact-plan-2024.pdf`.
- `scheme` : 1. Exemples : `mailto:kpmg-france@kpmg.fr?Subject=D%C3%A9claration%20d%27accessibilit%C3%A9%20de%20kpmg.fr`.
- `limit` : 33584. Exemples : `https://kpmg.com/ch/en/about/commitment.html` ; `https://kpmg.com/ch/en/about/corporate-sustainability-report.html`.
- `section-limit` : 3. Exemples : `https://kpmg.com/fr/fr/misc/legal/accessibilite/schema-pluriannuel-2024-2026.html` ; `https://kpmg.com/fr/fr/misc/legal/accessibility.html`.

Erreurs : aucune.

Avis : Entrées principales françaises présentes, mais beaucoup de mentions légales et trois pages internationales dont deux suisses. Le domaine commun ne garantit pas la cohérence de langue/pays : pertinence partielle.

### SKEMA

Adresse : https://www.skema.edu/fr

Pages retenues, dans l'ordre :

- https://www.skema.edu/fr

Exclusions :

Aucune.

Erreurs : `https://www.skema.edu/sitemap.xml` : Plan du site XML non reconnu (urlset ou sitemapindex attendu)..

Avis : Une seule page retenue, aucun lien découvert ; sitemap reçu non reconnu comme XML. Cause précise non investiguée (JavaScript, protection ou autre réponse). Couverture insuffisante, pas une réussite de généralité.

### Grant Thornton

Adresse : https://www.grantthornton.fr/fr/

Pages retenues, dans l'ordre :

- https://www.grantthornton.fr/fr
- https://www.grantthornton.fr/fr/service/audit
- https://www.grantthornton.fr/fr/service/audit-assurance-solutions
- https://www.grantthornton.fr/fr/service/deal-advisory
- https://www.grantthornton.fr/fr/service/conseil-operationnel
- https://www.grantthornton.fr/fr/service/expertise-conseil
- https://www.grantthornton.fr/fr/service/esg-advisory-audit
- https://www.grantthornton.fr/fr/service/international-business-advisory
- https://www.grantthornton.fr/fr/secteurs/financial-services
- https://www.grantthornton.fr/fr/secteurs/public-economie-sociale-protection-sociale-peps
- https://www.grantthornton.fr/fr/people-culture/lexperience-de-la-confiance
- https://www.grantthornton.fr/fr/service/audit-assurance-solutions/audit-des-informations-esg
- https://www.grantthornton.fr/fr/service/deal-advisory/operational-deal-services
- https://www.grantthornton.fr/fr/service/conseil-operationnel/data-et-automation
- https://www.grantthornton.fr/fr/service/expertise-conseil/diagnostic-expert-360tm

Exclusions :

- `form` : 2. Exemples : `https://www.grantthornton.fr/resultats-de-la-recherche/` ; `https://www.grantthornton.fr/nos-experts/`.
- `external` : 30. Exemples : `https://www.grantthornton.global/en/` ; `https://myoffice.grant-thornton.fr/`.
- `file` : 3. Exemples : `https://www.grantthornton.fr/fr/insights/articles-et-publications/2024/mise-a-jour-de-nist-csf-v2.0/` ; `https://www.grantthornton.fr/globalassets/1.-member-firms/france/images/insights/2024/2024-12-17_grant-thornton_expertise-conseil.pdf`.
- `login` : 1. Exemples : `https://www.grantthornton.fr/fr/presse/2020/teletravailler-en-toute-deconnexion/`.
- `scheme` : 16. Exemples : `tel:+330141258746` ; `tel:+330141259081`.
- `robots` : 7. Exemples : `https://www.grantthornton.fr/PeopleService/GetVCard?contentGuid=b6d56bef-53a9-437c-82cf-3dd1e90e4f9f&lang=fr` ; `https://www.grantthornton.fr/PeopleService/GetVCard?contentGuid=645d2933-dd8f-4c2d-86f6-c84e35ab340e&lang=fr`.
- `limit` : 1563. Exemples : `https://www.grantthornton.fr/service/international-business-advisory/an-introduction-to-our-other-services` ; `https://www.grantthornton.fr/secteurs/financial-services/banque-et-asset-management`.

Erreurs : aucune.

Avis : Offres et secteurs présents, mais domination des services/sous-services. Le plafond n'agrège pas tout /fr/service/ quand il contient des sous-sections répétitives : limite de l'heuristique structurelle, sans classification sémantique.

## Sept références Eugenia

Chemins lus dans `vault-horama/eugenia/produit/`, sans modification :

- `/` : présente.
- `/programme/bachelor-ia-business` : présente.
- `/programme/master-ia-business-alternance` : présente.
- `/processus-admission` : présente.
- `/notre-adn` : présente.
- `/campus/paris` : présente.
- `/faq` : présente.

**7 sur 7 présentes** dans l'essai final, max 15.

## Vérifications

Tests ajoutés : menu/footer avant sitemap, anglais, sous-menus équilibrés, sections répétitives et plafond configurable, pages d'admission et formulaires visitables, aucun GET sur action submit, départ interdit par robots. Tests existants adaptés au nouvel ordre et au retrait du filtre lexical ; HTML vide, absence de sitemap, erreurs HTTP/réseau, robots indisponible, redirections, limites, fichiers, base HTML et XML couverts.

```text
$ node --test agent/exploration-pages.test.ts
1..24
# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 156.627685

$ pnpm install
Scope: all 7 workspace projects
Lockfile is up to date, resolution step is skipped
Done in 1.6s using pnpm v12.18.0

$ pnpm -r --if-present run check
agent check: 1..152
agent check: # tests 152
agent check: # suites 0
agent check: # pass 152
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 1051.475709
agent check: Done

$ grep -riE "eugenia|albertschool|kpmg|skema|grantthornton" agent/src
[aucune ligne ; code de sortie 1, normal pour grep sans correspondance]
```

Fusions de `origin/dev` puis `origin/a-57-pages-sitemaps-correctifs` effectuées, sans rebase. Aucun fichier hors périmètre édité manuellement ; les autres changements historiques viennent des fusions demandées. Les fichiers racine non suivis bloquant le checkout sont préservés dans `/home/ubuntu/a67-backup/`.

## Non vérifié et limites

- Ni contrôle de lien mort, capture, navigateur, Holo, ni verdict visuel : avis fondé sur les URL, non sur le rendu.
- Pas de second passage ni de deux sites supplémentaires : découverte seule demandée, pas le banc complet de #67 ni sa clôture.
- Menus uniquement JavaScript, DOM mal formé ou navigation non sémantique : extraction limitée au HTML reçu, heuristique sans dépendance.
- Détection des sections fondée sur les candidats initiaux accueil/sitemaps : les sections découvertes uniquement en profondeur peuvent y échapper.
- Domaines tiers de formulaires non exhaustifs ; les autres domaines externes restent exclus comme externes. Un chemin submit est une convention, pas une preuve de méthode HTTP serveur.
- #63 autorise à visiter un formulaire : interprétation retenue, conserver la page qui en contient un, ne pas suivre ses actions. #67 demande bien davantage que ce lot découverte. SKEMA et le bruit international KPMG restent des limites réelles ; aucune prétention de clôturer ces issues.

## Complément — diagnostic SKEMA et préférence de locale

### Diagnostic SKEMA : blocage anti-bot observé

Trois requêtes diagnostiques GET en série, sans navigateur ni tentative de contournement :

| Adresse | HTTP | Type reçu | Longueur du texte |
|---|---:|---|---:|
| `https://www.skema.edu/robots.txt` | 200 | text/html | 212 caractères |
| `https://www.skema.edu/fr` | 200 | text/html | 837 caractères |
| `https://www.skema.edu/sitemap.xml` | 200 | text/html | 212 caractères |

Le corps de robots.txt n'a **aucune ligne Sitemap**, seulement une page HTML avec meta `noindex,nofollow` et script `/_Incapsula_Resource`. L'accueil contient un iframe `/_Incapsula_Resource` et le texte explicite **« Request unsuccessful. Incapsula incident ID: … »**. Le sitemap renvoie le même petit HTML/script que robots.txt. Ces corps expliquent directement le résultat : robots ne fournit aucun sitemap, le sitemap par défaut n'est ni un urlset ni un index XML, et l'accueil n'a aucun lien a/area à extraire.

Vérification de l'hypothèse concurrente « parseur XML ou contenu uniquement JavaScript » : le sitemap reçu est du HTML, pas du gzip/XML à namespaces XHTML ; l'accueil affiche explicitement l'échec Incapsula. Le blocage est donc observé dans les réponses de cette machine, et non déduit de la seule absence de liens. Le contenu réel du site derrière cette protection n'a pas été obtenu : son éventuel rendu JavaScript reste inconnu. Aucun correctif spécifique au fournisseur, aucune tentative de contourner la protection. Le statut 200 ne prouve pas que la vraie page ait été consultée : l'unique page retenue par l'API reste une candidate, pas une couverture réussie du site. La politique robots réelle est également inaccessible derrière le blocage.

### Préférence de locale

Extraction générique d'un préfixe de chemin à un ou deux segments de deux lettres (avec variante régionale telle que pt-BR), y compris une adresse d'entrée terminant par .html/.htm : /fr/, /fr/fr.html, /en/, etc. Avant chaque sélection, les candidats de même locale passent avant les autres, à origine déjà validée par le filtre existant. L'ordre menu/footer/sitemap reste stable à l'intérieur de chaque groupe. Les nouvelles pages de même locale découvertes pendant la visite passent aussi avant le repli hors locale. Sans locale ou si ce groupe est épuisé, comportement de repli conservé.

Tests hors ligne : préfixes /fr/fr.html, /fr/, /en/, /pt-BR/, lien international de menu devant un candidat local de sitemap, découverte locale en profondeur, frontière de segment (pas de confusion /fr/ et /france/), repli hors locale sans autre candidat. Aucun domaine du banc ajouté dans le code.

La préférence ne pénalise pas les pages légales **de la bonne locale**. Elles restent pertinentes au sens de la navigation et restent dans le résultat KPMG : ce lot réduit le bruit international, pas tous les liens légaux. Le motif de locale est syntaxique ; un chemin métier de deux lettres peut être interprété comme une locale. Il ne change pas les règles de filtrage ni le format de sortie.

### Nouvelle mesure, une découverte par site affecté

Appels séquentiels SKEMA, KPMG, Eugenia ; max 15, compteur fetch et performance.now comme auparavant. Ces découvertes s'ajoutent aux trois requêtes diagnostiques SKEMA. Aucun H, clé ou navigateur.

| Site | Retenues | Exclusions | Erreurs | Requêtes | Durée (s) |
|---|---:|---:|---:|---:|---:|
| SKEMA | 1 | 0 | 1 | 3 | 0.171650 |
| KPMG | 15 | 33795 | 0 | 46 | 6.327831 |
| Eugenia | 15 | 115 | 0 | 19 | 1.152732 |

#### SKEMA — résultat du complément

Pages retenues :

- https://www.skema.edu/fr

Exclusions par raison : aucune.

Erreurs : `https://www.skema.edu/sitemap.xml` : Plan du site XML non reconnu (urlset ou sitemapindex attendu)..

#### KPMG — résultat du complément

Pages retenues :

- https://kpmg.com/fr/fr.html
- https://kpmg.com/fr/fr/insights.html
- https://kpmg.com/fr/fr/services.html
- https://kpmg.com/fr/fr/secteurs.html
- https://kpmg.com/fr/fr/carrieres.html
- https://kpmg.com/fr/fr/a-propos.html
- https://kpmg.com/fr/fr/misc/contactez-nous.html
- https://kpmg.com/fr/fr/media.html
- https://kpmg.com/fr/fr/misc/legal/mentions.html
- https://kpmg.com/fr/fr/misc/legal/accessibilite.html
- https://kpmg.com/fr/fr/misc/confidentialite-gestion-donnees.html
- https://kpmg.com/fr/fr/misc/confidentialite-gestion-donnees/notice-cookies.html
- https://kpmg.com/fr/fr/a-propos/engagement-citoyen.html
- https://kpmg.com/fr/fr/a-propos/gouvernance.html
- https://kpmg.com/fr/fr/abonnement.html

Exclusions par raison : `external` : 31 ; `login` : 16 ; `sitemap-limit` : 147 ; `file` : 18 ; `scheme` : 1 ; `section-limit` : 9 ; `limit` : 33573.

Erreurs : aucune.

#### Eugenia — résultat du complément

Pages retenues :

- https://www.eugeniaschool.com/
- https://www.eugeniaschool.com/programme/bachelor-ia-business
- https://www.eugeniaschool.com/notre-adn
- https://www.eugeniaschool.com/entreprises-partenaires
- https://www.eugeniaschool.com/processus-admission
- https://www.eugeniaschool.com/evenements
- https://www.eugeniaschool.com/tech-hub
- https://www.eugeniaschool.com/certification-architecte-ia
- https://www.eugeniaschool.com/carrieres
- https://www.eugeniaschool.com/recruter-nos-etudiants
- https://www.eugeniaschool.com/faq
- https://www.eugeniaschool.com/presse
- https://www.eugeniaschool.com/programme/master-ia-business-alternance
- https://www.eugeniaschool.com/campus/paris
- https://www.eugeniaschool.com/projets-entreprises

Exclusions par raison : `external` : 32 ; `file` : 1 ; `limit` : 81 ; `section-limit` : 1.

Erreurs : aucune.

Bilan : KPMG retient maintenant **15 pages sur 15 sous /fr/fr**, contre 12 précédemment ; les trois adresses internationales ont disparu. Les pages légales locales restent présentes. SKEMA reste insuffisant, résultat honnête cohérent avec le blocage observé. Eugenia conserve **les mêmes 15 URL et les 7 références sur 7**, y compris les deux programmes, processus-admission, notre-adn, campus/paris et faq. Albert School et Grant Thornton n'ont pas été relancés ; leurs mesures historiques ci-dessus restent inchangées.

Résultats bruts locaux : `/home/ubuntu/a67-backup/followup-{skema,kpmg,eugenia}.json`. Ils ne contiennent pas les cookies de réponse. Les listes d'exclusions ne sont toujours pas recopiées exhaustivement dans ce rapport ; les comptes par raison sont exhaustifs.

### Vérification du complément

`git fetch origin && git merge origin/dev` : `Already up to date.`

```text
$ node --test agent/exploration-pages.test.ts
1..26
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 137.261511

$ pnpm -r --if-present run check
agent check: 1..154
agent check: # tests 154
agent check: # suites 0
agent check: # pass 154
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 757.258161
agent check: Done

$ grep -riE "eugenia|albertschool|kpmg|skema|grantthornton" agent/src
[aucune ligne ; code 1 normal de grep sans correspondance]
```

Toujours aucune vérification graphique, aucun second passage visuel ou contrôle de défaut : le complément reste dans le périmètre découverte de #67/#63.

## Relecture PR #81 — réservation des sections

Une place est maintenant réservée à chaque section répétitive détectée, dans la limite de max moins la place de départ. La réservation minimale est **une** page (donc au plus sectionMax) ; le reste reste accessible selon le budget et le plafond de section. Une section déjà visitée satisfait sa réservation. Les échecs réseau ne la satisfont pas : le candidat suivant est tenté. Quand le budget est trop petit pour toutes les sections, priorité à leur première apparition. Avec une locale, seules les sections de cette locale réservent des places ; le repli hors locale ne doit pas évincer les pages locales.

Ordre interne choisi : **première découverte stable**, sans tri lexical ajouté ni dernière modification supposée. Les liens de menu équilibrés précèdent ceux du footer, puis les entrées du sitemap dans son ordre XML, puis les liens du corps et de profondeur. Pour une section absente du menu/footer, son premier candidat est donc sa première entrée dans le sitemap. La réservation ne change pas cet ordre. Aucun article ni domaine du banc dans le code.

Tests hors ligne : menu plus grand que max avec deux sections, réservation d'une page de chacune, ordre volontairement non alphabétique dans le sitemap, deuxième page de section si budget suffisant, erreur HTTP avec remplacement par le candidat suivant, max inférieur au nombre de sections, cas sans section et max 1.

### Une découverte réelle Eugenia, max 15

- Durée : **1,219020197 s** ; **19 requêtes**, **15 pages retenues**, **106 exclusions**, **0 erreur**.
- Article `/blog/fin-de-parcoursup-ce-qui-change-premiere-terminale` : **absent**. La règle générique choisit le premier article du sitemap, pas cet article précis.
- Références : **5 sur 7** ; MSc et campus/paris ont cédé leur place aux réservations. Ce compromis est celui de la priorité stable conservée, pas une impossibilité mathématique de choisir les sept références et un article en quinze pages.

Liste retenue, dans l'ordre :

1. https://www.eugeniaschool.com/
2. https://www.eugeniaschool.com/programme/bachelor-ia-business
3. https://www.eugeniaschool.com/notre-adn
4. https://www.eugeniaschool.com/entreprises-partenaires
5. https://www.eugeniaschool.com/processus-admission
6. https://www.eugeniaschool.com/evenements
7. https://www.eugeniaschool.com/tech-hub
8. https://www.eugeniaschool.com/certification-architecte-ia
9. https://www.eugeniaschool.com/carrieres
10. https://www.eugeniaschool.com/recruter-nos-etudiants
11. https://www.eugeniaschool.com/faq
12. https://www.eugeniaschool.com/presse
13. https://www.eugeniaschool.com/blog/7-idees-de-business-a-lancer-pendant-ses-etudes
14. https://www.eugeniaschool.com/evenements/apres-midi-portes-ouvertes
15. https://www.eugeniaschool.com/projets-entreprises/dust-hackathon

Proposition de réglage pour la démo : augmenter **max et sectionMax**, par exemple `{ max: 60, sectionMax: 20 }`, afin de visiter davantage d'articles dans leur ordre de découverte. Augmenter max seul ne suffit pas avec un plafond de deux articles. Ce réglage est une proposition non mesurée en réseau, pas la garantie d'atteindre l'article ni de retrouver ses défauts. Un max de 17 devrait libérer les deux places manquantes pour les références selon ce même ordre, également non mesuré. Pas de nouveau passage sur Albert School/KPMG/Grant Thornton : leurs chiffres précédents décrivent les versions précédentes, pas cette nouvelle politique.

Vérification après fusions demandées de origin/dev et origin/a-57-pages-sitemaps-correctifs :

```text
$ node --test agent/exploration-pages.test.ts
# tests 28
# pass 28
# fail 0
# duration_ms 178.730023

$ pnpm -r --if-present run check
agent check: # tests 158
agent check: # pass 158
agent check: # fail 0
agent check: # skipped 0
agent check: # duration_ms 825.782672
agent check: Done
```

Découverte seulement, toujours aucun constat visuel ni H : les deux défauts réels de #67 ne sont pas validés par cette mesure.
