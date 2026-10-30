#!/usr/bin/env node
// Build two delivery bundles from the canonical per-verse source JSON files.
// Run after any Vidura verse JSON edit; tests will reject stale bundles.
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../data/vidura/verses');
for(const [start,end] of [[1,13],[14,25]]){
 const verses=[];
 for(let n=start;n<=end;n++){
   const id=String(n).padStart(3,'0');
   const source=path.join(dir,'verse-'+id+'.json');
   const verse=JSON.parse(fs.readFileSync(source,'utf8'));
   if(verse.verse_number!==n)throw new Error('Verse number mismatch: '+source);
   verses.push(verse);
 }
 const dest=path.join(dir,'bundle-'+String(start).padStart(3,'0')+'-'+String(end).padStart(3,'0')+'.json');
 fs.writeFileSync(dest,JSON.stringify(verses,null,2)+'\n');
 console.log('Built',path.relative(process.cwd(),dest),'verses',verses.length);
}
