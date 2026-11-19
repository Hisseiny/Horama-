#!/bin/bash
# The demo machine, checked before the demo (issue #134), read only: nothing is installed, started, written or paid.
# Each line says OK or KO with what was checked; the exit code is the number of KO (0: ready).
# Usage, from the root of the repository: bash automatisation/demo/verifier-machine.sh
#   ENV_FILE=<file> : another file of keys than .env.local (for a trial).
# The keys are never shown nor read by the shell: it only checks that each name has a value in the file. The only
# network calls are reads:
# GitHub (gh auth status, the wake-up dry run) and the list of the running sessions of H.
cd "$(dirname "$0")/../.." || exit 1
ENV_FILE="${ENV_FILE:-.env.local}"
KO=0
ok() { echo "OK  $1"; }
ko() { echo "KO  $1"; KO=$((KO + 1)); }
info() { echo "--  $1"; }

# 1. Keys: present and not empty, never shown.
if [ -f "$ENV_FILE" ]; then
  ok "fichier des clés : $ENV_FILE"
  for name in HAI_API_KEY HAI_API_KEY_DEMO HF_TOKEN SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
    if grep -Eq "^${name}=.+" "$ENV_FILE"; then ok "clé $name présente"; else ko "clé $name absente ou vide dans $ENV_FILE"; fi
  done
else
  ko "fichier des clés absent : $ENV_FILE"
fi

# 2. Tools.
if command -v node >/dev/null 2>&1; then ok "node $(node -v)"; else ko "node absent"; fi
if command -v pnpm >/dev/null 2>&1; then ok "pnpm $(pnpm -v)"; else ko "pnpm absent"; fi
if [ -d automatisation/scene/node_modules/pngjs ]; then ok "dépendances de la scène installées"; else ko "dépendances de la scène absentes (pnpm --dir automatisation/scene install --ignore-workspace)"; fi
HOLO=""
for candidate in "${HOLO_BIN:-}" "$(command -v holo 2>/dev/null)" "$HOME/.venvs/holo/bin/holo"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then HOLO="$candidate"; break; fi
done
if [ -n "$HOLO" ]; then ok "holo trouvé : $HOLO"; else ko "holo introuvable (HOLO_BIN, PATH ou ~/.venvs/holo/bin/holo)"; fi
CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ -x "$CHROME" ]; then ok "Chrome : $("$CHROME" --version 2>/dev/null)"; else ko "Chrome introuvable : $CHROME"; fi

# 3. Ports of the demo: the Chrome of the scene (9333), the showcase (9400), the fake service (8787). Only the number
# of processes is said, never their command line.
for port in 9333 9400 8787; do
  n=$(lsof -ti "tcp:$port" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" = "0" ]; then ok "port $port libre"; else ko "port $port occupé ($n processus)"; fi
done

# 4. GitHub, and the wake-up set on the clone (dry run: it reads the PR and their previews, plays nothing).
if gh auth status >/dev/null 2>&1; then ok "gh connecté"; else ko "gh non connecté (gh auth login)"; fi
if [ -d vault-horama/eugenia-clone ]; then ok "vault du clone présent"; else ko "vault du clone absent : vault-horama/eugenia-clone"; fi
DRY=$(node automatisation/reveil/pr.mjs --depot Hisseiny/eugenia-school-website --logiciel eugenia-clone --a-blanc 2>&1)
if [ $? -eq 0 ]; then
  ok "réveil réglé sur Hisseiny/eugenia-school-website (à blanc : $(echo "$DRY" | grep -c '^PR #') PR ouverte(s))"
else
  ko "réveil à blanc en échec : $(echo "$DRY" | tail -1)"
fi
if pgrep -f "automatisation/reveil/pr.mjs" >/dev/null 2>&1; then info "un réveil tourne déjà"; else info "aucun réveil en marche (à lancer pour la démo)"; fi

# 5. No session of H left running: the quota is 3 at a time on the free plan. Node loads the file of keys itself
# (--env-file) and sends HAI_API_KEY in the header of one read request: the shell never holds its value, nothing prints it.
if [ -f "$ENV_FILE" ] && grep -Eq "^HAI_API_KEY=.+" "$ENV_FILE"; then
  SESSIONS=$(node --env-file="$ENV_FILE" -e '
    fetch("https://agp.eu.hcompany.ai/api/v2/sessions?status=running&owner=organization&size=100", { headers: { Authorization: `Bearer ${process.env.HAI_API_KEY}` }, signal: AbortSignal.timeout(20000) })
      .then(async (r) => { if (!r.ok) return console.log(`HTTP ${r.status}`); const b = await r.json(); console.log(Number.isInteger(b.total) ? String(b.total) : "illisible"); })
      .catch((e) => console.log(`réseau : ${e.message}`));' 2>/dev/null)
  case "$SESSIONS" in
    0) ok "aucune session H active" ;;
    ''|*[!0-9]*) ko "sessions H non vérifiées : ${SESSIONS:-pas de réponse}" ;;
    *) ko "$SESSIONS session(s) H encore active(s)" ;;
  esac
else
  ko "sessions H non vérifiées : HAI_API_KEY absente"
fi

echo
if [ "$KO" -eq 0 ]; then echo "Machine prête."; else echo "$KO point(s) KO."; fi
exit "$KO"
