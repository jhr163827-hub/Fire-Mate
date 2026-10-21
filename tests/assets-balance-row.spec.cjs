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
 await page.locator('#legacyAssetsOverlay [data-close]').click();
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
