const {test,expect}=require('@playwright/test');
for(const width of [320,360,390,430]){
 test.describe('mobile '+width,()=>{
  test.use({viewport:{width,height:850},isMobile:true,hasTouch:true});
  test('loads and switches asset tabs without losing navigation',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('/index.html');
   await expect(page.locator('#view-home')).toHaveClass(/active/);
   await page.locator('[data-view="assets"]').click();
   const ids=['fmAssetQuickAccounts','fmAssetQuickHoldings','fmAssetQuickDividend','fmAssetQuickAnalysis'];
   for(const id of [...ids,...ids]){
    await page.locator('#'+id).click();
    await expect(page.locator('#'+id)).toHaveAttribute('aria-pressed','true');
    for(const navId of ids)await expect(page.locator('#'+navId)).toBeVisible();
   }
   expect(errors).toEqual([]);
  });
  test('dividend rows are accessible when dividend data exists',async({page})=>{
   await page.goto('/index.html');await page.locator('[data-view="assets"]').click();
   await page.locator('#fmAssetQuickDividend').click();
   const row=page.locator('.fm-div-clickable').first();
   if(await row.count()){
    await expect(row).toHaveAttribute('role','button');
    await expect(row).toHaveAttribute('tabindex','0');
    expect(await row.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
   }
  });
 });
}
