# Mission : Axil, CPO, pôle D (Interface et design)

**Ta mission en une phrase.** Construire les écrans d'Horama pour qu'un humain valide un test, suive l'agent en direct et tranche un doute en un clic, et que le jury comprenne tout de loin, sur un projecteur.

**Ton dossier.** `interface/`. Les autres proposent des changements par pull request que tu relis.

**Ce que tu reçois.** Tout par les contrats, d'abord en version factice (`USE_MOCKS=1`) puis en vrai :
- C1 (tests proposés, Leslie) pour l'écran 11.2 ;
- C3 (événements du fil, Ali) pour l'écran 11.3 ;
- C4 et C6 (résultats et rapport, Leslie et Ali) pour les écrans 11.4, 11.5, 11.6 ;
- la correction de note proposée (Inès et Leslie) pour l'écran 11.7.

**Ce que tu donnes.**
- La décision humaine (C5), pour Inès.
- Le parcours utilisateur du rendu de mercredi, la direction artistique, le design du deck de vendredi (avec Noé).

**Les écrans, par ordre de priorité** (détail dans le cadrage, section 11).

| Priorité | Écran | Pour quand |
|---|---|---|
| 1 | 11.2 De la note au test (Accepter, Modifier, Refuser ; question d'ambiguïté) | Mardi |
| 2 | 11.3 Passage en direct (le fil se remplit au rythme de l'agent) | Mardi |
| 3 | 11.6 Relecture et escalade (bug ou voulu) | Mercredi |
| 4 | 11.5 Comparaison des versions (côte à côte, rideau, pixels bruts) | Jeudi |
| 5 | 11.7 Dérive documentaire (la note avant et après) | Jeudi |
| 6 | 11.4 Rapport de passage, 11.1 Accueil et couverture | Jeudi, version simple |

**Tes tâches, dans l'ordre.**

| N° | Tâche | Fini quand |
|---|---|---|
| 1.5 | Crédits v0 activés | |
| 1.12 | Maquettes rapides de 11.2, 11.3, 11.6 | Dans `interface/maquettes/` |
| 3.2 | Écran 11.2 sur la version factice, puis sur les vrais tests | Accepter déclenche l'écriture dans le vault |
| 3.6 | Écran 11.3 branché sur la base | Les étapes arrivent au rythme de l'agent |
| 4.1 | Parcours utilisateur du rendu de mercredi | Dans `pitch/rendu-mercredi/`, avant 16 h 30 |
| 4.8 | Écran 11.6, décision C5 | Une décision crée son fichier |
| 4.11 | Squelette visuel du deck de vendredi, avec Noé | Dans `pitch/deck/` |
| 5.1 | Écran 11.5 | Trois vues sur un vrai passage |
| 5.2 | Écran 11.7 | La note change dans Obsidian après Accepter |
| 6.7 | Design du deck final | Avant 15 h vendredi |

**Les règles de ton pôle.**
- Direction artistique du cadrage (section 13) et du deck de lundi : crème pour le monde de la documentation, graphite pour le monde de l'agent ; lime pour conforme, corail pour défaut, jaune pour ce qu'un humain doit trancher ; la même règle surlignée de la même couleur dans la note, le test et le rapport.
- Pas d'animation qui maquille la lenteur de l'agent : l'attente se montre, étape par étape.
- Les valeurs relevées et l'écart doivent se lire à 5 mètres.
- Tu ne réécris pas un contrat pour arranger un écran : demande la modification à son gardien.

**Ton premier message à ton IA** :

```
Tu es mon assistant de code pour le projet Horama (hackathon). Je suis Axil, CPO, responsable du pôle D : les écrans du produit et leur design.
Lis d'abord AGENTS.md, puis docs/missions/axil-cpo-interface.md, puis docs/cadrage.md sections 11 et 13, puis les contrats C1, C3, C4, C5, C6 dans contrats/.
Tu ne modifies que interface/. Tu ne changes aucun contrat gelé. Tant qu'une brique n'est pas prête, tu utilises sa version factice (USE_MOCKS=1).
Ma tâche maintenant : [numéro et titre]. Avant de coder, redis-moi en 5 lignes ce que tu vas faire, les fichiers que tu vas créer ou modifier, et comment on vérifiera que c'est fini.
```
