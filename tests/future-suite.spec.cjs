const {test,expect}=require('@playwright/test');const fs=require('node:fs');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const key='firemate_future_v1';
test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2026-11-15T12:00:00Z')});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(()=>{if(sessionStorage.futureQA)return;sessionStorage.futureQA='1';localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[],fire:{goal:2000,monthly:100,rate:0,withdrawal:4},retirement:{items:[],monthly:100,yield:0,priceChange:0,crash:30},balance:{fx:1400,cash:12000000,other:0,debt:0},accounts:[],holdings:[],snapshots:[{month:'2025-01',amount:3000000}],dailySnapshots:[]}));localStorage.setItem('firemate_bucket_v1',JSON.stringify({list:[{id:'b',name:'스위스 여행',cost:2000000,year:2027}]}));});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
});
async function open(page,id){await page.locator(id).click();await expect(page.locator('#fmLifeOverlay')).toBeVisible();if(id==='#fmRehearsalOpen')await page.locator('#fmFutureConditions summary').click()}
async function state(page,k){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k)}
test('retirement preview: no mutation until save; distribution is not a second return; mobile fits',async({page})=>{
 await open(page,'#fmRehearsalOpen');await page.fill('#ff_years','2');await page.fill('#ff_spend','100');await page.fill('#ff_yield','0');await page.fill('#ff_inflation','0');await page.fill('#ff_cash','1200');await expect(page.locator('#ffResult')).toContainText('2027-11');expect(await state(page,key)).toBeNull();
 await page.locator('#fmFutureForm button[type=submit]').click();expect((await state(page,key)).settings).toMatchObject({spend:1000000,years:2});expect((await state(page,'firemate_smart_v3')).fire.goal).toBe(2000);
 for(const w of [320,390,768]){await page.setViewportSize({width:w,height:844});const b=await page.locator('#fmLifeBody').boundingBox();expect(b.x+b.width).toBeLessThanOrEqual(w);expect(await page.locator('#ffResult').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBeTruthy()}
 await page.fill('#ff_rate','99');await expect(page.locator('#ffStatus')).toContainText('입력 범위');await expect(page.locator('#ffResult')).toBeEmpty();
});
test('map creates, edits and excludes events, required contribution responds, original goal survives',async({page})=>{
 await open(page,'#fmRehearsalOpen');await page.fill('#ffRetire','2027-11');await page.fill('#ff_inflation','0');await page.locator('#fmFutureForm button[type=submit]').click();await page.locator('[data-future-go=lifemap]').first().click();
 await page.locator('#fmMapAdd').click();await page.fill('#fmMapName','이사 비용');await page.fill('#fmMapMonth','2027-01');await page.fill('#fmMapAmt','240');await page.locator('#fmLifeForm .primary').click();await expect(page.locator('.fm-map-road')).toContainText('이사 비용');expect((await state(page,key)).events[0].amount).toBe(2400000);
 await page.locator('[data-map]').click();await page.locator('#fmMapOn').uncheck();await page.locator('#fmLifeForm .primary').click();await expect(page.locator('.fm-map-road')).toContainText('계산 제외');
 await page.locator('#fmMapImport').click();await page.locator('[data-map-source]').first().click();await expect(page.locator('#fmMapName')).toHaveValue('스위스 여행');await page.locator('#fmLifeForm .primary').click();expect((await state(page,key)).events).toHaveLength(2);
 await page.locator('[data-map]').filter({hasText:'이사 비용'}).click();await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();expect((await state(page,key)).events).toHaveLength(1);expect((await state(page,'firemate_bucket_v1')).list).toHaveLength(1);
});
test('time machine preserves historical unknowns, captures holdings and plan without fabricating past, memo survives reload',async({page})=>{
 await open(page,'#fmTimeOpen');await page.selectOption('#fmTimeMonth','2025-01');await expect(page.locator('#fmTimeDetail')).toContainText('당시 종목·목표 자료 없음');await expect(page.locator('#fmTimeDetail')).toContainText('₩3,000,000');
 await page.selectOption('#fmTimeMonth','2026-11');await page.locator('#fmTimeNote').click();await page.fill('#fmTimeMemo','매수 이유를 남김');await page.fill('#fmTimeFlow','500');await page.locator('#fmLifeForm .primary').click();await expect(page.locator('#fmTimeDetail')).toContainText('입출금 차감 변동 +₩4,000,000');
 await page.reload();await page.locator('#settingsBottom').click();await open(page,'#fmTimeOpen');await expect(page.locator('.fm-time-memo')).toContainText('매수 이유');const snap=(await state(page,'firemate_time_v1')).list[0];expect(snap.net).toBe(12000000);expect(snap.goal.goal).toBe(2000);expect(snap.holdings).toEqual([]);
});
test('settings and snapshot storage failure preserve prior data, backup includes both new stores',async({page})=>{
 await open(page,'#fmRehearsalOpen');await page.locator('#fmFutureForm button[type=submit]').click();const previous=await state(page,key);await page.locator('[data-future-go=timemachine]').first().click();const snap=await state(page,'firemate_time_v1');
 await page.evaluate(()=>{const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(['firemate_future_v1','firemate_time_v1'].includes(k))throw new Error('quota');return orig.call(this,k,v)}});
 await page.locator('#fmTimeNow').click();expect(await state(page,'firemate_time_v1')).toEqual(snap);await page.locator('[data-future-go=rehearsal]').first().click();await page.locator('#fmFutureConditions summary').click();await page.fill('#ff_spend','200');await page.locator('#fmFutureForm button[type=submit]').click();expect(await state(page,key)).toEqual(previous);
 const [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.getElementById('export').click())]);const b=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));expect(b.extras.firemate_future_v1).toEqual(previous);expect(b.extras.firemate_time_v1).toEqual(snap);
});
test('new month freezes previous portfolio and notes; current capture never changes older records',async({page})=>{
 await open(page,'#fmTimeOpen');const first=(await state(page,'firemate_time_v1')).list[0];await page.clock.setSystemTime(new Date('2026-12-15T12:00:00Z'));await page.locator('#fmTimeNow').click();const all=(await state(page,'firemate_time_v1')).list;expect(all).toHaveLength(2);expect(all[0]).toEqual(first);expect(all[1].month).toBe('2026-12');
});
test('holdings are captured with valuation at observation, not today values substituted into older months',async({page})=>{
 await page.evaluate(()=>{const d=JSON.parse(localStorage.firemate_smart_v3);d.holdings=[{id:'h',ticker:'TEST',name:'기록용 종목',type:'KRW',qty:2,price:10000,cost:8000}];localStorage.firemate_smart_v3=JSON.stringify(d)});await page.reload();await page.locator('#settingsBottom').click();await open(page,'#fmTimeOpen');await page.locator('#fmTimeNow').click();const s=(await state(page,'firemate_time_v1')).list[0];expect(s.holdings[0]).toMatchObject({name:'기록용 종목',qty:2,cost:16000,value:20000});await page.selectOption('#fmTimeMonth','2025-01');await expect(page.locator('#fmTimeDetail')).not.toContainText('기록용 종목');
});
test('demo mode uses only sample totals and does not expose or update saved personal snapshot detail',async({page})=>{
 await open(page,'#fmTimeOpen');const old=await state(page,'firemate_time_v1');await page.evaluate(()=>localStorage.setItem('firemate_demo_mode_v1','1'));await page.reload();await page.locator('#settingsBottom').click();await open(page,'#fmTimeOpen');await expect(page.locator('#fmTimeNote')).toHaveCount(0);await expect(page.locator('#fmTimeDetail')).toContainText('당시 종목·목표 자료 없음');await page.locator('#fmTimeNow').click();expect(await state(page,'firemate_time_v1')).toEqual(old);
});
