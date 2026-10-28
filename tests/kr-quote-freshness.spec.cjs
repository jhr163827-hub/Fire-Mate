const {test,expect}=require('@playwright/test');
const now=Date.now(),at=offset=>new Date(now-offset).toISOString();
const backup={price:25230,prevClose:25080,at:at(3600000)};
async function setup(page,worker,snapshot=backup,live=null){
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>{
  const u=r.request().url();
  if(u.includes('polling.finance.naver.com')){if(!live)return r.abort();const name=new URL(u).searchParams.get('_callback');return r.fulfill({contentType:'text/javascript; charset=utf-8',body:name+'('+JSON.stringify({resultCode:'success',result:{time:live.at||Date.now(),areas:[{name:'SERVICE_ITEM',datas:[{cd:'360750',nv:live.price,sv:25080,nm:'TIGER 미국S&P500',ms:live.market||'OPEN'}]}]}})+')'})}
  if(u.includes('/quotes?code='))return r.fulfill({json:typeof worker==='function'?worker():worker});
  if(u.includes('live-quotes.json'))return r.fulfill({json:{updatedAt:at(0),quotes:snapshot?{'KR-360750':snapshot}:{}}});
  return r.abort();
 });
 await page.addInitScript(()=>{if(sessionStorage.getItem('kr-seeded'))return;sessionStorage.setItem('kr-seeded','1');localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()));localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],rec:[],budgets:{},balance:{fx:1400,cash:0,other:0,debt:0},fire:{goal:65000,monthly:300,rate:7,withdrawal:4},accounts:[{id:'a',name:'증권',kind:'investment',amount:0,fire:true}],holdings:[{id:'h',accountId:'a',ticker:'360750',name:'TIGER 미국S&P500',type:'KRW',qty:10,price:24000,cost:23000,dayChangePct:-0.5,dayChangeAt:new Date().toISOString()}]}))});
 await page.goto('/index.html');await page.evaluate(()=>fmGo('assets'));
}
const quote=(price,extra={})=>({code:'360750',currency:'KRW',price,...extra});
const holding=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings[0]);
async function refresh(page){await page.locator('#refreshStocks').click();await expect(page.locator('#refreshStocks')).toBeEnabled();}
test('successful prior-day close yields to newer snapshot, without double-counting success',async({page})=>{
 const date=new Date(now-86400000).toISOString().slice(0,10).replaceAll('-','');
 await setup(page,quote(25080,{date}));await refresh(page);
 const h=await holding(page);expect(h.price).toBe(25230);expect(h.quoteAt).toBe(backup.at);expect(h.dayChangePct).toBeCloseTo(150/25080*100);expect([h.qty,h.cost,h.accountId]).toEqual([10,23000,'a']);
 const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_last_quote_v1')));expect([result.ok,result.total,result.failed]).toEqual([1,1,0]);
 await page.locator('#fmAssetQuickHoldings').click();await expect(page.locator('#holdingList')).toContainText('기준');
});
test('newer worker quote is not overwritten by older snapshot',async({page})=>{
 await setup(page,quote(25300,{at:at(60000),prevClose:25080}));await refresh(page);const h=await holding(page);expect(h.price).toBe(25300);expect(h.quoteAt).toBe(at(60000));
});
test('manual refresh requests another quote within ten minutes',async({page})=>{
 let calls=0;await setup(page,()=>quote(25300+(++calls)*10,{at:at(60000),prevClose:25080}));await refresh(page);await refresh(page);expect(calls).toBe(2);expect((await holding(page)).price).toBe(25320);
});
test('unknown worker time prefers a dated snapshot',async({page})=>{
 await setup(page,quote(25080));await refresh(page);expect((await holding(page)).price).toBe(25230);
});
test('missing change and time clears old daily change instead of stamping it today',async({page})=>{
 await setup(page,quote(25080),null);await refresh(page);const h=await holding(page);expect(h.quoteAt).toBeNull();expect(h.dayChangePct).toBeNull();expect(h.dayChangeAt).toBeNull();
 await page.locator('#fmAssetQuickHoldings').click();await expect(page.locator('#holdingList')).toContainText('시세 시각 미확인');
});
test('prior-day quote retains its date and is labeled recent when snapshot is absent',async({page})=>{
 const date=new Date(now-86400000).toISOString().slice(0,10);
 await setup(page,quote(25080,{date,prevClose:25200}),null);await refresh(page);expect((await holding(page)).quoteAt).toBe(date+'T06:30:00.000Z');
 await page.locator('#fmAssetQuickHoldings').click();await expect(page.locator('#holdingList .fm-holding-day')).toContainText('최근');
});

test('live domestic snapshot supersedes old close and one-hour-old backup',async({page})=>{
 await setup(page,quote(25080),backup,{price:25400});await refresh(page);
 const h=await holding(page);expect(h.price).toBe(25400);expect(Date.parse(h.quoteAt)).toBeGreaterThan(now-120000);expect(h.dayChangePct).toBeCloseTo(320/25080*100);
 await page.locator('#fmAssetQuickHoldings').click();await expect(page.locator('#holdingList')).toContainText('기준');
});
test('closed or future live payload cannot stamp an old close as current',async({page})=>{
 await setup(page,quote(25080),backup,{price:25400,market:'CLOSE'});await refresh(page);expect((await holding(page)).quoteAt).toBe(backup.at);
});
test('future live server time is rejected',async({page})=>{
 await setup(page,quote(25080),backup,{price:25400,at:now+3600000});await refresh(page);expect((await holding(page)).price).toBe(backup.price);
});
test('successful live source survives worker failure and preserves newer saved price on next refresh',async({page})=>{
 let first=true;await setup(page,()=>first?null:quote(25080,{date:'20261027'}),backup,{price:25400});await refresh(page);first=false;
 await page.route('https://polling.finance.naver.com/**',r=>r.abort());await refresh(page);expect((await holding(page)).price).toBe(25400);
});
test('one-hour-old quote is explicitly marked delayed during Korean session',async({page})=>{
 const session=Date.parse('2026-10-28T10:42:00+09:00');await page.clock.install({time:session});
 const old=new Date(session-71*60000).toISOString();await setup(page,quote(25080,{at:old}),{price:25230,prevClose:25080,at:old});await refresh(page);
 await page.locator('#fmAssetQuickHoldings').click();await expect(page.locator('#holdingList')).toContainText('71분 전 시세 · 갱신 지연');
});

test('foreground return refreshes stale domestic prices without US API requests',async({page})=>{
 const session=Date.parse('2026-10-28T10:42:00+09:00');await page.clock.install({time:session});
 await setup(page,quote(25400,{at:new Date(session).toISOString(),prevClose:25080}),null);
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.holdings.push({id:'us',accountId:'a',ticker:'JEPQ',type:'USD',qty:1,cost:50,price:60});localStorage.setItem('firemate_smart_v3',JSON.stringify(d));localStorage.setItem('firemate_td_key_v1','fake-qa-key-12345');localStorage.setItem('firemate_quote_cooldown_v1',String(Date.now()+600000))});
 await page.reload();await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect.poll(async()=> (await holding(page)).price).toBe(25400);
 const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_last_quote_v1')));expect([result.ok,result.total,result.failed]).toEqual([1,1,0]);
});
