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
 await page.locator('#practice-tab-guided').click();
 await expect(page.locator('#guided-play')).toBeVisible();
 await expect(page.locator('#guided-name-repeat')).toHaveValue('2');
 await page.locator('#practice-tab-chant').click();
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


test('Nāmāvalī stays in the expandable details in both scripts',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 const card=page.locator('#verse-1 .name-audio-card').first();
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.locator('.name-mantra-inline')).toHaveCount(0);
 await card.locator('.name-details>summary').click();
 await card.locator('.name-mantra-toggle>summary').click();
 await expect(card.locator('.mantra-script')).toContainText('ॐ श्रीमात्रे नमः');
 await page.locator('#kn').click();
 const kn=page.locator('#verse-1 .name-audio-card').first();
 await kn.locator('.name-details>summary').click();
 await kn.locator('.name-mantra-toggle>summary').click();
 await expect(kn.locator('.mantra-script')).toContainText('ಓಂ');
});
test('all names keep individual mantra and benefit sections',async({page})=>{
 await page.goto('/lalita/?sloka=91');
 await expect(page.locator('#verse-91 .name-audio-card').first()).toBeVisible({timeout:20000});
 await page.locator('#verse-91 .name-details').first().locator('summary').first().click();
 await expect(page.locator('#verse-91 .name-mantra-toggle').first()).toBeVisible();
 await expect(page.locator('#verse-91 .name-spiritual-benefit').first()).toBeVisible();
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
test('individual name audio remains separate from Nāmāvalī toggle',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 await expect(page.locator('#verse-1 .name-audio-button').first()).toBeVisible({timeout:20000});
 await expect(page.locator('#verse-1 .name-mantra-inline')).toHaveCount(0);
 await page.locator('#verse-1 .name-details').first().locator('summary').first().click();
 await expect(page.locator('#verse-1 .name-mantra-toggle').first()).toBeVisible();
 await expect(page.locator('#verse-1 .name-audio-button').first()).toHaveAttribute('data-name-clips',/\d+/);
 await expect(page.locator('#verse-1 .name-mantra-toggle').first()).not.toContainText('▶ Play');
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
 expect(mr.x).toBeGreaterThan(ir.x+ir.width-2);
 expect(Math.abs(nr.x-mr.x)).toBeLessThan(4);
 expect(Math.abs(sr.x-mr.x)).toBeLessThan(4);
 await expect(card.locator('.name-mantra-inline')).toHaveCount(0);
 await expect(card.locator('.name-details')).not.toHaveAttribute('open','');
 await card.locator('.name-details>summary').click();
 await expect(card.locator('.name-mantra-toggle')).toBeVisible();
 await expect(card.locator('.name-spiritual-benefit')).toBeVisible();
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

test('benefit preview and expandable three-facet template for traditional entries',async({page})=>{
 await page.goto('/lalita/?sloka=31');
 const name=page.locator('[data-detail-id="name-78"]');
 await expect(name).toBeVisible({timeout:20000});
 await expect(name.locator('.name-inline-wisdom')).toContainText('Removal of Obstacles');
 await expect(name.locator('.name-mantra-inline')).toHaveCount(0);
 await name.locator('summary').first().click();
 const details=name.locator('.name-spiritual-benefit');
 await details.locator('summary').click();
 await expect(details.locator('.benefit-traditional')).toContainText('Removal of Obstacles');
 await expect(details.locator('.benefit-spiritual')).toBeVisible();
 await expect(details.locator('.benefit-human')).toBeVisible();
});
