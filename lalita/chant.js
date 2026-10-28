(function(){"use strict";
const $=s=>document.querySelector(s),root=$("#fc-page"),list=$("#fc-list"),audio=$("#fc-audio");
const state={verses:[],meanings:new Map(),playing:false,paused:false,current:1,token:0,auto:false};
const setStatus=s=>{$("#fc-status").textContent=s};
const pad=n=>String(n).padStart(3,"0");
const fetchJSON=async p=>{const r=await fetch("../data/lalita/"+p,{cache:"no-store"});if(!r.ok)throw Error("Could not load "+p);return r.json()};
const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e};
function render(){
 list.replaceChildren();
 const script=$("#fc-script").value,showIast=$("#fc-show-iast").checked,showMeaning=$("#fc-show-meaning").checked;
 root.classList.toggle("fc-hide-iast",!showIast);root.classList.toggle("fc-hide-meaning",!showMeaning);
 const fragment=document.createDocumentFragment();
 for(const v of state.verses){
  const n=v.verse_number,article=el("article","fc-verse");article.id="fc-sloka-"+n;
  if(state.playing&&state.current===n)article.classList.add("fc-playing");
  const left=el("div","fc-reading"),head=el("div","fc-verse-head");
  head.append(el("span","fc-number","Śloka "+n));
  const start=el("button","fc-from-here","▶ Start here");start.type="button";start.dataset.start=String(n);
  start.setAttribute("aria-label","Start chanting from śloka "+n);head.append(start);left.append(head);
  const body=el("p","fc-script",(v.reading?.[script==="kn"?"kannada":"devanagari"]||v.sanskrit||[]).join("\n"));
  body.lang=script==="kn"?"kn":"sa";left.append(body);
  const iast=el("p","fc-iast",(v.reading?.iast||v.iast||[]).join("\n"));left.append(iast);
  const right=el("div","fc-meaning");
  right.append(el("span","fc-meaning-title",script==="kn"?"ಸರಳ ಅರ್ಥ":"Simple meaning"));
  const source=state.meanings.get(n)||{};
  right.append(el("p","",source[script==="kn"?"kn":"en"]||"Meaning not available"));
  article.append(left,right);fragment.append(article);
 }
 list.append(fragment);
}
function jump(n,scroll=true){
 const target=document.getElementById("fc-sloka-"+n);
 if(target&&scroll)target.scrollIntoView({behavior:"smooth",block:"start"});
}
function updateActive(scroll=true){
 document.querySelectorAll(".fc-playing").forEach(e=>e.classList.remove("fc-playing"));
 const card=document.getElementById("fc-sloka-"+state.current);
 if(card&&state.playing){card.classList.add("fc-playing");if(scroll)card.scrollIntoView({block:"start",behavior:"smooth"})}
 $("#fc-jump").value=String(state.current);
}
function controls(){
 $("#fc-pause").disabled=!state.playing;$("#fc-stop").disabled=!state.playing;
 $("#fc-pause").textContent=state.paused?"Resume":"Pause";
}
function stop(message="Stopped"){
 state.token++;state.playing=false;state.paused=false;state.auto=false;
 audio.pause();audio.removeAttribute("src");audio.load();controls();
 document.querySelectorAll(".fc-playing").forEach(e=>e.classList.remove("fc-playing"));
 setStatus(message);
}
async function playCurrent(token){
 if(token!==state.token||!state.playing)return;
 const n=state.current,voice=$("#fc-voice").value;
 audio.pause();audio.src="../audio/lalita/verses/"+voice+"/sloka-"+pad(n)+".mp3";
 audio.playbackRate=Number($("#fc-speed").value);audio.load();
 updateActive(true);setStatus("Playing śloka "+n+" of 183 · "+voice);
 try{await audio.play()}catch(e){if(token===state.token&&state.playing&&!state.paused)stop("Audio unavailable for śloka "+n+". You can continue reading without audio.")}
}
function begin(n,auto=true){
 if(!state.verses.length)return;
 stop("");state.token++;state.playing=true;state.current=n;state.auto=auto;state.paused=false;
 controls();playCurrent(state.token);
}
audio.addEventListener("ended",()=>{
 if(!state.playing||state.paused)return;
 if(state.auto&&state.current<183){state.current++;playCurrent(state.token)}
 else stop(state.current===183?"Completed all 183 ślokas":"Finished śloka "+state.current);
});
audio.addEventListener("error",()=>{if(state.playing&&!state.paused)stop("Audio could not be loaded for śloka "+state.current+". Chanting text remains available.")});
$("#fc-play-all").onclick=()=>begin(1,true);
$("#fc-play-from").onclick=()=>begin(Number($("#fc-jump").value),true);
$("#fc-pause").onclick=async()=>{
 if(!state.playing)return;
 if(state.paused){state.paused=false;try{await audio.play();setStatus("Resumed śloka "+state.current)}catch(e){stop("Unable to resume audio")}}
 else {state.paused=true;audio.pause();setStatus("Paused at śloka "+state.current)}
 controls();
};
$("#fc-stop").onclick=()=>stop();
$("#fc-speed").onchange=()=>{audio.playbackRate=Number($("#fc-speed").value)};
$("#fc-voice").onchange=()=>{if(state.playing){state.token++;state.paused=false;controls();playCurrent(state.token)}};
$("#fc-jump").onchange=()=>{const n=Number($("#fc-jump").value);jump(n);if(state.playing){state.current=n;state.token++;state.paused=false;controls();playCurrent(state.token)}};
$("#fc-script").onchange=render;
$("#fc-show-iast").onchange=render;$("#fc-show-meaning").onchange=render;
$("#fc-print").onclick=()=>window.print();
list.addEventListener("click",e=>{const start=e.target.closest("[data-start]");if(start)begin(Number(start.dataset.start),true)});
(async()=>{
 try{
  const groups=["001-010","011-020","021-030","031-040","041-050","051-100","101-150","151-183"];
  const [verses,meaningFiles]=await Promise.all([
   (async()=>{const result=new Array(183);let i=0;await Promise.all(Array.from({length:12},async()=>{while(i<183){const n=i++;result[n]=await fetchJSON("verses/verse-"+pad(n+1)+".json")}}));return result})(),
   Promise.all(groups.map(g=>fetchJSON("expanded-verses-"+g+".json")))
  ]);
  if(verses.length!==183||verses.some((v,i)=>v.verse_number!==i+1||!Array.isArray(v.reading?.devanagari)||!Array.isArray(v.reading?.iast)))throw Error("Verse list is incomplete");
  const meanings=new Map(meaningFiles.flatMap(f=>f.verses||[]).map(v=>[v.verse_number,v.meaning]));
  if(meanings.size!==183||Array.from(meanings.values()).some(m=>!m?.en||!m?.kn))throw Error("Some meanings are missing");
  state.verses=verses;state.meanings=meanings;
  const jumpSelect=$("#fc-jump");jumpSelect.replaceChildren();
  for(let n=1;n<=183;n++){const opt=el("option","",String(n));opt.value=n;jumpSelect.append(opt)}
  const wanted=Number(new URL(location.href).searchParams.get("sloka"));
  if(Number.isInteger(wanted)&&wanted>=1&&wanted<=183)jumpSelect.value=String(wanted);
  $("#fc-play-all").disabled=false;$("#fc-play-from").disabled=false;
  $("#fc-count").textContent="183 ślokas · all meanings available";
  setStatus("Ready. Start playback, select a śloka, or read from top to bottom.");
  render();if(wanted>=1&&wanted<=183)requestAnimationFrame(()=>jump(wanted));
 }catch(e){setStatus("Unable to load complete chanting data: "+e.message);$("#fc-count").textContent="Content could not be loaded"}
})();
})();