# PR de documentation — issue #36, point 2

`ouvrirPrDoc` ouvre une PR pour une correction **déjà acceptée** par l'humain (C5). Aucun appel à H, aucune dépendance ajoutée. Git, une identité de commit configurée et `gh` authentifié avec accès en écriture au dépôt choisi sont nécessaires.

```js
import { ouvrirPrDoc } from "./automatisation/pr-doc/index.mjs";

const { fichier, avant, apres } = decision.correction_de_note;
const result = await ouvrirPrDoc(
  { passage_id: decision.passage_id, fichier, avant, apres, decision },
  {
    repository: "mon-equipe/vault-essai", // obligatoire, aucun dépôt implicite
    base: "dev",                        // branche cible existante
    vaultPath: `vault-horama/${decision.logiciel}`, // relatif au dépôt GitHub
    passageUrl,                          // vrai lien HTTP(S), fourni par l'appelant
  },
);
if (result.status === "INCONCLUSIVE") console.error(result.reason, result.branch);
```

`fichier` est relatif au logiciel, comme dans C5 et J5a. `vaultPath` est le dossier de ce logiciel dans le dépôt de documentation ; utiliser `"."` si ses notes sont à la racine. Le lien du passage est fourni explicitement : ce module ne suppose aucune route de l'interface.

La fonction clone la branche cible dans un dossier temporaire, crée une branche `docs/note-<UUID>`, remplace exactement une occurrence littérale de `avant` par `apres`, puis crée un seul commit limité à la note suivie par Git. Elle pousse uniquement cette nouvelle branche et appelle `gh pr create --repo … --base … --head … --title … --body-file …`. Le texte mentionne le test, l'écart, la décision humaine et le lien du passage. Le clone est supprimé à la fin ; le vault vivant et sa branche ne sont pas touchés. Si la note distante a changé (texte absent ou ambigu), aucune poussée n'a lieu.

Le résultat est `{ status: "opened", url, branch }`, ou `{ status: "INCONCLUSIVE", reason, branch }` en cas d'échec Git/GitHub. Après un refus de GitHub, la branche peut déjà être poussée : l'erreur le laisse visible, aucune réussite ni suppression distante n'est simulée. Les entrées invalides (correction refusée/proposée, C5 différent, configuration absente) lèvent une erreur avant les commandes. L'appelant doit afficher l'échec et laisser la scène continuer. Relancer crée une nouvelle branche, sans réécrire la précédente.

## Branchement par Nathan

La scène produit la décision finale après `appliquerCorrection(VAULT, decision)` dans J5a (`automatisation/scene/parcours.mjs`). Nathan pourra appeler cette fonction uniquement si `decision.correction_de_note?.statut === "acceptee"`, avec la décision finale et sa configuration de dépôt/lien. Aucun appel n'est ajouté à la scène dans cette PR. Les contrats gelés restent identiques.

## Essais isolés

```sh
node --test automatisation/pr-doc/index.test.mjs
pnpm install && pnpm -r --if-present run check
```

Le premier test contrôle hors réseau le texte exact et les commandes Git/gh via injection de `run`. Le second utilise de vrais commits et une poussée vers un dépôt Git local nu, en bouchonnant uniquement `gh`. Il vérifie le contenu corrigé, le commit unique, la branche neuve, les bases inchangées et la préservation des modifications locales. Les erreurs de correction, de poussée et de GitHub sont aussi couvertes. Ce dossier autonome n'appartient pas au workspace pnpm : lancer sa commande `node --test` en plus de la vérification globale.

L'option `remote` permet de fournir le chemin du dépôt nu pour l'essai ; par défaut, le clone utilise `https://github.com/<repository>.git`. Les essais utilisent exclusivement un dépôt fictif et des dossiers temporaires locaux, jamais le dépôt de production. L'ouverture réelle sur GitHub reste à vérifier sur un dépôt d'essai fourni par l'équipe.
