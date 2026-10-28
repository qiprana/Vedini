/* Sticky Lalita reading-mode tabs and verse index share the same measured offset.
   The index must never cover the reading-mode tabs on desktop or mobile. */
(function(){
 "use strict";
 function init(){
  const container=document.querySelector(".reader-page .study-main-content");
  if(!container)return;
  const toolbar=container.querySelector(".lalita-reader-toolbar");
  const index=container.querySelector(".sticky-verse-navigation");
  if(!toolbar)return;
  function measure(){
   const toolbarHeight=Math.ceil(toolbar.getBoundingClientRect().height);
   const indexHeight=index&&!index.hidden?Math.ceil(index.getBoundingClientRect().height):0;
   container.style.setProperty("--lalita-toolbar-height",toolbarHeight+"px");
   container.style.setProperty("--lalita-reading-offset",(toolbarHeight+indexHeight+16)+"px");
  }
  if(window.ResizeObserver){
   const observer=new ResizeObserver(measure);
   observer.observe(toolbar);
   if(index)observer.observe(index);
  }
  window.addEventListener("resize",measure,{passive:true});
  requestAnimationFrame(measure);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
