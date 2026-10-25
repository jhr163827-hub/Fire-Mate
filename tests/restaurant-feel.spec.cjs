const {test,expect}=require('@playwright/test');
const KEY='firemate_arcade_restaurant_v2';
test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function open(page,state){
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.clock.install();const now=await page.evaluate(()=>Date.now());
 await page.addInitScript(({key,state,now})=>{Math.random=()=>0.9;if(state&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({...state,stoves:state.stoves.map(j=>j&&{...j,ends:now+j.ends})}))},{key:KEY,state,now});
 await page.goto('/arcade/restaurant.html');
}
test('a new player is coached from the first stove to the first sale, and can dismiss it for good',async({page})=>{
 await open(page);
 const coach=page.locator('#restaurantCoach');
 await expect(coach).toContainText('조리대를 눌러 첫 요리를 시작해요');
 await expect(page.locator('[data-room-stove="0"]')).toHaveClass(/coach-target/);
 await page.locator('[data-room-stove="0"]').click();await page.locator('#recipeDialog .recipe-choice').first().click();
 await expect(coach).toContainText('요리 중이에요');
 await page.clock.runFor(120000);
 await expect(coach).toContainText('완성됐어요');
 await page.locator('#restaurantCoachClose').click();
 await expect(coach).toBeHidden();
 await page.reload();await expect(coach).toBeHidden();
});
test('a paying guest pops coins and a heart; a level-up shows the banner; sound can be muted and stays muted',async({page})=>{
 await open(page,{coins:500,served:5,level:1,stoves:[{recipe:0,ends:-1000},null],decor:0,growth:{version:1,xp:3}});
 await expect(page.locator('#restaurantCoach')).toBeHidden();
 await page.locator('[data-room-stove="0"]').click();
 let popped=false;for(let t=0;t<40&&!popped;t++){await page.clock.runFor(500);popped=await page.locator('#roomFx .room-fx-coin').count()>0}
 expect(popped).toBe(true);
 await expect(page.locator('#roomFx .room-fx-heart')).toHaveCount(1);
 await expect(page.locator('#restaurantLevelUp')).toContainText('셰프 Lv2!');
 expect((await read(page)).growth.xp).toBe(4);
 const sound=page.locator('#restaurantSound');
 await expect(sound).toHaveAttribute('aria-pressed','true');
 await sound.click();await expect(sound).toHaveAttribute('aria-pressed','false');
 await page.reload();await expect(page.locator('#restaurantSound')).toHaveText('🔇');
});
test('오늘의 주문 count sales and tips and pay out once; 만두 pays for time away once',async({page})=>{
 test.setTimeout(90000);// a minute of game time on the fake clock takes ~20s of real time
 await open(page,{coins:500,served:5,level:1,stoves:[{recipe:0,ends:-1000},{recipe:1,ends:-1000}],decor:0});
 // Leaving the page stamps the time, so the 2-hour gap is planted as the next page starts.
 await page.addInitScript(()=>{if(sessionStorage.getItem('away'))return;sessionStorage.setItem('away','1');localStorage.setItem('firemate_restaurant_idle_v1',JSON.stringify({at:Date.now()-2*3600e3,pending:0}))});await page.reload();
 await expect(page.locator('#restaurantAway')).toContainText('만두가 36코인을 모았어요');
 await page.locator('#restaurantAwayTake').click();
 expect((await read(page)).coins).toBe(536);
 await page.reload();await expect(page.locator('#restaurantAway')).toBeHidden();
 await page.locator('[data-room-stove="0"]').click();await page.locator('[data-room-stove="1"]').click();
 await page.clock.runFor(60000);
 await page.locator('#openGoals').click();
 const sell=page.locator('.goal-row',{hasText:'8접시 팔기'});
 await expect(sell).toContainText('8/8');
 const before=(await read(page)).coins;
 await sell.locator('button').click();
 await expect(sell).toHaveClass(/done/);
 expect((await read(page)).coins).toBe(before+30);
 await expect(page.locator('.goal-path span.on')).toHaveCount(2);
});
test('wallpaper and floor themes are bought once, change the room and raise the shop score',async({page})=>{
 await open(page,{coins:300,served:5,level:1,stoves:[null,null],decor:0});
 await page.locator('#openFurniture').click();
 await expect(page.locator('#themeShop')).toContainText('가게 점수 0');
 await page.locator('[data-theme-id="lemon"]').click();
 expect((await read(page)).coins).toBe(180);
 await expect(page.locator('#themeShop')).toContainText('가게 점수 20 · VIP 손님 +2%');
 await expect(page.locator('#leftWall stop').first()).toHaveAttribute('stop-color','#fff0b8');
 await page.locator('[data-theme-id="basic"]').click();await page.locator('[data-theme-id="lemon"]').click();
 expect((await read(page)).coins).toBe(180);
 await expect(page.locator('[data-theme-id="cherry"]')).toBeEnabled();
 await page.locator('[data-theme-id="cherry"]').click();
 expect((await read(page)).coins).toBe(0);
 await expect(page.locator('[data-theme-id="tile"]')).toBeDisabled();
});
test('chef levels go past Lv4 and each adds 2% to plates sold, shown on the level path',async({page})=>{
 await open(page,{coins:500,served:300,level:5,stoves:[{recipe:2,ends:-1000},null],decor:0,growth:{version:1,xp:200}});
 await expect(page.locator('#chefLevel')).toHaveText('셰프 Lv10');
 await page.locator('[data-room-stove="0"]').click();
 let seen=false;for(let t=0;t<40&&!seen;t++){await page.clock.runFor(500);seen=/레벨 \+1/.test(await page.locator('#status').textContent())}
 expect(seen).toBe(true);
 await page.locator('#openGoals').click();
 await expect(page.locator('.goal-path span')).toHaveCount(10);
 await expect(page.locator('.goal-path span').last()).toContainText('Lv10💰+12%');
});
