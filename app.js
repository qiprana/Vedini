(function application(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const langText=(en,kn)=>language==="kn"?kn:en;
let verses=[],dhyana=[],nameData={},dhyanaData={},verseData={},language="en",searchTerm="";
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
function render(){
 const opened=savedDetails();
 const q=norm(searchTerm.trim());
 const vh=verses.filter(v=>!q||norm(searchText(v,false)).includes(q));
 const dh=dhyana.filter(v=>!q||norm(searchText(v,true)).includes(q));
 $("#dhyana").hidden=!!q&&!dh.length;
 $("#main-stotra").hidden=!!q&&!vh.length;
 $("#dhyana-cards").innerHTML=dh.map(v=>card(v,true)).join("");
 $("#verse-cards").innerHTML=vh.map(v=>card(v,false)).join("");
 restoreDetails(opened);
 msg("#result-note",q?((vh.length+dh.length)+" matching sections"): "Ślokas 1–15 with meanings · 180-slot index · Future verses to follow",q?((vh.length+dh.length)+" ಹೊಂದಾಣಿಕೆಯ ವಿಭಾಗಗಳು"):"೧–೧೫ ಶ್ಲೋಕಗಳು ಮತ್ತು ಅರ್ಥಗಳು · ೧೮೦ ಸ್ಥಾನಗಳ ಸೂಚಿ · ಉಳಿದ ಶ್ಲೋಕಗಳು ನಂತರ");
 msg("#dhyana-heading","Dhyāna Ślokas","ಧ್ಯಾನ ಶ್ಲೋಕಗಳು");
 msg("#main-heading","Lalitā Sahasranāma · First 15 Ślokas","ಲಲಿತಾ ಸಹಸ್ರನಾಮ · ಮೊದಲ ೧೫ ಶ್ಲೋಕಗಳು");
 msg("#study-languages-label","Reading & meaning:","ಲಿಪಿ ಮತ್ತು ಅರ್ಥ:");
 msg("#expand-all","Open all name meanings","ಎಲ್ಲ ನಾಮಗಳ ಅರ್ಥ ತೆರೆಯಿರಿ");
 loadAudio();
}
function loadAudio(){
 document.querySelectorAll("[data-audio-path]").forEach(async e=>{
  const path=e.dataset.audioPath;
  try{
   const r=await fetch(path,{method:"HEAD"});
   if(!r.ok||!e.isConnected)return;
   const a=document.createElement("audio");a.controls=true;a.preload="none";a.src=path;
   a.setAttribute("aria-label",langText("Chant recording","ಶ್ಲೋಕದ ಧ್ವನಿಮುದ್ರಣ"));
   e.replaceChildren(a);
  }catch(_){/* Recording will be uploaded later. */}
 });
}
function renderIndex(){
 const e=$("#index");e.innerHTML=Array.from({length:180},(_,i)=>{
 const n=i+1,avail=n<=verses.length;
 return "<button type='button' data-n='"+n+"' class='"+(avail?"available":"pending")+"' title='"+esc(avail?"Go to śloka "+n:"Śloka "+n+" pending")+"'>"+n+"</button>";
 }).join("");
 e.querySelectorAll("button").forEach(b=>b.onclick=()=>jump(Number(b.dataset.n)));
}
function jump(n){
 if(!Number.isInteger(n)||n<1||n>verses.length){msg("#result-note","This śloka has not been added yet.","ಈ ಶ್ಲೋಕ ಇನ್ನೂ ಸೇರಿಸಿಲ್ಲ.");return}
 if(searchTerm){searchTerm="";$("#search").value="";render()}
 const el=$("#verse-"+n);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
}
function switchLanguage(kn){
 language=kn?"kn":"en";
 $("#dev").classList.toggle("chosen",!kn);
 $("#kn").classList.toggle("chosen",kn);
 $("#dev").setAttribute("aria-pressed",String(!kn));$("#kn").setAttribute("aria-pressed",String(kn));
 render();
}
async function init(){
 const paths=["lalita/dhyana.json","lalita/names-interpretations-draft.json","lalita/study-names-011-018.json","lalita/study-names-019-026.json","lalita/study-dhyana-01-02.json","lalita/study-dhyana-03-04.json","lalita/study-verses-001-010.json",...Array.from({length:15},(_,i)=>"lalita/verses/verse-"+String(i+1).padStart(3,"0")+".json")];
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
 if(index!==36)throw new Error("Expected 36 names in the first 15 verses; found "+index);
 renderIndex();render();
 }catch(err){
 const n=$("#result-note");if(n)n.textContent="Unable to load study content: "+err.message;
 }
}
$("#dev").onclick=()=>switchLanguage(false);
$("#kn").onclick=()=>switchLanguage(true);
$("#search").oninput=e=>{searchTerm=e.target.value;render()};
$("#go").onclick=()=>jump(Number($("#goto").value));
$("#goto").onkeydown=e=>{if(e.key==="Enter")jump(Number(e.target.value))};
$("#to-dhyana").onclick=()=>$("#dhyana").scrollIntoView({behavior:"smooth",block:"start"});
const expand=$("#expand-all");if(expand)expand.onclick=()=>{
 const items=Array.from(document.querySelectorAll(".name-details"));
 const desired=!items.every(d=>d.open);
 items.forEach(d=>d.open=desired);
};
init();
})();
