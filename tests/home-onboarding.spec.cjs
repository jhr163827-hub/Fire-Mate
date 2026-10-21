const {test,expect}=require('@playwright/test');
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));
const seed=(page,patch)=>page.evaluate(patch=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));Object.assign(d,patch);localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},patch);
const done=page=>page.locator('.fm-onboarding-steps li.done').evaluateAll(items=>items.map(item=>item.dataset.step));
test.use({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});

test('new profile sees three unfinished steps below the home shortcuts',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/index.html');
 const card=page.locator('#view-home .fm-onboarding');
 await expect(card).toBeVisible();
 await expect(page.locator('#fmOnboardingCount')).toHaveText('3개 중 0개 완료');
 expect(await done(page)).toEqual([]);
 // Default empty accounts must not count as registered assets.
 expect((await saved(page)).accounts.length).toBeGreaterThan(0);
 expect(await card.evaluate(el=>el.previousElementSibling.classList.contains('home-shortcuts'))).toBe(true);
 for(const box of await page.locator('.fm-onboarding button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height)))expect(box).toBeGreaterThanOrEqual(44);
 expect(errors).toEqual([]);
});

test('steps open the existing screens and completion follows saved data',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/index.html');
 await page.locator('[data-step="budget"] button').click();
 // The budget editor opens right on home.
 await expect(page.locator('#fmLedgerBudgetOverlay')).toHaveClass(/show/);
 await expect(page.locator('#view-home')).toHaveClass(/active/);
 await page.locator('#fmLedgerBudgetValue').fill('1500000');
 await page.locator('#fmLedgerBudgetSave').click();
 await page.locator('.bottomnav [data-view="home"]').click();
 await expect(page.locator('#fmOnboardingCount')).toHaveText('3개 중 1개 완료');
 expect(await done(page)).toEqual(['budget']);

 await page.locator('[data-step="tx"] button').click();
 await expect(page.locator('#view-calendar')).toHaveClass(/active/);
 await expect(page.locator('#entryOverlay')).toBeVisible();
 await page.locator('#entryOverlay [data-close]').first().click();

 await page.locator('.bottomnav [data-view="home"]').click();
 await page.locator('[data-step="assets"] button').click();
 await expect(page.locator('#view-assets')).toHaveClass(/active/);
 await expect(page.locator('#assetAddChoices')).toBeVisible();

 await seed(page,{tx:[{id:'qa-tx',date:'2026-10-01',type:'expense',category:'식비',amount:9000}],balance:{fx:1400,cash:1000000,other:0,debt:0}});
 await page.reload();
 await expect(page.locator('#view-home .fm-onboarding')).toBeHidden();
 expect(await done(page)).toEqual(['assets','budget','tx']);
});

test('closing stays closed and never edits finance data',async({page})=>{
 await page.goto('/index.html');
 const before=await saved(page);
 await page.locator('.fm-onboarding-close').click();
 await expect(page.locator('.fm-onboarding')).toHaveCount(0);
 await page.reload();
 await expect(page.locator('#view-home .fm-home-fire')).toBeVisible();
 await expect(page.locator('.fm-onboarding')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_onboarding_v1'))).toBe('dismissed');
 const after=await saved(page);
 for(const key of ['tx','rec','budgets','fire','accounts','holdings','balance','theme'])expect(after[key]).toEqual(before[key]);
});
