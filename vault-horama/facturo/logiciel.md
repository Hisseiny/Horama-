---
entree: "/v{version}/entrer?suite=/v{version}{url}"
---

# Facturo : réglages pour Horama

- `entree` : l'adresse de départ d'un test, déjà authentifiée (l'agent n'utilise jamais le formulaire de connexion). `{version}` devient la version testée, `{url}` l'url de la note de l'écran. Lu par `urlDepart` de `@horama/memoire`. Un site public n'a pas ce fichier : l'adresse de départ est alors l'url de la note.
