#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Viduranīti: produce four independent Vāgdhenu clips PER śloka.
#
# Preview the exact Sanskrit that will be recorded:
#   bash scripts/generate_vidura_1_2.sh --dry-run
#
# Generate all eight MP3s (4 parts x 2 ślokas):
#   conda activate vagdhenu
#   bash scripts/generate_vidura_1_2.sh
#
# Generate only a single part, e.g. verse 1, part 3:
#   bash scripts/generate_vidura_1_2.sh --start 1 --end 1 --part 3
#
# Re-record an existing part after review:
#   bash scripts/generate_vidura_1_2.sh --start 1 --end 1 --part 3 --replace
#
# The web player controls repetition; audio files are NEVER duplicated to encode repeats.
exec python3 "$SCRIPT_DIR/generate_vidura_audio.py" --start 1 --end 2 "$@"
