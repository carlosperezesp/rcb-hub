#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_PATH="${TMPDIR:-/tmp}/ipl_male_json.zip"
EXTRACT_DIR="$ROOT_DIR/data/cricsheet"
JSON_DIR="$EXTRACT_DIR/ipl_male_json"

mkdir -p "$EXTRACT_DIR"
curl -L "https://cricsheet.org/downloads/ipl_male_json.zip" -o "$ZIP_PATH"
rm -rf "$JSON_DIR"
mkdir -p "$JSON_DIR"
unzip -q "$ZIP_PATH" -d "$JSON_DIR"

node "$ROOT_DIR/scripts/build-ipl-stats.js" "$JSON_DIR" "$ROOT_DIR/data/ipl-2026-season-stats.js"
