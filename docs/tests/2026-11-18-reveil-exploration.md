# Le réveil par PR lance aussi l'exploration de tout le site (issue #122, point 1), 18 novembre 2026

Couloir Nathan. Décision de Nathan pour la démo du mode dev (#122) : une PR qui traduit le clone en allemand. Horama, réveillé par la prévisualisation Vercel de la PR, parcourt tout le site et montre les défauts de mise en page, en plus des tests du vault touchés par la PR.

## Ce qui change (`automatisation/reveil/pr.mjs`)

`jouerPr` joue deux scènes, l'une après l'autre, sur la prévisualisation :
1. **Les tests du vault** que la PR touche (`parcours.mjs`, comme avant). Ils sont sautés si la PR ne touche aucune note (`parcours.etat` : `aucun-test`).
2. **L'exploration de tout le site** (`exploration.mjs --url <prévisualisation> --max 8 --pages-cliquees 4`) : contrôles mécaniques et Holo.
   - Nouvelles options du réveil : `--max` et `--pages-cliquees` la règlent, `--sans-exploration` la retire.
   - Les options après `--` vont aux deux scènes ; `--url`, `--max` et `--pages-cliquees` sont réservées au réveil.

Une scène qui échoue est notée dans `reveil.json` (`parcours` ou `exploration` : `etat`, `lance_ms`, `erreur`) au lieu d'arrêter le réveil. L'autre scène tourne quand même.

## Ce qui a été lancé

1. `node --test automatisation/reveil/*.test.mjs` : 15 tests, 15 réussis. Le test de `jouerPr` couvre quatre cas :
   - les deux scènes, avec leurs arguments exacts ;
   - une PR qui ne touche aucune note : seule l'exploration tourne ;
   - sans exploration et sans test : rien ne tourne ;
   - une scène en échec : notée, l'autre jouée, rien de levé.
2. Essai de bout en bout, sans H ni Holo :
   - le réveil avec un faux GitHub, une PR qui ne modifie que `README.md`, et comme prévisualisation une page locale à deux pages, sur une copie du vault ;
   - commande : `--une-fois --max 2 --pages-cliquees 0 -- --sans-agent --sans-holo --sans-base --sans-fin` ;
   - résultat : code 0, « 0 test(s) retenu(s), 3 écarté(s) », « aucun test du vault touché par cette PR », puis l'exploration (« 2 pages visitées sur 2 trouvées »). `reveil.json` : `etat: termine`, `parcours: aucun-test`, `exploration: termine`, 13 s en tout.
3. `pnpm -r check` : 380 tests, 377 réussis, 1 échec, sans rapport avec ce changement. Il s’agit de `agent/exploration-reseau.test.ts` (#121, Ali), qui lance `google-chrome`, absent du Mac (`spawn google-chrome ENOENT`) ; il échoue de même sur `dev` sans ce changement. Tous les autres paquets passent.

## Ce qui n'est pas testé

- Les deux scènes enchaînées pour de vrai (tests du vault puis exploration) sur une prévisualisation Vercel : il faut la PR en allemand d'Ali.
- La langue (point 2), la réponse sur la PR (point 3) et l'essai avec un mot allemand long (point 4) : PR suivantes.
- Aucun passage avec H.
