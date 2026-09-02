#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "${1-}" != "" ]]; then
  MANIFEST_PATH="$1"
else
  echo "Drag the manifest JSON file onto this app, or run:"
  echo "  ./run_obtain_media_worker.command /path/to/company-desktop-manifest.json"
  echo
  read -r "MANIFEST_PATH?Enter the full path to the manifest JSON: "
fi

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo
  echo "Manifest not found:"
  echo "  $MANIFEST_PATH"
  echo
  read -r "IGNORED?Press Enter to close."
  exit 1
fi

echo
echo "Running Crown Pages Obtain Media worker..."
echo "Manifest: $MANIFEST_PATH"
echo

python3 "$SCRIPT_DIR/desktop_worker.py" --manifest "$MANIFEST_PATH"

echo
echo "Done."
read -r "IGNORED?Press Enter to close."
