const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Vidura page and code are valid and preserve study modes',()=>{const page=read('vidura/index.html');assert.doesNotThrow(()=>new vm.Script(read('vidura/vidura.js')));for(const id of ['vidura-play','vidura-pause','vidura-stop','vidura-mode','vidura-search','vidura-verses'])assert.ok(page.includes('id="'+id+'"'));assert.match(page,/practice/);assert.match(page,/vidura-repeats/);});
test('two source verses preserve printed text and meanings',()=>{const manifest=JSON.parse(read('data/vidura/manifest.json'));assert.equal(manifest.available_verses,2);assert.equal(manifest.planned_verses,25);for(let n=1;n<=2;n++){const v=JSON.parse(read('data/vidura/verses/verse-'+String(n).padStart(3,'0')+'.json'));assert.equal(v.verse_number,n);assert.equal(v.practice.length,4);assert.ok(v.reading.dev.join(' ').includes('॥ '+['','१','२'][n]+' ॥'));for(const script of ['dev','kn','iast'])assert.equal(v.reading[script].length,2);for(const language of ['en','kn'])assert.ok(v.meaning[language].length>60);assert.ok(v.word_by_word.length>=10);assert.deepEqual(v.practice.map(x=>x.order),[1,2,3,4]);assert.equal(v.audio.clips.length,4);assert.match(v.audio.full,/sloka-00[12]-full\.mp3$/);for(const part of v.practice)assert.match(part.audio,/part-0[1-4]\.mp3$/);}});
test('pdf marks are cut boundaries rather than repetition instructions',()=>{const a=JSON.parse(read('data/vidura/verses/verse-001.json')),b=JSON.parse(read('data/vidura/verses/verse-002.json'));assert.equal(a.practice_source,'pdf-highlight-cut-points');assert.equal(b.practice_source,'editorial-four-part-split');for(const v of [a,b])assert.ok(v.practice.every(p=>!('repeat' in p)&&!('highlighted' in p)));});
test('audio generator creates independently playable parts',()=>{const py=read('scripts/generate_vidura_audio.py');for(const token of ['--dry-run','--part','part-{i:02d}.mp3','CowChant','ffmpeg'])assert.ok(py.includes(token));});

test('player supports per-part arbitrary repeat and full playback from four clips',()=>{const js=read('vidura/vidura.js');assert.match(js,/function playbackQueue\(single\)/);assert.match(js,/partCount\(i\)/);assert.match(js,/data-repeat/);assert.match(js,/state\.sequence/);assert.doesNotMatch(js,/call-repeat\.mp3/);});

test('full chanting is a standalone continuous recording, not stitched clips',()=>{const py=read('scripts/generate_vidura_audio.py'),js=read('vidura/vidura.js'),html=read('vidura/index.html');assert.match(py,/continuous_chant\(verse\)/);assert.match(py,/sloka-\{number:03d\}-full\.mp3/);assert.match(py,/--mode/);assert.match(js,/function fullPath\(\)/);assert.match(js,/state\.fullReady/);assert.match(js,/audio\.src=fullPath\(\)/);assert.match(html,/Full śloka · continuous recording/);});

test('continuous Sa-Pa-Sa shruti has controls and stops with playback',()=>{const page=read('vidura/index.html'),drone=read('vidura/shruti.js'),player=read('vidura/vidura.js');assert.doesNotThrow(()=>new vm.Script(drone));for(const id of ['vidura-shruti-enabled','vidura-shruti-tonic','vidura-shruti-volume'])assert.ok(page.includes('id="'+id+'"'));assert.match(drone,/createOscillator/);assert.match(drone,/\[1\.5,/);assert.match(player,/ViduraShruti\?\.start/);assert.match(player,/ViduraShruti\?\.stop/);});

test('Vidura browser speed control is independent of Vāgdhenu recording speed',()=>{
 const html=read('vidura/index.html'), js=read('vidura/vidura.js');
 const py=read('scripts/generate_vidura_audio.py');
 const manifest=JSON.parse(read('data/vidura/manifest.json'));
 for(const id of ['vidura-speed','vidura-speed-value'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/function applyChantSpeed\(\)/);
 assert.match(js,/audio\.playbackRate=rate/);
 assert.match(js,/audio\.defaultPlaybackRate=rate/);
 assert.match(js,/audio\.preservesPitch=true/);
 assert.match(js,/speed\.addEventListener\('input',applyChantSpeed\)/);
 assert.match(js,/audio\.src=fullPath\(\);applyChantSpeed\(\)/);
 assert.match(js,/state\.queueIndex\+\+.*applyChantSpeed\(\)/s);
 assert.equal(manifest.audio.generation_speed,1.05);
 assert.equal(manifest.audio.browser_playback_speed.default,0.90);
 assert.ok(py.includes('default=1.05'));
});

test('Part 3 retry uses precise Sanskrit and never overwrites published recordings',()=>{const py=read('scripts/retry_vidura_part3.py');assert.match(py,/सुखार्थी वा त्यजेद् विद्यां/);assert.match(py,/अशुश्रूषा त्वरा श्लाघा/);assert.match(py,/candidates/);assert.match(py,/--dry-run/);assert.match(py,/\["practice"\]\[2\]/);});
