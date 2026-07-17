#!/usr/bin/env bash
# Build the macOS app and install it to /Applications, replacing any older copy,
# and clean up the bundler's leftovers.
#
# Building and installing used to be separate steps, which let /Applications
# drift behind the build directory — you'd launch Inkling from Spotlight and get
# a stale binary. This keeps exactly one Inkling, always the current build.
#
#   pnpm --filter @inkling/desktop app:install
set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "install-macos.sh only applies to macOS." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE="$ROOT/apps/desktop/src-tauri/target/release/bundle"
APP="$BUNDLE/macos/Inkling.app"
DEST="/Applications/Inkling.app"

[[ -d "$APP" ]] || { echo "No build found at $APP — run 'pnpm --filter @inkling/desktop tauri build' first." >&2; exit 1; }

# The running copy can't be replaced while it's open.
osascript -e 'quit app "Inkling"' 2>/dev/null || true
pkill -x inkling 2>/dev/null || true
sleep 1

echo "Installing $(basename "$APP") → $DEST"
rm -rf "$DEST"
ditto "$APP" "$DEST"

# `tauri build` can leave a read-write staging image behind (and occasionally a
# mounted volume) if bundling is interrupted.
rm -f "$BUNDLE/macos/rw."*.dmg 2>/dev/null || true
for vol in /Volumes/dmg.*; do
  [[ -d "$vol" ]] && hdiutil detach "$vol" -force >/dev/null 2>&1 || true
done

echo "Installed build from $(stat -f '%Sm' "$DEST/Contents/MacOS/inkling")"
