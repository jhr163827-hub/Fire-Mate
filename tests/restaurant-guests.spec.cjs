const {test,expect}=require('@playwright/test');
const KEY='firemate_arcade_restaurant_v2';
test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function start(page,{random=0.9,patience,event}={}){
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.clock.install();
 const now=await page.evaluate(()=>Date.now());
 await page.addInitScript(({key,state,random,patience,event})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));Math.random=()=>random;if(patience)window.__restaurantPatienceScale=patience;if(event)window.__restaurantEvent=event},{key:KEY,state:{coins:500,served:0,level:1,stoves:[{recipe:0,ends:now-1000},null],decor:0},random,patience,event});
 await page.goto('/arcade/restaurant.html');
 await page.locator('[data-room-stove="0"]').click();
 await expect.poll(async()=>(await read(page)).service?.stock?.[0]?.batches?.[0]?.remaining).toBe(4);
}
test('quickly served guests pay a tip and count as happy',async({page})=>{
 await start(page);
 await page.clock.runFor(30000);
 const s=await read(page);
 expect(s.guestStats.angry).toBe(0);
 expect(s.guestStats.happy).toBeGreaterThanOrEqual(2);
 expect(s.guestStats.tips).toBeGreaterThanOrEqual(2);
 // 주먹밥 is 3 coins a plate; each quick guest adds a 1-coin tip on top.
 expect(s.coins).toBe(500+s.served*3+s.guestStats.tips);
 await expect(page.locator('#serviceSummary')).toContainText('만족 100%');
});
test('a guest who waits past their patience leaves angry without taking a plate',async({page})=>{
 await start(page,{patience:0.05});
 // Two guests arrive; one waits for the single server longer than the shortened patience.
 await page.clock.runFor(4500);
 const s=await read(page);
 expect(s.guestStats?.angry).toBeGreaterThanOrEqual(1);
 const taken=(s.service.guests||[]).filter(g=>g?.batch).length;
 expect(s.service.stock[0].batches[0].remaining+taken+s.served).toBe(4);
 await expect(page.locator('#status')).toContainText('화가 나서');
});
test('VIP guests show a badge and the waiting guest shows a patience bar',async({page})=>{
 await start(page,{random:0.05});
 await page.clock.runFor(3000);
 await expect(page.locator('#roomServiceActors .room-mood-vip').first()).toHaveText('VIP');
 await expect(page.locator('#roomServiceActors .room-mood-track').first()).toBeAttached();
 expect((await read(page)).service.guests.filter(Boolean).every(g=>g.type==='vip')).toBe(true);
});

test('미식가의 날 brings 미식가 guests who tip three times as much, shown with a 🎩 tag',async({page})=>{
 await start(page,{random:0.99,event:'gourmet'});
 await expect(page.locator('#restaurantEvent')).toHaveText('🎩 미식가의 날 · 미식가 손님이 자주 와요');
 await page.clock.runFor(2500);
 expect(Object.values((await read(page)).service.guests||{}).filter(Boolean).map(g=>g.type)).toContain('gourmet');
 await expect(page.locator('.room-mood.gourmet').first()).toContainText('🎩 미식가');
 await page.clock.runFor(30000);
 const s=await read(page);expect(s.guestStats.angry).toBe(0);expect(s.coins).toBeGreaterThan(500+s.served*3+s.served);
});
test('a rainy day shows rain on the windows and no event chip on plain test days',async({page})=>{
 await start(page,{event:'rain'});
 await expect(page.locator('#restaurantEvent')).toHaveText('☔ 비 오는 날 · 손님이 더 오래 기다려요');
 await expect(page.locator('#restaurantRoom .room-rain')).toHaveCount(3);
});
test('without an event the room has no chip and no rain',async({page})=>{
 await start(page);
 await expect(page.locator('#restaurantEvent')).toBeHidden();await expect(page.locator('#restaurantRoom .room-rain')).toHaveCount(0);
});
