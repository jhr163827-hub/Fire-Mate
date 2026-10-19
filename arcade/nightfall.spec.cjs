const {test,expect}=require('@playwright/test');
// Serve repository root over HTTP, e.g. python3 -m http.server 4173
const url=process.env.NIGHTFALL_URL||'http://127.0.0.1:4173/arcade/nightfall.html';
for(const width of [320,360,390,430])test('Nightfall mobile '+width,async({browser})=>{
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