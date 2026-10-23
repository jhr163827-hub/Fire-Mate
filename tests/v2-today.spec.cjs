const {test,expect}=require('@playwright/test');
// 전면 개편 1단계: the new 오늘 screen and 5-tab menu sit behind a switch; off keeps today's screens.
const m=new Date().toISOString().slice(0,7);
const seed={theme:'dark',tx:[{id:'i',date:m+'-01',type:'income',category:'급여',amount:4000000},{id:'e',date:m+'-02',type:'expense',category:'식비',amount:500000}],rec:[],budgets:{[m]:2000000},
 fire:{asset:0,goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1000,cash:1000000,other:0,debt:0},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],
 holdings:[{id:'h',accountId:'a',ticker:'111111',name:'테스트종목',type:'KRW',qty:10,price:110000,cost:100000,dayChangePct:10,dayChangeAt:new Date().toISOString(),quoteAt:new Date().toISOString()}]};
const visibleNav=page=>page.locator('.bottom-item').evaluateAll(es=>es.filter(e=>e.offsetParent).map(e=>e.textContent.trim()));
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(s=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()));localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},seed);
 await page.goto('/index.html');
});
test('off by default: the current screens and menu stay as they are',async({page})=>{
 await expect(page.locator('#view-home')).toHaveClass(/active/);
 expect(await visibleNav(page)).toEqual(['홈','가계부','자산','FIRE','설정']);
});
test('the switch turns on 오늘 and the new menu; numbers come from the same data; off goes back',async({page})=>{
 await page.locator('#settingsBottom').click();
 await page.locator('#fmUiV2').check();
 await page.locator('#settingsOverlay [data-close]').first().click();
 await expect(page.locator('#view-today')).toHaveClass(/active/);
 expect(await visibleNav(page)).toEqual(['오늘','종목','가계부','FIRE','설정']);
 // cash 1,000,000 + 10 × 110,000
 await expect(page.locator('#v2Net')).toHaveText('₩2,100,000');
 await expect(page.locator('#v2TodayPL')).toHaveText('오늘 +₩100,000');
 await expect(page.locator('#v2Holdings')).toContainText('테스트종목');
 await expect(page.locator('#v2Spent')).toHaveText('₩500,000 / ₩2,000,000');
 await expect(page.locator('#v2Saved')).toHaveText('+₩3,500,000');
 await expect(page.locator('#v2Plan')).toHaveText('FIRE 계획 월 ₩3,000,000의 117%');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_ui_v2_v1'))).toBe('1');
 // A reload starts on 오늘; 종목 opens the holdings list; going "home" lands on 오늘.
 await page.reload();
 await expect(page.locator('#view-today')).toHaveClass(/active/);
 await page.locator('#fmNavStocks').click();
 await expect(page.locator('#fmAssetHoldingsPanel')).toBeVisible();
 await expect(page.locator('#fmNavStocks')).toHaveClass(/active/);
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#view-today')).toHaveClass(/active/);
 await page.locator('#v2Holdings [data-v2-holding]').first().click();
 await expect(page.locator('#fmAccountDetail')).toContainText('테스트종목');
 await page.locator('#fmDetailBack').click();
 // Turning it off returns to the current home and menu.
 await page.locator('#settingsBottom').click();
 await page.locator('#fmUiV2').uncheck();
 await page.locator('#settingsOverlay [data-close]').first().click();
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#view-home')).toHaveClass(/active/);
 expect(await visibleNav(page)).toEqual(['홈','가계부','자산','FIRE','설정']);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));
 expect(saved.holdings[0].price).toBe(110000);
});
test('in the new mode 종목 leads with 투자 평가액 and a clean list; the old screen keeps 순자산',async({page})=>{
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#netWorth')).toBeVisible();
 await expect(page.locator('#v2Invest')).toBeHidden();
 await page.evaluate(()=>{localStorage.setItem('firemate_ui_v2_v1','1')});await page.reload();
 await page.locator('#fmNavStocks').click();
 await expect(page.locator('#v2Invest')).toHaveText('₩1,100,000');
 await expect(page.locator('#netWorth')).toBeHidden();
 await expect(page.locator('#assetGoalPct')).toBeHidden();
 await expect(page.locator('#holdingList .fm-holding-edit').first()).toBeHidden();
 await page.locator('#holdingList .fm-holding-row-main').first().click();
 await expect(page.locator('#fmDetailEdit')).toBeVisible();
});
test('in the new mode 가계부 starts with the 뱅크샐러드 button and shows savings; the old ledger has neither',async({page})=>{
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#v2LedgerImport')).toBeHidden();
 await page.evaluate(()=>{localStorage.setItem('firemate_ui_v2_v1','1')});await page.reload();
 await page.locator('.bottom-item[data-view="calendar"]').click();
 await expect(page.locator('#v2LedgerImport')).toBeVisible();
 await expect(page.locator('#v2LedgerImportNote')).toHaveText('아직 가져온 적 없어요');
 await expect(page.locator('#v2LedgerSaved')).toHaveText('+₩3,500,000');
 await expect(page.locator('#fmCalendarSpent')).toHaveText('₩500,000');
});
test('in the new mode 설정 lists 내 자산 and 도구, FIRE shows this month\'s savings',async({page})=>{
 await page.locator('#settingsBottom').click();
 await expect(page.locator('[data-v2-go="account"]')).toBeHidden();
 await page.locator('#settingsOverlay [data-close]').first().click();
 await page.evaluate(()=>{localStorage.setItem('firemate_ui_v2_v1','1')});await page.reload();
 await page.locator('.bottom-item[data-view="fire"]').click();
 await expect(page.locator('#v2FireSaved')).toHaveText('이번 달 실제 모은 돈 +₩3,500,000 · 계획의 117%');
 await page.locator('#settingsBottom').click();
 await page.locator('[data-v2-go="account"]').click();
 await expect(page.locator('#fmAssetAccountsPanel')).toBeVisible();
 await page.locator('#settingsBottom').click();
 await page.locator('[data-v2-go="monthly"]').click();
 await expect(page.locator('#view-monthly')).toHaveClass(/active/);
 await page.evaluate(()=>window.fmGo('home'));
 await page.locator('#settingsBottom').click();
 await page.locator('[data-v2-go="retire"]').click();
 await expect(page.locator('#view-retire')).toHaveClass(/active/);
});
