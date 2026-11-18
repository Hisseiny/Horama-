#!/bin/bash
# Real passage of the public mode in the scene: the H agent and Holo, PAID (0,0827 $ for 15 pages by go_to on 18/11;
# 0,11 to 0,19 $ for 8 pages with 4 reached by a click, measured by Ali for #91).
# Starts from a page (the open tab of the demo): the agent reads it and scrolls it, reaches 4 pages by a real click on a
# visible link, the others by their address, 8 pages in all (issue #91). The scene is enlarged on the largest screen
# (--vitrine). The no-cost checks run first and stop everything if one fails. The H key is read by --env-file, never
# shown.
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
node --env-file=.env.local automatisation/scene/exploration.mjs --url "$URL" --max 8 --pages-cliquees 4 --vitrine --sans-base \
  --vault "$OUT/vault" --sortie "$OUT/sortie" --temoins "$OUT/temoins" 2>&1 | tee "$OUT/scene.log"
CODE=${PIPESTATUS[0]}
echo "Code $CODE, $(( $(date +%s) - START )) s de bout en bout. Sorties : $OUT"
exit "$CODE"
