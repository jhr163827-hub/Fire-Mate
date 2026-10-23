const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:360,height:800},isMobile:true,hasTouch:true});

test('assets show cash, other and debt that count toward net worth and reopen their editor',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#fmBalanceRowText')).toHaveText('없음 · 대출 같은 부채도 여기서 입력해요');
 await page.locator('#fmBalanceRowEdit').click();
 await expect(page.locator('#legacyAssetsOverlay')).toBeVisible();
 await page.locator('#assetCash').fill('1000000');
 await page.locator('#assetDebt').fill('3000000');
 await page.locator('#saveAssets').click();
 // Saving closes the sheet.
 await expect(page.locator('#legacyAssetsOverlay')).toBeHidden();
 await expect(page.locator('#fmBalanceRowText')).toHaveText('현금·예금 ₩1,000,000 · 부채 -₩3,000,000 · 순자산에 포함');
 const balance=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).balance);
 expect(balance).toMatchObject({cash:1000000,other:0,debt:3000000});
 // Reopening still shows the same editor fields.
 await page.locator('#fmBalanceRowEdit').click();
 await expect(page.locator('#assetCash')).toBeVisible();
 expect((await page.locator('#fmBalanceRowEdit').boundingBox()).height).toBeGreaterThanOrEqual(44);
});

test('existing balance values are shown on load',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');const d={tx:[],rec:[],budgets:{},theme:'dark',fire:{asset:0,goal:65000,monthly:300,rate:7,withdrawal:4},holdings:[],accounts:[],balance:{fx:1400,cash:0,other:500000,debt:0}};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#fmBalanceRowText')).toHaveText('기타 ₩500,000 · 순자산에 포함');
});

test('items of an 기타 자산 account can be edited and added from its detail screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],rec:[],budgets:{},holdings:[],balance:{fx:1400,cash:0,other:0,debt:0},fire:{asset:0,goal:65000,monthly:300,rate:7,withdrawal:4},accounts:[{id:'o',name:'기타 자산',kind:'other',amount:0,fire:false,items:[{id:'i1',name:'금',amount:3357188},{id:'i2',name:'비상금 (토스)',amount:900000}]}]}))});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('assets'));
 await page.locator('#accountSummary > *').first().click();
 const detail=page.locator('#fmAccountDetail');
 await expect(detail.locator('#fmDetailAdd')).toHaveText('+ 항목 추가');
 await detail.locator('[data-fm-other="i2"]').click();
 await expect(page.locator('#otherItemOverlay')).toHaveClass(/show/);
 await expect(page.locator('#otherItemName')).toHaveValue('비상금 (토스)');
 await page.locator('#otherItemAmount').fill('1000000');
 await page.locator('#saveOtherItem').click();
 await expect(page.locator('#otherItemOverlay')).not.toHaveClass(/show/);
 await expect(detail.locator('[data-fm-other="i2"]')).toContainText('₩1,000,000');
 await detail.locator('#fmDetailAdd').click();
 await page.locator('#otherItemName').fill('주택청약');await page.locator('#otherItemAmount').fill('3450000');
 await page.locator('#saveOtherItem').click();
 await expect(detail).toContainText('주택청약');
 const items=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).accounts.find(a=>a.id==='o').items.map(x=>[x.name,x.amount]));
 expect(items).toEqual([['금',3357188],['비상금 (토스)',1000000],['주택청약',3450000]]);
});
