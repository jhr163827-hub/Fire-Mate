const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const open=async page=>{await page.goto('/index.html');await page.evaluate(()=>window.fmGo('firelife'));await page.locator('#fmHealthCalc > summary').click()};
const total=page=>page.locator('#fmHcResult .fm-hc-total strong');

test('income rules: finance under 10M is ignored, public pension counts half',async({page})=>{
 await open(page);
 await page.locator('#fmHc-finance').fill('900');await page.locator('#fmHc-pension').fill('0');await page.locator('#fmHc-other').fill('0');await page.locator('#fmHc-property').fill('0');
 await expect(total(page)).toHaveText('약 0원');
 await expect(page.locator('#fmHcResult')).toContainText('피부양자');
 // 3,000만 원 배당 + 1,200만 원 연금 → 3,600만 원 반영 → 월 300만 원 × 7.19% = 215,700원, 장기요양 13.14% = 28,340원
 await page.locator('#fmHc-finance').fill('3000');await page.locator('#fmHc-pension').fill('1200');
 await expect(page.locator('#fmHcResult')).toContainText('36,000,000원');
 await expect(page.locator('#fmHcResult')).toContainText('215,700원');
 await expect(total(page)).toHaveText('약 244,040원');
 await expect(page.locator('#fmHcResult')).not.toContainText('피부양자');
 // Inputs are remembered.
 await page.reload();await page.evaluate(()=>window.fmGo('firelife'));
 await expect(page.locator('#fmHc-finance')).toHaveValue('3000');
});

test('the result goes into the 생활비 health-insurance field without saving by itself',async({page})=>{
 await open(page);
 await page.locator('#fmHc-finance').fill('3000');await page.locator('#fmHc-pension').fill('0');await page.locator('#fmHc-other').fill('0');await page.locator('#fmHc-property').fill('50000');
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await page.locator('#fmHcApply').click();
 // 3,000만 원 → 월 250만 × 7.19% = 179,750원 + 재산분 50,000원 = 229,750원 → 23만 원
 await expect(page.locator('#fmHealthMonthly')).toHaveValue('23');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('배당 금액 채우기 uses the computed pre-tax payout, not the wording on screen',async({page})=>{
 await open(page);
 const gross=await page.evaluate(()=>window.fmFireViewState?.cashflow?.monthlyGrossIncome);
 expect(gross).toBeGreaterThan(0);
 // Rewording the 생활비 card must not change what gets filled in.
 await page.evaluate(()=>{for(const el of document.querySelectorAll('#fmFireLife *'))if(el.childElementCount===0&&/세전/.test(el.textContent))el.textContent='표시 문구 변경'});
 await page.locator('#fmHcFill').click();
 await expect(page.locator('#fmHc-finance')).toHaveValue(String(Math.round(gross*12)));
});
