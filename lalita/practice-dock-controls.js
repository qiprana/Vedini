/* Shared playback transport used by Study and Full Chanting.
   The two readers provide their own audio engine, but use the very same
   collapse, transport and state-sync behavior. */
(function(global){
 "use strict";
 function bind(options){
  const root=typeof options.root==="string"?document.getElementById(options.root):options.root;
  const workspace=typeof options.workspace==="string"?document.getElementById(options.workspace):options.workspace;
  if(!root||!workspace)throw new Error("Vedini practice dock: missing root or workspace");
  const find=id=>root.querySelector("#"+id);
  const toggle=find("practice-dock-toggle");
  const play=find("dock-play"),pause=find("dock-pause"),next=find("dock-next"),stop=find("dock-stop");
  const status=find("dock-status");
  if(!toggle||!play||!pause||!next||!stop||!status)throw new Error("Vedini practice dock: incomplete controls");
  function expand(open){
   root.classList.toggle("is-collapsed",!open);
   workspace.classList.toggle("dock-collapsed",!open);
   toggle.setAttribute("aria-expanded",String(open));
   toggle.querySelector(".dock-toggle-label").textContent=open?"Collapse":"Expand";
   toggle.querySelector(".dock-arrow").textContent=open?"◂":"▸";
  }
  toggle.addEventListener("click",()=>expand(root.classList.contains("is-collapsed")));
  play.addEventListener("click",()=>options.onPlay?.());
  pause.addEventListener("click",()=>options.onPause?.());
  next.addEventListener("click",()=>options.onNext?.());
  stop.addEventListener("click",()=>options.onStop?.());
  function sync(snapshot={}){
   const playing=Boolean(snapshot.playing),paused=Boolean(snapshot.paused);
   play.disabled=playing;
   pause.disabled=!playing;
   next.disabled=!playing;
   stop.disabled=!playing;
   const caption=pause.querySelector(".dock-button-label");
   const glyph=pause.querySelector(".dock-button-icon");
   if(caption)caption.textContent=paused?"Resume":"Pause";
   if(glyph)glyph.textContent=paused?"▶":"⏸";
   if(snapshot.status!==undefined)status.textContent=snapshot.status;
   root.classList.toggle("dock-active",playing);
  }
  sync({playing:false,paused:false,status:options.initialStatus||"Ready"});
  return {sync,expand,isCollapsed:()=>root.classList.contains("is-collapsed")};
 }
 global.VediniPracticeDock=Object.freeze({bind});
})(window);
