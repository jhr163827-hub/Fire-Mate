const {test,expect}=require('@playwright/test');
// 🎯 리밸런싱 · 🧾 해외주식 양도세 · 📈 적립식 시뮬레이터
const seed={theme:'dark',rec:[],budgets:{},tx:[],accounts:[],balance:{cash:1000000,fx:1400,debt:0},fire:{monthly:100,rate:7,goal:100000,asset:0},
 holdings:[{id:'q',ticker:'QQQ',name:'QQQ',type:'USD',qty:10,cost:400,price:700},{id:'s',ticker:'005930',name:'삼성전자',type:'KRW',qty:20,cost:50000,price:50000}]};
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s));localStorage.setItem('firemate_buy_fx_v1',JSON.stringify({q:1300}))},seed);
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const analysis=async page=>{await page.goto('/index.html');await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click()};

test('rebalancing shows the mix, saves a target and spends this month on what is short',async({page})=>{
 await analysis(page);
 // QQQ 10×700×1400 = 980만, 삼성 100만, 현금 100만 → 83% · 8% · 8%
 const card=page.locator('#fmRebalCard');
 await expect(card).toBeVisible();await expect(card).toContainText('83%');
 // The card redraws when quotes and the 1-year rate land, so type and save until it sticks.
 await expect(async()=>{await card.locator('[data-rebal="us"]').fill('60');await card.locator('[data-rebal="kr"]').fill('30');await card.locator('[data-rebal="cash"]').fill('10');await card.locator('#fmRebalForm button').click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_rebal_v1')))).toEqual({us:60,kr:30,cash:10})}).toPass({timeout:15000});
 // 한국 주식이 가장 모자라서 월 100만 원은 거의 한국 주식으로, 삼성전자 몇 주인지도.
 await expect(card.locator('.fm-rebal-plan')).toContainText('이번 달 적립 100만원');
 await expect(card.locator('.fm-rebal-plan')).toContainText('삼성전자');
 await expect(async()=>{await card.locator('[data-rebal="us"]').fill('70');await card.locator('#fmRebalForm button').click();await expect(page.locator('#toast')).toContainText('100%',{timeout:1000})}).toPass({timeout:15000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('US capital gains: gain in won from the buy rate, what is left of the 2.5M exemption, and how many shares to sell and buy back',async({page})=>{
 await analysis(page);
 const card=page.locator('#fmUsTaxCard');await expect(card).toBeVisible();
 // 주당 700×1400 − 400×1300 = 46만 원, 10주 = 460만 원 → 다 팔면 (460−250)×22% = 46.2만
 await expect(card).toContainText('+460만원');await expect(card).toContainText('약 46.2만원');
 // 250만 ÷ 46만 = 5주(230만)
 await expect(card.locator('.fm-ustax-tip')).toContainText('QQQ 5주');await expect(card.locator('.fm-ustax-tip')).toContainText('230만원');
 await expect(async()=>{await page.locator('#fmUsTaxIn').fill('100');await page.locator('#fmUsTaxForm button').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_us_tax_v1')||'{}').realized)).toBe(1000000)}).toPass({timeout:15000});
 // 남은 한도 150만 → 3주(138만)
 await expect(card.locator('.fm-ustax-tip')).toContainText('QQQ 3주');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_us_tax_v1')).realized)).toBe(1000000);
});

test('the DCA simulator in the FIRE lab uses real closes and compares with the plan rate',async({page})=>{
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('firelab'));
 await expect(page.locator('#fmDcaOut')).toContainText('넣은 돈');
 await expect(page.locator('#fmDcaOut')).toContainText('계획 수익률은 7%');
 await page.locator('#fmDcaSym').selectOption('QQQ');await page.locator('#fmDcaYears').selectOption('3');await page.locator('#fmDcaAmt').fill('30');await page.locator('#fmDcaForm button').click();
 // 3년 = 36달, 매달 30만 → 넣은 돈 1,080만
 await expect(page.locator('#fmDcaOut')).toContainText('1,080만원');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_dca_v1')))).toEqual({sym:'QQQ',amt:30,years:3});
});
