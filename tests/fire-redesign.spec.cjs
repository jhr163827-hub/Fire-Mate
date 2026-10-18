const {test,expect}=require('@playwright/test');
const golden=require('./fixtures/fire-v3544-calculations.json');
test.beforeEach(async({context})=>{await context.route('https://api.frankfurter.dev/**',r=>r.abort());});
test('stage10 preserves v3.5.44 projection, quick comparison and complete long-term ledgers',async({page})=>{
 await page.goto('/index.html');
 const actual=await page.evaluate(cases=>{const h=window.__fmFinanceTest,set=(id,v)=>{const e=document.getElementById(id);if(e.type==='checkbox')e.checked=v;else e.value=v};
 const projection=h.projection(15000,350,7.5,120),estimate=h.estimate(15000,80000,350,7.5);
 for(const [id,v] of Object.entries({fmQuickBudget:10000,fmQuickSpend:100,fmQuickYield:4,fmQuickTax:20,fmQuickGain:7}))set(id,v);h.quick();const quick={...window.fmFireViewState.quick};
 const results=cases.map(c=>{for(const [id,v] of Object.entries({fmStrYears:30,fmStrInflation:2,fmStrDivGrowth:5,fmStrSameReturn:c.same,fmStrFairMode:c.fair,fmStrReinvest:c.reinvest,fmStrTaxApply:c.tax,fmStrGainShare:30,fmStrDivCost:20,fmStrInsurance:20}))set(id,v);h.strategy({div:[{name:'TEST',amount:8000,estimatedAnnualMan:400}],sale:[{name:'TEST',amount:9000,rate:7}]});return {same:c.same,fair:c.fair,reinvest:c.reinvest,tax:c.tax,displayed:window.__fmFinanceLedger.displayed}});return {projection,estimate,quick,cases:results};},golden.cases);
 expect(actual).toEqual({projection:golden.projection,estimate:golden.estimate,quick:golden.quick,cases:golden.cases});
});
test('stage10 uses saved plan defaults without overwriting independent saved or temporary models',async({page})=>{
 await page.goto('/index.html');await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.fire={...d.fire,goal:80000,monthly:350,rate:7.5};d.retirement={items:[{name:'JEPQ',amount:10000},{name:'현금',amount:5000}],monthly:275,yield:4,priceChange:0,crash:25};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))});await page.reload();
 const read=()=>page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return {fire:d.fire,retirement:d.retirement,accounts:d.accounts,holdings:d.holdings,tx:d.tx,balance:d.balance}});const before=await read();
 await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmFireStrategyOpen').click();await page.locator('#fmStrategyDetails>summary').click();
 await expect(page.locator('#fmQuickBudget')).toHaveValue('80000');await expect(page.locator('#fmQuickSpend')).toHaveValue('3300');await expect(page.locator('#fmStrategyBasisState')).toHaveAttribute('data-basis','plan');
 await page.locator('#fmQuickBudget').fill('90000');await expect(page.locator('#fmStrategyBasisState')).toHaveAttribute('data-basis','custom');
 await page.locator('#fmRetireBack').click();await page.locator('#fmFireStrategyOpen').click();await expect(page.locator('#fmQuickBudget')).toHaveValue('90000');
 page.once('dialog',d=>d.dismiss());await page.locator('#fmUseSavedPlan').click();await expect(page.locator('#fmQuickBudget')).toHaveValue('90000');
 page.once('dialog',d=>d.accept());await page.locator('#fmUseSavedPlan').click();await expect(page.locator('#fmQuickBudget')).toHaveValue('80000');await expect(page.locator('#fmQuickSpend')).toHaveValue('3300');
 expect(await read()).toEqual(before);await page.reload();expect(await read()).toEqual(before);
});
test('stage10 separates money target completion from retirement spending at mobile sizes',async({browser})=>{
 test.setTimeout(90000);
 for(const width of [320,360,390,430])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:670},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.route('https://api.frankfurter.dev/**',r=>r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/index.html');await page.evaluate(theme=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.theme=theme;d.accounts=[{id:'cash',amount:20000000,fire:true}];d.holdings=[];d.balance={fx:1400,cash:0,other:0,debt:0};d.fire={...d.fire,goal:1000,monthly:300,rate:7};d.retirement={items:[{name:'JEPQ',amount:10000}],monthly:300,yield:4,priceChange:0,crash:25};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},theme);await page.reload();await page.locator('.bottomnav [data-view="fire"]').click();
  await expect(page.locator('#firePct')).toHaveText('200.0%');await expect(page.locator('#fireYears')).toHaveText('달성!');await expect(page.locator('#fmOverview-cashflow')).toContainText('부족');await expect(page.locator('.fm-fire-scope')).toContainText('목표 배분 완성 시');await expect(page.locator('#fmFirePlanDifference')).toBeVisible();
  await expect(page.locator('#fmOverview-strategy')).not.toContainText('월 세후 배당');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  for(const id of ['fmOpenCalculator','fmFireLifeOpen','fmFireStrategyOpen','fmFirePortfolioOpen'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
  if(width===320&&theme==='dark'){
   await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.accounts.forEach(a=>a.amount=0);d.balance.debt=10000000;localStorage.setItem('firemate_smart_v3',JSON.stringify(d))});await page.reload();
   await expect(page.locator('#fireAsset')).toContainText('-');await expect(page.locator('#fmFireBasisNote')).toContainText('0으로 가정');
  }
  expect(errors).toEqual([]);await context.close();
 }
});
test('stage10 compares drafts, cancels and saves only FIRE settings with real quota rollback',async({browser})=>{
 test.setTimeout(120000);
 for(const width of [320,390])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.route('https://api.frankfurter.dev/**',r=>r.abort());const page=await context.newPage();
  await page.goto('/index.html');await page.evaluate(theme=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.theme=theme;d.accounts=[{id:'cash',amount:150000000,fire:true}];d.holdings=[];d.balance={fx:1400,cash:0,other:0,debt:0};d.fire={asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4};d.retirement={items:[{name:'JEPQ',amount:10000}],monthly:275,yield:4,priceChange:0,crash:25};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},theme);await page.reload();
  const read=()=>page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return {fire:d.fire,retirement:d.retirement,accounts:d.accounts,holdings:d.holdings,tx:d.tx,balance:d.balance,budgets:d.budgets}});const before=await read();
  await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmOpenCalculator').click();await expect(page.locator('#fmPreviewResult')).toContainText('8년 2개월');
  await page.locator('#monthly').fill('350');await expect(page.locator('#fmFireDraftStatus')).toContainText('미반영');await expect(page.locator('#fmPreviewResult')).toContainText('7년 5개월');await expect(page.locator('.fm-fire-time-delta')).toContainText('9개월 단축');expect(await read()).toEqual(before);
  await page.locator('#fmBackFire').click();await expect(page.locator('#fireYears')).toHaveText('8년 2개월');await expect(page.locator('#fmOpenCalculator')).toContainText('미저장');await page.locator('.bottomnav [data-view="assets"]').click();await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmOpenCalculator').click();await expect(page.locator('#monthly')).toHaveValue('350');
  await page.locator('#fmCancelFireDraft').click();await expect(page.locator('#monthly')).toHaveValue('300');await expect(page.locator('#fmFireDraftStatus')).toContainText('저장된 계획');expect(await read()).toEqual(before);
  await page.locator('#monthly').fill('350');page.once('dialog',d=>d.dismiss());await page.locator('#saveFire').click();expect(await read()).toEqual(before);
  await page.evaluate(()=>{window.stage10SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='firemate_smart_v3')throw new DOMException('Quota exceeded','QuotaExceededError');return window.stage10SetItem.call(this,k,v)}});
  page.once('dialog',d=>d.accept());await page.locator('#saveFire').click();expect(await read()).toEqual(before);await expect(page.locator('#monthly')).toHaveValue('350');await expect(page.locator('#fmFireDraftStatus')).toContainText('미반영');await page.evaluate(()=>{Storage.prototype.setItem=window.stage10SetItem});
  await page.setViewportSize({width,height:420});await page.locator('#monthly').focus();await page.locator('#saveFire').scrollIntoViewIfNeeded();const box=await page.locator('#saveFire').boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(421);
  page.once('dialog',d=>d.accept());await page.locator('#saveFire').click();const after=await read();expect(after.fire).toEqual({...before.fire,monthly:350});for(const key of ['retirement','accounts','holdings','tx','balance','budgets'])expect(after[key]).toEqual(before[key]);
  await page.reload();await expect(page.locator('#monthly')).toHaveValue('350');expect(await read()).toEqual(after);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await context.close();
 }
});
