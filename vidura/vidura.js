(()=>{'use strict';
const root=document.getElementById('vidura-verses'),audio=document.getElementById('vidura-audio');
const verseSelect=document.getElementById('vidura-verse'),modeSelect=document.getElementById('vidura-mode');
const repeats=document.getElementById('vidura-repeats'),partPicker=document.getElementById('vidura-part-picker');
const speed=document.getElementById('vidura-speed'),speedLabel=document.getElementById('vidura-speed-value');
const play=document.getElementById('vidura-play'),pause=document.getElementById('vidura-pause'),stop=document.getElementById('vidura-stop'),next=document.getElementById('vidura-next');
const dock=document.getElementById('vidura-player'),workspace=document.getElementById('vidura-workspace'),dockToggle=document.getElementById('vidura-dock-toggle');
const stateLabel=document.getElementById('vidura-audio-state'),search=document.getElementById('vidura-search');
const verseIndex=document.getElementById('vidura-verse-index');
const state={scrollTarget:null,lastHighlightedPart:-1,verses:[],script:'dev',audioReady:false,fullReady:false,raf:0,objectId:0,token:0,part:0,playParts:[],sequence:[],queueIndex:0,fullRepeatsLeft:0};
function escapeHtml(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function highlight(text,term){const s=String(text??'');if(!term)return escapeHtml(s);const i=s.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());if(i<0)return escapeHtml(s);return escapeHtml(s.slice(0,i))+'<mark>'+escapeHtml(s.slice(i,i+term.length))+'</mark>'+escapeHtml(s.slice(i+term.length));}
function render(){const term=search.value.trim();root.innerHTML='';updateIndexSelection();
for(const v of state.verses){if(String(v.verse_number)!==verseSelect.value)continue;const searchable=[v.theme,...Object.values(v.reading).flat(),...Object.values(v.meaning),...Object.values(v.deeper_meaning),...v.word_by_word.flatMap(w=>Object.values(w)),...v.practice.flatMap(p=>Object.values(p))].join(' ').toLocaleLowerCase();/* Search selects its matching verse; the view always shows one śloka. */
const script=v.reading[state.script].map(line=>highlight(line,term)).join('\n');const iast=v.reading.iast.map(line=>highlight(line,term)).join('\n');
const language=state.script==='kn'?'kn':'en';const words=v.word_by_word.map(w=>'<div class="vidura-word"><div><b>'+highlight(w[state.script],term)+'</b><small>'+highlight(w.iast,term)+'</small></div><span>'+highlight(w[language],term)+'</span></div>').join('');
const selected=Number(verseSelect.value)===v.verse_number;
const inlineRows=v.practice.map((p,i)=>'<div class="vidura-inline-preview-row" data-verse="'+v.verse_number+'" data-preview-part="'+i+'"><span class="vidura-inline-number">'+(i+1)+'</span><span class="vidura-inline-preview-copy"><b>'+highlight(p[state.script],term)+'</b><small>'+highlight(p.iast,term)+'</small></span><button type="button" data-select-part="'+i+'" aria-label="Play śloka '+v.verse_number+' part '+(i+1)+'" '+(v.verse_number===19?'disabled':'')+'>▶</button></div>').join('');
const card=document.createElement('article');card.className='vidura-card';card.id='vidura-verse-'+v.verse_number;card.innerHTML='<div class="vidura-card-head"><h2>Śloka '+v.verse_number+' · '+escapeHtml(v.theme)+'</h2><button type="button" data-play-verse="'+v.verse_number+'">▶ Chant this śloka</button></div>'+
'<div class="vidura-verse-top"><div class="vidura-script-panel"><h3>Śloka · '+(state.script==='kn'?'ಕನ್ನಡ':'देवनागरी')+' + IAST</h3><p class="vidura-script" lang="'+(state.script==='kn'?'kn':'sa')+'">'+script+'</p><p class="vidura-iast">'+iast+'</p></div>'+
'<div class="vidura-inline-chant" data-chant-slot="'+v.verse_number+'"><div class="vidura-inline-chant-head"><strong>Chanting portions</strong><span>'+v.practice.length+' parts</span></div><p class="vidura-inline-chant-help">Play each phrase; the player’s Repeat setting applies.</p><div class="vidura-inline-chant-placeholder">'+(v.verse_number===19?'Audio pending for this śloka':(selected?'':inlineRows))+'</div></div></div><div class="vidura-inline-meaning"><h3>'+(state.script==='kn'?'ಸರಳ ಅರ್ಥ':'Overall meaning')+'</h3><p class="vidura-meaning">'+highlight(v.meaning[language],term)+'</p>'+
'<details class="vidura-details"><summary>'+(state.script==='kn'?'ವಿಸ್ತೃತ ಅರ್ಥ ಮತ್ತು ಸಂದೇಶ':'Meaning & deeper significance')+'</summary><div class="vidura-details-body"><p>'+highlight(v.deeper_meaning[language],term)+'</p></div></details></div>'+
'<details class="vidura-details"><summary>'+(state.script==='kn'?'ಪದಪದಾರ್ಥ':'Word-by-word meanings')+' · '+v.word_by_word.length+' words</summary><div class="vidura-details-body"><div class="vidura-words">'+words+'</div></div></details>'+
'';
card.querySelector('[data-play-verse]').addEventListener('click',async()=>{verseSelect.value=String(v.verse_number);render();await selectRecording();await startAudio();});
card.querySelectorAll('[data-select-part]').forEach(b=>b.addEventListener('click',async()=>{const i=Number(b.dataset.selectPart);verseSelect.value=String(v.verse_number);render();await selectRecording();await startAudio(i);}));
card.querySelector('[data-chant-slot]').addEventListener('click',e=>{if(e.target.closest('button,input,label'))return;if(Number(verseSelect.value)===v.verse_number)return;verseSelect.value=String(v.verse_number);render();selectRecording();});
root.appendChild(card);}
mountPartPicker();
if(!root.children.length)root.innerHTML='<p class="vidura-foot">No matching ślokas.</p>';
}
function updateIndexSelection(){const n=Number(verseSelect.value);const prev=document.getElementById('vidura-prev-verse'),forward=document.getElementById('vidura-next-verse'),count=document.getElementById('vidura-verse-position');if(prev)prev.disabled=n<=1;if(forward)forward.disabled=n>=state.verses.length;if(count)count.textContent=String(n)+' of '+state.verses.length;const v=verse();const title=document.getElementById('vidura-player-selection');if(title&&v)title.textContent=String(v.verse_number).padStart(2,'0')+' · '+v.theme;}
function highlightCurrentVerse(active){document.querySelectorAll('.vidura-card.chanting-active').forEach(el=>{el.classList.remove('chanting-active');el.removeAttribute('data-chanting');});if(!active)return;const card=document.getElementById('vidura-verse-'+verseSelect.value);if(card){card.classList.add('chanting-active');card.setAttribute('data-chanting','true');}}
function scrollToNewVerse(){const el=document.getElementById('vidura-verse-index');if(el)el.scrollIntoView({block:'start',behavior:'auto'});}
function verse(){return state.verses.find(v=>String(v.verse_number)===verseSelect.value);}
function publishedAudioRoot(){return Number(verseSelect.value)<=2?'../audio/vidura/':'../audio/vidura/candidates/';}
function fullPath(){return publishedAudioRoot()+'sloka-'+String(verseSelect.value).padStart(3,'0')+'-full.mp3';}
function clipPath(i){const path=publishedAudioRoot()+'sloka-'+String(verseSelect.value).padStart(3,'0')+'-part-'+String(i+1).padStart(2,'0')+'.mp3';return i===2&&Number(verseSelect.value)<=2?path+'?revision=part3-onset-repair-20261030':path;}
function repeatCount(){return Math.max(1,Number(repeats.value)||1);}
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
function focusPart(i){const moved=i!==state.lastHighlightedPart;clearFocus();state.lastHighlightedPart=i;highlightCurrentVerse(true);document.querySelectorAll('[data-phrase="'+i+'"][data-verse="'+verseSelect.value+'"]').forEach(el=>el.classList.add('active'));const btn=partPicker.querySelector('[data-part="'+i+'"]');if(btn){const card=btn.closest('.vidura-part');card.classList.add('active');if(moved&&state.queueIndex===1&&state.sequence.length>0)card.scrollIntoView({block:'nearest',behavior:'auto'});}}
function mountPartPicker(){const slot=root.querySelector('[data-chant-slot="'+verseSelect.value+'"]');if(slot){slot.querySelector('.vidura-inline-chant-placeholder')?.remove();slot.appendChild(partPicker);}}
function renderParts(){
 const v=verse();if(!v)return;
 mountPartPicker();
 const current=null,count=null;
 if(current)current.textContent='· Śloka '+v.verse_number;
 if(count)count.textContent=v.practice.length+' parts';
 partPicker.innerHTML=v.practice.map((p,i)=>'<div class="vidura-part" data-verse="'+v.verse_number+'"><div class="vidura-part-title">Part '+(i+1)+'</div><div class="vidura-part-script" lang="'+(state.script==='kn'?'kn':'sa')+'">'+escapeHtml(p[state.script])+'</div><div class="vidura-part-iast">'+escapeHtml(p.iast)+'</div><div class="vidura-part-controls"><button type="button" data-part="'+i+'" '+(state.playParts[i]?'':'disabled')+' aria-label="Play part '+(i+1)+' of śloka '+v.verse_number+'">▶ Play</button></div></div>').join('');
 partPicker.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>startAudio(Number(b.dataset.part))));

}
async function selectRecording(){const id=++state.objectId;state.token++;audio.pause();audio.removeAttribute('src');audio.load();clearFocus();state.lastHighlightedPart=-1;state.audioReady=false;state.fullReady=false;state.playParts=[];state.sequence=[];state.queueIndex=0;play.disabled=true;pause.disabled=true;stop.disabled=true;next.disabled=true;stateLabel.textContent='Checking recordings…';const v=verse();if(!v)return;
if(v.verse_number!==19){state.fullReady=true;state.playParts=Array(v.practice.length).fill(true);state.audioReady=true;play.disabled=false;next.disabled=false;stateLabel.textContent='Full śloka ready · Practice '+v.practice.length+'/'+v.practice.length+' clips ready';renderParts();return;}
await Promise.all([fetch(fullPath(),{method:'HEAD',cache:'no-store'}).then(response=>{if(id===state.objectId)state.fullReady=response.ok;}).catch(()=>{}),...v.practice.map(async(p,i)=>{try{const response=await fetch(clipPath(i),{method:'HEAD',cache:'no-store'});if(response.ok&&id===state.objectId)state.playParts[i]=true;}catch(_){}})]);
if(id!==state.objectId)return;state.audioReady=state.playParts.length>0&&state.playParts.every(Boolean);play.disabled=modeSelect.value==='full'?!state.fullReady:!state.audioReady;stateLabel.textContent='Full śloka '+(state.fullReady?'ready':'pending')+' · Practice '+state.playParts.filter(Boolean).length+'/'+state.playParts.length+' clips ready';renderParts();}
function playbackQueue(single){const indices=single===undefined?Array.from({length:verse()?.practice.length||0},(_,i)=>i):[single];return indices.flatMap(i=>Array.from({length:repeatCount()},()=>i));}
function stopAudio(){highlightCurrentVerse(false);window.ViduraShruti?.stop();state.token++;audio.pause();audio.removeAttribute('src');audio.load();state.sequence=[];state.queueIndex=0;state.fullRepeatsLeft=0;clearFocus();state.lastHighlightedPart=-1;pause.disabled=true;stop.disabled=true;next.disabled=!(state.fullReady||state.playParts.some(Boolean));pause.querySelector('.dock-button-label').textContent='Pause';stateLabel.textContent=(state.fullReady||state.audioReady)?'Stopped · Ready to chant':'Recording pending · Generate with Vāgdhenu';}
async function nextClip(token){if(token!==state.token)return;if(state.queueIndex>=state.sequence.length){window.ViduraShruti?.stop();pause.disabled=true;stop.disabled=true;clearFocus();stateLabel.textContent='Chanting complete';highlightCurrentVerse(false);return;}const i=state.sequence[state.queueIndex++];state.part=i;audio.src=clipPath(i);focusPart(i);stateLabel.textContent='Playing part '+(i+1)+' · '+state.queueIndex+'/'+state.sequence.length;applyChantSpeed();try{await audio.play();window.ViduraShruti?.start();}catch(_){if(token===state.token){stopAudio();stateLabel.textContent='Audio unavailable or playback blocked';}}}
async function startAudio(single){if(single!==undefined&&!state.playParts[single])return;if(single===undefined&&modeSelect.value==='full'&&!state.fullReady)return;if(single===undefined&&modeSelect.value==='practice'&&!state.audioReady)return;stopAudio();if(single===undefined&&modeSelect.value==='full'){state.fullRepeatsLeft=repeatCount();audio.src=fullPath();applyChantSpeed();pause.disabled=false;stop.disabled=false;next.disabled=false;stateLabel.textContent='Playing full śloka · 1/'+repeatCount();highlightCurrentVerse(true);try{await audio.play();window.ViduraShruti?.start();}catch(_){stopAudio();stateLabel.textContent='Full śloka recording unavailable';}return;}state.sequence=playbackQueue(single);state.queueIndex=0;const token=state.token;pause.disabled=false;stop.disabled=false;next.disabled=false;await nextClip(token);}
document.querySelectorAll('[data-script]').forEach(b=>b.addEventListener('click',()=>{state.script=b.dataset.script;document.querySelectorAll('[data-script]').forEach(x=>{x.classList.toggle('chosen',x===b);x.setAttribute('aria-pressed',String(x===b));});render();renderParts();}));
play.addEventListener('click',()=>startAudio());
pause.addEventListener('click',()=>{if(audio.paused){audio.play().then(()=>{window.ViduraShruti?.start();pause.querySelector('.dock-button-label').textContent='Pause';}).catch(()=>{stateLabel.textContent='Playback unavailable';});}else{audio.pause();window.ViduraShruti?.stop();pause.querySelector('.dock-button-label').textContent='Resume';}});
stop.addEventListener('click',stopAudio);
async function navigateVerse(delta,autoplay=false){const index=state.verses.findIndex(v=>String(v.verse_number)===verseSelect.value);const target=state.verses[index+delta];if(!target)return;stopAudio();verseSelect.value=String(target.verse_number);render();await selectRecording();updateIndexSelection();scrollToNewVerse();if(autoplay&&(modeSelect.value==='full'?state.fullReady:state.audioReady))await startAudio();}
next.addEventListener('click',()=>navigateVerse(1,false));
document.getElementById('vidura-prev-verse').addEventListener('click',()=>navigateVerse(-1,false));
document.getElementById('vidura-next-verse').addEventListener('click',()=>navigateVerse(1,false));
function setDockCollapsed(collapsed){dock.classList.toggle('is-collapsed',collapsed);workspace.classList.toggle('dock-collapsed',collapsed);dockToggle.setAttribute('aria-expanded',String(!collapsed));dockToggle.querySelector('.dock-arrow').textContent=collapsed?'▸':'◂';dockToggle.querySelector('.dock-toggle-label').textContent=collapsed?'Settings':window.matchMedia('(max-width:620px)').matches?'Close settings':'Collapse';}
dockToggle.addEventListener('click',()=>setDockCollapsed(!dock.classList.contains('is-collapsed')));
if(window.matchMedia('(max-width:620px)').matches)setDockCollapsed(true);
audio.addEventListener('ended',()=>{if(modeSelect.value==='full'&&state.sequence.length===0){if(state.fullRepeatsLeft>1){state.fullRepeatsLeft--;audio.currentTime=0;applyChantSpeed();stateLabel.textContent='Repeating full śloka · '+(repeatCount()-state.fullRepeatsLeft+1)+'/'+repeatCount();audio.play().catch(()=>{stopAudio();stateLabel.textContent='Full śloka recording unavailable';});}else{state.fullRepeatsLeft=0;window.ViduraShruti?.stop();pause.disabled=true;stop.disabled=true;stateLabel.textContent='Full śloka complete';highlightCurrentVerse(false);}}else nextClip(state.token);});
verseSelect.addEventListener('change',()=>{stopAudio();render();selectRecording();scrollToNewVerse();});
modeSelect.addEventListener('change',()=>{stopAudio();repeats.disabled=false;play.disabled=modeSelect.value==='full'?!state.fullReady:!state.audioReady;});
repeats.addEventListener('change',()=>{stateLabel.textContent='Repeat '+repeatCount()+'× · '+(modeSelect.value==='full'?'whole śloka':'each part');});
window.ViduraChantActive=()=>!audio.paused&&!audio.ended;
speed.addEventListener('input',applyChantSpeed);
applyChantSpeed();
search.addEventListener('input',()=>{const q=search.value.trim().toLocaleLowerCase();if(q){const hit=state.verses.find(v=>[v.theme,...Object.values(v.reading).flat(),...Object.values(v.meaning),...Object.values(v.deeper_meaning),...v.word_by_word.flatMap(w=>Object.values(w)),...v.practice.flatMap(p=>Object.values(p))].join(' ').toLocaleLowerCase().includes(q));if(hit&&String(hit.verse_number)!==verseSelect.value){stopAudio();verseSelect.value=String(hit.verse_number);render();selectRecording();return;}}render();});
repeats.disabled=false;
Promise.all(['bundle-001-013.json','bundle-014-025.json'].map(file=>fetch('../data/vidura/verses/'+file).then(r=>{if(!r.ok)throw Error('Verse bundle '+file);return r.json();}))).then(bundles=>bundles.flat()).then(verses=>{state.verses=verses;verseSelect.innerHTML=verses.map(v=>'<option value="'+v.verse_number+'">'+String(v.verse_number).padStart(2,'0')+' · '+escapeHtml(v.theme)+'</option>').join('');render();renderParts();selectRecording();}).catch(e=>{root.textContent='Unable to load Viduranīti content: '+e.message;stateLabel.textContent='Content unavailable';});
})();
