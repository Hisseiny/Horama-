#!/bin/sh
# The page of report of the extension, served also with the page of welcome (issue #164): accueil/rapport/ gets the same
# files, copied as they are, except service.js, its own (the address comes from ?service=, given by the page of welcome).
# To run after each change of the report of the extension, from the root of the repository: sh extension/copier-rapport.sh
# With --verifier: copies nothing, says which copy differs (exit 1), for a check before a pull request.
set -eu
cd "$(dirname "$0")"
DEST=../accueil/rapport
FILES="rapport.js rapport.css commun.css envoye.css mascotte.js lib/trait.js lib/ticket.mjs mascotte/observe.svg mascotte/trouve.svg mascotte/doute.svg mascotte/bloquee.svg mascotte/fini.svg"
if [ "${1:-}" = "--verifier" ]; then
  KO=0
  cmp -s rapport.html "$DEST/index.html" || { echo "différent : accueil/rapport/index.html"; KO=1; }
  for f in $FILES; do cmp -s "$f" "$DEST/$f" || { echo "différent : accueil/rapport/$f"; KO=1; }; done
  [ "$KO" -eq 0 ] && echo "accueil/rapport/ : copies à jour."
  exit "$KO"
fi
mkdir -p "$DEST/lib" "$DEST/mascotte"
cp rapport.html "$DEST/index.html"
for f in $FILES; do cp "$f" "$DEST/$f"; done
echo "accueil/rapport/ : $(echo $FILES | wc -w | tr -d ' ') fichiers et index.html copiés de extension/ (service.js n'est pas touché)."
