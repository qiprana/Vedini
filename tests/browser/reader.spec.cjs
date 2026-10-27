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
