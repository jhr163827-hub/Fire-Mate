const {test,expect}=require('@playwright/test');
test('paper investigation, marking, notebook and save recovery',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/arcade/paper-calendar/');
 await expect(page.locator('#days .polaroid')).toHaveCount(30);
 await page.locator('[data-day="1"]').click();await expect(page.locator('#case-overlay')).toBeVisible();
 await page.locator('#next-page').click();await expect(page.locator('.memo-line')).toHaveCount(3);
 await page.locator('#next-page').click();await page.locator('[data-tool="highlight"]').click();
 await page.locator('.name-grid .markable').first().click();await expect(page.locator('.name-grid .markable').first()).toHaveClass(/mark-highlight/);
 await page.locator('#close-case').click();await page.reload();await page.locator('[data-day="1"]').click();await page.locator('#next-page').click();await page.locator('#next-page').click();await expect(page.locator('.name-grid .markable').first()).toHaveClass(/mark-highlight/);
 await page.locator('#case-notebook').click();expect(await page.evaluate(()=>{const form=document.querySelector('#answer-form'),rows=document.querySelector('#note-rows');return !!form.compareDocumentPosition(rows)&&form.getBoundingClientRect().top<rows.getBoundingClientRect().top})).toBeTruthy();await page.locator('#answer-name').fill('틀린이름');await page.locator('#answer-form button[type="submit"]').click();await expect(page.locator('#answer-feedback')).toContainText('맞지 않는 이름');
 await page.locator('#answer-name').fill('유서진');await page.locator('#answer-form button[type="submit"]').click();await expect(page.locator('#answer-feedback')).toContainText('정답입니다');await page.locator('#close-notebook').click();await page.locator('#close-case').click();await expect(page.locator('#progress-count')).toContainText('1 / 30');
});
test('every puzzle type can be opened and compact view does not overflow',async({page})=>{
 for(const [width,height] of [[320,700],[390,844],[844,390]]){await page.setViewportSize({width,height});await page.goto('/arcade/paper-calendar/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  for(const n of [1,2,3,4,5,6]){await page.locator(`[data-day="${n}"]`).click();const pages=await page.locator('#next-page').evaluate(e=>Number(e.parentElement.querySelector('#page-count').textContent.split('/')[1]));for(let p=1;p<pages;p++)await page.locator('#next-page').click();await expect(page.locator('#page')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('#close-case').click()}
 }
});
