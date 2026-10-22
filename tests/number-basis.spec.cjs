const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const seed=extra=>({theme:'dark',tx:[],rec:[],budgets:{},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:10000000,other:0,debt:0},accounts:[{id:'a',name:'투자',kind:'investment',amount:30000000,fire:true}],holdings:[],dailySnapshots:[],...extra});
const load=async(page,s)=>{await page.addInitScript(s=>{localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},s);await page.goto('/index.html')};

test('FIRE progress counts only FIRE assets everywhere; net worth stays the full total',async({page})=>{
 await load(page,seed({accounts:[{id:'a',name:'투자',kind:'investment',amount:30000000,fire:true},{id:'b',name:'전세보증금',kind:'cash',amount:100000000,fire:false}]}));
 // 4,000만 of 6.5억 → 6.2%; the excluded deposit must not count toward the goal.
 await expect(page.locator('#homeTotalAssets')).toHaveText('₩140,000,000');
 await expect(page.locator('#homeAssetPercent')).toHaveText('6.2%');
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#toast')).toContainText('운용자산 기준');
 await expect(page.locator('#fireAsset')).toHaveText('4,000만 원');
 await expect(page.locator('#firePct')).toHaveText('6.2%');
 await expect(page.locator('#fmFireBasisGap')).toHaveText('전체 순자산 1억 4,000만 원 · FIRE 제외 1억 원 · 계좌 고르기 ›');
 expect(await page.evaluate(()=>window.fmFireViewState.plan.net)).toBe(40000000);
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#assetGoalPct')).toHaveText('6.2%');
 await page.reload();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_fire_basis_v1'))).toBe('1');
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#fireLiquidSummary')).toContainText('FIRE 운용자산 ₩40,000,000 · 총순자산 ₩140,000,000');
 await expect(page.locator('#netWorth')).toHaveText('₩140,000,000');
});

test('with every account counted for FIRE no basis note is shown',async({page})=>{
 await load(page,seed({}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireBasisGap')).toBeHidden();
});

test('old and hand-entered prices are labelled; an exchange rate never fetched is marked as the default',async({page})=>{
 const old=new Date(Date.now()-10*86400000).toISOString(),fresh=new Date().toISOString();
 await load(page,seed({holdings:[{id:'h1',accountId:'a',ticker:'JEPQ',name:'JEPQ',type:'USD',qty:1,price:50,cost:40,quoteAt:old},{id:'h2',accountId:'a',ticker:'SCHD',name:'SCHD',type:'USD',qty:1,price:30,cost:30,quoteAt:fresh},{id:'h3',accountId:'a',ticker:'비상장',name:'비상장',type:'KRW',qty:1,price:1000000,cost:1000000}]}));
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickHoldings').click();
 const panel=page.locator('#fmAssetHoldingsPanel');
 await expect(panel).toContainText('10일 전 시세');
 await expect(panel).toContainText('직접 입력가');
 await expect(panel.locator('.fm-stale')).toHaveCount(1);
 await expect(page.locator('#fmAssetQuoteContext summary')).toHaveText('환율 1,400원/USD (기본값) · 시세 상태');
});

test('accounts can be moved in or out of FIRE right from the FIRE screen, and the choice is saved',async({page})=>{
 await load(page,seed({accounts:[{id:'a',name:'투자',kind:'investment',amount:30000000,fire:true},{id:'b',name:'전세보증금',kind:'cash',amount:100000000,fire:false}]}));
 await page.evaluate(()=>window.fmGo('fire'));
 const gap=page.locator('#fmFireBasisGap'),box=page.locator('#fmFireAccounts');
 await expect(box).toBeHidden();
 await gap.click();
 await expect(gap).toHaveAttribute('aria-expanded','true');
 await expect(box.locator('input[data-fire-acc="a"]')).toBeChecked();
 await expect(box.locator('label').filter({hasText:'전세보증금'})).toContainText('1억 원');
 await box.locator('input[data-fire-acc="b"]').check();
 await expect(page.locator('#firePct')).toHaveText('21.5%');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).accounts.find(a=>a.id==='b').fire)).toBe(true);
 // With nothing excluded the toggle stays reachable while open, so the change can be undone.
 await expect(gap).toContainText('접기');
 await box.locator('input[data-fire-acc="b"]').uncheck();
 await expect(page.locator('#firePct')).toHaveText('6.2%');
 await gap.click();
 await expect(box).toBeHidden();
 await page.reload();await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#firePct')).toHaveText('6.2%');
});
