#!/usr/bin/env python3
"""Analyze a full Viduranīti recording and optionally cut it into four practice MP3s.

The script NEVER synthesizes syllables or reruns Vāgdhenu. It extracts sections
from the already approved complete śloka and adds a short silence to the start
and end of each section for comfortable independent playback.

The three boundaries must be inside naturally quiet gaps. Pass --cuts to choose
verified boundaries; with --analyze-only no output is written.
Requires only Python stdlib and ffmpeg.
"""
from __future__ import annotations

import argparse
import array
import math
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "audio" / "vidura" / "sloka-001-full.mp3"
OUTPUT = ROOT / "audio" / "vidura" / "from-full"
RATE = 16000
WINDOW = 160
PAD_SECONDS = 0.18


def decode(source: Path, wavpath: Path):
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-ar", str(RATE), "-ac", "1", "-c:a", "pcm_s16le", str(wavpath)
    ], check=True)
    with wave.open(str(wavpath), "rb") as wav:
        assert wav.getnchannels() == 1 and wav.getsampwidth() == 2
        pcm = array.array("h")
        pcm.frombytes(wav.readframes(wav.getnframes()))
    if sys.byteorder != "little":
        pcm.byteswap()
    return pcm


def energy(pcm):
    result = []
    for start in range(0, len(pcm), WINDOW):
        part = pcm[start:start+WINDOW]
        if not part:
            break
        rms = math.sqrt(sum(s*s for s in part)/len(part))
        result.append(20*math.log10(max(rms/32768, 0.0000001)))
    return result


def quiet_ranges(db, threshold, min_seconds=0.04):
    intervals = []
    start = None
    for i, energy_db in enumerate(db + [999]):
        if energy_db < threshold and start is None:
            start = i
        elif energy_db >= threshold and start is not None:
            a, b = start*WINDOW/RATE, i*WINDOW/RATE
            if b-a >= min_seconds:
                intervals.append((a, b))
            start = None
    return intervals


def announce(duration, db):
    print(f"SOURCE: {SOURCE.relative_to(ROOT)} | duration={duration:.3f}s")
    print("Silences are candidate cut points, not proof of exact word boundaries.")
    print("Three natural cuts must correspond to ends of four Sanskrit portions.")
    for threshold in [-26, -30, -34, -38, -42]:
        regions = quiet_ranges(db, threshold)
        print(f"\nQUIET RANGES at {threshold} dBFS (>=0.04s):")
        for a, b in regions:
            if .10 <= a and b <= duration - .10:
                print(f"  {a:5.2f}–{b:5.2f}  middle={(a+b)/2:5.2f}  length={b-a:.2f}")


def choose_cuts(duration, db, user_cuts):
    if user_cuts:
        return list(user_cuts)
    # Prefer genuine pauses near the four approximately even-sized phrases.
    # A 0.28-second maximum shift from a quarter point is not enough for
    # unexpected rhythms: use the analyzed logs and explicit --cuts if needed.
    regions = quiet_ranges(db, -32, min_seconds=.05)
    cuts = []
    for fraction in [0.25, 0.50, 0.75]:
        goal = duration*fraction
        candidates = [(a,b) for a,b in regions if abs((a+b)/2-goal) <= duration*.12]
        if not candidates:
            raise ValueError(f"No silence found near {goal:.2f}s; inspect logs and supply --cuts")
        a,b = min(candidates,key=lambda pair: abs((pair[0]+pair[1])/2-goal) - .18*min(pair[1]-pair[0],.4))
        cuts.append((a+b)/2)
    return cuts


def check_cuts(duration, cuts, db):
    if len(cuts) != 3 or not all(0.3 < t < duration-.3 for t in cuts):
        raise ValueError("Provide exactly three cut timestamps in seconds within the recording")
    if not all(b-a>1.15 for a,b in zip([0]+cuts,cuts+[duration])):
        raise ValueError("One clip is too short, or cuts are not in ascending order")
    for point in cuts:
        middle = round(point*RATE/WINDOW)
        # Guard against splitting through vowels or consonants.
        nearby = db[max(0,middle-2):min(len(db),middle+3)]
        median = sorted(nearby)[len(nearby)//2]
        print(f"CUT at {point:.3f}s | median local energy = {median:.1f} dBFS")
        if median > -28:
            raise ValueError(f"{point:.2f}s is not quiet enough (>{-28} dBFS); choose a natural pause")


def write_clips(pcm, duration, cuts, output: Path, tempdir: Path):
    output.mkdir(parents=True, exist_ok=True)
    pad = array.array("h", [0]) * round(PAD_SECONDS*RATE)
    for index, (a,b) in enumerate(zip([0]+cuts,cuts+[duration]),start=1):
        start = round(a*RATE)
        end = min(len(pcm),round(b*RATE))
        clip = pad + pcm[start:end] + pad
        wav = tempdir/f"clip-{index:02d}.wav"
        with wave.open(str(wav),"wb") as out:
            out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE)
            out.writeframes(clip.tobytes())
        mp3 = output/f"sloka-001-part-{index:02d}.mp3"
        subprocess.run([
            "ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(wav),
            "-codec:a","libmp3lame","-b:a","128k",str(mp3)
        ],check=True)
        print(f"EXTRACTED part {index}: {a:.3f}s–{b:.3f}s -> {mp3.relative_to(ROOT)} | {mp3.stat().st_size} bytes")
    assert len(list(output.glob("sloka-001-part-??.mp3"))) == 4


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--analyze-only",action="store_true")
    parser.add_argument("--cuts",nargs=3,type=float,metavar=("T1","T2","T3"),
                        help="Verified cut timestamps (sec) within quiet spans")
    args=parser.parse_args()
    if not SOURCE.exists():
        raise SystemExit(f"Source full-śloka MP3 missing: {SOURCE}")
    with tempfile.TemporaryDirectory() as work:
        tmp=Path(work)
        pcm=decode(SOURCE,tmp/"full.wav")
        duration=len(pcm)/RATE
        db=energy(pcm)
        announce(duration,db)
        if args.analyze_only:return
        cuts=choose_cuts(duration,db,args.cuts)
        check_cuts(duration,cuts,db)
        write_clips(pcm,duration,cuts,OUTPUT,tmp)
    print("Review every clip against the Sanskrit text before replacing playback paths.")


if __name__=="__main__":
    main()
