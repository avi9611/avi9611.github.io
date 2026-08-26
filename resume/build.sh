#!/usr/bin/env bash
# Renders resume.html to public/avinashresume.pdf using headless Chrome.
#   ./build.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="$HERE/../public/avinashresume.pdf"

[ -x "$CHROME" ] || { echo "build: Chrome not found at $CHROME" >&2; exit 1; }

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" "file://$HERE/resume.html" 2>/dev/null

echo "built: $OUT ($(du -h "$OUT" | cut -f1))"
