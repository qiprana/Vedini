const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=file('app.js');
const page=file('lalita/index.html');
const names=JSON.parse(file('data/lalita/brief-names-draft.json'));
test('reader script parses without syntax errors',()=>assert.doesNotThrow(()=>new vm.Script(app,{filename:'app.js'})));

test('name-audio handlers attach on every render and are not intercepted by the dock',()=>{
 assert.match(app,/restoreDetails\(opened\);\s*\/\/[^\n]*\n\s*initNameAudio\(\);/);
 assert.doesNotMatch(app,/event\.target\.closest\(["']\.name-audio-button["']\)/);
 assert.match(app,/nameAudioPlayer\.play\(\)/);
});

test('all 1000 divine names are unique and have a verse and Kannada meaning',()=>{
 assert.equal(names.length,1000);
 for(let i=0;i<1000;i++){assert.equal(names[i].number,i+1);assert.ok(names[i].verse_number>=1&&names[i].verse_number<=183);assert.ok(names[i].kannada?.trim(), 'Kannada missing for '+(i+1));}
});
test('known corrected verse boundaries stay correct',()=>{
 for(const [number,verse] of [[746,144],[866,162],[971,178]])assert.equal(names[number-1].verse_number,verse,'name '+number);
});
test('every canonical verse is valid JSON with matching index',()=>{
 for(let i=1;i<=183;i++){
  const n=String(i).padStart(3,'0'),v=JSON.parse(file('data/lalita/verses/verse-'+n+'.json'));
  assert.equal(v.verse_number,i);
 }
});
test('reader contains required controls and no removed guidedAdvance handler',()=>{
 for(const id of ['practice-play','practice-pause','practice-stop','guided-play','guided-pause','guided-next','guided-stop','guided-from','guided-to','guided-mode','guided-gap'])
  assert.match(page,new RegExp('id="'+id+'"'),'Missing '+id);
 assert.doesNotMatch(app,/addEventListener\(["']ended["'],\s*guidedAdvance\b/);
 assert.doesNotMatch(page,/id="practice-speed"/);
});
test('initialization handlers called by reader exist',()=>{
 for(const fn of ['initPractice','guidedInit','initSlokaMssPlayAll','initNameAudio','initDirectVerseAudio']){
  if(new RegExp('\\b'+fn+'\\s*\\(').test(app))assert.match(app,new RegExp('function\\s+'+fn+'\\s*\\('),'Undefined '+fn);
 }
});


test('all 1000 Nāmāvalī mantras remain present with Om and Namaḥ',()=>{
 const data=JSON.parse(file('data/lalita/namavali-001-1000.json'));
 assert.equal(data.names.length,1000);
 for(let i=0;i<1000;i++){
  const n=data.names[i];assert.equal(n.number,i+1);
  assert.match(n.dev,/^ॐ .+ नमः$/u,'Sanskrit Nāmāvalī missing '+(i+1));
  assert.match(n.iast,/^Oṃ .+ Namaḥ$/u,'IAST Nāmāvalī missing '+(i+1));
 }
});
test('Nāmāvalī sits under the śloka rather than in each name row',()=>{
 assert.match(app,/function inlineNameMantra\(number\)/);
 assert.doesNotMatch(app,/name-mantra-slot[^\n]*inlineNameMantra\(number\)/);
 assert.doesNotMatch(app,/nameMantraToggle/);
 assert.match(app,/namavali-001-1000\.json/);
 assert.match(app,/function namavaliPanel\(v\)/);
 assert.match(app,/isDhyana\?"":namavaliPanel\(v\)/);
});
test('all 1000 entries include English and Kannada benefits and explanations',()=>{
 const files=['001-0200','201-0400','401-0600','601-0800','801-1000'];
 const all=files.flatMap(n=>JSON.parse(file('data/lalita/wisdom-insights-'+n+'.json')).names);
 assert.equal(all.length,1000);
 all.forEach((n,i)=>{
  assert.equal(n.number,i+1);
  for(const lang of ['en','kn']){
   assert.ok(n.title?.[lang]?.trim(),'Missing benefit title '+(i+1)+' '+lang);
   assert.ok(n.explanation?.[lang]?.length>50,'Missing benefit explanation '+(i+1)+' '+lang);
  }
 });
});

test('names show one Significance reading and keep traditional source data',()=>{
 assert.match(app,/function significanceToggle\(number\)/);
 assert.doesNotMatch(app,/Benefits & significance|Contemplative benefit|"Benefit"/);
 const fileData=JSON.parse(file('data/lalita/wisdom-insights-001-0200.json'));
 assert.equal(fileData.names.length,200);
 fileData.names.forEach((entry,i)=>{
  assert.equal(entry.number,i+1);
  for(const lang of ['en','kn']){
   assert.ok(entry.spiritual_significance?.[lang]?.length>20,'Spiritual significance '+entry.number+' '+lang);
   assert.ok(entry.human_significance?.[lang]?.length>20,'Human significance '+entry.number+' '+lang);
  }
 });
 assert.equal(fileData.names[77].traditional_benefit.en,'Removal of Obstacles');
 assert.equal(fileData.names[78].traditional_benefit.en,'Protection Against Adversity');
 assert.ok(fileData.names.slice(0,77).every(n=>!n.traditional_benefit.en));
});

test('batch 2 names 201–400 have unique individualized bilingual interpretations',()=>{
 const rows=JSON.parse(file('data/lalita/wisdom-insights-201-0400.json')).names;
 assert.equal(rows.length,200);
 for(let i=0;i<200;i++){
  const entry=rows[i];
  assert.equal(entry.number,i+201);
  assert.equal(entry.kind,'individual_name_contemplation','Still generic: '+entry.number);
  for(const key of ['title','spiritual_significance','human_significance']){
   for(const lang of ['en','kn'])assert.ok(entry[key]?.[lang]?.length>12,'Missing '+entry.number+' '+key+'.'+lang);
  }
  if(entry.traditional_benefit_status==='not_source_verified'){
   assert.ok(!entry.traditional_benefit?.en,'Unverified traditional benefit '+entry.number);
  }
 }
 for(const key of ['title','spiritual_significance','human_significance']){
  for(const lang of ['en','kn']){
   assert.equal(new Set(rows.map(n=>n[key][lang].trim())).size,200,'Duplicate '+key+'.'+lang);
  }
 }
});


test('batch 3 names 401–600 have distinct bilingual spiritual and human significance',()=>{
 const rows=JSON.parse(file('data/lalita/wisdom-insights-401-0600.json')).names;
 assert.equal(rows.length,200);
 for(let i=0;i<200;i++){
  const n=rows[i];assert.equal(n.number,i+401);
  assert.equal(n.kind,'individual_name_contemplation');
  for(const field of ['title','spiritual_significance','human_significance'])
   for(const lang of ['en','kn'])assert.ok(n[field]?.[lang]?.length>12,'Missing '+n.number+' '+field+'.'+lang);
  if(n.traditional_benefit_status==='not_source_verified')assert.ok(!n.traditional_benefit?.en,'Unsupported benefit '+n.number);
 }
 for(const field of ['title','spiritual_significance','human_significance'])
  for(const lang of ['en','kn'])assert.equal(new Set(rows.map(n=>n[field][lang].trim())).size,200,'Duplicate '+field+'.'+lang);
});


test('Batch 4 601–800 has individual English and Kannada spiritual/human significance',()=>{
 const rows=JSON.parse(file('data/lalita/wisdom-insights-601-0800.json')).names;
 assert.equal(rows.length,200);
 for(let i=0;i<200;i++){
  const n=rows[i];assert.equal(n.number,i+601);assert.equal(n.kind,'individual_name_contemplation');
  for(const key of ['title','spiritual_significance','human_significance'])
   for(const lang of ['en','kn'])assert.ok(n[key]?.[lang]?.length>=15,'Missing '+n.number+' '+key+'.'+lang);
  if(n.traditional_benefit_status==='not_source_verified')assert.ok(!n.traditional_benefit?.en,'Unsourced benefit '+n.number);
 }
 for(const key of ['title','spiritual_significance','human_significance'])
  for(const lang of ['en','kn'])assert.equal(new Set(rows.map(n=>n[key][lang].trim())).size,200,'Duplicate '+key+'.'+lang);
});


test('Batch 5 names 801–1000 have distinct bilingual significance and no unsourced benefits',()=>{
 const rows=JSON.parse(file('data/lalita/wisdom-insights-801-1000.json')).names;
 assert.equal(rows.length,200);
 for(let i=0;i<200;i++){
  const n=rows[i];assert.equal(n.number,i+801);assert.equal(n.kind,'individual_name_contemplation');
  for(const key of ['title','spiritual_significance','human_significance'])
   for(const lang of ['en','kn'])assert.ok(n[key]?.[lang]?.length>=15,'Missing '+n.number+' '+key+'.'+lang);
  if(n.traditional_benefit_status==='not_source_verified')assert.ok(!n.traditional_benefit?.en,'Unsupported claim '+n.number);
 }
 for(const key of ['title','spiritual_significance','human_significance'])
  for(const lang of ['en','kn'])assert.equal(new Set(rows.map(n=>n[key][lang].trim())).size,200,'Duplicate '+key+'.'+lang);
});

test('significance rewrites are bilingual, unique and keep traditional phrases',()=>{
 const rows=JSON.parse(file('data/lalita/significance-rewrites.json')).names;
 const insights=Object.fromEntries(['001-0200','201-0400','401-0600','601-0800','801-1000'].flatMap(n=>JSON.parse(file('data/lalita/wisdom-insights-'+n+'.json')).names).map(n=>[n.number,n]));
 assert.equal(rows.length,1000,'Every name needs a significance rewrite');
 const shorts=rows.filter(r=>r.short).map(r=>r.short.en.trim().toLowerCase());
 assert.equal(new Set(shorts).size,shorts.length,'Short phrases must be unique');
 const seen=new Set();
 for(const row of rows){
  assert.ok(insights[row.number],'Unknown name '+row.number);
  assert.ok(!seen.has(row.number),'Duplicate rewrite '+row.number);seen.add(row.number);
  for(const lang of ['en','kn']){
   assert.ok(row.significance?.[lang]?.length>80,'Missing significance '+row.number+' '+lang);
   // Traditional sourced wording is stored in the separate benefit catalog.
   // A unique short significance phrase can coexist with that traditional benefit.
   assert.ok(row.short?.[lang]?.trim(),'Missing short significance '+row.number+' '+lang);
  }
  assert.doesNotMatch(row.significance.en,/\bbenefit/i,'Uses "benefit" '+row.number);
 }
});

test('verse and Dhyāna meanings share exactly one combined, collapsed disclosure',()=>{
 assert.match(app,/function combinedVerseMeaning\(/);
 assert.match(app,/verse-combined-meaning/);
 assert.doesNotMatch(app,/function optionalVerseMeaning\(|function moreSection\(/);
 assert.match(app,/return combinedVerseMeaning\(summary,info,false,v.verse_number\)/);
 assert.match(app,/return combinedVerseMeaning\(meaning,info,true,v.verse_number\)/);
});
test('Nāmāvalī Sanskrit spellings retain corrected name inflections',()=>{
 const names=JSON.parse(file('data/lalita/namavali-001-1000.json')).names;
 const fixed={64:['ॐ देवर्षिगणसङ्घातस्तूयमानात्मवैभवायै नमः','Oṃ Devarṣigaṇasaṅghātastūyamānātmavaibhavāyai Namaḥ'],
 82:['ॐ कामेश्वरास्त्रनिर्दग्धसभण्डासुरशून्यकायै नमः','Oṃ Kāmeśvarāstranirdagdhasabhaṇḍāsuraśūnyakāyai Namaḥ'],
 107:['ॐ तडिल्लतासमरुच्यै नमः','Oṃ Taḍillatāsamarucyai Namaḥ'],
 376:['ॐ शृङ्गाररससम्पूर्णायै नमः','Oṃ Śṛṅgārarasasampūrṇāyai Namaḥ']};
 for(const [num,[dev,iast]] of Object.entries(fixed)){
  assert.equal(names[+num-1].dev,dev);
  assert.equal(names[+num-1].iast,iast);
 }
});
test('Kannada name 390 has corrected title and all rewritten deeper meanings remain name-indexed',()=>{
 const wis=JSON.parse(file('data/lalita/wisdom-insights-201-0400.json')).names;
 assert.equal(wis[390-201].title.kn,'ನಿರ್ವಾಣದ ಆನಂದ');
 const ranges=['001-005','006-010','011-025','026-050','051-100','101-150','151-200','201-250','251-300','301-350','351-400','401-450','451-500','501-550','551-600','601-650','651-700','701-750','751-800','801-850','851-900','901-950','951-1000'];
 const all=ranges.flatMap(range=>JSON.parse(file('data/lalita/deeper-meanings-'+range+'.json')).names);
 assert.equal(all.length,1000);
 all.forEach((row,i)=>{assert.equal(row.number,i+1);assert.ok(row.en?.length>25);assert.ok(row.kn?.length>15)});
 for(const num of [48,49,61,109])assert.equal(all[num-1].review_status,'name_specific_revision_20261027');
 const forbidden=/^(?:This image invites us to recognize sacred significance within ordinary experience|Contemplation asks how this image might change the quality of our attention and conduct|The poetic image is an invitation to bring more presence into ordinary experience|Reverence is meaningful when it encourages a more thoughtful relationship with life)\.$/;
 all.forEach(row=>assert.doesNotMatch(row.en,forbidden,'Generic meaning for name '+row.number));
});


test('full chanting maps MSS clips using canonical name numbers and never blocks on future preloads',()=>{
 const chant=file('lalita/chant.js');
 assert.match(chant,/state\.audioMap\.get\(n\.number\?\?n\.studyNumber\)/);
 assert.doesNotMatch(chant,/state\.audioMap\.get\(n\.studyNumber\)\|\|\[\]/);
 assert.match(chant,/Promise\.allSettled\(urls\.map\(url=>getBuffer\(url,ctx\)\)\)/);
 assert.doesNotMatch(chant,/await prefetch\(index,[23]\)/);
 assert.match(chant,/void prefetch\(state\.scheduleIndex,2\)/);
 assert.doesNotThrow(()=>new vm.Script(chant,{filename:'lalita/chant.js'}));
});
test('chanting settings retain every learning mode and consistent responsive select styling',()=>{
 const css=file('styles.css');
 for(const id of ['practice-from','practice-to','practice-repeat','practice-voice','guided-from','guided-to','guided-name-repeat','guided-verse-repeat','guided-gap','learning-mode']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(css,/compact, aligned, touch-friendly chanting selectors/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/appearance:none!important/);
 assert.match(css,/min-height:45px!important/);
});
