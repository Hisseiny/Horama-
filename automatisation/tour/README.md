# Tour de contrôle (#149)

Les passages d'Horama et leurs constats, en ligne, sur données réelles seulement. C'est le prototype d'Axil (Figma Make, PR #216, `docs/da/interface-envoye/prototype/`), copié ici et branché sur deux sources. Le résultat construit est servi par la page d'accueil : https://horama-gold.vercel.app/tour/ (`accueil/tour/`, commité, car horama-gold ne construit rien).

## Ce qui est montré

| Écran du prototype | En ligne | Source |
|---|---|---|
| 11.8 Passages et historique | oui, à l'ouverture | l'index public des passages (entrée par une PR) et les explorations envoyées depuis ce navigateur (entrée par une adresse) ; le journal des décisions de l'index |
| 11.4 Rapport de passage | oui | les constats d'un passage, chacun sur sa capture : entourée par la scène (entrée par une PR), ou avec le trait miltos ou les points ocre dessinés ici (`src/trait.js`, la charte) sur la capture brute du service (grand public) |
| 11.6 À relire | oui, en lecture seule | les constats, ceux sans décision d'abord ; la décision et son auteur viennent de l'index. Une page publique ne tient aucune clé : « bug » ou « voulu » se tranche dans la scène ou le rapport, jamais ici |
| 11.1, 11.2, 11.3, 11.5, 11.7, connexion | non | aucune source réelle : rien d'exemple n'est mis en ligne. Le journal de l'agent étape par étape de 11.8 non plus |

Les sources (`src/donnees.ts`) :
- **entrée par une PR** : https://raw.githubusercontent.com/Hisseiny/eugenia-school-website/horama/captures/index.json, écrit par le réveil après chaque réponse sur une PR du clone (`automatisation/reveil/README.md`, « L'index des passages »), mis en cache 5 min par GitHub ;
- **entrée par une adresse** : la clé `horama-explorations` du `localStorage` de horama-gold, écrite par `accueil/envoye.js` à chaque envoi (id, service, adresse, date ; 30 au plus), chaque exploration relue sur son service (`GET /explorations/:id`, `horama-exploration-1`). Une exploration que le service ne garde plus est signalée, jamais remplacée.

Les écrans de la tour sont dans `src/tour/` (ils reprennent les feuilles de style, la barre latérale, le logo et la mascotte du prototype) ; `interface/` reste le prototype d'origine, dont seuls les styles et les icônes sont utilisés.

## Construire

Les dépendances (React, Vite, Tailwind, TypeScript ; environ 96 Mo) s'installent à part, hors de l'espace de travail pnpm du dépôt :

```
pnpm --dir automatisation/tour install --ignore-workspace
```

Puis, depuis `automatisation/tour/` :

```
./node_modules/.bin/tsc --noEmit -p tsconfig.json
FIGMA_PUBLIC_URL=. ./node_modules/.bin/vite build --outDir ../../accueil/tour --emptyOutDir
```

`FIGMA_PUBLIC_URL=.` donne des chemins relatifs : la tour marche sous `/tour/`. Pour retirer les dépendances : supprimer le seul dossier `automatisation/tour/node_modules`.

Le fichier de verrouillage du prototype a été refusé par la règle de délai de pnpm (`minimumReleaseAge` : `source-map-js@1.2.3`, publié la veille) ; `pnpm-lock.yaml` est une nouvelle résolution qui la respecte (`source-map-js@1.2.2`).
