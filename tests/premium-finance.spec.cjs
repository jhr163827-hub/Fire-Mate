const {test,expect}=require('@playwright/test');
async function seed(page){
 await page.route('https://api.frankfurter.dev/**',r=>r.abort());await page.goto('/index.html');
 await page.evaluate(()=>{const k='firemate_smart_v3',d=JSON.parse(localStorage.getItem(k));d.accounts=[{id:'cash',amount:150000000,fire:true}];d.holdings=[];d.balance={fx:1400,cash:0,other:0,debt:0};d.fire={asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4};d.retirement={items:[{name:'JEPQ',amount:65000}],monthly:300,yield:4,taxRate:20,priceChange:0,crash:25};localStorage.setItem(k,JSON.stringify(d));localStorage.setItem('firemate_arcade_watermelon_state_v1','game-preserve');});await page.reload();
}
test('decision overview links exact saved baselines, portfolio and independent stress without writes',async({page})=>{
 await seed(page);const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await page.locator('.bottomnav [data-view="fire"]').click();const state=await page.evaluate(()=>window.fmFireViewState);const months=state.forecast.baselineMonthsToGoal,date=new Date();date.setDate(1);date.setMonth(date.getMonth()+months);
 await expect(page.locator('#fmRetirementETA')).toContainText(date.getFullYear()+'년 '+(date.getMonth()+1)+'월');await expect(page.locator('#fireYears')).toHaveText('8년 2개월');
 await expect(page.locator('#fmFirePortfolioOpen')).toBeVisible();await page.locator('#fmFirePortfolioOpen').click();await expect(page.locator('#fmPortfolioDisclosure')).toHaveAttribute('open','');await expect(page.locator('#fmRetirePortfolio')).toBeVisible();await page.goBack();await expect(page.locator('#view-fire')).toBeVisible();
 await page.locator('#fmFireRiskOpen').click();await expect(page.locator('#fmLifeScenario')).toHaveAttribute('open','');await expect(page.locator('#fmStressBasis')).toContainText('연 분배율 4%');await expect(page.locator('#fmStressBasis')).toContainText('세금 부담률 20%');
 const risk=await page.evaluate(()=>window.fmFireViewState.stress);expect(risk).toMatchObject({total:65000,afterCrash:48750,monthlyBefore:65000*.04/12*.8,monthlyAfter:130,monthlyGap:-170});
 await page.locator('.fm-stress-edit').click();await expect(page.locator('#view-firelife')).toBeVisible();await expect(page.locator('#rpCrash')).toBeFocused();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);expect(await page.evaluate(()=>localStorage.getItem('firemate_arcade_watermelon_state_v1'))).toBe('game-preserve');
});
test('comparison mode and applied assumptions are visible before editing and do not change saved plan',async({page})=>{
 await seed(page);await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmFireStrategyOpen').click();const raw=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await expect(page.locator('#fmStrategyDetails')).not.toHaveAttribute('open','');await expect(page.locator('#fmStrModeDetail')).toBeVisible();await expect(page.locator('#fmComparisonBasis')).toContainText('임시 · 1년 비교');
 await page.locator('#fmStrModeDetail').click();await expect(page.locator('#fmComparisonBasis')).toContainText('장기 비교');await expect(page.locator('#fmQuickResult')).toBeHidden();
 await page.evaluate(()=>{for(const [id,v] of Object.entries({fmStrYears:30,fmStrInflation:3,fmStrDivGrowth:5,fmStrSameReturn:true,fmStrFairMode:true,fmStrReinvest:false,fmStrTaxApply:false,fmStrDivCost:20,fmStrInsurance:0})){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=v;else el.value=v}__fmFinanceTest.strategy({div:[{name:'TEST',amount:65000,estimatedAnnualMan:2600}],sale:[{name:'TEST',amount:65000,rate:5}]})});
 await expect(page.locator('#fmComparisonBasis')).toContainText('30년 · 물가 3.0%');await page.locator('#fmStrModeQuick').click();await expect(page.locator('#fmComparisonBasis')).toContainText('물가·매도세·보험료 미반영');expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(raw);
});
