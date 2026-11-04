'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const load=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const verses=[...load('data/vidura/verses/bundle-001-013.json'),...load('data/vidura/verses/bundle-014-025.json')];
function checkCoverage(label,parts,words){
 const allocated=[];
 for(const [i,part] of parts.entries()){
  assert.ok(Array.isArray(part.component_indices),label+' part '+(i+1)+' has no mapping');
  assert.ok(part.component_indices.length>0,label+' part '+(i+1)+' is empty');
  for(const index of part.component_indices){
   assert.ok(Number.isInteger(index)&&index>=0&&index<words.length,label+' invalid index '+index);
   allocated.push(index);
  }
 }
 assert.deepEqual(allocated,words.map((_,i)=>i),label+' word omissions, duplicates, or ordering errors');
}
test('25 Viduranīti ślokas have complete per-phrase word mappings',()=>{
 assert.equal(verses.length,25);
 for(const verse of verses)checkCoverage('Śloka '+verse.verse_number,verse.practice,verse.word_by_word);
});
test('Viduranīti śloka 1 includes vidyā in the FIRST phrase and two occurrences of vā',()=>{
 const verse=verses[0],first=verse.practice[0].component_indices.map(i=>verse.word_by_word[i].iast);
 assert.deepEqual(first,['sukhārthinaḥ','kutaḥ (kuto)','vidyā']);
 assert.equal(verse.word_by_word.filter(w=>w.iast==='vā').length,2);
 assert.ok(verse.practice[0].meaning.en.includes('knowledge'));
});
test('Known sandhi boundaries 13, 15, and 24 are not combined across phrases',()=>{
 for(const [n,expected] of [[13,['rājan','anarthāyopapadyate']],[15,['kiñcit',"asato'narcayaṃ"]],[24,['krodham','ācāro']]]){
  const v=verses.find(v=>v.verse_number===n);
  assert.ok(v, 'Missing śloka '+n);
  for(const word of expected)assert.ok(v.word_by_word.some(w=>w.iast===word),n+' missing '+word);
 }
});
test('All four Lalitā dhyāna verses include every word exactly once in the phrase details',()=>{
 const phrases=load('data/lalita/dhyana-mss-phrases.json').phrases;
 const studies=[...load('data/lalita/study-dhyana-01-02.json'),...load('data/lalita/study-dhyana-03-04.json')];
 assert.equal(studies.length,4);
 for(const verse of studies)checkCoverage('Dhyāna '+verse.verse_number,phrases.filter(p=>p.verse===verse.verse_number),verse.components);
});
