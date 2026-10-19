#!/usr/bin/env bash
# Renders resume.html to public/avinashresume.pdf using headless Chrome.
#   ./build.sh
# The deploy workflow runs this too, so the CV on the site always matches
# resume.html. Set CHROME to use a particular browser binary.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../public/avinashresume.pdf"

if [ -z "${CHROME:-}" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
  done
fi
[ -n "${CHROME:-}" ] || { echo "build: no Chrome found; set CHROME to its path" >&2; exit 1; }

# The fonts come from node_modules, so a missing install would quietly fall
# back to system fonts and change the layout.
[ -f "$HERE/../node_modules/@fontsource/geist/files/geist-latin-400-normal.woff2" ] ||
  { echo "build: fonts missing; run npm install first" >&2; exit 1; }

# CI runners, and Chrome running as root, often cannot start its sandbox.
# The page is our own file.
FLAGS=()
if [ -n "${CI:-}" ] || [ "$(id -u)" = 0 ]; then FLAGS+=(--no-sandbox); fi

rm -f "$OUT"
if ! LOG=$("$CHROME" --headless --disable-gpu --no-pdf-header-footer ${FLAGS[@]+"${FLAGS[@]}"} \
             --print-to-pdf="$OUT" "file://$HERE/resume.html" 2>&1) || [ ! -s "$OUT" ]; then
  echo "build: Chrome did not write $OUT" >&2
  echo "$LOG" >&2
  exit 1
fi

# One page is the rule (see README). Fail rather than publish a second one.
PAGES=$({ grep -aoE '/Type ?/Page([^s]|$)' "$OUT" || true; } | wc -l | tr -d ' ')
[ "$PAGES" = 1 ] || { echo "build: $OUT has $PAGES pages, expected 1" >&2; exit 1; }

echo "built: $OUT ($(du -h "$OUT" | cut -f1))"
