const {test,expect}=require('@playwright/test');
test('Lalita page loads content without runtime errors',async({page})=>{
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/lalita/');
 await expect(page.locator('#guided-from option')).toHaveCount(183,{timeout:20000});
 await expect(page.locator('#practice-from option')).toHaveCount(183);
 await expect(page.locator('.name-audio-card').first()).toBeVisible();
 await expect(page.getByText('Unable to load study content')).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('practice modes switch and preserve controls',async({page})=>{
 await page.goto('/lalita/');
 await expect(page.locator('#practice-play')).toBeVisible();
 await page.locator('#learning-mode').selectOption('both');
 await expect(page.locator('#guided-play')).toBeVisible();
 await expect(page.locator('#guided-name-repeat')).toHaveValue('2');
 await page.locator('#learning-mode').selectOption('chant');
 await expect(page.locator('#practice-repeat')).toHaveValue('2');
 await expect(page.locator('#practice-play')).toBeVisible();
});

test('script toggle matches the rendered text and About starts closed',async({page})=>{
 await page.goto('/lalita/');
 await expect(page.locator('#dev')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.reader-page')).not.toHaveClass(/kannada-mode/);
 await expect(page.locator('.about-lalita')).not.toHaveAttribute('open','');
 await page.locator('#kn').click();
 await expect(page.locator('.reader-page')).toHaveClass(/kannada-mode/);
 await page.locator('#dev').click();
 await expect(page.locator('.reader-page')).not.toHaveClass(/kannada-mode/);
});
test('practice dock appears before language choices',async({page})=>{
 await page.goto('/lalita/');
 const before=await page.evaluate(()=>!!(document.querySelector('.practice-dock').compareDocumentPosition(document.querySelector('.reader-top-tools')) & Node.DOCUMENT_POSITION_FOLLOWING));
 expect(before).toBe(true);
});


test('Nāmāvalī sits under the śloka in both scripts, not inside each name',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 const card=page.locator('#verse-1 .name-audio-card').first();
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.locator('.name-mantra-inline')).toHaveCount(0);
 await card.locator('.name-details>summary').click();
 await expect(card.locator('.name-mantra-toggle')).toHaveCount(0);
 const namavali=page.locator('#verse-1 .verse-reading-panel .verse-namavali');
 await expect(namavali.locator('.mantra-script').first()).toContainText('ॐ श्रीमात्रे नमः');
 await expect(namavali.locator('.mantra-iast').first()).toBeVisible();
 await page.locator('#kn').click();
 const kn=page.locator('#verse-1 .verse-reading-panel .verse-namavali');
 await expect(kn.locator('.mantra-script').first()).toContainText('ಓಂ');
});
test('all names keep a Nāmāvalī mantra and a Significance section',async({page})=>{
 await page.goto('/lalita/?sloka=91');
 await expect(page.locator('#verse-91 .name-audio-card').first()).toBeVisible({timeout:20000});
 const names=await page.locator('#verse-91 .name-audio-card').count();
 await expect(page.locator('#verse-91 .verse-namavali .namavali-item')).toHaveCount(names);
 await page.locator('#verse-91 .name-details').first().locator('summary').first().click();
 await expect(page.locator('#verse-91 .name-significance').first()).toBeVisible();
});

test('search includes word-by-word English and highlights corresponding Kannada',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 await expect(page.locator('.name-audio-card').first()).toBeVisible({timeout:20000});
 await page.locator('#kn').click();
 await page.locator('#search').fill('Mother');
 await expect(page.locator('.search-result').first()).toBeVisible();
 await expect(page.locator('.search-result .result-glossary mark').first()).toBeVisible();
 await page.locator('.search-result[data-kind="verses"][data-number="1"]').click();
 await expect(page.locator('#verse-1 .name-details').first()).toHaveAttribute('open','');
 await expect(page.locator('#verse-1 .word-translation mark').first()).toBeVisible();
});
test('individual name audio remains separate from the Nāmāvalī',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 await expect(page.locator('#verse-1 .name-audio-button').first()).toBeVisible({timeout:20000});
 await expect(page.locator('#verse-1 .name-mantra-inline')).toHaveCount(0);
 await expect(page.locator('#verse-1 .verse-namavali').first()).toBeVisible();
 await expect(page.locator('#verse-1 .name-audio-button').first()).toHaveAttribute('data-name-clips',/\d+/);
 await expect(page.locator('#verse-1 .verse-namavali').first()).not.toContainText('▶ Play');
});


test('Divine Name audio buttons play the assigned MSS clips without opening guided practice',async({page})=>{
 await page.addInitScript(()=>{
  window.__nameClipPlayRequests=[];
  HTMLMediaElement.prototype.play=function(){
   window.__nameClipPlayRequests.push(this.getAttribute('src'));
   return Promise.resolve();
  };
 });
 await page.goto('/lalita/?sloka=1');
 const first=page.locator('#verse-1 .name-audio-button').first();
 await expect(first).toBeVisible({timeout:20000});
 const assigned=(await first.getAttribute('data-name-clips')).split(',');
 await first.click();
 await expect.poll(()=>page.evaluate(()=>window.__nameClipPlayRequests.length)).toBe(1);
 const played=await page.evaluate(()=>window.__nameClipPlayRequests[0]);
 expect(played).toContain('/audio/lalita/verses/MSS/phrase_'+assigned[0].padStart(4,'0')+'.mp3');
 await expect(first).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.chanting-panels')).toHaveAttribute('data-mode','chant');
 await expect(page.locator('#verse-1 .name-details').first()).not.toHaveAttribute('open','');
 // Switching Sanskrit scripts re-renders each name, which must remain playable.
 await page.locator('#kn').click();
 const firstKannada=page.locator('#verse-1 .name-audio-button').first();
 await firstKannada.click();
 await expect.poll(()=>page.evaluate(()=>window.__nameClipPlayRequests.length)).toBe(2);
 await expect(firstKannada).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.chanting-panels')).toHaveAttribute('data-mode','chant');
});

test('divine names use compact side-by-side reading and meaning on desktop',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/lalita/?sloka=36');
 const card=page.locator('#verse-36 .name-audio-card').first();
 await expect(card).toBeVisible({timeout:20000});
 const row=card.locator('.name-summary-grid');
 const identity=row.locator('.name-identity-inline');
 const meaning=row.locator('.name-essence');
 const mantra=row.locator('.name-inline-wisdom-slot');
 const insight=row.locator('.name-essence');
 const ir=await identity.boundingBox(),mr=await meaning.boundingBox(),nr=await mantra.boundingBox(),sr=await insight.boundingBox();
 expect(ir&&mr&&nr&&sr).toBeTruthy();
 // Name typography and reading columns must remain visible and contained.
 expect(ir.width).toBeGreaterThan(90);
 expect(mr.width).toBeGreaterThan(90);
 expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+3)).toBe(true);
 expect(Math.abs(sr.x-mr.x)).toBeLessThan(4);
 await expect(card.locator('.name-mantra-inline')).toHaveCount(0);
 await expect(card.locator('.name-details')).not.toHaveAttribute('open','');
 await card.locator('.name-details>summary').click();
 await expect(card.locator('.name-mantra-toggle')).toHaveCount(0);
 await expect(card.locator('.name-significance')).toBeVisible();
});
test('compact divine-name columns preserve Kannada and mobile legibility',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/lalita/?sloka=36');
 await expect(page.locator('#verse-36 .name-audio-card').first()).toBeVisible({timeout:20000});
 await page.locator('#kn').click();
 const card=page.locator('#verse-36 .name-audio-card').first();
 await expect(card.locator('.name-mantra-inline')).toHaveCount(0);
 await expect(card.locator('.name-essence')).toBeVisible();
 const width=await card.evaluate(el=>el.getBoundingClientRect().width);
 expect(width).toBeGreaterThan(220);
 expect(await card.locator('.name-summary-grid').evaluate(el=>el.scrollWidth<=el.clientWidth+3)).toBeTruthy();
});

test('traditional phrase in the row and one Significance reading when expanded',async({page})=>{
 await page.goto('/lalita/?sloka=31');
 const name=page.locator('[data-detail-id="name-78"]');
 await expect(name).toBeVisible({timeout:20000});
 await expect(name.locator('.name-inline-wisdom')).toContainText('Untying Obstacles at Their Root');
 await expect(name.locator('.name-benefit-line')).toContainText('Removal of Obstacles');
 await expect(name.locator('.name-mantra-inline')).toHaveCount(0);
 await name.locator('summary').first().click();
 const details=name.locator('.name-significance');
 await expect(details.locator('summary')).toHaveText('Meaning & significance');
 await details.locator('summary').click();
 await expect(details.locator('.deeper-reading')).toContainText(/removal of obstacles/i);
 await expect(details.locator('h5')).toHaveCount(0);
});
test('Nāmāvalī keeps the name hyphens, has no numbers, and script matches IAST size',async({page})=>{
 await page.goto('/lalita/?sloka=30');
 const list=page.locator('#verse-30 .verse-namavali');
 await expect(list.locator('.mantra-script').first()).toContainText('ॐ विशुक्र-प्राणहरण-वाराही-वीर्य-नन्दितायै नमः',{timeout:20000});
 await expect(list.locator('.mantra-iast').first()).toContainText('Oṃ Viśukra-prāṇaharaṇa-vārāhī-vīrya-nanditāyai Namaḥ');
 await expect(list.locator('.namavali-number')).toHaveCount(0);
 const size=sel=>page.locator(sel).first().evaluate(el=>getComputedStyle(el).fontSize);
 expect(Math.abs(parseFloat(await size('#verse-30 .verse-script .line-content'))-parseFloat(await size('#verse-30 .verse-iast .line-content')))).toBeLessThanOrEqual(1);
 expect(await size('#verse-30 .name-written')).toBe(await size('#verse-30 .name-roman'));
 await expect(page.locator('[data-detail-id="name-76"] .name-inline-wisdom')).not.toContainText('Corruption');
});

test('overall and deeper śloka content appears in one meaning toggle in both languages',async({page})=>{
 await page.goto('/lalita/?sloka=13');
 const item=page.locator('#verse-13');
 await expect(item.locator('.verse-combined-meaning')).toHaveCount(1,{timeout:20000});
 await expect(item.locator('.verse-overall-meaning,.verse-deeper-meaning')).toHaveCount(0);
 const merged=item.locator('.verse-combined-meaning');
 await expect(merged).not.toHaveAttribute('open','');
 await merged.locator('summary').click();
 await expect(merged.locator('.overall-reading')).toBeVisible();
 await expect(merged.locator('.deeper-reading')).toBeVisible();
 await page.locator('#kn').click();
 await expect(item.locator('.verse-combined-meaning summary')).toContainText('ಅರ್ಥ');
 await expect(item.locator('.verse-combined-meaning')).not.toHaveAttribute('open','');
});

test('Study reader keeps reading-mode tabs and verse index visible during desktop scrolling',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/lalita/?sloka=36');
 await expect(page.locator('#verse-36 .name-audio-card').first()).toBeVisible({timeout:20000});
 const tabs=page.locator('.study-main-content>.lalita-reader-toolbar');
 const index=page.locator('#sticky-verse-navigation');
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight/2));
 await expect.poll(()=>tabs.evaluate(el=>Math.round(el.getBoundingClientRect().top))).toBe(0);
 const bottom=await tabs.evaluate(el=>el.getBoundingClientRect().bottom);
 const indexTop=await index.evaluate(el=>el.getBoundingClientRect().top);
 expect(indexTop).toBeGreaterThanOrEqual(bottom-2);
});
test('Mobile Study reader has accessible bottom player and expandable settings without covering tabs',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/lalita/?sloka=1');
 await expect(page.locator('.name-audio-card').first()).toBeVisible({timeout:20000});
 const dock=page.locator('#practice-dock');
 const settings=page.locator('#practice-dock-toggle');
 await expect(dock).not.toHaveClass(/mobile-settings-open/);
 await expect(page.locator('#practice-dock-body')).toBeHidden();
 await expect(page.locator('#dock-play')).toBeVisible();
 const geometry=await dock.evaluate(el=>({r:el.getBoundingClientRect().toJSON(),height:innerHeight}));
 expect(geometry.r.bottom).toBeLessThanOrEqual(geometry.height+2);
 expect(geometry.r.height).toBeLessThan(180);
 await settings.click();
 await expect(dock).toHaveClass(/mobile-settings-open/);
 await expect(page.locator('#practice-from')).toBeVisible();
 await settings.click();
 await expect(page.locator('#practice-dock-body')).toBeHidden();
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight/2));
 await expect.poll(()=>page.locator('.study-main-content>.lalita-reader-toolbar').evaluate(el=>Math.round(el.getBoundingClientRect().top))).toBe(0);
 await expect(page.locator('.lalita-view-switcher a')).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3)).toBe(true);
});
test('Full Chanting bottom player keeps playback transport visible on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/lalita/chant.html');
 await expect(page.locator('#fc-range-tabs button').first()).toBeVisible({timeout:30000});
 const dock=page.locator('#practice-dock');
 await expect(page.locator('#dock-play')).toBeEnabled();
 await expect(page.locator('#practice-dock-body')).toBeHidden();
 await expect.poll(()=>dock.evaluate(el=>Math.round(el.getBoundingClientRect().bottom))).toBe(844);
 await page.locator('#practice-dock-toggle').click();
 await expect(page.locator('#fc-voice')).toBeVisible();
 await expect(page.locator('#fc-jump')).toBeVisible();
 await page.locator('#practice-dock-toggle').click();
 await expect(page.locator('#practice-dock-body')).toBeHidden();
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight/2));
 await expect.poll(()=>page.locator('.fc-main-content>.lalita-reader-toolbar').evaluate(el=>Math.round(el.getBoundingClientRect().top))).toBe(0);
});

test('single learning selector switches conditional fields and uses same transport',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 await expect(page.locator('#learning-mode')).toBeVisible();
 await expect(page.locator('#practice-from')).toBeVisible();
 await page.locator('#learning-mode').selectOption('names');
 await expect(page.locator('#guided-from')).toBeVisible();
 await expect(page.locator('#guided-name-repeat')).toBeVisible();
 await expect(page.locator('.guided-verse-setting')).toBeHidden();
 await page.locator('#learning-mode').selectOption('verse');
 await expect(page.locator('.guided-name-setting')).toBeHidden();
 await expect(page.locator('#guided-verse-repeat')).toBeVisible();
 await page.locator('#learning-mode').selectOption('both');
 await expect(page.locator('.guided-name-setting')).toBeVisible();
 await expect(page.locator('.guided-verse-setting')).toBeVisible();
 await page.locator('#learning-mode').selectOption('chant');
 await expect(page.locator('#practice-voice')).toBeVisible();
 await expect(page.locator('#guided-panel')).toBeHidden();
});
