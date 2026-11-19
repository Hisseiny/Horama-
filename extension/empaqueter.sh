#!/bin/sh
# The .zip of the extension for the jury: every file Chrome loads, nothing else (no fake service, no README, no older
# .zip). Usage, from the root of the repository: sh extension/empaqueter.sh  →  extension/dist/horama-extension.zip
# The address of the service is the constant DEFAULT_SERVICE of service.js: set it before packaging.
set -eu
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/horama-extension.zip
zip -q -r dist/horama-extension.zip . -x "faux-service/*" "dist/*" "README.md" "empaqueter.sh" "copier-rapport.sh" ".DS_Store" "*/.DS_Store"
echo "dist/horama-extension.zip : $(unzip -l dist/horama-extension.zip | tail -1)"
echo "Service : $(grep -o 'DEFAULT_SERVICE = "[^"]*"' service.js)"
