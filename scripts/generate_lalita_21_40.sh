#!/usr/bin/env bash
set -euo pipefail

# Lalita Sahasranama: numbered CowChant recordings for slokas 21-40.
# Run from any folder. First activate your Python environment: conda activate vagdhenu.
# Preview: bash scripts/generate_lalita_21_40.sh --dry-run
# Generate: bash scripts/generate_lalita_21_40.sh --speed 1.05
# Files are saved as audio/lalita/verses/sloka-021.wav and .mp3, etc.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_DIR/data/lalita/verses/verse-040.json" ]]; then
  echo "Missing verse-040.json: run 'git pull origin main' in your Vedini repository first." >&2
  exit 1
fi
if [[ ! -f "$SCRIPT_DIR/generate_lalita_audio.py" ]]; then
  echo "Missing shared audio generator in scripts/." >&2
  exit 1
fi

exec python3 "$SCRIPT_DIR/generate_lalita_audio.py" \
  --repo "$REPO_DIR" \
  --start 21 \
  --end 40 \
  "$@"
