const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});

for(const width of [320,390]){
 test('ledger shows 달력 · 목록 · 분석 on one row at '+width,async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.goto('/index.html');
  await page.evaluate(()=>window.fmGo('calendar'));
  await expect(page.locator('#view-calendar .fm-ledger-switch button')).toHaveText(['달력','목록','분석']);
  const boxes=await page.locator('#fmModeCalendar, #fmModeList, #fmModeAnalysis, #fmLedgerSearchBtn, #fmLedgerAddBtn').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().toJSON()));
  for(const b of boxes){expect(b.height).toBeGreaterThanOrEqual(44);expect(Math.round(b.top)).toBe(Math.round(boxes[0].top));expect(b.right).toBeLessThanOrEqual(width)}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}

test('분석 opens 소비 분석, which links to 월간 결산 and back',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.locator('#fmModeAnalysis').click();
 await expect(page.locator('#view-insights')).toHaveClass(/active/);
 await expect(page.locator('.bottomnav .active')).toHaveText('가계부');
 await page.locator('#fmInsightsMonthly').click();
 await expect(page.locator('#view-monthly')).toHaveClass(/active/);
 await page.locator('#fmMonthlyClose').click();
 await expect(page.locator('#view-insights')).toHaveClass(/active/);
});

test('소비 분석 links to the asset analysis tab',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 await page.locator('#fmInsightAssets').click();
 await expect(page.locator('#view-assets')).toHaveClass(/active/);
 await expect(page.locator('#fmAssetAnalysisView')).toBeVisible();
});

test('소비 분석 keeps the key cards open and folds the rest; empty comparisons look neutral',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await page.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))}},{theme:'dark',rec:[],budgets:{[m]:500000},tx:[{id:'a',date:m+'-01',type:'expense',category:'식비',amount:12000}]});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmInsightsMore')).not.toHaveAttribute('open','');
 await expect(page.locator('#fmCatBudgetEdit')).toBeVisible();
 await expect(page.locator('#coach')).toBeHidden();
 await expect(page.locator('#monthDelta')).toHaveText('비교 불가');
 await expect(page.locator('#monthDelta')).not.toHaveClass(/red|green/);
 await expect(page.locator('#sixChart .fm-six-amount').first()).toHaveText('');
 await page.locator('#fmInsightsMore>summary').click();
 await expect(page.locator('#fmInsightsBudgetLink')).toHaveText('가계부에서 예산 수정 →');
 await expect(page.locator('#coach')).toBeVisible();
});
