#!/bin/bash
# Real passage of the public mode in the scene: the H agent and Holo, PAID (about 0,08 $ for 15 pages on 17-18/11).
# Starts from a page (the open tab of the demo), then the rest of the site, 15 pages. The no-cost checks run first and
# stop everything if one fails. The H key is read by --env-file, never shown.
# Usage, from the root of the repository: bash automatisation/demo/passage-reel.sh [adresse]
# Writes in .orchestrateur/demo/<date>/: a copy of the vault (references, notes, decisions, note of the passage),
# sortie/ (exploration.json, captures), temoins/, scene.log.
set -u
cd "$(dirname "$0")/../.."
URL=${1:-https://www.eugeniaschool.com/blog/fin-de-parcoursup-ce-qui-change-premiere-terminale}
OUT=".orchestrateur/demo/$(date +%Y-%m-%d-%Hh%M)"
node --env-file=.env.local automatisation/demo/avant-depart.mjs || exit 1
mkdir -p "$OUT"
cp -R vault-horama "$OUT/vault"
echo "Sorties : $OUT"
START=$(date +%s)
node --env-file=.env.local automatisation/scene/exploration.mjs --url "$URL" --max 15 --sans-base \
  --vault "$OUT/vault" --sortie "$OUT/sortie" --temoins "$OUT/temoins" 2>&1 | tee "$OUT/scene.log"
CODE=${PIPESTATUS[0]}
echo "Code $CODE, $(( $(date +%s) - START )) s de bout en bout. Sorties : $OUT"
exit "$CODE"
