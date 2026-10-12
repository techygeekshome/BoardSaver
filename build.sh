#!/usr/bin/env bash
# Builds the release packages into dist/.
#   BoardSaver.zip          Chrome, Edge, Brave, Opera, Vivaldi (unzip, then Load unpacked)
#   BoardSaver-chrome.zip   same files, named for Chrome users
#   BoardSaver-edge.zip     same files, named for Edge users
#   BoardSaver-firefox.zip  Firefox package (Firefox manifest, files at the root)
set -euo pipefail
cd "$(dirname "$0")"
FILES="background.js content.js results.css results.html results.js zip.js icons"
OUT=dist; TMP=$(mktemp -d)
mkdir -p "$OUT"
rm -f "$OUT"/BoardSaver*.zip

mkdir "$TMP/board-saver"
cp -r $FILES manifest.json "$TMP/board-saver/"
(cd "$TMP" && zip -qr -X board-saver.zip board-saver)
for n in BoardSaver BoardSaver-chrome BoardSaver-edge; do cp "$TMP/board-saver.zip" "$OUT/$n.zip"; done

mkdir "$TMP/ff"
cp -r $FILES "$TMP/ff/"
cp manifest.firefox.json "$TMP/ff/manifest.json"
(cd "$TMP/ff" && zip -qr -X ../ff.zip .)
cp "$TMP/ff.zip" "$OUT/BoardSaver-firefox.zip"

rm -r "$TMP"
ls -l "$OUT"
