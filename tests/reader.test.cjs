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
