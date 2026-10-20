const {test,expect}=require('@playwright/test');
const text=locator=>locator.evaluateAll(lines=>lines.map(line=>line.textContent.replace(/ /g,' ')));
const won=man=>{const v=Math.round(Math.abs(man)),e=Math.floor(v/10000),m=v%10000;return (e?e+'억 ':'')+(m?m.toLocaleString('ko-KR')+'만 ':'')+(e||m?'원':'0원')};
test.use({viewport:{width:320,height:800},isMobile:true,hasTouch:true});
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});

test('strategy card opens with a takeaway that matches the published comparison',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/index.html');
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await page.evaluate(()=>window.fmGo('retire'));
 const box=page.locator('#fmStrategyConclusion');
 await expect(box).toBeVisible();
 expect(await box.evaluate(el=>el.previousElementSibling.tagName)).toBe('H3');
 const q=await page.evaluate(()=>window.fmFireViewState.quick);
 const surplus=q.net-q.spend,diff=q.saleEnd-q.dividendEnd;
 expect(await text(box.locator('p'))).toEqual([
  surplus>=0?'세후 배당만으로 1년 생활비를 채우고 '+won(surplus)+'이 남아요.':'세후 배당은 1년 생활비보다 '+won(surplus)+' 부족해요.',
  '1년 후 남는 자산은 '+(diff>0?'자가배당':'배당 FIRE')+'이 '+won(diff)+' 더 많아요.'
 ]);
 // Each amount stays on one line inside the takeaway.
 for(const line of await box.locator('p').all())expect(await line.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
 expect(errors).toEqual([]);
});

test('long comparison takeaway waits for a result and follows mode changes',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('retire'));
 const box=page.locator('#fmStrategyConclusion');
 await page.locator('#fmStrModeDetail').click();
 await expect(box).toBeHidden();
 await page.evaluate(()=>{const fold=document.getElementById('fmStrategyDetails');if(!fold.open)fold.querySelector(':scope>summary').click()});
 await page.locator('#fmQuickBudget').fill('200000');
 await page.locator('#fmStrYears').evaluate(e=>e.value='10');
 const prices=page.locator('[data-fms-type="div"][data-fms-field="currentPrice"]');
 await prices.nth(0).fill('100');await prices.nth(1).fill('50');
 await page.locator('#fmStrRun').click();
 await expect(box).toBeVisible();
 const d=await page.evaluate(()=>window.fmFireViewState.detail);
 const [dividend,sale]=d.balances,diff=sale-dividend;
 expect(await text(box.locator('p'))).toEqual([
  '10년 후 배당 FIRE '+won(dividend)+' · 자가배당 '+won(sale),
  '10년 후 남는 자산은 '+(diff>0?'자가배당':'배당 FIRE')+'이 '+won(diff)+' 더 많아요.'
 ]);
 await page.locator('#fmStrModeQuick').click();
 await expect(box.locator('p').first()).toContainText('1년 생활비');
});
