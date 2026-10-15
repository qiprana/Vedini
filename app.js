(function application(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const langText=(en,kn)=>language==="kn"?kn:en;
let verses=[],dhyana=[],nameData={},dhyanaData={},verseData={},language="en",searchTerm="";
const pageSize=5,plannedVerses=180;
let view="verses",pageIndex=0,selectedVerse=1;

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
 let x=(v.word_meanings||[]).find(w=>norm(w.iast)===norm(n.iast));
 return (x?.components||[]).map(c=>({dev:c.sanskrit||"",iast:c.iast||"",en:c.english||"",kn:c.kannada||""}));
}
function wordsGrid(parts){
 if(!parts?.length)return "<p class='small-note'>"+esc(langText("This word is awaiting editorial analysis.","ಈ ಪದದ ಅರ್ಥಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ."))+"</p>";
 return "<div class='word-grid' role='list'>"+parts.map(c=>{
 const written=language==="kn"?kannadaFromDevanagari(c.dev):c.dev;
 return "<div class='word-row' role='listitem'><div class='word-original'>"+esc(written)+" <span class='word-iast'>"+esc(c.iast)+"</span></div><div class='word-translation'>"+esc(c[language]||"")+"</div></div>";
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
 const num=String(v.verse_number).padStart(isDhyana?2:3,"0");
 const url=isDhyana?"../audio/lalita/dhyana/dhyana-"+num+".mp3":"../audio/lalita/verses/sloka-"+num+".mp3";
 return "<span class='audio' data-audio-path='"+esc(url)+"'>"+esc(langText("♪ Audio coming soon","♪ ಧ್ವನಿಮುದ್ರಣ ಶೀಘ್ರದಲ್ಲಿ"))+"</span>";
}
function nameSection(v){
 let html="<section class='name-section'><div class='section-title'><h3>"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"</h3><span>"+esc(langText("Select a name to explore each word","ಪ್ರತಿ ಪದದ ಅರ್ಥಕ್ಕೆ ನಾಮವನ್ನು ತೆರೆಯಿರಿ"))+"</span></div>";
 for(const n of v.names||[]){
 const info=nameData[n.studyNumber]||{},parts=findComponents(v,n,info);
 const dev=n.display_devanagari||n.sanskrit||"",written=language==="kn"?kannadaFromDevanagari(dev):dev;
 const essential=anyMeaning(info,"essential_meaning")||(language==="kn"?n.kannada:n.english)||langText("Meaning under review","ಅರ್ಥ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ");
 const roman=n.display_iast||n.iast;
 html+="<details class='name-details' data-detail-id='name-"+n.studyNumber+"'><summary><span class='name-line'><span class='name-number'>"+n.studyNumber+".</span><span class='name-written'>"+esc(written)+"</span><span class='name-roman'>· "+esc(roman)+"</span><span class='name-essence'>— "+esc(essential)+"</span></span></summary>"+studySections(info,parts)+"</details>";
 }
 return html+"</section>";
}
function dhyanaSection(v){
 const info=dhyanaData[v.verse_number]||{};
 const meaning=anyMeaning(info,"essential_meaning")||(language==="kn"?v.meaning?.kannada:v.meaning?.english)||"";
 return "<section class='meaning-section verse-lesson'><div class='essential-meaning'><h3>"+esc(langText("Essential meaning","ಮುಖ್ಯ ಅರ್ಥ"))+"</h3><p>"+esc(meaning)+"</p></div><details class='dhyana-words' data-detail-id='dhyana-"+v.verse_number+"'><summary>"+esc(langText("Explore each word","ಪ್ರತಿ ಪದದ ಅರ್ಥ ನೋಡಿ"))+" <span class='count'>"+(info.components?.length||0)+" "+esc(langText("word parts","ಪದಭಾಗಗಳು"))+"</span></summary><div class='study-inner'><h4>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h4>"+wordsGrid(info.components)+"</div></details>"+moreSection(info)+"</section>";
}
function moreSection(info){
 const deep=anyMeaning(info,"traditional_interpretation");
 return deep?"<div class='deeper-reading'><h3>"+esc(langText("Deeper meaning","ಆಳವಾದ ಅರ್ಥ"))+"</h3>"+richParagraphs(deep)+"</div>":"";
}
function mainVerseSection(v){
 const summary=language==="kn"?v.meaning?.kannada:v.meaning?.english;
 const info=verseData[v.verse_number]||{};
 return nameSection(v)+"<section class='meaning-section verse-lesson'><div class='essential-meaning'><h3>"+esc(langText("Meaning of this śloka","ಈ ಶ್ಲೋಕದ ಅರ್ಥ"))+"</h3><p>"+esc(summary||"")+"</p></div>"+moreSection(info)+"</section>";
}
function card(v,isDhyana){
 const number=v.verse_number;
 const reading=v.reading||{};
 const selected=language==="kn"?(reading.devanagari||[]).map(kannadaFromDevanagari):(reading.devanagari||[]);
 const iast=reading.iast||[];
 const id=(isDhyana?"dhyana-":"verse-")+number;
 const label=langText(isDhyana?"Dhyāna "+number:"Śloka "+number,isDhyana?"ಧ್ಯಾನ "+number:"ಶ್ಲೋಕ "+number);
 return "<article class='card' id='"+id+"'><div class='card-head'><b>"+esc(label)+"</b>"+makeAudio(v,isDhyana)+"</div><div class='chant'><div><div class='reading-label'>"+esc(language==="kn"?"ಕನ್ನಡ":"देवनागरी")+"</div><div class='verse-script "+(language==="kn"?"kannada":"devanagari")+"'>"+selected.map(esc).join("\n")+"</div></div><div><div class='reading-label'>IAST</div><div class='verse-iast'>"+iast.map(esc).join("\n")+"</div></div></div>"+(isDhyana?dhyanaSection(v):mainVerseSection(v))+"<p class='meta'>"+esc(langText("Interpretation draft · Sanskrit and Kannada editorial review recommended","ವ್ಯಾಖ್ಯಾನ ಕರಡು · ಸಂಸ್ಕೃತ ಮತ್ತು ಕನ್ನಡ ಪರಿಶೀಲನೆ ಅಗತ್ಯ"))+"</p></article>";
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
   return "<button class='search-result' type='button' data-kind='"+x.type+"' data-number='"+v.verse_number+"'><span class='result-heading'>"+esc(label+" "+v.verse_number)+" <span aria-hidden='true'>→</span></span><span class='result-reading'>"+esc(first)+"</span><span class='result-meaning'>"+esc(meaning||"")+"</span></button>";
  }).join("");
  if(matches.length>40)list.innerHTML+="<p class='small-note'>"+esc(langText("Showing the first 40 matching sections. Refine the search for more precise results.","ಮೊದಲ ೪೦ ಫಲಿತಾಂಶಗಳು ಮಾತ್ರ ಕಾಣುತ್ತಿವೆ. ಹುಡುಕಾಟವನ್ನು ನಿರ್ದಿಷ್ಟಗೊಳಿಸಿ."))+"</p>";
 }
 list.querySelectorAll("button[data-number]").forEach(b=>b.addEventListener("click",()=>{
  const n=Number(b.dataset.number);
  if(b.dataset.kind==="dhyana")showDhyana(n);else jump(n);
 }));
 msg("#search-results-heading",matches.length+" matching sections","ಹೊಂದಾಣಿಕೆಯ ವಿಭಾಗಗಳು: "+matches.length);
 msg("#result-note","Searching available ślokas and name explanations","ಲಭ್ಯವಿರುವ ಶ್ಲೋಕಗಳು ಮತ್ತು ನಾಮವಿವರಣೆಗಳಲ್ಲಿ ಹುಡುಕಾಟ");
}
function updateNavigation(){
 const searching=!!searchTerm.trim();
 $("#dhyana").hidden=searching||view!=="dhyana";
 $("#main-stotra").hidden=searching||view!=="verses";
 $("#search-results").hidden=!searching;
 $("#range-navigation").hidden=searching||view!=="verses";
 $("#bottom-navigation").hidden=searching||view!=="verses";
 const dv=view==="dhyana";
 $("#tab-dhyana").classList.toggle("chosen",dv);
 $("#tab-verses").classList.toggle("chosen",!dv);
 $("#tab-dhyana").setAttribute("aria-selected",String(dv));
 $("#tab-verses").setAttribute("aria-selected",String(!dv));
 const totalPages=Math.ceil(verses.length/pageSize);
 $("#range-select").value=String(pageIndex);
 for(const id of ["previous-group","bottom-previous"])$("#"+id).disabled=pageIndex<=0;
 for(const id of ["next-group","bottom-next"])$("#"+id).disabled=pageIndex>=totalPages-1;
 const start=pageIndex*pageSize+1,end=Math.min(verses.length,start+pageSize-1);
 const rangeText=langText("Ślokas "+start+"–"+end+" of "+verses.length,"ಶ್ಲೋಕಗಳು "+start+"–"+end+" / "+verses.length);
 $("#page-position").textContent=rangeText;
 $("#bottom-position").textContent=rangeText;
 msg("#dhyana-heading","Dhyāna Ślokas","ಧ್ಯಾನ ಶ್ಲೋಕಗಳು");
 msg("#main-heading","Lalitā Sahasranāma · Ślokas "+start+"–"+end,"ಲಲಿತಾ ಸಹಸ್ರನಾಮ · ಶ್ಲೋಕಗಳು "+start+"–"+end);
 msg("#study-languages-label","Reading & meaning:","ಲಿಪಿ ಮತ್ತು ಅರ್ಥ:");
 msg("#expand-all",dv?"Expand all word meanings":"Expand all name meanings",dv?"ಎಲ್ಲ ಪದಾರ್ಥಗಳನ್ನು ತೆರೆಯಿರಿ":"ಎಲ್ಲ ನಾಮಗಳ ಅರ್ಥ ತೆರೆಯಿರಿ");
 if(!searching)msg("#result-note",verses.length+" ślokas available · "+plannedVerses+" planned · Five at a time","ಲಭ್ಯ: "+verses.length+" ಶ್ಲೋಕಗಳು · ಯೋಜಿತ: "+plannedVerses+" · ಒಂದು ಪುಟದಲ್ಲಿ ಐದು");
}
function render(){
 const opened=savedDetails();
 const q=norm(searchTerm.trim());
 updateNavigation();
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
 loadAudio();
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
function initializeRanges(){
 const el=$("#range-select"),count=Math.ceil(verses.length/pageSize);
 el.innerHTML=Array.from({length:count},(_,i)=>{
  const from=i*pageSize+1,to=Math.min(verses.length,from+pageSize-1);
  return "<option value='"+i+"'>"+from+"–"+to+"</option>";
 }).join("");
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
  try{
   const response=await fetch(path,{method:"HEAD"});
   if(!response.ok||!placeholder.isConnected)return;

   const holder=document.createElement("div");
   holder.className="audio-player";
   const player=document.createElement("audio");
   player.controls=true;
   player.preload="none";
   player.src=path;
   player.setAttribute("aria-label",langText("Chant recording","ಶ್ಲೋಕದ ಧ್ವನಿಮುದ್ರಣ"));

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
     option.value=item[0];option.textContent=item[1];select.appendChild(option);
    }
    label.append(caption,select);
    toolbar.appendChild(label);
    return select;
   }
   const speed=setting(langText("Speed","ವೇಗ"),langText("Playback speed","ಪ್ಲೇಬ್ಯಾಕ್ ವೇಗ"),[
    ["0.75","0.75×"],["0.9","0.9×"],["1","1×"],["1.1","1.1×"],["1.25","1.25×"],["1.5","1.5×"]
   ]);
   const repeat=setting(langText("Repeat","ಪುನರಾವರ್ತನೆ"),langText("Number of plays","ಪುನರಾವರ್ತನೆಗಳ ಸಂಖ್ಯೆ"),[
    ["1",langText("Once","ಒಮ್ಮೆ")],["2",langText("Twice","ಎರಡು ಬಾರಿ")],
    ["3",langText("3 times","ಮೂರು ಬಾರಿ")],["loop",langText("Continuous","ನಿರಂತರ")]
   ]);
   if(path.includes("/verses/sloka-")){
    const warmPath=path.replace(".mp3","-warm.mp3");
    try{
     const warmResponse=await fetch(warmPath,{method:"HEAD"});
     if(warmResponse.ok&&placeholder.isConnected){
      const voice=setting(langText("Voice","ಧ್ವನಿ"),langText("Chanting voice","ಪಠಣದ ಧ್ವನಿ"),[
       ["original",langText("Original","ಮೂಲ")],["warm",langText("Warm, deeper","ಮೃದು ಗಂಭೀರ")]
      ]);
      voice.addEventListener("change",()=>{
       const wasPlaying=!player.paused;
       const oldTime=player.currentTime;
       player.pause();
       player.src=voice.value==="warm"?warmPath:path;
       player.load();
       player.currentTime=oldTime;
       if(wasPlaying){const p=player.play();if(p&&p.catch)p.catch(()=>{});}
      });
     }
    }catch(_){/* Warm version not uploaded yet. */}
   }
   let finished=0;
   speed.addEventListener("change",()=>{player.playbackRate=Number(speed.value)});
   repeat.addEventListener("change",()=>{finished=0;player.loop=repeat.value==="loop"});
   player.addEventListener("ended",()=>{
    if(repeat.value==="loop")return;
    finished+=1;
    if(finished<Number(repeat.value)){
     player.currentTime=0;
     const restarting=player.play();
     if(restarting&&typeof restarting.catch==="function")restarting.catch(()=>{});
    }else{
     finished=0;
    }
   });
   holder.append(player,toolbar);
   placeholder.replaceWith(holder);
  }catch(_){/* Keep the placeholder until a recording is uploaded. */}
 });
}
function switchLanguage(kn){
 language=kn?"kn":"en";
 $("#dev").classList.toggle("chosen",!kn);
 $("#kn").classList.toggle("chosen",kn);
 $("#dev").setAttribute("aria-pressed",String(!kn));$("#kn").setAttribute("aria-pressed",String(kn));
 render();
}
async function init(){
 const paths=["lalita/dhyana.json","lalita/names-interpretations-draft.json","lalita/study-names-011-018.json","lalita/study-names-019-026.json","lalita/study-dhyana-01-02.json","lalita/study-dhyana-03-04.json","lalita/study-verses-001-010.json",...Array.from({length:20},(_,i)=>"lalita/verses/verse-"+String(i+1).padStart(3,"0")+".json")];
 try{
 const files=await Promise.all(paths.map(fetchJSON));
 dhyana=files[0];
 const old=files[1],newNames=[...files[2],...files[3]];
 nameData=Object.fromEntries(old.map(v=>[v.number,v]));
 newNames.forEach(x=>{nameData[x.number]={...(nameData[x.number]||{}),...x}});
 dhyanaData=Object.fromEntries([...files[4],...files[5]].map(x=>[x.verse_number,x]));
 verseData=Object.fromEntries(files[6].map(x=>[x.verse_number,x]));
 verses=files.slice(7);
 let index=0;
 verses.forEach(v=>{if(v.study?.traditional_interpretation)verseData[v.verse_number]=v.study;(v.names||[]).forEach(n=>{n.studyNumber=++index;if(n.essential_meaning&&n.traditional_interpretation)nameData[n.studyNumber]={...(nameData[n.studyNumber]||{}),...n};});});
 if(index!==48)throw new Error("Expected 48 names in the first 20 verses; found "+index);
 initializeRanges();const initial=loadInitialLocation();render();if(initial)scrollToElement(initial);
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
$("#range-select").onchange=e=>openGroup(Number(e.target.value));
$("#previous-group").onclick=()=>openGroup(pageIndex-1);
$("#next-group").onclick=()=>openGroup(pageIndex+1);
$("#bottom-previous").onclick=()=>openGroup(pageIndex-1);
$("#bottom-next").onclick=()=>openGroup(pageIndex+1);
window.addEventListener("popstate",()=>{searchTerm="";$("#search").value="";const target=loadInitialLocation();render();if(target)scrollToElement(target);});
const expand=$("#expand-all");if(expand)expand.onclick=()=>{
 const items=Array.from(document.querySelectorAll(".name-details"));
 const desired=!items.every(d=>d.open);
 items.forEach(d=>d.open=desired);
};
init();
})();
