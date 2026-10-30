const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Vidura page and code are valid and preserve study modes',()=>{const page=read('vidura/index.html');assert.doesNotThrow(()=>new vm.Script(read('vidura/vidura.js')));for(const id of ['vidura-play','vidura-pause','vidura-stop','vidura-mode','vidura-search','vidura-verses'])assert.ok(page.includes('id="'+id+'"'));assert.match(page,/practice/);assert.match(page,/vidura-repeats/);});
test('all 25 selected verses retain source and meanings',()=>{const manifest=JSON.parse(read('data/vidura/manifest.json'));assert.equal(manifest.available_verses,25);assert.equal(manifest.planned_verses,25);for(let n=1;n<=25;n++){const v=JSON.parse(read('data/vidura/verses/verse-'+String(n).padStart(3,'0')+'.json'));assert.equal(v.verse_number,n);assert.equal(v.practice.length,n===3?6:4);assert.ok(v.reading.dev.join(' ').includes('॥ '+String(n).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)])+' ॥'));for(const script of ['dev','kn','iast'])assert.equal(v.reading[script].length,n===3?3:2);for(const language of ['en','kn'])assert.ok(v.meaning[language].length>60);assert.ok(v.word_by_word.length>=4);assert.deepEqual(v.practice.map(x=>x.order),Array.from({length:v.practice.length},(_,i)=>i+1));assert.equal(v.audio.clips.length,v.practice.length);assert.match(v.audio.full,/sloka-0[0-2][0-9]-full\.mp3$/);for(const part of v.practice)assert.match(part.audio,/part-0[1-6]\.mp3$/);}});
test('pdf marks are cut boundaries rather than repetition instructions',()=>{const a=JSON.parse(read('data/vidura/verses/verse-001.json')),b=JSON.parse(read('data/vidura/verses/verse-002.json'));assert.equal(a.practice_source,'pdf-highlight-cut-points');assert.equal(b.practice_source,'editorial-four-part-split');for(const v of [a,b])assert.ok(v.practice.every(p=>!('repeat' in p)&&!('highlighted' in p)));});
test('audio generator creates independently playable parts',()=>{const py=read('scripts/generate_vidura_audio.py');for(const token of ['--dry-run','--part','part-{i+1:02d}.mp3','CowChant','ffmpeg'])assert.ok(py.includes(token));});

test('player supports per-part arbitrary repeat and full playback from four clips',()=>{const js=read('vidura/vidura.js');assert.match(js,/function playbackQueue\(single\)/);assert.match(js,/partCount\(i\)/);assert.match(js,/data-repeat/);assert.match(js,/state\.sequence/);assert.doesNotMatch(js,/call-repeat\.mp3/);});

test('full chanting is a standalone continuous recording, not stitched clips',()=>{const py=read('scripts/generate_vidura_audio.py'),js=read('vidura/vidura.js'),html=read('vidura/index.html');assert.match(py,/cleaned_full\(v\)/);assert.match(py,/sloka-\{n:03d\}-full\.mp3/);assert.match(py,/--mode/);assert.match(js,/function fullPath\(\)/);assert.match(js,/state\.fullReady/);assert.match(js,/audio\.src=fullPath\(\)/);assert.match(html,/Full śloka/);});

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

test('Vidura Part 3 repair uses proper metre, context, and exact gap not guessed cuts',()=>{const py=read('scripts/retry_vidura_part3.py');for(const token of ['METER = "anushtubh"','preserve_original_onsets','second_segment_after_engine_gap','_stitch','0.55','candidates','--dry-run','--keep-context-wav'])assert.ok(py.includes(token));assert.match(py,/नास्ति विद्यार्थिनः सुखम्/);assert.match(py,/सुखार्थी वा त्यजेद् विद्यां/);assert.match(py,/अतिवादः श्रियो वधः/);assert.match(py,/अशुश्रूषा त्वरा श्लाघा/);});

test('Vidura Part 3 loads a fresh audio URL after regeneration',()=>{const js=read('vidura/vidura.js');assert.match(js,/i===2&&Number\(verseSelect\.value\)<=2\?path\+'\?revision=part3-onset-repair-20261030'/);});

test('new verses have separate source-aligned content and no placeholder Kannada glosses',()=>{for(let n=3;n<=25;n++){const v=JSON.parse(read('data/vidura/verses/verse-'+String(n).padStart(3,'0')+'.json'));assert.ok(v.meaning.en.length>60);assert.ok(v.meaning.kn.length>30);assert.ok(v.deeper_meaning.en.length>50);assert.ok(v.word_by_word.every(w=>w.dev&&w.iast&&w.en&&w.kn&&!w.kn.includes('ಪದಾರ್ಥ:')));}});

test('dynamic 25-verse reader and audio queue',()=>{const js=read('vidura/vidura.js'),html=read('vidura/index.html');assert.match(js,/bundle-001-013\.json/);assert.match(js,/v\.practice\.length/);assert.match(js,/Array\(v\.practice\.length\)/);assert.match(js,/verseIndex\.innerHTML/);assert.ok(html.includes('id="vidura-verse-index"'));assert.ok(html.includes('value="25"'));});

test('25-verse generator preserves onsets and generates pending candidates, not existing assets',()=>{const py=read('scripts/generate_vidura_audio.py');for(const term of ['candidates','preserve_original_onsets','extract_context_part','select_gap','--dry-run','--meter','--publish-ready'])assert.ok(py.includes(term));});

test('Vidura batch command previews Sanskrit for all 23 remaining verses without loading audio model',()=>{const cp=require('node:child_process');const result=cp.execFileSync('python3',[path.join(root,'scripts/generate_vidura_audio.py'),'--start','3','--end','25','--dry-run'],{encoding:'utf8',timeout:15000});for(let n=3;n<=25;n++)assert.ok(result.includes('['+String(n).padStart(3,'0')+']'), 'missing verse '+n);assert.match(result,/verse 19: longer metre requires review/i);});

test('Vidura JSON loading bundles exactly match all 25 canonical verse files',()=>{for(const [start,end] of [[1,13],[14,25]]){const bundle=JSON.parse(read('data/vidura/verses/bundle-'+String(start).padStart(3,'0')+'-'+String(end).padStart(3,'0')+'.json'));assert.equal(bundle.length,end-start+1);for(const v of bundle){const canonical=JSON.parse(read('data/vidura/verses/verse-'+String(v.verse_number).padStart(3,'0')+'.json'));assert.deepEqual(v,canonical);}}});

test('Vidura recording initialization never accesses verse before declaration',()=>{const js=read('vidura/vidura.js');const region=js.slice(js.indexOf('async function selectRecording()'),js.indexOf('function playbackQueue('));assert.ok(region.includes('const v=verse()'));assert.ok(region.indexOf('const v=verse()')<region.indexOf('Array(v.practice.length)'));});

test('Vidura uses Lalita-style side player and compact chant rows',()=>{const html=read('vidura/index.html'),css=read('vidura/vidura.css'),js=read('vidura/vidura.js');for(const id of ['vidura-workspace','vidura-player','vidura-dock-toggle','vidura-dock-body','vidura-next','vidura-part-picker','vidura-part-count'])assert.ok(html.includes('id="'+id+'"'));assert.match(css,/position:sticky/);assert.match(css,/vidura-workspace\.dock-collapsed/);assert.match(css,/grid-template-areas:"title controls"/);assert.match(js,/dockToggle\.addEventListener/);assert.match(js,/next\.addEventListener/);assert.match(js,/function renderParts\(/);});
