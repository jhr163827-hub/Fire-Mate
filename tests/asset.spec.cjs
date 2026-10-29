const {test,expect}=require('@playwright/test');
// The scheduled backup quote file is live on GitHub; keep these fixtures' prices fixed.
test.beforeEach(async({page})=>{await page.route('**/chart-data/live-quotes.json*',r=>r.fulfill({status:404,body:''}));await page.route('https://polling.finance.naver.com/**',r=>r.abort())});
test('account detail adds holdings to its own account and preserves existing data',async({page})=>{
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{rates:{KRW:1400},date:'2026-10-18'}}));
 await page.goto('/index.html');
 await page.evaluate(()=>{
  const saved=JSON.parse(localStorage.getItem('firemate_smart_v3'));
  saved.accounts=[{id:'legacy-us',name:'기본 미국',kind:'investment',amount:100,fire:true},{id:'qa-custom',name:'별도 계좌',kind:'investment',amount:200,fire:true}];
  saved.holdings=[{id:'qa-existing',accountId:'legacy-us',ticker:'SPY',type:'USD',qty:2,cost:80,price:100}];
  localStorage.setItem('firemate_smart_v3',JSON.stringify(saved));
 });
 await page.reload();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));
 const before=await read();
 await page.locator('button.bottom-item[data-view="assets"]').click();
 await page.locator('[data-inline-toggle="qa-custom"]').click();
 await page.locator('#fmDetailAdd').click();
 await expect(page.locator('#holdingAccount')).toHaveValue('qa-custom');
 for(const [id,value] of [['holdingTicker','QQQ'],['holdingQty','3'],['holdingCost','90'],['holdingPrice','110']])await page.locator('#'+id).fill(value);
 await page.locator('#saveHolding').click();
 const after=await read();
 expect(after.holdings).toHaveLength(2);
 expect(after.holdings[0]).toEqual(before.holdings[0]);
 expect(after.holdings[1]).toMatchObject({accountId:'qa-custom',ticker:'QQQ',qty:3,cost:90,price:110});
 for(const key of ['accounts','tx','budgets','fire','retirement','balance'])expect(after[key]).toEqual(before[key]);
 await page.reload();
 expect((await read()).holdings).toEqual(after.holdings);
 await page.locator('button.bottom-item[data-view="assets"]').click();
 await page.locator('#fmAssetQuickHoldings').click();
 // Editing starts from the holding's detail page (the list rows have no pencil button).
 await page.locator('[data-holding-row="qa-existing"] .fm-holding-row-main').click();
 await page.locator('#fmDetailEdit').click();
 await expect(page.locator('#holdingAccount')).toHaveValue('legacy-us');
 await page.locator('[data-close="holdingOverlay"]').first().click();
 expect((await read()).holdings).toEqual(after.holdings);
});
for(const width of [320,360,390,430]){
 test.describe('mobile '+width,()=>{
  test.use({viewport:{width,height:850},isMobile:true,hasTouch:true});
  test('loads and switches asset tabs without losing navigation',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('/index.html');
   await expect(page.locator('#view-home')).toHaveClass(/active/);
   await page.locator('button.bottom-item[data-view="assets"]').click();
   const ids=['fmAssetQuickAccounts','fmAssetQuickHoldings','fmAssetQuickDividend','fmAssetQuickAnalysis'];
   for(const id of [...ids,...ids]){
    await page.locator('#'+id).click();
    await expect(page.locator('#'+id)).toHaveAttribute('aria-selected','true');
    for(const navId of ids){
     const button=page.locator('#'+navId);
     await expect(button).toBeVisible();
     expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    const panels=['fmAssetAccountsPanel','fmAssetHoldingsPanel','fmAssetDividendView','fmAssetAnalysisView'];
    for(let i=0;i<panels.length;i++){
     if(ids[i]===id)await expect(page.locator('#'+panels[i])).toBeVisible();
     else await expect(page.locator('#'+panels[i])).toBeHidden();
    }
    expect(await page.evaluate(()=>window.scrollY)).toBe(0);
    if(id==='fmAssetQuickAnalysis')await expect(page.locator('#fmAssetAnalysisView .fm-analysis-tabs')).toBeHidden();
   }
   expect(errors).toEqual([]);
  });
  test('initial browser history state is initialized before first navigation',async({page})=>{
   await page.goto('/index.html');
   const state=await page.evaluate(()=>history.state);
   expect(state).toMatchObject({fmNav:true,tab:'home'});
   await page.locator('button.bottom-item[data-view="assets"]').click();
   await page.goBack();
   await expect(page.locator('#view-home')).toHaveClass(/active/);
  });
  test('restored main tab remains correct after first navigation and browser back',async({page})=>{
   await page.addInitScript(()=>sessionStorage.setItem('firemate_last_tab_v1','assets'));
   await page.goto('/index.html');
   await expect(page.locator('#view-assets')).toHaveClass(/active/);
   await page.locator('button.bottom-item[data-view="fire"]').click();
   await page.goBack();
   await expect(page.locator('#view-assets')).toHaveClass(/active/);
  });
  test('browser back returns to immediately previous main tab',async({page})=>{
   await page.goto('/index.html');
   const nav=tab=>page.locator('button.bottom-item[data-view="'+tab+'"]');
   await nav('assets').click();
   await nav('fire').click();
   await page.goBack();
   await expect(page.locator('#view-assets')).toHaveClass(/active/);
   await page.goBack();
   await expect(page.locator('#view-home')).toHaveClass(/active/);
  });
  test('back and forward traverse actual main tab history',async({page})=>{
   await page.goto('/index.html');
   const nav=tab=>page.locator('button.bottom-item[data-view="'+tab+'"]');
   await nav('assets').click();
   await nav('fire').click();
   await page.goBack();
   await expect(page.locator('#view-assets')).toHaveClass(/active/);
   await page.goForward();
   await expect(page.locator('#view-fire')).toHaveClass(/active/);
   await page.goBack();
   await expect(page.locator('#view-assets')).toHaveClass(/active/);
   await page.goBack();
   await expect(page.locator('#view-home')).toHaveClass(/active/);
  });
  test('switching between calendar and fire restores calendar on back',async({page})=>{
   await page.goto('/index.html');
   await page.locator('button.bottom-item[data-view="calendar"]').click();
   await expect(page.locator('#view-calendar')).toHaveClass(/active/);
   await page.locator('button.bottom-item[data-view="fire"]').click();
   await page.goBack();
   await expect(page.locator('#view-calendar')).toHaveClass(/active/);
  });
  test('viewport has no horizontal overflow and navigation preserves persisted finance data',async({page})=>{
   await page.route('https://api.frankfurter.dev/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({date:new Date().toISOString().slice(0,10),rates:{KRW:1400}})}));
   await page.goto('/index.html');
   // Wait for the application's asynchronous FX refresh before capturing persisted data.
   // The refresh is legitimate finance data persistence, not navigation data loss.
   await page.waitForFunction(()=>{
    const saved=JSON.parse(localStorage.getItem('firemate_smart_v3')||'null');
    return saved?.balance?.fx===1400 && Boolean(saved?.balance?.fxCheckedAt);
   },null,{timeout:10000});
   const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
   await page.locator('button.bottom-item[data-view="assets"]').click();
   for(const id of ['fmAssetQuickAccounts','fmAssetQuickHoldings','fmAssetQuickAnalysis']){
    await page.locator('#'+id).click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow,'horizontal overflow on '+id).toBeLessThanOrEqual(2);
   }
   const after=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
   expect(after).toEqual(before);
  });
  test('analysis has no duplicate dividend navigation and dividend panel stays separate',async({page})=>{
   await page.goto('/index.html');
   await page.locator('button.bottom-item[data-view="assets"]').click();
   await page.locator('#fmAssetQuickAnalysis').click();
   await expect(page.locator('#fmAssetAnalysisView')).toBeVisible();
   await expect(page.locator('#fmAssetAnalysisView #fmDividendTab')).toHaveCount(0);
   await expect(page.locator('#fmAssetAnalysisView #fmDividendPanel')).toHaveCount(0);
   await page.locator('#fmAssetQuickDividend').click();
   await expect(page.locator('#fmAssetDividendView #fmDividendPanel')).toBeVisible();
   await page.locator('#fmAssetQuickAnalysis').click();
   await expect(page.locator('#fmAssetDividendView')).toBeHidden();
  });
  test('seeded dividend row opens holding detail by click, Enter and Space, then browser back',async({page,context})=>{
   const now=new Date();const day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),'01'].join('-');
   const seed={tx:[{id:'qa-tx',date:day,type:'expense',category:'식비',amount:9000,memo:'QA meal'}],rec:[],budgets:{},theme:'dark',fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:10000,other:2000,debt:3000},accounts:[{id:'qa-us',name:'QA US',kind:'investment',amount:5000,fire:true},{id:'qa-kr',name:'QA KR',kind:'investment',amount:7000,fire:true}],holdings:[{id:'qa-us1',accountId:'qa-us',ticker:'JEPQ',type:'USD',qty:2,price:100,cost:80},{id:'qa-us2',accountId:'qa-kr',ticker:'JEPQ',type:'USD',qty:3,price:100,cost:90},{id:'qa-kr1',accountId:'qa-kr',ticker:'005930',type:'KRW',qty:3,price:10000,cost:9000}]};
   await page.addInitScript(value=>localStorage.setItem('firemate_smart_v3',JSON.stringify(value)),seed);
   // Include service-worker-owned fetches and both feed URL forms.
   await context.route(/\/dividends\.json(?:\?|$)/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({updatedAt:day,symbols:{JEPQ:{currency:'USD',events:[{date:day,amount:0.5}]},'005930.KS':{currency:'KRW',events:[{date:day,amount:100}]}}})}));
   await page.goto('/index.html');
   await page.locator('button.bottom-item[data-view="assets"]').click();
   await page.locator('#fmAssetQuickDividend').click();
   const row=page.locator('#fmAssetDividendView .fm-div-clickable').first();
   await expect(row).toBeVisible();
   await expect(row).toHaveAttribute('role','button');
   await expect(row).toHaveAttribute('tabindex','0');
   expect(await row.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
   for(const action of ['click','Enter','Space']){
    if(action==='click')await row.click();else{await row.focus();await page.keyboard.press(action)}
    await expect(page.locator('#fmAccountDetail')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#fmAssetDividendView')).toBeVisible();
    await expect(row).toBeVisible();
   }
   expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).holdings).toEqual(seed.holdings);
  });
 });
}

test('production finance functions agree with independent reference fixture',async({page})=>{
 // Inject a test-only hook inside the existing IIFE; production files remain unchanged.
 await page.route('**/index.html',async route=>{
  const response=await route.fetch();
  let html=await response.text();
  const marker='function fmAssetMathSelfTest(){';
  expect(html.includes(marker)).toBe(true);
  const hook=`window.__fmFinanceFixture=()=>{const old=data;try{
   data={...old,holdings:[
    {id:'qa',accountId:'a',ticker:'QA',type:'USD',qty:2,price:100,cost:80},
    {id:'qb',accountId:'b',ticker:'QA',type:'USD',qty:3,price:100,cost:90},
    {id:'kc',accountId:'b',ticker:'KR',type:'KRW',qty:3,price:10000,cost:9000}
   ],accounts:[{id:'a',amount:5000,fire:true},{id:'b',amount:0,fire:false,items:[{amount:7000}]}],balance:{...old.balance,fx:1400,cash:10000,other:2000,debt:3000}};
   const vals=data.holdings.map(h=>({value:assetValue(h),cost:assetCost(h)}));
   return {vals,net:netAsset(),fire:fireLiquid(),selfTest:fmAssetMathSelfTest()};
  }finally{data=old}};`;
  html=html.replace(marker,hook+marker);
  await route.fulfill({response,body:html});
 });
 await page.goto('/index.html');
 const result=await page.evaluate(()=>window.__fmFinanceFixture());
 expect(result.vals).toEqual([{value:280000,cost:224000},{value:420000,cost:378000},{value:30000,cost:27000}]);
 expect(result.net).toBe(751000);
 expect(result.fire).toBe(292000);
 expect(result.selfTest).toBe(true);
});

test('theme save failure rolls back UI and preserves original finance data',async({page})=>{
 // Keep live quotes/FX from rewriting the record while the save is being blocked.
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 const fixture={theme:'dark',tx:[{id:'qa-1',date:'2026-10-01',type:'expense',amount:9000,category:'식비'}],holdings:[{id:'qa-h',accountId:'legacy-us',ticker:'JEPQ',type:'USD',qty:2,price:100,cost:80}],balance:{fx:1400,cash:5000,other:0,debt:0},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4}};
 await page.addInitScript(seed=>localStorage.setItem('firemate_smart_v3',JSON.stringify(seed)),fixture);
 await page.goto('/index.html');
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key==='firemate_smart_v3')throw new DOMException('Quota exceeded','QuotaExceededError');return original.call(this,key,value)};
 });
 await page.locator('#theme').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).holdings).toEqual(fixture.holdings);
});

test('production 30-year projection matches independent compound monthly reference',async({page})=>{
 await page.goto('/index.html');
 const cases=[{asset:15000,monthly:300,rate:7,months:360},{asset:0,monthly:200,rate:0,months:360},{asset:10000,monthly:0,rate:12,months:360}];
 const actual=await page.evaluate(cases=>cases.map(c=>window.__fmFinanceTest.projection(c.asset,c.monthly,c.rate,c.months)),cases);
 for(let i=0;i<cases.length;i++){
  const c=cases[i],monthlyRate=Math.pow(1+c.rate/100,1/12)-1;
  let expected=c.asset;
  for(let month=0;month<c.months;month++)expected=expected*(1+monthlyRate)+c.monthly;
  expect(actual[i].projected).toBeCloseTo(expected,6);
  expect(actual[i].series.at(-1)).toBeCloseTo(expected,6);
 }
});

for(const width of [320,360,390,430]){
 for(const theme of ['dark','light']){
  test('seeded '+width+'px '+theme+' theme retains assets after reload and reopening',async({page,context})=>{
   await page.setViewportSize({width,height:850});
   const fixture={theme,tx:[{id:'qa-tx',date:'2026-10-01',type:'expense',category:'식비',amount:9000,memo:'QA'}],holdings:[{id:'qa-us',accountId:'qa-account',ticker:'JEPQ',type:'USD',qty:2,price:100,cost:80},{id:'qa-kr',accountId:'qa-account',ticker:'005930',type:'KRW',qty:3,price:10000,cost:9000}],accounts:[{id:'qa-account',name:'QA',kind:'investment',amount:10000,fire:true}],balance:{fx:1400,cash:5000,other:0,debt:0},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4}};
   // Deterministic FX: production auto-refresh otherwise overwrites the seeded 1400 KRW/USD.
   await page.route('https://api.frankfurter.dev/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({date:'2026-10-16',rates:{KRW:1400}})}));
   await page.goto('/index.html');
   await page.evaluate(seed=>localStorage.setItem('firemate_smart_v3',JSON.stringify(seed)),fixture);
   await page.reload();
   await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
   await page.locator('button.bottom-item[data-view="assets"]').click();
   for(const id of ['fmAssetQuickAccounts','fmAssetQuickHoldings','fmAssetQuickDividend','fmAssetQuickAnalysis']){
    await page.locator('#'+id).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
   }
   await page.reload();
   const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3')));
   expect(saved.holdings).toEqual(fixture.holdings);
   expect(saved.tx).toEqual(fixture.tx);
   expect(saved.balance.fx).toBe(1400);
   await page.close();
   const reopened=await context.newPage();
   await reopened.goto('/index.html');
   await expect(reopened.locator('html')).toHaveAttribute('data-theme',theme);
   const reopenedData=JSON.parse(await reopened.evaluate(()=>localStorage.getItem('firemate_smart_v3')));
   expect(reopenedData.holdings).toEqual(fixture.holdings);
   expect(reopenedData.tx).toEqual(fixture.tx);
  });
 }
}

test('dividend gross/net totals aggregate USD across accounts and KRW with correct withholding',async({page,context})=>{
 const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),'01'].join('-');
 const fixture={theme:'dark',tx:[],rec:[],budgets:{},balance:{fx:1400,fxCheckedAt:[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),cash:0,other:0,debt:0},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},accounts:[{id:'a',name:'US A',kind:'investment',amount:0,fire:true},{id:'b',name:'US B',kind:'investment',amount:0,fire:true},{id:'c',name:'KR',kind:'investment',amount:0,fire:true}],holdings:[{id:'a1',accountId:'a',ticker:'JEPQ',type:'USD',qty:2,price:100,cost:80},{id:'b1',accountId:'b',ticker:'JEPQ',type:'USD',qty:3,price:100,cost:90},{id:'c1',accountId:'c',ticker:'005930',type:'KRW',qty:3,price:10000,cost:9000}]};
 await page.addInitScript(seed=>localStorage.setItem('firemate_smart_v3',JSON.stringify(seed)),fixture);
 // Page routes cannot intercept the service worker's forwarded feed request.
 await context.route(/\/dividends\.json(?:\?|$)/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({updatedAt:date,symbols:{JEPQ:{currency:'USD',events:[{date,amount:0.5}]},'005930.KS':{currency:'KRW',events:[{date,amount:100}]}}})}));
 await page.goto('/index.html');
 await page.locator('button.bottom-item[data-view="assets"]').click();
 await page.locator('#fmAssetQuickDividend').click();
 // Dividend feed loads asynchronously; assert its rendered detail rather than a pre-fetch snapshot.
 await expect(page.locator('#fmDivHoldings .fm-div-detail-title')).toContainText('세전 ₩3,800');
 const rows=page.locator('#fmAssetDividendView .fm-div-clickable');
 await expect(rows).toHaveCount(2);
 const detail=page.locator('#fmDivHoldings .fm-div-detail-title');
 await expect(detail).toContainText('세전 ₩3,800');
 await expect(detail).toContainText('세후 ₩3,229');
 await expect(page.locator('#fmDivMonth')).toContainText('₩3,800');
 await expect(page.locator('#fmDivYear')).toContainText('₩3,229');
 const usd=rows.filter({hasText:'JEPQ'});
 await expect(usd).toContainText('5주');
 await expect(usd).toContainText('세전 ₩3,500');
 await expect(usd).toContainText('₩2,975');
 const krw=rows.filter({hasText:'005930'});
 await expect(krw).toContainText('세전 ₩300');
 await expect(krw).toContainText('₩254');
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).holdings).toEqual(fixture.holdings);
});

test('a monthly dividend goal shows progress, when the plan reaches it, what to buy to fill it and dividend growth',async({page,context})=>{
 const iso=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
 await context.route(/\/dividends\.json(?:\?|$)/,route=>route.fulfill({json:{updatedAt:iso(0),symbols:{SCHD:{currency:'USD',events:[-700,-610,-520,-430,-300,-210,-120,-30].map((n,i)=>({date:iso(n),amount:i<4?0.4:0.5}))}}}}));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.request().url().includes('dividends.json')?r.fallback():r.abort());
 await page.addInitScript(()=>{if(sessionStorage.getItem('dg'))return;sessionStorage.setItem('dg','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],rec:[],budgets:{},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],holdings:[{id:'h',accountId:'a',ticker:'SCHD',name:'SCHD',type:'USD',qty:1000,price:28,cost:25}]}))});
 await page.goto('/index.html');
 await page.locator('button.bottom-item[data-view="assets"]').click();
 await page.locator('#fmAssetQuickDividend').click();
 await page.locator('#fmDivGoalIn').fill('50');await page.locator('#fmDivGoalForm button').click();
 // 1,000주 × $2 × 1,400 × 85% = 연 238만 → 월 약 19.8만 of 50만.
 const goal=page.locator('#fmDivGoal');
 await expect(goal).toContainText('🎯 배당 월급 ₩198,000 / ₩500,000');
 await expect(goal).toContainText(/40% · 지금 계획대로면 \d{4}년쯤/);
 await expect(goal).toContainText('SCHD1,522주');
 await expect(goal).toContainText('📈 1년 배당 성장 SCHD +25%');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_div_goal_v1'))).toBe('500000');
});
