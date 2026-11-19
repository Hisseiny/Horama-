# Service Railway de la tour en écriture (#238)

- `pnpm -r check` termine avec succès. Les neuf tests HTTP de la tour utilisent
  GitHub simulé. Ils couvrent la connexion et son quota, le CORS, les jetons
  expirés ou falsifiés, le cache de lecture, les conflits de SHA, deux choix
  concurrents, la reprise après un échec du vault et la mise à jour d'un test.
- Le client GitHub a aussi été vérifié en lecture sur les deux dépôts. Il a
  chargé l'index `horama-passages-1` du clone (un passage au moment du test)
  et les 17 notes Markdown du vault. Les écritures ont été testées hors ligne.
- La route de correction des notes renvoie `501` après authentification.
  Aucun redéploiement Railway ni passage du pitch n'a été lancé pour cette PR.
