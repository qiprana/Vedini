#!/usr/bin/env python3
"""Generate Viduranīti full and call-and-repeat recordings with Vāgdhenu/CowChant.

The existing Vedini CowChant integration is used. Audio must be generated on a
machine with cowchant installed (for example: conda activate vagdhenu).
"""
from __future__ import annotations
import argparse
import json
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def args():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--start',type=int,default=1)
    p.add_argument('--end',type=int,default=2)
    p.add_argument('--mode',choices=['all','full','call-repeat'],default='all')
    p.add_argument('--speed',type=float,default=1.05)
    p.add_argument('--device',choices=['auto','cpu','mps','cuda'],default='auto')
    p.add_argument('--seed',type=int,default=60)
    p.add_argument('--pause',type=float,default=1.6,help='Silent student response interval (seconds)')
    p.add_argument('--between',type=float,default=0.35,help='Pause between phrases (seconds)')
    p.add_argument('--dry-run',action='store_true')
    p.add_argument('--replace',action='store_true')
    return p.parse_args()
def seconds(path):
    with wave.open(str(path),'rb') as f:return f.getnframes()/f.getframerate()
def concat_wavs(paths,out):
    if not paths:raise ValueError('No WAV files')
    with wave.open(str(paths[0]),'rb') as first:
        channels,sampwidth,rate=first.getnchannels(),first.getsampwidth(),first.getframerate()
        typ=first.getcomptype()
    if typ!='NONE':raise ValueError('Only uncompressed WAV is supported')
    with wave.open(str(out),'wb') as result:
        result.setnchannels(channels);result.setsampwidth(sampwidth);result.setframerate(rate)
        for path in paths:
            with wave.open(str(path),'rb') as inp:
                if (inp.getnchannels(),inp.getsampwidth(),inp.getframerate())!=(channels,sampwidth,rate):raise ValueError('Audio formats differ')
                while True:
                    frames=inp.readframes(16384)
                    if not frames:break
                    result.writeframes(frames)
def silence(path,reference,secs):
    with wave.open(str(reference),'rb') as wav:
        channels=wav.getnchannels();width=wav.getsampwidth();rate=wav.getframerate()
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(channels);wav.setsampwidth(width);wav.setframerate(rate)
        wav.writeframes(bytes(round(rate*secs)*channels*width))
def encode(wav,mp3):
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(mp3)],check=True)
def main():
    a=args()
    if a.start<1 or a.end<a.start or a.end>2:raise SystemExit('Available verses: 1–2 only.')
    if a.pause<0 or a.between<0:raise SystemExit('Pauses cannot be negative.')
    if not a.dry_run and not shutil.which('ffmpeg'):raise SystemExit('ffmpeg required. Install with brew install ffmpeg.')
    sources=[]
    for n in range(a.start,a.end+1):
        verse=json.loads((ROOT/'data'/'vidura'/'verses'/f'verse-{n:03d}.json').read_text(encoding='utf-8'))
        if verse['verse_number']!=n:raise SystemExit('Verse number mismatch.')
        sources.append(verse)
    print('Viduranītiḥ chanting source preview:')
    for v in sources:
        print('\\nŚloka',v['verse_number'],'\\n'+'\\n'.join(v['reading']['dev']))
        for i,p in enumerate(v['practice']):
            print('  ',i+1,'repeat',p['repeat'],':',p['dev'])
    if a.dry_run:
        print('\\nDRY RUN: no audio generated.');return
    try:from cowchant.engine import CowChant
    except ImportError:raise SystemExit('Activate the vagdhenu conda environment containing cowchant.')
    engine=CowChant(device=None if a.device=='auto' else a.device,speed=a.speed)
    out=ROOT/'audio'/'vidura';out.mkdir(parents=True,exist_ok=True)
    timing_dir=ROOT/'data'/'vidura'/'timings';timing_dir.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        work=Path(tmp)
        for v in sources:
            number=v['verse_number'];stem=f'sloka-{number:03d}'
            full=out/(stem+'-full.mp3')
            if a.mode in ('all','full') and (a.replace or not full.exists()):
                src=work/(stem+'-full.wav')
                # Preserve original continuous Sanskrit, stripping only the printed number.
                lines=v['reading']['dev'].copy()
                import re
                text=re.sub(r'॥\\s*[०-९0-9]+\\s*॥','॥','\\n'.join(lines))
                engine.chant(text,output=str(src),meter=None,seed=a.seed)
                encode(src,full)
                print('Generated',full)
            repeat=out/(stem+'-call-repeat.mp3')
            if a.mode in ('all','call-repeat') and (a.replace or not repeat.exists()):
                clips=[]
                for i,part in enumerate(v['practice']):
                    path=work/f'{stem}-part-{i}.wav'
                    engine.chant(part['dev'],output=str(path),meter=None,seed=a.seed)
                    clips.append(path)
                order=[];timings=[];elapsed=0.0
                for i,(part,clip) in enumerate(zip(v['practice'],clips)):
                    for r in range(part['repeat']):
                        dur=seconds(clip);order.append(clip)
                        timings.append({'phrase_index':i,'pass':r+1,'start':round(elapsed,3),'end':round(elapsed+dur,3),'highlighted':bool(part['highlighted'])})
                        elapsed+=dur
                        if part['highlighted'] and r==0 and part['repeat']>1 and a.pause>0:
                            gap=work/f'{stem}-pause-{i}.wav';silence(gap,clip,a.pause);order.append(gap);elapsed+=seconds(gap)
                    if i<len(clips)-1 and a.between>0:
                        gap=work/f'{stem}-between-{i}.wav';silence(gap,clip,a.between);order.append(gap);elapsed+=seconds(gap)
                combined=work/(stem+'-call-repeat.wav');concat_wavs(order,combined);encode(combined,repeat)
                timing={'verse_number':number,'mode':'call_repeat','segments':timings,'duration':round(elapsed,3)}
                (timing_dir/f'verse-{number:03d}.json').write_text(json.dumps(timing,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
                print('Generated',repeat)
    print('Review pronunciation and clip transitions, then commit audio/vidura/*.mp3 and data/vidura/timings/*.json.')
if __name__=='__main__':main()
