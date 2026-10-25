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

test('올해 결산 sums the year: saved, dividends, top spend, no-spend days and certificates',async({page})=>{
 const y=String(new Date().getFullYear());
 await page.addInitScript(y=>{window.__fmYearAnyDay=true;localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'c',name:'정보처리기사',date:y+'-03-02'},{id:'g',name:'SQLD',goal:true,date:y+'-12-01'}]}))},y);
 await load(page,seed({tx:[{id:'i',date:y+'-01-10',type:'income',category:'급여',amount:3000000},{id:'d',date:y+'-01-11',type:'income',category:'배당·이자',amount:120000},{id:'e1',date:y+'-01-02',type:'expense',category:'식비',amount:500000},{id:'e2',date:y+'-01-03',type:'expense',category:'쇼핑',amount:200000}]}));
 await page.locator('#fmHomeYear').click();
 const c=page.locator('#fmMonthlyContent');
 await expect(page.locator('#fmMonthlyMonth')).toHaveText(y+'년 결산');
 await expect(c).toContainText('💰 모은 돈+₩2,420,000');
 await expect(c).toContainText('🌱 배당·이자₩120,000');
 await expect(c).toContainText('🛒 가장 많이 쓴 곳식비');
 await expect(c).toContainText('🔥 제일 많이 쓴 달1월');
 await expect(c).toContainText('🎓 딴 자격증1개');
 await expect(c).toContainText('🧘 무지출 날');
 await page.locator('#fmYearToggle').click();
 await expect(page.locator('#fmMonthlyMonth')).not.toContainText('결산');
});

test('FIRE counts this month\'s transfers to brokers and exchanges against the investing plan',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await load(page,seed({tx:[{id:'i',date:m+'-01',type:'income',category:'급여',amount:4000000},{id:'a',date:m+'-02',type:'transfer',category:'계좌 이체',amount:1200000,memo:'키움증권'},{id:'b',date:m+'-02',type:'transfer',category:'계좌 이체',amount:300000,memo:'업비트 입금'},{id:'c',date:m+'-02',type:'transfer',category:'계좌 이체',amount:30000,memo:'762907**47 ,2609-117회차'}]}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireInvest')).toHaveText('📤 투자로 보낸 돈 ₩1,500,000 · 계획 300만의 50%');
});

test('home plan follows the payday cycle and checks investing, 청약, bills and savings off the ledger',async({page})=>{
 // 2026-10-25 is a Sunday, so October's payday is Fri 10/23 and the cycle runs to Wed 11/25.
 await page.clock.setFixedTime(new Date(2026,9,28,9,0));
 const x=(id,type,amount,memo,category='계좌 이체')=>({id,date:'2026-10-26',type,category,amount,memo});
 await load(page,seed({tx:[x('a','transfer',2000000,'NH투자증권'),x('b','transfer',1000000,'삼성증권'),x('c','transfer',30000,'762907**47 ,2609-117회차'),x('d','expense',100000,'삼성화재 보험료','기타'),x('e','expense',70000,'SKT 통신요금','통신·구독'),x('f','transfer',400000,'카카오뱅크'),x('g','expense',500000,'김밥천국','식비'),{id:'old',date:'2026-10-22',type:'expense',category:'식비',amount:900000,memo:'지난 주기'}]}));
 await expect(page.locator('#fmHomePlanSum')).toHaveText('📋 월급 주기 계획 4/5 · 생활비 30만원 남음');
 await page.locator('#fmHomePlanSum').click();
 const rows=page.locator('#fmHomePlanRows');
 await expect(rows.locator('summary.ok, div.ok')).toHaveCount(5);// 투자 300만, 청약, 보험, 핸드폰 + 생활비 under plan; 비상금 40/50 not yet
 await expect(rows).toContainText('🐷 비상금40만 / 50만');
 // Each line lists the transactions it counted.
 await rows.locator('summary',{hasText:'비상금'}).click();
 await expect(rows).toContainText('10/26 카카오뱅크 ₩400,000');
 await expect(rows).toContainText('남은 30만원은 ISA로 💪');
 await expect(rows).toContainText('10/23 월급 ~ 11/25 월급 전');
});

test('월별 수익 lists each month\'s closing P&L from the saved history plus this month live',async({page})=>{
 const d=new Date(),pm=new Date(d.getFullYear(),d.getMonth()-1,1),p=pm.getFullYear()+'-'+String(pm.getMonth()+1).padStart(2,'0');
 await page.addInitScript(p=>localStorage.setItem('firemate_pl_history_v1',JSON.stringify({[p+'-10']:[1000000,1000000],[p+'-28']:[1100000,1000000]})),p);
 await load(page,seed({holdings:[{id:'h',accountId:'a',ticker:'005930',type:'KRW',qty:10,price:90000,cost:100000}]}));
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 const rows=page.locator('#fmPlMonths .fm-pl-row:not(.fm-pl-head)');
 await expect(rows).toHaveCount(2);
 await expect(rows.nth(0)).toContainText('−₩100,000');await expect(rows.nth(0)).toContainText('-10.00%');
 await expect(rows.nth(1)).toContainText(p.replace('-','/'));await expect(rows.nth(1)).toContainText('+₩100,000');await expect(rows.nth(1)).toContainText('+10.00%');
});
