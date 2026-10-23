const {test,expect}=require('@playwright/test');
// 시장: index levels from the scheduled live-quotes file, long charts from chart-data/IDX-*.json.
const day=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
const live={updatedAt:new Date().toISOString(),quotes:{'IDX-IXIC':{price:26008.86,prevClose:26702.86},'IDX-GSPC':{price:7663.43,prevClose:7757.17},'IDX-KS11':{price:2600,prevClose:2590},'IDX-USDKRW':{price:1325.5,prevClose:1326.5}}};
const hist={symbol:'IXIC',points:Array.from({length:400},(_,i)=>({date:day(399-i),close:20000+i*10}))};
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.request().url().endsWith('/chart-data/live-quotes.json')?r.fulfill({json:live}):r.abort());
 await page.route('**/chart-data/IDX-IXIC.json',r=>r.fulfill({json:hist}));
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
