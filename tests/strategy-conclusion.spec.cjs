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
  surplus>=0?'배당만으로 살면 1년 생활비를 내고도 '+won(surplus)+'이 남아요.':'배당만으로 살면 1년 생활비가 '+won(surplus)+' 모자라요.',
  (diff>0?'필요한 만큼 팔아 쓰면 ':'배당만으로 살면 ')+'1년 뒤 자산이 '+won(diff)+' 더 남아요.'
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
  '10년 뒤 남는 자산 · 배당만 '+won(dividend)+' · 팔아 쓰기 '+won(sale),
  (diff>0?'필요한 만큼 팔아 쓰면 ':'배당만으로 살면 ')+'10년 뒤 자산이 '+won(diff)+' 더 남아요.'
 ]);
 await page.locator('#fmStrModeQuick').click();
 await expect(box.locator('p').first()).toContainText('1년 생활비');
});
