(()=>{'use strict';
const root=document.getElementById('vidura-verses'),audio=document.getElementById('vidura-audio');
const verseSelect=document.getElementById('vidura-verse'),modeSelect=document.getElementById('vidura-mode');
const repeats=document.getElementById('vidura-repeats'),partPicker=document.getElementById('vidura-part-picker');
const speed=document.getElementById('vidura-speed'),speedLabel=document.getElementById('vidura-speed-value');
const play=document.getElementById('vidura-play'),pause=document.getElementById('vidura-pause'),stop=document.getElementById('vidura-stop'),next=document.getElementById('vidura-next');
const dock=document.getElementById('vidura-player'),workspace=document.getElementById('vidura-workspace'),dockToggle=document.getElementById('vidura-dock-toggle');
const stateLabel=document.getElementById('vidura-audio-state'),search=document.getElementById('vidura-search');
const verseIndex=document.getElementById('vidura-verse-index');
const state={verses:[],script:'dev',audioReady:false,fullReady:false,raf:0,objectId:0,token:0,part:0,playParts:[],repeatMap:{},sequence:[],queueIndex:0};
function escapeHtml(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function highlight(text,term){const s=String(text??'');if(!term)return escapeHtml(s);const i=s.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());if(i<0)return escapeHtml(s);return escapeHtml(s.slice(0,i))+'<mark>'+escapeHtml(s.slice(i,i+term.length))+'</mark>'+escapeHtml(s.slice(i+term.length));}
function render(){const term=search.value.trim();root.innerHTML='';
for(const v of state.verses){const searchable=[v.theme,...Object.values(v.reading).flat(),...Object.values(v.meaning),...Object.values(v.deeper_meaning),...v.word_by_word.flatMap(w=>Object.values(w)),...v.practice.flatMap(p=>Object.values(p))].join(' ').toLocaleLowerCase();if(term&&!searchable.includes(term.toLocaleLowerCase()))continue;
const script=v.reading[state.script].map(line=>highlight(line,term)).join('\n');const iast=v.reading.iast.map(line=>highlight(line,term)).join('\n');
const language=state.script==='kn'?'kn':'en';const words=v.word_by_word.map(w=>'<div class="vidura-word"><div><b>'+highlight(w[state.script],term)+'</b><small>'+highlight(w.iast,term)+'</small></div><span>'+highlight(w[language],term)+'</span></div>').join('');
const phrases=v.practice.map((p,i)=>'<div class="vidura-phrase" data-verse="'+v.verse_number+'" data-phrase="'+i+'"><span>Part '+(i+1)+' · independent clip</span><b>'+highlight(p[state.script],term)+'</b><small>'+highlight(p.iast,term)+'</small></div>').join('');
const card=document.createElement('article');card.className='vidura-card';card.id='vidura-verse-'+v.verse_number;card.innerHTML='<div class="vidura-card-head"><h2>Śloka '+v.verse_number+' · '+escapeHtml(v.theme)+'</h2><button type="button" data-play-verse="'+v.verse_number+'">▶ Chant this śloka</button></div>'+
'<div class="vidura-reading"><div><h3>Śloka · '+(state.script==='kn'?'ಕನ್ನಡ':'देवनागरी')+' + IAST</h3><p class="vidura-script" lang="'+(state.script==='kn'?'kn':'sa')+'">'+script+'</p><p class="vidura-iast">'+iast+'</p></div>'+
'<div><h3>'+(state.script==='kn'?'ಸರಳ ಅರ್ಥ':'Overall meaning')+'</h3><p class="vidura-meaning">'+highlight(v.meaning[language],term)+'</p>'+
'<details class="vidura-details"><summary>'+(state.script==='kn'?'ವಿಸ್ತೃತ ಅರ್ಥ ಮತ್ತು ಸಂದೇಶ':'Meaning & deeper significance')+'</summary><div class="vidura-details-body"><p>'+highlight(v.deeper_meaning[language],term)+'</p></div></details></div></div>'+
'<details class="vidura-details"><summary>'+(state.script==='kn'?'ಪದಪದಾರ್ಥ':'Word-by-word meanings')+' · '+v.word_by_word.length+' words</summary><div class="vidura-details-body"><div class="vidura-words">'+words+'</div></div></details>'+
'<details class="vidura-details"><summary>'+v.practice.length+' chant portions · audio cut points</summary><div class="vidura-details-body"><div class="vidura-phrases">'+phrases+'</div><p class="vidura-player-help">'+(v.practice_source==='pdf-highlight-cut-points'?'The PDF highlights indicate where to cut the śloka into four audio parts.':'These chant boundaries are editorial study divisions and require pronunciation review.')+'</p></div></details>';
card.querySelector('[data-play-verse]').addEventListener('click',async()=>{verseSelect.value=String(v.verse_number);await selectRecording();await startAudio();});
root.appendChild(card);}
if(!root.children.length)root.innerHTML='<p class="vidura-foot">No matching ślokas.</p>';
}
function verse(){return state.verses.find(v=>String(v.verse_number)===verseSelect.value);}
function fullPath(){return '../audio/vidura/sloka-'+String(verseSelect.value).padStart(3,'0')+'-full.mp3';}
function clipPath(i){const path='../audio/vidura/sloka-'+String(verseSelect.value).padStart(3,'0')+'-part-'+String(i+1).padStart(2,'0')+'.mp3';return i===2&&Number(verseSelect.value)<=2?path+'?revision=part3-onset-repair-20261030':path;}
function partCount(i){return state.repeatMap[verseSelect.value+':'+i]??Number(repeats.value);}
function applyChantSpeed(){
 const value=Number(speed.value);
 const rate=Number.isFinite(value)?Math.max(.70,Math.min(1.20,value)):1;
 audio.defaultPlaybackRate=rate;
 audio.playbackRate=rate;
 if('preservesPitch' in audio)audio.preservesPitch=true;
 if('webkitPreservesPitch' in audio)audio.webkitPreservesPitch=true;
 speedLabel.textContent=rate.toFixed(2)+'×';
 return rate;
}
function clearFocus(){document.querySelectorAll('.vidura-phrase.active,.vidura-part.active').forEach(el=>el.classList.remove('active'));}
function focusPart(i){clearFocus();document.querySelectorAll('[data-phrase="'+i+'"][data-verse="'+verseSelect.value+'"]').forEach(el=>el.classList.add('active'));const btn=partPicker.querySelector('[data-part="'+i+'"]');if(btn){const card=btn.closest('.vidura-part');card.classList.add('active');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)card.scrollIntoView({block:'nearest',behavior:'smooth'});}}
function renderParts(){
 const v=verse();if(!v)return;
 const current=document.getElementById('vidura-current-verse'),count=document.getElementById('vidura-part-count');
 if(current)current.textContent='· Śloka '+v.verse_number;
 if(count)count.textContent=v.practice.length+' parts';
 partPicker.innerHTML=v.practice.map((p,i)=>'<div class="vidura-part" data-verse="'+v.verse_number+'"><div class="vidura-part-title">Part '+(i+1)+'</div><div class="vidura-part-script" lang="'+(state.script==='kn'?'kn':'sa')+'">'+escapeHtml(p[state.script])+'</div><div class="vidura-part-iast">'+escapeHtml(p.iast)+'</div><div class="vidura-part-controls"><button type="button" data-part="'+i+'" '+(state.playParts[i]?'':'disabled')+' aria-label="Play part '+(i+1)+' of śloka '+v.verse_number+'">▶ Play</button><label>Repeat <input type="number" min="1" max="100" step="1" data-repeat="'+i+'" aria-label="Repeat part '+(i+1)+'" value="'+partCount(i)+'"></label></div></div>').join('');
 partPicker.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>startAudio(Number(b.dataset.part))));
 partPicker.querySelectorAll('[data-repeat]').forEach(input=>input.addEventListener('change',()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>100){input.value=String(partCount(Number(input.dataset.repeat)));return;}state.repeatMap[verseSelect.value+':'+input.dataset.repeat]=n;}));
}
async function selectRecording(){const id=++state.objectId;state.token++;audio.pause();audio.removeAttribute('src');audio.load();clearFocus();state.audioReady=false;state.fullReady=false;state.playParts=[];state.sequence=[];state.queueIndex=0;play.disabled=true;pause.disabled=true;stop.disabled=true;next.disabled=true;stateLabel.textContent='Checking recordings…';const v=verse();if(!v)return;
if(v.verse_number<=2){state.fullReady=true;state.playParts=Array(v.practice.length).fill(true);state.audioReady=true;play.disabled=false;next.disabled=false;stateLabel.textContent='Full śloka ready · Practice '+v.practice.length+'/'+v.practice.length+' clips ready';renderParts();return;}
await Promise.all([fetch(fullPath(),{method:'HEAD',cache:'no-store'}).then(response=>{if(id===state.objectId)state.fullReady=response.ok;}).catch(()=>{}),...v.practice.map(async(p,i)=>{try{const response=await fetch(clipPath(i),{method:'HEAD',cache:'no-store'});if(response.ok&&id===state.objectId)state.playParts[i]=true;}catch(_){}})]);
if(id!==state.objectId)return;state.audioReady=state.playParts.length>0&&state.playParts.every(Boolean);play.disabled=modeSelect.value==='full'?!state.fullReady:!state.audioReady;stateLabel.textContent='Full śloka '+(state.fullReady?'ready':'pending')+' · Practice '+state.playParts.filter(Boolean).length+'/'+state.playParts.length+' clips ready';renderParts();}
function playbackQueue(single){const indices=single===undefined?Array.from({length:verse()?.practice.length||0},(_,i)=>i):[single];return indices.flatMap(i=>Array.from({length:modeSelect.value==='full'&&single===undefined?1:partCount(i)},()=>i));}
function stopAudio(){window.ViduraShruti?.stop();state.token++;audio.pause();audio.removeAttribute('src');audio.load();state.sequence=[];state.queueIndex=0;clearFocus();pause.disabled=true;stop.disabled=true;next.disabled=!(state.fullReady||state.playParts.some(Boolean));pause.querySelector('.dock-button-label').textContent='Pause';stateLabel.textContent=(state.fullReady||state.audioReady)?'Stopped · Ready to chant':'Recording pending · Generate with Vāgdhenu';}
async function nextClip(token){if(token!==state.token)return;if(state.queueIndex>=state.sequence.length){window.ViduraShruti?.stop();pause.disabled=true;stop.disabled=true;clearFocus();stateLabel.textContent='Chanting complete';return;}const i=state.sequence[state.queueIndex++];state.part=i;audio.src=clipPath(i);focusPart(i);stateLabel.textContent='Playing part '+(i+1)+' · '+state.queueIndex+'/'+state.sequence.length;applyChantSpeed();try{await audio.play();window.ViduraShruti?.start();}catch(_){if(token===state.token){stopAudio();stateLabel.textContent='Audio unavailable or playback blocked';}}}
async function startAudio(single){if(single!==undefined&&!state.playParts[single])return;if(single===undefined&&modeSelect.value==='full'&&!state.fullReady)return;if(single===undefined&&modeSelect.value==='practice'&&!state.audioReady)return;stopAudio();if(single===undefined&&modeSelect.value==='full'){audio.src=fullPath();applyChantSpeed();pause.disabled=false;stop.disabled=false;next.disabled=false;stateLabel.textContent='Playing full śloka';try{await audio.play();window.ViduraShruti?.start();}catch(_){stopAudio();stateLabel.textContent='Full śloka recording unavailable';}return;}state.sequence=playbackQueue(single);state.queueIndex=0;const token=state.token;pause.disabled=false;stop.disabled=false;next.disabled=false;await nextClip(token);}
document.querySelectorAll('[data-script]').forEach(b=>b.addEventListener('click',()=>{state.script=b.dataset.script;document.querySelectorAll('[data-script]').forEach(x=>{x.classList.toggle('chosen',x===b);x.setAttribute('aria-pressed',String(x===b));});render();renderParts();}));
play.addEventListener('click',()=>startAudio());
pause.addEventListener('click',()=>{if(audio.paused){audio.play().then(()=>{window.ViduraShruti?.start();pause.querySelector('.dock-button-label').textContent='Pause';}).catch(()=>{stateLabel.textContent='Playback unavailable';});}else{audio.pause();window.ViduraShruti?.stop();pause.querySelector('.dock-button-label').textContent='Resume';}});
stop.addEventListener('click',stopAudio);
next.addEventListener('click',async()=>{if(modeSelect.value==='full'){const n=Number(verseSelect.value);if(n>=state.verses.length)return;verseSelect.value=String(n+1);await selectRecording();if(state.fullReady)await startAudio();}else if(state.sequence.length){state.token++;audio.pause();const token=state.token;await nextClip(token);}else{const n=Number(verseSelect.value);if(n<state.verses.length){verseSelect.value=String(n+1);await selectRecording();}}});
dockToggle.addEventListener('click',()=>{const collapsed=dock.classList.toggle('is-collapsed');workspace.classList.toggle('dock-collapsed',collapsed);dockToggle.setAttribute('aria-expanded',String(!collapsed));dockToggle.querySelector('.dock-arrow').textContent=collapsed?'▸':'◂';dockToggle.querySelector('.dock-toggle-label').textContent=collapsed?'Expand':'Collapse';});
audio.addEventListener('ended',()=>{if(modeSelect.value==='full'&&state.sequence.length===0){window.ViduraShruti?.stop();pause.disabled=true;stop.disabled=true;stateLabel.textContent='Full śloka complete';}else nextClip(state.token);});
verseSelect.addEventListener('change',()=>{window.ViduraShruti?.stop();state.playParts=Array(verse()?.practice.length||0).fill(false);renderParts();selectRecording();});
modeSelect.addEventListener('change',()=>{stopAudio();repeats.disabled=modeSelect.value==='full';play.disabled=modeSelect.value==='full'?!state.fullReady:!state.audioReady;});
repeats.addEventListener('change',()=>{if(Number(repeats.value)>0){state.repeatMap={};renderParts();}});
window.ViduraChantActive=()=>!audio.paused&&!audio.ended;
speed.addEventListener('input',applyChantSpeed);
applyChantSpeed();
search.addEventListener('input',render);
repeats.disabled=true;
Promise.all(['bundle-001-013.json','bundle-014-025.json'].map(file=>fetch('../data/vidura/verses/'+file).then(r=>{if(!r.ok)throw Error('Verse bundle '+file);return r.json();}))).then(bundles=>bundles.flat()).then(verses=>{state.verses=verses;verseIndex.innerHTML=verses.map(v=>'<a href="#vidura-verse-'+v.verse_number+'">'+String(v.verse_number).padStart(2,'0')+' · '+escapeHtml(v.theme)+'</a>').join('');render();renderParts();selectRecording();}).catch(e=>{root.textContent='Unable to load Viduranīti content: '+e.message;stateLabel.textContent='Content unavailable';});
})();
