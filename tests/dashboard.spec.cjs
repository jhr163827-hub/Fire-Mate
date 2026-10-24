const {test,expect}=require('@playwright/test');
// The scheduled backup quote file is live on GitHub; keep these fixtures' prices fixed.
test.beforeEach(async({page})=>{await page.route('**/chart-data/live-quotes.json',r=>r.fulfill({status:404,body:''}))});
test('shared header and quote controls stay aligned through mobile tab and theme changes',async({page})=>{
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{rates:{KRW:1400}}}));
 await page.goto('/index.html');
 for(const width of [320,360,390,430])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:720});
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  let header,quote;
  for(const tab of ['home','assets','fire','home','assets','fire','home']){
   await page.locator('.bottomnav [data-view="'+tab+'"]').click();
   await expect(page.locator('#fmCurrentSection')).toHaveText({home:'홈',assets:'자산',fire:'FIRE'}[tab]);
   const box=await page.locator('header.top').boundingBox();
   if(header)expect(box).toEqual(header);else header=box;
   if(tab!=='fire'){
    const b=page.locator(tab==='home'?'#homeRefreshStocks':'#refreshStocks');
    await expect(b).toHaveText('업데이트');
    const rect=await b.boundingBox();
    expect(rect.height).toBeGreaterThanOrEqual(44);
    const layout={x:rect.x,width:rect.width,height:rect.height};
    if(quote)expect(layout).toEqual(quote);else quote=layout;
    await expect(page.locator(tab==='home'?'#homeLastQuote':'#assetsLastQuote')).toBeVisible();
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  }
 }
});
test('home and assets share quote loading, duplicate prevention, failure and offline state',async({page,context})=>{
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{rates:{KRW:1400}}}));
 await page.goto('/index.html');
 await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));
  d.holdings=[{id:'quote-btc',accountId:'legacy-crypto',ticker:'BTC',type:'CRYPTO_KRW',qty:0.1,price:100,cost:90}];
  localStorage.setItem('firemate_smart_v3',JSON.stringify(d));
  localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
 });
 await page.reload();
 let release,requests=0,fail=false;
 await page.route('https://api.upbit.com/**',async r=>{requests++;if(!fail)await new Promise(resolve=>release=resolve);await r.fulfill(fail?{status:503,body:'unavailable'}:{json:[{market:'KRW-BTC',trade_price:120,signed_change_rate:0.02}]});});
 await page.locator('#homeRefreshStocks').click();
 await expect(page.locator('#homeRefreshStocks')).toBeDisabled();
 await expect(page.locator('#refreshStocks')).toBeDisabled();
 await expect.poll(()=>requests).toBe(1);
 await page.evaluate(()=>{document.getElementById('homeRefreshStocks').click();document.getElementById('refreshStocks').click()});
 expect(requests).toBe(1);release();
 await expect(page.locator('#homeLastQuote')).toContainText('1/1종목 성공');
 await expect(page.locator('#homeRefreshStocks')).toBeEnabled();
 await page.locator('.bottomnav [data-view="assets"]').click();
 await expect(page.locator('#assetsLastQuote')).toHaveText(await page.locator('#homeLastQuote').textContent());
 fail=true;await page.locator('#refreshStocks').click();
 await expect(page.locator('#assetsLastQuote')).toContainText('1종목 실패');
 expect(requests).toBe(2);
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await page.locator('.bottomnav [data-view="home"]').click();
 await context.setOffline(true);await page.locator('#homeRefreshStocks').click();
 await expect(page.locator('#homeLastQuote')).toContainText('인터넷 연결 없음');
 expect(requests).toBe(2);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
});

test('home shows dividends due in the next 7 days, guessed from each holding\'s last payout gap',async({page})=>{
 // Keep the saved 1,400원 rate: no live exchange-rate lookup.
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const iso=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 await page.route('**/dividends.json*',r=>r.fulfill({json:{symbols:{JEPQ:{currency:'USD',events:[{date:iso(-55),amount:0.5},{date:iso(-25),amount:0.6}]},SCHD:{currency:'USD',events:[{date:iso(-100),amount:0.3},{date:iso(-10),amount:0.3}]}}}}));
 await page.addInitScript(()=>{localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify({tx:[],accounts:[{id:'a',name:'미국',kind:'investment',amount:0,fire:true}],holdings:[{id:'h1',accountId:'a',ticker:'JEPQ',type:'USD',qty:100,price:58,cost:55},{id:'h2',accountId:'a',ticker:'SCHD',type:'USD',qty:10,price:28,cost:25}],fire:{asset:0,goal:100000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0}}))});
 await page.goto('/index.html');
 const line=page.locator('#fmHomeDiv');
 // JEPQ: 30-day gap → next payout in 5 days, 0.6 × 100주 × 1,400원 × 85% ≈ 7.1만원. SCHD's next is ~80 days out.
 await expect(line).toHaveText('💰 7일 안 배당 약 7.1만원');
 await line.click();
 await expect(page.locator('#fmAssetDividendView')).toBeVisible();
});
