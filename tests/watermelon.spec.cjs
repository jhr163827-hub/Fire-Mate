const {test,expect}=require('@playwright/test');
const {Game,C}=require('../arcade/watermelon-physics.js');
const Matter=require('../arcade/vendor/matter-0.20.0.min.js');
const STATE='firemate_arcade_watermelon_state_v1';
const RANK='firemate_arcade_watermelon_scores_v1';
const legacy={version:1,score:1020,next:2,aim:170,over:false,uid:4,balls:[
 {id:1,level:5,x:65,y:350,vx:0,vy:0,age:300,angle:.12,spin:0},
 {id:2,level:3,x:180,y:365,vx:0,vy:0,age:200,angle:0,spin:0},
 {id:3,level:7,x:285,y:340,vx:0,vy:0,age:400,angle:-.2,spin:0}
]};
function pile(target){let seed=1;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);const g=new Game({random});
 for(let i=0;i<160&&!g.over;i++){g.drop(28+random()*304);g.advance(1000);if(g.bodies.length>=target){g.advance(20000);if(!g.over&&g.bodies.length>=target)return g}}
 throw Error('Could not build a stable pile of '+target);
}
async function open(page){await page.goto('/arcade/watermelon.html');await page.waitForFunction(()=>window.watermelonReady);}

for(const count of [10,20,30])test(count+' real dropped fruits settle without drift or penetration over ten simulated minutes',()=>{
 const g=pile(count);expect(g.over).toBe(false);expect(g.bodies.length).toBeGreaterThanOrEqual(count);
 const before=g.snapshot();g.advance(600000);expect(g.snapshot().balls.map(({age,...b})=>b)).toEqual(before.balls.map(({age,...b})=>b));
 for(const b of g.bodies){expect(b.isSleeping).toBe(true);expect(b.bounds.min.x).toBeGreaterThan(C.left-.5);expect(b.bounds.max.x).toBeLessThan(C.right+.5);expect(b.bounds.max.y).toBeLessThan(C.floor+.5)}
 let penetration=0;for(const b of g.bodies)for(const c of Matter.Query.collides(b,g.bodies.filter(x=>x!==b)))penetration=Math.max(penetration,c.depth);
 expect(penetration).toBeLessThan(.5);g.destroy();
});

test('merge queue consumes each body once, chains and clears double watermelons',()=>{
 const g=new Game();for(let i=0;i<4;i++)g.make(0,180,300);g.advance(500);
 expect(g.bodies).toHaveLength(1);expect(g.bodies[0].wm.level).toBe(2);expect(g.mergeCount).toBe(3);expect(g.score).toBe(5);g.destroy();
 const w=new Game();w.make(10,100,390);w.make(10,260,390);w.advance(100);
 expect(w.bodies).toHaveLength(0);expect(w.score).toBe(110);expect(w.watermelons).toBe(1);w.destroy();
});

test('spawn grace, danger recovery and continuous overflow timeout',()=>{
 const g=new Game({random:()=>.99});g.drop(180);g.advance(1200);expect(g.over).toBe(false);expect(g.danger).toBe(0);
 const b=g.make(0,100,58,{entered:true});Matter.Body.setStatic(b,true);g.advance(900);expect(g.over).toBe(false);expect(g.danger).toBeGreaterThan(800);
 Matter.Body.setPosition(b,{x:100,y:200});g.advance(500);expect(g.danger).toBe(0);
 Matter.Body.setPosition(b,{x:100,y:58});g.advance(1900);expect(g.over).toBe(false);g.advance(120);expect(g.over).toBe(true);g.destroy();
});

test('v1 and v2 keep fruit identities, score, queue and migration grace',()=>{
 const g=new Game();expect(g.restore(legacy)).toEqual({migrated:true,count:3});let s=g.snapshot();
 expect(s.score).toBe(1020);expect(s.current).toBe(legacy.next);expect(s.balls.map(x=>[x.id,x.level])).toEqual(legacy.balls.map(x=>[x.id,x.level]));expect(s.migrationGraceRemaining).toBe(5000);
 const h=new Game();h.restore(s);expect(h.snapshot().balls).toEqual(s.balls);expect(h.snapshot().sessionId).toBe(s.sessionId);expect(h.migrationUntil).toBe(5000);
 g.restore({...legacy,over:true});expect(g.recorded).toBe(true);g.destroy();h.destroy();
});

test('legacy resume backs up original, keeps ranks and unrelated financial keys, returns through arcade',async({page})=>{
 const ranks=[{score:2048,date:'2026. 10. 18.'}];
 await page.addInitScript(({STATE,RANK,legacy,ranks})=>{if(!sessionStorage.seeded){localStorage.setItem(STATE,JSON.stringify(legacy));localStorage.setItem(RANK,JSON.stringify(ranks));localStorage.setItem('firemate_smart_v3','financial-sentinel');localStorage.setItem('other-arcade-save','arcade-sentinel');sessionStorage.seeded='yes'}},{STATE,RANK,legacy,ranks});
 await open(page);await expect(page.locator('#resume')).toBeVisible();
 expect(await page.evaluate(k=>localStorage.getItem(k+'_legacy_backup'),STATE)).toBe(JSON.stringify(legacy));
 const before=await page.evaluate(()=>__watermelon.snapshot());expect(before.score).toBe(1020);expect(before.balls).toHaveLength(3);
 await page.locator('#resume').click();await page.waitForTimeout(300);await page.locator('#pause').click();
 const saved=await page.evaluate(()=>__watermelon.snapshot());await page.locator('.back').click();await expect(page).toHaveURL(/arcade\/index.html/);await open(page);
 const after=await page.evaluate(()=>__watermelon.snapshot());expect(after.balls).toEqual(saved.balls);expect(after.score).toBe(saved.score);expect(after.current).toBe(saved.current);expect(after.next).toBe(saved.next);
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RANK)).toEqual(ranks);
 expect(await page.evaluate(()=>[localStorage.getItem('firemate_smart_v3'),localStorage.getItem('other-arcade-save')])).toEqual(['financial-sentinel','arcade-sentinel']);
});

test('malformed save and quota errors never replace the original',async({page})=>{
 await page.addInitScript(({STATE})=>localStorage.setItem(STATE,'{"version":99,"important":"keep"}'),{STATE});await open(page);
 expect(await page.evaluate(()=>__watermelon.metrics().saveBlocked)).toBe(true);await page.locator('#resume').click();await page.locator('#game').click();
 expect(await page.evaluate(k=>localStorage.getItem(k),STATE)).toBe('{"version":99,"important":"keep"}');
});

test('quota failure is visible while previous save and ranks remain byte-for-byte',async({page})=>{
 await open(page);const raw=await page.evaluate(k=>localStorage.getItem(k),STATE);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')};__watermelon.save()});
 await expect(page.locator('#saveStatus')).toContainText('저장 공간 부족');expect(await page.evaluate(k=>localStorage.getItem(k),STATE)).toBe(raw);
});

test('migration backup failure protects v1 raw data while allowing in-memory resume',async({page})=>{
 await page.addInitScript(({STATE,legacy})=>{localStorage.setItem(STATE,JSON.stringify(legacy));Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')}},{STATE,legacy});
 await open(page);expect(await page.evaluate(()=>__watermelon.metrics().saveBlocked)).toBe(true);await page.locator('#resume').click();await page.locator('#pause').click();
 expect(await page.evaluate(k=>localStorage.getItem(k),STATE)).toBe(JSON.stringify(legacy));expect((await page.evaluate(()=>__watermelon.snapshot())).balls).toHaveLength(3);
});

test('browser overflow ends once, preserves existing rankings and resumes ended state',async({page})=>{
 await open(page);await page.evaluate(({RANK})=>{
  localStorage.setItem(RANK,JSON.stringify([{score:9999,date:'old'}]));const g=new WatermelonPhysics.Game();g.score=123;const b=g.make(0,100,55,{entered:true});Matter.Body.setStatic(b,true);
  const s=g.snapshot();s.balls[0].sleeping=true;s.balls[0].contacted=true;__watermelon.scene(s);
 },{RANK});
 // Freeze a fruit in the overflow zone through a high, sleeping stack fixture.
 await page.evaluate(()=>{const s=__watermelon.snapshot();s.danger=WatermelonPhysics.C.dangerGrace-1;__watermelon.scene(s);__watermelon.advance(10)});
 await expect(page.locator('#overlayTitle')).toHaveText('123점');expect(await page.evaluate(()=>__watermelon.snapshot().over)).toBe(true);
 const list=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RANK);expect(list.map(x=>x.score)).toEqual([9999,123]);
 await page.reload();await page.waitForFunction(()=>window.watermelonReady);expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),RANK)).toEqual(list);await expect(page.locator('#resume')).toHaveText('다시 한 판');
});

for(const width of [320,360,390,430])test('mobile '+width+'px touch, cooldown, cancel, pause and dialog controls',async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:width===320?568:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 for(const id of ['pause','restart','rankToggle','sound'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
 const box=await page.locator('#game').boundingBox();await page.touchscreen.tap(box.x+box.width*.3,box.y+80);await page.touchscreen.tap(box.x+box.width*.7,box.y+80);
 expect(await page.evaluate(()=>__watermelon.metrics().inputs)).toBe(1);
 await page.waitForTimeout(450);await page.touchscreen.tap(box.x+box.width*.7,box.y+80);expect(await page.evaluate(()=>__watermelon.metrics().inputs)).toBe(2);
 await page.locator('#pause').click();const s=await page.evaluate(()=>__watermelon.snapshot());await page.waitForTimeout(200);expect(await page.evaluate(()=>__watermelon.snapshot().balls)).toEqual(s.balls);
 await page.locator('#resume').click();await page.locator('#rankToggle').click();expect(await page.evaluate(()=>__watermelon.metrics().paused)).toBe(true);await page.locator('#rankClose').click();expect(await page.evaluate(()=>__watermelon.metrics().paused)).toBe(false);
 const touch=await context.newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+80}]});await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 expect(await page.evaluate(()=>__watermelon.metrics().inputs)).toBe(2);await page.waitForTimeout(450);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.3,y:box.y+80}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.7,y:box.y+80}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect(await page.evaluate(()=>__watermelon.metrics().inputs)).toBe(3);const dropped=await page.evaluate(()=>__watermelon.snapshot().balls.at(-1));expect(dropped.x).toBeCloseTo(252,0);
 expect(errors).toEqual([]);await context.close();
});

test('installed PWA caches every game dependency for offline resume',async({page,context})=>{
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{rates:{KRW:1400}}}));await page.goto('/index.html');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await open(page);await page.locator('#game').click();await page.locator('#pause').click();const before=await page.evaluate(()=>__watermelon.snapshot());
 // The worker's cache.put is asynchronous after the network response.
 await expect.poll(()=>page.evaluate(async()=>!!(await caches.match(location.origin+'/arcade/watermelon-game.js?v=2.0.0')))).toBe(true);
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.watermelonReady);
 expect(await page.evaluate(()=>__watermelon.snapshot().balls)).toEqual(before.balls);await expect(page.locator('#resume')).toBeVisible();
});
