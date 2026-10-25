const {test,expect}=require('@playwright/test');
const KEY='firemate_arcade_restaurant_v2';
test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function open(page,state){
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.clock.install();const now=await page.evaluate(()=>Date.now());
 await page.addInitScript(({key,state,now})=>{Math.random=()=>0.9;if(state&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(typeof state==='function'?state(now):{...state,stoves:state.stoves.map(j=>j&&{...j,ends:now+j.ends})}))},{key:KEY,state,now});
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
