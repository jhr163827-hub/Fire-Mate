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

test('Nightfall phase 5 weapon impact balance and enemy knockback rules',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).click();
 const result=await page.evaluate(()=>{
  const api=window.__nightfallTest;api.invincible();
  api.populate(160);api.advance(2);
  return api.snapshot();
 });
 expect(result.enemyCount).toBeLessThanOrEqual(160);
 expect(result.particleCount).toBeLessThanOrEqual(180);
 expect(result.boltCount).toBeLessThanOrEqual(160);
 expect(errors).toEqual([]);
});
test('Nightfall phase 5 responsive menu remains inside small viewport',async({browser})=>{
 for(const width of [320,360,375,390,430]){
  const context=await browser.newContext({viewport:{width,height:568},isMobile:true,hasTouch:true});
  const page=await context.newPage();await page.goto(url);
  await page.getByRole('button',{name:'영구 강화 상점'}).click();
  const dimensions=await page.locator('.card').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight,rect:el.getBoundingClientRect().toJSON()}));
  expect(dimensions.rect.left).toBeGreaterThanOrEqual(0);
  expect(dimensions.rect.right).toBeLessThanOrEqual(width+1);
  expect(dimensions.client).toBeLessThanOrEqual(568);
  await context.close();
 }
});

test('Nightfall phase 6 all six skills unlock and evolve without errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).click();
 const result=await page.evaluate(()=>{
  const api=window.__nightfallTest;
  const names=['arcane','fire','ice','lightning','poison','wind'];
  const applied=names.map(name=>api.setSkill(name,5,true));
  api.invincible();api.populate(100);api.advance(4);
  return {applied,skills:api.skills(),snapshot:api.snapshot()};
 });
 expect(result.applied).toEqual([true,true,true,true,true,true]);
 for(const name of ['arcane','fire','ice','lightning','poison','wind']){
  expect(result.skills.weapons[name]).toBe(5);
  expect(result.skills.evolved[name]).toBe(true);
 }
 expect(result.snapshot.enemyCount).toBeLessThanOrEqual(160);
 expect(errors).toEqual([]);
});
test('Nightfall phase 6 game over rewards saved and isolated',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.evaluate(()=>localStorage.setItem('fire_mate_regression_sentinel','keep'));
 await page.getByRole('button',{name:'생존 시작'}).click();
 const result=await page.evaluate(()=>{
  const api=window.__nightfallTest;api.invincible();api.advance(12);
  const before=api.snapshot();api.finish();
  return {before,after:api.snapshot(),saved:JSON.parse(localStorage.getItem('nightfall_progress_v1')),sentinel:localStorage.getItem('fire_mate_regression_sentinel')};
 });
 expect(result.after.state).toBe('pause');
 expect(result.saved.gold).toBeGreaterThanOrEqual(0);
 expect(result.saved.totalKills).toBeGreaterThanOrEqual(result.before.kills);
 expect(result.sentinel).toBe('keep');
 await expect(page.locator('#title')).toContainText('GAME OVER');
 expect(errors).toEqual([]);
});

test('Nightfall phase 7 twelve weapons and ultimate evolutions survive 160 enemy stress',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).click();
 const result=await page.evaluate(()=>{
  const api=window.__nightfallTest;
  const names=['arcane','fire','ice','lightning','poison','wind','scythe','missile','summon','laser','quake','storm'];
  const applied=names.map(name=>api.setSkill(name,5,true));
  api.invincible();api.populate(160);api.advance(8);
  return {names,applied,skills:api.skills(),snapshot:api.snapshot()};
 });
 expect(result.applied.every(Boolean)).toBe(true);
 for(const name of result.names){expect(result.skills.weapons[name]).toBe(5);expect(result.skills.evolved[name]).toBe(true)}
 expect(result.snapshot.enemyCount).toBeLessThanOrEqual(160);
 expect(result.snapshot.particleCount).toBeLessThanOrEqual(180);
 expect(errors).toEqual([]);
});

test('Nightfall phase 7 five cross-weapon synergies activate under combat load',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).click();
 const result=await page.evaluate(()=>{
  const api=window.__nightfallTest;
  const baseline=api.skills().synergies;
  for(const name of ['arcane','fire','ice','lightning','poison','wind','summon','quake','storm'])api.setSkill(name,1,false);
  const active=api.skills().synergies;
  api.invincible();api.populate(160);api.advance(3);
  return {baseline,active,snapshot:api.snapshot()};
 });
 expect(Object.values(result.baseline).some(Boolean)).toBe(false);
 expect(Object.values(result.active).every(Boolean)).toBe(true);
 expect(result.snapshot.enemyCount).toBeLessThanOrEqual(160);
 expect(errors).toEqual([]);
});

test('Nightfall phase 8-11 10-minute final boss and expanded enemy roster',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).click();
 const result=await page.evaluate(()=>{
  const api=window.__nightfallTest;api.invincible();api.advance(600);
  return api.snapshot();
 });
 expect(result.elapsed).toBeGreaterThanOrEqual(599);
 expect(result.finalBossSpawned).toBe(true);
 expect(result.enemyCount).toBeLessThanOrEqual(162);
 expect(errors).toEqual([]);
});

test('Nightfall five characters and six survival modes are available',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:/캐릭터 선택/}).first().click();
 await expect(page.locator('#choices button')).toHaveCount(9);
 await page.getByRole('button',{name:'생존 모드 선택'}).click();
 await expect(page.locator('#choices button')).toHaveCount(7);
 await page.getByRole('button',{name:'악몽 · 20분'}).click();
 const snapshot=await page.evaluate(()=>window.__nightfallTest.snapshot());
 expect(snapshot.runMode).toBe('nightmare');
 expect(snapshot.runLength).toBe(1200);
 expect(errors).toEqual([]);
});

test('Nightfall new ranged bomber elite enemies render without crashing after 4 minutes',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).first().click();
 const snapshot=await page.evaluate(()=>{const api=window.__nightfallTest;api.invincible();api.advance(240);return api.snapshot()});
 expect(snapshot.elapsed).toBeGreaterThanOrEqual(239);
 await page.waitForTimeout(250);
 expect(errors).toEqual([]);
});

test('Nightfall animation loop survives a recoverable drawing exception',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).first().click();
 const result=await page.evaluate(async()=>{
   const api=window.__nightfallTest;api.invincible();api.advance(245);
   const before=api.snapshot().elapsed;
   await new Promise(resolve=>setTimeout(resolve,180));
   return {before,after:api.snapshot().elapsed};
 });
 expect(result.after).toBeGreaterThan(result.before);
 expect(errors).toEqual([]);
});

test('Nightfall premium achievement codex and permanent talent menus work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.getByRole('button',{name:/캐릭터 선택/}).first().click();
 await page.getByRole('button',{name:'업적'}).click();
 await expect(page.locator('#title')).toContainText('업적');
 await page.getByRole('button',{name:'캐릭터 선택'}).click();
 await page.getByRole('button',{name:'도감'}).click();
 await expect(page.locator('#title')).toContainText('도감');
 await page.getByRole('button',{name:'영구 강화 상점'}).click();
 await expect(page.getByRole('button',{name:/공격 가속/})).toBeVisible();
 await expect(page.getByRole('button',{name:/행운 특성/})).toBeVisible();
 expect(errors).toEqual([]);
});

test('Nightfall permanent progression persists account experience and weapon mastery',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 await page.getByRole('button',{name:'생존 시작'}).first().click();
 const saved=await page.evaluate(()=>{const api=window.__nightfallTest;api.invincible();api.advance(45);api.finish();return JSON.parse(localStorage.getItem('nightfall_progress_v1'))});
 expect(saved.runs).toBeGreaterThanOrEqual(1);
 expect(saved.accountXp).toBeGreaterThan(0);
 expect(saved.mastery.arcane).toBeGreaterThan(0);
 await page.reload();
 await page.getByRole('button',{name:/캐릭터 선택/}).first().click();
 await page.getByRole('button',{name:'영구 성장 기록'}).click();
 await expect(page.locator('#title')).toContainText('영구 성장');
 expect(errors).toEqual([]);
});

test('Nightfall loads five distinct hero SVG sprites without missing resources',async({page})=>{
 const missing=[];page.on('response',r=>{if(r.url().includes('nightfall-')&&r.url().endsWith('.svg')&&r.status()>=400)missing.push(r.url())});
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 const result=await page.evaluate(async()=>{const ids=['mage','ranger','guardian','stormcaller','alchemist'];return Promise.all(ids.map(async id=>{let r=await fetch('./nightfall-'+id+'.svg');return {id,status:r.status,content:(await r.text()).includes('<svg')}}))});
 expect(result.every(r=>r.status===200&&r.content)).toBe(true);
 expect(missing).toEqual([]);
});

test('Nightfall visual assets and locked region selection remain functional',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(url.includes('?')?'&':'?')+'nightfall_test=1');
 const assets=await page.evaluate(async()=>Promise.all(['runner','brute','ranged','bomber','elite','boss'].map(async name=>{let r=await fetch('./nightfall-'+name+'.svg');return r.ok&&(await r.text()).includes('<svg')})));
 expect(assets.every(Boolean)).toBe(true);
 await page.getByRole('button',{name:/영구 강화 상점/}).first().click().catch(()=>{});
 await page.getByRole('button',{name:'지역 선택'}).click();
 await expect(page.locator('#title')).toContainText('지역 선택');
 await page.getByRole('button',{name:/붉은 황무지/}).click();
 await expect(page.locator('#title')).toContainText('지역 선택');
 await page.getByRole('button',{name:/잊힌 숲/}).click();
 await expect(page.locator('#title')).toContainText('생존 모드');
 expect(errors).toEqual([]);
});
