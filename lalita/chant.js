(function(){"use strict";
const $=s=>document.querySelector(s),root=$("#fc-page"),list=$("#fc-list");
const state={entries:[],meanings:new Map(),playing:false,paused:false,index:0,token:0,audioMap:new Map(),dhyanaClips:new Map(),fallback:new Set(),context:null,dock:null,ticker:null,loader:null,scheduleIndex:0,nextTime:0,segments:[],buffers:new Map(),pumping:false};
const setStatus=s=>{state.dock?.sync({playing:state.playing,paused:state.paused,status:s})},pad=n=>String(n).padStart(3,"0");
const fetchJSON=async p=>{const r=await fetch("../data/lalita/"+p,{cache:"no-store"});if(!r.ok)throw Error("Could not load "+p);return r.json()};
const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e};
const key=e=>e.kind==="dhyana"?"d-"+e.verse_number:"s-"+e.verse_number;
function render(){
 list.replaceChildren();root.classList.toggle("fc-hide-iast",!$("#fc-show-iast").checked);root.classList.toggle("fc-hide-meaning",!$("#fc-show-meaning").checked);
 const script=window.VediniLanguage.get(),fragment=document.createDocumentFragment();
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
 renderRangeTabs();
}
function renderRangeTabs(){
 const groups=$("#fc-range-tabs"),quick=$("#fc-verse-quick-index");
 if(!groups||!quick||!state.entries.length)return;
 const current=state.entries[state.index]||state.entries[0];
 const group=current.kind==="dhyana"?"d":String(Math.floor((current.verse_number-1)/10));
 const total=Math.ceil(183/10);
 groups.replaceChildren();
 function button(parent,text,id,cls,handler){
  const b=document.createElement("button");b.type="button";b.textContent=text;b.dataset.group=id;
  if(cls)b.classList.add("current");b.onclick=handler;parent.append(b);
 }
 function choose(which){
  const index=state.entries.findIndex(e=>key(e)===which);
  if(index<0)return;
  if(state.playing)begin(which);
  else{state.index=index;document.getElementById("fc-sloka-"+which)?.scrollIntoView({behavior:"smooth",block:"start"});$("#fc-jump").value=which;renderRangeTabs()}
 }
 button(groups,"Dhyāna 1–4","d",group==="d",()=>choose("d-1"));
 for(let i=0;i<total;i++){
  const first=i*10+1,last=Math.min(183,first+9);
  button(groups,first+"–"+last,String(i),group===String(i),()=>choose("s-"+first));
 }
 quick.replaceChildren();
 const first=group==="d"?1:Number(group)*10+1;
 const last=group==="d"?4:Math.min(183,first+9);
 for(let i=first;i<=last;i++){
  const which=(group==="d"?"d-":"s-")+i;
  button(quick,String(i),which,key(current)===which,()=>choose(which));
 }
}

const song=e=>e.kind==="dhyana"?"Dhyāna "+e.verse_number:"Śloka "+e.verse_number;
function sourceFor(e){
 const voice=$("#fc-voice").value;
 const prefix="../audio/lalita/verses/";
 if(e.kind==="dhyana")return {urls:(state.dhyanaClips.get(e.verse_number)||[]).map(n=>prefix+"MSS/phrase_"+String(n).padStart(4,"0")+".mp3"),label:"MSS · Dhyāna"};
 if(voice==="MSS"&&!state.fallback.has(e.verse_number)){
  const clips=(e.names||[]).flatMap(n=>state.audioMap.get(n.studyNumber)||[]);
  if(clips.length)return {urls:clips.map(n=>prefix+"MSS/phrase_"+String(n).padStart(4,"0")+".mp3"),label:"MSS"};
 }
 const selected=voice==="MSS"?"VD":voice;
 return {urls:[prefix+selected+"/sloka-"+pad(e.verse_number)+".mp3"],label:voice==="MSS"?"VD · complete-verse fallback":selected};
}
function sourceList(){
 return state.entries.map(e=>{const src=sourceFor(e);return {entry:e,urls:src.urls,label:src.label}});
}
async function getBuffer(url,ctx){
 if(!state.buffers.has(url)){
  const job=fetch(url).then(r=>{if(!r.ok)throw Error("Cannot load "+url);return r.arrayBuffer()}).then(data=>ctx.decodeAudioData(data));
  state.buffers.set(url,job);job.catch(()=>{if(state.buffers.get(url)===job)state.buffers.delete(url)});
 }
 return state.buffers.get(url);
}
async function prefetch(start,count=3){
 const token=state.token,ctx=state.context;
 if(!ctx||!state.playing||token!==state.token)return;
 const urls=state.loader.slice(start,Math.min(start+count,state.loader.length)).flatMap(x=>x.urls);
 try{await Promise.all(urls.map(url=>getBuffer(url,ctx)))}catch(e){if(token===state.token)stop("Recording unavailable. Please check the audio files.")}
}
function active(index,scroll=true){
 const e=state.entries[index];if(!e)return;
 document.querySelectorAll(".fc-playing").forEach(x=>x.classList.remove("fc-playing"));
 const card=document.getElementById("fc-sloka-"+key(e));
 if(card){card.classList.add("fc-playing");if(scroll)card.scrollIntoView({block:"start",behavior:"smooth"})}
 $("#fc-jump").value=key(e);
 renderRangeTabs();
}
function updatePlayhead(){
 if(!state.playing||state.paused||!state.context)return;
 const t=state.context.currentTime;
 let index=state.index;
 for(const segment of state.segments){if(segment.start<=t+.03&&segment.end>t-.03)index=segment.index}
 if(index!==state.index){state.index=index;active(index);setStatus("Playing "+song(state.entries[index])+" · "+state.loader[index].label)}
 if(state.scheduleIndex>=state.loader.length&&state.nextTime<=t+.02)stop("Completed all four Dhyāna and 183 main ślokas");
}
async function pump(token){
 if(state.pumping||!state.playing||token!==state.token||state.paused||!state.context)return;
 state.pumping=true;
 try{
 const ctx=state.context;
 while(state.scheduleIndex<state.loader.length&&state.nextTime<ctx.currentTime+18){
  const index=state.scheduleIndex,group=state.loader[index];
  if(!group.urls.length){stop("Missing recording for "+song(group.entry));return}
  // The next three entries are fetched before playback reaches their boundaries.
  await prefetch(index,3);
  if(token!==state.token||!state.playing||state.paused)return;
  let buffers;
  try{buffers=await Promise.all(group.urls.map(url=>getBuffer(url,ctx)))}catch(e){if(token===state.token)stop("Audio unavailable for "+song(group.entry));return}
  if(token!==state.token||!state.playing||state.paused)return;
  let time=Math.max(state.nextTime,ctx.currentTime+.06);
  const first=time;
  for(let j=0;j<buffers.length;j++){
   const buffer=buffers[j],overlap=state.segments.length?Math.min(.055,buffer.duration/6):0;
   time-=overlap;
   const node=ctx.createBufferSource(),gain=ctx.createGain();
   node.buffer=buffer;node.connect(gain);gain.connect(ctx.destination);
   gain.gain.setValueAtTime(overlap?0:1,time);
   if(overlap)gain.gain.linearRampToValueAtTime(1,time+overlap);
   const fade=Math.min(.055,buffer.duration/6);
   gain.gain.setValueAtTime(1,Math.max(time+overlap,time+buffer.duration-fade));
   gain.gain.linearRampToValueAtTime(0,time+buffer.duration);
   node.start(time);
   state.segments.push({node,gain,start:time,end:time+buffer.duration,index});
   time+=buffer.duration;
  }
  state.nextTime=time;state.scheduleIndex++;
  if(state.segments.length>350)state.segments=state.segments.filter(s=>s.end>ctx.currentTime-1);
 }
 }finally{state.pumping=false}
}
function stop(message="Stopped"){
 state.token++;state.playing=false;state.paused=false;
 if(state.ticker){clearInterval(state.ticker);state.ticker=null}
 for(const s of state.segments){try{s.node.onended=null;s.node.stop()}catch(e){}try{s.node.disconnect();s.gain.disconnect()}catch(e){}}
 state.segments=[];state.loader=null;state.scheduleIndex=0;
 if(state.context){state.context.close().catch(()=>{});state.context=null}
 document.querySelectorAll(".fc-playing").forEach(el=>el.classList.remove("fc-playing"));
 setStatus(message);
}
async function begin(which){
 const index=state.entries.findIndex(e=>key(e)===which);if(index<0)return;
 stop("");
 state.token++;const token=state.token;
 state.playing=true;state.paused=false;state.index=index;state.scheduleIndex=index;state.loader=sourceList();
 state.buffers.clear();
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();state.context=ctx;
  await ctx.resume();state.nextTime=ctx.currentTime+.15;
  // Decoding the first two verses before scheduling avoids startup gaps.
  await prefetch(index,2);
  if(token!==state.token||!state.playing)return;
  active(index);setStatus("Playing "+song(state.entries[index])+" · "+state.loader[index].label);
  await pump(token);
  if(token!==state.token||!state.playing)return;
  state.ticker=setInterval(()=>{if(token!==state.token)return;updatePlayhead();if(!state.paused)pump(token).catch(()=>stop("Unable to continue audio"))},150);
 }catch(e){if(token===state.token)stop("Unable to begin audio: "+e.message)}
}
async function pause(){
 if(!state.playing||!state.context)return;
 if(state.paused){
  try{await state.context.resume();state.paused=false;setStatus("Resumed "+song(state.entries[state.index]));pump(state.token)}
  catch(e){stop("Unable to resume chanting")}
 }else{
  await state.context.suspend();state.paused=true;
  setStatus("Paused at "+song(state.entries[state.index]));
 }
}
function next(){
 if(!state.playing)return;
 if(state.index+1>=state.entries.length){stop("Completed chanting");return}
 begin(key(state.entries[state.index+1]));
}
function initDock(){
 state.dock=window.VediniPracticeDock.bind({root:"practice-dock",workspace:"study-workspace",initialStatus:"Loading chanting data…",
  onPlay:()=>begin($("#fc-jump").value),
  onPause:pause,onNext:next,onStop:()=>stop()});
}
initDock();
$("#fc-voice").onchange=()=>{if(state.playing)begin(key(state.entries[state.index]))};
$("#fc-jump").onchange=()=>{const value=$("#fc-jump").value;if(state.playing)begin(value);else document.getElementById("fc-sloka-"+value)?.scrollIntoView({behavior:"smooth",block:"start"})};
window.VediniLanguage.bind(()=>render());
$("#fc-show-iast").onchange=render;
$("#fc-show-meaning").onchange=render;
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
 state.dock.sync({playing:false,paused:false,status:"Ready · press Play to chant continuously"});
 $("#fc-count").textContent="4 Dhyāna + 183 main ślokas";
 setStatus("Ready · MSS clips are preloaded and crossfaded");
 render();
 if(params.has("sloka")&&n>=1&&n<=183)requestAnimationFrame(()=>document.getElementById("fc-sloka-s-"+n)?.scrollIntoView({block:"start"}));
 }catch(e){setStatus("Unable to load complete chanting data: "+e.message);$("#fc-count").textContent="Content could not be loaded"}
})();
})();