# Service Railway de la tour en écriture (#238)

- `pnpm -r --if-present run check` termine avec succès (351 tests dans `agent/`
  à l’étape 4). Les
  tests HTTP de la tour utilisent GitHub simulé. Ils couvrent la connexion et
  son quota de 5 essais par minute (IP réelle `X-Real-IP` sous Railway
  seulement), le CORS limité à la tour avec `Authorization`, les jetons
  expirés ou falsifiés, les replis visibles (`503`) sans `GITHUB_TOKEN_TOUR`
  ni compte d'équipe, le cache de lecture, la lecture du vault sur
  `horama/vault` sinon `dev`, les conflits de SHA, deux choix concurrents, la
  mise à jour d'un test, la correction d'une note (acceptée, refusée,
  ambiguë, inconnue, hors du vault, reprise après une écriture partielle).
- Les décisions ne s'écrivent que dans `index.json` de `horama/captures` du
  clone ; tests et corrections de notes seulement sur `horama/vault` de
  Horama-, créée depuis `dev` au premier besoin. Un test prouve qu'aucune
  écriture ne vise `dev` ni `main`.
- Le client GitHub a aussi été vérifié en lecture sur les deux dépôts lors de
  la première version. Les écritures ont été testées hors ligne seulement.
  Aucune exploration réelle n'a été lancée.
