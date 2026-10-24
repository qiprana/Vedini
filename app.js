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
 const num=String(v.verse_number).padStart(isDhyana?2:3,"0");
 const url=isDhyana?"../audio/lalita/dhyana/dhyana-"+num+".mp3":"../audio/lalita/verses/VD/sloka-"+num+".mp3";
 return "<span class='audio' data-audio-path='"+esc(url)+"'>"+esc(langText("♪ Audio coming soon","♪ ಧ್ವನಿಮುದ್ರಣ ಶೀಘ್ರದಲ್ಲಿ"))+"</span>";
}
function nameSection(v){
 let html="<section class='name-section' aria-label='"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"'><div class='section-title'><h3>"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"</h3><span>"+(v.names||[]).length+" "+esc(langText("names","ನಾಮಗಳು"))+"</span></div><div class='name-study-list'>";
 for(const n of v.names||[]){
  const info=nameData[n.studyNumber]||{},parts=findComponents(v,n,info);
  const writtenSource=n.display_devanagari||n.sanskrit||"";
  const written=language==="kn"?kannadaFromDevanagari(writtenSource):writtenSource;
  const essential=anyMeaning(info,"essential_meaning")||(language==="kn"?n.kannada:n.english)||langText("Meaning under review","ಅರ್ಥ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ");
  const roman=n.display_iast||n.iast||"";
  html+="<details class='name-details compact-name-row' data-detail-id='name-"+n.studyNumber+"'><summary><span class='name-summary-grid'><span class='name-identity-inline'><span class='name-number'>"+n.studyNumber+".</span><span class='name-written'>"+highlighted(written)+"</span><span class='name-roman'>"+highlighted(roman)+"</span></span><span class='name-essence'>"+esc(essential)+"</span></span></summary>"+studySections(info,parts)+"</details>";
 }
 return html+"</div></section>";
}
function dhyanaPhrasePanel(v){
 const rows=dhyanaPhraseData[v.verse_number]||[];
 if(!rows.length)return "";
 return "<section class='dhyana-phrase-section'><div class='section-title'><h3>"+esc(langText("Phrase-by-phrase","ಪದಗುಚ್ಛದ ಅರ್ಥ"))+"</h3><span>"+rows.length+" "+esc(langText("phrases","ಪದಗುಚ್ಛಗಳು"))+"</span></div><div class='dhyana-phrase-list'>"+rows.map(row=>{
  const written=language==="kn"?kannadaFromDevanagari(row.dev):row.dev;
  const meaning=language==="kn"?row.kn:row.en;
  const path="../audio/lalita/verses/MSS/phrase_"+String(row.clip).padStart(4,"0")+".mp3";
  return "<div class='dhyana-phrase-row'><button type='button' class='dhyana-phrase-play' data-phrase-audio='"+esc(path)+"' aria-label='"+esc(langText("Play phrase","ಪದಗುಚ್ಛವನ್ನು ಪ್ಲೇ ಮಾಡಿ"))+"'>♪</button><div class='dhyana-phrase-text'><div class='dhyana-phrase-script'>"+highlighted(written)+"</div><div class='dhyana-phrase-iast'>"+highlighted(row.iast)+"</div></div><div class='dhyana-phrase-meaning'>"+esc(meaning)+"</div></div>";
 }).join("")+"</div></section>";
}
function initDhyanaPhraseAudio(){
 document.querySelectorAll("[data-phrase-audio]").forEach(button=>{
  if(button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",()=>{
   let audio=button._audio;
   if(!audio){
    audio=document.createElement("audio");
    audio.preload="metadata";
    audio.src=button.dataset.phraseAudio;
    installAudioFocus(audio);
    button._audio=audio;
    audio.addEventListener("ended",()=>button.classList.remove("playing"));
    audio.addEventListener("pause",()=>{if(audio.currentTime!==0)button.classList.remove("playing")});
   }
   if(!audio.paused){
    audio.pause();audio.currentTime=0;button.classList.remove("playing");return;
   }
   claimAudioFocus(audio);
   button.classList.add("playing");
   const p=audio.play();
   if(p&&typeof p.catch==="function")p.catch(()=>button.classList.remove("playing"));
  });
 });
}
function dhyanaWordsPanel(v){
 const info=dhyanaData[v.verse_number]||{};
 return "<section class='name-section dhyana-study' aria-label='"+esc(langText("Study the words","ಪದಗಳ ಅಧ್ಯಯನ"))+"'><div class='section-title'><h3>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h3></div><details class='dhyana-words' data-detail-id='dhyana-"+v.verse_number+"'><summary>"+esc(langText("Explore the Sanskrit words","ಸಂಸ್ಕೃತ ಪದಗಳನ್ನು ತಿಳಿಯಿರಿ"))+" <span class='count'>"+(info.components?.length||0)+" "+esc(langText("word parts","ಪದಭಾಗಗಳು"))+"</span></summary><div class='study-inner'>"+wordsGrid(info.components)+"</div></details></section>";
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
 initDhyanaPhraseAudio();
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
     if(item[0]==="MSS")option.disabled=true;
     select.appendChild(option);
    }
    label.append(caption,select);
    toolbar.appendChild(label);
    return select;
   }
   let voice=null;
   if(!isDhyana){
    voice=setting(langText("Singer","ಗಾಯಕ"),langText("Choose singer","ಗಾಯಕನನ್ನು ಆರಿಸಿ"),[
     ["VD","VD"],["KMP","KMP"],["MSS","MSS · coming soon"]
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
    voice.addEventListener("change",()=>{
     const wasPlaying=!player.paused;
     const previousTime=Number.isFinite(player.currentTime)?player.currentTime:0;
     completed=0;
     player.pause();
     const singer=voice.value;
     player.src=path.replace("/VD/","/"+singer+"/");
     player.load();
     player.playbackRate=Number(speed.value);
     player.addEventListener("loadedmetadata",()=>{
      if(previousTime>0&&Number.isFinite(player.duration)){
       try{player.currentTime=Math.min(previousTime,Math.max(0,player.duration-0.1));}catch(_){}
      }
      if(wasPlaying){
       const playResult=player.play();
       if(playResult&&typeof playResult.catch==="function")playResult.catch(()=>{});
      }
     },{once:true});
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
function practiceAudioPath(n){
 const singer=$("#practice-voice").value;
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
function practicePlayCurrent(token){
 if(token!==practice.token||!practice.active)return;
 const audio=$("#practice-audio");
 practice.played++;
 const n=practice.current;
 practiceStatus("Playing śloka "+n+" · repetition "+practice.played+" of "+practice.reps);
 const source=practiceAudioPath(n);
 audio.pause();audio.src=source;audio.playbackRate=Number($("#practice-speed").value);audio.load();
 const started=audio.play();
 if(started&&typeof started.catch==="function")started.catch(()=>{
  if(token!==practice.token||!practice.active||practice.paused)return;
  practiceStop("Unable to play śloka "+n+". Check the MP3 file.");
 });
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
 const [files,briefNames,dhyanaPhrases]=await Promise.all([Promise.all(paths.map(fetchJSON)),fetchJSON("lalita/brief-names-draft.json"),fetchJSON("lalita/dhyana-mss-phrases.json?v=20261024-v2")]);
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
