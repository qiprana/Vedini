/* Soft, continuous synthesized Sa-Pa-Sa shruti for the Viduraniti player.
   Instrumental oscillator drone; no copyrighted recording or audio file. */
(function(){
'use strict';
let context=null,master=null,oscillators=[],live=false;
const enabled=document.getElementById('vidura-shruti-enabled');
const volume=document.getElementById('vidura-shruti-volume');
const tonic=document.getElementById('vidura-shruti-tonic');
function gain(){return Math.max(0,Math.min(.18,Number(volume.value)/100*.16));}
function create(){
 if(context)return;
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context)throw Error('Browser does not support Web Audio.');
 context=new Context();
 master=context.createGain();master.gain.value=0;master.connect(context.destination);
 const base=Number(tonic.value);
 for(const [factor,weight,shape] of [[1,.48,'sine'],[1.5,.25,'sine'],[2,.18,'sine'],[.5,.09,'triangle']]){
   const osc=context.createOscillator(),g=context.createGain();
   osc.type=shape;osc.frequency.value=base*factor;g.gain.value=weight;
   osc.connect(g);g.connect(master);osc.start();oscillators.push({osc,factor});
 }
}
async function start(){
 if(!enabled.checked)return;
 try{
  create();await context.resume();
  const now=context.currentTime;master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(gain(),now,.25);
  live=true;
 }catch(e){console.warn('Śruti unavailable:',e);}
}
function stop(){
 if(!context)return;
 const now=context.currentTime;
 master.gain.cancelScheduledValues(now);
 master.gain.setTargetAtTime(0,now,.08);
 live=false;
}
function tune(){if(!context)return;const base=Number(tonic.value);for(const o of oscillators)o.osc.frequency.setTargetAtTime(base*o.factor,context.currentTime,.2);}
function setVolume(){if(!context||!live)return;master.gain.setTargetAtTime(gain(),context.currentTime,.08);}
enabled.addEventListener('change',()=>{if(!enabled.checked)stop();else if(window.ViduraChantActive?.())start();});
tonic.addEventListener('change',tune);
volume.addEventListener('input',setVolume);
window.ViduraShruti={start,stop};
})();
