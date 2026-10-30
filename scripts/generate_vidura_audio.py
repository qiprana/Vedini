#!/usr/bin/env python3
"""Batch-generate full and practice chanting for the 25 selected Viduranīti verses.

One reviewed full śloka MP3 plus independently repeatable part MP3s (normally
4; verse 3 contains 6). Sanskrit is always read from committed JSON.

Practice files are synthesized WITH a neighbouring Sanskrit portion as context,
with "anushtubh" metre set explicitly. Aggressive upstream onset trimming is
disabled, and the target is extracted at CowChant's explicit zero-valued
inter-segment gap (not by estimated timestamps).

New files go into audio/vidura/candidates/ by default. Use --publish-ready to
write the main audio/vidura location only after the material is verified.
Original published recordings are never overwritten unless --replace is given.
Atypical metre verses (e.g. 19) need explicit --meter after Sanskrit review.
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


def get_args():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start",type=int,default=3)
    p.add_argument("--end",type=int,default=25)
    p.add_argument("--mode",choices=("all","full","parts"),default="all")
    p.add_argument("--part",type=int,default=None,help="One practice portion only (1-based)")
    p.add_argument("--seed",type=int,default=60)
    p.add_argument("--speed",type=float,default=1.05)
    p.add_argument("--device",choices=("auto","mps","cuda","cpu"),default="auto")
    p.add_argument("--meter",default=None,help="Override metre for an atypical verse")
    p.add_argument("--dry-run",action="store_true")
    p.add_argument("--replace",action="store_true",help="Regenerate existing output files")
    p.add_argument("--publish-ready",action="store_true",help="Write directly into main audio directory: only after listening")
    return p.parse_args()


def cleaned_full(verse):
    """Use the source's full recitation (not practice segments stitched as text)."""
    lines=verse["reading"]["dev"]
    if not 2<=len(lines)<=3 or not all(isinstance(x,str) and x.strip() for x in lines):
        raise ValueError("Full Sanskrit is absent or has unexpected line count")
    combined="\n".join(lines)
    return re.sub(r"॥\s*[०-९0-9]+\s*॥","॥",combined).strip()


def source(n):
    path=ROOT/"data"/"vidura"/"verses"/f"verse-{n:03d}.json"
    verse=json.loads(path.read_text(encoding="utf-8"))
    if verse["verse_number"] != n:
        raise ValueError(f"Verse number mismatch: {path}")
    parts=verse["practice"]
    if len(parts) not in (4,6):
        raise ValueError(f"Expected 4 or 6 study parts, got {len(parts)} in verse {n}")
    for j,p in enumerate(parts,1):
        if not p["dev"].strip() or p["order"]!=j:
            raise ValueError(f"Invalid practice part {j} in {path}")
    return verse


def save_mp3(samples,sr,filename,temp):
    import soundfile as sf
    import numpy as np
    filename.parent.mkdir(parents=True,exist_ok=True)
    pcm=Path(temp)/filename.with_suffix(".wav").name
    sf.write(str(pcm),np.asarray(samples,dtype=np.float32),sr)
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(pcm),
                    "-codec:a","libmp3lame","-b:a","128k",str(filename)],check=True)


def choose_meter(v,override):
    meter=override or v.get("audio",{}).get("meter")
    if meter in ("unknown-long-metre",None,"unknown",""):
        raise ValueError(f"Metre for verse {v['verse_number']} needs review; use --meter after verifying")
    return meter


def select_gap(samples,sr):
    """Find ONLY explicit engine zero padding between its two Sanskrit pieces."""
    import numpy as np
    pcm=np.asarray(samples,dtype=np.float32).reshape(-1)
    is_zero=(pcm==0)
    flags=np.diff(np.concatenate(([0],is_zero.astype(np.int8),[0])))
    starts=np.flatnonzero(flags==1)
    ends=np.flatnonzero(flags==-1)
    gaps=[(int(a),int(b)) for a,b in zip(starts,ends)
          if 0.46 <= (b-a)/sr <= 1.00 and a>sr*0.45 and b<len(pcm)-sr*0.45]
    if len(gaps)!=1:
        raise ValueError(f"Expected one inserted CowChant gap, found {len(gaps)}; no auto-cut")
    return pcm,gaps[0]


def extract_context_part(engine,parts,index,meter,seed):
    """Context preceding or following a target, never guessed mid-word cuts."""
    import numpy as np
    if len(parts)<2: raise ValueError("Need 2 pieces to provide context")
    if index==0:
        pair=[parts[0]["dev"],parts[1]["dev"]]
        take_second=False
    else:
        pair=[parts[index-1]["dev"],parts[index]["dev"]]
        take_second=True
    two_padas=" ।\n".join(pair)+" ।"
    sr,joined=engine.chant(two_padas,meter=meter,seed=seed)
    pcm,(a,b)=select_gap(joined,sr)
    selected=pcm[b:] if take_second else pcm[:a]
    if len(selected)<sr*0.45 or np.max(np.abs(selected))<0.005:
        raise ValueError(f"Part {index+1} empty after context split")
    pad=np.zeros(round(sr*0.12),dtype=np.float32)
    return sr,np.concatenate((pad,selected,pad))


def main():
    args=get_args()
    if args.start<1 or args.end>25 or args.end<args.start or args.speed<=0:
        raise SystemExit("Invalid range/speed; only 1–25 are available")
    if args.part is not None and args.part<1: raise SystemExit("--part starts at 1")
    if args.part is not None and args.mode=="full": raise SystemExit("--part cannot be used with --mode full")
    directory=ROOT/"audio"/"vidura"
    if not args.publish_ready:directory=directory/"candidates"
    jobs=[]
    for n in range(args.start,args.end+1):
        v=source(n)
        meter=choose_meter(v,args.meter) if not args.dry_run else args.meter or v["audio"]["meter"]
        if meter=="unknown-long-metre":
            print(f"WARNING verse {n}: longer metre requires review; see --meter")
        if args.part is not None and args.part>len(v["practice"]):
            raise SystemExit(f"Verse {n} contains only {len(v['practice'])} parts")
        if args.part is None and args.mode in ("all","full"):
            jobs.append((n,"full",cleaned_full(v),directory/f"sloka-{n:03d}-full.mp3",v,meter,None))
        if args.mode in ("all","parts"):
            for i,part in enumerate(v["practice"]):
                if args.part is not None and i+1 != args.part:continue
                jobs.append((n,f"part {i+1}",part["dev"],directory/f"sloka-{n:03d}-part-{i+1:02d}.mp3",v,meter,i))
    print(f"Viduranīti generation: {len(jobs)} items, verses {args.start}–{args.end}")
    for n,label,text,dest,v,meter,i in jobs:
        print(f"[{n:03d}] {label} | metre={meter} | {text} | {dest.relative_to(ROOT)}")
    if args.dry_run:
        print("Dry run: no model loaded; all existing audio preserved")
        return
    if shutil.which("ffmpeg") is None:raise SystemExit("ffmpeg required")
    try:
        from cowchant.engine import CowChant
        from retry_vidura_part3 import preserve_original_onsets
    except ImportError as err:
        raise SystemExit("Activate the vagdhenu conda environment") from err
    engine=CowChant(device=None if args.device=="auto" else args.device,speed=args.speed)
    with tempfile.TemporaryDirectory() as temp:
        for n,label,text,dest,v,meter,index in jobs:
            if dest.exists() and not args.replace:
                print(f"SKIP existing: {dest.name}")
                continue
            if meter=="unknown-long-metre":
                raise ValueError(f"Verse {n} requires metre review; no audio generated for it")
            print(f"CHANGING no source Sanskrit | {n}: {label}",flush=True)
            with preserve_original_onsets(engine):
                if index is None:
                    sr,audio=engine.chant(text,meter=meter,seed=args.seed)
                else:
                    sr,audio=extract_context_part(engine,v["practice"],index,meter,args.seed)
            save_mp3(audio,sr,dest,Path(temp))
            print(f"GENERATED candidate: {dest.relative_to(ROOT)}",flush=True)
    print("Listen to all candidates; promote only after checking whole Sanskrit, endings, and onsets.")


if __name__=="__main__":
    main()
