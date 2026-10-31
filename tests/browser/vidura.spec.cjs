const {test,expect}=require('@playwright/test');
async function stableAudioAvailability(page){
 await page.route('**/audio/vidura/*',route=>{
  if(route.request().method()==='HEAD'){
   const name=decodeURIComponent(new URL(route.request().url()).pathname);
   return route.fulfill({status:/sloka-00[12]-/.test(name)?200:404,body:''});
  }
  return route.continue();
 });
}

test('Viduranīti full śloka speed control and shruti are available',async({page})=>{
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await stableAudioAvailability(page);
 await page.goto('/vidura/');
 await expect(page.locator('.vidura-card')).toHaveCount(25);
 await expect(page.locator('#vidura-speed')).toHaveValue('0.9');
 await expect(page.locator('#vidura-speed-value')).toHaveText('0.90×');
 await expect(page.locator('#vidura-shruti-enabled')).toBeChecked();
 await expect(page.locator('#vidura-play')).toBeEnabled({timeout:15000});
 await page.locator('#vidura-speed').evaluate(el=>{el.value='0.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#vidura-speed-value')).toHaveText('0.75×');
 const actual=await page.locator('#vidura-audio').evaluate(el=>({rate:el.playbackRate,pitch:el.preservesPitch}));
 expect(actual.rate).toBeCloseTo(.75);
 expect(actual.pitch).toBe(true);
 await page.locator('#vidura-mode').selectOption('practice');
 await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(4,{timeout:15000});
 await expect(page.locator('#vidura-part-picker [data-part="0"]')).toBeEnabled({timeout:15000});
 expect(errors).toEqual([]);
});

test('Viduranīti clip transitions preserve playback speed and user repeat counts',async({page})=>{
 await page.addInitScript(()=>{
  window.__viduraPlayed=[];
  HTMLMediaElement.prototype.play=function(){
    window.__viduraPlayed.push({src:this.getAttribute('src'),speed:this.playbackRate});
    Object.defineProperty(this,'paused',{configurable:true,get:()=>false});
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,get:()=>true});};
 });
 await stableAudioAvailability(page);
 await page.goto('/vidura/');
 await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(4,{timeout:15000});
 await page.locator('#vidura-shruti-enabled').uncheck();
 await page.locator('#vidura-mode').selectOption('practice');
 await page.locator('#vidura-repeats').selectOption('2');
 await page.locator('#vidura-speed').evaluate(el=>{el.value='0.8';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#vidura-play').click();
 const player=page.locator('#vidura-audio');
 await expect.poll(()=>page.evaluate(()=>window.__viduraPlayed.length)).toBe(1);
 for(let i=0;i<7;i++)await player.dispatchEvent('ended');
 await expect.poll(()=>page.evaluate(()=>window.__viduraPlayed.length)).toBe(8);
 const played=await page.evaluate(()=>window.__viduraPlayed);
 expect(played.map(x=>x.src.match(/part-(\d\d)\.mp3/)[1])).toEqual(['01','01','02','02','03','03','04','04']);
 expect(played.every(x=>Math.abs(x.speed-.8)<.001)).toBe(true);
});

test('Viduranīti mobile practice controls remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await stableAudioAvailability(page);
 await page.goto('/vidura/');
 await expect(page.locator('#vidura-dock-toggle')).toHaveAttribute('aria-expanded','false');
 await page.locator('#vidura-dock-toggle').click();
 await expect(page.locator('#vidura-speed')).toBeVisible();
 await expect(page.locator('#vidura-shruti-volume')).toBeVisible();
 await expect(page.locator('#vidura-mode')).toBeVisible();
 await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(4,{timeout:15000});
 await expect(page.locator('#vidura-play')).toBeEnabled({timeout:15000});
});

test('Viduranīti unusual three-line verse supports six practice parts',async({page})=>{await page.goto('/vidura/');await expect(page.locator('.vidura-card')).toHaveCount(25);await page.locator('#vidura-verse').selectOption('3');await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(6,{timeout:15000});await expect(page.locator('#vidura-play')).toBeEnabled();});

test('Vidura uploaded recordings enable verse 25 and mark verse 19 pending',async({page})=>{await page.goto('/vidura/');await page.locator('#vidura-verse').selectOption('25');await expect(page.locator('#vidura-play')).toBeEnabled();await expect(page.locator('#vidura-part-picker [data-part="3"]')).toBeEnabled();await page.locator('#vidura-verse').selectOption('19');await expect(page.locator('#vidura-play')).toBeDisabled();await expect(page.locator('#vidura-audio-state')).toContainText('pending');});

test('Vidura portions are alongside Sanskrit, selecting another verse plays the corresponding part',async({page})=>{await page.addInitScript(()=>{window.__playedVidura=[];HTMLMediaElement.prototype.play=function(){window.__playedVidura.push(this.getAttribute('src'));return Promise.resolve();};});await page.goto('/vidura/');await expect(page.locator('.vidura-card')).toHaveCount(25);await expect(page.locator('#vidura-verse-2 .vidura-inline-preview-row')).toHaveCount(4);await expect(page.locator('#vidura-verse-1 #vidura-part-picker .vidura-part')).toHaveCount(4);await page.locator('#vidura-verse-2 [data-select-part="2"]').click();await expect(page.locator('#vidura-verse')).toHaveValue('2');await expect(page.locator('#vidura-verse-2 #vidura-part-picker .vidura-part')).toHaveCount(4);await expect.poll(()=>page.evaluate(()=>window.__playedVidura.some(x=>x&&x.includes('sloka-002-part-03.mp3')))).toBe(true);});

test('Full sloka repeat plays complete audio twice and part controls have no redundant repeat fields',async({page})=>{await page.addInitScript(()=>{window.__viduraPlayed=[];HTMLMediaElement.prototype.play=function(){window.__viduraPlayed.push(this.getAttribute('src'));return Promise.resolve();};});await page.goto('/vidura/');await expect(page.locator('#vidura-repeats')).toBeEnabled();await expect(page.locator('#vidura-part-picker input[data-repeat]')).toHaveCount(0);await page.locator('#vidura-repeats').selectOption('2');await page.locator('#vidura-play').click();await expect.poll(()=>page.evaluate(()=>window.__viduraPlayed.length)).toBe(1);await page.locator('#vidura-audio').dispatchEvent('ended');await expect.poll(()=>page.evaluate(()=>window.__viduraPlayed.length)).toBe(2);expect(await page.evaluate(()=>window.__viduraPlayed)).toEqual(['../audio/vidura/sloka-001-full.mp3','../audio/vidura/sloka-001-full.mp3']);});

test('Numbered verse index selects verse and shows compact active title',async({page})=>{await page.goto('/vidura/');await expect(page.locator('#vidura-verse-index a')).toHaveCount(25);await expect(page.locator('#vidura-verse-index a').first()).toHaveText('01');await page.locator('#vidura-verse-index [data-index-verse="7"]').click();await expect(page.locator('#vidura-verse')).toHaveValue('7');await expect(page.locator('#vidura-index-current')).toContainText('Strength of discernment');await expect(page.locator('#vidura-verse-index [data-index-verse="7"]')).toHaveAttribute('aria-current','location');});
