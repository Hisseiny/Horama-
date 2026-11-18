#!/bin/sh
# The .zip of the extension for the jury: only the files Chrome loads (no fake service, no README).
# Usage, from the root of the repository: sh extension/empaqueter.sh  →  extension/dist/horama-extension.zip
set -eu
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/horama-extension.zip
zip -q -r dist/horama-extension.zip manifest.json popup.html popup.css popup.js rapport.html rapport.css rapport.js options.html options.js service.js commun.css lib
echo "dist/horama-extension.zip : $(unzip -l dist/horama-extension.zip | tail -1)"
