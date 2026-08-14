#!/bin/sh
# Run every check for this repo. Use it before committing a new lesson.
#
#   sh tools/check.sh
#
# Rebuilds the search index first, so a page added without regenerating
# still gets caught rather than silently missing from the site.

set -e
cd "$(dirname "$0")/.."

echo "=== rebuilding search index ==="
python3 tools/build-index.py

echo
echo "=== page structure, links, drills ==="
python3 tools/check-pages.py

echo
echo "=== drill behaviour ==="
node tools/test-drills.js

echo
echo "=== index search ==="
node tools/test-search.js

echo
echo "=== index app renders ==="
node tools/test-app.js

echo
echo "All checks passed."
