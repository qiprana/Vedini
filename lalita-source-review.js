/* Expanded Lalita reading layer. Sanskrit, glosses and audio stay unchanged.
 * Reference metadata is retained in JSON, not repeated in reading panels.
 */
(function installSourceReview(){
"use strict";
if(window.VediniSourceReview)return;
const ROOT=new URL("./",document.currentScript.src),DATA=new URL("data/lalita/",ROOT);
const VERSION="20261023-complete-183-v2",nativeFetch=window.fetch.bind(window);
const BASE_FILES=["source-reviewed-meanings.json","source-reviewed-additions.json","source-reviewed-names-083-150.json","source-reviewed-names-151-200.json","source-reviewed-names-201-996.json"];
const EXPANDED_FILES=["expanded-verses-001-010.json","expanded-verses-011-020.json","expanded-verses-021-030.json","expanded-verses-031-040.json","expanded-verses-041-050.json","expanded-verses-051-100.json","expanded-verses-101-150.json","expanded-verses-151-183.json"];
const KN={overall:"\u0cb6\u0ccd\u0cb2\u0ccb\u0c95\u0ca6 \u0c92\u0c9f\u0ccd\u0c9f\u0cc1 \u0c85\u0cb0\u0ccd\u0ca5",deeper:"\u0c86\u0cb3\u0cb5\u0cbe\u0ca6 \u0c85\u0cb0\u0ccd\u0ca5",meditation:"\u0ca7\u0ccd\u0caf\u0cbe\u0ca8 \u0cb6\u0ccd\u0cb2\u0ccb\u0c95\u0ca6 \u0c92\u0c9f\u0ccd\u0c9f\u0cc1 \u0c85\u0cb0\u0ccd\u0ca5",pending_name:"\u0c88 \u0ca8\u0cbe\u0cae\u0ca6 \u0cb5\u0cbf\u0cb8\u0ccd\u0ca4\u0cc3\u0ca4 \u0cb5\u0cbf\u0cb5\u0cb0\u0ca3\u0cc6\u0caf\u0ca8\u0ccd\u0ca8\u0cc1 \u0caa\u0ccd\u0cb0\u0ca4\u0ccd\u0caf\u0cc7\u0c95\u0cb5\u0cbe\u0c97\u0cbf \u0caa\u0cb0\u0cbf\u0cb7\u0ccd\u0c95\u0cb0\u0cbf\u0cb8\u0cb2\u0cbe\u0c97\u0cc1\u0ca4\u0ccd\u0ca4\u0cbf\u0ca6\u0cc6.",pending_verse:"\u0c88 \u0cb6\u0ccd\u0cb2\u0ccb\u0c95\u0ca6 \u0cb5\u0cbf\u0cb8\u0ccd\u0ca4\u0cc3\u0ca4 \u0cb5\u0cbf\u0cb5\u0cb0\u0ca3\u0cc6\u0caf \u0caa\u0cb0\u0cbf\u0cb7\u0ccd\u0c95\u0cb0\u0ca3\u0cc6 \u0cac\u0cbe\u0c95\u0cbf\u0caf\u0cbf\u0ca6\u0cc6.",pending_meaning:"\u0c88 \u0cb6\u0ccd\u0cb2\u0ccb\u0c95\u0ca6 \u0c92\u0c9f\u0ccd\u0c9f\u0cc1 \u0c85\u0cb0\u0ccd\u0ca5\u0ca6 \u0caa\u0cb0\u0cbf\u0cb7\u0ccd\u0c95\u0cb0\u0ca3\u0cc6 \u0cac\u0cbe\u0c95\u0cbf\u0caf\u0cbf\u0ca6\u0cc6.",footer:"ಎಲ್ಲ 183 ಶ್ಲೋಕಗಳಿಗೆ ಒಟ್ಟು ಅರ್ಥ, ಸಂದರ್ಭಸಹಿತ ಆಳವಾದ ವಿವರಣೆ ಮತ್ತು ಎಲ್ಲಾ 1,000 ನಾಮಗಳಿಗೆ ಪ್ರತ್ಯೇಕ ಆಳವಾದ ಅರ್ಥಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ. ಧ್ವನಿಮುದ್ರಣಗಳನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಸೇರಿಸಬಹುದು.",error:"\u0c95\u0cc6\u0cb2\u0cb5\u0cc1 \u0caa\u0cb0\u0cbf\u0cb7\u0ccd\u0c95\u0cc3\u0ca4 \u0cb5\u0cbf\u0cb5\u0cb0\u0ca3\u0cc6\u0c97\u0cb3\u0cc1 \u0cb2\u0ccb\u0ca1\u0ccd \u0c86\u0c97\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0cb6\u0ccd\u0cb2\u0ccb\u0c95, \u0caa\u0ca6\u0cbe\u0cb0\u0ccd\u0ca5 \u0cae\u0ca4\u0ccd\u0ca4\u0cc1 \u0ca7\u0ccd\u0cb5\u0ca8\u0cbf \u0cb2\u0cad\u0ccd\u0caf\u0cb5\u0cbf\u0cb5\u0cc6; \u0cae\u0ca4\u0ccd\u0ca4\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf."};
let reviewed=null,scheduled=false;
const warnings=[],readings=new Map();
function validPair(p){return p&&typeof p.en==="string"&&p.en.trim()&&typeof p.kn==="string"&&p.kn.trim();}
async function readJSON(path){const r=await nativeFetch(new URL(path+"?v="+VERSION,DATA).href,{cache:"no-cache"});if(!r.ok)throw new Error(path+": HTTP "+r.status);return r.json();}
function validateBase(files){
 const result={names:files.flatMap(f=>f.names||[]),verses:files.flatMap(f=>f.verses||[]),sources:Object.assign({},...files.map(f=>f.sources||{}))};
 const ns=new Set(),vs=new Set();
 for(const n of result.names){if(!Number.isInteger(n.number)||n.number<1||n.number>1000||ns.has(n.number)||!validPair(n))throw new Error("Invalid name record");if((n.source_ids||[]).some(id=>!result.sources[id]))throw new Error("Missing name metadata");ns.add(n.number);}
 for(const v of result.verses){if(!Number.isInteger(v.verse_number)||v.verse_number<1||v.verse_number>183||vs.has(v.verse_number)||!validPair(v.meaning)||!validPair(v.deeper))throw new Error("Invalid existing verse");vs.add(v.verse_number);}
 return result;
}
function validateExpanded(files){
 const entries=files.flatMap(f=>f.verses||[]),seen=new Set(),ens=new Set(),kns=new Set();
 if(entries.length!==183)throw new Error("Expanded collection must contain 183 verses");
 for(const v of entries){
  if(!Number.isInteger(v.verse_number)||v.verse_number<1||v.verse_number>183||seen.has(v.verse_number)||!validPair(v.meaning)||!validPair(v.deeper))throw new Error("Invalid expanded verse");
  if(v.meaning.en===v.deeper.en||v.deeper.en.split(/\s+/).length<75||!v.deeper.en.includes("\n\n")||!v.deeper.kn.includes("\n\n"))throw new Error("Expanded explanation lacks depth or paragraphs");
  if(ens.has(v.deeper.en)||kns.has(v.deeper.kn))throw new Error("Repeated expanded explanation");
  seen.add(v.verse_number);ens.add(v.deeper.en);kns.add(v.deeper.kn);
 }
 for(let n=1;n<=183;n++)if(!seen.has(n))throw new Error("Missing expanded verse "+n);
 return entries;
}
function report(error){warnings.push(error.message);console.warn("Vedini meanings:",error.message);}
const basePromise=Promise.all(BASE_FILES.map(readJSON)).then(validateBase).catch(error=>{report(error);return {names:[],verses:[],sources:{}};});
const expandedPromise=Promise.all(EXPANDED_FILES.map(readJSON)).then(validateExpanded).catch(error=>{report(error);return [];});
const reviewPromise=Promise.all([basePromise,expandedPromise]).then(([base,expanded])=>{
 const merged=new Map(base.verses.map(v=>[v.verse_number,v]));
 for(const v of expanded){if(v.verse_number>50&&merged.has(v.verse_number))continue;merged.set(v.verse_number,{...v,explanation_status:"original_expanded_editorial",expanded:true});}
 reviewed={...base,verses:[...merged.values()].sort((a,b)=>a.verse_number-b.verse_number),expanded_count:expanded.length};return reviewed;
});
function jsonResponse(v){return new Response(JSON.stringify(v),{status:200,headers:{"Content-Type":"application/json; charset=utf-8"}});}
function withoutOldInterpretations(v){if(Array.isArray(v))return v.map(withoutOldInterpretations);if(v&&typeof v==="object"){const clean={};for(const [k,x] of Object.entries(v))if(k!=="traditional_interpretation")clean[k]=withoutOldInterpretations(x);return clean;}return v;}
window.fetch=async function sourceAwareFetch(input,init){
 let url;try{url=new URL(typeof input==="string"?input:(input instanceof URL?input.href:input.url),location.href);}catch(_){return nativeFetch(input,init);}
 const method=(init?.method||(typeof input==="object"&&input.method)||"GET").toUpperCase();
 if(method!=="GET"||url.origin!==DATA.origin||!url.pathname.startsWith(DATA.pathname))return nativeFetch(input,init);
 const path=url.pathname.slice(DATA.pathname.length);
 if(path.startsWith("source-reviewed-")||path.startsWith("expanded-verses-")||path.includes("dhyana"))return nativeFetch(input,init);
 const content=await reviewPromise,range=path.match(/^deeper-meanings-(\d+)-(\d+)\.json$/);
 if(range){const first=Number(range[1]),last=Number(range[2]);return jsonResponse({names:content.names.filter(n=>n.number>=first&&n.number<=last),verses:first===1?content.verses.map(v=>({verse_number:v.verse_number,en:v.deeper.en,kn:v.deeper.kn})):[]});}
 if(/^deeper-overall-\d+-\d+\.json$/.test(path))return jsonResponse({verses:[]});
 const response=await nativeFetch(input,init);if(!response.ok||!path.endsWith(".json"))return response;
 let value;try{value=await response.clone().json();}catch(_){return response;}
 value=withoutOldInterpretations(value);
 if(/^verses\/verse-\d{3}\.json$/.test(path)){readings.set(value.verse_number,value);const v=content.verses.find(v=>v.verse_number===value.verse_number);if(v)value.meaning={...(value.meaning||{}),english:v.meaning.en,kannada:v.meaning.kn};}
 return jsonResponse(value);
};
const style=document.createElement("style");style.textContent=`.source-review-links{display:none!important}.source-review-status{font-size:.87em;line-height:1.6;opacity:.8}.source-overall-meaning{padding:0 0 1.25rem;margin:0 0 1.25rem;border-bottom:1px solid rgba(58,92,70,.2)}.source-overall-meaning h3{margin-top:0}.source-overall-meaning p,.source-reviewed-block p{line-height:1.85;overflow-wrap:break-word}.source-overall-meaning p+p,.source-reviewed-block p+p{margin-top:1em}.source-review-notice{font-size:.9rem;line-height:1.65;max-width:85ch}.reader-page .verse-meaning-panel{min-width:0}`;document.head.append(style);
function isKannada(){return document.querySelector("#kn")?.getAttribute("aria-pressed")==="true";}
function text(en,kn){return isKannada()?kn:en;}
function el(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value)e.textContent=value;return e;}
function paragraphs(parent,value){for(const p of String(value||"").split(/\n\s*\n/).filter(Boolean))parent.append(el("p","",p));}
function pending(level,forVerse=false){const b=el("div","deeper-reading source-reviewed-block");b.append(el(level,"",text("Deeper meaning",KN.deeper)),el("p","source-review-status",forVerse?text("A fuller explanation of this verse is awaiting revision.",KN.pending_verse):text("This name's fuller explanation is being revised separately.",KN.pending_name)));return b;}
function applyName(detail){
 const n=Number(detail.dataset.detailId.slice(5)),inner=detail.querySelector(".study-inner");if(!inner)return;
 inner.querySelectorAll(":scope > .deeper-reading").forEach(e=>e.remove());const name=reviewed.names.find(x=>x.number===n);if(!name){inner.append(pending("h4"));return;}
 const b=el("div","deeper-reading source-reviewed-block");b.dataset.reviewed="true";b.append(el("h4","",text("Deeper meaning",KN.deeper)));paragraphs(b,isKannada()?name.kn:name.en);inner.append(b);
}
function applyOverall(card,n){
 const lesson=card.querySelector(".verse-meaning-panel .verse-lesson");if(!lesson)return;
 if(card.id.startsWith("dhyana-")){const d=lesson.querySelector(".verse-overall-meaning");if(d){d.open=true;const label=d.querySelector("summary");if(label)label.textContent=text("Overall meditation meaning",KN.meditation);lesson.prepend(d);}return;}
 const item=reviewed.verses.find(v=>v.verse_number===n),original=readings.get(n);
 const existing=lesson.querySelector(".verse-overall-meaning p")?.textContent||(isKannada()?original?.meaning?.kannada:original?.meaning?.english)||"";
 const meaning=item?(isKannada()?item.meaning.kn:item.meaning.en):existing;lesson.replaceChildren();
 const overall=el("section","source-overall-meaning");overall.append(el("h3","",text("Overall \u015bloka meaning",KN.overall)));
 if(meaning)paragraphs(overall,meaning);else overall.append(el("p","source-review-status",text("The overall meaning for this verse is awaiting revision.",KN.pending_meaning)));lesson.append(overall);
 if(item){const deep=el("section","deeper-reading source-reviewed-block");deep.dataset.reviewed="true";if(item.expanded)deep.dataset.expanded="true";deep.append(el("h3","",text("Deeper meaning",KN.deeper)));paragraphs(deep,isKannada()?item.deeper.kn:item.deeper.en);lesson.append(deep);}else lesson.append(pending("h3",true));
}
function apply(){
 scheduled=false;if(!reviewed)return;const key=VERSION+(isKannada()?"-kn":"-en");
 document.querySelectorAll(".vedini-study-card").forEach(card=>{if(card.dataset.sourceReview===key)return;card.dataset.sourceReview=key;card.querySelectorAll(".name-details[data-detail-id^='name-']").forEach(applyName);applyOverall(card,Number(card.id.split("-").pop()));const meta=card.querySelector(":scope > .meta");if(meta&&!card.id.startsWith("dhyana-"))meta.hidden=true;});
 const footer=document.querySelector(".reader-page .foot");if(footer){const notice=warnings.length?text("Some revised explanations could not be loaded. Slokas, word meanings and audio remain available; refresh to retry.",KN.error):text("All 183 ślokas have overall meanings, contextual deeper explanations, and complete individual-name deeper-meaning coverage. Audio may still be added separately.",KN.footer);if(footer.textContent!==notice)footer.textContent=notice;footer.classList.add("source-review-notice");}
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(apply);}
const observer=new MutationObserver(schedule);observer.observe(document.querySelector("#reader")||document.body,{childList:true,subtree:true});reviewPromise.then(schedule);
window.VediniSourceReview=Object.freeze({version:VERSION,ready:reviewPromise});
})();
