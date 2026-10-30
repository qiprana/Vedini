#!/usr/bin/env python3
"""Generate FOUR independent Vāgdhenu/CowChant MP3 clips per Viduranīti verse.

The highlight boundaries define clips; repetition is exclusively controlled by the web player.
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
    p.add_argument("--part", type=int, choices=[1, 2, 3, 4], default=None)
    p.add_argument("--speed", type=float, default=1.05)
    p.add_argument("--device", choices=["auto", "mps", "cuda", "cpu"], default="auto")
    p.add_argument("--seed", type=int, default=60)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--replace", action="store_true")
    return p.parse_args()

def main():
    a = arguments()
    if a.start < 1 or a.end < a.start or a.end > 2:
        raise SystemExit("Only Viduranīti verses 1 and 2 are currently prepared.")
    jobs = []
    output = ROOT / "audio" / "vidura"
    for n in range(a.start, a.end + 1):
        src = ROOT / "data" / "vidura" / "verses" / f"verse-{n:03d}.json"
        verse = json.loads(src.read_text(encoding="utf-8"))
        parts = verse["practice"]
        if verse["verse_number"] != n or len(parts) != 4:
            raise SystemExit(f"Invalid four-part Sanskrit source in {src}")
        for i, part in enumerate(parts, start=1):
            if a.part is not None and a.part != i:
                continue
            text = part["dev"].strip()
            if not text:
                raise SystemExit(f"Empty Sanskrit text for verse {n}, part {i}")
            filename = output / f"sloka-{n:03d}-part-{i:02d}.mp3"
            jobs.append((n, i, text, filename))
    print("Vāgdhenu Viduranīti segment generation: each part is recorded ONCE.")
    for n, i, text, filename in jobs:
        print(f"Śloka {n}, part {i}: {text} -> {filename.relative_to(ROOT)}")
    if a.dry_run:
        print("Dry run complete. No audio created.")
        return
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg missing: install it before generating MP3.")
    try:
        from cowchant.engine import CowChant
    except ImportError as error:
        raise SystemExit("Activate the vagdhenu environment containing cowchant.") from error
    output.mkdir(parents=True, exist_ok=True)
    engine = CowChant(device=None if a.device == "auto" else a.device, speed=a.speed)
    with tempfile.TemporaryDirectory() as tmp:
        for n, i, text, mp3 in jobs:
            if mp3.exists() and not a.replace:
                print(f"SKIP existing: {mp3.name}; pass --replace to re-record.")
                continue
            wav = Path(tmp) / f"sloka-{n:03d}-part-{i:02d}.wav"
            engine.chant(re.sub(r"[-‐–—]", " ", text), output=str(wav), meter=None, seed=a.seed)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                            "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3)], check=True)
            print(f"CREATED {mp3.relative_to(ROOT)}")
    print("Review the eight clips for Sanskrit pronunciation, then git add/commit/push audio/vidura.")

if __name__ == "__main__":
    main()
