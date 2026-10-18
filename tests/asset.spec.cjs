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
  test('viewport has no horizontal overflow and navigation preserves persisted finance data',async({page})=>{
   await page.goto('/index.html');
   const before=await page.evaluate(()=>localStorage.getItem(K));
   await page.locator('[data-view="assets"]').click();
   for(const id of ['fmAssetQuickAccounts','fmAssetQuickHoldings','fmAssetQuickAnalysis']){
    await page.locator('#'+id).click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow,'horizontal overflow on '+id).toBeLessThanOrEqual(2);
   }
   const after=await page.evaluate(()=>localStorage.getItem(K));
   expect(after).toEqual(before);
  });
  test('dividend rows are accessible when dividend data exists',async({page})=>{
   await page.goto('/index.html');await page.locator('[data-view="assets"]').click();
   await page.locator('#fmAssetQuickDividend').click();
   const row=page.locator('.fm-div-clickable').first();
   if(!(await row.count()))test.skip(true,'No dividend row in clean fixture; seeded dividend navigation test required');
   {
    await expect(row).toHaveAttribute('role','button');
    await expect(row).toHaveAttribute('tabindex','0');
    expect(await row.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
   }
  });
 });
}

test('production finance functions agree with independent reference fixture',async({page})=>{
 await page.goto('/index.html');
 const result=await page.evaluate(()=>{
  const old=data;
  try{
   data={...old,holdings:[
    {id:'qa',accountId:'a',ticker:'QA',type:'USD',qty:2,price:100,cost:80},
    {id:'qb',accountId:'b',ticker:'QA',type:'USD',qty:3,price:100,cost:90},
    {id:'kc',accountId:'b',ticker:'KR',type:'KRW',qty:3,price:10000,cost:9000}
   ],accounts:[{id:'a',amount:5000,fire:true},{id:'b',amount:0,fire:false,items:[{amount:7000}]}],balance:{...old.balance,fx:1400,cash:10000,other:2000,debt:3000}};
   const vals=data.holdings.map(h=>({value:assetValue(h),cost:assetCost(h)}));
   return {vals,net:netAsset(),fire:fireLiquid(),selfTest:fmAssetMathSelfTest()};
  }finally{data=old}
 });
 expect(result.vals).toEqual([{value:280000,cost:224000},{value:420000,cost:378000},{value:30000,cost:27000}]);
 expect(result.net).toBe(751000);
 expect(result.fire).toBe(292000);
 expect(result.selfTest).toBe(true);
});
