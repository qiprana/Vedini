const {test,expect}=require('@playwright/test');

test('Viduranīti full śloka speed control and shruti are available',async({page})=>{
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto('/vidura/');
 await expect(page.locator('.vidura-card')).toHaveCount(2);
 await expect(page.locator('#vidura-speed')).toHaveValue('0.90');
 await expect(page.locator('#vidura-speed-value')).toHaveText('0.90×');
 await expect(page.locator('#vidura-shruti-enabled')).toBeChecked();
 await expect(page.locator('#vidura-play')).toBeEnabled();
 await page.locator('#vidura-speed').evaluate(el=>{el.value='0.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#vidura-speed-value')).toHaveText('0.75×');
 const actual=await page.locator('#vidura-audio').evaluate(el=>({rate:el.playbackRate,pitch:el.preservesPitch}));
 expect(actual.rate).toBeCloseTo(.75);
 expect(actual.pitch).toBe(true);
 await page.locator('#vidura-mode').selectOption('practice');
 await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(4);
 await expect(page.locator('#vidura-part-picker [data-part="0"]')).toBeEnabled();
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
 await page.goto('/vidura/');
 await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(4);
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
 expect(played.map(x=>x.src.match(/part-(\\d\\d)\\.mp3/)[1])).toEqual(['01','01','02','02','03','03','04','04']);
 expect(played.every(x=>Math.abs(x.speed-.8)<.001)).toBe(true);
});

test('Viduranīti mobile practice controls remain usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/vidura/');
 await expect(page.locator('#vidura-speed')).toBeVisible();
 await expect(page.locator('#vidura-shruti-volume')).toBeVisible();
 await expect(page.locator('#vidura-mode')).toBeVisible();
 await expect(page.locator('#vidura-part-picker .vidura-part')).toHaveCount(4);
 await expect(page.locator('#vidura-play')).toBeEnabled();
});
