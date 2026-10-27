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


test('Nāmāvalī stays visible and correct in both scripts',async({page})=>{
 await page.goto('/lalita/?sloka=1');
 await expect(page.locator('.name-audio-card').first()).toBeVisible({timeout:20000});
 await expect(page.locator('.name-mantra-inline').first()).toContainText('ॐ श्रीमात्रे नमः');
 await expect(page.locator('.name-mantra-inline').first()).toBeVisible();
 await page.locator('#kn').click();
 await expect(page.locator('.name-mantra-inline').first()).toContainText('ಓಂ');
 await expect(page.locator('.name-mantra-inline').first()).toContainText('ನಮಃ');
 await page.locator('#dev').click();
 await expect(page.locator('.name-mantra-inline').first()).toContainText('ॐ');
});
test('all names keep individual mantra and benefit sections',async({page})=>{
 await page.goto('/lalita/?sloka=91');
 await expect(page.locator('#verse-91 .name-mantra-inline').first()).toBeVisible({timeout:20000});
 await page.locator('#verse-91 .name-details').first().locator('summary').first().click();
 await expect(page.locator('#verse-91 .name-mantra-toggle').first()).toBeVisible();
 await expect(page.locator('#verse-91 .name-spiritual-benefit').first()).toBeVisible();
});
