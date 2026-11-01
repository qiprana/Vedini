#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Includes both PDF Prarthana slokas, separately from numbered slokas 1-25.
# bash scripts/generate_vidura_prarthana.sh --dry-run
# conda activate vagdhenu
# bash scripts/generate_vidura_prarthana.sh
exec python3 "$SCRIPT_DIR/generate_vidura_prarthana.py" "$@"
