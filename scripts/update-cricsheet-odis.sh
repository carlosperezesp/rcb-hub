#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d)"
ZIP_PATH="$WORK_DIR/odis_male_json.zip"
JSON_DIR="$ROOT_DIR/data/cricsheet/odis_male_json"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "Downloading Cricsheet ODI JSON zip..."
curl --fail --location --retry 3 --show-error "https://cricsheet.org/downloads/odis_male_json.zip" -o "$ZIP_PATH"
ls -lh "$ZIP_PATH"
unzip -tq "$ZIP_PATH" >/dev/null

echo "Extracting Cricsheet ODI files..."
rm -rf "$JSON_DIR"
mkdir -p "$JSON_DIR"
unzip -q "$ZIP_PATH" -d "$JSON_DIR"

JSON_COUNT="$(find "$JSON_DIR" -type f -name '*.json' | wc -l | tr -d ' ')"
echo "Found $JSON_COUNT Cricsheet ODI JSON files"
if [ "$JSON_COUNT" = "0" ]; then
  echo "No Cricsheet ODI JSON files found after extraction" >&2
  exit 1
fi

NODE_BIN="${NODE_BIN:-node}"
if ! command -v "$NODE_BIN" >/dev/null 2>&1 && [ -x "$ROOT_DIR/.tools/node/bin/node" ]; then
  NODE_BIN="$ROOT_DIR/.tools/node/bin/node"
fi

"$NODE_BIN" "$ROOT_DIR/scripts/build-all-time-players.js" \
  "$ROOT_DIR/data/cricsheet/tests_json" \
  "$ROOT_DIR/data/cricsheet/odis_male_json" \
  "$ROOT_DIR/data/cricsheet/t20s_male_json" \
  "$ROOT_DIR/data/cricket-legends.json" \
  "$ROOT_DIR/data/all-time-players.js"
