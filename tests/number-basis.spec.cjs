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
 await expect(page.locator('#fmFireBasisGap')).toHaveText('FIRE 제외 1억 원 · 계좌 고르기');
 expect(await page.evaluate(()=>window.fmFireViewState.plan.net)).toBe(40000000);
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#assetGoalPct')).toHaveCount(0);
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
 // The exchange rate lives in settings, not on the asset card.
 await expect(page.locator('#fmAssetQuoteContext')).toBeHidden();
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

test('월간 결산 splits the net worth change into savings and investment/other',async({page})=>{
 const d=new Date(),ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),p=new Date(d.getFullYear(),d.getMonth(),0),prevDay=p.getFullYear()+'-'+String(p.getMonth()+1).padStart(2,'0')+'-'+String(p.getDate()).padStart(2,'0');
 // Today's automatic record equals the current net worth (₩11,500,000), so the month's change is +1.5M.
 await load(page,seed({accounts:[],balance:{fx:1400,cash:11500000,other:0,debt:0},tx:[{id:'i',date:ym+'-01',type:'income',category:'급여',amount:3000000},{id:'e',date:ym+'-01',type:'expense',category:'식비',amount:1000000}],dailySnapshots:[{day:prevDay,amount:10000000,recordedAt:prevDay+'T12:00:00Z'},{day:ym+'-01',amount:11500000,recordedAt:ym+'-01T12:00:00Z'}]}));
 await page.locator('#fmMonthlyOpen').click();
 const split=page.locator('.fm-monthly-split');
 await expect(split).toContainText('저축 +₩2,000,000');
 await expect(split).toContainText('투자·기타 −₩500,000');
});

test('FIRE shows this month\'s actual savings against the plan',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await load(page,seed({tx:[{id:'i',date:m+'-01',type:'income',category:'급여',amount:4000000},{id:'e',date:m+'-02',type:'expense',category:'식비',amount:500000}]}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireSaved')).toHaveText('이번 달 +₩3,500,000 모음 · 계획의 117% 👍');
});

test('the ledger top shows what was saved this month and offers the 뱅크샐러드 import',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await load(page,seed({tx:[{id:'i',date:m+'-01',type:'income',category:'급여',amount:4000000},{id:'e',date:m+'-02',type:'expense',category:'식비',amount:500000,bankExcelKey:'k'}]}));
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#fmCalendarSaved')).toHaveText('+₩3,500,000');
 // Import lives as a small icon in the ledger header; the full-width row is gone to make room.
 await expect(page.locator('#fmHeaderImport')).toBeVisible();
 await expect(page.locator('#fmLedgerImportBtn')).toBeHidden();
 await expect(page.locator('#fmHeaderImport')).toHaveAttribute('title','뱅크샐러드 가져오기 · '+Number(m.slice(5))+'월 2일까지 있음');
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#fmHeaderImport')).toBeHidden();
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#fmLedgerSyncNote')).toHaveText(Number(m.slice(5))+'월 2일까지 있음');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
