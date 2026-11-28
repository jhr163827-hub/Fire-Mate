const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const more=async page=>{await page.goto('/index.html');await page.locator('#settingsBottom').click()};

test('📦 엑셀·ZIP 도구는 앱 안의 파일(외부 CDN 없음), 백업에서 온 위험한 링크는 열리지 않음',async({page})=>{
 await page.goto('/index.html');const src=await page.evaluate(async()=>await (await fetch('/index.html')).text());
 expect(src).not.toContain('cdn.jsdelivr.net');for(const f of ['vendor/zip-2.7.62.min.js','vendor/xlsx-0.18.5.full.min.js']){expect((await page.request.get('/'+f)).ok()).toBe(true)}
 await page.evaluate(()=>localStorage.setItem('firemate_content_v1',JSON.stringify({list:[{id:'c1',title:'수상한 드라마',kind:'drama',status:'doing',link:'javascript:alert(1)',at:1,up:Date.now()}]})));
 await page.locator('#settingsBottom').click();await page.locator('#fmContentOpen').click();await expect(page.locator('#fmLifeBody')).toContainText('수상한 드라마');
 expect(await page.locator('a[href^="javascript"]').count()).toBe(0);
});

test('💚 가고 싶은 장소에 가고 싶은 가게도 보이고, 누르면 여행 일지의 가게 창이 열림',async({page})=>{
 await page.addInitScript(()=>{if(!sessionStorage.qa){sessionStorage.qa=1;localStorage.setItem('firemate_travel_shops_v1',JSON.stringify({list:[{id:'s1',name:'어니언 성수',kind:'cafe',place:'11',gu:'성동구',want:true,at:'2026-11-01',visits:[]}]}))}});
 await more(page);await page.locator('#fmPlaceOpen').click();await expect(page.locator('[data-plshop="s1"]')).toContainText('어니언 성수');
 await page.locator('[data-plshop="s1"]').click();await expect(page.locator('#fmShopSheet')).toBeVisible();await expect(page.locator('#fmShopName')).toHaveValue('어니언 성수');
});

test('🗺️ 한 번 본 동네 지도는 저장돼서 인터넷이 끊겨도 열림',async({page})=>{
 await more(page);await page.locator('#fmJournalOpen').click();await page.locator('#fmJnFind').fill('강릉');await page.locator('[data-hit]').first().click();await page.locator('[data-country^="D"]').click();
 await expect(page.locator('#fmJnBody .fm-jn-map path[data-place]').first()).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>(await (await caches.open('fm-maps-v1')).keys()).map(r=>new URL(r.url).pathname))).toContain('/maps-dong/51150.json');
 await page.route(/maps-dong\//,r=>r.abort());await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmJournalOpen').click();await page.locator('#fmJnFind').fill('강릉');await page.locator('[data-hit]').first().click();await page.locator('[data-country^="D"]').click();
 await expect(page.locator('#fmJnBody .fm-jn-map path[data-place]').first()).toBeVisible();
});

test('📈 3번 넘게 연 도구는 「자주 여는 것」으로 추천되고 바로가기에 넣을 수 있음',async({page})=>{
 await more(page);for(let i=0;i<3;i++){await page.locator('#fmMemoOpen').click();await page.locator('#fmLifeOverlay [data-close]').click()}
 await page.locator('#settingsOverlay [data-close], #settingsOverlay .fm-set-back').first().click().catch(()=>{});await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('.fm-more-sug [data-more-go="fmMemoOpen"]')).toBeVisible();await page.locator('#fmMoreUseAdd').click();
 expect((await st(page,'firemate_more_v1')).fav).toContain('fmMemoOpen');await expect(page.locator('.fm-more-sug')).toHaveCount(0);
});

test('📱 폰에서 확인: 항목마다 확인 결과가 이 폰에 남고, 공유로 열리면 공유 메뉴가 자동 ✅',async({page})=>{
 await page.addInitScript(()=>{window.PublicKeyCredential={isUserVerifyingPlatformAuthenticatorAvailable:async()=>true}});
 await page.goto('/index.html?text='+encodeURIComponent('[네이버 지도]\n테스트 식당\n서울 마포구 연남동 1\nhttps://naver.me/T1'));await expect(page.locator('#fmShopSheet')).toBeVisible();
 expect((await st(page,'firemate_device_v1')).share.ok).toBe(true);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmDeviceOpen').click();await expect(page.locator('#fmLifeHead')).toHaveText('폰에서 확인');
 await page.locator('[data-dev="lock"]').click();await expect(page.locator('.fm-dev')).toContainText('지원해요');
 await page.locator('[data-dev="maps"]').click();await expect(page.locator('.fm-dev')).toContainText('저장');
 const v=await st(page,'firemate_device_v1');expect(v.lock.ok).toBe(true);expect(Object.keys(v)).toEqual(expect.arrayContaining(['share','lock','maps']));
 await page.locator('#fmLifeOverlay [data-close]').click();await expect(page.locator('#fmDeviceSub')).toContainText('✅');
});
