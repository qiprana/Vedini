(function(){"use strict";
const $=s=>document.querySelector(s),root=$("#fc-page"),list=$("#fc-list"),audio=$("#fc-audio");
const state={entries:[],meanings:new Map(),playing:false,paused:false,index:0,token:0,clips:[],clipIndex:0,audioMap:new Map(),dhyanaClips:new Map(),fallback:new Set()};
const setStatus=s=>{$("#fc-status").textContent=s},pad=n=>String(n).padStart(3,"0");
const fetchJSON=async p=>{const r=await fetch("../data/lalita/"+p,{cache:"no-store"});if(!r.ok)throw Error("Could not load "+p);return r.json()};
const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e};
const key=e=>e.kind==="dhyana"?"d-"+e.verse_number:"s-"+e.verse_number;
function render(){
 list.replaceChildren();root.classList.toggle("fc-hide-iast",!$("#fc-show-iast").checked);root.classList.toggle("fc-hide-meaning",!$("#fc-show-meaning").checked);
 const script=$("#fc-script").value,fragment=document.createDocumentFragment();
 for(const e of state.entries){
  if(e.verse_number===1){const h=el("h2","fc-section-heading",e.kind==="dhyana"?"Dhyāna Ślokas":"Lalitā Sahasranāma");h.append(el("small","",e.kind==="dhyana"?"Meditation verses · recited before the main hymn":"183 ślokas · main hymn"));fragment.append(h)}
  const card=el("article","fc-verse"+(e.kind==="dhyana"?" fc-dhyana":""));card.id="fc-sloka-"+key(e);
  if(state.playing&&key(e)===key(state.entries[state.index]))card.classList.add("fc-playing");
  const left=el("div","fc-reading"),head=el("div","fc-verse-head");head.append(el("span","fc-number",(e.kind==="dhyana"?"Dhyāna ":"Śloka ")+e.verse_number));
  const start=el("button","fc-from-here","▶ Start here");start.type="button";start.dataset.start=key(e);start.setAttribute("aria-label","Start chanting from "+(e.kind==="dhyana"?"Dhyāna ":"śloka ")+e.verse_number);head.append(start);left.append(head);
  const lines=e.reading?.[script==="kn"?"kannada":"devanagari"]||e.sanskrit||[];
  const dev=el("p","fc-script",lines.join("\n"));dev.lang=script==="kn"?"kn":"sa";left.append(dev);
  left.append(el("p","fc-iast",(e.reading?.iast||e.iast||[]).join("\n")));
  const right=el("div","fc-meaning");right.append(el("span","fc-meaning-title",script==="kn"?"ಸರಳ ಅರ್ಥ":"Simple meaning"));
  const m=state.meanings.get(key(e))||{};right.append(el("p","",m[script==="kn"?"kn":"en"]||"Meaning not available"));
  card.append(left,right);fragment.append(card);
 }
 list.append(fragment);
}
function controls(){
 $("#fc-pause").disabled=!state.playing;$("#fc-stop").disabled=!state.playing;$("#fc-pause").textContent=state.paused?"Resume":"Pause";
}
function stop(message="Stopped"){
 state.token++;state.playing=false;state.paused=false;state.clips=[];state.clipIndex=0;
 audio.pause();audio.removeAttribute("src");audio.load();controls();
 document.querySelectorAll(".fc-playing").forEach(e=>e.classList.remove("fc-playing"));setStatus(message);
}
function active(){
 const e=state.entries[state.index];if(!e)return;
 document.querySelectorAll(".fc-playing").forEach(x=>x.classList.remove("fc-playing"));
 const card=document.getElementById("fc-sloka-"+key(e));if(card){card.classList.add("fc-playing");card.scrollIntoView({block:"start",behavior:"smooth"})}
 $("#fc-jump").value=key(e);
}
function sourceFor(e){
 const voice=$("#fc-voice").value;
 if(e.kind==="dhyana"){
  const clips=state.dhyanaClips.get(e.verse_number)||[];
  return {urls:clips.map(n=>"../audio/lalita/verses/MSS/phrase_"+String(n).padStart(4,"0")+".mp3"),label:"MSS · Dhyāna"};
 }
 if(voice==="MSS"&&!state.fallback.has(e.verse_number)){
  const clips=(e.names||[]).flatMap(n=>state.audioMap.get(n.studyNumber)||[]);
  if(clips.length)return {urls:clips.map(n=>"../audio/lalita/verses/MSS/phrase_"+String(n).padStart(4,"0")+".mp3"),label:"MSS"};
 }
 const used=voice==="MSS"?"VD":voice;
 return {urls:["../audio/lalita/verses/"+used+"/sloka-"+pad(e.verse_number)+".mp3"],label:voice==="MSS"?"VD · complete-verse fallback":used};
}
function nextClip(token){
 if(!state.playing||state.paused||token!==state.token)return;
 if(state.clipIndex>=state.clips.length){nextEntry(token);return}
 audio.pause();audio.src=state.clips[state.clipIndex++];audio.playbackRate=1;audio.load();
 const p=audio.play();if(p&&p.catch)p.catch(()=>{if(state.playing&&token===state.token&&!state.paused)stop("Audio unavailable. Reading remains available.")});
}
function playEntry(token){
 if(!state.playing||token!==state.token)return;
 const e=state.entries[state.index],src=sourceFor(e);
 if(!src.urls.length){stop("Recording unavailable for "+(e.kind==="dhyana"?"Dhyāna ":"śloka ")+e.verse_number);return}
 state.clips=src.urls;state.clipIndex=0;active();
 setStatus("Playing "+(e.kind==="dhyana"?"Dhyāna ":"śloka ")+e.verse_number+" · "+src.label);
 nextClip(token);
}
function nextEntry(token){
 if(token!==state.token||!state.playing)return;
 if(state.index+1>=state.entries.length){stop("Completed all four Dhyāna and 183 main ślokas");return}
 state.index++;playEntry(token);
}
function begin(which){const index=state.entries.findIndex(e=>key(e)===which);if(index<0)return;stop("");state.playing=true;state.index=index;state.paused=false;controls();playEntry(state.token)}
audio.addEventListener("ended",()=>{if(state.playing&&!state.paused)nextClip(state.token)});
audio.addEventListener("error",()=>{if(state.playing&&!state.paused)stop("Audio failed to load. You can continue chanting from the text.")});
$("#fc-play-all").onclick=()=>begin("d-1");
$("#fc-play-from").onclick=()=>begin($("#fc-jump").value);
$("#fc-pause").onclick=async()=>{
 if(!state.playing)return;
 if(state.paused){state.paused=false;controls();if(audio.src){try{await audio.play();setStatus("Resumed chanting")}catch{stop("Unable to resume")}}else nextClip(state.token)}
 else {state.paused=true;audio.pause();controls();setStatus("Paused")}
};
$("#fc-stop").onclick=()=>stop();
$("#fc-voice").onchange=()=>{if(state.playing){state.token++;state.paused=false;controls();playEntry(state.token)}};
$("#fc-jump").onchange=()=>{const value=$("#fc-jump").value;const i=state.entries.findIndex(e=>key(e)===value);if(i<0)return;if(state.playing)begin(value);else document.getElementById("fc-sloka-"+value)?.scrollIntoView({behavior:"smooth",block:"start"})};
$("#fc-script").onchange=render;$("#fc-show-iast").onchange=render;$("#fc-show-meaning").onchange=render;
$("#fc-print").onclick=()=>window.print();
list.addEventListener("click",e=>{const b=e.target.closest("[data-start]");if(b)begin(b.dataset.start)});
(async()=>{
 try{
 const ranges=["001-010","011-020","021-030","031-040","041-050","051-100","101-150","151-183"];
 const [dhyana,verses,meaningFiles,dhyanaStudy,phraseFile,audioFile]=await Promise.all([
 fetchJSON("dhyana.json"),
 (async()=>{const result=new Array(183);let i=0;await Promise.all(Array.from({length:12},async()=>{while(i<183){const n=i++;result[n]=await fetchJSON("verses/verse-"+pad(n+1)+".json")}}));return result})(),
 Promise.all(ranges.map(r=>fetchJSON("expanded-verses-"+r+".json"))),
 Promise.all(["study-dhyana-01-02.json","study-dhyana-03-04.json"].map(fetchJSON)),
 fetchJSON("dhyana-mss-phrases.json"),fetchJSON("name-audio-map.json")
 ]);
 if(dhyana.length!==4||dhyana.some((v,i)=>v.verse_number!==i+1)||verses.length!==183||verses.some((v,i)=>v.verse_number!==i+1||!v.reading?.devanagari?.length||!v.reading?.iast?.length))throw Error("Incomplete chanting text");
 const mm=new Map(meaningFiles.flatMap(f=>f.verses||[]).map(v=>["s-"+v.verse_number,v.meaning]));
 for(const m of dhyanaStudy.flat())mm.set("d-"+m.verse_number,m.essential_meaning);
 if(mm.size!==187||[...mm.values()].some(x=>!x.en||!x.kn))throw Error("Meanings incomplete");
 const dm=new Map([1,2,3,4].map(n=>[n,[]]));
 for(const phrase of phraseFile.phrases||[])dm.get(phrase.verse)?.push(...(phrase.clips||[phrase.clip]));
 if([...dm.values()].some(clips=>!clips.length))throw Error("Dhyāna audio incomplete");
 const am=new Map(audioFile.names.map(n=>[n.number,n.clips]));
 if(am.size!==1000)throw Error("Name audio mapping incomplete");
 state.entries=[...dhyana.map(v=>({...v,kind:"dhyana"})),...verses.map(v=>({...v,kind:"sloka"}))];
 state.meanings=mm;state.audioMap=am;state.dhyanaClips=dm;
 // Clip 176 is absent from the name map; shared assignments across 36/37
 // overlap. Use complete VD ślokas for these uncertain MSS boundaries.
 state.fallback=new Set([36,37,40]);
 const select=$("#fc-jump");select.replaceChildren();
 for(const e of state.entries){const option=el("option","",(e.kind==="dhyana"?"Dhyāna ":"Śloka ")+e.verse_number);option.value=key(e);select.append(option)}
 const params=new URL(location.href).searchParams;
 const n=Number(params.get("sloka"));if(params.has("sloka")&&Number.isInteger(n)&&n>=1&&n<=183)select.value="s-"+n;
 $("#fc-play-all").disabled=false;$("#fc-play-from").disabled=false;
 $("#fc-count").textContent="4 Dhyāna + 183 main ślokas";
 setStatus("Ready · original recording speed · play all or start anywhere.");
 render();
 if(params.has("sloka")&&n>=1&&n<=183)requestAnimationFrame(()=>document.getElementById("fc-sloka-s-"+n)?.scrollIntoView({block:"start"}));
 }catch(e){setStatus("Unable to load complete chanting data: "+e.message);$("#fc-count").textContent="Content could not be loaded"}
})();
})();