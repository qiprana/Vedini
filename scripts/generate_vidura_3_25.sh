#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Viduranīti ślokas 3–25: safe candidate audio generation.
# On your Mac:
#   git pull origin main
#   conda activate vagdhenu
#   bash scripts/generate_vidura_3_25.sh --dry-run
#   bash scripts/generate_vidura_3_25.sh
#
# Candidates go to audio/vidura/candidates/; existing published audio
# remains unchanged. Skip śloka 19 pending review of its longer metre.
# After metre review, generate it explicitly:
#   bash scripts/generate_vidura_3_25.sh --start 19 --end 19 --meter <verified-meter>
#
# Narrow batch or regenerate one part:
#   bash scripts/generate_vidura_3_25.sh --start 3 --end 10
#   bash scripts/generate_vidura_3_25.sh --start 7 --end 7 --part 3 --replace
exec python3 "$SCRIPT_DIR/generate_vidura_audio.py" --start 3 --end 25 "$@"
