const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('settings list 내 데이터 → 화면(새 화면 스위치 포함) → 연동 → 가져오기·내보내기 → 게임 → 초기화',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 const order=await page.evaluate(()=>[...document.querySelector('#settingsOverlay .stack').children].filter(e=>!e.hidden&&e.getClientRects().length).map(e=>
  e.matches('.fm-device-storage')?'data':e.matches('.fm-settings-theme')?'theme':e.matches('.fm-v2-switch')?'new-ui':e.id==='fmArcadeOpen'?'arcade':e.querySelector(':scope>summary')?.textContent.trim()));
 expect(order).toEqual(['data','theme','new-ui','📡 시세 · 환율 연동','📥 가져오기 · 내보내기','arcade','⚠️ 데이터 초기화']);
 // Every backup action is visible without opening a fold.
 for(const id of ['export','exportShare','fmBackupStatus','importBtn'])await expect(page.locator('.fm-device-storage #'+id)).toBeVisible();
 await expect(page.locator('#settingsOverlay details.fm-settings-group[open]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
