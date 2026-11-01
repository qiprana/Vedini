(function application(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const langText=(en,kn)=>language==="kn"?kn:en;
let verses=[],dhyana=[],nameData={},dhyanaData={},verseData={},dhyanaPhraseData={},language="en",searchTerm="",highlightTerm="";
let spiritualBenefits={},namaMantras={},significanceRewrites={},nameBenefits={};
const pageSize=1,plannedVerses=183;
let view="verses",pageIndex=0,selectedVerse=1;
let lastSearch=null;
let readerMode="study";
const fullMeanings=new Map();
let activeAudioElement=null;
function claimAudioFocus(audio){
 if(!audio)return;
 if(practice.active&&audio!==$("#practice-audio"))practiceStop("Stopped for other audio");
 if(guided.active&&audio!==$("#guided-audio"))guidedStop("Stopped for other audio");
 stopSlokaMss();
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
async function fetchJSON(p){const r=await fetch("../data/"+p,{cache:"no-store"});if(!r.ok)throw new Error("Missing "+p);return r.json()}
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
function highlightedPair(value,counterpart){
 const q=norm(highlightTerm.trim());
 if(q&&!norm(value).includes(q)&&norm(counterpart).includes(q))return "<mark class='search-hit'>"+esc(value)+"</mark>";
 return highlighted(value);
}
function wordsGrid(parts){
 if(!parts?.length)return "<p class='small-note'>"+esc(langText("This word is awaiting editorial analysis.","ಈ ಪದದ ಅರ್ಥಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ."))+"</p>";
 return "<div class='word-grid glossary' role='list'>"+parts.map(c=>{
  const written=language==="kn"?kannadaFromDevanagari(c.dev):c.dev;
  return "<div class='word-row glossary-row' role='listitem'><div class='word-original'><strong class='word-dev'>"+highlighted(written)+"</strong><span class='word-iast'>"+highlighted(c.iast)+"</span></div><div class='word-translation'>"+highlightedPair(c[language]||"",c[language==="kn"?"en":"kn"]||"")+"</div></div>";
 }).join("")+"</div>";
}
let kannadaNameForms=[];
function proseInKannadaScript(value){
 let result=String(value??"");
 if(language!=="kn")return result;
 for(const entry of kannadaNameForms){
  result=result.replace(entry.regex,(match,lead)=>lead+entry.kannada);
 }
 // Transliterate IAST Sanskrit words in Kannada prose; ordinary English stays untouched.
 result=result.replace(/[A-Za-zāīūṛṝḷṅñṭḍṇśṣṃṁḥ]+(?:-[A-Za-zāīūṛṝḷṅñṭḍṇśṣṃṁḥ]+)*/gu,token=>{
  if(!/[āīūṛṝḷṅñṭḍṇśṣṃṁḥ]/u.test(token))return token;
  return kannadaFromDevanagari(iastToDevanagari(token.toLowerCase()));
 });
 return result;
}
function richParagraphs(value){
 return proseInKannadaScript(value).split("\n\n").map(p=>p.trim()).filter(Boolean).map(p=>"<p>"+esc(p).replace(/\*([^*]+)\*/g,"<em>$1</em>").replace(/\n/g," ")+"</p>").join("");
}
// One flowing "Significance" reading per name: the rewritten text when
// available, otherwise the earlier spiritual and human notes without repeats.
function significanceText(number){
 const rewrite=significanceRewrites[number]?.significance?.[language];
 if(rewrite)return rewrite;
 const data=spiritualBenefits[number]||{};
 const parts=[data.spiritual_significance?.[language],data.human_significance?.[language]].map(t=>(t||"").trim()).filter(Boolean);
 const unique=parts.filter((t,i)=>parts.indexOf(t)===i);
 return unique.length?unique.join("\n\n"):(data.explanation?.[language]||"");
}
function significanceToggle(number){
 const text=significanceText(number);
 if(!text)return "";
 return "<details class='meaning-toggle name-significance' data-detail-id='name-significance-"+number+"'>"
  +"<summary>"+esc(langText("Meaning & significance","ಅರ್ಥ ಮತ್ತು ಮಹತ್ವ"))+"</summary>"
  +"<div class='deeper-reading'>"+richParagraphs(text)+"</div></details>";
}
function inlineNameMantra(number){
 const item=namaMantras[number];
 if(!item)return "";
 const written=language==="kn"?kannadaFromDevanagari(item.dev):item.dev;
 return "<span class='name-mantra-inline' lang='"+(language==="kn"?"kn":"sa")+"'>"+highlightedPair(written,language==="kn"?item.iast:item.dev)+"</span>";
}
// Carry the name's chanting hyphens into its Nāmāvalī mantra. Spellings are
// compared letter by letter (an anusvāra matches a nasal + virāma); if they
// part ways before the last hyphen, the mantra is left unhyphenated.
function withNameHyphens(mantra,hyphenated){
 const text=String(mantra||""),name=String(hyphenated||"");
 if(!name.includes("-"))return text;
 const nasal=/^([ङञणनम]्|[ṅñṇnm])/,anusvara=/[ंṃ]/,same=(x,y)=>x.toLowerCase()===y.toLowerCase();
 const start=text.indexOf(" ")+1;
 let out=text.slice(0,start),i=start,j=0;
 while(j<name.length){
  const ch=name[j];
  if(ch==="-"){out+="-";j++;continue;}
  if(i<text.length&&same(text[i],ch)){out+=text[i++];j++;continue;}
  const textNasal=text.slice(i).match(nasal),nameNasal=name.slice(j).match(nasal);
  if(anusvara.test(ch)&&textNasal){out+=textNasal[0];i+=textNasal[0].length;j++;continue;}
  if(anusvara.test(text[i]||"")&&nameNasal){out+=text[i++];j+=nameNasal[0].length;continue;}
  break;
 }
 if(name.slice(j).includes("-"))return text;
 return out.replace(/-+$/,"")+text.slice(i);
}
// Nāmāvalī for every name in a śloka, shown under the śloka reading.
function namavaliPanel(v){
 const items=(v.names||[]).map(n=>[n,namaMantras[n.studyNumber]]).filter(([,item])=>item);
 if(!items.length)return "";
 const lang=language==="kn"?"kn":"sa";
 return "<div class='reading-label namavali-heading'>"+esc(langText("Nāmāvalī","ನಾಮಾವಳಿ"))+"</div><ul class='verse-namavali'>"+items.map(([n,item])=>{
  const original=nameWithOriginalVerseHyphens(v,n);
  const dev=withNameHyphens(item.dev,original.dev);
  const written=language==="kn"?kannadaFromDevanagari(dev):dev;
  return "<li class='namavali-item' data-name='"+esc(n.studyNumber)+"'><strong lang='"+lang+"' class='mantra-script'>"+highlightedPair(written,language==="kn"?item.iast:item.dev)+"</strong>"
   +(language==="kn"?"":"<span class='mantra-iast'>"+highlighted(withNameHyphens(item.iast,original.roman))+"</span>")+"</li>";
 }).join("")+"</ul>";
}
// Keep a single concise meaning-and-significance reading per divine name.
function studySections(info,parts,nameNumber){
 return "<div class='study-inner'><h4>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h4>"+wordsGrid(parts)+significanceToggle(nameNumber)+"</div>";
}
function makeAudio(v,isDhyana){
 const attrs="data-dock-verse='"+v.verse_number+"' data-dock-dhyana='"+(isDhyana?"1":"0")+"'";
 return "<span class='verse-chant-actions'><button type='button' class='dock-verse-shortcut' "+attrs+" aria-pressed='false'>▶ Chant here</button><button type='button' class='dock-verse-stop' "+attrs+" aria-label='"+esc(langText("Stop chanting this śloka","ಈ ಶ್ಲೋಕದ ಪಠಣವನ್ನು ನಿಲ್ಲಿಸಿ"))+"' disabled hidden>■ Stop</button></span>";
}
function legacyMakeAudio(v,isDhyana){
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
 const sources=verseMssAudioPaths(v);
 const button=sources.length
  ?"<button type='button' class='dhyana-play-all sloka-mss-play-all' data-sloka-mss='"+esc(sources.join("|"))+"' aria-label='"+esc(langText("Play all MSS for śloka "+v.verse_number,"ಶ್ಲೋಕ "+v.verse_number+" MSS ಪಠಣ ಪ್ಲೇ ಮಾಡಿ"))+"'>▶ "+esc(langText("Play all MSS","ಎಲ್ಲಾ MSS ಪ್ಲೇ ಮಾಡಿ"))+"</button>"
  :"";
 const repeat=sources.length?"<label class='sloka-mss-setting'>"+esc(langText("Repeat","ಪುನರಾವರ್ತನೆ"))+" <select class='sloka-mss-repeat' aria-label='"+esc(langText("MSS repeat count","MSS ಪುನರಾವರ್ತನೆ"))+"'><option value='1'>"+esc(langText("Once","ಒಮ್ಮೆ"))+"</option><option value='2'>"+esc(langText("Twice","ಎರಡು ಬಾರಿ"))+"</option><option value='3'>"+esc(langText("3 times","ಮೂರು ಬಾರಿ"))+"</option><option value='loop'>"+esc(langText("Continuous","ನಿರಂತರ"))+"</option></select></label>":"";
 const other="<span class='sloka-voice-buttons'><button type='button' class='sloka-voice-play' data-voice-src='"+esc(url)+"' aria-label='Play VD recording'>▶ VD</button><button type='button' class='sloka-voice-play' data-voice-src='"+esc(url.replace("/VD/","/KMP/"))+"' aria-label='Play KMP recording'>▶ KMP</button></span>";
 return "<div class='sloka-mss-actions'>"+button+repeat+other+"<span class='sloka-mss-status' role='status' aria-live='polite'></span></div>";
}
const MSS_LAST_CLIP=739;
function mssClipPath(clip){
 return "../audio/lalita/verses/MSS/phrase_"+String(clip).padStart(4,"0")+".mp3";
}
const MSS_REVIEWED_NAME_AUDIO_160_1000={
 160:[202],
 162:[203],
 164:[204],
 166:[205],
 168:[206],
 170:[207],
 172:[208],
 174:[209],
 176:[210],
 178:[211],
 180:[212],
 182:[213],
 184:[214],
 186:[215],
 188:[216],
 191:[217],
 193:[218],
 196:[219],
 198:[220],
 199:[221],
 200:[222],
 203:[223],
 204:[224],
 205:[225],
 206:[226],
 208:[227],
 209:[228],
 212:[229],
 213:[230],
 214:[231],
 215:[232],
 217:[233],
 219:[234],
 221:[235],
 224:[236],
 226:[237],
 228:[238],
 230:[239],
 231:[240],
 232:[241,242],
 233:[243],
 234:[244],
 235:[245],
 236:[246],
 237:[247,248],
 238:[249],
 240:[250],
 241:[251],
 243:[252],
 244:[253],
 245:[254],
 246:[255],
 248:[256],
 249:[257],
 250:[258],
 252:[259],
 253:[260],
 254:[261],
 255:[262],
 256:[263],
 258:[264],
 260:[265],
 263:[266],
 264:[267],
 266:[268],
 268:[269],
 270:[270],
 272:[271],
 273:[272],
 275:[273],
 276:[274],
 278:[275],
 280:[276],
 281:[277,278],
 282:[279],
 283:[280],
 285:[281],
 286:[282],
 287:[283],
 288:[284],
 289:[285,286],
 290:[287,288],
 291:[289],
 293:[290],
 295:[291],
 297:[292],
 298:[293],
 300:[294],
 302:[295],
 305:[296],
 307:[297],
 309:[298],
 312:[299],
 313:[300],
 315:[301],
 318:[302],
 321:[303],
 323:[304],
 324:[305],
 326:[306],
 327:[307],
 329:[308],
 331:[309],
 333:[310],
 334:[311],
 336:[312],
 337:[313],
 339:[314],
 341:[315],
 343:[316],
 344:[317],
 345:[318],
 346:[319],
 349:[320],
 350:[321],
 352:[322],
 353:[323],
 354:[324],
 355:[325],
 357:[326,327],
 358:[328],
 360:[329],
 362:[330],
 364:[331],
 365:[332,333],
 366:[334],
 368:[335],
 370:[336],
 372:[337],
 373:[338],
 374:[339],
 376:[340],
 377:[341],
 379:[342],
 380:[343],
 381:[344],
 382:[345],
 383:[346],
 384:[347],
 386:[348],
 387:[349],
 388:[350],
 390:[351],
 391:[352],
 392:[353],
 393:[354],
 395:[355],
 397:[356],
 399:[357],
 400:[358],
 402:[359],
 403:[360,361],
 404:[362,363],
 405:[364],
 407:[365],
 409:[366],
 411:[367],
 413:[368],
 415:[369],
 416:[370],
 418:[371],
 420:[372],
 423:[373],
 424:[374],
 428:[375],
 429:[376],
 431:[377],
 432:[378],
 433:[379],
 434:[380],
 435:[381],
 436:[382],
 438:[383],
 440:[384],
 441:[385],
 442:[386],
 443:[387],
 447:[388],
 449:[389],
 451:[390],
 452:[391],
 453:[392,393],
 455:[394],
 458:[395],
 459:[396],
 462:[397],
 465:[398],
 468:[399],
 470:[400],
 471:[401],
 472:[402],
 474:[403],
 475:[404],
 476:[405],
 478:[406],
 479:[407],
 480:[408],
 482:[409],
 483:[410],
 484:[411],
 485:[412],
 486:[413],
 488:[414],
 490:[415],
 491:[416],
 492:[417],
 493:[418],
 494:[419],
 495:[420],
 496:[421],
 497:[422],
 498:[423],
 499:[424],
 501:[425],
 502:[426],
 503:[427],
 504:[428],
 505:[429],
 506:[430],
 507:[431],
 509:[432],
 511:[433],
 512:[434],
 513:[435],
 514:[436],
 515:[437],
 517:[438],
 518:[439],
 519:[440],
 520:[441],
 521:[442],
 522:[443],
 524:[444],
 525:[445],
 527:[446],
 528:[447],
 529:[448],
 530:[449],
 532:[450],
 533:[451],
 534:[452],
 535:[453],
 539:[454],
 542:[455],
 545:[456],
 546:[457],
 548:[458],
 550:[459],
 551:[460],
 552:[461],
 553:[462],
 554:[463],
 556:[464],
 558:[465],
 559:[466],
 560:[467],
 561:[468],
 564:[469],
 566:[470],
 567:[471],
 569:[472],
 571:[473],
 572:[474],
 574:[475],
 575:[476],
 577:[477],
 578:[478],
 579:[479],
 580:[480],
 582:[481],
 583:[482],
 585:[483],
 587:[484],
 590:[485,486],
 591:[487],
 593:[488],
 595:[489],
 597:[490],
 598:[491],
 599:[492],
 600:[493],
 601:[494],
 602:[495],
 604:[496],
 606:[497],
 607:[498],
 608:[499],
 609:[500],
 610:[501,502],
 611:[503],
 613:[504],
 614:[505,506],
 615:[507],
 618:[508],
 620:[509],
 621:[510],
 622:[511],
 625:[512],
 626:[513],
 628:[514],
 631:[515],
 632:[516],
 633:[517],
 635:[518],
 637:[519],
 639:[520],
 641:[521],
 643:[522],
 645:[523],
 646:[524],
 647:[525,526],
 650:[527],
 652:[528],
 653:[529],
 656:[530],
 658:[531,532],
 659:[533],
 661:[534],
 662:[535],
 664:[536],
 665:[537],
 667:[538],
 669:[539],
 672:[540],
 673:[541],
 676:[542],
 678:[543],
 680:[544],
 681:[545],
 683:[546],
 684:[547],
 685:[548],
 688:[549],
 689:[550],
 690:[551],
 692:[552],
 693:[553],
 695:[554],
 697:[555],
 698:[556],
 700:[557],
 701:[558],
 702:[559],
 705:[560],
 707:[561],
 708:[562],
 709:[563],
 710:[564],
 713:[565],
 714:[566],
 716:[567],
 719:[568],
 721:[569],
 723:[570],
 725:[571,572,573],
 728:[574],
 730:[575],
 732:[576],
 733:[577],
 735:[578],
 736:[579],
 738:[580],
 740:[581],
 743:[582,583],
 744:[584],
 745:[585],
 746:[586],
 747:[587],
 748:[588],
 749:[589],
 750:[590],
 752:[591],
 754:[592],
 756:[593],
 757:[594],
 759:[595],
 760:[596],
 762:[597],
 764:[598],
 765:[599],
 767:[600],
 769:[601],
 771:[602],
 773:[603],
 775:[604],
 777:[605],
 779:[606],
 781:[607],
 784:[608],
 785:[609],
 786:[610],
 787:[611],
 790:[612],
 791:[613],
 792:[614],
 793:[615],
 795:[616],
 797:[617],
 800:[618],
 801:[619],
 804:[620],
 806:[621],
 808:[622],
 810:[623],
 812:[624],
 813:[625],
 816:[626],
 817:[627],
 819:[628],
 821:[629],
 824:[630],
 826:[631],
 829:[632],
 831:[633],
 833:[634],
 834:[635],
 836:[636],
 838:[637],
 840:[638],
 841:[639],
 843:[640],
 844:[641],
 846:[642],
 848:[643],
 851:[644,645],
 852:[646],
 853:[647],
 854:[648],
 856:[649],
 858:[650],
 860:[651],
 862:[652],
 863:[653],
 864:[654],
 865:[655],
 866:[656],
 868:[657],
 870:[658],
 871:[659],
 872:[660],
 874:[661],
 876:[662],
 878:[663],
 880:[664,665],
 881:[666],
 883:[667],
 884:[668],
 886:[669],
 887:[670],
 889:[671],
 890:[672],
 892:[673],
 894:[674],
 896:[675],
 898:[676],
 900:[677],
 902:[678],
 904:[679],
 906:[680],
 908:[681],
 909:[682],
 911:[683],
 912:[684],
 913:[685],
 914:[686],
 916:[687],
 918:[688],
 919:[689],
 920:[690],
 922:[691],
 923:[692],
 924:[693],
 925:[694],
 926:[695],
 927:[696],
 929:[697],
 930:[698],
 932:[699],
 934:[700],
 936:[701],
 938:[702],
 940:[703],
 942:[704],
 944:[705],
 946:[706],
 947:[707],
 948:[708],
 950:[709],
 951:[710],
 953:[711],
 955:[712],
 958:[713],
 960:[714],
 962:[715],
 964:[716],
 965:[717],
 967:[718],
 969:[719],
 971:[720],
 972:[721],
 974:[722],
 976:[723],
 977:[724],
 978:[725],
 980:[726],
 981:[727],
 982:[728],
 984:[729],
 989:[730],
 990:[731],
 991:[732],
 992:[733],
 994:[734],
 995:[735],
 996:[736],
 997:[737],
 998:[738],
 1000:[739]
};
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
 if(n===41)return [92,93];
 if(n===42)return [94];
 if(n===43)return [95];
 if(n===44)return [96,97];
 if(n===45)return [98,99];
 if(n===46)return [100,101];
 if(n===47)return [102];
 if(n===48)return [103];
 if(n===49)return [104];
 if(n===50)return []; // Combined with name 49, using clip 104.
 if(n===53)return [107]; // Combined display for names 53-54.
 if(n===54)return []; // Clip 107 belongs to the shared 53-54 card.
 if(n===55)return [108];
 if(n===56)return [109];
 if(n===57)return [110];
 if(n===58)return [111];
 if(n===59)return [112];
 if(n===60)return [113];
 if(n===61)return [114];
 if(n===62)return [115]; // Combined display for names 62-63.
 if(n===63)return []; // Clip 115 belongs to the shared 62-63 card.
 if(n===64)return [116,117];
 if(n===65)return [118,119];
 if(n===66)return [120,121];
 if(n===67)return [122,123];
 if(n===68)return [124,125];
 if(n===69)return [126,127];
 if(n===70)return [128,129];
 if(n===71)return [130,131];
 if(n===73)return [133,134];
 if(n===74)return [135,136];
 if(n===75)return [137,138];
 if(n===77)return [140,141];
 if(n===78)return [142,143];
 if(n===79)return [144];
 if(n===80)return [145,146];
 if(n===81)return [147,148];
 if(n===82)return [149,150];
 if(n===83)return [151];
 if(n===84)return [152,153];
 if(n===85)return [154,155];
 if(n===86)return [156,157];
 if(n===87)return [158,159];
 if(n===88)return [160];
 if(n===89)return [161];
 if(n===90)return [162];
 if(n===91)return [163];
 if(n===92)return [164]; // Shared clip for names 92-93.
 if(n===93)return []; // Included in combined 92-93 card.
 if(n===94)return [165]; // One clip for combined 94-96.
 if(n===95||n===96)return []; // Included in combined 94-96 card.
 if(n===97)return [166]; // One clip for combined 97-98.
 if(n===98)return []; // Included in combined 97-98 card.
 if(n>=99&&n<=108)return [n+68]; // Names 99-108 map to 167-176.
 if(n===109)return []; // Included in combined 108-109 card.
 if(n===110)return [177]; // Combined 110-111.
 if(n===111)return [];
 if(n===112)return [178]; // Combined 112-113.
 if(n===113)return [];
 if(n===114)return [179];
 if(n===115)return [180]; // Combined 115-116.
 if(n===116)return [];
 if(n===117)return [181];
 if(n===118)return [182]; // Combined 118-119.
 if(n===119)return [];
 if(n===120)return [183]; // Combined 120-121.
 if(n===121)return [];
 if(n===122)return [184]; // Combined 122-123.
 if(n===123)return [];
 if(n===124)return [185]; // Combined 124-125.
 if(n===125)return [];
 // Hand-checked MSS phrase mapping for divine names 126-159.
 if(n===126)return [186];
 if(n===127)return []; // No MSS clip in the handwritten mapping.
 if(n===128)return []; // No MSS clip in the handwritten mapping.
 if(n===129)return [187];
 if(n===130)return [188];
 if(n===131)return [189];
 if(n===132)return []; // No MSS clip in the handwritten mapping.
 if(n===133)return []; // No MSS clip in the handwritten mapping.
 if(n===134)return [190];
 if(n===135)return []; // Included in the preceding combined name card.
 if(n===136)return []; // Included in the preceding combined name card.
 if(n===137)return [191];
 if(n===138)return []; // Included in the preceding combined name card.
 if(n===139)return [192];
 if(n===140)return []; // Included in the preceding combined name card.
 if(n===141)return []; // Included in the preceding combined name card.
 if(n===142)return [193];
 if(n===143)return []; // Included in the preceding combined name card.
 if(n===144)return [194];
 if(n===145)return []; // Included in the preceding combined name card.
 if(n===146)return [195];
 if(n===147)return []; // Included in the preceding combined name card.
 if(n===148)return [196];
 if(n===149)return []; // Included in the preceding combined name card.
 if(n===150)return [197];
 if(n===151)return []; // Included in the preceding combined name card.
 if(n===152)return [198];
 if(n===153)return []; // Included in the preceding combined name card.
 if(n===154)return [199];
 if(n===155)return []; // Included in the preceding combined name card.
 if(n===156)return [200];
 if(n===157)return []; // Included in the preceding combined name card.
 if(n===158)return [201];
 if(n===159)return []; // Included in the preceding combined name card.
 // Reviewed MSS assignments from handwritten sheets: divine names 160-589.
 // Every divine name remains an individual row. A shared phrase clip belongs
 // to the first name in its bracket, with no audio button on the following names.
 // Names without a specified clip (including 410 and 430) are left unassigned.
 // Names 452 onward remain unassigned pending review.
 if(n>=160)return MSS_REVIEWED_NAME_AUDIO_160_1000[n]||[];
 const clip=n<=11?n+32:n<=19?n+37:n<=21?n+39:n<=24?n+41:n<=32?n+44:n<=40?n+51:n<=71?n+54:n<=72?n+60:n<=76?n+63:n<=93?n+71:n<=109?n+67:n<=125?n+60:n+42;
 return clip<=MSS_LAST_CLIP?[clip]:[];
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
// Use hyphenation already present in the authoritative śloka reading.
// Never invent breaks or combine separate divine names.
function nameWithOriginalVerseHyphens(v,n){
 const reading=v.reading||{};
 const originalDev=n.display_devanagari||n.sanskrit||"";
 const originalRoman=n.display_iast||n.iast||"";
 const clean=(value,roman)=>{
  let s=String(value??"").replace(/[-\s]/g,"");
  if(roman)s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return s;
 };
 const words=(lines,roman)=>(lines||[]).map(line=>String(line).split(/\s+/)
  .filter(token=>roman?/[\p{L}]/u.test(token)&&!/[०-९0-9]/u.test(token):/[\u0900-\u0963]/u.test(token)&&!/[०-९]/u.test(token)));
 const devWords=words(reading.devanagari,false);
 const romanWords=words(reading.iast,true);
 function matchWord(lines,wanted,roman){
  for(let i=0;i<lines.length;i++){
   for(let j=0;j<lines[i].length;j++){
    const word=lines[i][j];
    if(word.includes("-")&&clean(word,roman)===clean(wanted,roman))
     return {i,j,text:word};
   }
  }
  return null;
 }
 const d=matchWord(devWords,originalDev,false);
 const r=matchWord(romanWords,originalRoman,true);
 // Only use the parallel token if the original Devanagari or IAST matched.
 const dev=d?.text||(r&&devWords[r.i]?.[r.j]?.includes("-")?devWords[r.i][r.j]:originalDev);
 const roman=r?.text||(d&&romanWords[d.i]?.[d.j]?.includes("-")?romanWords[d.i][d.j]:originalRoman);
 return {dev,roman};
}
function inlineWisdomInsight(number){
 const data=spiritualBenefits[number]||{},benefit=nameBenefits[number];
 const phrase=significanceRewrites[number]?.short?.[language]||data.title?.[language]||"";
 const sourced=benefit?.source==="sanskrit_channel_screenshot";
 const benefitLabel=sourced?langText("Benefit from The Sanskrit Channel","ಸಂಸ್ಕೃತ ಚಾನೆಲ್‌ನ ಪ್ರಯೋಜನ"):langText("Suggested benefit","ಸೂಚಿಸಲಾದ ಪ್ರಯೋಜನ");
 const significance=phrase?"<span class='name-inline-wisdom' lang='"+(language==="kn"?"kn":"en")+"'><span class='name-inline-wisdom-label' aria-hidden='true'>✧</span><span class='name-inline-wisdom-theme'>"+highlighted(phrase)+"</span></span>":"";
 const benefitLine=benefit?"<span class='name-benefit-line' data-benefit-source='"+esc(benefit.source)+"' title='"+esc(benefitLabel)+"'><span class='name-benefit-text' lang='en'>"+highlighted(benefit.en)+"</span></span>":"";
 return "<span class='name-compact-meta'>"+significance+benefitLine+"</span>";
}
function nameSection(v){
 const names=v.names||[];
 let html="<section class='name-section' aria-label='"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"'><div class='section-title'><h3>"+esc(langText("Divine names","ದೇವಿಯ ನಾಮಗಳು"))+"</h3><span>"+names.length+" "+esc(langText("names","ನಾಮಗಳು"))+"</span><small class='name-insight-key'>✧ "+esc(langText("Significance","ಮಹತ್ವ"))+"</small></div><div class='name-study-list'>";
 for(const n of names){
  // Always show every divine name in its own row, even if the MSS recording spans more than one name.
  const number=n.studyNumber;
  const info=nameData[number]||{},parts=findComponents(v,n,info);
  const original=nameWithOriginalVerseHyphens(v,n);
  const written=language==="kn"?kannadaFromDevanagari(original.dev):original.dev;
  const roman=original.roman;
  const essential=language==="kn"?(n.kannada||anyMeaning(info,"essential_meaning")||n.english||""):(anyMeaning(info,"essential_meaning")||n.english||"");
  const pairedEssential=language==="kn"?(info.essential_meaning?.en||n.english||""):(n.kannada||info.essential_meaning?.kn||"");
  const sections=studySections(info,parts,number);
  // A shared phrase's assigned name has a button; names with no clip have none.
  const clips=nameAudioClips(number);
  const audio=clips.length
   ?"<button type='button' class='name-audio-button' data-name-clips='"+esc(clips.join(","))+"' aria-pressed='false' aria-label='"+esc(langText("Play MSS for name "+number,"ನಾಮ "+number+" MSS ಧ್ವನಿಯನ್ನು ಪ್ಲೇ ಮಾಡಿ"))+"' title='"+esc(langText("Play name","ನಾಮವನ್ನು ಪ್ಲೇ ಮಾಡಿ"))+"'>♪</button>"
   :"";
  html+="<div class='name-audio-card'>"+audio+"<details class='name-details compact-name-row' data-detail-id='name-"+number+"'><summary><span class='name-summary-grid'><span class='name-identity-inline'><span class='name-number'>"+esc(number)+".</span><span class='name-written'>"+highlighted(written)+"</span><span class='name-roman'>"+highlighted(roman)+"</span></span><span class='name-essence'>"+highlightedPair(essential,pairedEssential)+"</span><span class='name-inline-wisdom-slot'>"+inlineWisdomInsight(number)+"</span></span></summary>"+sections+"</details></div>";
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
// Lightweight, shared player for the small divine-name buttons.
// Short MSS clips play in their recorded order without downloading or merging every clip.
let nameAudioPlayer=null,nameAudioActiveButton=null,nameAudioQueue=[],nameAudioIndex=0;
function stopNameAudio(){
 if(nameAudioPlayer){
  nameAudioPlayer.pause();
  nameAudioPlayer.removeAttribute("src");
  nameAudioPlayer.load();
 }
 if(nameAudioActiveButton){nameAudioActiveButton.classList.remove("playing");nameAudioActiveButton.setAttribute("aria-pressed","false");}
 nameAudioActiveButton=null;nameAudioQueue=[];nameAudioIndex=0;
}
function initNameAudio(){
 document.querySelectorAll(".name-audio-button[data-name-clips]").forEach(button=>{
  if(button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",event=>{
   event.preventDefault();
   event.stopPropagation();
   if(nameAudioActiveButton===button&&nameAudioPlayer&&!nameAudioPlayer.paused){
    stopNameAudio();
    return;
   }
   stopNameAudio();
   // Playing a name takes over from any active full-range chanting session.
   if(practice.active)practiceStop("Stopped for name recording");
   nameAudioQueue=button.dataset.nameClips.split(",").map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=MSS_LAST_CLIP).map(mssClipPath);
   if(!nameAudioQueue.length)return;
   if(!nameAudioPlayer){
    nameAudioPlayer=document.createElement("audio");
    nameAudioPlayer.preload="none";
    installAudioFocus(nameAudioPlayer);
    nameAudioPlayer.addEventListener("ended",()=>{
     if(!nameAudioActiveButton)return;
     if(nameAudioIndex+1<nameAudioQueue.length){
      nameAudioIndex++;
      nameAudioPlayer.src=nameAudioQueue[nameAudioIndex];
      nameAudioPlayer.load();
      const played=nameAudioPlayer.play();
      if(played&&played.catch)played.catch(stopNameAudio);
     }else{
      stopNameAudio();
     }
    });
    nameAudioPlayer.addEventListener("pause",()=>{
     if(nameAudioActiveButton)nameAudioActiveButton.classList.remove("playing");
    });
    nameAudioPlayer.addEventListener("error",stopNameAudio);
   }
   nameAudioActiveButton=button;
   nameAudioIndex=0;
   nameAudioPlayer.src=nameAudioQueue[0];
   nameAudioPlayer.load();
   nameAudioPlayer.playbackRate=selectedChantSpeed();
   const started=nameAudioPlayer.play();
   if(started&&started.catch)started.catch(stopNameAudio);
   button.classList.add("playing");
   button.setAttribute("aria-pressed","true");
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
 // Dhyāna shares the Divine names layout: audio left, compact bilingual text,
 // meaning to the right, and a closed word-by-word disclosure per phrase.
 return "<section class='name-section dhyana-phrase-section' aria-label='"+esc(langText("Dhyāna phrases","ಧ್ಯಾನ ಪದಗುಚ್ಛಗಳು"))+"'><div class='section-title'><h3>"+esc(langText("Phrase-by-phrase","ಪದಗುಚ್ಛದ ಅರ್ಥ"))+"</h3><span>"+rows.length+" "+esc(langText("phrases","ಪದಗುಚ್ಛಗಳು"))+"</span></div><div class='name-study-list dhyana-phrase-list'>"+rows.map((row,index)=>{
  const written=language==="kn"?kannadaFromDevanagari(row.dev):row.dev;
  const meaning=language==="kn"?row.kn:row.en;
  const pairedMeaning=language==="kn"?row.en:row.kn;
  const clips=(Array.isArray(row.clips)?row.clips:[row.clip]).filter(n=>Number.isInteger(n)&&n>0);
  const paths=clips.map(mssClipPath);
  const parts=dhyanaPhraseComponents(v,row);
  const detailId="dhyana-phrase-"+v.verse_number+"-"+(index+1);
  const audio=paths.length
   ?"<button type='button' class='name-audio-button dhyana-phrase-play' data-phrase-audio='"+esc(paths[0])+"' data-phrase-audios='"+esc(paths.join("|"))+"' aria-pressed='false' aria-label='"+esc(langText("Play MSS for Dhyāna "+v.verse_number+", phrase "+(index+1),"ಧ್ಯಾನ "+v.verse_number+", ಪದಗುಚ್ಛ "+(index+1)+" MSS ಧ್ವನಿ"))+"' title='"+esc(langText("Play phrase","ಪದಗುಚ್ಛ ಪ್ಲೇ ಮಾಡಿ"))+"'>♪</button>"
   :"";
  return "<div class='name-audio-card dhyana-phrase-card'>"+audio+"<details class='name-details compact-name-row dhyana-phrase-details' data-detail-id='"+detailId+"'><summary><span class='name-summary-grid'><span class='name-identity-inline'><span class='name-number'>"+(index+1)+".</span><span class='name-written'>"+highlighted(written)+"</span><span class='name-roman'>"+highlighted(row.iast)+"</span></span><span class='name-essence'>"+highlightedPair(meaning,pairedMeaning)+"</span></span></summary><div class='study-inner'><h4>"+esc(langText("Word by word","ಪದ ಪದದ ಅರ್ಥ"))+"</h4>"+wordsGrid(parts)+"</div></details></div>";
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
 button.setAttribute("aria-pressed","false");
}
function stopAllDhyanaAudio(exceptButton){
 stopSlokaMss();
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
// Gap-free, on-demand MSS śloka playback. Use one decoded audio buffer for each
// śloka, like Dhyāna; never render or preload a media bar for each name.
let activeSlokaMss=null,slokaMssRequest=0;
const originalMssBuffers=new Map();
async function loadOriginalMss(paths,ctx){
 return Promise.all(paths.map(path=>{
  if(!originalMssBuffers.has(path)){
   const job=fetch(path).then(r=>{if(!r.ok)throw Error('Cannot load '+path);return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data));
   originalMssBuffers.set(path,job);
   job.catch(()=>{if(originalMssBuffers.get(path)===job)originalMssBuffers.delete(path);});
  }
  return originalMssBuffers.get(path);
 }));
}
function stopSlokaMss(){
 slokaMssRequest++;
 const current=activeSlokaMss;activeSlokaMss=null;
 if(!current)return;
 for(const node of current.nodes||[]){node.onended=null;try{node.stop();}catch(_){}try{node.disconnect();}catch(_){}}
 if(current.button?.isConnected){
  current.button.classList.remove('playing');
  current.button.textContent='▶ '+langText('Play all MSS','ಎಲ್ಲಾ MSS ಪ್ಲೇ ಮಾಡಿ');
  current.button.setAttribute('aria-pressed','false');
  const status=current.button.closest('.sloka-mss-actions')?.querySelector('.sloka-mss-status');
  if(status)status.textContent='';
 }
}
let activeDirectVerseAudio=null;
function initDirectVerseAudio(){
 document.querySelectorAll(".sloka-voice-play[data-voice-src]").forEach(button=>{
  if(button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",async()=>{
   if(activeDirectVerseAudio?.button===button){
    activeDirectVerseAudio.audio.pause();
    activeDirectVerseAudio.audio.currentTime=0;
    activeDirectVerseAudio.button.textContent="▶ "+activeDirectVerseAudio.label;
    activeDirectVerseAudio=null;
    return;
   }
   if(activeDirectVerseAudio){
    activeDirectVerseAudio.audio.pause();
    activeDirectVerseAudio.button.textContent="▶ "+activeDirectVerseAudio.label;
    activeDirectVerseAudio=null;
   }
   stopSlokaMss();
   stopNameAudio();
   stopAllDhyanaAudio(null);
   const label=button.textContent.replace(/^[▶■]\\s*/,"");
   const audio=new Audio(button.dataset.voiceSrc);
   audio.preload="none";
   const state={audio,button,label};
   activeDirectVerseAudio=state;
   installAudioFocus(audio);
   const reset=()=>{
    if(activeDirectVerseAudio!==state)return;
    button.textContent="▶ "+label;
    activeDirectVerseAudio=null;
   };
   audio.addEventListener("ended",reset);
   audio.addEventListener("error",()=>{button.title="Recording unavailable";reset();});
   button.textContent="■ "+label;
   try{await audio.play();}catch(_){button.title="Recording unavailable";reset();}
  });
 });
}
function initSlokaMssPlayAll(){
 document.querySelectorAll('.sloka-mss-play-all[data-sloka-mss]').forEach(button=>{
  if(button.dataset.bound==='1')return;
  button.dataset.bound='1';button.setAttribute('aria-pressed','false');
  button.addEventListener('click',async()=>{
   if(activeSlokaMss?.button===button){stopSlokaMss();return;}
   stopSlokaMss();stopNameAudio();stopAllDhyanaAudio(null);
   const paths=(button.dataset.slokaMss||'').split('|').filter(Boolean);
   if(!paths.length)return;
   const panel=button.closest('.sloka-mss-actions');
   const repeat=panel?.querySelector('.sloka-mss-repeat');
   const status=panel?.querySelector('.sloka-mss-status');
   const state={button,nodes:[],token:++slokaMssRequest};activeSlokaMss=state;
   button.classList.add('playing');button.textContent='■ '+langText('Stop MSS','MSS ನಿಲ್ಲಿಸಿ');
   button.setAttribute('aria-pressed','true');
   if(status)status.textContent=langText('Preparing MSS…','MSS ಸಿದ್ಧವಾಗುತ್ತಿದೆ…');
   try{
    if(!vediniAudioContext)vediniAudioContext=new (window.AudioContext||window.webkitAudioContext)();
    const ctx=vediniAudioContext;
    if(ctx.state==='suspended')await ctx.resume();
    const buffers=await loadOriginalMss(paths,ctx);
    if(activeSlokaMss!==state||state.token!==slokaMssRequest)return;
    const mode=repeat?.value||'1';
    const passes=mode==='loop'?1:Math.max(1,Number(mode)||1);
    // Use each original decoded recording; the audio clock aligns adjacent clips exactly.
    let time=ctx.currentTime+0.05;
    function schedulePasses(count){
     let last=null;
     for(let p=0;p<count;p++)for(const buffer of buffers){
      const node=ctx.createBufferSource();
      node.buffer=buffer;node.connect(ctx.destination);node.start(time);
      state.nodes.push(node);last=node;time+=buffer.duration;
     }
     return last;
    }
    function finishAfter(last){
     if(!last)return;
     last.onended=()=>{
      if(activeSlokaMss!==state)return;
      if(mode==='loop'){finishAfter(schedulePasses(1));}
      else stopSlokaMss();
     };
    }
    finishAfter(schedulePasses(passes));
    if(status)status.textContent='';
   }catch(err){
    if(activeSlokaMss===state){stopSlokaMss();if(status)status.textContent=langText('MSS audio could not load.','MSS ಧ್ವನಿ ಲೋಡ್ ಆಗಲಿಲ್ಲ.');}
   }
  });
 });
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

   stopAllDhyanaAudio(button);
   stopNameAudio();
   if(practice.active)practiceStop("Stopped for Dhyāna phrase");
   if(guided.active)guidedStop("Stopped for Dhyāna phrase");

   button.disabled=true;
   try{
    button.classList.add("playing");
    button.setAttribute("aria-pressed","true");
    if(sources.length===1){
     let audio=button._audio;
     if(!audio){
      audio=document.createElement("audio");
      audio.preload="auto";
      button._audio=audio;
      installAudioFocus(audio);
      audio.addEventListener("ended",()=>stopDhyanaPhraseButton(button));
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
       button.setAttribute("aria-pressed","false");
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
// A single, closed-by-default disclosure retains both the accessible summary
// and the interpretive depth, without duplicating adjacent toggles.
function combinedVerseMeaning(meaning,info,isDhyana,number){
 const overall=String(meaning||"").trim();
 const deeper=String(anyMeaning(info,"traditional_interpretation")||"").trim();
 if(!overall&&!deeper)return "";
 const uniqueDeep=deeper&&(overall!==deeper);
 const text=(overall?"<p class='overall-reading'>"+esc(overall)+"</p>":"")
   +(uniqueDeep?"<div class='deeper-reading'>"+richParagraphs(deeper)+"</div>":"");
 return "<section class='meaning-section verse-lesson'><details class='meaning-toggle verse-combined-meaning' data-detail-id='meaning-"+(isDhyana?"d":"v")+number+"'><summary>"+esc(langText("Meaning & reflection","ಅರ್ಥ ಮತ್ತು ಆಳವಾದ ವಿವರಣೆ"))+"</summary><div class='verse-meaning-copy'>"+text+"</div></details></section>";
}
function dhyanaVerseMeaning(v){
 const info=dhyanaData[v.verse_number]||{};
 const meaning=anyMeaning(info,"essential_meaning")||(language==="kn"?v.meaning?.kannada:v.meaning?.english)||"";
 return combinedVerseMeaning(meaning,info,true,v.verse_number);
}
function mainVerseMeaning(v){
 const info=verseData[v.verse_number]||{};
 const summary=language==="kn"?v.meaning?.kannada:v.meaning?.english;
 return combinedVerseMeaning(summary,info,false,v.verse_number);
}
function verseLine(s){
 const value=String(s??"").trim().replace(/॥\s*([0-9]+)\.\.\s*$/u,"॥ $1 ॥");
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
function fullCard(v,isDhyana){
 const n=v.verse_number,kn=language==="kn",reading=v.reading||{};
 const lines=kn?(reading.kannada?.length?reading.kannada:(reading.devanagari||[]).map(kannadaFromDevanagari)):(reading.devanagari||[]);
 const info=(isDhyana?dhyanaData:verseData)[n]||{};
 const mean=kn?(v.meaning?.kannada||fullMeanings.get((isDhyana?"d-":"s-")+n)?.kn):(v.meaning?.english||fullMeanings.get((isDhyana?"d-":"s-")+n)?.en);
 const deep=anyMeaning(info,"traditional_interpretation");
 return "<article class='full-verse-card' id='"+(isDhyana?"dhyana-":"verse-")+n+"'><div class='full-verse-head'><strong>"+esc(langText(isDhyana?"Dhyāna "+n:"Śloka "+n,isDhyana?"ಧ್ಯಾನ "+n:"ಶ್ಲೋಕ "+n))+"</strong><button type='button' data-full-start='"+(isDhyana?"d":"s")+"-"+n+"'>▶ Start here</button></div><div class='full-script' lang='"+(kn?"kn":"sa")+"'>"+lines.map(verseLine).join("")+"</div><div class='full-iast'>"+(reading.iast||[]).map(verseLine).join("")+"</div><section class='full-simple'><strong>"+esc(langText("Simple meaning","ಸರಳ ಅರ್ಥ"))+"</strong><p>"+esc(mean||"")+"</p></section>"+(deep?"<details class='full-deep'><summary>"+esc(langText("Deeper meaning","ಆಳವಾದ ಅರ್ಥ"))+"</summary>"+richParagraphs(deep)+"</details>":"")+"</article>";
}
function applyReaderOptions(){
 const root=$(".reader-page");
 root.classList.toggle("full-view",readerMode==="full");
 root.classList.toggle("full-hide-iast",!$("#reader-show-iast").checked);
 root.classList.toggle("full-hide-meaning",!$("#reader-show-meaning").checked);
 root.classList.toggle("full-hide-deeper",!$("#reader-show-deeper").checked);
 root.classList.toggle("study-hide-iast",!$("#reader-show-iast").checked);
 root.classList.toggle("study-show-meaning",$("#reader-show-meaning").checked);
 root.classList.toggle("study-show-deeper",$("#reader-show-deeper").checked);
 if(readerMode==="study")document.querySelectorAll(".verse-combined-meaning").forEach(el=>{const quick=$("#reader-show-meaning").checked||$("#reader-show-deeper").checked;el.classList.toggle("quick-open",quick);if(quick)el.open=true;});
 document.querySelectorAll("[data-reader-mode]").forEach(a=>{if(a.dataset.readerMode===readerMode)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
}
function setReaderMode(mode){
 readerMode=mode==="full"?"full":"study";$("#reader-mode").value=readerMode;


 const url=new URL(location.href);url.searchParams.set("mode",readerMode);history.replaceState({},"",url.pathname+url.search+url.hash);
 render();
}
function card(v,isDhyana){
 const number=v.verse_number,reading=v.reading||{};
 const selected=language==="kn"?(reading.kannada?.length?reading.kannada:(reading.devanagari||[]).map(kannadaFromDevanagari)):(reading.devanagari||[]);
 const iast=reading.iast||[];
 const id=(isDhyana?"dhyana-":"verse-")+number;
 const label=langText(isDhyana?"Dhyāna "+number:"Śloka "+number,isDhyana?"ಧ್ಯಾನ "+number:"ಶ್ಲೋಕ "+number);
 const left="<section class='verse-reading-panel' aria-label='"+esc(langText("Śloka and transliteration","ಶ್ಲೋಕ ಮತ್ತು ಲಿಪ್ಯಂತರ"))+"'><div class='reading-label'>"+esc(language==="kn"?"ಕನ್ನಡ":"देवनागरी")+"</div><div class='verse-script "+(language==="kn"?"kannada":"devanagari")+"'>"+selected.map(verseLine).join("")+"</div><div class='reading-label iast-heading'>IAST</div><div class='verse-iast'>"+iast.map(verseLine).join("")+"</div>"+"</section>";
 const right="<div class='verse-names-panel'>"+(isDhyana?dhyanaPhrasePanel(v):nameSection(v))+"</div>";
 return "<article class='card vedini-study-card' id='"+id+"'><div class='card-head'><b>"+esc(label)+"</b>"+makeAudio(v,isDhyana)+"</div><div class='verse-content-grid'>"+left+right+"</div><div class='verse-meaning-panel'>"+(isDhyana?dhyanaVerseMeaning(v):mainVerseMeaning(v))+"</div><p class='meta'>"+esc(langText("Interpretation draft · Sanskrit and Kannada editorial review recommended","ವ್ಯಾಖ್ಯಾನ ಕರಡು · ಸಂಸ್ಕೃತ ಮತ್ತು ಕನ್ನಡ ಪರಿಶೀಲನೆ ಅಗತ್ಯ"))+"</p></article>";
}
function searchText(v,dh){
 if(dh)return JSON.stringify(v)+" "+JSON.stringify(dhyanaData[v.verse_number]||{});
 return JSON.stringify(v)+" "+JSON.stringify(verseData[v.verse_number]||{})+" "+(v.names||[]).map(n=>[nameData[n.studyNumber]||{},spiritualBenefits[n.studyNumber]||{},significanceRewrites[n.studyNumber]||{},nameBenefits[n.studyNumber]||{},namaMantras[n.studyNumber]||{}].map(JSON.stringify).join(" ")).join(" ");
}
function savedDetails(){
 // Meaning disclosures always start collapsed on a fresh render; preserve only
 // the deliberately opened name/word study cards.
 return new Set(Array.from(document.querySelectorAll("details[data-detail-id]"))
  .filter(d=>d.open&&!d.matches(".meaning-toggle, .verse-overall-meaning"))
  .map(d=>d.dataset.detailId));
}
function restoreDetails(ids){
 document.querySelectorAll("details[data-detail-id]").forEach(d=>{
  d.open=!d.matches(".meaning-toggle, .verse-overall-meaning")&&ids.has(d.dataset.detailId);
 });
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
   const word=(v.names||[]).flatMap(n=>findComponents(v,n,nameData[n.studyNumber]||{})).find(c=>norm([c.dev,c.iast,c.en,c.kn].join(" ")).includes(q));
   const wordSnippet=word?"<span class='result-glossary'>"+esc(langText("Word by word","ಪದದ ಅರ್ಥ"))+": "+highlighted(word.iast)+" · "+highlightedPair(word[language]||"",word[language==="kn"?"en":"kn"]||"")+"</span>":"";
   return "<button class='search-result' type='button' data-kind='"+x.type+"' data-number='"+v.verse_number+"'><span class='result-heading'>"+esc(label+" "+v.verse_number)+" <span aria-hidden='true'>→</span></span><span class='result-reading'>"+highlighted(first)+"</span><span class='result-meaning'>"+highlighted(meaning||"")+"</span>"+wordSnippet+"</button>";
  }).join("");
  if(matches.length>40)list.innerHTML+="<p class='small-note'>"+esc(langText("Showing the first 40 matching sections. Refine the search for more precise results.","ಮೊದಲ ೪೦ ಫಲಿತಾಂಶಗಳು ಮಾತ್ರ ಕಾಣುತ್ತಿವೆ. ಹುಡುಕಾಟವನ್ನು ನಿರ್ದಿಷ್ಟಗೊಳಿಸಿ."))+"</p>";
 }
 list.querySelectorAll("button[data-number]").forEach(b=>b.addEventListener("click",()=>{
  const n=Number(b.dataset.number);
  highlightTerm=searchTerm.trim();
  lastSearch={query:searchTerm,scrollY:window.scrollY};
  if(b.dataset.kind==="dhyana")showDhyana(n);
  else{
   const verse=verses.find(v=>v.verse_number===n);
   const name=(verse?.names||[]).find(name=>findComponents(verse,name,nameData[name.studyNumber]||{}).some(c=>norm([c.dev,c.iast,c.en,c.kn].join(" ")).includes(q)));
   jump(n);
   if(name)requestAnimationFrame(()=>{
    const details=document.querySelector('[data-detail-id="name-'+name.studyNumber+'"]');
    if(!details)return;
    details.open=true;
    const match=details.querySelector('mark.search-hit');
    if(match)match.scrollIntoView({behavior:"smooth",block:"center"});
   });
  }
 }));
 msg("#search-results-heading",matches.length+" matching sections","ಹೊಂದಾಣಿಕೆಯ ವಿಭಾಗಗಳು: "+matches.length);
 msg("#result-note","Searching available ślokas and name explanations","ಲಭ್ಯವಿರುವ ಶ್ಲೋಕಗಳು ಮತ್ತು ನಾಮವಿವರಣೆಗಳಲ್ಲಿ ಹುಡುಕಾಟ");
}
function renderGroupTabs(){
 const picker=$("#verse-selector");if(!picker)return;
 if(!picker.options.length){
  const dh=document.createElement("optgroup");dh.label="Dhyāna";
  for(let n=1;n<=dhyana.length;n++)dh.append(new Option("Dhyāna "+n,"d-"+n));
  const main=document.createElement("optgroup");main.label="Lalitā Sahasranāma";
  for(let n=1;n<=verses.length;n++)main.append(new Option("Śloka "+n,"s-"+n));
  picker.append(dh,main);
 }
 picker.value=(view==="dhyana"?"d-":"s-")+selectedVerse;
 const at=view==="dhyana"?selectedVerse-1:dhyana.length+selectedVerse-1;
 $("#verse-previous").disabled=at===0;
 $("#verse-next").disabled=at===dhyana.length+verses.length-1;
 $("#verse-position").textContent=view==="dhyana"?"Dhyāna "+selectedVerse+" of "+dhyana.length:"Śloka "+selectedVerse+" of "+verses.length;
 const rail=$("#verse-rail");if(rail){const values=view==="dhyana"?dhyana:verses;rail.innerHTML=values.map(v=>"<button type=\"button\" data-rail=\""+(view==="dhyana"?"d-":"s-")+v.verse_number+"\" class=\""+(v.verse_number===selectedVerse?"current":"")+"\">"+v.verse_number+"</button>").join("");requestAnimationFrame(()=>{const selected=rail.querySelector(".current");if(selected)rail.scrollLeft=selected.offsetLeft-rail.offsetLeft-(rail.clientWidth-selected.clientWidth)/2;});}$("#verse-rail-heading").textContent=readerMode==="full"?"Full Chanting":"Śloka Study";
 $("#rail-dhyana").setAttribute("aria-pressed",String(view==="dhyana"));$("#rail-slokas").setAttribute("aria-pressed",String(view!=="dhyana"));
}
function updateNavigation(){
 const searching=!!searchTerm.trim();
 $("#return-to-results").hidden=searching||!lastSearch;
 $("#dhyana").hidden=searching||(readerMode!=="full"&&view!=="dhyana");
 $("#main-stotra").hidden=searching||(readerMode!=="full"&&view!=="verses");
 $("#search-results").hidden=!searching;
 $("#sticky-verse-navigation").hidden=searching;
 $("#bottom-navigation").hidden=searching||readerMode==="full"||view!=="verses";
 renderGroupTabs();
 $("#bottom-previous").disabled=selectedVerse<=1;
 $("#bottom-next").disabled=selectedVerse>=verses.length;
 $("#bottom-position").textContent=langText("Śloka "+selectedVerse+" of "+verses.length,"ಶ್ಲೋಕ "+selectedVerse+" / "+verses.length);
 msg("#dhyana-heading","Dhyāna Ślokas","ಧ್ಯಾನ ಶ್ಲೋಕಗಳು");
 msg("#main-heading","Śloka "+selectedVerse,"ಶ್ಲೋಕ "+selectedVerse);
}
function selectVisibleVerse(number){
 if(!Number.isInteger(number)||number<1||number>verses.length)return;
 selectedVerse=number;
 const root=$("#verse-quick-index");
 if(root){
  root.querySelectorAll("button[data-quick]").forEach(button=>{
   const active=Number(button.dataset.quick)===number;
   button.classList.toggle("quick-current",active);
   if(active)button.setAttribute("aria-current","location");
   else button.removeAttribute("aria-current");
  });
 }
 const goto=$("#goto");if(goto)goto.value=String(number);
 document.querySelectorAll("#verse-cards .card").forEach(card=>
  card.classList.toggle("selected-verse",card.id==="verse-"+number)
 );
}
function updateQuickIndex(){renderGroupTabs();}
// Passive, animation-frame-throttled scroll tracking: update the highlighted number
// without re-rendering ślokas or interrupting a playing recording.
let verseScrollQueued=false;
function updateVerseIndexFromScroll(){
 if(view!=="verses"||searchTerm.trim()||readerMode==="full")return;
 // Playback is the source of truth for the highlighted śloka. Otherwise a
 // scroll event during animated auto-follow can reselect the preceding card.
 const playingVerse=practice.active&&!practice.dhyana?practice.current:(guided.active?guided.units[guided.index]?.verse:null);
 if(playingVerse){selectVisibleVerse(playingVerse);return;}
 const cards=Array.from(document.querySelectorAll("#verse-cards .card"));
 if(!cards.length)return;
 const sticky=$("#sticky-verse-navigation");
 const stickyBottom=sticky&&!sticky.hidden?sticky.getBoundingClientRect().bottom:0;
 const readingLine=Math.max(stickyBottom+18,window.innerHeight*0.28);
 let current=cards[0];
 for(const card of cards){
  if(card.getBoundingClientRect().top<=readingLine)current=card;
  else break;
 }
 const number=Number(current.id.replace("verse-",""));
 if(number!==selectedVerse)selectVisibleVerse(number);
}
function queueVerseScrollUpdate(){
 if(verseScrollQueued)return;
 verseScrollQueued=true;
 requestAnimationFrame(()=>{
  verseScrollQueued=false;
  updateVerseIndexFromScroll();
 });
}
function render(){
 // Keep the visible script toggle and all rendered content in the same language.
 const kn=language==="kn";
 $(".reader-page")?.classList.toggle("kannada-mode",kn);
 $("#dev")?.classList.toggle("chosen",!kn);
 $("#kn")?.classList.toggle("chosen",kn);
 $("#dev")?.setAttribute("aria-pressed",String(!kn));
 $("#kn")?.setAttribute("aria-pressed",String(kn));
 stopSlokaMss();
 stopNameAudio();
 stopAllDhyanaAudio(null);
 const opened=savedDetails();
 const q=norm(searchTerm.trim());
 applyReaderOptions();
 updateNavigation();
 updateQuickIndex();
 if(q){
  $("#dhyana-cards").innerHTML="";
  $("#verse-cards").innerHTML="";
  showResultList(q);
  return;
 }
 if(readerMode==="full"){
  $("#dhyana-cards").innerHTML=dhyana.map(v=>fullCard(v,true)).join("");
  $("#verse-cards").innerHTML=verses.map(v=>fullCard(v,false)).join("");
 }else if(view==="dhyana"){
  $("#dhyana-cards").innerHTML=dhyana.filter(v=>v.verse_number===selectedVerse).map(v=>card(v,true)).join("");
  $("#verse-cards").innerHTML="";
 }else{
  const range=verses.slice(selectedVerse-1,selectedVerse);
  $("#verse-cards").innerHTML=range.map(v=>card(v,false)).join("");
  $("#dhyana-cards").innerHTML="";
  document.querySelectorAll(".card").forEach(e=>e.classList.toggle("selected-verse",e.id==="verse-"+selectedVerse));
 }
 restoreDetails(opened);
 // Every reader render replaces the names; reconnect their inline MSS playback.
 initNameAudio();
 initDhyanaPhraseAudio();
 initDhyanaPlayAll();
 applyReaderOptions();
 syncChantHereButtons();
 syncDock();
 requestAnimationFrame(fitVerseLines);
 // After layout settles, sync the index to the śloka actually in view.
 requestAnimationFrame(queueVerseScrollUpdate);
 // Inline players replaced with the shared practice dock.

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
 view="dhyana";selectedVerse=n;searchTerm="";$("#search").value="";
 if(writeURL)saveLocation("dhyana",n);
 render();scrollToElement("dhyana-"+n);
}
function openGroup(index,writeURL=true){jump(Math.max(1,Math.min(verses.length,index+1)),writeURL);}
function chooseVerse(value){
 if(readerMode==="full"){
  lastSearch=null;
  const dh=value.startsWith("d-"),n=Number(value.slice(2));
  if(!Number.isInteger(n))return;
  view=dh?"dhyana":"verses";selectedVerse=n;
  renderGroupTabs();
  const target=document.getElementById((dh?"dhyana-":"verse-")+n);
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
  $("#practice-from").value=value;
  return;
 }
 lastSearch=null;
 if(value.startsWith("d-"))showDhyana(Number(value.slice(2)));
 else if(value.startsWith("s-"))jump(Number(value.slice(2)));
}
function moveVerse(delta){
 const pos=view==="dhyana"?selectedVerse-1:dhyana.length+selectedVerse-1;
 const next=Math.max(0,Math.min(dhyana.length+verses.length-1,pos+delta));
 chooseVerse(next<dhyana.length?"d-"+(next+1):"s-"+(next-dhyana.length+1));
}
function jump(n,writeURL=true){
 if(!Number.isInteger(n)||n<1||n>plannedVerses){
  msg("#result-note","Enter a śloka number from 1 to "+plannedVerses+".","1 ರಿಂದ "+plannedVerses+" ರವರೆಗಿನ ಶ್ಲೋಕ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.");return;
 }
 if(n>verses.length){
  msg("#result-note","Śloka "+n+" has not been published yet. Ślokas 1–"+verses.length+" are available.","ಶ್ಲೋಕ "+n+" ಇನ್ನೂ ಪ್ರಕಟವಾಗಿಲ್ಲ. 1–"+verses.length+" ಲಭ್ಯವಿದೆ.");return;
 }
 view="verses";pageIndex=Math.floor((n-1)/pageSize);selectedVerse=n;
 searchTerm="";$("#search").value="";
 if(writeURL)saveLocation("sloka",n);
 render();scrollToElement("verse-"+n);
}
function loadInitialLocation(){
 const params=new URLSearchParams(window.location.search);
 const d=Number(params.get("dhyana")),n=Number(params.get("sloka"));
 if(params.has("dhyana")&&Number.isInteger(d)&&d>=1&&d<=dhyana.length){view="dhyana";selectedVerse=d;return "dhyana-"+d;}
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
   if(!vdConfirmed){
    const response=await fetch(path,{method:"HEAD"});
    if(!response.ok)return;
   }
   if(!placeholder.isConnected)return;
   // Resolve the verse BEFORE replacing the placeholder (detached nodes have no .closest(".card")).
   const verse=verseNumber!==null?verses.find(v=>v.verse_number===verseNumber):null;
   const mssSources=verse?verseMssAudioPaths(verse):[];
   // Some original names have no standalone MSS clip. Skip them and
   // still offer the available audio for the rest of the śloka.
   const mssAvailable=mssSources.length>0;

   const holder=document.createElement("div");
   holder.className="audio-player";
   const player=document.createElement("audio");
   player.controls=true;
   player.preload="none"; // Fetch only after Play or singer selection.
   player.src=path;
   player.setAttribute("aria-label",langText("Chant recording","ಶ್ಲೋಕದ ಧ್ವನಿಮುದ್ರಣ"));
   installAudioFocus(player);
   const toolbar=document.createElement("div");
   toolbar.className="audio-toolbar";
   const status=document.createElement("div");
   status.className="audio-playback-status";
   status.setAttribute("role","status");
   status.setAttribute("aria-live","polite");
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
     if(item[0]==="MSS"&&!mssAvailable)option.disabled=true;
     select.appendChild(option);
    }
    label.append(caption,select);
    toolbar.appendChild(label);
    return select;
   }
   let voice=null;
   if(!isDhyana){
    voice=setting(langText("Singer","ಗಾಯಕ"),langText("Choose singer","ಗಾಯಕನನ್ನು ಆರಿಸಿ"),[
     ["VD","Vāgdhenu · Practice voice"],["KMP","Kuldeep M. Pai"]
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
   let completed=0,clipIndex=0;
   let nextAudio=null;
   function preloadNext(){
    if(nextAudio){nextAudio.src="";nextAudio=null;}
    if(!voice||voice.value!=="MSS"||clipIndex+1>=mssSources.length)return;
    nextAudio=document.createElement("audio");
    nextAudio.preload="auto";
    nextAudio.src=mssSources[clipIndex+1];
    nextAudio.load();
   }
   function setSource(src,autoplay){
    player.src=src;
    player.load();
    player.playbackRate=Number(speed.value);
    if(autoplay){
     const p=player.play();
     if(p&&typeof p.catch==="function")p.catch(()=>{
      status.textContent=langText("Unable to start audio. Press Play to retry.","ಆಡಿಯೊ ಆರಂಭವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ಲೇ ಮಾಡಿ.");
     });
    }
   }
   function showClip(){
    status.textContent=langText("MSS chanting · clip "+(clipIndex+1)+" of "+mssSources.length,"MSS ಪಠಣ · "+(clipIndex+1)+" / "+mssSources.length);
   }
   if(voice){
    voice.addEventListener("change",()=>{
     const wasPlaying=!player.paused;
     completed=0;clipIndex=0;
     player.pause();
     if(nextAudio){nextAudio.src="";nextAudio=null;}
     if(voice.value==="MSS"){
      if(!mssAvailable){
       voice.value="VD";
       status.textContent=langText("MSS is not yet available for this complete śloka.","ಈ ಸಂಪೂರ್ಣ ಶ್ಲೋಕಕ್ಕೆ MSS ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ.");
       setSource(path,false);
       return;
      }
      player.loop=false;
      showClip();
      setSource(mssSources[0],true); // Runs synchronously in the singer selection gesture.
      preloadNext();
     }else{
      status.textContent="";
      player.loop=repeat.value==="loop";
      setSource(path.replace("/VD/","/"+voice.value+"/"),wasPlaying);
     }
    });
   }
   speed.addEventListener("change",()=>{player.playbackRate=Number(speed.value);});
   repeat.addEventListener("change",()=>{
    completed=0;
    player.loop=repeat.value==="loop"&&(!voice||voice.value!=="MSS");
   });
   player.addEventListener("ended",()=>{
    if(voice&&voice.value==="MSS"){
     if(clipIndex+1<mssSources.length){
      clipIndex++;
      showClip();
      setSource(mssSources[clipIndex],true);
      preloadNext();
      return;
     }
     completed++;
     if(repeat.value==="loop"||completed<Number(repeat.value)){
      clipIndex=0;
      showClip();
      setSource(mssSources[0],true);
      preloadNext();
     }else{
      completed=0;clipIndex=0;
      status.textContent=langText("MSS · full śloka complete","MSS · ಸಂಪೂರ್ಣ ಶ್ಲೋಕ ಪೂರ್ಣ");
      setSource(mssSources[0],false);
     }
     return;
    }
    if(repeat.value==="loop")return;
    completed++;
    if(completed<Number(repeat.value)){
     player.currentTime=0;
     const replay=player.play();
     if(replay&&typeof replay.catch==="function")replay.catch(()=>{status.textContent=langText("Press Play to continue","ಮುಂದುವರಿಸಲು ಪ್ಲೇ ಮಾಡಿ");});
    }else completed=0;
   });
   player.addEventListener("error",()=>{
    if(voice&&voice.value==="MSS")
     status.textContent=langText("MSS clip "+(clipIndex+1)+" could not load.","MSS ಕ್ಲಿಪ್ "+(clipIndex+1)+" ಲೋಡ್ ಆಗಲಿಲ್ಲ.");
   });
   holder.append(player,toolbar,status);
   placeholder.replaceWith(holder);
  }catch(_){/* Keep the placeholder if the verse recording itself is unavailable. */}
 });
}
let chantSpeed=1.0;
function selectedChantSpeed(){return chantSpeed;}
function setupChantSpeed(){const slider=$("#chant-speed"),output=$("#chant-speed-value");if(!slider||!output)return;const update=()=>{chantSpeed=Number(slider.value);output.textContent=chantSpeed.toFixed(2)+"×";output.value=output.textContent;if(nameAudioPlayer)nameAudioPlayer.playbackRate=chantSpeed;};slider.addEventListener("input",update);update();}
const practice={active:false,paused:false,current:1,end:1,reps:1,played:0,token:0,dhyana:false,fullSequence:false};
function syncChantHereButtons(){
 document.querySelectorAll(".dock-verse-shortcut").forEach(button=>{
  const active=practice.active&&practice.current===Number(button.dataset.dockVerse)
   &&practice.dhyana===(button.dataset.dockDhyana==="1");
  button.classList.toggle("chanting",active);
  button.setAttribute("aria-pressed",String(active));
  button.textContent=active?"♫ Chanting":"▶ Chant here";
  const stop=button.closest(".verse-chant-actions")?.querySelector(".dock-verse-stop");
  if(stop){stop.hidden=!active;stop.disabled=!active;}
  button.closest(".card")?.classList.toggle("is-chanting",active);
 });
}
// Gap-minimized, independently scheduled range player. It does not depend on
// the visible verse group and therefore continues across 10 -> 11.
const rangeAudio={ctx:null,queue:[],cache:new Map(),nodes:[],cursor:0,scheduledUntil:0,ticker:null,busy:false,token:0,lastVerse:0,lastPass:0};
function practiceStatus(message){const el=$("#practice-status");if(el)el.textContent=message;}
function practiceSyncButtons(){
 $("#practice-play").disabled=practice.active;
 $("#practice-pause").disabled=!practice.active;
 $("#practice-pause").textContent=practice.paused?"Resume":"Pause";
 $("#practice-stop").disabled=!practice.active;
 syncDock();
}
function clearRangeAudio(){
 if(rangeAudio.ticker){clearInterval(rangeAudio.ticker);rangeAudio.ticker=null;}
 rangeAudio.nodes.forEach(node=>{try{node.source.stop();node.source.disconnect();}catch(_){}});
 rangeAudio.nodes=[];rangeAudio.queue=[];rangeAudio.cursor=0;rangeAudio.scheduledUntil=0;rangeAudio.busy=false;
 if(rangeAudio.ctx){rangeAudio.ctx.close().catch(()=>{});rangeAudio.ctx=null;}
}
function practiceStop(message="Stopped"){
 practice.token++;practice.active=false;practice.paused=false;practice.dhyana=false;practice.fullSequence=false;
 clearRangeAudio();
 const audio=$("#practice-audio");audio.pause();audio.removeAttribute("src");audio.load();
 practiceSyncButtons();practiceStatus(message);syncChantHereButtons();syncDock();
}
async function loadRangeBuffer(url,ctx){
 let job=rangeAudio.cache.get(url);
 if(!job){
  job=fetch(url).then(r=>{if(!r.ok)throw Error("Recording not found");return r.arrayBuffer()}).then(data=>ctx.decodeAudioData(data));
  rangeAudio.cache.set(url,job);
  job.catch(()=>{if(rangeAudio.cache.get(url)===job)rangeAudio.cache.delete(url)});
 }
 return job;
}
function practiceShowVerse(n,follow){
 if(practice.dhyana){
  if(readerMode!=="full"&&(view!=="dhyana"||selectedVerse!==n||searchTerm.trim())){
   view="dhyana";selectedVerse=n;searchTerm="";$("#search").value="";render();
  }
 }else if(readerMode!=="full"&&(view!=="verses"||selectedVerse!==n||searchTerm.trim())){
  view="verses";pageIndex=n-1;selectedVerse=n;searchTerm="";$("#search").value="";render();
 }else selectVisibleVerse(n);
 if(readerMode==="full"){selectedVerse=n;view=practice.dhyana?"dhyana":"verses";renderGroupTabs();}
 if(follow){
  const id=(practice.dhyana?"dhyana-":"verse-")+n;
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:"start",behavior:"smooth"}));
 }
 syncChantHereButtons();
}
function rangeTick(token){
 const ctx=rangeAudio.ctx;
 if(!ctx||token!==practice.token||!practice.active||practice.paused)return;
 const t=ctx.currentTime;
 const current=rangeAudio.nodes.findLast(node=>node.start<=t+.02&&node.end>t-.03);
 if(current&&(rangeAudio.lastVerse!==current.n||rangeAudio.lastPass!==current.pass)){
  const verseChanged=rangeAudio.lastVerse!==current.n||rangeAudio.lastDhyana!==current.dh;
  rangeAudio.lastVerse=current.n;rangeAudio.lastPass=current.pass;rangeAudio.lastDhyana=current.dh;practice.dhyana=current.dh;
  practice.current=current.n;practice.played=current.pass;
  if(verseChanged)practiceShowVerse(current.n,true);
  practiceStatus("Playing "+(current.dh?"Dhyāna ":"śloka ")+current.n+" · repetition "+current.pass+" of "+practice.reps);
  syncDock();
 }
 if(rangeAudio.cursor>=rangeAudio.queue.length&&rangeAudio.scheduledUntil<=t+.03){
  practiceStop("Completed selected range");
  return;
 }
 scheduleRange(token).catch(()=>{if(token===practice.token)practiceStop("Unable to continue range playback")});
}
async function scheduleRange(token){
 const ctx=rangeAudio.ctx;
 if(rangeAudio.busy||!ctx||token!==practice.token||!practice.active||practice.paused)return;
 rangeAudio.busy=true;
 try{
  while(rangeAudio.cursor<rangeAudio.queue.length&&rangeAudio.scheduledUntil<ctx.currentTime+8){
   const item=rangeAudio.queue[rangeAudio.cursor];
   let buffer;
   try{buffer=await loadRangeBuffer(item.url,ctx)}catch(e){if(token===practice.token)practiceStop("Audio unavailable for śloka "+item.n);return;}
   if(token!==practice.token||!practice.active||practice.paused)return;
   // Crossfade only a short tail to avoid a perceptible media-element reload.
   const rate=selectedChantSpeed();
   const duration=buffer.duration/rate;
   const fade=Math.min(.045,duration/8);
   const previous=rangeAudio.nodes[rangeAudio.nodes.length-1];
   const overlap=previous?fade:0;
   const start=Math.max(rangeAudio.scheduledUntil,ctx.currentTime+.06)-overlap;
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   source.buffer=buffer;if(source.playbackRate)source.playbackRate.value=selectedChantSpeed();source.connect(gain);gain.connect(ctx.destination);
   gain.gain.setValueAtTime(overlap?0:1,start);
   if(overlap)gain.gain.linearRampToValueAtTime(1,start+overlap);
   gain.gain.setValueAtTime(1,Math.max(start+overlap,start+duration-fade));
   gain.gain.linearRampToValueAtTime(0,start+duration);
   source.start(start);
   rangeAudio.nodes.push({source,start,end:start+duration,n:item.n,pass:item.pass,dh:item.dh});
   rangeAudio.scheduledUntil=start+duration;
   rangeAudio.cursor++;
   // Predecode the next two recordings before a boundary is reached.
   rangeAudio.queue.slice(rangeAudio.cursor,rangeAudio.cursor+2).forEach(next=>loadRangeBuffer(next.url,ctx).catch(()=>{}));
   if(rangeAudio.nodes.length>70)rangeAudio.nodes=rangeAudio.nodes.filter(x=>x.end>ctx.currentTime-1);
  }
 }finally{rangeAudio.busy=false;}
}
async function practiceBegin(from,to,reps,dhyanaMode=false,fullSequence=false){
 practiceStop("");
 const audio=$("#practice-audio");claimAudioFocus(audio);
 practice.token++;const token=practice.token;
 practice.active=true;practice.paused=false;practice.dhyana=dhyanaMode;
 practice.current=from;practice.end=to;practice.reps=reps;practice.played=0;practice.fullSequence=fullSequence;

 const singer=$("#practice-voice").value;
 const queue=[];
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  rangeAudio.ctx=ctx;
  for(const item of (fullSequence&&dhyanaMode?[...Array.from({length:5-from},(_,i)=>({n:from+i,dh:true})),...Array.from({length:to},(_,i)=>({n:i+1,dh:false}))]:Array.from({length:to-from+1},(_,i)=>({n:from+i,dh:dhyanaMode})))){
   const n=item.n,dh=item.dh;
   let url;
   if(dh){
    if(singer==="KMP")url="../audio/lalita/dhyana/dhyana-"+String(n).padStart(2,"0")+".mp3";
    else{
     const rows=dhyanaPhraseData[n]||[],clips=rows.flatMap(row=>Array.isArray(row.clips)?row.clips:[row.clip]).filter(Boolean);
     if(!clips.length)throw Error("Dhyāna MSS recording unavailable");
     for(let pass=1;pass<=reps;pass++)for(const clip of clips)queue.push({n,pass,url:mssClipPath(clip),dh:true});
     continue;
    }
   }else if(singer==="MSS"){
    // Stream MSS phrases progressively instead of building all 183 WAV files before playback.
    const verse=verses[n-1],paths=verse?verseMssAudioPaths(verse):[];
    if(paths.length){for(let pass=1;pass<=reps;pass++)for(const path of paths)queue.push({n,pass,url:path,dh:false});continue;}
    url="../audio/lalita/verses/VD/sloka-"+String(n).padStart(3,"0")+".mp3";
   }else url="../audio/lalita/verses/"+singer+"/sloka-"+String(n).padStart(3,"0")+".mp3";
   for(let pass=1;pass<=reps;pass++)queue.push({n,pass,url,dh});
  }
  if(token!==practice.token)return;
  rangeAudio.queue=queue;
  await ctx.resume();
  await Promise.all([...new Set(queue.slice(0,4).map(i=>i.url))].map(url=>loadRangeBuffer(url,ctx)));
  if(token!==practice.token)return;
  rangeAudio.scheduledUntil=ctx.currentTime+.1;
  rangeAudio.lastVerse=from;rangeAudio.lastPass=0;rangeAudio.lastDhyana=dhyanaMode;
  practiceShowVerse(from,true);
  practiceSyncButtons();
  await scheduleRange(token);
  if(token===practice.token)rangeAudio.ticker=setInterval(()=>rangeTick(token),100);
 }catch(e){if(token===practice.token)practiceStop("Unable to start practice: "+e.message);}
}
async function practicePlayCurrent(token){
 if(token===practice.token)practiceBegin(practice.current,practice.end,practice.reps,practice.dhyana);
}
function initPractice(){
 const a=$("#practice-from"),b=$("#practice-to"),audio=$("#practice-audio");
 if(!a||!b||!audio)return;
 installAudioFocus(audio);
 const options=dhyana.map(v=>"<option value='d-"+v.verse_number+"'>Dhyāna "+v.verse_number+"</option>").join("")+verses.map(v=>"<option value='s-"+v.verse_number+"'>Śloka "+v.verse_number+"</option>").join("");
 a.innerHTML=options;b.innerHTML=options;a.value="s-1";b.value="s-"+Math.min(10,verses.length);
 const rank=value=>value.startsWith("d-")?Number(value.slice(2)):4+Number(value.slice(2));
 function clampRange(changed){if(rank(a.value)>rank(b.value)){if(changed==="from")b.value=a.value;else a.value=b.value;}}
 a.addEventListener("change",()=>clampRange("from"));
 b.addEventListener("change",()=>clampRange("to"));
 $("#practice-play").addEventListener("click",()=>{
  const fromValue=a.value,toValue=b.value,from=Number(fromValue.slice(2)),to=Number(toValue.slice(2));
  const isDhyana=fromValue.startsWith("d-"),toDhyana=toValue.startsWith("d-");
  if(!from||!to||rank(fromValue)>rank(toValue)){practiceStatus("Select a valid range.");return;}
  practiceBegin(from,to,Number($("#practice-repeat").value),isDhyana,isDhyana&&!toDhyana);
 });
 $("#practice-pause").addEventListener("click",async()=>{
  if(!practice.active||!rangeAudio.ctx)return;
  try{
   if(practice.paused){await rangeAudio.ctx.resume();practice.paused=false;practiceStatus("Resumed");}
   else{await rangeAudio.ctx.suspend();practice.paused=true;practiceStatus("Paused");}
   practiceSyncButtons();
  }catch(e){practiceStop("Unable to pause or resume");}
 });
 $("#practice-stop").addEventListener("click",()=>practiceStop());
 practiceSyncButtons();
}
const guided={active:false,paused:false,units:[],index:0,repeatDone:0,clipIndex:0,timeout:null,token:0,insideGap:false,nodes:[],ctx:null,startedAt:0};
function guidedStatus(t){const e=$("#guided-status");if(e)e.textContent=t;}
function guidedHighlight(number){
 document.querySelectorAll(".name-audio-card").forEach(el=>el.classList.remove("guided-current"));
 if(number==null)return null;
 const details=document.querySelector('[data-detail-id="name-'+number+'"]');
 const row=details?.closest(".name-audio-card");
 if(row)row.classList.add("guided-current");
 return row||null;
}
function guidedFollow(target){
 if(!target||!guided.active)return;
 const toolbar=document.querySelector(".study-main-content>.lalita-reader-toolbar");
 const index=document.getElementById("sticky-verse-navigation");
 const dock=document.getElementById("practice-dock");
 const mobile=window.matchMedia("(max-width: 620px)").matches;
 const top=Math.max(0,toolbar?.getBoundingClientRect().bottom||0,index&&!index.hidden?index.getBoundingClientRect().bottom:0)+14;
 const bottom=mobile?Math.min(innerHeight,dock?.getBoundingClientRect().top??innerHeight)-14:innerHeight-24;
 const rect=target.getBoundingClientRect();
 const visibleBottom=Math.max(top+90,bottom);
 if(rect.top>=top+8&&rect.bottom<=visibleBottom-8)return;
 const targetY=top+Math.min(Math.max(100,visibleBottom-top)*.30,110);
 window.scrollTo({top:Math.max(0,window.scrollY+rect.top-targetY),behavior:"instant"});
}
function guidedControls(){
 $("#guided-play").disabled=guided.active;
 $("#guided-pause").disabled=!guided.active;
 $("#guided-pause").textContent=guided.paused?"Resume":"Pause";
 $("#guided-next").disabled=!guided.active;
 $("#guided-stop").disabled=!guided.active;
 syncDock();
}
function guidedStop(message="Stopped"){
 guided.token++;guided.active=false;guided.paused=false;
 if(guided.timeout!==null){clearTimeout(guided.timeout);guided.timeout=null;}
 for(const node of guided.nodes){node.onended=null;try{node.stop();}catch(_){}try{node.disconnect();}catch(_){}} guided.nodes=[];
 if(guided.ctx?.state==="suspended")guided.ctx.resume().catch(()=>{});
 const a=$("#practice-audio");a.pause();a.removeAttribute("src");a.load();
 guidedHighlight(null);guidedControls();guidedStatus(message);syncDock();
}
function guidedBuildUnits(from,to,mode,nameRepeat,verseRepeat){
 const units=[];
 for(let i=from;i<=to;i++){
  const verse=verses.find(v=>v.verse_number===i);if(!verse)continue;
  if(mode!=="verse"){
   // A shared MSS clip is one indivisible teaching phrase; never replay it as separate names.
   const seen=new Set();
   for(const n of verse.names||[]){
    const clips=nameAudioClips(n.studyNumber).filter(c=>!seen.has(c));
    clips.forEach(c=>seen.add(c));
    if(clips.length)units.push({verse:i,name:n.studyNumber,text:n.iast||n.sanskrit||"",clips:clips.map(mssClipPath),repeats:nameRepeat});
   }
  }
  if(mode!=="names"){
   const paths=verseMssAudioPaths(verse);
   if(paths.length)units.push({verse:i,name:null,text:"Complete śloka",clips:paths,repeats:verseRepeat});
  }
 }
 return units;
}
// Predecode and schedule original MSS clips on the audio clock; no MP3 reload between repeats.
async function guidedPlayClip(){
 if(!guided.active||guided.paused)return;
 if(guided.index>=guided.units.length){guidedStop("Guided chanting complete");return;}
 const unit=guided.units[guided.index],token=guided.token;
 guidedStatus("Śloka "+unit.verse+" · "+(unit.name?"Name "+unit.name+" ("+unit.text+")":"Complete śloka")+" · "+unit.repeats+"×");syncDock();
 if(view!=="verses"||selectedVerse!==unit.verse){
  view="verses";pageIndex=unit.verse-1;selectedVerse=unit.verse;render();
 }
 const target=guidedHighlight(unit.name)||document.getElementById("verse-"+unit.verse);
 if(guided.index===0||guided.units[guided.index-1]?.verse!==unit.verse)requestAnimationFrame(()=>guidedFollow(target));
 try{
  if(!vediniAudioContext)vediniAudioContext=new (window.AudioContext||window.webkitAudioContext)();
  const ctx=vediniAudioContext;guided.ctx=ctx;
  if(ctx.state==="suspended")await ctx.resume();
  const buffers=await loadOriginalMss(unit.clips,ctx);
  if(!guided.active||guided.token!==token||guided.paused)return;
  // Each clip retains its original duration and pitch. A short equal-power
  // overlap smooths discontinuities in the shruti at a recording boundary.
  const fade=.055;
  let time=ctx.currentTime+.06,last=null;
  for(let pass=0;pass<unit.repeats;pass++){
   for(let j=0;j<buffers.length;j++){
    const buffer=buffers[j],duration=buffer.duration/selectedChantSpeed();
    const isFirst=pass===0&&j===0;
    const isLast=pass===unit.repeats-1&&j===buffers.length-1;
    const overlap=isFirst?0:Math.min(fade,duration/4);
    time-=overlap;
    const node=ctx.createBufferSource(),gain=ctx.createGain();
    node.buffer=buffer;if(node.playbackRate)node.playbackRate.value=selectedChantSpeed();node.connect(gain);gain.connect(ctx.destination);
    gain.gain.setValueAtTime(overlap?0:1,time);
    if(overlap)gain.gain.linearRampToValueAtTime(1,time+overlap);
    if(!isLast)gain.gain.setValueAtTime(1,Math.max(time+overlap,time+duration-fade));
    if(!isLast)gain.gain.linearRampToValueAtTime(0,time+duration);
    node.start(time);guided.nodes.push(node);last=node;
    time+=duration;
   }
  }
  if(last)last.onended=()=>{
   if(!guided.active||guided.token!==token)return;
   guided.nodes.forEach(n=>{try{n.disconnect();}catch(_){}});
   guided.nodes=[];guided.index++;
   if(guided.index>=guided.units.length){guidedStop("Guided chanting complete");return;}
   guidedPlayClip();
  };
 }catch(_){if(guided.active&&guided.token===token)guidedStop("MSS audio unavailable for śloka "+unit.verse);}
}
function guidedInit(){
 const from=$("#guided-from"),to=$("#guided-to"),audio=$("#practice-audio");
 const options=verses.map(v=>"<option value='"+v.verse_number+"'>"+v.verse_number+"</option>").join("");
 from.innerHTML=options;to.innerHTML=options;from.value="1";to.value=String(Math.min(10,verses.length));
 from.addEventListener("change",()=>{if(+from.value>+to.value)to.value=from.value;});
 to.addEventListener("change",()=>{if(+to.value<+from.value)from.value=to.value;});
 // Guided MSS uses the shared panel and Web Audio scheduling.

 $("#guided-play").addEventListener("click",()=>{
  const f=+from.value,t=+to.value;
  if(f<1||t>verses.length||f>t){guidedStatus("Select a valid range");return;}
  guidedStop("");
  const mode="names";
  guided.units=guidedBuildUnits(f,t,mode,+$("#guided-name-repeat").value,+$("#guided-verse-repeat").value);
  if(!guided.units.length){guidedStatus("No individually mapped MSS recordings in this range");return;}
  // Existing practice and individual players stop when the guided audio takes focus.
  practiceStop("Stopped for guided chanting");stopNameAudio();stopSlokaMss();
  guided.active=true;guided.paused=false;guided.index=0;guided.clipIndex=0;guided.repeatDone=0;guided.token++;
  guidedControls();syncDock();guidedPlayClip();
 });
 $("#guided-pause").addEventListener("click",async()=>{
  if(!guided.active)return;
  if(guided.paused){
   guided.paused=false;
   if(guided.insideGap){guided.insideGap=false;guidedPlayClip();}
   else if(guided.ctx?.state==="suspended")await guided.ctx.resume();
  }else{
   guided.paused=true;
   if(guided.timeout!==null){clearTimeout(guided.timeout);guided.timeout=null;guided.insideGap=true;}
   else if(guided.ctx?.state==="running")await guided.ctx.suspend();
  }
  guidedControls();syncDock();
 });
 $("#guided-next").addEventListener("click",async()=>{
  if(!guided.active)return;
  guided.token++;
  for(const node of guided.nodes){node.onended=null;try{node.stop();}catch(_){}try{node.disconnect();}catch(_){}}
  guided.nodes=[];
  if(guided.timeout!==null)clearTimeout(guided.timeout);
  guided.timeout=null;guided.insideGap=false;guided.paused=false;guided.index++;
  if(guided.ctx?.state==="suspended")await guided.ctx.resume();
  guidedControls();syncDock();guidedPlayClip();
 });
 $("#guided-stop").addEventListener("click",()=>guidedStop());
 guidedControls();
}

function switchLanguage(kn){
 language=kn?"kn":"en";
 const reader=$(".reader-page");
 if(reader){
  reader.classList.toggle("kannada-mode",kn);
  reader.setAttribute("lang",kn?"kn":"en");
 }
 $("#dev").classList.toggle("chosen",!kn);
 $("#kn").classList.toggle("chosen",kn);
 $("#dev").setAttribute("aria-pressed",String(!kn));$("#kn").setAttribute("aria-pressed",String(kn));
 render();
}
async function init(){
 const paths=["lalita/dhyana.json","lalita/names-interpretations-draft.json","lalita/study-names-011-018.json","lalita/study-names-019-026.json","lalita/study-dhyana-01-02.json","lalita/study-dhyana-03-04.json","lalita/study-verses-001-010.json",...Array.from({length:183},(_,i)=>"lalita/verses/verse-"+String(i+1).padStart(3,"0")+".json")];
 try{
 const [files,briefNames,dhyanaPhrases]=await Promise.all([Promise.all(paths.map(fetchJSON)),fetchJSON("lalita/brief-names-draft.json"),fetchJSON("lalita/dhyana-mss-phrases.json?v=20261024-v14")]);
 const meaningFiles=await Promise.all(["001-010","011-020","021-030","031-040","041-050","051-100","101-150","151-183"].map(k=>fetchJSON("lalita/expanded-verses-"+k+".json")));
 meaningFiles.flatMap(f=>f.verses||[]).forEach(v=>fullMeanings.set("s-"+v.verse_number,v.meaning||{}));
 const benefitFiles=await Promise.all(["001-0200","201-0400","401-0600","601-0800","801-1000"].map(range=>fetchJSON("lalita/wisdom-insights-"+range+".json")));
 const namavaliFile=await fetchJSON("lalita/namavali-001-1000.json");
 const benefitCatalog=await fetchJSON("lalita/name-benefits.json");
 const rewriteFile=await fetchJSON("lalita/significance-rewrites.json");
 significanceRewrites=Object.fromEntries((rewriteFile.names||[]).map(n=>[n.number,n]));
 nameBenefits=Object.fromEntries((benefitCatalog.names||[]).map(n=>[n.number,n]));
 if(Object.keys(nameBenefits).length!==1000)throw Error("Expected 1,000 distinct name benefits");
 namaMantras=Object.fromEntries((namavaliFile.names||[]).map(n=>[n.number,n]));
 spiritualBenefits=Object.fromEntries(benefitFiles.flatMap(f=>f.names||[]).map(n=>[n.number,n]));
 dhyana=files[0];
 dhyanaPhraseData=Object.fromEntries([1,2,3,4].map(v=>[v,(dhyanaPhrases.phrases||[]).filter(p=>p.verse===v)]));
 const old=files[1],newNames=[...files[2],...files[3]];
 nameData=Object.fromEntries(old.map(v=>[v.number,v]));
 newNames.forEach(x=>{nameData[x.number]={...(nameData[x.number]||{}),...x}});
 dhyanaData=Object.fromEntries([...files[4],...files[5]].map(x=>[x.verse_number,x]));
 verseData=Object.fromEntries(files[6].map(x=>[x.verse_number,x]));
 // Convert divine-name IAST occurring in Kannada prose, but retain the IAST reading line.
 kannadaNameForms=briefNames.filter(n=>n.iast&&n.sanskrit).flatMap(n=>{
  const forms=[n.iast,n.iast.replace(/-/g,"")];
  return [...new Set(forms)].map(form=>({form,kannada:kannadaFromDevanagari(n.sanskrit)}));
 }).sort((a,b)=>b.form.length-a.form.length).map(item=>{
  const quoted=Array.from(item.form).map(char=>".*+?^${}()|[]\\\\ ".includes(char)?"\\\\"+char:char).join("");
  return {regex:new RegExp("(^|[^\\p{L}\\p{M}])"+quoted+"(?=$|[^\\p{L}\\p{M}])","giu"),kannada:item.kannada};
 });
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
 initPractice();guidedInit();syncDock();readerMode=new URLSearchParams(location.search).get("mode")==="full"?"full":"study";$("#reader-mode").value=readerMode;$("#learning-mode").value="repeat";
const initial=loadInitialLocation();if(readerMode==="full"&&initial)$("#practice-from").value=(view==="dhyana"?"d-":"s-")+selectedVerse;render();if(initial)scrollToElement(initial);
 }catch(err){
  console.error("Lalitā study content initialization failed",err);
  const n=$("#result-note");if(n){n.hidden=false;n.textContent="Some study resources could not load: "+err.message+". Showing available core śloka content.";}
  try{
   const [first,dhyanaFile]=await Promise.all([fetchJSON("lalita/verses/verse-001.json"),fetchJSON("lalita/dhyana.json")]);
   if(!verses.length)verses=[first];
   if(!dhyana.length)dhyana=Array.isArray(dhyanaFile)?dhyanaFile:(dhyanaFile.verses||[]);
   selectedVerse=1;view="verses";readerMode="study";
   render();
  }catch(fallbackError){
   console.error("Lalitā core fallback failed",fallbackError);
   const host=$("#verse-cards");if(host)host.innerHTML="<p role='alert'>Unable to load the śloka content. Please reload the page. "+esc(fallbackError.message)+"</p>";
  }
 }
}
window.VediniLanguage.bind(lang=>switchLanguage(lang==="kn"));
language=window.VediniLanguage.get()==="kn"?"kn":"en";
$("#search").oninput=e=>{lastSearch=null;searchTerm=e.target.value;render()};
$("#return-to-results").onclick=()=>{if(!lastSearch)return;const saved=lastSearch;searchTerm=saved.query;$("#search").value=saved.query;render();requestAnimationFrame(()=>window.scrollTo({top:saved.scrollY,behavior:"instant"}));};




$("#bottom-previous").onclick=()=>moveVerse(-1);
$("#bottom-next").onclick=()=>moveVerse(1);
$("#verse-selector").onchange=e=>chooseVerse(e.target.value);
$("#verse-previous").onclick=()=>moveVerse(-1);
$("#verse-next").onclick=()=>moveVerse(1);
$("#rail-dhyana").onclick=()=>chooseVerse("d-1");$("#rail-slokas").onclick=()=>chooseVerse("s-1");
$("#verse-rail").onclick=e=>{const b=e.target.closest("[data-rail]");if(b)chooseVerse(b.dataset.rail);};
$("#reader-mode").onchange=e=>{$("#learning-mode").value="repeat";$("#learning-mode").dispatchEvent(new Event("change"));};
for(const id of ["reader-show-iast","reader-show-meaning","reader-show-deeper"])$("#"+id).onchange=applyReaderOptions;
$("#reader-print").onclick=()=>window.print();
$(".lalita-view-switcher").addEventListener("click",e=>{const a=e.target.closest("[data-reader-mode]");if(a){e.preventDefault();setReaderMode(a.dataset.readerMode);}});
for(const id of ["verse-cards","dhyana-cards"])$("#"+id).addEventListener("click",e=>{const b=e.target.closest("[data-full-start]");if(!b)return;const n=Number(b.dataset.fullStart.slice(2));$("#learning-mode").value="continuous";$("#learning-mode").dispatchEvent(new Event("change"));$("#practice-from").value=(b.dataset.fullStart[0]==="d"?"d-":"s-")+n;$("#practice-to").value="s-"+verses.length;if(b.dataset.fullStart[0]==="d")practiceBegin(n,verses.length,1,true,true);else practiceBegin(n,verses.length,1,false,true);});
window.addEventListener("scroll",queueVerseScrollUpdate,{passive:true});
window.addEventListener("resize",()=>{
 requestAnimationFrame(fitVerseLines);
 queueVerseScrollUpdate();
});
if(document.fonts?.ready)document.fonts.ready.then(()=>requestAnimationFrame(fitVerseLines));
window.addEventListener("popstate",()=>{searchTerm="";$("#search").value="";const target=loadInitialLocation();render();if(target)scrollToElement(target);});

function syncDock(){
 const root=document.getElementById("practice-dock");if(!root)return;
 const mode=document.querySelector(".chanting-panels")?.dataset.mode||"chant",isGuided=mode==="guided";
 const current=isGuided?guided:practice,active=current.active,paused=current.paused;
 for(const id of ["dock-pause","dock-stop"])document.getElementById(id).disabled=!active;
 const next=document.getElementById("dock-next");
 const nextAvailable=isGuided?active&&guided.index<guided.units.length-1:active?(practice.fullSequence||!practice.dhyana&&practice.current<practice.end):(view==="dhyana"?selectedVerse<dhyana.length||verses.length>0:selectedVerse<verses.length);
 next.disabled=!nextAvailable;
 next.title=isGuided?"Skip to next name or śloka":active?"Skip to next śloka in range":"Go to next śloka";
 next.setAttribute("aria-label",next.title);
 next.querySelector(".dock-button-label").textContent=active?"Skip":"Next";
 const play=document.getElementById("dock-play");play.disabled=false;
 play.title=active?(paused?"Resume chanting":"Pause chanting"):"Play chanting";
 play.querySelector(".dock-button-label").textContent=active?(paused?"Resume":"Pause"):"Play";
 play.querySelector(".dock-button-icon").textContent=active?(paused?"▶":"⏸"):"▶";
 const p=document.getElementById("dock-pause");p.querySelector(".dock-button-label").textContent=paused?"Resume":"Pause";p.querySelector(".dock-button-icon").textContent=paused?"▶":"⏸";
 const src=document.getElementById(isGuided?"guided-status":"practice-status");document.getElementById("dock-status").textContent=src?.textContent||"Ready";
 const title=document.getElementById("dock-track-title"),detail=document.getElementById("dock-track-detail");
 title.textContent=isGuided&&active?"Name practice · Śloka "+(guided.units[guided.index]?.verse||1):(practice.dhyana&&active?"Dhyāna "+practice.current+" of 4":"Śloka "+(active?practice.current:selectedVerse)+" of "+verses.length);
 detail.textContent=active?(isGuided?"Name practice":$("#practice-voice").selectedOptions[0]?.textContent+" · Repeat "+Math.max(1,practice.played)+" of "+practice.reps):"Ready · "+($("#practice-voice").selectedOptions[0]?.textContent||"Vāgdhenu");
 const steps=practice.active?(rangeAudio.queue.length||1):1;
 const done=practice.active?Math.max(0,rangeAudio.queue.findIndex(x=>x.n===practice.current&&x.pass===Math.max(1,practice.played))):0;
 const percent=practice.active?Math.max(0,Math.min(100,Math.round(100*done/steps))):0;
 document.getElementById("dock-progress-fill").style.width=percent+"%";
 document.getElementById("dock-progressbar").setAttribute("aria-valuenow",String(percent));
 root.classList.toggle("dock-active",active);
}
function initDock(){
 const dock=document.getElementById("practice-dock"),toggle=document.getElementById("practice-dock-toggle");
 if(!dock||!toggle)return;
 const mode=()=>document.querySelector(".chanting-panels").dataset.mode;
 const controller=window.VediniPracticeDock.bind({
  root:dock,workspace:"study-workspace",initialStatus:"Ready",
  onPlay:()=>{if(mode()==="guided"){if(guided.active)document.getElementById("guided-pause").click();else document.getElementById("guided-play").click();return;}if(practice.active)document.getElementById("practice-pause").click();else document.getElementById("practice-play").click();},
  onPause:()=>document.getElementById(mode()==="guided"?"guided-pause":"practice-pause").click(),
  onStop:()=>document.getElementById(mode()==="guided"?"guided-stop":"practice-stop").click(),
  onNext:()=>{
   if(mode()==="guided"){document.getElementById("guided-next").click();return}
   if(!practice.active){moveVerse(1);return;}
   if(practice.dhyana&&!practice.fullSequence){practiceStop("Dhyāna chanting complete");return}
   if(practice.current>=practice.end&&!practice.dhyana)practiceStop("Completed selected range");else practiceBegin(practice.dhyana?1:practice.current+1,practice.end,practice.reps,false,practice.fullSequence);
  }
 });
 const expand=controller.expand;
 document.getElementById("reader").addEventListener("click",event=>{
  const stop=event.target.closest(".dock-verse-stop");
  if(stop){
   event.preventDefault();event.stopImmediatePropagation();
   if(practice.active&&practice.current===Number(stop.dataset.dockVerse)
      &&practice.dhyana===(stop.dataset.dockDhyana==="1"))practiceStop("Stopped");
   return;
  }
  const shortcut=event.target.closest(".dock-verse-shortcut");if(!shortcut)return;
  event.preventDefault();event.stopImmediatePropagation();
  // Keep the mobile mini-player compact while chanting text is being followed.
  if(!window.matchMedia("(max-width: 620px)").matches)expand(true);
  if(shortcut.dataset.dockDhyana==="1"){const n=Number(shortcut.dataset.dockVerse);document.getElementById("learning-mode").value="repeat";document.getElementById("learning-mode").dispatchEvent(new Event("change"));practiceBegin(n,n,1,true);return}
  const n=Number(shortcut.dataset.dockVerse);document.getElementById("learning-mode").value="repeat";document.getElementById("learning-mode").dispatchEvent(new Event("change"));
  document.getElementById("practice-from").value="s-"+n;document.getElementById("practice-to").value="s-"+n;
  if(practice.active)practiceStop("Starting selected śloka");
  document.getElementById("dock-play").click();
 },true);
 syncDock();
}
function initLearningMode(){
 const selector=$("#learning-mode"),host=document.querySelector(".practice-dock .chanting-panels");
 if(!selector||!host)return;
 function choose(){
  const mode=selector.value,isChant=mode!=="names";
  const display=document.querySelector(".reader-display-controls");
  if(mode==="continuous"){ $("#reader-show-iast").checked=false;$("#reader-show-meaning").checked=true;$("#reader-show-deeper").checked=false;display.hidden=true;$("#practice-voice").value="KMP"; }
  else{display.hidden=true;if(mode==="repeat")$("#practice-voice").value="KMP";}
  const targetMode=mode==="continuous"?"full":"study";
  if(targetMode!==readerMode)setReaderMode(targetMode);
   if(mode==="continuous")applyReaderOptions();
  const old=host.dataset.mode;
  if(old!==(isChant?"chant":"guided")){
   if(practice.active)practiceStop("Stopped");
   if(guided.active)guidedStop("Stopped");
  }else if(!isChant&&guided.active){guidedStop("Stopped");}
  host.dataset.mode=isChant?"chant":"guided";
  document.querySelectorAll(".guided-verse-setting").forEach(el=>el.hidden=true);
  $(".practice-repeat-field").hidden=false;
  document.querySelectorAll(".guided-style-field").forEach(el=>el.hidden=true);
  $(".practice-fields").hidden=false;
  document.querySelectorAll(".guided-style-field").forEach(el=>el.hidden=true);
  $("#practice-mode-help").textContent=mode==="continuous"?"Continuous chanting displays only the śloka and simple meaning.":mode==="repeat"?"Choose a range, singer and repeat count. The active śloka is highlighted.":"Chant divine names with MSS, repeating each name as selected.";
  $("#practice-play").disabled=false;
  document.querySelectorAll(".guided-name-setting").forEach(el=>el.hidden=false);
  syncDock();
 }
 selector.addEventListener("change",choose);
  $("#guided-style").addEventListener("change",choose);
 choose();
}
try{initLearningMode();setupChantSpeed();initDock();}catch(error){console.error("Lalitā player initialization failed",error);const notice=$("#result-note");if(notice){notice.hidden=false;notice.textContent="Player controls could not initialize: "+error.message;}}
init();
})();
