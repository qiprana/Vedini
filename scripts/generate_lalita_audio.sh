#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Activate conda env first: conda activate vagdhenu
# Pass arguments through to Python, e.g.: --start 1 --end 15 --speed 1.05
exec python3 "$SCRIPT_DIR/generate_lalita_audio.py" "$@"
