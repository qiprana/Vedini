/* Source-grounded replacement layer for the Lalita reader.
 * Load before app.js. Existing verses, hyphens, names, audio and word glosses
 * remain in their original files. Generic reflection files are not deleted.
 */
(function installSourceReview(){
"use strict";
if(window.VediniSourceReview)return;
const ROOT=new URL("./",document.currentScript.src);
const DATA=new URL("data/lalita/",ROOT);
const VERSION="20261022-source-review-2";
const nativeFetch=window.fetch.bind(window);
const INDEX="https://manblunder.com/articles/lalitha-sahasranama";
const SHLOKAM="https://shlokam.org/shloka/lalitha-sahasranamam.htm";
let reviewed=null,loadError=false,scheduled=false;
const readings=new Map();
const reviewPromise=Promise.all(["source-reviewed-meanings.json","source-reviewed-additions.json"].map(async path=>{
  const response=await nativeFetch(new URL(path+"?v="+VERSION,DATA).href,{cache:"no-cache"});
  if(!response.ok)throw new Error("Reviewed meanings HTTP "+response.status);
  return response.json();
})).then(files=>{
  const content={names:files.flatMap(f=>f.names||[]),verses:files.flatMap(f=>f.verses||[]),sources:Object.assign({},...files.map(f=>f.sources||{}))};
  const nameIds=new Set(),verseIds=new Set();
  for(const n of content.names){
    if(!Number.isInteger(n.number)||n.number<1||n.number>1000||nameIds.has(n.number)||!n.en||!n.kn||!n.source_ids?.length)throw new Error("Invalid reviewed name");
    if(n.source_ids.some(id=>!content.sources[id]))throw new Error("Missing name source");
    nameIds.add(n.number);
  }
  for(const v of content.verses){
    if(!Number.isInteger(v.verse_number)||v.verse_number<1||v.verse_number>183||verseIds.has(v.verse_number)||!v.meaning?.en||!v.meaning?.kn||!v.deeper?.en||!v.deeper?.kn)throw new Error("Invalid reviewed verse");
    if([...(v.meaning_source_ids||[]),...(v.deeper_source_ids||[])].some(id=>!content.sources[id]))throw new Error("Missing verse source");
    verseIds.add(v.verse_number);
  }
  reviewed=content;return content;
}).catch(error=>{
  loadError=true;console.warn("Vedini source review:",error.message);
  reviewed={names:[],verses:[],sources:{}};return reviewed;
});
function jsonResponse(value){return new Response(JSON.stringify(value),{status:200,headers:{"Content-Type":"application/json; charset=utf-8"}});}
function withoutOldInterpretations(value){
  if(Array.isArray(value))return value.map(withoutOldInterpretations);
  if(value&&typeof value==="object"){
    const clean={};
    for(const [key,item] of Object.entries(value))if(key!=="traditional_interpretation")clean[key]=withoutOldInterpretations(item);
    return clean;
  }
  return value;
}
window.fetch=async function sourceAwareFetch(input,init){
  let url;
  try{url=new URL(typeof input==="string"?input:(input instanceof URL?input.href:input.url),location.href);}
  catch(_){return nativeFetch(input,init);}
  const method=(init?.method||(typeof input==="object"&&input.method)||"GET").toUpperCase();
  if(method!=="GET"||url.origin!==DATA.origin||!url.pathname.startsWith(DATA.pathname))return nativeFetch(input,init);
  const path=url.pathname.slice(DATA.pathname.length);
  if(path.startsWith("source-reviewed-"))return nativeFetch(input,init);
  if(path.includes("dhyana"))return nativeFetch(input,init);
  const content=await reviewPromise;
  const range=path.match(/^deeper-meanings-(\d+)-(\d+)\.json$/);
  if(range){
    const first=Number(range[1]),last=Number(range[2]);
    return jsonResponse({names:content.names.filter(n=>n.number>=first&&n.number<=last),verses:first===1?content.verses.map(v=>({verse_number:v.verse_number,en:v.deeper.en,kn:v.deeper.kn})):[]});
  }
  if(/^deeper-overall-\d+-\d+\.json$/.test(path))return jsonResponse({verses:[]});
  const response=await nativeFetch(input,init);
  if(!response.ok||!path.endsWith(".json"))return response;
  let value;
  try{value=await response.clone().json();}catch(_){return response;}
  value=withoutOldInterpretations(value);
  if(/^verses\/verse-\d{3}\.json$/.test(path)){
    readings.set(value.verse_number,value.reading?.devanagari?.[0]||"");
    const correction=content.verses.find(v=>v.verse_number===value.verse_number);
    if(correction)value.meaning={...(value.meaning||{}),english:correction.meaning.en,kannada:correction.meaning.kn};
  }
  return jsonResponse(value);
};
const style=document.createElement("style");
style.textContent=`
.source-review-links{font-size:.85em;line-height:1.5;margin:.65rem 0 0}
.source-review-links a{text-decoration:underline;text-underline-offset:3px}
.source-review-status{font-size:.87em;line-height:1.55;opacity:.8}
.source-overall-meaning{padding:0 0 1rem;margin:0 0 1rem;border-bottom:1px solid currentColor}
.source-overall-meaning h3{margin-top:0}
.source-overall-meaning p,.source-reviewed-block p{line-height:1.75}
.source-review-notice{font-size:.9rem;line-height:1.6;max-width:80ch}
`;
document.head.append(style);
function isKannada(){return document.querySelector("#kn")?.getAttribute("aria-pressed")==="true";}
function text(en,kn){return isKannada()?kn:en;}
function el(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value)e.textContent=value;return e;}
function safeLink(url,label){
  try{
    const u=new URL(url);
    if(u.protocol!=="https:"||!["manblunder.com","www.manblunder.com","shlokam.org"].includes(u.hostname))return document.createTextNode(label);
    const a=el("a","",label);a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";return a;
  }catch(_){return document.createTextNode(label);}
}
function sources(ids){
  const p=el("p","source-review-links");
  p.append(document.createTextNode(text("Sources: ","ಆಕರಗಳು: ")));
  ids.forEach((id,i)=>{const source=reviewed.sources[id];if(!source)return;if(i)p.append(document.createTextNode(" · "));p.append(safeLink(source.url,source.label));});
  return p;
}
function paragraphs(parent,value){for(const paragraph of String(value||"").split(/\n\s*\n/).filter(Boolean))parent.append(el("p","",paragraph));}
function pending(level,forVerse=false){
  const block=el("div","deeper-reading source-reviewed-block");
  block.append(el(level,"",text("Deeper meaning","ಆಳವಾದ ಅರ್ಥ")));
  block.append(el("p","source-review-status",forVerse?text(
    "The earlier generic reflection has been withdrawn. This verse's connected, source-based interpretation is awaiting review.",
    "ಹಿಂದಿನ ಸಾಮಾನ್ಯ ಚಿಂತನೆಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ. ಈ ಶ್ಲೋಕದ ಆಕರಾಧಾರಿತ ಸಮಗ್ರ ವ್ಯಾಖ್ಯಾನದ ಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ."
  ):text(
    "The earlier generic reflection has been withdrawn. This name's source-based explanation is awaiting review.",
    "ಹಿಂದಿನ ಸಾಮಾನ್ಯ ಚಿಂತನೆಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ. ಈ ನಾಮದ ಆಕರಾಧಾರಿತ ವಿವರಣೆಯ ಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ."
  )));
  const link=el("p","source-review-links");link.append(safeLink(INDEX,text("Manblunder commentary index","Manblunder ವ್ಯಾಖ್ಯಾನ ಸೂಚಿ")));block.append(link);
  return block;
}
function applyName(detail){
  const n=Number(detail.dataset.detailId.slice(5));
  const inner=detail.querySelector(".study-inner");if(!inner)return;
  inner.querySelectorAll(":scope > .deeper-reading").forEach(e=>e.remove());
  const name=reviewed.names.find(x=>x.number===n);
  if(!name){inner.append(pending("h4"));return;}
  const block=el("div","deeper-reading source-reviewed-block");block.dataset.reviewed="true";
  block.append(el("h4","",text("Deeper meaning","ಆಳವಾದ ಅರ್ಥ")));
  paragraphs(block,isKannada()?name.kn:name.en);block.append(sources(name.source_ids));inner.append(block);
}
function applyOverall(card,n){
  const lesson=card.querySelector(".verse-meaning-panel .verse-lesson");if(!lesson)return;
  if(card.id.startsWith("dhyana-")){
    const details=lesson.querySelector(".verse-overall-meaning");
    if(details){details.open=true;const summary=details.querySelector("summary");if(summary)summary.textContent=text("Overall meditation meaning","ಧ್ಯಾನ ಶ್ಲೋಕದ ಒಟ್ಟು ಅರ್ಥ");lesson.prepend(details);}
    return;
  }
  const item=reviewed.verses.find(v=>v.verse_number===n);
  const existing=lesson.querySelector(".verse-overall-meaning p")?.textContent||"";
  const meaning=item?(isKannada()?item.meaning.kn:item.meaning.en):existing;
  lesson.replaceChildren();
  const overall=el("section","source-overall-meaning");
  overall.append(el("h3","",text("Overall śloka meaning","ಶ್ಲೋಕದ ಒಟ್ಟು ಅರ್ಥ")));
  if(meaning){
    paragraphs(overall,meaning);
    if(!item)overall.append(el("p","source-review-status",text("Existing translation; comparison with Shlokam is pending.","ಈಗಿರುವ ಅನುವಾದ; Shlokam ಆಕರದೊಂದಿಗೆ ಹೋಲಿಕೆ ಬಾಕಿಯಿದೆ.")));
  }else overall.append(el("p","source-review-status",text(
    "The full verse translation is awaiting source review. Read Shlokam's overall meaning below.",
    "ಸಂಪೂರ್ಣ ಶ್ಲೋಕದ ಅನುವಾದದ ಆಕರಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ. ಕೆಳಗಿನ Shlokam ಕೊಂಡಿಯಲ್ಲಿ ಒಟ್ಟು ಅರ್ಥವನ್ನು ಓದಬಹುದು."
  )));
  const source=el("p","source-review-links"),line=readings.get(n);
  source.append(safeLink(line?SHLOKAM+"#:~:text="+encodeURIComponent(line):SHLOKAM,text("Shlokam · overall meaning","Shlokam · ಒಟ್ಟು ಅರ್ಥ")));overall.append(source);lesson.append(overall);
  if(item){
    const deep=el("section","deeper-reading source-reviewed-block");deep.dataset.reviewed="true";
    deep.append(el("h3","",text("Deeper meaning","ಆಳವಾದ ಅರ್ಥ")));paragraphs(deep,isKannada()?item.deeper.kn:item.deeper.en);
    deep.append(el("p","source-review-status",text("Editorial synthesis of the cited commentary.","ಉಲ್ಲೇಖಿತ ವ್ಯಾಖ್ಯಾನದ ಆಧಾರದ ಸಂಪಾದಕೀಯ ಸಂಯೋಜನೆ.")),sources(item.deeper_source_ids));
    lesson.append(deep);
  }else lesson.append(pending("h3",true));
}
function apply(){
  scheduled=false;if(!reviewed)return;
  const key=VERSION+(isKannada()?"-kn":"-en");
  document.querySelectorAll(".vedini-study-card").forEach(card=>{
    if(card.dataset.sourceReview===key)return;
    card.dataset.sourceReview=key;
    card.querySelectorAll(".name-details[data-detail-id^='name-']").forEach(applyName);
    applyOverall(card,Number(card.id.split("-").pop()));
    const meta=card.querySelector(":scope > .meta");
    if(meta&&!card.id.startsWith("dhyana-"))meta.textContent=text(
      "Source-linked explanations are editorial summaries, not quotations. Sanskrit and Kannada review remains ongoing.",
      "ಆಕರಕೊಂಡಿಯ ವಿವರಣೆಗಳು ಸಂಪಾದಕೀಯ ಸಾರಾಂಶಗಳು; ನೇರ ಉಲ್ಲೇಖಗಳಲ್ಲ. ಸಂಸ್ಕೃತ ಮತ್ತು ಕನ್ನಡ ಪರಿಶೀಲನೆ ಮುಂದುವರಿಯುತ್ತಿದೆ."
    );
  });
  const footer=document.querySelector(".reader-page .foot");
  if(footer){
    const notice=loadError?text(
      "Source-reviewed notes could not be loaded. Ślokas and word-by-word content remain available; refresh to retry.",
      "ಆಕರಾಧಾರಿತ ವಿವರಣೆಗಳು ಲೋಡ್ ಆಗಲಿಲ್ಲ. ಶ್ಲೋಕ ಮತ್ತು ಪದಾರ್ಥಗಳು ಲಭ್ಯವಿವೆ; ಮತ್ತೆ ಪುಟ ತೆರೆದು ಪ್ರಯತ್ನಿಸಿ."
    ):text(
      reviewed.names.length+" of 1,000 name explanations and "+reviewed.verses.length+" of 183 overall interpretations have source-checked replacements. Other deeper meanings remain under review; earlier generic reflections are not displayed.",
      "1,000 ನಾಮಗಳಲ್ಲಿ "+reviewed.names.length+" ವಿವರಣೆಗಳು ಮತ್ತು 183 ಶ್ಲೋಕಗಳಲ್ಲಿ "+reviewed.verses.length+" ಒಟ್ಟು ವ್ಯಾಖ್ಯಾನಗಳಿಗೆ ಆಕರಾಧಾರಿತ ಬದಲಾವಣೆಗಳಿವೆ. ಉಳಿದವುಗಳ ಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ; ಹಳೆಯ ಸಾಮಾನ್ಯ ಚಿಂತನೆಗಳನ್ನು ತೋರಿಸಲಾಗುವುದಿಲ್ಲ."
    );
    if(footer.textContent!==notice)footer.textContent=notice;footer.classList.add("source-review-notice");
  }
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(apply);}
const observer=new MutationObserver(schedule);
observer.observe(document.querySelector("#reader")||document.body,{childList:true,subtree:true});
reviewPromise.then(schedule);
window.VediniSourceReview=Object.freeze({version:VERSION,ready:reviewPromise});
})();
