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
