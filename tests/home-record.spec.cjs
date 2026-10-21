const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});

for(const [width,height] of [[375,844],[390,844],[430,932]]){
 test('home record button keeps shortcuts in the first screen at '+width,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/index.html');
  const button=page.locator('#view-home .fm-home-budget #fmHomeRecord');
  await expect(button).toBeVisible();
  expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  const nav=await page.locator('.bottomnav').boundingBox();
  for(const id of ['fmMonthlyOpen','fmSpendingOpen']){const b=await page.locator('#'+id).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(nav.y)}
 });
}

test('recording from home saves through the existing dialog and stays on home',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/index.html');
 await page.locator('#fmHomeRecord').click();
 await expect(page.locator('#entryOverlay')).toBeVisible();
 await expect(page.locator('#entryTitle')).toHaveText('거래 기록');
 await page.locator('#entryAmount').fill('12000');
 await page.locator('#saveEntry').click();
 await expect(page.locator('#view-home')).toHaveClass(/active/);
 await expect(page.locator('#heroSpent')).toHaveText('₩12,000');
 const tx=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx);
 expect(tx).toHaveLength(1);
 expect(tx[0]).toMatchObject({type:'expense',amount:12000});
});
