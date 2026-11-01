#!/usr/bin/env python3
"""Generate the two PDF Prarthana verses for Viduraniti using local Vagdhenu."""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--dry-run",action="store_true")
    p.add_argument("--replace",action="store_true")
    p.add_argument("--speed",type=float,default=1.05)
    p.add_argument("--meter",default="anushtubh")
    p.add_argument("--device",choices=["auto","mps","cuda","cpu"],default="auto")
    a=p.parse_args()
    verses=json.loads((ROOT/"data/vidura/prarthana.json").read_text(encoding="utf-8"))["verses"]
    out=ROOT/"audio/vidura/candidates"
    jobs=[]
    for verse in verses:
        stem=verse["id"]
        jobs.append((out/f"{stem}-full.mp3","\n".join(verse["dev"])))
        # Split the two printed lines into their four chanting padas.
        padas=[]
        for line in verse["dev"]:
            words=line.replace(" ।","").replace(" ॥","").split()
            # PDF Prarthana verses are anushtubh: 4 metrical padas per verse.
            # Use explicit Sanskrit word boundaries so no word is truncated.
            if stem=="prarthana-1":
                padas=[
                    "व्यासाय विष्णुरूपाय",
                    "व्यासरूपाय विष्णवे",
                    "नमो वै ब्रह्मनिधये",
                    "वासिष्ठाय नमो नमः",
                ]
            else:
                padas=[
                    "नारायणं नमस्कृत्य",
                    "नरं चैव नरोत्तमम्",
                    "देवीं सरस्वतीं व्यासं",
                    "ततो जयमुदीरयेत्",
                ]
        for i,pada in enumerate(padas,1):
            jobs.append((out/f"{stem}-part-{i:02d}.mp3",pada))
    for path,text in jobs:
        print(f"{path.relative_to(ROOT)}: {text}")
    if a.dry_run:
        print("Dry run only; no recordings generated")
        return
    import numpy as np
    import soundfile as sf
    from cowchant.engine import CowChant
    engine=CowChant(device=None if a.device=="auto" else a.device,speed=a.speed)
    out.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for dest,text in jobs:
            if dest.exists() and not a.replace:
                print("SKIP existing",dest.name)
                continue
            sr,samples=engine.chant(text,meter=a.meter,seed=60)
            wav=Path(tmp)/"current.wav"
            sf.write(str(wav),np.asarray(samples,dtype=np.float32),sr)
            subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(wav),"-codec:a","libmp3lame","-b:a","128k",str(dest)],check=True)
            print("GENERATED",dest.name)
    print("Review pronunciation before publishing candidate audio.")

if __name__=="__main__":
    main()
