#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Viduranīti: produce one uninterrupted full śloka AND four independent clips per śloka.
#
# Preview the exact Sanskrit that will be recorded:
#   bash scripts/generate_vidura_1_2.sh --dry-run
#
# Generate all ten MP3s (1 full + 4 parts, for each of 2 ślokas):
#   conda activate vagdhenu
#   bash scripts/generate_vidura_1_2.sh
#
# Generate only a single part, e.g. verse 1, part 3:
#   bash scripts/generate_vidura_1_2.sh --start 1 --end 1 --part 3
#
# To make existing recordings slower, regenerate them with the new 0.95 speed:\n#   bash scripts/generate_vidura_1_2.sh --replace\n#\n# Re-record an existing part after review:
#   bash scripts/generate_vidura_1_2.sh --start 1 --end 1 --part 3 --replace
#
# The web player controls repetition; audio files are NEVER duplicated to encode repeats.
exec python3 "$SCRIPT_DIR/generate_vidura_audio.py" --start 1 --end 2 "$@"
