(()=>{'use strict';
const root=document.getElementById('vidura-verses'),audio=document.getElementById('vidura-audio');
const verseSelect=document.getElementById('vidura-verse'),modeSelect=document.getElementById('vidura-mode');
const play=document.getElementById('vidura-play'),pause=document.getElementById('vidura-pause'),stop=document.getElementById('vidura-stop');
const stateLabel=document.getElementById('vidura-audio-state'),search=document.getElementById('vidura-search');
const state={verses:[],script:'dev',audioReady:false,timings:null,raf:0,objectId:0};
function escapeHtml(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function highlight(text,term){const s=String(text??'');if(!term)return escapeHtml(s);const i=s.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());if(i<0)return escapeHtml(s);return escapeHtml(s.slice(0,i))+'<mark>'+escapeHtml(s.slice(i,i+term.length))+'</mark>'+escapeHtml(s.slice(i+term.length));}
function render(){const term=search.value.trim();root.innerHTML='';
for(const v of state.verses){const searchable=[v.theme,...Object.values(v.reading).flat(),...Object.values(v.meaning),...Object.values(v.deeper_meaning),...v.word_by_word.flatMap(w=>Object.values(w)),...v.practice.flatMap(p=>Object.values(p))].join(' ').toLocaleLowerCase();if(term&&!searchable.includes(term.toLocaleLowerCase()))continue;
const script=v.reading[state.script].map(line=>highlight(line,term)).join('\n');const iast=v.reading.iast.map(line=>highlight(line,term)).join('\n');
const language=state.script==='kn'?'kn':'en';const words=v.word_by_word.map(w=>'<div class="vidura-word"><div><b>'+highlight(w[state.script],term)+'</b><small>'+highlight(w.iast,term)+'</small></div><span>'+highlight(w[language],term)+'</span></div>').join('');
const phrases=v.practice.map((p,i)=>'<div class="vidura-phrase '+(p.highlighted?'marked':'')+'" data-verse="'+v.verse_number+'" data-phrase="'+i+'"><span>'+(p.highlighted?'Marked · repeat twice':'Chant once')+'</span><b>'+highlight(p[state.script],term)+'</b><small>'+highlight(p.iast,term)+'</small></div>').join('');
const card=document.createElement('article');card.className='vidura-card';card.id='vidura-verse-'+v.verse_number;card.innerHTML='<div class="vidura-card-head"><h2>Śloka '+v.verse_number+' · '+escapeHtml(v.theme)+'</h2><button type="button" data-play-verse="'+v.verse_number+'">▶ Chant this śloka</button></div>'+
'<div class="vidura-reading"><div><h3>Śloka · '+(state.script==='kn'?'ಕನ್ನಡ':'देवनागरी')+' + IAST</h3><p class="vidura-script" lang="'+(state.script==='kn'?'kn':'sa')+'">'+script+'</p><p class="vidura-iast">'+iast+'</p></div>'+
'<div><h3>'+(state.script==='kn'?'ಸರಳ ಅರ್ಥ':'Overall meaning')+'</h3><p class="vidura-meaning">'+highlight(v.meaning[language],term)+'</p>'+
'<details class="vidura-details"><summary>'+(state.script==='kn'?'ವಿಸ್ತೃತ ಅರ್ಥ ಮತ್ತು ಸಂದೇಶ':'Meaning & deeper significance')+'</summary><div class="vidura-details-body"><p>'+highlight(v.deeper_meaning[language],term)+'</p></div></details></div></div>'+
'<details class="vidura-details"><summary>'+(state.script==='kn'?'ಪದಪದಾರ್ಥ':'Word-by-word meanings')+' · '+v.word_by_word.length+' words</summary><div class="vidura-details-body"><div class="vidura-words">'+words+'</div></div></details>'+
'<details class="vidura-details"><summary>Call & repeat · practice portions</summary><div class="vidura-details-body"><div class="vidura-phrases">'+phrases+'</div><p class="vidura-player-help">'+(v.practice_source==='pdf-highlight'?'Marked phrases follow the highlighted passages in the PDF.':'Verse 2 is unmarked in the handout; repetition groups are editorial suggestions.')+'</p></div></details>';
card.querySelector('[data-play-verse]').addEventListener('click',()=>{verseSelect.value=String(v.verse_number);selectRecording().then(()=>{if(state.audioReady)startAudio();});});
root.appendChild(card);}
if(!root.children.length)root.innerHTML='<p class="vidura-foot">No matching ślokas.</p>';
}
function audioPath(){const n=String(verseSelect.value).padStart(3,'0');return '../audio/vidura/sloka-'+n+'-'+(modeSelect.value==='full'?'full':'call-repeat')+'.mp3';}
function timingPath(){return '../data/vidura/timings/verse-'+String(verseSelect.value).padStart(3,'0')+'.json';}
function clearFocus(){document.querySelectorAll('.vidura-phrase.active').forEach(el=>el.classList.remove('active'));}
function updateFocus(){cancelAnimationFrame(state.raf);if(audio.paused||!state.timings?.segments)return;const now=audio.currentTime;let active=state.timings.segments.find(s=>now>=s.start&&now<s.end);clearFocus();if(active){const phrase=document.querySelector('.vidura-phrase[data-verse="'+verseSelect.value+'"][data-phrase="'+active.phrase_index+'"]');if(phrase){const details=phrase.closest('details');if(details&&!details.open)details.open=true;phrase.classList.add('active');}}state.raf=requestAnimationFrame(updateFocus);}
async function selectRecording(){const id=++state.objectId;audio.pause();audio.removeAttribute('src');audio.load();clearFocus();state.audioReady=false;state.timings=null;play.disabled=true;pause.disabled=true;stop.disabled=true;stateLabel.textContent='Checking recordings…';const url=audioPath();
try{const resp=await fetch(url,{method:'HEAD',cache:'no-store'});if(id!==state.objectId)return;if(!resp.ok)throw Error('Not uploaded');audio.src=url;state.audioReady=true;play.disabled=false;stateLabel.textContent='Recording ready · '+(modeSelect.value==='full'?'Full śloka':'Call & repeat');if(modeSelect.value==='call_repeat'){try{const t=await fetch(timingPath(),{cache:'no-store'});if(t.ok)state.timings=await t.json();}catch(_){/* synchronization data is optional */}}}
catch(_){if(id!==state.objectId)return;stateLabel.textContent='Recording pending · Generate with Vāgdhenu';}
}
async function startAudio(){if(!state.audioReady)return;try{await audio.play();pause.disabled=false;stop.disabled=false;pause.textContent='⏸ Pause';stateLabel.textContent='Now chanting · Śloka '+verseSelect.value;updateFocus();}catch(_){stateLabel.textContent='Audio cannot play; check recording.';}}
function stopAudio(){audio.pause();audio.currentTime=0;cancelAnimationFrame(state.raf);clearFocus();pause.textContent='⏸ Pause';stateLabel.textContent=state.audioReady?'Stopped · Ready to chant':'Recording pending · Generate with Vāgdhenu';}
document.querySelectorAll('[data-script]').forEach(b=>b.addEventListener('click',()=>{state.script=b.dataset.script;document.querySelectorAll('[data-script]').forEach(x=>{x.classList.toggle('chosen',x===b);x.setAttribute('aria-pressed',String(x===b));});render();}));
play.addEventListener('click',startAudio);pause.addEventListener('click',()=>{if(!state.audioReady)return;if(audio.paused){startAudio()}else{audio.pause();cancelAnimationFrame(state.raf);pause.textContent='▶ Resume';stateLabel.textContent='Paused';}});stop.addEventListener('click',stopAudio);
audio.addEventListener('ended',()=>{clearFocus();cancelAnimationFrame(state.raf);pause.disabled=true;stop.disabled=true;stateLabel.textContent='Completed · Śloka '+verseSelect.value;});
verseSelect.addEventListener('change',selectRecording);modeSelect.addEventListener('change',selectRecording);search.addEventListener('input',render);
Promise.all([1,2].map(n=>fetch('../data/vidura/verses/verse-'+String(n).padStart(3,'0')+'.json').then(r=>{if(!r.ok)throw Error('Verse '+n);return r.json();}))).then(verses=>{state.verses=verses;render();selectRecording();}).catch(e=>{root.textContent='Unable to load Viduranīti content: '+e.message;stateLabel.textContent='Content unavailable';});
})();
