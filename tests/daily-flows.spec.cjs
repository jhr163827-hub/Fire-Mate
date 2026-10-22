const {test,expect}=require('@playwright/test');
// The five everyday flows end to end, at the narrowest and widest phone widths in both themes.
const month=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')})();
for(const [width,theme] of [[320,'dark'],[430,'light']])test(`daily flows stay consistent across screens · ${width}px ${theme}`,async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width,height:740});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(([t,m])=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:t,tx:[],rec:[],budgets:{[m]:500000},accounts:[],holdings:[],fire:{asset:0,goal:65000,monthly:300,rate:7,withdrawal:4}}))},[theme,month]);
 await page.goto('/index.html');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));

 // 1. Register an asset → home and 자산 agree.
 await page.locator('.bottomnav [data-view="assets"]').click();
 await page.locator('#fmBalanceRowEdit').click();
 await page.locator('#assetCash').fill('3000000');
 await page.locator('#saveAssets').click();
 await expect(page.locator('#fmBalanceRowText')).toContainText('현금·예금 ₩3,000,000');
 await expect(page.locator('#netWorth')).toHaveText('₩3,000,000');
 await page.locator('.bottomnav [data-view="home"]').click();
 await expect(page.locator('#homeTotalAssets')).toHaveText('₩3,000,000');

 // 2. Record a transaction from home, then edit it → spending, budget and analysis follow.
 await page.locator('#fmHomeRecord').click();
 await page.locator('#entryAmount').fill('12000');await page.locator('#entryMemo').fill('점심');
 await page.locator('#saveEntry').click();
 await expect(page.locator('#heroSpent')).toHaveText('₩12,000');
 await page.locator('.bottomnav [data-view="calendar"]').click();
 await expect(page.locator('#fmCalendarBudget')).toContainText('₩488,000');
 await page.locator('#fmModeList').click();
 await page.locator('#fmLedgerAllTx [data-edit]').first().click();
 await expect(page.locator('#entryTitle')).toHaveText('거래 수정');
 await page.locator('#entryAmount').fill('15000');await page.locator('#saveEntry').click();
 await expect(page.locator('#fmCalendarBudget')).toContainText('₩485,000');
 await page.locator('#fmModeAnalysis').click();
 await expect(page.locator('#insightCats')).toContainText('1.5만');
 await page.locator('#fmInsightsBack').click();
 await expect(page.locator('#view-calendar')).toHaveClass(/active/);
 expect((await saved()).tx.map(t=>t.amount)).toEqual([15000]);

 // 3. FIRE: change the monthly amount → see the difference → cancel keeps the plan, saving changes it.
 await page.locator('.bottomnav [data-view="fire"]').click();
 await page.locator('#fmOpenCalculator').click();
 await page.locator('#monthly').fill('400');await page.locator('#monthly').dispatchEvent('input');
 await expect(page.locator('#view-firecalc')).toContainText('단축');
 expect((await saved()).fire.monthly).toBe(300);
 await page.locator('#fmCancelFireDraft').click();
 await expect(page.locator('#view-firecalc')).not.toContainText('단축');
 expect((await saved()).fire.monthly).toBe(300);
 await page.locator('#monthly').fill('400');await page.locator('#monthly').dispatchEvent('input');
 await page.locator('#saveFire').click();
 if(await page.locator('#fmAsk').isVisible())await page.locator('#fmAskOk').click();
 await expect.poll(async()=>(await saved()).fire.monthly).toBe(400);

 // 4. Everything is still there after a reload.
 await page.reload();
 // The app reopens on the last tab; home shows the same saved numbers.
 await page.locator('.bottomnav [data-view="home"]').click();
 await expect(page.locator('#homeTotalAssets')).toHaveText('₩3,000,000');
 await expect(page.locator('#heroSpent')).toHaveText('₩15,000');
 expect((await saved()).fire.monthly).toBe(400);

 // 5. A detail screen returns to where it was opened from.
 await page.locator('.bottomnav [data-view="home"]').click();
 await page.locator('#fmSpendingOpen').click();
 await expect(page.locator('#fmInsightsBack')).toHaveText('← 홈');
 await page.locator('#fmInsightsBack').click();
 await expect(page.locator('#view-home')).toHaveClass(/active/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
});
