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
 await load(page,seed({tx:[x('a','transfer',2000000,'NH투자증권'),x('b','transfer',1000000,'삼성증권'),x('c','transfer',30000,'762907**47 ,2609-117회차'),x('d','expense',100000,'삼성화재 보험료','기타'),x('e','expense',70000,'SKT 통신요금','통신·구독'),x('f','transfer',400000,'세이프박스에 보관'),x('g','expense',500000,'김밥천국','식비'),{id:'old',date:'2026-10-22',type:'expense',category:'식비',amount:900000,memo:'지난 주기'}]}));
 await expect(page.locator('#fmHomePlanSum')).toHaveText('📋 월급 주기 계획 4/5 · 생활비 30만원 남음');
 await page.locator('#fmHomePlanSum').click();
 const rows=page.locator('#fmHomePlanRows');
 await expect(rows.locator('summary.ok, div.ok')).toHaveCount(5);// 투자 300만, 청약, 보험, 핸드폰 + 생활비 under plan; 비상금 40/50 not yet
 await expect(rows).toContainText('🐷 비상금40만 / 50만');
 // Each line lists the transactions it counted.
 await rows.locator('summary',{hasText:'비상금'}).click();
 await expect(rows).toContainText('10/26 세이프박스에 보관 ₩400,000');
 await expect(rows).toContainText('남은 30만원은 ISA로 💪');
 await expect(rows).toContainText('10/23 월급 ~ 11/25 월급 전');
 // ‹ 지난 주기 shows the cycle before payday.
 await rows.locator('#fmPlanBack').click();
 await expect(rows).toContainText('9/25 월급 ~ 10/23 월급 전');
 await expect(rows).toContainText('🛒 생활비90만 / 80만');
 await rows.locator('#fmPlanBack').click();
 await expect(rows).toContainText('10/23 월급 ~ 11/25 월급 전');
});

test('the week after payday, home says to move last cycle\'s unspent living money to ISA',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,9,26,9,0));
 await load(page,seed({tx:[{id:'a',date:'2026-10-10',type:'expense',category:'식비',amount:500000,memo:'장보기'}]}));
 await expect(page.locator('#fmHomePlanSum')).toHaveText('💼 월급 들어왔어요 · 지난달 남은 30만원 ISA로 💪');
 await page.clock.setFixedTime(new Date(2026,9,31,9,0));await page.reload();
 await expect(page.locator('#fmHomePlanSum')).toContainText('📋 월급 주기 계획');
});

test('home plan counts investing by BankSalad category or account even when the memo is just a name, and lists other transfers',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,9,28,9,0));
 const x=(id,memo,main,sub,pay,amount)=>({id,date:'2026-10-26',type:'transfer',category:'계좌 이체',amount,memo,bankExcelKey:['2026-10-26','10:00','transfer',main,sub,memo,amount,pay].join('|')});
 await load(page,seed({tx:[x('a','홍길동','이체','투자','카카오뱅크',1000000),x('b','홍길동','이체','내계좌이체','NH투자증권 CMA',500000),x('c','엄마','이체','미분류','카카오뱅크',200000),{id:'d',date:'2026-10-26',type:'expense',category:'식비',amount:100000,memo:'마트'}]}));
 await page.locator('#fmHomePlanSum').click();
 const rows=page.locator('#fmHomePlanRows');
 await expect(rows).toContainText('💰 투자150만 / 300만');
 await rows.locator('summary',{hasText:'안 잡힌 이체'}).click();
 await expect(rows).toContainText('10/26 엄마 이체 미분류 카카오뱅크 ₩200,000');
 await expect(rows).toContainText('🛒 생활비10만 / 80만');
});

test('the payday plan is edited in settings, not on home; 세이프박스 deposits count as 비상금',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,9,28,9,0));
 await load(page,seed({tx:[{id:'a',date:'2026-10-26',type:'transfer',category:'계좌 이체',amount:100000,memo:'세이프박스에 보관'}]}));
 await expect(page.locator('#fmHomePlan input')).toHaveCount(0);
 await page.locator('#settingsBottom').click();
 await page.locator('.fm-set-plan summary').click();
 await page.locator('[data-plan="safe"]').fill('10');await page.locator('[data-plan="safe"]').blur();
 await page.locator('[data-plan="pay"]').fill('10');await page.locator('[data-plan="pay"]').blur();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_month_plan_v1')))).toMatchObject({safe:10,pay:10});
 await expect(page.locator('#fmPayDay')).toHaveText('💼 월급 D-13');
 await page.locator('[data-plan="pay"]').fill('25');await page.locator('[data-plan="pay"]').blur();
 await page.locator('#fmHomePlanSum').click({force:true});
 await expect(page.locator('#fmHomePlanRows summary.ok',{hasText:'비상금'})).toHaveText('🐷 비상금10만 / 10만');
});

test('a 내계좌이체 to one\'s own name (salary moved between own accounts) is not investing; a 채우기 alone is not 비상금; interest and the 청약 mirror row are not listed',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,9,28,9,0));
 const x=(id,memo,main,sub,pay,amount,date='2026-10-23')=>({id,date,type:'transfer',category:'계좌 이체',amount,memo,bankExcelKey:[date,'10:00','transfer',main,sub,memo,amount,pay].join('|')});
 await load(page,seed({tx:[x('a','채우기','내계좌이체','미분류','토스뱅크 나눠모으기 통장',100000),x('b','홍길동','내계좌이체','미분류','토스뱅크 통장',3000000),x('b0','토뱅 홍길동','내계좌이체','미분류','온라인자립예탁금',3000000),x('c','정기이자 입금','저축','미분류','세이프박스',93,'2026-10-24'),x('d','입금 내역','미분류','미분류','주택청약종합저축',30000),x('e','세이프박스에 보관','내계좌이체','미분류','세이프박스',400000)]}));
 await page.locator('#fmHomePlanSum').click();
 const rows=page.locator('#fmHomePlanRows');
 await expect(rows).toContainText('💰 투자0 / 300만');
 await expect(rows).toContainText('🐷 비상금40만 / 50만');
 await expect(rows.locator('.fm-plan-other')).toHaveCount(0);
});

test('pay that lands early (추석) starts the cycle on the 급여 day',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,8,28,9,0));
 await load(page,seed({tx:[{id:'p',date:'2026-09-23',type:'income',category:'급여',amount:4500000,memo:'급여'}]}));
 await page.locator('#fmHomePlanSum').click();
 await expect(page.locator('#fmHomePlanRows')).toContainText('9/23 월급 ~ 10/23 월급 전');
});

test('rows imported before directions were kept still sort out: unpaired transfers out of 토스 are investing, pairs are moves; a row can be re-filed from the 가계부 editor',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,9,25,19,0));
 const d='2026-10-23',x=(id,sec,memo,amount,pay,main='내계좌이체',type='transfer')=>({id,date:d,type,category:'계좌 이체',amount,memo,bankExcelKey:[d,String(sec).padStart(5,'0'),type,main,'미분류',memo,amount,pay].join('|')});
 await load(page,seed({tx:[
  x('s1',35944,'토뱅 홍길동',4544911,'온라인자립예탁금'),x('s2',35945,'홍길동',4544911,'토스뱅크 통장'),
  x('b1',36111,'홍길동',1000000,'토스뱅크 통장'),x('b2',35978,'홍길동',1740000,'토스뱅크 통장'),
  x('k1',36242,'홍길동',300000,'토스뱅크 통장'),x('k2',36242,'홍길동',300000,'MY 입출금통장'),x('u',36278,'업비트 입금',300000,'MY 입출금통장','온라인쇼핑'),
  x('c1',36348,'홍길동',400000,'토스뱅크 통장'),x('c2',36348,'홍길동',400000,'입출금통장'),x('c3',36369,'세이프박스',400000,'입출금통장'),x('c4',36369,'세이프박스에 보관',400000,'세이프박스'),
  x('t1',36390,'비상금',100000,'토스뱅크 통장'),x('t2',36390,'채우기',100000,'토스뱅크 나눠모으기 통장'),
  x('j1',36330,'홍길동',30000,'토스뱅크 통장'),x('j2',36330,'홍길동',30000,'KB나라사랑우대통장'),x('j3',74720,'762907**47 ,2609-117회차',30000,'KB나라사랑우대통장'),x('j4',74720,'입금 내역',30000,'주택청약종합저축','미분류'),
  x('o',40000,'홍길동',250000,'토스뱅크 통장','이체')]}));
 await page.locator('#fmHomePlanSum').click();
 const rows=page.locator('#fmHomePlanRows');
 await expect(rows).toContainText('💰 투자304만 / 300만');
 await expect(rows).toContainText('🐷 비상금50만 / 50만');
 await expect(rows).toContainText('🏠 청약3만 / 3만');
 await rows.locator('summary',{hasText:'투자'}).click();
 await expect(rows).toContainText('10/23 토스뱅크 통장 → 증권계좌 ₩1,740,000');
 // The one transfer it could not place opens in the 가계부 editor; filing it as 투자 counts it.
 await rows.locator('summary',{hasText:'안 잡힌 이체'}).click();
 await rows.locator('[data-plan-tx="o"]').click();
 await page.locator('#entryCat').selectOption('투자');await page.locator('#saveEntry').click();
 await page.locator('#fmHomePlanSum').evaluate(s=>{if(!s.parentElement.open)s.click()});
 await expect(page.locator('#fmHomePlanRows')).toContainText('💰 투자329만 / 300만');
});

test('the plan shows the last cycles as a ✓ grid and asks for one more import while transfers lack a direction',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,9,28,9,0));
 const x=(id,date,memo,amount)=>({id,date,type:'transfer',category:'계좌 이체',amount,memo,bankExcelKey:[date,'10:00','transfer','이체','미분류',memo,amount,'토스뱅크 통장'].join('|')});
 const tx=[x('a','2026-08-26','삼성증권',3000000),x('b','2026-09-24','업비트 입금',300000),...[1,2,3,4,5].map(i=>x('n'+i,'2026-10-2'+i,'메모'+i,10000))];
 await load(page,seed({tx}));
 await page.locator('#fmHomePlanSum').click();
 const rows=page.locator('#fmHomePlanRows');
 await expect(rows.locator('.fm-plan-nudge')).toContainText('다시 가져오면');
 await rows.locator('.fm-plan-hist summary').click();
 await expect(rows.locator('.fm-plan-hist th',{hasText:'8월'})).toHaveCount(1);
 await expect(rows.locator('.fm-plan-hist tr').nth(1).locator('td.ok')).toHaveCount(1);// 투자 300만 reached only in the 8/25 cycle
 // Directions saved (as after a re-import) remove the nudge.
 await page.evaluate(()=>{const d={};JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.forEach(t=>d[t.bankExcelKey]=-1);localStorage.setItem('firemate_xfer_dir_v1',JSON.stringify(d))});
 await page.reload();await page.locator('#fmHomePlanSum').click();
 await expect(page.locator('.fm-plan-nudge')).toHaveCount(0);
});

test('환율 효과 splits US holdings into 주가 and 환율 using the rate each holding was bought at',async({page})=>{
 await load(page,seed({holdings:[{id:'q',accountId:'a',ticker:'QLD',type:'USD',qty:100,price:120,cost:80}],balance:{fx:1380,cash:0,other:0,debt:0}}));
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 const card=page.locator('#fmFxCard');
 await expect(card).toContainText('추정');
 await card.locator('summary').click();
 await card.locator('[data-buyfx="q"]').fill('1300');await card.locator('[data-buyfx="q"]').blur();
 await expect(card.locator('.fm-fx-split')).toContainText('📈 주가로+₩5,520,000');
 await expect(card.locator('.fm-fx-split')).toContainText('💱 환율로+₩640,000');
 await expect(card.locator('.fm-fx-total')).toContainText('+₩6,160,000');
 await expect(card).not.toContainText('1년 평균으로 추정');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_buy_fx_v1')))).toEqual({q:1300});
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

test('FIRE shows how much of the planned living cost the last year of dividends covers, and when dividends alone would pay it',async({page})=>{
 const iso=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
 await page.route('**/dividends.json*',r=>r.fulfill({json:{symbols:{SCHD:{currency:'USD',events:[-300,-210,-120,-30].map(n=>({date:iso(n),amount:0.5}))}}}}));
 // 1,000주 × $2/년 × 1,400원 × 85% = 연 238만 → 월 약 19.8만 of 200만 = 10%.
 await load(page,seed({retirement:{items:[],monthly:200,yield:4,priceChange:0,crash:25},holdings:[{id:'h',ticker:'SCHD',name:'SCHD',type:'USD',qty:1000,price:27,avg:25}]}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireDiv')).toHaveText(/^💰 배당으로 생활비 10% 커버 · 월 ₩198,000 · 배당만으로 다 내는 건 \d{4}년쯤$/);
});

test('the analysis screen finds monthly bills by itself and shows which are still to come',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [0,1,2,3,4])tx.push({id:'kt'+k,date:m(k)+'-01',type:'expense',category:'통신',amount:95770,memo:'KT통신요금자동납부'});
 for(const k of [1,2,3])tx.push({id:'db'+k,date:m(k)+'-28',type:'expense',category:'보험',amount:69810,memo:'DB손'+(17000+k*101)});
 tx.push({id:'one',date:m(1)+'-15',type:'expense',category:'쇼핑',amount:300000,memo:'가전'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('insights'));
 const card=page.locator('#fmBillsCard');await expect(card).toBeVisible();
 await expect(page.locator('#fmBillsSum')).toHaveText('월 ₩165,580 · 2건 · 남은 ₩69,810');
 await expect(card.locator('.fm-bills-row').first()).toContainText('KT통신요금자동납부₩95,770✓ 1일 나감');
 await expect(card.locator('.fm-bills-row').nth(1)).toContainText('DB손₩69,810');
 await expect(card).not.toContainText('가전');
 await expect(page.locator('#fmBillsSubs')).toBeHidden();
 // The same unpaid bill shows inside the payday plan on home.
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#fmHomePlanRows')).toContainText('이번 달 아직 안 나간 고정비 ₩69,810 · DB손 28일');
});

test('small monthly bills are summed as subscriptions for the year, and the pace line names where the extra went',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [1,2,3])tx.push({id:'c'+k,date:m(k)+'-01',type:'expense',category:'쇼핑',amount:7890,memo:'쿠팡(와우멤버십)'},{id:'n'+k,date:m(k)+'-01',type:'expense',category:'쇼핑',amount:4900,memo:'네이버플러스멤버십'});
 tx.push({id:'f1',date:m(1)+'-01',type:'expense',category:'식비',amount:10000,memo:'점심'},{id:'f2',date:m(0)+'-01',type:'expense',category:'식비',amount:90000,memo:'회식'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmBillsSubs')).toHaveText(/^📺 구독 2건 · 1년 ₩153,480 · FIRE \+\d+일$/);
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#fmPaceLine')).toContainText('가장 늘어난 곳 식비 +₩80,000');
});

test('analysis shows the next three months from recent income, spending, the payday plan and last year\'s one-off bills',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [-1,-2,-3])tx.push({id:'s'+k,date:m(k)+'-25',type:'income',category:'급여',amount:3000000,memo:'급여'},{id:'e'+k,date:m(k)+'-10',type:'expense',category:'식비',amount:1000000,memo:'생활'});
 tx.push({id:'car',date:m(-11)+'-05',type:'expense',category:'보험',amount:800000,memo:'자동차보험'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('insights'));
 const rows=page.locator('#fmOutlookCard .fm-outlook-row');await expect(rows).toHaveCount(3);
 await expect(rows.first()).toContainText('남는 돈 +120만원');
 await expect(rows.first()).toContainText('작년 이맘때 자동차보험 80만');
 await expect(rows.nth(1)).toContainText('남는 돈 +200만원');
});

test('spending over the budget is also shown as how many days later FIRE comes',async({page})=>{
 const day=new Date().toISOString().slice(0,10);
 await load(page,seed({budgets:{[day.slice(0,7)]:100000},tx:[{id:'x',date:day,type:'expense',category:'쇼핑',amount:200000,memo:'옷'}]}));
 await expect(page.locator('#fmPaceLine')).toContainText(/예산 넘은 ₩100,000은 FIRE \+\d+일/);
});

test('a different purchase at a bill\'s shop is not counted as the bill, and last year\'s trips are not expected again',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [-1,-2,-3,-4])tx.push({id:'k'+k,date:m(k)+'-01',type:'expense',category:'쇼핑',amount:3900,memo:'주식회사 카카오'},{id:'s'+k,date:m(k)+'-25',type:'income',category:'급여',amount:3000000,memo:'급여'});
 tx.push({id:'big',date:m(0)+'-20',type:'expense',category:'쇼핑',amount:25000,memo:'주식회사 카카오'},{id:'air',date:m(-11)+'-05',type:'expense',category:'여행',amount:400000,memo:'대한항공'},{id:'car',date:m(-11)+'-06',type:'expense',category:'보험',amount:600000,memo:'DB손해보험 자동차'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('insights'));
 const row=page.locator('#fmBillsCard .fm-bills-row').first();
 await expect(row).toContainText('₩3,900');await expect(row).toContainText('아직 안 나감');
 // A bill whose amount changed this month (one payment on its usual day) still counts as paid.
 await page.evaluate(()=>{const d=window.fmLiveData(),m=new Date().toISOString().slice(0,7);d.tx=d.tx.filter(t=>t.id!=='big');d.tx.push({id:'up',date:m+'-02',type:'expense',category:'쇼핑',amount:9900,memo:'주식회사 카카오'});window.fmGo('home');window.fmGo('insights')});
 await expect(row).toContainText('₩9,900');await expect(row).toContainText('✓ 2일 나감');
 const out=page.locator('#fmOutlookCard .fm-outlook-row').first();
 await expect(out).toContainText('DB손해보험');await expect(out).not.toContainText('대한항공');
});

test('FIRE shows the savings rate of recent payday cycles',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [-1,-2,-3])tx.push({id:'s'+k,date:m(k)+'-25',type:'income',category:'급여',amount:4000000,memo:'급여'},{id:'e'+k,date:m(k)+'-27',type:'expense',category:'식비',amount:1000000,memo:'생활'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireSave')).toHaveText(/^💪 저축률 지난 월급 주기 75%( · \d번 평균 \d+%)?$/);
});

test('home flags an unusually large payment once, and the ledger shows 월급 전 instead of a loss before payday',async({page})=>{
 const day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10),tx=[];
 for(let i=10;i<40;i+=5)tx.push({id:'f'+i,date:day(i),type:'expense',category:'식비',amount:20000,memo:'점심'});
 tx.push({id:'big',date:day(1),type:'expense',category:'식비',amount:180000,memo:'오마카세'});tx.push({id:'t0',date:day(0),type:'expense',category:'카페·간식',amount:4500,memo:'커피'});
 await load(page,seed({tx}));
 const line=page.locator('#fmHomeAlert');await expect(line).toBeVisible();
 await expect(line).toContainText('오마카세 ₩180,000 · 식비 평소의 9배');
 await line.click();await expect(page.locator('#entryOverlay')).toBeVisible();
 await page.reload();await expect(page.locator('#fmHomeAlert')).toBeHidden();
 await page.evaluate(()=>window.fmGo('calendar'));await expect(page.locator('#fmCalendarSaved')).toContainText('월급 전');
});

test('analysis shows how many days sooner FIRE comes if a big category is cut by 20%',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [1,2,3])tx.push({id:'s'+k,date:m(k)+'-05',type:'expense',category:'쇼핑',amount:300000,memo:'옷'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('insights'));
 const row=page.locator('#fmTrimCard .fm-trim-row');await expect(row).toHaveCount(1);
 await expect(row).toContainText(/쇼핑 20% 줄이면FIRE \d+일 앞당김월 ₩60,000 · 1년 ₩720,000/);
});

test('analysis shows a no-spend grass for 26 weeks with the current and best streaks',async({page})=>{
 const day=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)};
 // Spending 10 and 5 days ago only: days 9–6 are free (4), and today with the 4 days before is a 5-day streak.
 await load(page,seed({tx:[{id:'a',date:day(10),type:'expense',category:'식비',amount:9000,memo:'점심'},{id:'b',date:day(5),type:'expense',category:'식비',amount:9000,memo:'점심'}]}));
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmGrassCard')).toBeVisible();
 await expect(page.locator('#fmGrass i.free')).toHaveCount(9);
 await expect(page.locator('#fmGrassStat')).toContainText('지금 연속 5일 🔥 최고 기록 · 최장 5일');
 await expect(page.locator('#fmGrassSum')).toContainText('지금 연속 5일');
});

test('the net worth chart marks salary and big payments and explains the biggest day moves',async({page})=>{
 const day=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)},snaps=[];
 for(let i=20;i>=1;i--)snaps.push({day:day(i),amount:100000000+(i<=10?3000000:0)});
 await load(page,seed({dailySnapshots:snaps,tx:[{id:'s',date:day(10),type:'income',category:'급여',amount:3000000,memo:'급여'}]}));
 await page.evaluate(()=>{window.fmGo('assets');const s=document.getElementById('assetChartPeriod');s.value='30';s.dispatchEvent(new Event('change'))});
 await expect(page.locator('#assetGrowthChart .fm-growth-ev')).toHaveCount(1);
 await expect(page.locator('#assetGrowthChart .fm-growth-moves')).toContainText('+₩3,000,000💼 월급 ₩3,000,000');
});

const payOf=(y,m)=>{const d=new Date(y,m,Math.min(25,new Date(y,m+1,0).getDate())),w=d.getDay();if(w===6)d.setDate(d.getDate()-1);if(w===0)d.setDate(d.getDate()-2);return d};
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
test('analysis shows where the last payday\'s money went',async({page})=>{
 const n=new Date();n.setHours(0,0,0,0);let s=payOf(n.getFullYear(),n.getMonth());if(s>n)s=payOf(n.getFullYear(),n.getMonth()-1);const ps=payOf(s.getFullYear(),s.getMonth()-1),d=k=>{const x=new Date(ps);x.setDate(x.getDate()+k);return ymd(x)};
 await load(page,seed({tx:[{id:'i',date:d(0),type:'income',category:'급여',amount:3000000,memo:'급여'},{id:'v',date:d(1),type:'transfer',category:'투자',amount:1000000,memo:'NH투자증권'},{id:'e',date:d(2),type:'expense',category:'식비',amount:500000,memo:'장보기'}]}));
 await page.evaluate(()=>window.fmGo('insights'));
 const list=page.locator('#fmFlowList');
 await expect(list).toContainText('💰 투자₩1,000,000');await expect(list).toContainText('🛒 생활비₩500,000');await expect(list).toContainText('✨ 남은 돈₩1,500,000');
 await expect(page.locator('#fmFlowHead')).toContainText('들어온 돈 ₩3,000,000');
});

test('a card\'s 실적 기준 shows how much is left this month',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await load(page,seed({tx:[{id:'c',date:m+'-01',type:'expense',category:'식비',amount:120000,memo:'마트',bankExcelKey:[m+'-01','10:00','expense','식비','','마트',120000,'KB국민카드'].join('|')}]}));
 await page.evaluate(()=>window.fmGo('insights'));
 const row=page.locator('#fmCardCard .fm-cardp').first();await expect(row).toContainText('KB국민카드₩120,000');
 await row.locator('button').first().click();await row.locator('input').first().fill('30');await row.locator('form button').click();
 await expect(page.locator('#fmCardCard .fm-cardp').first()).toContainText('실적까지 ₩180,000 남음');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_card_goal_v1')))).toEqual({'KB국민카드':300000});
});

test('FIRE estimates the actual yearly return from net worth records minus savings',async({page})=>{
 const day=k=>{const d=new Date();d.setDate(d.getDate()-k);return d.toISOString().slice(0,10)};
 // Today's record is the live net worth: 1억 investing + 1,000만 cash.
 await load(page,seed({accounts:[{id:'a',name:'투자',kind:'investment',amount:100000000,fire:true}],dailySnapshots:[{day:day(100),amount:100000000},{day:day(0),amount:110000000}],tx:[{id:'i',date:day(50),type:'income',category:'급여',amount:5000000,memo:'급여'}]}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireReal')).toHaveText(/^📊 실제 수익률 연 19\.\d% \(순자산 기준 추정, 최근 100일\) · 계획 7% → 이대로면 FIRE \d+년 \d+개월 빨라요$/);
});

test('살까 말까 shows a price against FIRE days, this month\'s budget and ten years invested',async({page})=>{
 const m=new Date().toISOString().slice(0,7);
 await page.addInitScript(()=>localStorage.setItem('firemate_wishlist_v1',JSON.stringify({list:[]})));
 await load(page,seed({budgets:{[m]:1000000}}));
 await page.evaluate(()=>document.getElementById('fmWishOpen').click());
 await page.locator('#fmBuyIn').fill('300000');await page.locator('#fmBuyForm button').click();
 const out=page.locator('#fmBuyOut');
 await expect(out).toContainText('₩300,000을 쓰면');
 await expect(out).toContainText(/⏳ FIRE\+\d+일 늦어져요/);
 await expect(out).toContainText('🧾 이번 달 예산사도 ₩700,000 남아요');
 await expect(out).toContainText(/📈 (S&P500|투자)에 10년 두면약 ₩[\d,]+/);
});

test('the money health check grades 비상금, leverage, dollar share, the biggest holding and debt',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)};
 await load(page,seed({balance:{fx:1000,cash:3000000,other:0,debt:0},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],holdings:[{id:'q',accountId:'a',ticker:'QLD',name:'QLD',type:'USD',qty:10,price:100,cost:90},{id:'s',accountId:'a',ticker:'SCHD',name:'SCHD',type:'USD',qty:30,price:100,cost:90}],tx:[1,2,3].map(k=>({id:'e'+k,date:m(k)+'-10',type:'expense',category:'식비',amount:1000000,memo:'생활'}))}));
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 const list=page.locator('#fmHealthList');
 await expect(list).toContainText('🟡비상금3.0개월치');
 await expect(list).toContainText('🟡레버리지 비중25%');
 await expect(list).toContainText('🟡달러 자산100%');
 await expect(list).toContainText('🔴가장 큰 종목SCHD 75%');
 await expect(list).toContainText('🟢부채없음');
});

test('today\'s notice pops up once a day on the first open and names a bill that comes out tomorrow',async({page})=>{
 await page.addInitScript(()=>{window.__fmBriefTest=true});
 const t=new Date();t.setDate(t.getDate()+1);test.skip(t.getDate()===1,'tomorrow is in the next month');
 const day=String(t.getDate()).padStart(2,'0'),m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)};
 await load(page,seed({tx:[1,2,3,4].map(k=>({id:'b'+k,date:m(k)+'-'+day,type:'expense',category:'통신',amount:95770,memo:'KT통신요금자동납부'}))}));
 const pop=page.locator('.fm-brief-pop');await expect(pop).toContainText('☀️ 오늘 알아 둘 것');await expect(pop).toContainText('🔁 KT통신요금자동납부 ₩95,770 내일 출금');await expect(pop).toContainText('💾 아직 백업한 적 없어요');
 await pop.locator('button').click();await expect(pop).toHaveCount(0);
 await page.evaluate(()=>window.fmGo('assets'));await page.evaluate(()=>window.fmGo('home'));await expect(page.locator('.fm-brief-pop')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_brief_seen_v1'))).toBe(await page.evaluate(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));
});

test('money a friend sends back for a shared meal lowers that payment to my share, and 되돌리기 restores it',async({page})=>{
 const n=new Date();n.setHours(0,0,0,0);let s=payOf(n.getFullYear(),n.getMonth());if(s>n)s=payOf(n.getFullYear(),n.getMonth()-1);const ps=payOf(s.getFullYear(),s.getMonth()-1),d=k=>{const x=new Date(ps);x.setDate(x.getDate()+k);return ymd(x)};
 const key=[d(3),'12:00','transfer','이체','','홍길동',10000,'카카오페이 머니'].join('|');
 await page.addInitScript(k=>localStorage.setItem('firemate_xfer_dir_v1',JSON.stringify({[k]:1})),key);
 await load(page,seed({tx:[{id:'i',date:d(0),type:'income',category:'급여',amount:3000000,memo:'급여'},{id:'e',date:d(2),type:'expense',category:'식비',amount:40000,memo:'고깃집'},{id:'x',date:d(3),type:'transfer',category:'계좌 이체',amount:10000,memo:'홍길동',bankExcelKey:key}]}));
 await expect.poll(async()=>(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')))).tx.find(t=>t.id==='e').amount).toBe(30000);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));
 expect(saved.tx.find(t=>t.id==='e').splitFrom).toBe(40000);expect(saved.tx.find(t=>t.id==='x').category).toBe('정산');
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmSplitNote')).toContainText('🤝 더치페이로 돌려받은 1건(₩10,000)은 내 몫만 지출로 셌어요');
 await page.locator('#fmSplitUndo').click();
 await expect.poll(async()=>(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')))).tx.find(t=>t.id==='e').amount).toBe(40000);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_split_off_v1'))).toBe('1');
});

test('the edit sheet shows how often and how much I spent at that shop this year',async({page})=>{
 const day=new Date().toISOString().slice(0,10);
 await load(page,seed({tx:[{id:'a',date:day,type:'expense',category:'카페·간식',amount:5000,memo:'스타벅스강남점'},{id:'b',date:day,type:'expense',category:'카페·간식',amount:6000,memo:'스타벅스 역삼점'},{id:'c',date:day,type:'expense',category:'식비',amount:9000,memo:'김밥천국'}]}));
 await page.evaluate(()=>window.fmOpenEntry(window.fmLiveData().tx.find(t=>t.id==='a')));
 await expect(page.locator('#entryShop')).toContainText('🏪 이 가게 올해 2번 · ₩11,000');
 await page.evaluate(()=>window.fmOpenEntry(window.fmLiveData().tx.find(t=>t.id==='c')));
 await expect(page.locator('#entryShop')).toBeHidden();
});

test('FIRE points out a raise and what saving half of it does',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)};
 await load(page,seed({tx:[3,2,1,0].map(k=>({id:'s'+k,date:m(k)+'-01',type:'income',category:'급여',amount:k?3000000:3300000,memo:'급여'}))}));
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireRaise')).toHaveText(/^💼 월급이 \+10% \(₩300,000\) 늘었어요 · 절반인 월 15만 원을 더 모으면 FIRE \d+개월 빨라져요 ›$/);
});

test('a card\'s 결제일 shows the next card bill from last month\'s use',async({page})=>{
 const n=new Date(),pm=new Date(n.getFullYear(),n.getMonth()-1,5),cm=new Date(n.getFullYear(),n.getMonth(),1),ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 const tx=(id,d,a)=>({id,date:d,type:'expense',category:'식비',amount:a,memo:'마트',bankExcelKey:[d,'10:00','expense','식비','','마트',a,'KB국민카드'].join('|')});
 // Pay day 28 (or later in the month) keeps the bill in this month: last month's use is due.
 await page.addInitScript(()=>localStorage.setItem('firemate_card_day_v1',JSON.stringify({'KB국민카드':28})));
 await load(page,seed({tx:[tx('p',ym(pm)+'-05',200000),tx('c',ym(cm)+'-01',50000)]}));
 await page.evaluate(()=>window.fmGo('insights'));
 const due=n.getDate()<=28?new Date(n.getFullYear(),n.getMonth(),28):new Date(n.getFullYear(),n.getMonth()+1,28),amount=n.getDate()<=28?'₩200,000':'₩50,000';
 await expect(page.locator('#fmCardCard .fm-cardbill')).toContainText('🗓️ 다음 카드값 '+amount);
 await expect(page.locator('#fmCardCard .fm-cardbill')).toContainText((due.getMonth()+1)+'/28 출금');
});

test('a trip sums the spending between two days without bills',async({page})=>{
 const d=k=>{const x=new Date();x.setDate(x.getDate()-k);return x.toISOString().slice(0,10)};
 await load(page,seed({tx:[{id:'a',date:d(5),type:'expense',category:'여행',amount:300000,memo:'호텔'},{id:'b',date:d(4),type:'expense',category:'식비',amount:80000,memo:'흑돼지'},{id:'c',date:d(9),type:'expense',category:'식비',amount:9000,memo:'점심'}]}));
 await page.evaluate(()=>window.fmGo('insights'));
 await page.locator('#fmTripCard > summary').click();
 await page.locator('#fmTripName').fill('제주 여행');await page.locator('#fmTripFrom').fill(d(5));await page.locator('#fmTripTo').fill(d(3));await page.locator('#fmTripForm button').click();
 const row=page.locator('#fmTripList .fm-trip');await expect(row).toHaveCount(1);
 await expect(row).toContainText('제주 여행');await expect(row).toContainText('3일');await expect(row).toContainText('₩380,000');await expect(row).toContainText('여행 30만 · 식비 8만 · 하루');
 await expect(page.locator('#fmTripSum')).toHaveText('제주 여행 38만원');
});

test('dutch-pay pairs saved under the old loose rule go back to the full amount',async({page})=>{
 const d=new Date().toISOString().slice(0,10);
 await page.addInitScript(()=>localStorage.setItem('firemate_split_v1',JSON.stringify([{e:'taxi',x:'in',a:9350,cat:'계좌 이체'}])));
 await load(page,seed({tx:[{id:'taxi',date:d,type:'expense',category:'교통',amount:1250,splitFrom:10600,memo:'택시'},{id:'in',date:d,type:'transfer',category:'정산',amount:9350,memo:'친구'}]}));
 await expect.poll(async()=>(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')))).tx.find(t=>t.id==='taxi').amount).toBe(10600);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));
 expect(saved.tx.find(t=>t.id==='taxi').splitFrom).toBeUndefined();expect(saved.tx.find(t=>t.id==='in').category).toBe('계좌 이체');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_split_v1'))).toBe('[]');
});

test('home lines can be hidden from settings and the category budget fills from the 3-month average',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)};
 await load(page,seed({tx:[1,2,3].map(k=>({id:'f'+k,date:m(k)+'-10',type:'expense',category:'식비',amount:[0,300000,350000,400000][k],memo:'밥'}))}));
 await expect(page.locator('#view-home .fm-home-fire')).toBeVisible();
 await page.evaluate(()=>{const c=document.querySelector('[data-home-line="fire"]');c.checked=false;c.dispatchEvent(new Event('change'))});
 await expect(page.locator('#view-home .fm-home-fire')).toBeHidden();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_home_hide_v1')))).toEqual(['fire']);
 await page.evaluate(()=>window.fmGo('insights'));
 await page.locator('#fmCatBudgetEdit > summary').click();await page.locator('#fmCatBudgetAuto').click();
 await expect(page.locator('#fmCatB-식비')).toHaveValue('350,000');
});

test('insurance shows the monthly premium from the ledger against salary',async({page})=>{
 const m=k=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)},tx=[];
 for(const k of [1,2,3])tx.push({id:'i'+k,date:m(k)+'-05',type:'expense',category:'보험',amount:100000,memo:'DB손17101'},{id:'s'+k,date:m(k)+'-25',type:'income',category:'급여',amount:4000000,memo:'급여'});
 await load(page,seed({tx}));
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 await expect(page.locator('#fmInsSum')).toHaveText('월 10만원 · 월급의 2.5%');
 await page.locator('#fmInsCard>summary').click();
 await expect(page.locator('#fmInsList')).toContainText('💸 보험료월 ₩100,0001년 ₩1,200,000 · 월급의 2.5% · 최근 3달 평균');
});

test('#tags in memos are totalled for the year and open the search',async({page})=>{
 const d=new Date().toISOString().slice(0,10);
 await load(page,seed({tx:[{id:'a',date:d,type:'expense',category:'여행',amount:300000,memo:'호텔 #제주'},{id:'b',date:d,type:'expense',category:'식비',amount:50000,memo:'흑돼지 #제주 #가족'},{id:'c',date:d,type:'expense',category:'식비',amount:9000,memo:'점심'}]}));
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmTagSum')).toHaveText('#제주 35만 · #가족 5만');
 await page.locator('#fmTagCard>summary').click();await page.locator('[data-tag="제주"]').click();
 await expect(page.locator('#view-history')).toHaveClass(/active/);
 expect((await page.locator('#historyList [data-edit]').evaluateAll(l=>l.map(e=>e.dataset.edit))).sort()).toEqual(['a','b']);
});

test('with a fresh Gmail sign-in the BankSalad mail is fetched once a day on open',async({page})=>{
 await page.addInitScript(()=>{window.__fmAutoGmailTest=true;localStorage.setItem('firemate_gmail_token_v1',JSON.stringify({token:'qa-token',exp:Date.now()+3600000}))});
 await load(page,seed());
 await page.evaluate(()=>{window.fmImportFromHome=()=>{window.__fetched=(window.__fetched||0)+1}});
 await expect.poll(()=>page.evaluate(()=>window.__fetched||0),{timeout:6000}).toBe(1);
 const day=await page.evaluate(()=>localStorage.getItem('firemate_auto_gmail_day_v1'));expect(day).toMatch(/^\d{4}-\d\d-\d\d$/);
 await page.reload();await page.evaluate(()=>{window.fmImportFromHome=()=>{window.__fetched=(window.__fetched||0)+1}});await page.waitForTimeout(3500);
 expect(await page.evaluate(()=>window.__fetched||0)).toBe(0);
});

test('data storage shows how full it is and one place to undo what the app changed by itself',async({page})=>{
 const d=new Date().toISOString().slice(0,10);
 await page.addInitScript(d=>localStorage.setItem('firemate_dup_backup_v1',JSON.stringify([{id:'dup1',date:d,type:'expense',category:'식비',amount:7000,memo:'김밥'}])),d);
 await load(page,seed({tx:[{id:'a',date:d,type:'expense',category:'식비',amount:7000,memo:'김밥'}]}));
 await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click();
 await expect(page.locator('#fmStorageUse')).toContainText(/저장 공간 \d+% 사용/);
 await page.locator('#fmAutoLog>summary').click();
 await expect(page.locator('#fmAutoLogList')).toContainText('🧹 두 번 찍힌 같은 결제 정리1건');
 await page.locator('[data-autolog="dup"]').click();await page.locator('#fmAskOk').click();
 await expect.poll(async()=>(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')))).tx.map(t=>t.id).sort()).toEqual(['a','dup1']);
 await expect(page.locator('#fmAutoLogList')).toContainText('아직 자동으로 바꾼 게 없어요');
});

test('the analysis screen splits into 요약 · 돈 흐름 · 더 보기',async({page})=>{
 await load(page,seed());
 await page.evaluate(()=>window.fmGo('insights'));
 const month=page.locator('#view-insights [data-part="sum"]').first(),trip=page.locator('#fmTripCard');
 await expect(month).toBeVisible();await expect(trip).toBeVisible();
 await page.locator('button[data-ins-part="more"]').click();
 await expect(month).toBeHidden();await expect(trip).toBeVisible();await expect(page.locator('button[data-ins-part="more"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('button[data-ins-part="sum"]').click();await expect(month).toBeVisible();await expect(trip).toBeHidden();
});

test('old transactions are packed into a compressed archive and come back after reload',async({page})=>{
 const y=new Date().getFullYear(),d=new Date().toISOString().slice(0,10);
 const tx=[{id:'old1',date:(y-3)+'-05-02',type:'expense',category:'식비',amount:7000,memo:'김밥 한 줄'},{id:'last',date:(y-1)+'-02-01',type:'expense',category:'교통',amount:1500,memo:'버스'},{id:'now',date:d,type:'expense',category:'카페·간식',amount:4500,memo:'커피'}];
 await page.addInitScript(s=>{window.__fmArcAt=1;if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},seed({tx}));
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('history'));
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.map(t=>t.id).sort())).toEqual(['last','now']);
 expect(await page.evaluate(()=>!!localStorage.getItem('firemate_tx_archive_v1'))).toBe(true);
 await page.reload();
 expect(await page.evaluate(()=>window.fmLiveData().tx.map(t=>t.id).sort())).toEqual(['last','now','old1']);
 expect(await page.evaluate(()=>window.fmLiveData().tx.find(t=>t.id==='old1').memo)).toBe('김밥 한 줄');
 await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click();
 await expect(page.locator('#fmStorageUse')).toContainText('오래된 거래 1건은 압축해 보관 중');
});

test('when the browser storage is full the old transactions are packed instead of failing',async({page})=>{
 const y=new Date().getFullYear();
 const tx=Array.from({length:40},(_,i)=>({id:'o'+i,date:(y-4)+'-03-'+String(1+i%28).padStart(2,'0'),type:'expense',category:'식비',amount:1000+i,memo:'점심 식사 '+i}));
 await page.addInitScript(s=>{localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify(s));const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='firemate_smart_v3'&&String(v).length>JSON.stringify(s).length-500){const e=new Error('full');e.name='QuotaExceededError';throw e}return set.call(this,k,v)}},seed({tx}));
 await page.goto('/index.html');
 await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('firemate_tx_archive_v1'))).toBe(true);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length)).toBe(0);
 expect(await page.evaluate(()=>window.fmLiveData().tx.length)).toBe(40);
});

test('days without a net worth record are estimated from the holdings prices and drawn dashed',async({page})=>{
 const day=k=>{const d=new Date();d.setDate(d.getDate()-k);return d.toISOString().slice(0,10)};
 await load(page,seed({accounts:[{id:'a',name:'투자',kind:'investment',amount:0,fire:true}],holdings:[{id:'h1',accountId:'a',ticker:'ABSI',name:'ABSI',type:'USD',qty:1000,price:3,cost:3}],balance:{fx:1400,cash:10000000,other:0,debt:0},dailySnapshots:[{day:day(30),amount:14000000}]}));
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#assetGrowthChart .fm-growth-est')).toHaveCount(1);
 await expect(page.locator('#assetGrowthChart')).toContainText('점선은 시세로 추정');
 expect(await page.evaluate(()=>window.fmLiveData().dailySnapshots.length)).toBe(2);
 await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireReal')).toContainText('보유 종목 시세로 추정');
});

test('the card card shows the 연말정산 25% threshold and when 체크카드 starts to pay more',async({page})=>{
 const n=new Date();test.skip(n.getMonth()<3,'needs three paydays this year');
 const y=n.getFullYear(),m=n.toISOString().slice(0,7),key=(d,a)=>[d,'10:00','expense','쇼핑','','백화점',a,'현대카드'].join('|');
 const pay=[1,2,3].map(k=>({id:'p'+k,date:y+'-0'+k+'-25',type:'income',category:'급여',amount:3400000,memo:'급여'}));
 await load(page,seed({tx:[...pay,{id:'c',date:m+'-01',type:'expense',category:'쇼핑',amount:13000000,memo:'백화점',bankExcelKey:key(m+'-01',13000000)}]}));
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmCardCard .fm-cardtax')).toHaveText(/^🧾 연말정산 카드 공제 문턱 1,200만.* \(총급여 25% 추정\) · 넘었어요 → 남은 결제는 체크카드·현금이 공제 2배$/);
});

test('errors on the phone are kept, shown in 내 데이터 보관 and carried in the backup',async({page})=>{
 await load(page,seed());
 await page.evaluate(()=>{setTimeout(()=>{throw new Error('qa boom')});setTimeout(()=>{throw new Error('qa boom')},10)});
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_errlog_v1')||'null')?.list?.[0]?.n)).toBe(2);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_errlog_v1')).list[0].msg)).toContain('qa boom');
 await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click();
 await expect(page.locator('#fmStorageUse')).toContainText('🐞 최근 오류 1가지');
 const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 const backup=JSON.parse(require('fs').readFileSync(await dl.path(),'utf8'));
 expect(backup.extras.firemate_errlog_v1.list[0].msg).toContain('qa boom');
});

test('the calendar shows money expected on coming days: bills not yet out',async({page})=>{
 await page.clock.install({time:new Date('2026-10-10T09:00:00')});
 await load(page,seed({tx:['06','07','08','09'].map(k=>({id:'b'+k,date:'2026-'+k+'-12',type:'expense',category:'통신·구독',amount:17000,memo:'넷플릭스'}))}));
 await page.evaluate(()=>window.fmGo('calendar'));
 const cell=page.locator('#cal [data-date="2026-10-12"]');
 await expect(cell.locator('.fm-cal-plan')).toHaveText('-1.7만');
 await expect(page.locator('#cal [data-date="2026-10-09"] .fm-cal-plan')).toHaveCount(0);
 await cell.click();
 await expect(page.locator('#dayTx .fm-day-plan')).toContainText('🔁 넷플릭스 ₩17,000');
});

test('with debt the health check asks its interest rate and says whether to repay or invest first',async({page})=>{
 await load(page,seed({balance:{fx:1400,cash:10000000,other:0,debt:20000000}}));
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 const box=page.locator('#fmDebtForm');
 await expect(box).toContainText('대출 이자율을 넣으면');
 await page.locator('#fmDebtRate').fill('6.5');await box.locator('button').click();
 await expect(page.locator('#fmDebtForm p')).toHaveText('💳 대출 이자 6.5% (연 130만원) vs 계획 수익률 7% → 남는 돈은 갚기 먼저');
 await page.locator('#fmDebtRate').fill('3');await page.locator('#fmDebtForm button').click();
 await expect(page.locator('#fmDebtForm p')).toContainText('남는 돈은 투자가 유리');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_debt_rate_v1')))).toEqual({rate:3});
});

test('today\'s notice names a fixed bill that just came out higher than before',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T09:00:00')});
 await page.addInitScript(()=>{window.__fmBriefTest=true;localStorage.setItem('firemate_last_backup_v1',new Date().toISOString())});
 await load(page,seed({tx:[...['06','07','08','09'].map(k=>({id:'n'+k,date:'2026-'+k+'-12',type:'expense',category:'통신·구독',amount:13500,memo:'넷플릭스'})),{id:'now',date:'2026-10-12',type:'expense',category:'통신·구독',amount:17000,memo:'넷플릭스'}]}));
 await expect(page.locator('.fm-brief-pop')).toContainText('📈 넷플릭스 13,500 → 17,000원으로 올랐어요');
});

test('the asset hero names its bases: today\'s % is of the shown total, 투자 수익률 is of the money put in',async({page})=>{
 const at=new Date().toISOString();
 await load(page,seed({balance:{fx:1000,cash:8000000,other:0,debt:0},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],holdings:[{id:'h',accountId:'a',ticker:'111111',name:'종목',type:'KRW',qty:10,price:200000,cost:100000,dayChangePct:-50,dayChangeAt:at,quoteAt:at}]}));
 await page.evaluate(()=>window.fmGo('assets'));
 // Total ₩10,000,000 after a −₩2,000,000 day: −16.67% of yesterday's ₩12,000,000 (not −50% of the stock).
 await expect(page.locator('#fmTodayPL')).toHaveText('오늘 시세 변동−₩2,000,000 (-16.67%)');
 await expect(page.locator('#investReturnPct')).toHaveText('+100.00%');
 await expect(page.locator('.fm-unified-hero')).toContainText('투자 수익률');
});

test('two accounts with nearly the same money are flagged as possibly entered twice',async({page})=>{
 await load(page,seed({balance:{fx:1400,cash:0,other:0,debt:0},accounts:[{id:'a',name:'ISA',kind:'investment',amount:9937188,fire:true},{id:'b',name:'기타 자산',kind:'physical',amount:9940000,fire:true},{id:'c',name:'예금',kind:'safe',amount:3000000,fire:true}]}));
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#fmDupWarn')).toHaveText('⚠️ ISA · 기타 자산 금액이 거의 같아요(994만원). 같은 돈이면 한쪽을 지워야 순자산이 맞아요');
});
