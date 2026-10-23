const {test,expect}=require('@playwright/test');
// The scheduled job's backup file: used when live sources fail (or no US API key), and for US pre-market/after-hours prices.
const now=Date.now(),iso=ms=>new Date(ms).toISOString();
const live={updatedAt:iso(now),quotes:{JEPQ:{price:55.3,prevClose:55,at:iso(now-7200000),ext:55.6,extKind:'post',extAt:iso(now-60000)},'KR-005930':{price:71200,prevClose:70000,at:iso(now-3600000)}}};
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>/live-quotes\.json/.test(route.request().url())?route.fulfill({json:live}):route.abort());
 await page.addInitScript(()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()));
  localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],rec:[],budgets:{},balance:{fx:1400,cash:0,other:0,debt:0},fire:{asset:0,goal:65000,monthly:300,rate:7,withdrawal:4},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],holdings:[{id:'h1',accountId:'a',ticker:'JEPQ',name:'JEPQ',type:'USD',qty:10,price:50,cost:50},{id:'h2',accountId:'a',ticker:'005930',name:'삼성전자',type:'KRW',qty:1,price:60000,cost:60000}]}))});
 await page.goto('/index.html');
});
test('failed or keyless quotes fall back to the scheduled backup price with its own time',async({page})=>{
 await page.evaluate(()=>window.fmGo('assets'));
 await page.locator('#refreshStocks').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings.map(h=>[h.ticker,h.price]))).toEqual([['JEPQ',55.3],['005930',71200]]);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings);
 expect(saved[0].quoteAt).toBe(live.quotes.JEPQ.at);
 expect(saved[1].dayChangePct).toBeCloseTo(71200/70000*100-100,5);
 const last=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_last_quote_v1')||'null'));
 if(last)expect(last.failed).toBe(0);
});
test('US holdings show the after-hours price next to the regular one',async({page})=>{
 await page.evaluate(()=>window.fmGo('assets'));
 await page.locator('#fmAssetQuickHoldings').click();
 await expect(page.locator('#holdingList')).toContainText('애프터 $55.6 (+0.54%)');
 await page.locator('#fmAssetQuickAccounts').click();
 await page.locator('#accountSummary > *').first().click();
 await expect(page.locator('#fmAccountDetail [data-fm-holding]').first()).toContainText('애프터 $55.6');
});
test('home lists the largest holdings with today\'s change and opens a holding in one tap',async({page})=>{
 const row=page.locator('#fmHomeHoldings [data-home-holding]');
 await expect(row).toHaveCount(2);
 await expect(row.first()).toContainText('JEPQ');
 await expect(row.first()).toContainText('애프터 $55.6');
 await row.first().click();
 await expect(page.locator('#view-assets')).toHaveClass(/active/);
 await expect(page.locator('#fmAccountDetail')).toContainText('JEPQ');
 await page.locator('#fmDetailBack').click();
 await expect(page.locator('#fmAssetHoldingsPanel')).toBeVisible();
});
test('home shows this month\'s savings against the FIRE plan',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await page.evaluate(m=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.tx=[{id:'i',date:m+'-01',type:'income',category:'급여',amount:4000000},{id:'e',date:m+'-02',type:'expense',category:'식비',amount:1000000},{id:'t',date:m+'-03',type:'transfer',category:'이체',amount:500000}];localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},m);
 await page.reload();
 await expect(page.locator('#fmHomeSaving')).toContainText('이번 달 모은 돈 +₩3,000,000 · FIRE 계획 월 ₩3,000,000 (100%)');
});
