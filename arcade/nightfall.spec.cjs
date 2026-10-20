const {test,expect}=require('@playwright/test');
// Serve repository root over HTTP, e.g. python3 -m http.server 4173
const url=process.env.NIGHTFALL_URL||'http://127.0.0.1:4173/arcade/nightfall.html';
for(const width of [320,360,375,390,430])test('Nightfall mobile '+width,async({browser})=>{
const context=await browser.newContext({viewport:{width,height:720},isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await expect(page.getByRole('button',{name:'생존 시작'})).toBeVisible();
await page.getByRole('button',{name:'생존 시작'}).click();
await expect(page.locator('#panel')).toBeHidden();
await page.getByRole('button',{name:'일시정지'}).click();
await expect(page.locator('#title')).toContainText('일시정지');
const box=await page.locator('.card').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
await page.getByRole('button',{name:'계속하기'}).click();await expect(page.locator('#panel')).toBeHidden();
expect(errors).toEqual([]);await context.close();
});
test('Nightfall save isolation and reset',async({page})=>{
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
await page.evaluate(()=>{localStorage.setItem('nightfall_progress_v1',JSON.stringify({gold:100,levels:{power:0,health:0,speed:0},unlocks:{ranger:false},selected:'mage',totalKills:0}));localStorage.setItem('nightfall_best_v1','17');localStorage.setItem('fire_mate_regression_sentinel','keep')});
await page.reload();await page.getByRole('button',{name:'영구 강화 상점'}).click();
await page.getByRole('button',{name:/마법 공격력 Lv 0/}).click();
expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightfall_progress_v1')).levels.power)).toBe(1);
await page.getByRole('button',{name:'NIGHTFALL 진행 데이터 초기화'}).click();
page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'모든 NIGHTFALL 기록 영구 삭제'}).click();
expect(await page.evaluate(()=>localStorage.getItem('nightfall_progress_v1'))).toBeNull();
expect(await page.evaluate(()=>localStorage.getItem('nightfall_best_v1'))).toBeNull();
expect(await page.evaluate(()=>localStorage.getItem('fire_mate_regression_sentinel'))).toBe('keep');
expect(errors).toEqual([]);
});
test('Nightfall cancel reset leaves records untouched',async({page})=>{
await page.goto(url);
await page.evaluate(()=>{localStorage.setItem('nightfall_progress_v1',JSON.stringify({gold:77,levels:{power:0,health:0,speed:0},unlocks:{ranger:false},selected:'mage',totalKills:9}));localStorage.setItem('nightfall_best_v1','21')});
await page.reload();await page.getByRole('button',{name:'영구 강화 상점'}).click();
await page.getByRole('button',{name:'NIGHTFALL 진행 데이터 초기화'}).click();
page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'모든 NIGHTFALL 기록 영구 삭제'}).click();
expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightfall_progress_v1')).gold)).toBe(77);
expect(await page.evaluate(()=>localStorage.getItem('nightfall_best_v1'))).toBe('21');
});
test('Nightfall background pauses active gameplay',async({page})=>{
await page.goto(url);await page.getByRole('button',{name:'생존 시작'}).click();
await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
await expect(page.locator('#panel')).toBeHidden();
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
await expect(page.locator('#title')).toContainText('일시정지');
});

test('Nightfall saved upgrades survive reload',async({page})=>{
await page.goto(url);
await page.evaluate(()=>localStorage.setItem('nightfall_progress_v1',JSON.stringify({gold:100,levels:{power:2,health:1,speed:0},unlocks:{ranger:false},selected:'mage',totalKills:4})));
await page.reload();
await page.getByRole('button',{name:'영구 강화 상점'}).click();
await expect(page.getByRole('button',{name:/마법 공격력 Lv 2\/5/})).toBeVisible();
await expect(page.getByRole('button',{name:/최대 체력 Lv 1\/5/})).toBeVisible();
});
test('Nightfall keyboard pause and resume',async({page})=>{
await page.goto(url);await page.getByRole('button',{name:'생존 시작'}).click();
await page.keyboard.press('Escape');
await expect(page.locator('#title')).toContainText('일시정지');
await page.getByRole('button',{name:'계속하기'}).click();
await expect(page.locator('#panel')).toBeHidden();
});

// Phase 4 regression: a stopped simulation must not advance its HUD clock.
test('Nightfall paused simulation keeps its survival clock frozen',async({page})=>{
  await page.goto(url);
  await page.getByRole('button',{name:'생존 시작'}).click();
  await page.getByRole('button',{name:'일시정지'}).click();
  const before=await page.locator('#hud').textContent();
  await page.waitForTimeout(1200);
  expect(await page.locator('#hud').textContent()).toBe(before);
  await page.getByRole('button',{name:'계속하기'}).click();
  await expect(page.locator('#panel')).toBeHidden();
});

test('Nightfall deterministic boss threshold and 160 enemy stress',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/arcade/nightfall.html',async route=>{
    const response=await route.fetch();
    let html=await response.text();
    const anchor='requestAnimationFrame(frame)})();';
    expect(html.includes(anchor)).toBe(true);
    html=html.replace(anchor,"window.__nightfallPhase4={tick,draw,get enemy(){return enemy},get player(){return player},advance:(seconds)=>{elapsed=seconds;},snapshot:()=>({elapsed,bossSpawned,bossCount:enemy.filter(e=>e.type==='boss').length,enemyCount:enemy.length,kills})};requestAnimationFrame(frame)})();");
    await route.fulfill({response,body:html});
  });
  await page.goto(url);
  await page.getByRole('button',{name:'생존 시작'}).click();
  const result=await page.evaluate(()=>{
    const api=window.__nightfallPhase4;
    api.player.inv=999;
    api.advance(299.99);
    api.tick(.02);
    const boss=api.snapshot();
    api.enemy.length=0;
    for(let i=0;i<160;i++)api.enemy.push({x:api.player.x+400+i*3,y:api.player.y+400,hp:50,max:50,type:'wraith',speed:50,radius:13,hit:0,death:0,knockX:0,knockY:0,slow:0});
    const start=performance.now();
    for(let i=0;i<120;i++){api.tick(.016);api.draw()}
    return {boss,stress:api.snapshot(),durationMs:performance.now()-start};
  });
  expect(result.boss.bossSpawned).toBe(true);
  expect(result.boss.bossCount).toBe(1);
  expect(result.stress.enemyCount).toBeLessThanOrEqual(160);
  expect(result.durationMs).toBeLessThan(30000);
  expect(errors).toEqual([]);
});

// Diagnostics are deliberately available only on localhost with explicit opt-in.
for(const count of [50,100,160])test('Nightfall enemy stress '+count,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
  await page.getByRole('button',{name:'생존 시작'}).click();
  const result=await page.evaluate(count=>{
    const h=window.__nightfallTest;
    if(!h)throw new Error('Missing local diagnostic hook');
    h.invincible();h.populate(count);
    const before=h.snapshot();
    const started=performance.now();h.advance(5);
    return {before,after:h.snapshot(),durationMs:performance.now()-started};
  },count);
  expect(result.before.enemyCount).toBe(count);
  expect(result.after.enemyCount).toBeLessThanOrEqual(160);
  expect(result.after.elapsed).toBeGreaterThanOrEqual(4.9);
  expect(result.durationMs).toBeLessThan(15000);
  expect(errors).toEqual([]);
});

// Advance the existing game clock in small deterministic steps, not real-time waiting.
test('Nightfall ten-minute combat and five-minute boss spawn',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
  await page.getByRole('button',{name:'생존 시작'}).click();
  const first=await page.evaluate(()=>{
    const h=window.__nightfallTest;h.invincible();h.advance(299);
    return h.snapshot();
  });
  expect(first.elapsed).toBeGreaterThanOrEqual(298);
  expect(first.bossSpawned).toBe(false);
  const second=await page.evaluate(()=>{
    const h=window.__nightfallTest;h.advance(2);return h.snapshot();
  });
  expect(second.bossSpawned).toBe(true);
  expect(second.elapsed).toBeGreaterThanOrEqual(300);
  const third=await page.evaluate(()=>{
    const h=window.__nightfallTest;h.advance(299);return h.snapshot();
  });
  expect(third.elapsed).toBeGreaterThanOrEqual(599);
  expect(third.enemyCount).toBeLessThanOrEqual(161);
  expect(errors).toEqual([]);
});
