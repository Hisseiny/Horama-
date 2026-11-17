# Demandes du coureur pour la scène

17 novembre 2026 — branche `a-demandes-scene`, créée indépendamment depuis `origin/dev` à jour (`3c4f3e2`).

Le fichier demandé n'existe pas sur `origin/dev` à cette date. Lecture de `docs/decisions/2026-11-17-demandes-coureur-scene.md` sur `origin/dev-nathan` (`bf7fe9c`), sans fusionner cette branche ni modifier la scène.

## Demandes traitées

1. **Délai d'observation** : `OptionsSessionH.settle_s?: number`, transmis à l'environnement navigateur H. Défaut inchangé : `0.5` seconde. La scène peut appeler `creerCoureur({ ..., h: { navigateur, settle_s: 1.0 } })`. Les nombres négatifs ou non finis sont refusés avant toute création ; zéro est autorisé.
2. **Raison d'échec** : le contrat C6 possède déjà `RapportPassage.tests[].raison?: string` (`contrats/types.ts:121`), prévu pour `non_concluant`. `ResultatSession.erreur` y est maintenant conservé, y compris quand les captures sont complètes : les tests d'une session échouée deviennent `non_concluant`, en cohérence avec leur C4 non concluant. La raison explicite de `terminer(etat="echec", raison=...)` est conservée aussi ; absente ou blanche, elle reçoit « Parcours terminé en échec. ». Annulation et timeout de crochet restent prioritaires ; puis viennent erreur de session, session muette et raison de l'outil. Les raisons sont persistées dans le C6 et rendues dans le Markdown. **Aucun champ ajouté**, ni à C6, ni à `Passage`, ni aux contrats.
3. **Relevé déjà acquis** : réponse « Déjà relevé. Relevé suivant : ecran=..., vue=.... », recalculée à partir des captures effectivement acquises. Si tous les relevés sont pris, le coureur le dit et demande `terminer(etat="reussi")`. La phrase du premier relevé reste celle du crochet ; les répétitions ne rappellent pas le crochet et ne redéposent pas les captures.
4. **README** : suppression de l'affirmation erronée sur l'absence de partage. Le port H demande déjà le lien public via `POST /sessions/{id}/share`, et signale son indisponibilité sans inventer de lien. Aucune modification du comportement de partage.

L'annulation retirée des demandes n'a pas été retouchée : elle est déjà présente sur la base de branche. Aucun besoin de champ global de raison n'a été retenu : le champ existant par test suffit à ce raccord. Les erreurs de persistance et de rédaction du rapport conservent leurs replis existants ; ce correctif ne prétend pas garantir une raison persistée lorsque le stockage lui-même échoue.

## Vérifications

Tests unitaires uniquement : sessions H ou requêtes HTTP factices, `BaseMemoire`, navigateur factice et copie temporaire du vault. Aucun passage H réel, aucune requête Supabase partagée, aucune capture réelle ni validation visuelle.

- `settle_s` absent, nul, entier et fractionnaire : valeur exacte dans le corps HTTP ; valeurs négatives et non finies refusées.
- Erreur de session avec captures absentes puis complètes : état, raison C6, persistance en fausse base, Markdown et C4 non concluants.
- Raison de l'outil explicite, absente et blanche ; parcours nominal sans raison d'échec.
- Répétition du dernier relevé et d'un ancien relevé après progression : prochain relevé actualisé, puis fin de parcours, sans capture supplémentaire.
- Suites existantes de timeout, annulation, relance et partage conservées.

Depuis `agent/`, sortie **0** :

```text
node --test coureur.test.ts session.test.ts crochet.test.ts
1..46
# tests 46
# suites 0
# pass 46
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 413.824634
```

Depuis la racine, sortie **0** :

```text
pnpm install && pnpm -r check
Scope: all 7 workspace projects
Already up to date
Done in 3ms using pnpm v12.18.0
agent check: 1..81
agent check: # tests 81
agent check: # suites 0
agent check: # pass 81
agent check: # fail 0
agent check: # cancelled 0
agent check: # skipped 0
agent check: # todo 0
agent check: # duration_ms 741.456262
agent check: Done
```

Les avertissements de replay/arrêt dans certains tests proviennent de leurs réponses H factices volontairement incomplètes. Aucun contrat, lockfile, fichier partagé de configuration ou fichier de la scène modifié. Aucune dépendance ajoutée.
