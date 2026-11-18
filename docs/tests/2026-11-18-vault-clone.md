# Vault du clone du site d'Eugenia (issue #71, étape 1), 18 novembre 2026

Couloir Nathan. But : écrire `vault-horama/eugenia-clone/`, le vault du logiciel du mode dev, à partir des vrais textes du clone `Hisseiny/eugenia-school-website`. Il contient les notes d'écran, les règles entre pages, le champ `code:` vers `src/pages` et `src/data`, et les références. Installation faite sur le « go installation du clone » de Nathan, tapé dans la session de l'orchestrateur.

## Ce qui a été lancé

1. Copie du clone, commit `4e7dd32`, dans un dossier jetable du scratchpad de la session, hors du dépôt Horama : 50 Mo, et non 23 comme annoncé, à cause de l'historique git et des images.
2. `pnpm install --frozen-lockfile` (pnpm 12.18.0) : 278 paquets, `node_modules` de 220 Mo, magasin pnpm passé de 1,3 à 1,6 Go.
3. `pnpm build` : 34 pages en 9,3 s.
4. `astro preview --host 127.0.0.1 --port 4321`.
5. Lecture de 8 pages avec le Chrome de la scène (port 9335, profil jetable), page à 1280 × 900. Pour chacune, `capture()` de `automatisation/scene/scene.mjs`, la même fonction que les relevés du moteur, donne le texte affiché (`innerText`) et la capture du haut de page. Les pages : `/`, `/programmes`, les deux pages Bachelor, `/programme/master-ia-business-alternance`, `/admissions`, `/processus-admission` et `/faq`. Aucun clic, aucun formulaire ouvert ni envoyé.
6. Seconde lecture des 8 pages, puis comparaison pixel par pixel (tout octet RGBA différent compte) et comparaison des textes.
7. Sonde des règles avec le vrai code de `jugement/` (`verifierReleve`, `releverValeurs`) sur les textes relevés.
8. Sonde du vault avec `@horama/memoire` (`lireNotes`, `lireTestsAcceptes`, `lireReferences`, `urlDepart`), puis `choisirTests` (`automatisation/impact/impact.mjs`) sur quatre fichiers modifiés.
9. Retrait : arrêt de `astro preview` (port 4321 libre), suppression du dossier du clone, `pnpm store prune`.
10. `pnpm -r check` sur la branche.

## Ce qui en est sorti

**Stabilité des pages.** Les deux lectures ont donné 0 pixel d'écart sur chacune des 8 pages, et des textes identiques. Les notes n'ont donc aucune zone ignorée.

**Règles, jugées par le code de `jugement/` :**

| Règle | Résultat |
|---|---|
| Durée du Bachelor : `accueil.Bachelor IA Applied to Business (chiffre au-dessus)` = `programmes.Durée` | `PASS`, « 3 ans = 3 ans » |
| La même, accueil modifié en « 4 ans » (texte relevé, une seule ligne changée) | `VERIFIED_FAIL`, « 4 ans ≠ 3 ans » |
| Durée du MSc : `accueil.MSc IA Applied to Business (chiffre au-dessus)` = `programmes.MSc IA Applied to Business (chiffre au-dessus)` | `INCONCLUSIVE`, « aucun chiffre juste au-dessus de « MSc IA Applied to Business » sur programmes » |

La durée du MSc n'est donc pas une règle calculée. Elle est écrite en prose dans `regles-entre-pages.md`, avec la raison et la convention qui manque, à demander à Leslie. Le tableau « Bachelor ou Master ? » n'est pas un tableau HTML : sa ligne « Durée » se lit comme la durée du Bachelor seule. Le « 2 ans » du MSc est à la ligne suivante, sans libellé.

**Vault lu par `memoire`.** Il compte 6 notes, 3 tests acceptés (`accueil-vers-programmes` avec 1 règle, `bachelor-vers-msc`, `admissions`) et 5 références `defaut--v1.png`. L'adresse de départ d'un test sur l'accueil est `/`.

**Impact (`choisirTests`), par fichier modifié :**

| Fichier modifié | Retenus | Écartés |
|---|---|---|
| `src/data/home.ts` | `accueil-vers-programmes` | `admissions`, `bachelor-vers-msc` |
| `src/data/admissions.ts` | `admissions` | `accueil-vers-programmes`, `bachelor-vers-msc` |
| `src/components/LivePage.astro` | `bachelor-vers-msc` | `accueil-vers-programmes`, `admissions` |
| `src/layouts/Base.astro` | aucun | les trois |

`Base.astro` et les autres fichiers communs ne sont listés dans aucune note, comme le dit le README du vault : un tel changement ne rejoue rien par le code.

**Retrait.**
- Port 4321 libre, dossier du clone supprimé.
- `pnpm store prune` : « Removed 32618 files (943 MB), Removed 384 packages », et le magasin est passé de 1,6 Go à 80 Ko. Prune a donc retiré bien plus que les 300 Mo du clone : il a aussi vidé les paquets que le magasin gardait en cache avant l'installation (1,3 Go).
- Après le retrait, `pnpm -r check` d'Horama donne le code 0 : les projets déjà installés gardent leurs fichiers. Un prochain `pnpm install` dans un autre projet retéléchargera ce qui lui manque.

**Check.** `pnpm -r check` : code 0, 339 tests, 338 réussis, 0 échec.

## Ce qui n'est pas testé

- Aucun passage avec l'agent H ni Holo sur le clone. Les tests n'ont jamais été joués par H : les consignes (« Voir les programmes », lien « MSc » du pied de page) sont à éprouver au premier passage.
- Les références viennent du clone servi en local, pas d'une prévisualisation Vercel. L'écart de rendu entre les deux est à mesurer au premier passage.
- La règle sur le nombre d'étapes (« Quatre étapes » sur Admissions, « 4 étapes » sur l'accueil) n'est écrite qu'en prose : ni l'une ni l'autre n'est lisible par une convention actuelle.
- Les quatre écarts de nommage et d'affichage relevés (README du vault) ne sont pas tranchés.
