# Contrats entre les deux couloirs (v1)

La seule surface partagée entre le couloir Ali (agent) et le couloir Nathan (mémoire et preuve). Spec : `docs/specs/2026-11-16-technique.md`.

- `types.ts` : les types (C1 à C8, règles calculables, surfaces `CoureurAgent` et `Verificateur`).
- `exemples.ts` : un exemple typé de chaque contrat (données de démonstration du faux SaaS Facturo) ; `exemples/*.json` en sont les copies.
- `../base/migrations/001_init.sql` : le schéma Supabase, miroir des types.

| N° | Contrat | Écrit par | Lu par | Exemple |
|---|---|---|---|---|
| C1 | `TestPropose` | Nathan (génération) | Nathan (écran 11.2) | `c1-test-propose.json` |
| C2 | Fichier de test accepté, `TestAccepte` | Nathan (vault) | Ali (agent) | `c2-test-accepte.json` |
| C3 | `Passage`, `EvenementFil`, `Capture` | Ali | Nathan | `c3-*.json` |
| C4 | `ResultatVerification` | Nathan | Nathan, jury | `c4-resultat.json` |
| C5 | `Decision` | Nathan | Nathan (vault) | `c5-decision.json` |
| C6 | `RapportPassage` | Ali | Nathan | `c6-rapport.json` |
| C7 | `NotificationRelecture` | Nathan | n8n | `c7-notification.json` |
| C8 | `LigneMesure` | Nathan | banc | `c8-mesure.json` |

Gel : étiquette Git `contrats-v1`. Après le gel, aucun champ ajouté, renommé ou retypé sans décision écrite dans `docs/decisions/`, acceptée par Nathan et Ali.
