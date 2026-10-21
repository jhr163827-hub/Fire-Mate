const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
const overlap=(a,b)=>a&&b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
for(const [width,height] of [[667,375],[844,390],[915,412]]){
 test('landscape '+width+'x'+height+': panels stay off the stoves and dock labels fit on one line',async({browser})=>{
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto('/arcade/restaurant.html');
  await expect(page.locator('[data-room-stove="0"]')).toBeVisible();
  const panels=await Promise.all(['.chef-card','.restaurant-hud','.restaurant-status','.restaurant-about','#roomDock'].map(s=>page.locator(s).boundingBox()));
  for(const stove of ['0','1']){const box=await page.locator('[data-room-stove="'+stove+'"] .room-stove-badge-bg').boundingBox();for(const p of panels)expect(overlap(p,box),'panel over stove '+stove).toBe(false)}
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++)expect(overlap(panels[i],panels[j]),'panels '+i+'/'+j).toBe(false);
  for(const id of ['openKitchen','openFurniture','roomEdit','openExpansion']){const b=page.locator('#'+id);expect(await b.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44)}
  await expect(page.locator('#openKitchen')).toHaveAccessibleName('요리 목록');
  // Empty counters carry no "0접시" badge.
  await expect(page.locator('.room-stock-badge:not(.empty)')).toHaveCount(0);
  await ctx.close();
 });
}
