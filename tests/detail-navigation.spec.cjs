const {test,expect}=require('@playwright/test');
// The scheduled backup quote file is live on GitHub; keep these fixtures' prices fixed.
test.beforeEach(async({page})=>{await page.route('**/chart-data/live-quotes.json*',r=>r.fulfill({status:404,body:''}));await page.route('https://polling.finance.naver.com/**',r=>r.abort())});
for(const width of [320,390,430])test('report navigation and shared analysis preserve finance and return position '+width,async({page})=>{
 await page.setViewportSize({width,height:568});
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{rates:{KRW:1400},date:'2026-10-18'}}));
 await page.goto('/index.html');
 await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));
  const now=new Date(),ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  d.tx=[{id:'expense',date:ym+'-01',type:'expense',amount:123456,category:'식비',memo:'분석 보존 검증'},{id:'income',date:ym+'-01',type:'income',amount:3000000,category:'급여'}];
  d.budgets[ym]=500000;d.dailySnapshots=[{day:ym+'-01',amount:10000000},{day:ym+'-02',amount:11000000}];
  localStorage.setItem('firemate_smart_v3',JSON.stringify(d));
 });
 await page.reload();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).balance.fxCheckedAt);
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await expect(page.locator('#view-home .home-shortcuts button')).toHaveCount(2);
  await expect(page.locator('#view-home #recent')).toHaveCount(0);
  for(const [button,view,back] of [['fmMonthlyOpen','monthly','fmMonthlyClose'],['fmSpendingOpen','insights','fmInsightsBack']]){
   await page.locator('#'+button).scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);
   await page.locator('#'+button).click();await expect(page.locator('#view-'+view)).toHaveClass(/active/);
   expect(await page.evaluate(()=>scrollY)).toBe(0);
   await expect(page.locator('.bottomnav [data-view="home"]')).toHaveClass(/active/);
   const header=page.locator('#view-'+view+' .fm-report-header');await expect(header).toBeVisible();
   expect((await page.locator('#'+back).boundingBox()).height).toBeGreaterThanOrEqual(44);
   if(view==='monthly'){
    await expect(page.locator('#fmMonthlyContent')).toContainText('₩123,456');
    await expect(page.locator('#fmMonthlyContent')).toContainText('₩3,000,000');
    await page.locator('#fmMonthlyPrev').click();await page.locator('#fmMonthlyNext').click();
   }else{
    await expect(page.locator('#insightCats')).toContainText('식비');
    await expect(page.locator('#sixChart')).toBeVisible();
   }
   await page.locator('#'+back).click();await expect(page.locator('#view-home')).toHaveClass(/active/);
   await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,0);
   await page.goForward();await expect(page.locator('#view-'+view)).toHaveClass(/active/);
   await page.goBack();await expect(page.locator('#view-home')).toHaveClass(/active/);
  }
  await page.locator('.bottomnav [data-view="calendar"]').click();
  await page.locator('#fmModeAnalysis').click();
  await expect(page.locator('#fmInsightsBack')).toHaveText('← 가계부');
  await page.locator('#fmInsightsBack').click();await expect(page.locator('#view-calendar')).toHaveClass(/active/);
  await page.locator('.bottomnav [data-view="home"]').click();
  expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
 }
 await page.locator('#fmMonthlyOpen').scrollIntoViewIfNeeded();const returnY=await page.evaluate(()=>scrollY);
 await page.locator('#fmMonthlyOpen').click();await page.reload();await expect(page.locator('#view-monthly')).toHaveClass(/active/);
 await page.locator('#fmMonthlyClose').click();await expect(page.locator('#view-home')).toHaveClass(/active/);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(returnY,0);
});
test('holding detail restores search, account filter, sort and list position',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{rates:{KRW:1400}}}));
 await page.goto('/index.html');
 await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));
  d.holdings=Array.from({length:20},(_,i)=>({id:'detail-'+i,accountId:'legacy-us',ticker:'SPY',name:'검증 '+i,type:'USD',qty:i+1,cost:100,price:110}));
  localStorage.setItem('firemate_smart_v3',JSON.stringify(d));
  localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
 });await page.reload();
 await page.locator('.bottomnav [data-view="assets"]').click();await page.locator('#fmAssetQuickHoldings').click();
 const row=page.locator('[data-holding-row="detail-15"] .fm-holding-row-main');await row.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);
 await row.click();await expect(page.locator('#fmAccountDetail')).toBeVisible();
 for(const label of ['보유 수량','평균 매수가','평가손익','총 수익률'])await expect(page.locator('#fmAccountDetail')).toContainText(label);
 await page.locator('#fmDetailBack').click();await expect(page.locator('#fmAssetHoldingsPanel')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,0);
});
