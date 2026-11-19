# Ticket de bug avec preuve — #199, 19 novembre

## Essayé sans réseau

- `node --test automatisation/ticket/*.test.mjs automatisation/reveil/*.test.mjs automatisation/pr-doc/*.test.mjs automatisation/scene/recapitulatif.test.mjs` : 46 tests, 46 réussis. Le faux GitHub HTTP reçoit le ticket étiqueté `horama`, retrouve l'empreinte en page 2 et commente l'issue existante. Ni doute, ni non-conclu, ni « voulu » ne partent. Une réponse HTTP 500 laisse le Markdown dans le vault et donne un statut `INCONCLUSIVE` avec son chemin.
- `pnpm -r --if-present run check` : contrats, faux SaaS (10 tests), mémoire (34), interface (8), jugement (79) et agent (299) terminés sans échec.
- `sh extension/copier-rapport.sh --verifier` : copies à jour. `unzip -t accueil/horama-extension.zip` : aucune erreur.

## Rapport, dans Chrome en local

Le [faux service de l'extension](../../extension/faux-service/serveur.mjs) rejoue le rapport enregistré `2026-11-18-10h08-ef2f` : un lien interne d'Eugenia renvoie HTTP 404. Accueil servi sur localhost et extension chargée sans empaquetage, à 1440 et 390 px : la case « C'est un bug » active « Copier le ticket », qui affiche « Ticket copié ». Sur l'accueil à 390 px, le presse-papiers contient bien le Markdown et l'empreinte ; en simulant un refus de la copie, le texte sélectionnable s'affiche sous le bouton. Aucun dépôt n'est utilisé par le rapport.

## À faire avant la démo

- Sur le clone, lancer un **vrai passage**, trancher « bug » sur un défaut prouvé et relever l'URL et la durée de publication. Le réveil transmet le dépôt surveillé ; pour une scène directe, utiliser `--depot <propriétaire/dépôt>` avec l'authentification de `gh`. Contrôler l'étiquette, la note du passage plutôt qu'une capture publiée, et le commentaire au passage suivant pour la même empreinte. Non effectué ici : aucun accès H n'a été utilisé, aucune décision réelle créée.
- Après déploiement de cette version sur horama-gold, vérifier « Copier le ticket » en ligne et l'extension téléchargeable. La production actuelle répond sur `/rapport/` mais n'a pas ce bouton.
- Le format du rapport donne l'ordre des pages relevées et leur mode d'arrivée, pas le libellé ou le sélecteur exact de chaque clic de navigation. Le ticket ne les invente pas. L'empreinte utilise le chemin de la page, le type et le sélecteur relevé ; si le moteur ne fournit pas de sélecteur, elle utilise la description.
- Résultats réels et accord de Nathan nécessaires avant fusion. La boucle « Fixes #N » est distincte du périmètre minimal.
