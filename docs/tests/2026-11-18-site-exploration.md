# Exploration rangée dans le dossier du logiciel (--site, après #157)

Date : 18/11, soir. Branche `nathan-122-site-exploration`. Aucune session H, aucun appel à Holo, aucune base partagée.

## Ce qui change

- `automatisation/scene/exploration.mjs` : option `--site <dossier>`, passée à `explorer({ site })` (option ajoutée par la PR #157). Sans elle, rien ne change : le dossier du site est tiré du nom d'hôte de `--url`. Un identifiant invalide (hors lettres, chiffres, tirets, soulignés) arrête la scène avant tout lancement.
- `automatisation/reveil/pr.mjs` : l'exploration d'une prévisualisation reçoit `--site <logiciel>` (par exemple `eugenia-clone`). Chaque prévisualisation Vercel a son propre nom d'hôte : sans cela, chaque PR créait un dossier à part dans le vault, et les décisions « voulu » n'étaient pas reprises d'une PR à l'autre.
- README du réveil et de la scène.

## Ce qui a été lancé, et ce qui en est sorti

1. `node --test automatisation/reveil/pr.test.mjs` : 14 tests, 14 réussis (le test de `jouerPr` attend maintenant `--site site-essai` dans la commande d'exploration).
2. `exploration.mjs --site ../hors-vault --sans-agent --sans-holo --sans-base` : sortie 2, « --site attend un identifiant de dossier (lettres, chiffres, tirets, soulignés). », avant Chrome.
3. Exploration sans agent ni Holo sur un site local de deux pages (127.0.0.1), vault temporaire, `--site essai-site` :
   - avec `dev` avant la fusion de #157 : passage écrit dans `127-0-0-1/passages/` (l'option était ignorée) ;
   - avec `dev` après #157 : passage écrit dans `essai-site/passages/`, aucun dossier `127-0-0-1`.
4. `pnpm -r check` : 260 tests d'`agent`, 79 de `jugement`, 0 échec, avec `CHROME_BIN` pointé vers le Chrome du Mac. Sans cette variable, un test d'`agent/exploration-reseau.test.ts` (#68) échoue sur ce Mac : il lance `google-chrome`, le nom du Chrome sous Linux (`spawn google-chrome ENOENT`). Ce test n'est pas touché par cette PR.

## Ce qui n'est pas testé

- Un passage réel du réveil sur la PR #16 du clone (agent H) : il attend le go de Nathan.
