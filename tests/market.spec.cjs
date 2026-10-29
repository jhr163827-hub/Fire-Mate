const {test,expect}=require('@playwright/test');
// 시장: index levels from the scheduled live-quotes file, long charts from chart-data/IDX-*.json.
const day=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
const live={updatedAt:new Date().toISOString(),quotes:{'IDX-IXIC':{price:26008.86,prevClose:26702.86},'IDX-GSPC':{price:7663.43,prevClose:7757.17},'IDX-KS11':{price:2600,prevClose:2590},'IDX-USDKRW':{price:1325.5,prevClose:1326.5}}};
const hist={symbol:'IXIC',points:Array.from({length:400},(_,i)=>({date:day(399-i),close:20000+i*10}))};
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.request().url().includes('/chart-data/live-quotes.json')?r.fulfill({json:live}):r.abort());
 await page.route('**/chart-data/IDX-IXIC.json',r=>r.fulfill({json:hist}));
 await page.route('**/chart-data/IDX-GSPC.json',r=>r.fulfill({status:404,body:''}));
 await page.addInitScript(()=>localStorage.setItem('firemate_onboarding_v1','dismissed'));
 await page.goto('/index.html');
});
test('home shows one market line that opens the 시장 tab',async({page})=>{
 const strip=page.locator('#fmHomeMarket');
 await expect(strip).toHaveText('나스닥 -2.6% · S&P -1.2% · 코스피 +0.4% · 환율 1,326');
 await strip.click();
 await expect(page.locator('#view-assets')).toHaveClass(/active/);
 await expect(page.locator('#fmAssetMarketView')).toBeVisible();
 await expect(page.locator('#fmAssetQuickMarket')).toHaveAttribute('aria-selected','true');
});
test('a market row opens a long chart with period buttons',async({page})=>{
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickMarket').click();
 const rows=page.locator('#fmMarketList .fm-mk-row');
 await expect(rows).toHaveCount(5);
 await expect(rows.first()).toContainText('나스닥26,008.86-2.60%');
 await expect(rows.nth(3)).toContainText('—');
 await rows.first().click();
 const chart=page.locator('#fmMarketChart');
 await expect(chart.locator('svg path')).toHaveCount(1);
 await expect(chart.locator('[aria-pressed="true"]')).toHaveText('1년');
 await chart.getByRole('button',{name:'10년'}).click();
 await expect(chart).toContainText('최고 23,990');
 await expect(chart).toContainText('최저 20,000');
 await rows.nth(1).click();
 await expect(page.locator('#fmMarketChart')).toContainText('차트 데이터를 아직 받지 못했어요');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('during Korean market hours 코스피 comes live from Naver instead of the half-hourly file',async({page,context})=>{
 const p=await context.newPage();await p.clock.install({time:Date.parse('2026-10-28T10:42:00+09:00')});
 await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>{const u=r.request().url();if(u.includes('/chart-data/live-quotes.json'))return r.fulfill({json:live});
  if(u.includes('SERVICE_INDEX')){const name=new URL(u).searchParams.get('_callback');return r.fulfill({contentType:'text/javascript; charset=utf-8',body:name+'('+JSON.stringify({resultCode:'success',result:{areas:[{name:'SERVICE_INDEX',datas:[{cd:'KOSPI',nv:261800,cr:1.08,rf:'2',ms:'OPEN'},{cd:'KOSDAQ',nv:75012,cr:0.42,rf:'5',ms:'OPEN'}]}]}})+')'})}return r.abort()});
 await p.addInitScript(()=>localStorage.setItem('firemate_onboarding_v1','dismissed'));await p.goto('/index.html');
 await expect(p.locator('#fmHomeMarket')).toHaveText('나스닥 -2.6% · S&P -1.2% · 코스피 +1.1% · 환율 1,326');
 await p.evaluate(()=>window.fmGo('assets'));await p.locator('#fmAssetQuickMarket').click();
 await expect(p.locator('#fmMarketList .fm-mk-row').nth(2)).toContainText('코스피2,618+1.08%');
 await expect(p.locator('#fmMarketList .fm-mk-row').nth(3)).toContainText('코스닥750.12-0.42%');
});
test('a dollar target shows a home line while the rate is at or below it',async({page})=>{
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickMarket').click();
 await page.locator('#fmFxGoalIn').fill('1330');await page.locator('#fmFxGoalForm button').click();
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#fmHomeFx')).toHaveText('💱 환율 1,326원 · 목표 1,330원 아래예요 · 달러 살 때 ›');
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmFxGoalIn').fill('1300');await page.locator('#fmFxGoalForm button').click();
 await expect(page.locator('#fmHomeFx')).toBeHidden();
});
