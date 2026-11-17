#!/bin/bash
# Rehearsal of the demo, end to end, in scripted mode (no H agent), on the live site of Eugenia School as a plain
# visitor: change sheet in a local commit, impact file, announcement, course, summary, decision, base. Each step is
# timed. Mode d'emploi : docs/demo/2026-11-17-repetition.md.
#
# Usage, from the repository root: bash automatisation/demo/repetition.sh [--agent]
#   --agent : the real H agent instead of the scripted course (costs about 0.03 $, needs HAI_API_KEY).
# Writes everything in .orchestrateur/repetition/<horodatage>/ (vault copy, impact.json, passage, log).
set -u
cd "$(dirname "$0")/../.."
ROOT=$(pwd)
ID=$(date +%Y-%m-%d-%Hh%M)
OUT="$ROOT/.orchestrateur/repetition/$ID"
WT="$ROOT/../horama-wt/repetition-$ID"
MODE="--sans-agent --avec-base"
[ "${1:-}" = "--agent" ] && MODE=""
mkdir -p "$OUT"
START=$(date +%s)
step() { echo "[$(( $(date +%s) - START )) s] $*"; }

step "1. Copie du vault avec l'écart planté (référence du Bachelor repeinte)"
node automatisation/demo/preparer-ecart.mjs "$OUT/vault" || exit 2

step "2. Le changement : fiche « bouton-candidater-anglais » dans un commit local jetable"
DEPUIS=$(git rev-parse --short HEAD)
git worktree add -q --detach "$WT" HEAD || exit 2
mkdir -p "$WT/vault-horama/eugenia/changements"
cat > "$WT/vault-horama/eugenia/changements/bouton-candidater-anglais.md" <<'EOF'
---
id: bouton-candidater-anglais
pr: 0
code: []
ecrans_vises: [accueil]
ne_doit_pas_changer: []
---

# Répétition : le bouton « Candidater » de l'accueil passe en anglais
EOF
git -C "$WT" add vault-horama/eugenia/changements/bouton-candidater-anglais.md
git -C "$WT" -c user.name="Horama répétition" -c user.email="repetition@horama.invalid" commit -q -m "Répétition : fiche de changement" || exit 2
VERS=$(git -C "$WT" rev-parse --short HEAD)
git worktree remove "$WT"
step "   commit $VERS (depuis $DEPUIS), dossier de travail retiré"

step "3. Réveil : choix des tests"
node automatisation/impact/impact.mjs --depuis "$DEPUIS" --vers "$VERS" --logiciel eugenia --json > "$OUT/impact.json" || exit 2
node automatisation/impact/impact.mjs --depuis "$DEPUIS" --vers "$VERS" --logiciel eugenia > /dev/null

step "4. Scène : annonce, parcours, récapitulatif, décision"
# shellcheck disable=SC2086
node --env-file=.env.local automatisation/scene/parcours.mjs $MODE \
  --base-url https://www.eugeniaschool.com --logiciel eugenia --version 1 --reference 1 \
  --impact "$OUT/impact.json" --choix voulu --correction-choix accepter \
  --vault "$OUT/vault" --sortie "$OUT/passage" --fermer-chrome 2>&1 | tee "$OUT/scene.log"
CODE=${PIPESTATUS[0]}
step "   scène : code $CODE"

step "5. Contrôle en base"
PASSAGE=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).id ?? "")' "$OUT/passage/passage.json")
node --env-file=.env.local automatisation/demo/compter-base.mjs "$PASSAGE"
ls "$OUT/vault/eugenia/decisions"

step "Fin. Sorties : $OUT"
exit "$CODE"
