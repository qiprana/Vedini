#!/usr/bin/env python3
"""Repair the two Viduranīti Part-3 clips using Vāgdhenu's real pāda boundaries.

Why the former retry did not help:
* A single eight-syllable pāda is too short for CowChant's automatic metre detector,
  so meter=None may select the wrong reference metre (vasantatilakā).
* The upstream Renderer.gate() removes quiet leading audio, potentially swallowing
  the first syllables of some short phrases.

This version sets meter="anushtubh", keeps the onset of EVERY model-generated
segment, and renders pāda 2 + pāda 3 as a two-segment passage. The engine places
a known ~0.55-second span of EXACT zeros between the segments. The script extracts
the WHOLE second generated segment by that delimiter, never by guessed timestamps.

Outputs are new review candidates; original published MP3s are NEVER overwritten.
Run in the Mac conda environment where CowChant and ffmpeg already work.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    1: ("नास्ति विद्यार्थिनः सुखम्", "सुखार्थी वा त्यजेद् विद्यां"),
    2: ("अतिवादः श्रियो वधः", "अशुश्रूषा त्वरा श्लाघा"),
}
METER = "anushtubh"
PAD_SECONDS = 0.12


def source_pair(verse_number: int) -> tuple[str, str]:
    source = ROOT / "data" / "vidura" / "verses" / f"verse-{verse_number:03d}.json"
    data = json.loads(source.read_text(encoding="utf-8"))
    if data.get("verse_number") != verse_number or len(data.get("practice", [])) != 4:
        raise ValueError(f"Invalid verse source: {source}")
    preceding, target = (data["practice"][1]["dev"], data["practice"][2]["dev"])
    if (preceding, target) != EXPECTED[verse_number]:
        raise ValueError(
            f"Source changed for śloka {verse_number}; please review Sanskrit:\n"
            f"  got: {preceding} | {target}\n"
            f"  expected: {EXPECTED[verse_number]}"
        )
    return preceding, target


@contextmanager
def preserve_original_onsets(engine):
    """Temporarily bypass the upstream gate's aggressive onset trimming.

    Upstream CowChant's Renderer._stitch uses a module-level gate() which
    normally starts at the first loud window (voice=0.08). For short pādas,
    quiet initial syllables can be removed before MP3 encoding even begins.
    This guard fails safely if the upstream implementation changes.
    """
    if not hasattr(engine, "_lazy_init"):
        raise RuntimeError("This CowChant version has no _lazy_init; check API compatibility.")
    engine._lazy_init()  # loads the renderer before changing its audio gate
    renderer = getattr(engine, "_renderer", None)
    stitch = getattr(renderer, "_stitch", None)
    fn = getattr(stitch, "__func__", stitch)
    scope = getattr(fn, "__globals__", None)
    if not isinstance(scope, dict) or not callable(scope.get("gate")):
        raise RuntimeError("Vāgdhenu onset gate not found; no audio was changed.")
    original = scope["gate"]
    scope["gate"] = lambda samples, *args, **kwargs: samples
    try:
        yield
    finally:
        scope["gate"] = original


def second_segment_after_engine_gap(samples, sample_rate: int):
    """Extract the complete second segment after the explicit 0.55s ZERO gap.

    This is not acoustic silence detection: it recognizes the exact zero samples
    inserted by Renderer._stitch between two already-separated pādas.
    If the gap is ambiguous, fail rather than deliver another incorrect clip.
    """
    import numpy as np

    data = np.asarray(samples, dtype=np.float32).reshape(-1)
    if sample_rate < 8000 or data.size < sample_rate:
        raise ValueError("Invalid or empty Vāgdhenu audio.")
    zero = np.equal(data, 0.0)
    transitions = np.diff(np.concatenate(([0], zero.astype(np.int8), [0])))
    starts = np.flatnonzero(transitions == 1)
    ends = np.flatnonzero(transitions == -1)
    expected_gap = 0.55
    matches = [
        (int(a), int(b)) for a, b in zip(starts, ends)
        if expected_gap * 0.85 <= (b - a) / sample_rate <= expected_gap * 1.8
        and a > sample_rate * 0.45
        and b < data.size - sample_rate * 0.45
    ]
    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one explicit engine gap (~0.55s); found {len(matches)}. "
            "Not slicing automatically; inspect the full context WAV instead."
        )
    gap_start, gap_end = matches[0]
    target = data[gap_end:]
    if target.size < sample_rate * 0.5 or float(np.max(np.abs(target))) < .005:
        raise ValueError("Second Sanskrit segment is empty or too quiet.")
    padding = np.zeros(round(PAD_SECONDS * sample_rate), dtype=np.float32)
    return np.concatenate((padding, target, padding)), (gap_start/sample_rate, gap_end/sample_rate)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verse", type=int, choices=(1, 2), help="Generate just one Part 3")
    parser.add_argument("--seed", type=int, default=60)
    parser.add_argument("--speed", type=float, default=1.05)
    parser.add_argument("--device", choices=("auto", "cpu", "mps", "cuda"), default="auto")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--replace", action="store_true", help="Replace existing CANDIDATE, never published audio")
    parser.add_argument("--keep-context-wav", action="store_true",
                        help="Save the complete two-part source WAV for diagnostic listening")
    opts = parser.parse_args()
    if opts.speed <= 0:
        parser.error("--speed must be positive")
    numbers = [opts.verse] if opts.verse else [1, 2]
    candidates = ROOT / "audio" / "vidura" / "candidates"
    jobs = []
    for n in numbers:
        earlier, target = source_pair(n)
        text = earlier + " ।\n" + target + " ।"
        dest = candidates / f"sloka-{n:03d}-part-03-context.mp3"
        jobs.append((n, earlier, target, text, dest))

    print(f"Viduranīti Part 3 | forced meter={METER} | original onsets preserved")
    for n, earlier, target, text, dest in jobs:
        print(f"\nŚloka {n} | context (discard): {earlier}")
        print(f"Śloka {n} | target (keep):  {target}")
        print(f"Śloka {n} | model input EXACTLY:\n{text}")
        print(f"Review candidate: {dest.relative_to(ROOT)}")
    if opts.dry_run:
        print("\nDry run: CowChant was not loaded; existing files untouched.")
        return 0
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg missing. Install via brew install ffmpeg.")
    try:
        from cowchant.engine import CowChant
    except ImportError as exc:
        raise SystemExit("Activate your vagdhenu conda environment containing CowChant.") from exc
    import soundfile as sf

    engine = CowChant(device=None if opts.device == "auto" else opts.device, speed=opts.speed)
    candidates.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as work:
        for n, earlier, target, text, dest in jobs:
            if dest.exists() and not opts.replace:
                print(f"SKIP existing candidate {dest}; use --replace to regenerate it.")
                continue
            print(f"\nRendering śloka {n} in two complete pādas with {METER}...")
            with preserve_original_onsets(engine):
                sr, audio = engine.chant(text, meter=METER, seed=opts.seed)
            raw_context = Path(work) / f"sloka-{n:03d}-two-padas.wav"
            sf.write(str(raw_context), audio, sr)
            if opts.keep_context_wav:
                audit = candidates / raw_context.name
                shutil.copyfile(raw_context, audit)
                print("Context WAV for listening:", audit.relative_to(ROOT))
            try:
                target_audio, gap = second_segment_after_engine_gap(audio, sr)
            except ValueError:
                print("Not publishing an ambiguous split. Rerun with --keep-context-wav to inspect.")
                raise
            pcm_wav = Path(work) / f"sloka-{n:03d}-part-03-context.wav"
            sf.write(str(pcm_wav), target_audio, sr)
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(pcm_wav),
                 "-codec:a", "libmp3lame", "-b:a", "128k", str(dest)],
                check=True
            )
            print(f"Recognized engine gap: {gap[0]:.3f}s to {gap[1]:.3f}s")
            print(f"CREATED review candidate: {dest.relative_to(ROOT)}")
    print("\nListen for complete opening words before manually replacing ANY live MP3s.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
