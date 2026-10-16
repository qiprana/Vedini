#!/usr/bin/env bash
set -euo pipefail

# Generates the missing Lalita Sahasranama slokas 16-20 using the
# reviewed reading fields in Vedini/data/lalita/verses/verse-###.json.
#
# conda activate vagdhenu
# bash scripts/generate_lalita_16_20.sh --dry-run
# bash scripts/generate_lalita_16_20.sh --speed 1.05
#
# One CowChant model is loaded for all five recordings.
# Outputs: audio/lalita/verses/sloka-016.wav and .mp3, etc.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$SCRIPT_DIR/generate_lalita_audio.py" ]]; then
  echo "Missing scripts/generate_lalita_audio.py. Run 'git pull origin main' in Vedini first." >&2
  exit 1
fi

for number in 016 017 018 019 020; do
  if [[ ! -f "$REPO_DIR/data/lalita/verses/verse-$number.json" ]]; then
    echo "Missing data/lalita/verses/verse-$number.json. Run 'git pull origin main' first." >&2
    exit 1
  fi
done

exec python3 "$SCRIPT_DIR/generate_lalita_audio.py" \
  --repo "$REPO_DIR" \
  --start 16 \
  --end 20 \
  "$@"
