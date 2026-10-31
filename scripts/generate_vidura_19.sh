#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Viduraniti selected sloka 19: four 11-syllable padas (Tristubh class).
# The generator reads the Sanskrit directly from data/vidura/verses/verse-019.json.
# Preview:
#   bash scripts/generate_vidura_19.sh --dry-run
# Generate candidates in audio/vidura/candidates/ (1 full + 4 parts):
#   conda activate vagdhenu
#   bash scripts/generate_vidura_19.sh
# Once checked by ear, add the five MP3s to Git and push main.
# Do not use --publish-ready until the Sanskrit and audio have been reviewed.
exec python3 "$SCRIPT_DIR/generate_vidura_audio.py" --start 19 --end 19 --meter trishtubh "$@"
