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
test('Nāmāvalī remains in expandable detail rather than inline row',()=>{
 assert.match(app,/function inlineNameMantra\(number\)/);
 assert.doesNotMatch(app,/name-mantra-slot[^\n]*inlineNameMantra\(number\)/);
 assert.match(app,/nameMantraToggle\(nameNumber\)/);
 assert.match(app,/namavali-001-1000\.json/);
 assert.match(app,/function nameMantraToggle\(number\)/);
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

test('benefit template distinguishes traditional, spiritual and human meaning',()=>{
 for(const key of ['Traditional benefit','Spiritual significance','Human significance','Contemplative benefit'])assert.ok(app.includes(key),key);
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
