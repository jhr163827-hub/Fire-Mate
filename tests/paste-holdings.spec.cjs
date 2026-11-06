const {test,expect}=require('@playwright/test');
// 📋 증권사 잔고 붙여넣기 · ⏳ 배당 자료 늦음 · 연간 결산 여행·배당 추정
const seed={theme:'dark',rec:[],budgets:{},tx:[],accounts:[],balance:{cash:0,fx:1400,debt:0},fire:{monthly:100,rate:7,goal:100000,asset:0},
 holdings:[{id:'s',ticker:'SCHD',name:'SCHD',type:'USD',qty:100,cost:26,price:28},{id:'j',ticker:'JEPQ',name:'JEPQ',type:'USD',qty:50,cost:52,price:55},{id:'t',ticker:'360750',name:'TIGER 미국S&P500',type:'KRW',qty:200,cost:18000,price:21000}]};
const feed={updatedAt:'2026-11-05T02:00:00+00:00',symbols:{JEPQ:{currency:'USD',events:[{date:'2026-08-03',amount:.5},{date:'2026-09-01',amount:.5},{date:'2026-10-01',amount:.5}]},SCHD:{currency:'USD',events:[{date:'2026-03-25',amount:.25},{date:'2026-06-24',amount:.26},{date:'2026-09-23',amount:.26}]}}};
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+09:00'));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.route(/dividends\.json/,route=>route.fulfill({json:feed}));
 await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},seed);
});
const holdings=async page=>{await page.goto('/index.html');await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickHoldings').click();await page.locator('#fmHoldPaste > summary').click()};

test('pasting a broker balance previews and applies quantity and average cost, and undo puts them back',async({page})=>{
 await holdings(page);
 await page.locator('#fmHoldPasteIn').fill('내 주식\nSCHD\n슈와브 미국 배당\n120주\n평균 $27.10\n평가금 4,704,000원\nJEPQ 50주 평균 52.00\nTIGER 미국S&P500\n보유수량 250\n평균단가 18,500원\nQQQ 3주');
 const prev=page.locator('#fmHoldPastePrev');
 await expect(prev).toContainText('SCHD 100 → 120주 · 평단 $26.00 → $27.10');
 await expect(prev).toContainText('TIGER 미국S&P500 200 → 250주 · 평단 ₩18,000 → ₩18,500');
 await expect(prev).not.toContainText('JEPQ');// 같은 값은 그대로
 await page.locator('#fmHoldPasteApply').click();await page.locator('#fmAskOk').click();
 await expect.poll(()=>page.evaluate(()=>window.fmLiveData().holdings.map(h=>h.qty+'@'+h.cost).join(' '))).toBe('120@27.1 50@52 250@18500');
 await expect(page.locator('#fmHoldPasteUndo')).toBeVisible();
 await page.locator('#fmHoldPasteUndo').click();await page.locator('#fmAskOk').click();
 await expect.poll(()=>page.evaluate(()=>window.fmLiveData().holdings.map(h=>h.qty+'@'+h.cost).join(' '))).toBe('100@26 50@52 200@18000');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('a Korean ETF name from the broker app finds the US ticker',async({page})=>{
 await holdings(page);
 await page.locator('#fmHoldPasteIn').fill('슈와브 미국 배당 다우존스\n110주\n평균 26.50달러\nJP모건 나스닥 프리미엄 인컴\n60주\n평균 $53.00');
 await expect(page.locator('#fmHoldPastePrev')).toContainText('SCHD 100 → 110주 · 평단 $26.00 → $26.50');
 await expect(page.locator('#fmHoldPastePrev')).toContainText('JEPQ 50 → 60주 · 평단 $52.00 → $53.00');
});

test('a won average for a US stock is not taken as dollars',async({page})=>{
 await holdings(page);
 await page.locator('#fmHoldPasteIn').fill('SCHD 100주\n평균 36,400원');
 await expect(page.locator('#fmHoldPastePrev')).toContainText('바뀔 종목이 없어요');
 await expect(page.locator('#fmHoldPasteApply')).toBeDisabled();
});

test('the dividend tab says when a held stock\'s dividend is late in the feed',async({page})=>{
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickDividend').click();
 // JEPQ: 10/1 다음은 11/1쯤 → 11/6에도 없음. SCHD는 12월이라 아직.
 await expect(page.locator('#fmDivLate')).toContainText('JEPQ 11월 1일쯤 배당이 아직 자료에 없어요');
 await expect(page.locator('#fmDivLate')).not.toContainText('SCHD');
});

test('the year report adds estimated broker dividends and this year\'s trips',async({page})=>{
 await page.addInitScript(()=>{window.__fmYearAnyDay=true;localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'a',name:'부산',from:'2026-05-01',to:'2026-05-03'},{id:'b',name:'제주',from:'2025-05-01',to:'2025-05-03'}]));localStorage.setItem('firemate_travel_spots_v1',JSON.stringify([{id:'p',lat:35.1,lon:129,d:'2026-05-02'}]))});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickDividend').click();await expect(page.locator('#fmDivStatus')).toContainText('자료');
 await page.evaluate(()=>window.fmGo('monthly'));await page.locator('#fmYearToggle').click();
 const c=page.locator('#fmMonthlyContent');
 // JEPQ 0.5×50×3번 + SCHD (0.25+0.26+0.26)×100 = 152달러 × 1400 × 85%
 await expect(c).toContainText('증권사 배당 ₩180,880 추정');
 await expect(c).toContainText('✈️ 여행1번📍 발자국 1곳');
});
