const {test,expect}=require('@playwright/test');
const KEY='firemate_arcade_restaurant_v2';
test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const open=async(page,state)=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));Math.random=()=>0.9},{key:KEY,state});await page.goto('/arcade/restaurant.html')};

test('the menu has 13 dishes ordered by level, with new ones locked until their level',async({page})=>{
 await open(page,{coins:500,served:0,level:1,stoves:[null,null],decor:0});
 await page.locator('[data-room-stove="0"]').click();
 const names=await page.locator('#recipeDialog .recipe-choice strong').allTextContents();
 expect(names).toHaveLength(13);
 expect(names.slice(0,3)).toEqual(['주먹밥','김밥','라면']);
 await expect(page.locator('#recipeDialog .recipe-choice',{hasText:'김밥'})).toBeEnabled();
 await expect(page.locator('#recipeDialog .recipe-choice',{hasText:'케이크'})).toBeDisabled();
 await expect(page.locator('#recipeDialog .recipe-art svg')).toHaveCount(13);
 // Starting 김밥 stores its new index and charges its ingredient cost.
 await page.locator('#recipeDialog .recipe-choice',{hasText:'김밥'}).click();
 const s=await read(page);expect(s.stoves[0].recipe).toBe(5);expect(s.coins).toBe(494);
});

test('an older five-dish recipe book keeps working and grows when a new dish is cooked',async({page})=>{
 await page.clock.install();const now=await page.evaluate(()=>Date.now());
 await open(page,{coins:500,served:0,level:1,stoves:[{recipe:5,ends:now-1000},null],decor:0,cookbook:{version:1,recipes:[{completed:4},{completed:0},{completed:0},{completed:0},{completed:0}]}});
 await page.locator('[data-room-stove="0"]').click();
 const s=await read(page);
 expect(s.cookbook.recipes).toHaveLength(13);
 expect(s.cookbook.recipes[0].completed).toBe(4);
 expect(s.cookbook.recipes[5].completed).toBe(1);
 expect(s.service.stock[0].batches[0]).toMatchObject({source:{recipe:5,value:24},total:4,remaining:4,price:6});
});

test('a practised dish sells with a mastery bonus on top of the plate price',async({page})=>{
 await page.clock.install();const now=await page.evaluate(()=>Date.now());
 const book=Array.from({length:11},()=>({completed:0}));book[5].completed=2;
 await open(page,{coins:500,served:0,level:1,stoves:[{recipe:5,ends:now-1000},null],decor:0,cookbook:{version:1,recipes:book}});
 await page.locator('[data-room-stove="0"]').click();
 expect((await read(page)).cookbook.recipes[5].completed).toBe(3);
 await page.clock.runFor(30000);
 const s=await read(page);
 expect(s.served).toBeGreaterThanOrEqual(2);
 // 6 coins a plate + 10% mastery (1 coin) per plate + tips.
 expect(s.coins).toBe(500+s.served*(6+1)+s.guestStats.tips);
 await expect(page.locator('#status')).toContainText('숙련 +1');
});
