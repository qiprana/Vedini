(()=>{
'use strict';
const audio=document.getElementById('review-audio'),wave=document.getElementById('review-wave'),ctx=wave.getContext('2d');
const boundariesEl=document.getElementById('review-boundaries'),partsEl=document.getElementById('review-part-list'),output=document.getElementById('review-output'),status=document.getElementById('review-status');
const labels=[
 ['सुखार्थिनः कुतो विद्या','sukhārthinaḥ kuto vidyā'],
 ['नास्ति विद्यार्थिनः सुखम्','nāsti vidyārthinaḥ sukham'],
 ['सुखार्थी वा त्यजेद् विद्यां','sukhārthī vā tyajed vidyāṃ'],
 ['विद्यार्थी वा त्यजेत् सुखम्','vidyārthī vā tyajet sukham']
];
let duration=10.406,cuts=[2.415,5.065,7.845],samples=[],timer=null,drag=-1;
function norm(t){return Math.min(duration-.15,Math.max(.15,t));}
function stop(){if(timer){audio.removeEventListener('timeupdate',timer);timer=null;}audio.pause();}
function section(i){return [i===0?0:cuts[i-1],i===3?duration:cuts[i]];}
function playRange(start,end){stop();audio.currentTime=Math.max(0,start);audio.play().catch(()=>{status.textContent='Browser prevented playback; press Play on the audio player.';});timer=()=>{if(audio.currentTime>=end-.02){stop();}};audio.addEventListener('timeupdate',timer);}
function adjust(i,t){const low=i===0?.30:cuts[i-1]+.30;const high=i===2?duration-.30:cuts[i+1]-.30;cuts[i]=Math.max(low,Math.min(high,norm(t)));render();}
function toX(t){return 12+(wave.width-24)*t/duration;}
function fromX(x){return norm((x-12)/(wave.width-24)*duration);}
function draw(){
 const w=wave.width,h=wave.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#f7faf5';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#d9e2d9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,h/2);ctx.lineTo(w-12,h/2);ctx.stroke();
 if(samples.length){
  ctx.strokeStyle='#608a72';ctx.lineWidth=1;ctx.beginPath();
  for(let x=12;x<w-12;x++){
   const pos=Math.min(samples.length-1,Math.round((x-12)/(w-24)*samples.length));
   const amp=samples[pos]*h*.43;ctx.moveTo(x,h/2-amp);ctx.lineTo(x,h/2+amp);
  }ctx.stroke();
 }
 ctx.font='12px system-ui';ctx.textAlign='center';
 cuts.forEach((t,i)=>{const x=toX(t);ctx.strokeStyle='#b26044';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x,h-16);ctx.stroke();ctx.fillStyle='#914d39';ctx.fillText('CUT '+(i+1),x,12);ctx.fillText(t.toFixed(2)+'s',x,h-3);});
}
function render(){
 draw();
 boundariesEl.innerHTML=cuts.map((t,i)=>'<div class="review-boundary"><div class="review-boundary-head"><strong>Cut '+(i+1)+' · Between Part '+(i+1)+' and '+(i+2)+'</strong><output>'+t.toFixed(3)+' sec</output></div><input type="range" data-cut="'+i+'" min="'+(i===0?.3:(cuts[i-1]+.3))+'" max="'+(i===2?duration-.3:(cuts[i+1]-.3))+'" step="0.01" value="'+t+'"><div class="review-boundary-controls"><button type="button" data-nudge="'+i+'" data-by="-.10">−0.10s</button><button type="button" data-nudge="'+i+'" data-by="-.02">−0.02s</button><button type="button" data-nudge="'+i+'" data-by=".02">+0.02s</button><button type="button" data-nudge="'+i+'" data-by=".10">+0.10s</button><button type="button" data-near="'+i+'">▶ Hear transition</button></div></div>').join('');
 boundariesEl.querySelectorAll('[data-cut]').forEach(el=>el.addEventListener('input',()=>adjust(Number(el.dataset.cut),Number(el.value))));
 boundariesEl.querySelectorAll('[data-nudge]').forEach(el=>el.addEventListener('click',()=>adjust(Number(el.dataset.nudge),cuts[Number(el.dataset.nudge)]+Number(el.dataset.by))));
 boundariesEl.querySelectorAll('[data-near]').forEach(el=>el.addEventListener('click',()=>{const t=cuts[Number(el.dataset.near)];playRange(Math.max(0,t-1.0),Math.min(duration,t+1.0));}));
 partsEl.innerHTML=labels.map(([dev,iast],i)=>{const [a,b]=section(i);return '<article class="review-part"><h3>PART '+(i+1)+'</h3><div class="review-dev" lang="sa">'+dev+'</div><div class="review-iast">'+iast+'</div><div class="review-duration">'+a.toFixed(2)+'s – '+b.toFixed(2)+'s · '+(b-a).toFixed(2)+'s</div><div class="review-part-actions"><button data-play="'+i+'">▶ Preview part</button><button data-first="'+i+'">▶ Check opening</button><button data-last="'+i+'">▶ Check ending</button></div></article>';}).join('');
 partsEl.querySelectorAll('[data-play]').forEach(el=>el.addEventListener('click',()=>{const [a,b]=section(Number(el.dataset.play));playRange(a,b);}));
 partsEl.querySelectorAll('[data-first]').forEach(el=>el.addEventListener('click',()=>{const [a,b]=section(Number(el.dataset.first));playRange(a,Math.min(b,a+1.5));}));
 partsEl.querySelectorAll('[data-last]').forEach(el=>el.addEventListener('click',()=>{const [a,b]=section(Number(el.dataset.last));playRange(Math.max(a,b-1.5),b);}));
 output.value='Śloka 1 full recording: '+duration.toFixed(3)+' seconds\nCuts: '+cuts.map(t=>t.toFixed(3)).join(', ')+'\nCommand: python3 scripts/split_vidura_full_audio.py --cuts '+cuts.map(t=>t.toFixed(3)).join(' ');
}
wave.addEventListener('pointerdown',ev=>{const r=wave.getBoundingClientRect(),x=(ev.clientX-r.left)*wave.width/r.width;let d=Infinity;cuts.forEach((t,i)=>{const next=Math.abs(x-toX(t));if(next<d){d=next;drag=i;}});if(d>32){drag=-1;return;}wave.setPointerCapture(ev.pointerId);adjust(drag,fromX(x));});
wave.addEventListener('pointermove',ev=>{if(drag<0)return;const r=wave.getBoundingClientRect(),x=(ev.clientX-r.left)*wave.width/r.width;adjust(drag,fromX(x));});
wave.addEventListener('pointerup',()=>{drag=-1;});
wave.addEventListener('pointercancel',()=>{drag=-1;});
document.getElementById('review-speed').addEventListener('change',ev=>{audio.playbackRate=Number(ev.target.value);audio.preservesPitch=true;});
document.getElementById('review-full').addEventListener('click',()=>{stop();audio.currentTime=0;audio.play().catch(()=>{});});
document.getElementById('review-stop').addEventListener('click',stop);
document.getElementById('review-reset').addEventListener('click',()=>{cuts=[2.415,5.065,7.845];render();status.textContent='Unverified estimates restored.';});
document.getElementById('review-copy').addEventListener('click',()=>{const text=output.value;if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>{status.textContent='Cut times copied.';}).catch(()=>{output.select();status.textContent='Select and copy the timings above.';});}else{output.select();status.textContent='Select and copy the timings above.';}});
audio.addEventListener('loadedmetadata',()=>{if(Number.isFinite(audio.duration)&&audio.duration>3){duration=audio.duration;render();}});
async function getSamples(){try{const response=await fetch(audio.currentSrc||audio.src);if(!response.ok)throw Error('Audio not available');const bytes=await response.arrayBuffer();const context=new (window.AudioContext||window.webkitAudioContext)();const buffer=await context.decodeAudioData(bytes);const channel=buffer.getChannelData(0),num=1000,step=Math.max(1,Math.floor(channel.length/num));samples=[];for(let i=0;i<num;i++){let peak=0;for(let j=i*step;j<Math.min(channel.length,(i+1)*step);j+=5)peak=Math.max(peak,Math.abs(channel[j]));samples.push(peak);}await context.close();draw();}catch(e){status.textContent='Waveform preview unavailable; audio timing controls remain usable.';}}
}
function resize(){const r=wave.getBoundingClientRect();wave.width=Math.max(330,Math.round(r.width));wave.height=Math.round(r.height);draw();}
window.addEventListener('resize',resize);
render();resize();getSamples();
})();
