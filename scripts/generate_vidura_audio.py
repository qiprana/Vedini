#!/usr/bin/env python3
"""Generate Viduranīti Vāgdhenu/CowChant audio: one full śloka + four individual parts.

Every audio file is chanted exactly once. The Vedini browser player controls
how often each part is repeated. Use the previously reliable 1.05 recording speed. Fine slowdown is done in the browser without regenerating audio.\nThe full version is chanted in ONE continuous
CowChant pass, not stitched together from the shorter practice recordings.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def arguments():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", type=int, default=1)
    p.add_argument("--end", type=int, default=2)
    p.add_argument("--mode", choices=["all", "full", "parts"], default="all",
                   help="Generate all five tracks, only a full śloka, or only its four parts.")
    p.add_argument("--part", type=int, choices=[1, 2, 3, 4], default=None,
                   help="Generate just this practice part (implies parts mode).")
    p.add_argument("--speed", type=float, default=1.05)
    p.add_argument("--device", choices=["auto", "mps", "cuda", "cpu"], default="auto")
    p.add_argument("--seed", type=int, default=60)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--replace", action="store_true",
                   help="Re-record existing MP3 files; otherwise skip previously generated recordings.")
    return p.parse_args()


def continuous_chant(verse):
    """Preserve the original śloka text; omit only the printed verse counter."""
    lines = verse["reading"]["dev"]
    if len(lines) != 2 or not all(isinstance(line, str) and line.strip() for line in lines):
        raise ValueError(f"Invalid complete śloka for verse {verse.get('verse_number')}")
    return re.sub(r"॥\s*[०-९0-9]+\s*॥", "॥", "\n".join(lines)).strip()


def chant_once(engine, text, destination, tempdir, seed):
    wav = Path(tempdir) / destination.with_suffix(".wav").name
    spoken_text = re.sub(r"[-‐–—]", " ", text)
    engine.chant(spoken_text, output=str(wav), meter=None, seed=seed)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                    "-codec:a", "libmp3lame", "-b:a", "128k", str(destination)], check=True)


def main():
    a = arguments()
    if a.start < 1 or a.end < a.start or a.end > 2:
        raise SystemExit("Only Viduranīti verses 1–2 are currently prepared.")
    if a.part is not None and a.mode == "full":
        raise SystemExit("--part cannot be combined with --mode full.")
    if a.speed <= 0:
        raise SystemExit("--speed must be positive.")
    jobs = []
    output = ROOT / "audio" / "vidura"
    for number in range(a.start, a.end + 1):
        src = ROOT / "data" / "vidura" / "verses" / f"verse-{number:03d}.json"
        verse = json.loads(src.read_text(encoding="utf-8"))
        if verse["verse_number"] != number or len(verse["practice"]) != 4:
            raise SystemExit(f"Invalid four-part Sanskrit source in {src}")
        # Selecting a specific part should not unexpectedly regenerate the full verse.
        if a.part is None and a.mode in ("all", "full"):
            jobs.append((number, "FULL", continuous_chant(verse),
                         output / f"sloka-{number:03d}-full.mp3"))
        if a.mode in ("all", "parts"):
            for i, part in enumerate(verse["practice"], start=1):
                if a.part is not None and a.part != i:
                    continue
                text = part["dev"].strip()
                if not text:
                    raise SystemExit(f"Empty practice part {i} of śloka {number}")
                jobs.append((number, f"PART {i}", text,
                             output / f"sloka-{number:03d}-part-{i:02d}.mp3"))
    print("Viduranītiḥ — Vāgdhenu recordings (no repetitions baked into files):")
    for number, label, text, target in jobs:
        print(f"\nŚloka {number} · {label} -> {target.relative_to(ROOT)}\n{text}")
    if a.dry_run:
        print("\nDRY RUN: no recordings made.")
        return
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg not found. On Mac, install with: brew install ffmpeg")
    try:
        from cowchant.engine import CowChant
    except ImportError as error:
        raise SystemExit("Activate the 'vagdhenu' environment containing cowchant.") from error
    output.mkdir(parents=True, exist_ok=True)
    engine = CowChant(device=None if a.device == "auto" else a.device,
                      speed=a.speed)
    with tempfile.TemporaryDirectory() as tempdir:
        for number, label, text, target in jobs:
            if target.exists() and not a.replace:
                print(f"SKIP existing: {target.name} (use --replace to regenerate)")
                continue
            chant_once(engine, text, target, tempdir, a.seed)
            print(f"CREATED: {target.relative_to(ROOT)}")
    print("\nReview pronunciation and full-verse cadence before committing the recordings.")
    print("  git add audio/vidura/*.mp3")
    print('  git commit -m "Add Viduranīti Vāgdhenu full and practice recordings"')
    print("  git push origin feature/vidura-niti-first-two")


if __name__ == "__main__":
    main()
