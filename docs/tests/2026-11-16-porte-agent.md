# Porte agent — captures réelles, session simulée

Devin pour le couloir Ali, branche `dev-ali`. Aucun appel H.

Passage présenté : `2026-11-16-23h15-9c0a`, état `joue`, durée réelle du
coureur `2.848` secondes, coût inconnu (`null`), trois tests terminés,
quatre événements et quatre captures.

Le script hors dépôt `/home/ubuntu/horama-a4-local/capturer-facturo.ts`
ouvre Chrome headless à 1280 × 900, DPR 1, s'authentifie par la route
`/v13/entrer?suite=…`, puis navigue vers les quatre vues du parcours.
Le hook prend les PNG par CDP et relève `document.body.innerText`,
`location.href`, les dimensions et le défilement. Une session factice
appelle les outils dans l'ordre. Ce n'est pas une preuve de navigation H,
de verdict métier ou de performance d'un agent autonome.

Une première prise avait conservé le paramètre `<numero>` de la note
d'écran au lieu de le remplacer. La revue de la planche a permis de le
détecter ; le script a été corrigé et un nouveau passage complet exécuté.
Seul le passage corrigé est présenté. La facture capturée est F-119,
identifiant lu dans le test accepté. L'essai initial reste en base locale.

## Génération et contrôle

```sh
node /home/ubuntu/horama-a4-local/capturer-facturo.ts
node /home/ubuntu/horama-a4-local/generer-planche.mjs
pnpm -r check
```

Le second script transmet la configuration du Supabase local en mémoire
au générateur committé. Utilisation directe avec les variables serveur
`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` déjà définies :

```sh
node agent/scripts/generer-porte.mjs --passage 2026-11-16-23h15-9c0a --sortie docs/tests/2026-11-16-porte-agent
```

Le générateur lit `passages.rapport`, `captures` et `evenements` dans
Supabase, copie les PNG Storage dans le dossier statique et échappe les
textes dans le HTML. Aucune clé ni dépendance Supabase n'est embarquée.

Résultats : génération réussie, 4 captures et 4 événements ;
`pnpm -r check` code 0, 21 tests agent réussis, 0 échec.
Les autres paquets passent également. Aucun script de lint n'existe.
Les nouveaux tests couvrent génération normale, rapport vide, erreurs
HTTP, configuration absente, PNG invalide et échappement HTML.

Les requêtes SQL ont confirmé le passage, les quatre événements et les
quatre chemins de captures. Les quatre fichiers PNG générés font tous
1280 × 900 pixels.

## Présentation

```sh
python3 -m http.server 8080 --bind 0.0.0.0 --directory /home/ubuntu/repos/Horama-/docs/tests/2026-11-16-porte-agent
curl -sI localhost:8080/ | head -1
```

```text
HTTP/1.0 200 OK
```

Vérification visuelle dans Chrome : avertissement de simulation, rapport
des trois tests, quatre images réelles et fil horodaté lisibles.
Preuves hors dépôt : `/home/ubuntu/screenshots/ss_d889d48b.png` (en-tête),
`ss_e7e5464c.png` et `ss_a602dd4d.png` (captures),
`ss_fb0570fd.png` (fil). Serveur et Supabase laissés en marche.

Prochaine action : montrer `http://localhost:8080/` à Ali et attendre son
« go ». La porte reste non validée ; aucun push n'a été effectué.
