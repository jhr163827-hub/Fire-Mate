const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});

for(const [width,height] of [[375,844],[390,844],[430,932]]){
 test('home import button keeps shortcuts in the first screens at '+width,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/index.html');
  const button=page.locator('#view-home .fm-home-budget #fmHomeSync');
  await expect(button).toBeVisible();
  expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#fmHomeRecord')).toHaveCount(0);
 });
}

test('a manual entry is still possible from 가계부 and shows on home',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.locator('#fmLedgerAddBtn').click();
 await expect(page.locator('#entryOverlay')).toBeVisible();
 await page.locator('#entryAmount').fill('12000');
 await page.locator('#saveEntry').click();
 await page.evaluate(()=>window.fmGo('home'));
 await expect(page.locator('#heroSpent')).toHaveText('₩12,000');
 const tx=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx);
 expect(tx).toHaveLength(1);
 expect(tx[0]).toMatchObject({type:'expense',amount:12000});
});
