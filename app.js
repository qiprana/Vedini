(function application(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const langText=(en,kn)=>language==="kn"?kn:en;
let verses=[],dhyana=[],nameData={},dhyanaData={},verseData={},dhyanaPhraseData={},language="en",searchTerm="",highlightTerm="";
const pageSize=10,plannedVerses=183;
let view="verses",pageIndex=0,selectedVerse=1;
let activeAudioElement=null;
function claimAudioFocus(audio){
 if(!audio)return;
 document.querySelectorAll("audio").forEach(other=>{
  if(other!==audio&&!other.paused)other.pause();
 });
 if(activeAudioElement&&activeAudioElement!==audio&&!activeAudioElement.paused){
  activeAudioElement.pause();
 }
 activeAudioElement=audio;
}
function installAudioFocus(audio){
 if(!audio||audio.dataset.audioFocusInstalled==="1")return;
 audio.dataset.audioFocusInstalled="1";
 audio.addEventListener("play",()=>claimAudioFocus(audio));
}

function kannadaFromDevanagari(s){
 return Array.from(String(s??"")).map(c=>{
 if(c==="ॐ")return "ಓಂ";
 const n=c.codePointAt(0);
 if(n===0x0964||n===0x0965)return c;
 if((n>=0x0900&&n<=0x0963)||(n>=0x0966&&n<=0x096f))return String.fromCodePoint(n+0x380);
 return c;
 }).join("");
}
async function fetchJSON(p){const r=await fetch("../data/"+p);if(!r.ok)throw new Error("Missing "+p);return r.json()}
function msg(id,en,kn){const e=$(id);if(e)e.textContent=langText(en,kn)}
function anyMeaning(b,field){return b?.[field]?.[language]||""}
function findComponents(v,n,info){
 if(info?.components?.length)return info.components;
 if((n.components||[]).length>1)return n.components;
 let x=(v.word_meanings||[]).find(w=>norm(w.iast)===norm(n.iast));
 return (x?.components||[]).length>1?(x.components).map(c=>({dev:c.sanskrit||"",iast:c.iast||"",en:c.english||"",kn:c.kannada||""})):[];
}
function iastToDevanagari(value){
 const consonants={"kh":"ख","gh":"घ","ch":"छ","jh":"झ","ṭh":"ठ","ḍh":"ढ","th":"थ","dh":"ध","ph":"फ","bh":"भ","k":"क","g":"ग","ṅ":"ङ","c":"च","j":"ज","ñ":"ञ","ṭ":"ट","ḍ":"ड","ṇ":"ण","t":"त","d":"द","n":"न","p":"प","b":"ब","m":"म","y":"य","r":"र","l":"ल","v":"व","ś":"श","ṣ":"ष","s":"स","h":"ह"};
 const independent={"a":"अ","ā":"आ","i":"इ","ī":"ई","u":"उ","ū":"ऊ","ṛ":"ऋ","e":"ए","ai":"ऐ","o":"ओ","au":"औ"};
 const marks={"a":"","ā":"ा","i":"ि","ī":"ी","u":"ु","ū":"ू","ṛ":"ृ","e":"े","ai":"ै","o":"ो","au":"ौ"};
 const ck=Object.keys(consonants).sort((a,b)=>b.length-a.length),vk=Object.keys(marks).sort((a,b)=>b.length-a.length);
 let out="",i=0;
 while(i<value.length){let tail=value.slice(i),c=ck.find(k=>tail.startsWith(k));if(c){out+=consonants[c];i+=c.length;let v=vk.find(k=>value.slice(i).startsWith(k));if(v){out+=marks[v];i+=v.length;}else out+="्";continue;}
 let v=vk.find(k=>tail.startsWith(k));if(v){out+=independent[v];i+=v.length;continue;}out+=({"ṃ":"ं","ṁ":"ं","ḥ":"ः","-":"-"," ":" "})[value[i]]??value[i];i++;
 }return out;
}
function highlighted(value){
 const source=String(value??""),q=norm(highlightTerm.trim());
 if(!q)return esc(source);
 const chars=Array.from(source),normalized=[],start=[],end=[];
 let offset=0;
 for(const ch of chars){const folded=norm(ch);for(const c of Array.from(folded)){normalized.push(c);start.push(offset);end.push(offset+ch.length)}offset+=ch.length;}
 const at=normalized.join("").indexOf(q);
 if(at<0)return esc(source);
 return esc(source.slice(0,start[at]))+"<mark class='search-hit'>"+esc(source.slice(start[at],end[at+q.length-1]))+"</mark>"+esc(source.slice(end[at+q.length-1]));
}
function wordsGrid(parts){
 if(!parts?.length)return "<p class='small-note'>"+esc(langText("This word is awaiting editorial analysis.","ಈ ಪದದ ಅರ್ಥಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ."))+"</p>";
 return "<div class='word-grid glossary' role='list'>"+parts.map(c=>{
  const written=language==="kn"?kannadaFromDevanagari(c.dev):c.dev;
  return "<div class='word-row glossary-row' role='listitem'><div class='word-original'><strong class='word-dev'>"+esc(written)+"</strong><span class='word-iast'>"+esc(c.iast)+"</span></div><div class='word-translation'>"+esc(c[language]||"")+"</div></div>";
 }).join("")+"</div>";
}
function richParagraphs(value){
 return String(value??"").split("\n\n").map(p=>p.trim()).filter(Boolean).map(p=>"<p>"+esc(p).replace(/\*([^*]+)\*/g,"<em>$1</em>").replace(/\n/g," ")+"</p>").join("");
}
function studySections(info,parts){
 const deep=anyMeaning(info,"traditional_interpretation");
 return "<div class='study-inner'><h4>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h4>"+wordsGrid(parts)+(deep?"<div class='deeper-reading'><h4>"+esc(langText("Deeper meaning","ಆಳವಾದ ಅರ್ಥ"))+"</h4>"+richParagraphs(deep)+"</div>":"")+"</div>";
}
function makeAudio(v,isDhyana){
 if(isDhyana){
  const rows=dhyanaPhraseData[v.verse_number]||[];
  const clips=[];
  rows.forEach(row=>{
   const list=Array.isArray(row.clips)?row.clips:[row.clip];
   list.filter(Boolean).forEach(n=>clips.push(n));
  });
  const paths=clips.map(n=>"../audio/lalita/verses/MSS/phrase_"+String(n).padStart(4,"0")+".mp3");
  return "<button type='button' class='dhyana-play-all' data-dhyana-play-all='"+esc(paths.join("|"))+"' aria-label='"+esc(langText("Play all MSS audio for this Dhyāna śloka","ಈ ಧ್ಯಾನ ಶ್ಲೋಕದ ಎಲ್ಲಾ MSS ಧ್ವನಿಯನ್ನು ಪ್ಲೇ ಮಾಡಿ"))+"'>▶ "+esc(langText("Play all MSS","ಎಲ್ಲಾ MSS ಪ್ಲೇ ಮಾಡಿ"))+"</button>";
 }
 const num=String(v.verse_number).padStart(3,"0");
 const url="../audio/lalita/verses/VD/sloka-"+num+".mp3";
 return "<span class='audio' data-audio-path='"+esc(url)+"'>"+esc(langText("♪ Audio coming soon","♪ ಧ್ವನಿಮುದ್ರಣ ಶೀಘ್ರದಲ್ಲಿ"))+"</span>";
}
const MSS_LAST_CLIP=739;
function mssClipPath(clip){
 return "../audio/lalita/verses/MSS/phrase_"+String(clip).padStart(4,"0")+".mp3";
}
function nameAudioClips(nameNumber){
 const n=Number(nameNumber);
 if(n===12)return [44,45];
 if(n===13)return [46,47];
 if(n===14)return [48,49];
 if(n===15)return [50];
 if(n===16)return [51,52];
 if(n===17)return [53,54];
 if(n===20)return [57,58];
 if(n===21)return [59,60];
 if(n===22)return [61,62];
 if(n===23)return [63];
 if(n===24)return [64,65];
 if(n===25)return [66,67];
 if(n===26)return [68,69];
 if(n===27)return [70];
 if(n===28)return [71];
 if(n===29)return [72];
 if(n===30)return [73];
 if(n===31)return [74,75];
 if(n===33)return [77,78];
 if(n===34)return [79];
 if(n===35)return [80,81];
 if(n===36)return [82,83];
 if(n===37)return [84,85];
 if(n===38)return [86,87];
 if(n===39)return [88,89];
 if(n===40)return [90,91];
 const clip=n<=11?n+32:n<=19?n+37:n<=21?n+39:n<=24?n+41:n<=32?n+44:n+51;
 return clip<=MSS_LAST_CLIP?[clip]:[];
}
function nameAudioPaths(nameNumber){
 return nameAudioClips(nameNumber).map(mssClipPath);
}
function verseMssAudioPaths(v){
 const seen=new Set();
 const clips=[];
 for(const n of v.names||[]){
  for(const clip of nameAudioClips(n.studyNumber)){
   if(!seen.has(clip)){
    seen.add(clip);
    clips.push(clip);
   }
  }
 }
 return clips.map(mssClipPath);
}
function nameSection(v){
 let html="<section class='name-section' aria-label='"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"'><div class='section-title'><h3>"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"</h3><span>"+(v.names||[]).length+" "+esc(langText("names","ನಾಮಗಳು"))+"</span></div><div class='name-study-list'>";
 for(const n of v.names||[]){
  const info=nameData[n.studyNumber]||{},parts=findComponents(v,n,info);
  const writtenSource=n.display_devanagari||n.sanskrit||"";
  const written=language==="kn"?kannadaFromDevanagari(writtenSource):writtenSource;
  const essential=anyMeaning(info,"essential_meaning")||(language==="kn"?n.kannada:n.english)||langText("Meaning under review","ಅರ್ಥ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ");
  const roman=n.display_iast||n.iast||"";
  const audioPaths=nameAudioPaths(n.studyNumber);
  const hasAudio=audioPaths.length>0;
  const audio=hasAudio
   ?"<button type='button' class='name-audio-button' data-name-audio='"+esc(audioPaths[0])+"' data-name-audios='"+esc(audioPaths.join("|"))+"' aria-label='"+esc(langText("Play MSS audio for name "+n.studyNumber,"ನಾಮ "+n.studyNumber+" MSS ಧ್ವನಿ ಪ್ಲೇ ಮಾಡಿ"))+"' title='"+esc(langText("Play MSS","MSS ಪ್ಲೇ ಮಾಡಿ"))+"'>♪</button>"
   :"<span class='name-audio-button unavailable' aria-hidden='true' title='"+esc(langText("MSS audio not uploaded yet","MSS ಧ್ವನಿ ಇನ್ನೂ ಅಪ್ಲೋಡ್ ಆಗಿಲ್ಲ"))+"'>♪</span>";
  html+="<div class='name-audio-card'>"+audio+"<details class='name-details compact-name-row' data-detail-id='name-"+n.studyNumber+"'><summary><span class='name-summary-grid'><span class='name-identity-inline'><span class='name-number'>"+n.studyNumber+".</span><span class='name-written'>"+highlighted(written)+"</span><span class='name-roman'>"+highlighted(roman)+"</span></span><span class='name-essence'>"+esc(essential)+"</span></span></summary>"+studySections(info,parts)+"</details></div>";
 }
 return html+"</div></section>";
}
const mergedAudioUrlCache=new Map();
function audioBufferToWavBlob(buffer){
 const channels=buffer.numberOfChannels;
 const sampleRate=buffer.sampleRate;
 const frames=buffer.length;
 const bytesPerSample=2;
 const blockAlign=channels*bytesPerSample;
 const out=new ArrayBuffer(44+frames*blockAlign);
 const view=new DataView(out);
 const write=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
 write(0,"RIFF"); view.setUint32(4,36+frames*blockAlign,true); write(8,"WAVE");
 write(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true);
 view.setUint16(22,channels,true); view.setUint32(24,sampleRate,true);
 view.setUint32(28,sampleRate*blockAlign,true); view.setUint16(32,blockAlign,true);
 view.setUint16(34,16,true); write(36,"data"); view.setUint32(40,frames*blockAlign,true);
 let offset=44;
 for(let i=0;i<frames;i++){
  for(let ch=0;ch<channels;ch++){
   let s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));
   view.setInt16(offset,s<0?s*0x8000:s*0x7fff,true);
   offset+=2;
  }
 }
 return new Blob([out],{type:"audio/wav"});
}
async function mergedAudioUrl(sources){
 if(sources.length===1)return sources[0];
 const key=sources.join("|");
 if(mergedAudioUrlCache.has(key))return mergedAudioUrlCache.get(key);
 const merged=await buildMergedAudioBuffer(sources);
 const url=URL.createObjectURL(audioBufferToWavBlob(merged.buffer));
 mergedAudioUrlCache.set(key,url);
 return url;
}
function initNameAudio(){
 document.querySelectorAll("[data-name-audio]").forEach(button=>{
  if(button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",async event=>{
   event.preventDefault();
   event.stopPropagation();

   if(button._audio&&!button._audio.paused){
    button._audio.pause();
    try{button._audio.currentTime=0;}catch(_){}
    button.classList.remove("playing");
    return;
   }

   document.querySelectorAll(".name-audio-button.playing").forEach(other=>{
    if(other!==button&&other._audio){
     other._audio.pause();
     try{other._audio.currentTime=0;}catch(_){}
     other.classList.remove("playing");
    }
   });
   document.querySelectorAll(".dhyana-phrase-play.playing").forEach(other=>stopDhyanaPhraseButton(other));
   document.querySelectorAll(".dhyana-play-all.playing").forEach(other=>{
    if(other._bufferSource){try{other._bufferSource.stop();}catch(_){}}
    other._bufferSource=null;
    other.classList.remove("playing");
   });

   let audio=button._audio;
   if(!audio){
    audio=document.createElement("audio");
    audio.preload="none";
    installAudioFocus(audio);
    button._audio=audio;
    audio.addEventListener("ended",()=>button.classList.remove("playing"));
    audio.addEventListener("error",()=>button.classList.remove("playing"));
   }
   try{
    const sources=(button.dataset.nameAudios||button.dataset.nameAudio||"").split("|").filter(Boolean);
    const playUrl=await mergedAudioUrl(sources);
    if(audio.src!==playUrl){audio.src=playUrl;audio.load();}
    try{audio.currentTime=0;}catch(_){}
    claimAudioFocus(audio);
    button.classList.add("playing");
    await audio.play();
   }catch(_){
    button.classList.remove("playing");
   }
  });
 });
}
function dhyanaPhraseComponents(v,row){
 const info=dhyanaData[v.verse_number]||{};
 const components=info.components||[];
 if(Array.isArray(row.component_indices)){
  return row.component_indices.map(i=>components[i]).filter(Boolean);
 }
 return [];
}
function dhyanaPhrasePanel(v){
 const rows=dhyanaPhraseData[v.verse_number]||[];
 if(!rows.length)return "";
 return "<section class='dhyana-phrase-section'><div class='section-title'><h3>"+esc(langText("Phrase-by-phrase","ಪದಗುಚ್ಛದ ಅರ್ಥ"))+"</h3><span>"+rows.length+" "+esc(langText("phrases","ಪದಗುಚ್ಛಗಳು"))+"</span></div><div class='dhyana-phrase-list'>"+rows.map((row,index)=>{
  const written=language==="kn"?kannadaFromDevanagari(row.dev):row.dev;
  const meaning=language==="kn"?row.kn:row.en;
  const clipList=Array.isArray(row.clips)?row.clips:[row.clip];
  const paths=clipList.map(n=>"../audio/lalita/verses/MSS/phrase_"+String(n).padStart(4,"0")+".mp3");
  const parts=dhyanaPhraseComponents(v,row);
  const detailId="dhyana-phrase-"+v.verse_number+"-"+(index+1);
  return "<div class='dhyana-phrase-card'><button type='button' class='dhyana-phrase-play' data-phrase-audio='"+esc(paths[0])+"' data-phrase-audios='"+esc(paths.join("|"))+"' aria-label='"+esc(langText("Play phrase","ಪದಗುಚ್ಛವನ್ನು ಪ್ಲೇ ಮಾಡಿ"))+"'>♪</button><details class='name-details compact-name-row dhyana-phrase-details' data-detail-id='"+detailId+"'><summary><span class='name-summary-grid'><span class='name-identity-inline'><span class='name-written'>"+highlighted(written)+"</span><span class='name-roman'>"+highlighted(row.iast)+"</span></span><span class='name-essence'>"+esc(meaning)+"</span></span></summary><div class='study-inner'><h4>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h4>"+wordsGrid(parts)+"</div></details></div>";
 }).join("")+"</div></section>";
}
let vediniAudioContext=null;
async function buildMergedAudioBuffer(sources){
 if(!vediniAudioContext)vediniAudioContext=new (window.AudioContext||window.webkitAudioContext)();
 const ctx=vediniAudioContext;
 if(ctx.state==="suspended")await ctx.resume();
 const responses=await Promise.all(sources.map(src=>fetch(src)));
 if(responses.some(r=>!r.ok))throw new Error("Could not load phrase audio");
 const arrays=await Promise.all(responses.map(r=>r.arrayBuffer()));
 const decoded=await Promise.all(arrays.map(buf=>ctx.decodeAudioData(buf.slice(0))));
 const rate=decoded[0].sampleRate;
 const channels=Math.max(...decoded.map(b=>b.numberOfChannels));
 const totalFrames=decoded.reduce((sum,b)=>sum+Math.round(b.duration*rate),0);
 const merged=ctx.createBuffer(channels,totalFrames,rate);
 let offset=0;
 for(const b of decoded){
  const frames=Math.round(b.duration*rate);
  for(let ch=0;ch<channels;ch++){
   const sourceData=b.getChannelData(Math.min(ch,b.numberOfChannels-1));
   const target=merged.getChannelData(ch);
   if(b.sampleRate===rate){
    target.set(sourceData,offset);
   }else{
    for(let i=0;i<frames;i++){
     const srcIndex=Math.min(sourceData.length-1,Math.floor(i*b.sampleRate/rate));
     target[offset+i]=sourceData[srcIndex];
    }
   }
  }
  offset+=frames;
 }
 return {ctx,buffer:merged};
}
function stopDhyanaPhraseButton(button){
 if(button._bufferSource){
  try{button._bufferSource.stop();}catch(_){}
  button._bufferSource=null;
 }
 if(button._audio&&!button._audio.paused){
  button._audio.pause();
  try{button._audio.currentTime=0;}catch(_){}
 }
 button.classList.remove("playing");
}
function stopAllDhyanaAudio(exceptButton){
 document.querySelectorAll(".dhyana-phrase-play.playing").forEach(button=>{
  if(button!==exceptButton)stopDhyanaPhraseButton(button);
 });
 document.querySelectorAll(".dhyana-play-all.playing").forEach(button=>{
  if(button!==exceptButton&&button._bufferSource){
   try{button._bufferSource.stop();}catch(_){}
   button._bufferSource=null;
   button.classList.remove("playing");
  }
 });
 document.querySelectorAll("audio").forEach(a=>{if(!a.paused)a.pause();});
}
function initDhyanaPlayAll(){
 document.querySelectorAll("[data-dhyana-play-all]").forEach(button=>{
  if(button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",async()=>{
   const sources=(button.dataset.dhyanaPlayAll||"").split("|").filter(Boolean);
   if(!sources.length)return;
   if(button.classList.contains("playing")){
    if(button._bufferSource){try{button._bufferSource.stop();}catch(_){}}
    button._bufferSource=null;
    button.classList.remove("playing");
    button.textContent="▶ "+langText("Play all MSS","ಎಲ್ಲಾ MSS ಪ್ಲೇ ಮಾಡಿ");
    return;
   }
   stopAllDhyanaAudio(button);
   button.disabled=true;
   try{
    if(!button._mergedBuffer)button._mergedBuffer=await buildMergedAudioBuffer(sources);
    const {ctx,buffer}=button._mergedBuffer;
    const source=ctx.createBufferSource();
    source.buffer=buffer;
    source.connect(ctx.destination);
    button._bufferSource=source;
    button.classList.add("playing");
    button.textContent="■ "+langText("Stop MSS","MSS ನಿಲ್ಲಿಸಿ");
    source.onended=()=>{
     if(button._bufferSource===source){
      button._bufferSource=null;
      button.classList.remove("playing");
      button.textContent="▶ "+langText("Play all MSS","ಎಲ್ಲಾ MSS ಪ್ಲೇ ಮಾಡಿ");
     }
    };
    source.start(0);
   }catch(err){
    button.classList.remove("playing");
    button.textContent="▶ "+langText("Play all MSS","ಎಲ್ಲಾ MSS ಪ್ಲೇ ಮಾಡಿ");
   }finally{
    button.disabled=false;
   }
  });
 });
}
function initDhyanaPhraseAudio(){
 document.querySelectorAll("[data-phrase-audio]").forEach(button=>{
  if(button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",async()=>{
   const sources=(button.dataset.phraseAudios||button.dataset.phraseAudio||"").split("|").filter(Boolean);
   if(!sources.length)return;

   if(button.classList.contains("playing")){
    stopDhyanaPhraseButton(button);
    return;
   }

   document.querySelectorAll(".dhyana-phrase-play.playing").forEach(other=>{
    if(other!==button)stopDhyanaPhraseButton(other);
   });
   document.querySelectorAll("audio").forEach(a=>{if(!a.paused)a.pause();});

   button.disabled=true;
   try{
    button.classList.add("playing");
    if(sources.length===1){
     let audio=button._audio;
     if(!audio){
      audio=document.createElement("audio");
      audio.preload="auto";
      button._audio=audio;
      installAudioFocus(audio);
      audio.addEventListener("ended",()=>button.classList.remove("playing"));
     }
     audio.src=sources[0];
     audio.load();
     await audio.play();
    }else{
     if(!button._mergedBuffer)button._mergedBuffer=await buildMergedAudioBuffer(sources);
     const {ctx,buffer}=button._mergedBuffer;
     const source=ctx.createBufferSource();
     source.buffer=buffer;
     source.connect(ctx.destination);
     button._bufferSource=source;
     source.onended=()=>{
      if(button._bufferSource===source){
       button._bufferSource=null;
       button.classList.remove("playing");
      }
     };
     source.start(0);
    }
   }catch(err){
    stopDhyanaPhraseButton(button);
   }finally{
    button.disabled=false;
   }
  });
 });
}
function dhyanaWordsPanel(v){
 const info=dhyanaData[v.verse_number]||{};
 const count=info.components?.length||0;
 return "<section class='name-section dhyana-study' aria-label='"+esc(langText("Study the words","ಪದಗಳ ಅಧ್ಯಯನ"))+"'><div class='name-study-list'><details class='name-details compact-name-row dhyana-word-card' data-detail-id='dhyana-"+v.verse_number+"'><summary><span class='name-summary-grid'><span class='name-identity-inline'><span class='name-written'>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</span></span><span class='name-essence'>"+count+" "+esc(langText("word parts","ಪದಭಾಗಗಳು"))+"</span></span></summary><div class='study-inner'><h4>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h4>"+wordsGrid(info.components)+"</div></details></div></section>";
}
function moreSection(info){
 const deep=anyMeaning(info,"traditional_interpretation");
 return deep?"<div class='deeper-reading'><h3>"+esc(langText("Deeper meaning","ಆಳವಾದ ಅರ್ಥ"))+"</h3>"+richParagraphs(deep)+"</div>":"";
}
function optionalVerseMeaning(meaning,isDhyana,number){
 if(!meaning)return "";
 const label=isDhyana?langText("Overall meditation meaning (optional)","ಧ್ಯಾನ ಶ್ಲೋಕದ ಒಟ್ಟು ಅರ್ಥ (ಐಚ್ಛಿಕ)"):langText("Overall śloka meaning (optional)","ಶ್ಲೋಕದ ಒಟ್ಟು ಅರ್ಥ (ಐಚ್ಛಿಕ)");
 return "<details class='verse-overall-meaning' data-detail-id='overall-"+(isDhyana?"d":"v")+number+"'><summary>"+esc(label)+"</summary><p>"+esc(meaning)+"</p></details>";
}
function dhyanaVerseMeaning(v){
 const info=dhyanaData[v.verse_number]||{};
 const meaning=anyMeaning(info,"essential_meaning")||(language==="kn"?v.meaning?.kannada:v.meaning?.english)||"";
 return "<section class='meaning-section verse-lesson'>"+moreSection(info)+optionalVerseMeaning(meaning,true,v.verse_number)+"</section>";
}
function mainVerseMeaning(v){
 const summary=language==="kn"?v.meaning?.kannada:v.meaning?.english;
 const info=verseData[v.verse_number]||{};
 return "<section class='meaning-section verse-lesson'>"+moreSection(info)+optionalVerseMeaning(summary,false,v.verse_number)+"</section>";
}
function verseLine(s){
 const value=String(s??"").trim();
 // Keep the last word and its danda/verse number in the same typographic unit.
 const m=value.match(/^(.*?)(\S+)\s+(॥(?:\s*[0-9०-९೦-೯]+\s*॥)?|।)$/u);
 const display=m?highlighted(m[1])+"<span class='verse-ending'>"+highlighted(m[2])+"&nbsp;"+esc(m[3].replace(/\s+/g,"\u00a0"))+"</span>":highlighted(value);
 return "<div class='verse-line'><span class='line-content'>"+display+"</span></div>";
}
function fitVerseLines(){
 document.querySelectorAll(".reader-page .verse-line").forEach(line=>{
  const el=line.querySelector(".line-content");if(!el)return;
  line.classList.remove("wrapped");
  el.style.fontSize="";
  const available=line.clientWidth;
  if(!available)return;
  const natural=el.scrollWidth;
  if(natural>available+1){
   const base=parseFloat(getComputedStyle(el).fontSize),iast=!!line.closest(".verse-iast");
   const minimum=iast?17:18;
   const target=Math.max(minimum,Math.floor(base*available/natural*10)/10);
   if(target<base)el.style.fontSize=target+"px";
   if(el.scrollWidth>available+2)line.classList.add("wrapped");
  }
 });
}
function card(v,isDhyana){
 const number=v.verse_number,reading=v.reading||{};
 const selected=language==="kn"?(reading.devanagari||[]).map(kannadaFromDevanagari):(reading.devanagari||[]);
 const iast=reading.iast||[];
 const id=(isDhyana?"dhyana-":"verse-")+number;
 const label=langText(isDhyana?"Dhyāna "+number:"Śloka "+number,isDhyana?"ಧ್ಯಾನ "+number:"ಶ್ಲೋಕ "+number);
 const left="<section class='verse-reading-panel' aria-label='"+esc(langText("Śloka and transliteration","ಶ್ಲೋಕ ಮತ್ತು ಲಿಪ್ಯಂತರ"))+"'><h3 class='panel-heading'>"+esc(langText("Śloka","ಶ್ಲೋಕ"))+"</h3><div class='reading-label'>"+esc(language==="kn"?"ಕನ್ನಡ":"देवनागरी")+"</div><div class='verse-script "+(language==="kn"?"kannada":"devanagari")+"'>"+selected.map(verseLine).join("")+"</div><div class='reading-label iast-heading'>IAST</div><div class='verse-iast'>"+iast.map(verseLine).join("")+"</div></section>";
 const right="<div class='verse-names-panel'>"+(isDhyana?dhyanaPhrasePanel(v):nameSection(v))+"</div>";
 return "<article class='card vedini-study-card' id='"+id+"'><div class='card-head'><b>"+esc(label)+"</b>"+makeAudio(v,isDhyana)+"</div><div class='verse-content-grid'>"+left+right+"</div><div class='verse-meaning-panel'>"+(isDhyana?dhyanaVerseMeaning(v):mainVerseMeaning(v))+"</div><p class='meta'>"+esc(langText("Interpretation draft · Sanskrit and Kannada editorial review recommended","ವ್ಯಾಖ್ಯಾನ ಕರಡು · ಸಂಸ್ಕೃತ ಮತ್ತು ಕನ್ನಡ ಪರಿಶೀಲನೆ ಅಗತ್ಯ"))+"</p></article>";
}
function searchText(v,dh){
 if(dh)return JSON.stringify(v)+" "+JSON.stringify(dhyanaData[v.verse_number]||{});
 return JSON.stringify(v)+" "+JSON.stringify(verseData[v.verse_number]||{})+" "+(v.names||[]).map(n=>JSON.stringify(nameData[n.studyNumber]||{})).join(" ");
}
function savedDetails(){
 return new Set(Array.from(document.querySelectorAll("details[data-detail-id]")).filter(d=>d.open).map(d=>d.dataset.detailId));
}
function restoreDetails(ids){
 document.querySelectorAll("details[data-detail-id]").forEach(d=>{d.open=ids.has(d.dataset.detailId)});
}

function showResultList(q){
 highlightTerm=searchTerm.trim();
 const entries=[
  ...dhyana.map(v=>({type:"dhyana",v})),
  ...verses.map(v=>({type:"verses",v}))
 ];
 const matches=entries.filter(x=>norm(searchText(x.v,x.type==="dhyana")).includes(q));
 const list=$("#search-result-list");
 if(!matches.length){
  list.innerHTML="<p class='no-results'>"+esc(langText("No matches in the published ślokas. Try another word or name.","ಪ್ರಕಟಿತ ಶ್ಲೋಕಗಳಲ್ಲಿ ಫಲಿತಾಂಶವಿಲ್ಲ. ಬೇರೆ ಪದ ಅಥವಾ ನಾಮವನ್ನು ಹುಡುಕಿ."))+"</p>";
 }else{
  list.innerHTML=matches.slice(0,40).map(x=>{
   const v=x.v,dh=x.type==="dhyana",label=dh?langText("Dhyāna","ಧ್ಯಾನ"):langText("Śloka","ಶ್ಲೋಕ");
   const first=v.reading?.iast?.[0]||"";
   const meaning=language==="kn"?v.meaning?.kannada:v.meaning?.english;
   return "<button class='search-result' type='button' data-kind='"+x.type+"' data-number='"+v.verse_number+"'><span class='result-heading'>"+esc(label+" "+v.verse_number)+" <span aria-hidden='true'>→</span></span><span class='result-reading'>"+highlighted(first)+"</span><span class='result-meaning'>"+highlighted(meaning||"")+"</span></button>";
  }).join("");
  if(matches.length>40)list.innerHTML+="<p class='small-note'>"+esc(langText("Showing the first 40 matching sections. Refine the search for more precise results.","ಮೊದಲ ೪೦ ಫಲಿತಾಂಶಗಳು ಮಾತ್ರ ಕಾಣುತ್ತಿವೆ. ಹುಡುಕಾಟವನ್ನು ನಿರ್ದಿಷ್ಟಗೊಳಿಸಿ."))+"</p>";
 }
 list.querySelectorAll("button[data-number]").forEach(b=>b.addEventListener("click",()=>{
  const n=Number(b.dataset.number);
  highlightTerm=searchTerm.trim();if(b.dataset.kind==="dhyana")showDhyana(n);else jump(n);
 }));
 msg("#search-results-heading",matches.length+" matching sections","ಹೊಂದಾಣಿಕೆಯ ವಿಭಾಗಗಳು: "+matches.length);
 msg("#result-note","Searching available ślokas and name explanations","ಲಭ್ಯವಿರುವ ಶ್ಲೋಕಗಳು ಮತ್ತು ನಾಮವಿವರಣೆಗಳಲ್ಲಿ ಹುಡುಕಾಟ");
}
function renderGroupTabs(){
 const root=$("#verse-group-tabs");if(!root)return;
 const count=Math.ceil(verses.length/pageSize);
 root.innerHTML=Array.from({length:count},(_,i)=>{const start=i*pageSize+1,end=Math.min(verses.length,start+pageSize-1);return "<button type='button' class='group-tab "+(i===pageIndex?"current":"")+"' aria-current='"+(i===pageIndex?"page":"false")+"' data-group='"+i+"'>"+start+"–"+end+"</button>"}).join("");
 root.querySelectorAll("button[data-group]").forEach(btn=>btn.onclick=()=>openGroup(Number(btn.dataset.group)));
}
function updateNavigation(){
 const searching=!!searchTerm.trim();
 $("#dhyana").hidden=searching||view!=="dhyana";
 $("#main-stotra").hidden=searching||view!=="verses";
 $("#search-results").hidden=!searching;
 $("#verse-group-tabs").hidden=searching||view!=="verses";
 $("#bottom-navigation").hidden=searching||view!=="verses";
 $("#sticky-verse-navigation").hidden=searching||view!=="verses";
 const dv=view==="dhyana";
 $("#tab-dhyana").classList.toggle("chosen",dv);
 $("#tab-verses").classList.toggle("chosen",!dv);
 $("#tab-dhyana").setAttribute("aria-selected",String(dv));
 $("#tab-verses").setAttribute("aria-selected",String(!dv));
 const totalPages=Math.ceil(verses.length/pageSize);
 renderGroupTabs();
 $("#bottom-previous").disabled=pageIndex<=0;
 $("#bottom-next").disabled=pageIndex>=totalPages-1;
 const start=pageIndex*pageSize+1,end=Math.min(verses.length,start+pageSize-1);
 const rangeText=langText("Ślokas "+start+"–"+end+" of "+verses.length,"ಶ್ಲೋಕಗಳು "+start+"–"+end+" / "+verses.length);
 $("#bottom-position").textContent=rangeText;
 msg("#dhyana-heading","Dhyāna Ślokas","ಧ್ಯಾನ ಶ್ಲೋಕಗಳು");
 msg("#main-heading","Ślokas "+start+"–"+end,"ಶ್ಲೋಕಗಳು "+start+"–"+end);
 msg("#study-languages-label","Script & meaning","ಲಿಪಿ ಮತ್ತು ಅರ್ಥ:");
}
function initDhyanaQuickNav(){
 const root=$("#dhyana-quick-nav");if(!root)return;
 root.querySelectorAll("[data-dhyana-jump]").forEach(btn=>{
  btn.onclick=()=>{
   const n=Number(btn.dataset.dhyanaJump);
   showDhyana(n);
   requestAnimationFrame(()=>document.querySelector("#dhyana-"+n)?.scrollIntoView({behavior:"smooth",block:"start"}));
  };
 });
}
function updateQuickIndex(){
 const root=$("#verse-quick-index");if(!root)return;
 if(view!=="verses"||searchTerm.trim()){root.hidden=true;return;}
 root.hidden=false;
 const start=pageIndex*pageSize+1,end=Math.min(verses.length,start+pageSize-1);
 root.innerHTML="<span class='quick-label'>"+esc(langText("In this group","ಈ ವಿಭಾಗದಲ್ಲಿ"))+"</span><div class='quick-buttons'>"+Array.from({length:end-start+1},(_,i)=>{const n=start+i;return "<button type='button' aria-label='Śloka "+n+"' data-quick='"+n+"' class='"+(n===selectedVerse?"quick-current":"")+"'>"+n+"</button>"}).join("")+"</div>";
 root.querySelectorAll("button[data-quick]").forEach(b=>b.onclick=()=>{const number=Number(b.dataset.quick);selectedVerse=number;saveLocation("sloka",number);root.querySelectorAll("button[data-quick]").forEach(btn=>btn.classList.toggle("quick-current",Number(btn.dataset.quick)===number));document.querySelectorAll("#verse-cards .card").forEach(card=>card.classList.toggle("selected-verse",card.id==="verse-"+number));scrollToElement("verse-"+number);});
}
function render(){
 const opened=savedDetails();
 const q=norm(searchTerm.trim());
 updateNavigation();
 updateQuickIndex();
 if(q){
  $("#dhyana-cards").innerHTML="";
  $("#verse-cards").innerHTML="";
  showResultList(q);
  return;
 }
 if(view==="dhyana"){
  $("#dhyana-cards").innerHTML=dhyana.map(v=>card(v,true)).join("");
  $("#verse-cards").innerHTML="";
 }else{
  const range=verses.slice(pageIndex*pageSize,pageIndex*pageSize+pageSize);
  $("#verse-cards").innerHTML=range.map(v=>card(v,false)).join("");
  $("#dhyana-cards").innerHTML="";
  document.querySelectorAll(".card").forEach(e=>e.classList.toggle("selected-verse",e.id==="verse-"+selectedVerse));
 }
 restoreDetails(opened);
 requestAnimationFrame(fitVerseLines);
 loadAudio();
 initNameAudio();
 initDhyanaPhraseAudio();
 initDhyanaPlayAll();
 initDhyanaQuickNav();
}
function saveLocation(kind,n){
 const url=new URL(window.location.href);
 url.searchParams.delete("sloka");url.searchParams.delete("dhyana");
 url.searchParams.set(kind==="dhyana"?"dhyana":"sloka",String(n));
 window.history.pushState({},"",url.pathname+url.search+url.hash);
}
function scrollToElement(id){
 requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}));
}
function showDhyana(n=1,writeURL=true){
 if(!Number.isInteger(n)||n<1||n>dhyana.length)n=1;
 view="dhyana";searchTerm="";$("#search").value="";
 if(writeURL)saveLocation("dhyana",n);
 render();scrollToElement("dhyana-"+n);
}
function openGroup(index,writeURL=true){
 const availablePages=Math.ceil(verses.length/pageSize);
 if(!availablePages)return;
 pageIndex=Math.max(0,Math.min(availablePages-1,index));
 selectedVerse=pageIndex*pageSize+1;
 view="verses";searchTerm="";$("#search").value="";
 if(writeURL)saveLocation("sloka",selectedVerse);
 render();scrollToElement("main-stotra");
}
function jump(n,writeURL=true){
 if(!Number.isInteger(n)||n<1||n>plannedVerses){
  msg("#result-note","Enter a śloka number from 1 to "+plannedVerses+".","1 ರಿಂದ "+plannedVerses+" ರವರೆಗಿನ ಶ್ಲೋಕ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.");return;
 }
 if(n>verses.length){
  msg("#result-note","Śloka "+n+" has not been published yet. Ślokas 1–"+verses.length+" are available.","ಶ್ಲೋಕ "+n+" ಇನ್ನೂ ಪ್ರಕಟವಾಗಿಲ್ಲ. 1–"+verses.length+" ಲಭ್ಯವಿದೆ.");return;
 }
 view="verses";pageIndex=Math.floor((n-1)/pageSize);selectedVerse=n;
 searchTerm="";$("#search").value="";$("#goto").value=String(n);
 if(writeURL)saveLocation("sloka",n);
 render();scrollToElement("verse-"+n);
}
function loadInitialLocation(){
 const params=new URLSearchParams(window.location.search);
 const d=Number(params.get("dhyana")),n=Number(params.get("sloka"));
 if(params.has("dhyana")&&Number.isInteger(d)&&d>=1&&d<=dhyana.length){view="dhyana";selectedVerse=1;return "dhyana-"+d;}
 if(params.has("sloka")&&Number.isInteger(n)&&n>=1&&n<=verses.length){
  view="verses";pageIndex=Math.floor((n-1)/pageSize);selectedVerse=n;return "verse-"+n;
 }
 view="verses";pageIndex=0;selectedVerse=1;return "";
}

function loadAudio(){
 document.querySelectorAll("[data-audio-path]").forEach(async placeholder=>{
  const path=placeholder.dataset.audioPath;
  const isDhyana=path.includes("/audio/lalita/dhyana/");
  const numberMatch=path.match(/\/verses\/VD\/sloka-(\d{3})\.mp3$/);
  const verseNumber=numberMatch?Number(numberMatch[1]):null;
  const vdConfirmed=verseNumber!==null&&verseNumber>=1&&verseNumber<=183;
  try{
   // VD recordings for ślokas 1–183 are committed and verified in GitHub.
   // Render these players directly even if a browser blocks or caches HEAD.
   if(!vdConfirmed){
    const response=await fetch(path,{method:"HEAD"});
    if(!response.ok)return;
   }
   if(!placeholder.isConnected)return;
   const holder=document.createElement("div");
   holder.className="audio-player";
   const player=document.createElement("audio");
   player.controls=true;
   player.preload="metadata";
   player.src=path;
   player.setAttribute("aria-label",langText("Chant recording","ಶ್ಲೋಕದ ಧ್ವನಿಮುದ್ರಣ"));
   installAudioFocus(player);
   const toolbar=document.createElement("div");
   toolbar.className="audio-toolbar";
   function setting(labelText,ariaLabel,choices){
    const label=document.createElement("label");
    label.className="audio-setting";
    const caption=document.createElement("span");
    caption.textContent=labelText;
    const select=document.createElement("select");
    select.setAttribute("aria-label",ariaLabel);
    for(const item of choices){
     const option=document.createElement("option");
     option.value=item[0];option.textContent=item[1];
     select.appendChild(option);
    }
    label.append(caption,select);
    toolbar.appendChild(label);
    return select;
   }
   let voice=null;
   if(!isDhyana){
    voice=setting(langText("Singer","ಗಾಯಕ"),langText("Choose singer","ಗಾಯಕನನ್ನು ಆರಿಸಿ"),[
     ["VD","VD"],["KMP","KMP"],["MSS","MSS"]
    ]);
   }
   const speed=setting(langText("Speed","ವೇಗ"),langText("Playback speed","ಪ್ಲೇಬ್ಯಾಕ್ ವೇಗ"),[
    ["0.75","0.75×"],["0.9","0.9×"],["1","1×"],
    ["1.1","1.1×"],["1.25","1.25×"],["1.5","1.5×"]
   ]);
   speed.value="0.9";player.playbackRate=0.9;
   const repeat=setting(langText("Repeat","ಪುನರಾವರ್ತನೆ"),langText("Number of plays","ಪುನರಾವರ್ತನೆಗಳ ಸಂಖ್ಯೆ"),[
    ["1",langText("Once","ಒಮ್ಮೆ")],["2",langText("Twice","ಎರಡು ಬಾರಿ")],
    ["3",langText("3 times","ಮೂರು ಬಾರಿ")],
    ["loop",langText("Continuous","ನಿರಂತರ")]
   ]);
   let completed=0;
   if(voice){
    voice.addEventListener("change",async()=>{
     const wasPlaying=!player.paused;
     completed=0;
     player.pause();
     const singer=voice.value;
     try{
      if(singer==="MSS"){
       const verseCard=placeholder.closest(".card");
       const verseNum=verseCard?Number((verseCard.id.match(/verse-(\d+)/)||[])[1]):null;
       const verse=verses.find(v=>v.verse_number===verseNum);
       const sources=verse?verseMssAudioPaths(verse):[];
       if(!sources.length)throw new Error("MSS name audio unavailable");
       player.src=await mergedAudioUrl(sources);
      }else{
       player.src=path.replace("/VD/","/"+singer+"/");
      }
      player.load();
      player.playbackRate=Number(speed.value);
      if(wasPlaying){
       const playResult=player.play();
       if(playResult&&typeof playResult.catch==="function")playResult.catch(()=>{});
      }
     }catch(_){
      player.src=path;
      player.load();
      voice.value="VD";
     }
    });
   }
   speed.addEventListener("change",()=>{player.playbackRate=Number(speed.value)});
   repeat.addEventListener("change",()=>{completed=0;player.loop=repeat.value==="loop"});
   player.addEventListener("ended",()=>{
    if(repeat.value==="loop")return;
    completed+=1;
    if(completed<Number(repeat.value)){
     player.currentTime=0;
     const replay=player.play();
     if(replay&&typeof replay.catch==="function")replay.catch(()=>{});
    }else{
     completed=0;
    }
   });
   holder.append(player,toolbar);
   placeholder.replaceWith(holder);
  }catch(_){/* Keep placeholder if recording is not available. */}
 });
}
const practice={active:false,paused:false,current:1,end:1,reps:1,played:0,token:0};
function practiceStatus(message){const e=$("#practice-status");if(e)e.textContent=message;}
function practiceSyncButtons(){
 $("#practice-play").disabled=practice.active;
 $("#practice-pause").disabled=!practice.active;
 $("#practice-pause").textContent=practice.paused?"Resume":"Pause";
 $("#practice-stop").disabled=!practice.active;
}
function practiceStop(message="Stopped"){
 const audio=$("#practice-audio");practice.token++;practice.active=false;practice.paused=false;audio.pause();audio.removeAttribute("src");audio.load();practiceSyncButtons();practiceStatus(message);
}
async function practiceAudioPath(n){
 const singer=$("#practice-voice").value;
 if(singer==="MSS"){
  const verse=verses.find(v=>v.verse_number===n);
  const sources=verse?verseMssAudioPaths(verse):[];
  if(!sources.length)throw new Error("MSS audio unavailable");
  return mergedAudioUrl(sources);
 }
 return "../audio/lalita/verses/"+singer+"/sloka-"+String(n).padStart(3,"0")+".mp3";
}
function practiceAdvance(token){
 if(token!==practice.token||!practice.active)return;
 if(practice.played<practice.reps){
  practicePlayCurrent(token);return;
 }
 practice.current++;practice.played=0;
 if(practice.current>practice.end){practiceStop("Completed selected range");return;}
 practicePlayCurrent(token);
}
async function practicePlayCurrent(token){
 if(token!==practice.token||!practice.active)return;
 const audio=$("#practice-audio");
 practice.played++;
 const n=practice.current;
 practiceStatus("Playing śloka "+n+" · repetition "+practice.played+" of "+practice.reps);
 try{
  const source=await practiceAudioPath(n);
  if(token!==practice.token||!practice.active)return;
  audio.pause();audio.src=source;audio.playbackRate=Number($("#practice-speed").value);audio.load();
  const started=audio.play();
  if(started&&typeof started.catch==="function")started.catch(()=>{
   if(token!==practice.token||!practice.active||practice.paused)return;
   practiceStop("Unable to play śloka "+n+". Check the audio files.");
  });
 }catch(_){
  if(token!==practice.token||!practice.active||practice.paused)return;
  practiceStop("Unable to play MSS audio for śloka "+n+".");
  return;
 }
 // Follow the active verse across reader groups without interrupting this player.
 if(pageIndex!==Math.floor((n-1)/pageSize)||view!=="verses"||searchTerm.trim()){
  view="verses";pageIndex=Math.floor((n-1)/pageSize);selectedVerse=n;
  searchTerm="";$("#search").value="";render();
 }else{
  selectedVerse=n;
  document.querySelectorAll("#verse-cards .card").forEach(e=>e.classList.toggle("selected-verse",e.id==="verse-"+n));
  updateQuickIndex();
 }
}
function initPractice(){
 const a=$("#practice-from"),b=$("#practice-to"),audio=$("#practice-audio");
 if(!a||!b||!audio)return;
 installAudioFocus(audio);
 const options=verses.map(v=>"<option value='"+v.verse_number+"'>"+v.verse_number+"</option>").join("");
 a.innerHTML=options;b.innerHTML=options;a.value="1";b.value=String(Math.min(10,verses.length));
 function clampRange(changed){
  if(Number(a.value)>Number(b.value)){if(changed==="from")b.value=a.value;else a.value=b.value;}
 }
 a.addEventListener("change",()=>clampRange("from"));
 b.addEventListener("change",()=>clampRange("to"));
 $("#practice-play").addEventListener("click",()=>{
  const from=Number(a.value),to=Number(b.value);
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to>verses.length||from>to){practiceStatus("Select a valid range.");return;}
  // Pause any individual verse player before beginning the uninterrupted range.
  claimAudioFocus(audio);
  practice.token++;practice.active=true;practice.paused=false;practice.current=from;practice.end=to;practice.reps=Number($("#practice-repeat").value);practice.played=0;
  practiceSyncButtons();practicePlayCurrent(practice.token);
 });
 $("#practice-pause").addEventListener("click",()=>{
  if(!practice.active)return;
  if(practice.paused){practice.paused=false;const p=audio.play();if(p&&p.catch)p.catch(()=>practiceStop("Unable to resume"));practiceStatus("Resumed śloka "+practice.current+" · repetition "+practice.played+" of "+practice.reps);}
  else{audio.pause();practice.paused=true;practiceStatus("Paused at śloka "+practice.current+" · repetition "+practice.played+" of "+practice.reps);}
  practiceSyncButtons();
 });
 $("#practice-stop").addEventListener("click",()=>practiceStop());
 $("#practice-speed").addEventListener("change",()=>audio.playbackRate=Number($("#practice-speed").value));
 audio.addEventListener("ended",()=>{if(practice.active&&!practice.paused){if(practice.played>=practice.reps){practice.current++;practice.played=0;if(practice.current>practice.end){practiceStop("Completed selected range");return;}}practicePlayCurrent(practice.token)}});
 audio.addEventListener("error",()=>{if(practice.active)practiceStop("Audio unavailable for śloka "+practice.current+".")});
 practiceSyncButtons();
}
function switchLanguage(kn){
 language=kn?"kn":"en";
 $("#dev").classList.toggle("chosen",!kn);
 $("#kn").classList.toggle("chosen",kn);
 $("#dev").setAttribute("aria-pressed",String(!kn));$("#kn").setAttribute("aria-pressed",String(kn));
 render();
}
async function init(){
 const paths=["lalita/dhyana.json","lalita/names-interpretations-draft.json","lalita/study-names-011-018.json","lalita/study-names-019-026.json","lalita/study-dhyana-01-02.json","lalita/study-dhyana-03-04.json","lalita/study-verses-001-010.json",...Array.from({length:183},(_,i)=>"lalita/verses/verse-"+String(i+1).padStart(3,"0")+".json")];
 try{
 const [files,briefNames,dhyanaPhrases]=await Promise.all([Promise.all(paths.map(fetchJSON)),fetchJSON("lalita/brief-names-draft.json"),fetchJSON("lalita/dhyana-mss-phrases.json?v=20261024-v14")]);
 dhyana=files[0];
 dhyanaPhraseData=Object.fromEntries([1,2,3,4].map(v=>[v,(dhyanaPhrases.phrases||[]).filter(p=>p.verse===v)]));
 const old=files[1],newNames=[...files[2],...files[3]];
 nameData=Object.fromEntries(old.map(v=>[v.number,v]));
 newNames.forEach(x=>{nameData[x.number]={...(nameData[x.number]||{}),...x}});
 dhyanaData=Object.fromEntries([...files[4],...files[5]].map(x=>[x.verse_number,x]));
 verseData=Object.fromEntries(files[6].map(x=>[x.verse_number,x]));
 verses=files.slice(7); const byVerse=new Map(); briefNames.forEach(n=>{if(!byVerse.has(n.verse_number))byVerse.set(n.verse_number,[]);byVerse.get(n.verse_number).push(n);});verses.forEach(v=>{if(!(v.names||[]).length)v.names=(byVerse.get(v.verse_number)||[]).map(n=>({...n,display_devanagari:n.sanskrit,display_iast:n.iast}));});
 let index=0;
 verses.forEach(v=>{if(v.study?.traditional_interpretation)verseData[v.verse_number]=v.study;(v.names||[]).forEach(n=>{n.studyNumber=++index;if(n.essential_meaning&&n.traditional_interpretation)nameData[n.studyNumber]={...(nameData[n.studyNumber]||{}),...n};});});
 const componentDrafts=await Promise.all(["lalita/word-components-001-031.json","lalita/word-components-032-040.json","lalita/word-components-041-060.json","lalita/word-components-061-111.json","lalita/word-components-112-117.json","lalita/word-components-118-151.json","lalita/word-components-152-192.json","lalita/word-components-193-304.json","lalita/word-components-305-340.json","lalita/word-components-341-423.json","lalita/word-components-424-490.json","lalita/word-components-491-1000.json"].map(fetchJSON));
 componentDrafts.flatMap(d=>d.entries).filter(e=>e.components?.length&&e.review_status!=="automated_exact_component_match_needs_review").forEach(e=>{nameData[e.number]={...(nameData[e.number]||{}),components:e.components.map(c=>({...c,dev:c.dev||iastToDevanagari(c.iast)}))};});
  const deeperDrafts=await Promise.all(["lalita/deeper-meanings-001-005.json","lalita/deeper-meanings-006-010.json","lalita/deeper-meanings-011-025.json","lalita/deeper-meanings-026-050.json","lalita/deeper-meanings-051-100.json","lalita/deeper-meanings-101-150.json","lalita/deeper-meanings-151-200.json","lalita/deeper-meanings-201-250.json","lalita/deeper-meanings-251-300.json","lalita/deeper-meanings-301-350.json","lalita/deeper-meanings-351-400.json","lalita/deeper-meanings-401-450.json","lalita/deeper-meanings-451-500.json","lalita/deeper-meanings-501-550.json","lalita/deeper-meanings-551-600.json","lalita/deeper-meanings-601-650.json","lalita/deeper-meanings-651-700.json","lalita/deeper-meanings-701-750.json","lalita/deeper-meanings-751-800.json","lalita/deeper-meanings-801-850.json","lalita/deeper-meanings-851-900.json","lalita/deeper-meanings-901-950.json","lalita/deeper-meanings-951-1000.json"].map(fetchJSON));
 deeperDrafts.flatMap(d=>d.names).forEach(e=>{nameData[e.number]={...(nameData[e.number]||{}),traditional_interpretation:{en:e.en,kn:e.kn}};});
 deeperDrafts.flatMap(d=>d.verses).forEach(e=>{verseData[e.verse_number]={...(verseData[e.verse_number]||{}),traditional_interpretation:{en:e.en,kn:e.kn}};});
 const overallDraft=await fetchJSON("lalita/deeper-overall-022-052.json");
 overallDraft.verses.forEach(e=>{verseData[e.verse_number]={...(verseData[e.verse_number]||{}),traditional_interpretation:{en:e.en,kn:e.kn}};});
 const nextOverall=await fetchJSON("lalita/deeper-overall-053-103.json");
 nextOverall.verses.forEach(e=>{verseData[e.verse_number]={...(verseData[e.verse_number]||{}),traditional_interpretation:{en:e.en,kn:e.kn}};});
 const finalOverall=await fetchJSON("lalita/deeper-overall-104-183.json");
 finalOverall.verses.forEach(e=>{verseData[e.verse_number]={...(verseData[e.verse_number]||{}),traditional_interpretation:{en:e.en,kn:e.kn}};});
 if(index<111)throw new Error("At least the first 111 names are expected; found "+index);
 initPractice();const initial=loadInitialLocation();render();if(initial)scrollToElement(initial);
 }catch(err){
 const n=$("#result-note");if(n)n.textContent="Unable to load study content: "+err.message;
 }
}
$("#dev").onclick=()=>switchLanguage(false);
$("#kn").onclick=()=>switchLanguage(true);
$("#search").oninput=e=>{searchTerm=e.target.value;render()};
$("#go").onclick=()=>jump(Number($("#goto").value));
$("#goto").onkeydown=e=>{if(e.key==="Enter")jump(Number(e.target.value))};
$("#tab-dhyana").onclick=()=>showDhyana(1);
$("#tab-verses").onclick=()=>openGroup(pageIndex);
$("#bottom-previous").onclick=()=>openGroup(pageIndex-1);
$("#bottom-next").onclick=()=>openGroup(pageIndex+1);
window.addEventListener("resize",()=>requestAnimationFrame(fitVerseLines));
if(document.fonts?.ready)document.fonts.ready.then(()=>requestAnimationFrame(fitVerseLines));
window.addEventListener("popstate",()=>{searchTerm="";$("#search").value="";const target=loadInitialLocation();render();if(target)scrollToElement(target);});
init();
})();
