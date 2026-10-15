#!/usr/bin/env python3
"""Batch-generate Vedini Lalita Sahasranama chanting WAV + MP3 files.

Reads the approved/committed Sanskrit JSON, never fabricates a missing verse.
One CowChant instance is reused across all verses to avoid model reloads.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path


def get_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", type=int, default=1, help="First main śloka (default 1)")
    p.add_argument("--end", type=int, default=15, help="Last main śloka (default 15)")
    p.add_argument("--speed", type=float, default=1.05, help="CowChant speed (default 1.05)")
    p.add_argument("--device", choices=["auto", "mps", "cuda", "cpu"], default="auto")
    p.add_argument("--meter", default="auto", help="Override meter if desired (default: auto-detect)")
    p.add_argument("--seed", type=int, default=60)
    p.add_argument("--slow", action="store_true", help="Name files sloka-###-slow.mp3/wav")
    p.add_argument("--wav-only", action="store_true", help="Skip MP3 conversion")
    p.add_argument("--replace", action="store_true", help="Regenerate files even when output already exists")
    p.add_argument("--dry-run", action="store_true", help="Print texts and output names without loading CowChant")
    p.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1],
                   help="Path to Vedini repository (default: parent of scripts/)")
    return p.parse_args()


def reading_for_cowchant(verse: dict) -> str:
    lines = verse.get("reading", {}).get("devanagari", [])
    if not isinstance(lines, list) or not lines or not all(isinstance(x, str) and x.strip() for x in lines):
        raise ValueError(f"Verse {verse.get('verse_number')} has no usable Devanagari reading")
    result = "\n".join(lines)
    # Read printed compound breaks as short word boundaries; keep the spoken letters intact.
    result = re.sub(r"[-‐‑–—]", " ", result)
    # Remove the written śloka counter; leave the recitation's double-daṇḍa.
    result = re.sub(r"॥\s*[०-९0-9]+\s*॥", "॥", result)
    result = re.sub(r"(?m)[ \t]+", " ", result)
    return result.strip()


def main() -> int:
    opts = get_args()
    if opts.start < 1 or opts.end < opts.start:
        sys.exit("Invalid range: --start must be >=1 and --end >= --start")
    repo = opts.repo.expanduser().resolve()
    verse_dir = repo / "data" / "lalita" / "verses"
    outdir = repo / "audio" / "lalita" / "verses"
    if not verse_dir.is_dir():
        sys.exit(f"Verse JSON directory not found: {verse_dir}. Run this from an up-to-date Vedini clone.")
    items = []
    for n in range(opts.start, opts.end + 1):
        source = verse_dir / f"verse-{n:03d}.json"
        if not source.is_file():
            sys.exit(f"Missing {source}. No audio files generated: check the selected range.")
        try:
            record = json.loads(source.read_text(encoding="utf-8"))
            if record.get("verse_number") != n:
                raise ValueError(f"verse_number mismatch in {source}")
            chant = reading_for_cowchant(record)
        except (ValueError, json.JSONDecodeError) as e:
            sys.exit(f"Invalid verse source {source}: {e}")
        stem = f"sloka-{n:03d}" + ("-slow" if opts.slow else "")
        items.append((n, chant, outdir / (stem + ".wav"), outdir / (stem + ".mp3")))

    print(f"Vedini Lalitā chanting | verses {opts.start}–{opts.end} | speed {opts.speed}", flush=True)
    for n, chant, wav, mp3 in items:
        print(f"\n[{n:03d}] {wav.name}\n{chant}", flush=True)

    if opts.dry_run:
        print("\nDRY RUN: No model loaded, no files generated.")
        return 0
    if not opts.wav_only and shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg not found. Install with: brew install ffmpeg  (or use --wav-only)")
    try:
        from cowchant.engine import CowChant
    except ImportError as e:
        sys.exit("CowChant is not available in this Python environment. Activate your 'vagdhenu' environment or run: pip install cowchant\n" + str(e))

    outdir.mkdir(parents=True, exist_ok=True)
    engine = CowChant(device=None if opts.device == "auto" else opts.device, speed=opts.speed)
    errors = []
    successes = 0
    for n, chant, wav, mp3 in items:
        started = time.monotonic()
        try:
            if mp3.exists() and not opts.replace and not opts.wav_only:
                print(f"SKIP: {mp3.name} exists; use --replace to regenerate", flush=True)
                successes += 1
                continue
            if not wav.exists() or opts.replace:
                print(f"Chanting śloka {n}...", flush=True)
                engine.chant(chant, output=str(wav), meter=None if opts.meter == "auto" else opts.meter, seed=opts.seed)
            if not opts.wav_only:
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                                "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3)], check=True)
            print(f"DONE {n:03d} in {time.monotonic()-started:.1f}s", flush=True)
            successes += 1
        except (Exception, KeyboardInterrupt) as e:
            print(f"ERROR {n:03d}: {e}", file=sys.stderr, flush=True)
            errors.append(n)
            if isinstance(e, KeyboardInterrupt):
                return 130
    print(f"\nCompleted {successes}/{len(items)} ślokas. Output: {outdir}")
    if errors:
        print("Failed ślokas: "+", ".join(str(x) for x in errors), file=sys.stderr)
    else:
        print("To publish after listening and checking pronunciation:")
        print("  git add audio/lalita/verses/sloka-*.mp3")
        print('  git commit -m "Add Lalitā Sahasranāma chant recordings"')
        print("  git push origin main")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
