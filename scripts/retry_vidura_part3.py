#!/usr/bin/env python3
"""Regenerate only Part 3 of Viduranīti ślokas 1 and 2, without overwriting live audio.

Uses exactly the source-script Sanskrit below; print preview with --dry-run.
Candidates go to audio/vidura/candidates/ until their pronunciation is approved.
Run with 'conda activate vagdhenu' on the local machine that has CowChant.
"""
from __future__ import annotations
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
  1:"सुखार्थी वा त्यजेद् विद्यां",
  2:"अशुश्रूषा त्वरा श्लाघा",
}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--verse",type=int,choices=[1,2],help="Regenerate only one verse")
    p.add_argument("--seed",type=int,default=73,help="Different generation seed from the initial recordings (60)")
    p.add_argument("--speed",type=float,default=1.05)
    p.add_argument("--dry-run",action="store_true")
    a=p.parse_args()
    jobs=[]
    for n in ([a.verse] if a.verse else [1,2]):
        path=ROOT/"data"/"vidura"/"verses"/f"verse-{n:03d}.json"
        source=json.loads(path.read_text(encoding="utf-8"))
        if source["verse_number"]!=n or len(source["practice"])!=4:
            raise SystemExit(f"Unexpected verse data in {path}")
        actual=source["practice"][2]["dev"]
        if actual!=EXPECTED[n]:
            raise SystemExit(f"Sanskrit mismatch for verse {n}: {actual!r} != {EXPECTED[n]!r}")
        out=ROOT/"audio"/"vidura"/"candidates"/f"sloka-{n:03d}-part-03-retry.mp3"
        jobs.append((n,actual,out))
    print("Vāgdhenu Part 3 retry. Exact Sanskrit to synthesize:")
    for n,text,out in jobs:
        print(f"Śloka {n}: {text}")
        print(f"  UTF-8: {text.encode('utf-8').hex()}")
        print(f"  Candidate: {out.relative_to(ROOT)}")
    if a.dry_run:
        print("Dry run only. Existing recordings untouched.")
        return
    from cowchant.engine import CowChant
    engine=CowChant(device=None,speed=a.speed)
    with tempfile.TemporaryDirectory() as temp:
        for n,text,out in jobs:
            out.parent.mkdir(parents=True,exist_ok=True)
            wav=Path(temp)/f"sloka-{n:03d}-part-03.wav"
            print(f"Synthesizing exact source for śloka {n}, part 3: {text}")
            engine.chant(text,output=str(wav),meter=None,seed=a.seed)
            subprocess.run(["ffmpeg","-loglevel","error","-y","-i",str(wav),"-codec:a","libmp3lame","-b:a","128k",str(out)],check=True)
            print("CREATED",out.relative_to(ROOT))
    print("Listen to both candidates before replacing the published Part 3 files.")

if __name__=="__main__":
    main()
