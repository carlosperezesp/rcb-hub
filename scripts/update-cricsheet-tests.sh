#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d)"
ZIP_PATH="$WORK_DIR/tests_json.zip"
JSON_DIR="$ROOT_DIR/data/cricsheet/tests_json"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "Downloading Cricsheet Tests JSON zip..."
curl --fail --location --retry 3 --show-error "https://cricsheet.org/downloads/tests_json.zip" -o "$ZIP_PATH"
ls -lh "$ZIP_PATH"
unzip -tq "$ZIP_PATH" >/dev/null

echo "Extracting Cricsheet Test files..."
rm -rf "$JSON_DIR"
mkdir -p "$JSON_DIR"
unzip -q "$ZIP_PATH" -d "$JSON_DIR"

JSON_COUNT="$(find "$JSON_DIR" -type f -name '*.json' | wc -l | tr -d ' ')"
echo "Found $JSON_COUNT Cricsheet Test JSON files"
if [ "$JSON_COUNT" = "0" ]; then
  echo "No Cricsheet Test JSON files found after extraction" >&2
  exit 1
fi

node "$ROOT_DIR/scripts/build-wtc-test-data.js" "$JSON_DIR" "$ROOT_DIR/data/wtc-test-data.js"
