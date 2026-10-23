const {test,expect}=require('@playwright/test');
const golden=require('./fixtures/fire-v3544-calculations.json');
// The scheduled backup quote file is live on GitHub; keep these fixtures' prices fixed.
test.beforeEach(async({page})=>{await page.route('**/chart-data/live-quotes.json',r=>r.fulfill({status:404,body:''}))});
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
 await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmLabOpen').click();await page.locator('#fmFireStrategyOpen').click();await page.locator('#fmStrategyDetails>summary').click();
 await expect(page.locator('#fmQuickBudget')).toHaveValue('80000');await expect(page.locator('#fmQuickSpend')).toHaveValue('3300');await expect(page.locator('#fmStrategyBasisState')).toHaveAttribute('data-basis','plan');
 await page.locator('#fmQuickBudget').fill('90000');await expect(page.locator('#fmStrategyBasisState')).toHaveAttribute('data-basis','custom');
 await page.evaluate(()=>window.fmGo('firelab'));await page.locator('#fmFireStrategyOpen').click();await expect(page.locator('#fmQuickBudget')).toHaveValue('90000');
 await page.locator('#fmUseSavedPlan').click();await page.locator('#fmAskCancel').click();await expect(page.locator('#fmQuickBudget')).toHaveValue('90000');
 await page.locator('#fmUseSavedPlan').click();await page.locator('#fmAskOk').click();await expect(page.locator('#fmQuickBudget')).toHaveValue('80000');await expect(page.locator('#fmQuickSpend')).toHaveValue('3300');
 expect(await read()).toEqual(before);await page.reload();expect(await read()).toEqual(before);
});
test('stage10 separates money target completion from retirement spending at mobile sizes',async({browser})=>{
 test.setTimeout(90000);
 for(const width of [320,360,390,430])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:670},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.route('**/chart-data/live-quotes.json',r=>r.fulfill({status:404,body:''}));await context.route('https://api.frankfurter.dev/**',r=>r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/index.html');await page.evaluate(theme=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.theme=theme;d.accounts=[{id:'cash',amount:20000000,fire:true}];d.holdings=[];d.balance={fx:1400,cash:0,other:0,debt:0};d.fire={...d.fire,goal:1000,monthly:300,rate:7};d.retirement={items:[{name:'JEPQ',amount:10000}],monthly:300,yield:4,priceChange:0,crash:25};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},theme);await page.reload();await page.locator('.bottomnav [data-view="fire"]').click();
  await expect(page.locator('#firePct')).toHaveText('200.0%');await expect(page.locator('#fireYears')).toHaveText('달성!');expect((await page.locator('#fmOpenCalculator').boundingBox()).height).toBeGreaterThanOrEqual(44);await page.locator('#fmLabOpen').click();await expect(page.locator('#fmOverview-cashflow')).toContainText('부족');await expect(page.locator('.fm-fire-scope')).toHaveCount(0);await expect(page.locator('#fmFirePlanDifference')).toBeVisible();
  await expect(page.locator('#fmOverview-strategy')).not.toContainText('월 세후 배당');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  for(const id of ['fmFireLifeOpen','fmFireStrategyOpen'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
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
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.route('**/chart-data/live-quotes.json',r=>r.fulfill({status:404,body:''}));await context.route('https://api.frankfurter.dev/**',r=>r.abort());const page=await context.newPage();
  await page.goto('/index.html');await page.evaluate(theme=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.theme=theme;d.accounts=[{id:'cash',amount:150000000,fire:true}];d.holdings=[];d.balance={fx:1400,cash:0,other:0,debt:0};d.fire={asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4};d.retirement={items:[{name:'JEPQ',amount:10000}],monthly:275,yield:4,priceChange:0,crash:25};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},theme);await page.reload();
  const read=()=>page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return {fire:d.fire,retirement:d.retirement,accounts:d.accounts,holdings:d.holdings,tx:d.tx,balance:d.balance,budgets:d.budgets}});const before=await read();
  await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmOpenCalculator').click();await expect(page.locator('#fmPreviewResult')).toContainText('8년 2개월');
  await page.locator('#monthly').fill('350');await expect(page.locator('#fmFireDraftStatus')).toContainText('미반영');await expect(page.locator('#fmPreviewResult')).toContainText('7년 5개월');await expect(page.locator('.fm-fire-time-delta')).toContainText('9개월 단축');expect(await read()).toEqual(before);
  await page.locator('#fmBackFire').click();await expect(page.locator('#fireYears')).toHaveText('8년 2개월');await expect(page.locator('#fmOpenCalculator')).toHaveAttribute('aria-label',/미저장/);await page.locator('.bottomnav [data-view="assets"]').click();await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmOpenCalculator').click();await expect(page.locator('#monthly')).toHaveValue('350');
  await page.locator('#fmCancelFireDraft').click();await expect(page.locator('#monthly')).toHaveValue('300');await expect(page.locator('#fmFireDraftStatus')).toContainText('저장된 계획');expect(await read()).toEqual(before);
  await page.locator('#monthly').fill('350');await page.locator('#saveFire').click();await page.locator('#fmAskCancel').click();expect(await read()).toEqual(before);
  await page.evaluate(()=>{window.stage10SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='firemate_smart_v3')throw new DOMException('Quota exceeded','QuotaExceededError');return window.stage10SetItem.call(this,k,v)}});
  await page.locator('#saveFire').click();await page.locator('#fmAskOk').click();expect(await read()).toEqual(before);await expect(page.locator('#monthly')).toHaveValue('350');await expect(page.locator('#fmFireDraftStatus')).toContainText('미반영');await page.evaluate(()=>{Storage.prototype.setItem=window.stage10SetItem});
  await page.setViewportSize({width,height:420});await page.locator('#monthly').focus();await page.locator('#saveFire').scrollIntoViewIfNeeded();const box=await page.locator('#saveFire').boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(421);
  await page.locator('#saveFire').click();await page.locator('#fmAskOk').click();const after=await read();expect(after.fire).toEqual({...before.fire,monthly:350});for(const key of ['retirement','accounts','holdings','tx','balance','budgets'])expect(after[key]).toEqual(before[key]);
  await page.reload();await expect(page.locator('#monthly')).toHaveValue('350');expect(await read()).toEqual(after);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await context.close();
 }
});

test('FIRE four screens keep purpose, drafts, navigation and exact cashflow evidence separate',async({browser})=>{
 test.setTimeout(90000);
 for(const width of [320,390,430])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.route('**/chart-data/live-quotes.json',r=>r.fulfill({status:404,body:''}));await context.route('https://api.frankfurter.dev/**',r=>r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/index.html');await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);await page.locator('.bottomnav [data-view="fire"]').click();
 const saved=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 const nav=async id=>{if(id==='firecalc'){await page.evaluate(()=>window.fmGo('fire'));await page.locator('#fmOpenCalculator').click()}else if(id==='fire'||id==='firelab')await page.evaluate(v=>window.fmGo(v),id);else{await page.evaluate(()=>window.fmGo('firelab'));await page.locator('[data-lab="'+id+'"]').click()}};
 await expect(page.locator('#view-fire .fm-fire-screen-nav')).toHaveCount(0);await expect(page.locator('#fmLabOpen')).toBeVisible();await expect(page.locator('#fmRetireCashflow')).toBeHidden();await expect(page.locator('#fmStrategyCard')).toBeHidden();await expect(page.locator('#fmRetirePortfolio')).toBeHidden();
 await nav('firecalc');await page.locator('#monthly').fill('456');await nav('firelife');await expect(page.locator('#fmRetireCashflow')).toBeVisible();await expect(page.locator('#fmStrategyCard')).toBeHidden();await expect(page.locator('#fmLifeScenario')).toBeHidden();
 await page.locator('#fmCashflowEvidence>summary').click();const state=await page.evaluate(()=>window.fmFireViewState.cashflow);const evidence=await page.locator('#fmCashflowEvidence').innerText();const cash=parseFloat((evidence.match(/세후 ([^\n]+?) − 생활비/)||[])[1]?.replaceAll(',','').match(/([\d.]+)만/)?.[1]||0);expect(cash).toBe(Math.floor(state.monthlyNetIncome));expect(evidence).toContain((Math.round(state.monthlyNetIncome*10000)%10000).toLocaleString('ko-KR')+'원');
 expect(state.monthlyRemaining).toBeCloseTo(state.monthlyNetIncome-state.spend-state.healthTotal,10);await expect(page.locator('#fmCashflowEvidence')).toContainText('원');
 await page.locator('#fmDividendEditor>summary').click();await page.locator('[data-fm-div-rate]').first().fill('8.25');
 await nav('retire');await expect(page.locator('#fmRetireCashflow')).toBeHidden();await expect(page.locator('#fmStrategyCard')).toBeVisible();await expect(page.locator('#fmPortfolioDisclosure')).not.toHaveAttribute('open','');await expect(page.locator('#fmLifeScenario')).toBeVisible();
 await page.locator('#fmPortfolioDisclosure>summary').click();await page.locator('#fmRpEditToggle').click();await page.locator('[data-rp="0"]').fill('12345');
 await nav('firelife');await expect(page.locator('[data-fm-div-rate]').first()).toHaveValue('8.25');await nav('retire');await expect(page.locator('[data-rp="0"]')).toHaveValue('12345');await expect(page.locator('#rpSave')).toHaveText('목표 배분만 저장');
 await nav('firecalc');await expect(page.locator('#monthly')).toHaveValue('456');await expect(page.locator('.bottomnav [data-view="fire"]')).toHaveClass(/active/);await page.goBack();await expect(page.locator('#view-fire')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toEqual(saved);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await nav('firelife');await page.reload();await expect(page.locator('#view-firelife')).toBeVisible();await expect(page.locator('#fmCashflowEvidence')).toHaveCount(1);expect(errors).toEqual([]);await context.close();
 }
});

test('forecast touch selects a point while saved summary, ETA and data stay fixed across temporary assumptions',async({browser})=>{
 test.setTimeout(120000);
 const value=(rate,m)=>{const r=Math.expm1(Math.log1p(rate/100)/12);return 15000*Math.pow(1+r,m)+350*Math.expm1(m*Math.log1p(r))/r};
 const months=rate=>{for(let m=0;m<=1200;m++)if(value(rate,m)>=80000)return m;return null};
 for(const width of [320,360,390,430])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.route('**/chart-data/live-quotes.json',r=>r.fulfill({status:404,body:''}));await context.route('https://api.frankfurter.dev/**',r=>r.abort());const page=await context.newPage();
 await page.goto('/index.html');await page.evaluate(theme=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.theme=theme;d.accounts=[{id:'cash',amount:150000000,fire:true}];d.holdings=[];d.balance={fx:1400,cash:0,other:0,debt:0};d.fire={asset:15000,goal:80000,monthly:350,rate:7.5,withdrawal:4};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))},theme);await page.reload();await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmLabOpen').click();await page.locator('#fmForecastDisclosure>summary').click();
 const read=()=>page.evaluate(()=>({state:window.fmFireViewState.forecast,path:document.querySelector('#fmForecastPlot path').getAttribute('d'),eta:document.getElementById('fireYears').textContent,summary:document.getElementById('fmForecastSummaryValue').textContent,summaryDate:document.getElementById('fmForecastSummaryDate').textContent,saved:localStorage.getItem('firemate_smart_v3')}));const before=await read();
 expect(before.state.monthsToGoal).toBe(months(7.5));expect(before.state.baselineMonthsToGoal).toBe(months(7.5));expect(before.state.summaryAmount).toBeCloseTo(value(7.5,120),6);await expect(page.locator('#fmForecastBasis')).toBeVisible();await expect(page.locator('#fmForecastBasis')).toContainText('저장 계획과 같은 기준');await expect(page.locator('#fmForecastGoalETA')).toContainText(before.eta);
 for(const fraction of [.25,.65,.9]){
  await page.locator('#fmForecastPlot').scrollIntoViewIfNeeded();const b=await page.locator('#fmForecastPlot').boundingBox();await page.touchscreen.tap(b.x+b.width*fraction,b.y+b.height*.45);const after=await read();
  expect(after.state.selected).not.toBe(before.state.selected);expect(after.state.amount).toBeCloseTo(value(7.5,after.state.selected),6);expect(after.path).toBe(before.path);expect(after.eta).toBe(before.eta);expect(after.summary).toBe(before.summary);expect(after.summaryDate).toBe(before.summaryDate);expect(after.saved).toBe(before.saved);await expect(page.locator('#fmForecastSelectedDate')).toContainText('선택한 지점');
 }
 await page.locator('#fmForecastControls>summary').click();await page.locator('[data-forecast-rate="15"]').click();const temporary=await read();expect(temporary.state.isScenario).toBe(true);expect(temporary.path).not.toBe(before.path);expect(temporary.state.monthsToGoal).toBe(months(15));expect(temporary.summary).toBe(before.summary);expect(temporary.eta).toBe(before.eta);await expect(page.locator('#fmForecastBasis')).toContainText('임시 수익률 비교');await expect(page.locator('#fmForecastBasis')).toContainText('저장 계획 7.5%');
 await page.locator('#fmForecastInflation').fill('3');await page.locator('#fmForecastInflation').press('Tab');const inflation=await read();expect(inflation.path).toBe(temporary.path);expect(inflation.state.amount).toBe(temporary.state.amount);expect(inflation.summary).toBe(before.summary);
 await page.locator('[data-forecast-period="20"]').click();const period=await read();expect(period.state.summaryAmount).toBeCloseTo(value(7.5,240),6);expect(period.state.amount).toBeCloseTo(value(15,240),6);expect(period.summaryDate).toContain('20년 후');
 await expect(page.locator('#fmForecastUsePlan')).toBeVisible();await page.locator('#fmForecastUsePlan').click();const reset=await read();expect(reset.state.isScenario).toBe(false);expect(reset.state.rate).toBe(7.5);expect(reset.state.monthsToGoal).toBe(months(7.5));expect(reset.state.amount).toBeCloseTo(value(7.5,240),6);expect(reset.saved).toBe(before.saved);await expect(page.locator('#fmForecastGoalETA')).toContainText(before.eta);await expect(page.locator('#fmForecastUsePlan')).toHaveCount(0);
 await page.evaluate(()=>window.fmGo('fire'));await page.locator('#fmOpenCalculator').click();await page.locator('#rate').fill('8');await page.locator('#fmCancelFireDraft').click();await page.evaluate(()=>window.fmGo('firelab'));expect((await read()).state.rate).toBe(7.5);expect((await read()).saved).toBe(before.saved);
 if(width===390&&theme==='dark'){
  await page.locator('[data-forecast-rate="15"]').click();await page.evaluate(()=>window.fmGo('fire'));await page.locator('#fmOpenCalculator').click();await page.locator('#rate').fill('8');await page.locator('#saveFire').click();await page.locator('#fmAskOk').click();await page.evaluate(()=>window.fmGo('firelab'));const changed=await read();
  expect(changed.state.rate).toBe(15);expect(changed.state.savedRate).toBe(8);expect(changed.state.isScenario).toBe(true);expect(changed.state.baselineMonthsToGoal).toBe(months(8));expect(changed.state.summaryAmount).toBeCloseTo(value(8,240),6);await expect(page.locator('#fmForecastBasis')).toContainText('저장 계획 8%');
  const oldData=JSON.parse(before.saved),newData=JSON.parse(changed.saved);expect(newData).toEqual({...oldData,fire:{...oldData.fire,rate:8}});await page.locator('#fmForecastUsePlan').click();expect((await read()).state.monthsToGoal).toBe(months(8));
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await context.close();
 }
});
