# Correction : libellés lus (#49)

- `pnpm install` : terminé, verrou inchangé, aucune dépendance ajoutée.
- `pnpm -r --if-present run check` : terminé sans erreur ; jugement : 76 tests, 76 réussites, 0 échec ; agent : 88 tests, 88 réussites, 0 échec. Les vérifications de contrats, mémoire, interface et faux SaaS sont également terminées sans erreur.
- Tests sans réseau (routeur remplacé) : refus de « Le bouton « CANDIDATER → » n'est plus gris. » sans indice, même si le libellé figure dans la note ; acceptation de POSTULER → vers CANDIDATER → avec l'indice CANDIDATER → ; normalisation de la casse et des espaces insécables comme la règle `etat` ; refus d'un indice incomplet ; deux refus renvoient la décision intacte et une raison explicite, sans troisième appel.
- Le texte de page capturé n'est pas disponible dans `proposerCorrection` : ses entrées sont le vault, la décision et les options (indices, modèle, trace). Seuls les indices servent donc de preuve du libellé lu ; ni la note ni les instructions du modèle ne suffisent.
- Aucun changement dans la scène, le faux SaaS, les contrats ou la checklist. Aucun essai réel de modèle, aucune vérification visuelle de la mascotte : le repli existant est conservé.
- Travail dans `/home/ubuntu/repos/Horama-libelle` : un worktree séparé préserve les fichiers non suivis `package.json` et `pnpm-lock.yaml` déjà présents dans le clone initial.
