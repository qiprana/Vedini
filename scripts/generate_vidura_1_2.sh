#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Activate your conda environment first: conda activate vagdhenu
# Preview: bash scripts/generate_vidura_1_2.sh --dry-run
# Generate both full and call-and-repeat recordings:
exec python3 "$SCRIPT_DIR/generate_vidura_audio.py" --start 1 --end 2 "$@"
