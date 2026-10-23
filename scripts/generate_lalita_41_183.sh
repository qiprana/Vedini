#!/usr/bin/env bash
set -euo pipefail

# Lalita Sahasranama: batch CowChant generation for slokas 41-183.
#
# This wrapper uses the shared generate_lalita_audio.py generator, which:
#   - reads the committed Devanagari reading from data/lalita/verses/verse-###.json
#   - converts displayed hyphen breaks to natural spoken word boundaries
#   - removes only the printed verse number before chanting
#   - loads CowChant once and reuses it for the whole batch
#   - skips existing MP3 files, so interrupted runs can be resumed safely
#   - writes audio/lalita/verses/sloka-041.mp3 ... sloka-183.mp3
#
# On the Mac:
#   cd /path/to/Vedini
#   git pull origin main
#   conda activate vagdhenu
#
# Preview all Sanskrit without generating audio:
#   bash scripts/generate_lalita_41_183.sh --dry-run
#
# Generate the complete remaining range:
#   bash scripts/generate_lalita_41_183.sh
#
# Use a different CowChant speed:
#   bash scripts/generate_lalita_41_183.sh --speed 1.05
#
# Resume after interruption:
#   Run the same command again. Existing MP3 files are skipped.
#
# Generate only a smaller sub-range, for example 41-60:
#   bash scripts/generate_lalita_41_183.sh --start 41 --end 60
#
# Regenerate existing files:
#   bash scripts/generate_lalita_41_183.sh --replace
#
# WAV only:
#   bash scripts/generate_lalita_41_183.sh --wav-only
#
# After listening and checking pronunciation:
#   git add audio/lalita/verses/sloka-*.mp3
#   git commit -m "Add Lalita Sahasranama chant recordings 41-183"
#   git push origin main

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_DIR/data/lalita/verses/verse-041.json" ]]; then
  echo "Missing verse-041.json: run 'git pull origin main' in your Vedini repository first." >&2
  exit 1
fi

if [[ ! -f "$REPO_DIR/data/lalita/verses/verse-183.json" ]]; then
  echo "Missing verse-183.json: your local Vedini clone does not yet contain the full 183-sloka dataset." >&2
  exit 1
fi

if [[ ! -f "$SCRIPT_DIR/generate_lalita_audio.py" ]]; then
  echo "Missing shared audio generator: scripts/generate_lalita_audio.py" >&2
  exit 1
fi

exec python3 "$SCRIPT_DIR/generate_lalita_audio.py" \
  --repo "$REPO_DIR" \
  --start 41 \
  --end 183 \
  "$@"
