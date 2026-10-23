const {test,expect}=require('@playwright/test');
// Daily stock check: today's move per holding and in total, real minus signs, and sorting by today's move.
const at=new Date().toISOString();
const seed={theme:'dark',tx:[],rec:[],budgets:{},fire:{asset:0,goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1000,cash:0,other:0,debt:0},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],
 holdings:[{id:'up',accountId:'a',ticker:'111111',name:'오른종목',type:'KRW',qty:10,price:110000,cost:100000,dayChangePct:10,dayChangeAt:at,quoteAt:at},{id:'down',accountId:'a',ticker:'222222',name:'내린종목',type:'KRW',qty:10,price:80000,cost:100000,dayChangePct:-20,dayChangeAt:at,quoteAt:at}]};
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(s=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()));localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},seed);
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('assets'));
});
test('the asset hero sums today\'s moves across holdings',async({page})=>{
 // +₩100,000 (1.1M was 1.0M) and −₩200,000 (800k was 1.0M): −₩100,000 on a ₩2,000,000 base.
 await expect(page.locator('#fmTodayPL')).toContainText('오늘 변동');
 await expect(page.locator('#fmTodayPL strong')).toHaveText('−₩100,000 (-5.00%)');
});
test('losses use a real minus and the list is always every account by value',async({page})=>{
 await page.locator('#fmAssetQuickHoldings').click();
 await expect(page.locator('#holdingList')).toContainText('−₩200,000 (-20.0%)');
 // Today's move sits under the value, colored, so a glance at the list is enough.
 await expect(page.locator('#holdingList .fm-holding-day')).toHaveText(['오늘 +10.00% · +₩100,000','오늘 -20.00% · −₩200,000']);
 // No search, sort or account filter: every holding, largest value first.
 await expect(page.locator('#fmHoldingSearch, #fmHoldingSort, #accountFilter')).toHaveCount(0);
 await expect(page.locator('#holdingList .fm-holding-name')).toHaveText(['오른종목','내린종목']);
 await page.locator('#holdingList .fm-holding-row-main').nth(1).click();
 await expect(page.locator('#fmAccountDetail')).toContainText('오늘 -20.00% · −₩200,000');
 await expect(page.locator('#fmAccountDetail')).toContainText('현재가');
});
