const {test,expect}=require('@playwright/test');
// These ledgers predate guest tips and patience (v1.11); run them under the classic guest rules.
const CLASSIC=()=>{window.__restaurantClassicGuests=true};let restoreContext;
test.beforeEach(async({browser,context})=>{await context.addInitScript(CLASSIC);const original=browser.newContext;browser.newContext=async function(...args){const created=await original.apply(this,args);await created.addInitScript(CLASSIC);return created};restoreContext=()=>{browser.newContext=original}});
test.afterEach(()=>restoreContext?.());
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const key='firemate_arcade_restaurant_v2';
const base={coins:500,served:0,level:2,stoves:[null,null],decor:0,custom:{untouched:true}};
test('seat kit purchase is atomic, unique and keeps unrelated records',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,base})=>{localStorage.setItem(key,JSON.stringify(base));localStorage.setItem('firemate-test-keep','yes')},{key,base});
 await page.goto('/arcade/restaurant.html');
 await page.locator('#openFurniture').click();
 await page.locator('[data-seat-action="buy"]').click();
 let d=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 expect(d.coins).toBe(380);expect(d.seating).toMatchObject({version:1,owned:true,location:'warehouse'});
 expect(d.custom).toEqual(base.custom);
 expect(await page.locator('[data-seat-action="buy"]').count()).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('firemate-test-keep'))).toBe('yes');
 expect(errors).toEqual([]);
});
test('seat kit is locked at level one and old service remains unchanged',async({page})=>{
 await page.addInitScript(({key})=>localStorage.setItem(key,JSON.stringify({coins:500,served:0,level:1,stoves:[null,null],decor:0})),{key});
 await page.goto('/arcade/restaurant.html');
 await page.locator('#openFurniture').click();
 await expect(page.locator('[data-seat-action="buy"]')).toBeDisabled();
 const d=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 expect(d.seating).toBeUndefined();
});
test('seat kit placement adds third table and third service slot without replacing old guests',async({page})=>{
 const state={...base,service:{version:3,stock:[null,null],guests:[{id:'old-guest',counter:0,table:0,phase:'eating',paid:true,batch:{id:'old',recipe:0,value:12}},null]}};
 await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});
 await page.goto('/arcade/restaurant.html');await page.locator('#openFurniture').click();await page.locator('[data-seat-action="buy"]').click();
 await page.locator('[data-seat-action="place"]').click();
 const d=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 expect(d.seating.location).toBe('placed');
 expect(d.service.guests).toHaveLength(3);
 expect(d.service.guests[0]).toEqual(state.service.guests[0]);
 await expect(page.locator('[data-room-item="table-2"]')).toHaveCount(1);
 await expect(page.locator('[data-room-item="chair-4"]')).toHaveCount(1);
});
