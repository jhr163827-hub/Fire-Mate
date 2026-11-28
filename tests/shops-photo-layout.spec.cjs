const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==','base64');
const idb=(page,k)=>page.evaluate(k=>new Promise(ok=>{const q=indexedDB.open('firemate_files_v1');q.onsuccess=()=>{const g=q.result.transaction('certs').objectStore('certs').get(k);g.onsuccess=()=>ok(!!g.result);g.onerror=()=>ok(false)};q.onerror=()=>ok(false)}),k);
const journal=async page=>{await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmJournalOpen').click()};

test('🗂️ 여행 일지: 위에 「가게 기록·여행 추가」 버튼, 지도 아래는 가게·발자국·여행 탭 하나만 펼침(이 탭에서 기억)',async({page})=>{
 await page.addInitScript(()=>{window.__fmJnSegTest=1;if(sessionStorage.qa)return;sessionStorage.qa=1;localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'t1',name:'강릉 바다',from:'2026-10-01',to:'2026-10-02',area:'kr',place:'51150'}]));localStorage.setItem('firemate_travel_shops_v1',JSON.stringify({list:[{id:'s1',name:'연남 손칼국수',kind:'food',place:'11',gu:'마포구',want:false,at:'2026-11-01',visits:[{d:'2026-11-01'}]}]}))});
 await journal(page);
 const acts=page.locator('.fm-jn-acts');await expect(acts.locator('[data-shopadd]')).toHaveText('🍽️ 가게 기록');await expect(acts.locator('#fmJnNewTop')).toBeVisible();
 const mapY=(await page.locator('.fm-jn-mapcard').boundingBox()).y;expect((await acts.boundingBox()).y).toBeLessThan(mapY);
 await expect(page.locator('[data-jnseg="shop"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-shop="s1"]')).toBeVisible();await expect(page.locator('.fm-jn-trip')).toBeHidden();
 await page.locator('[data-jnseg="trip"]').click();await expect(page.locator('.fm-jn-trip')).toBeVisible();await expect(page.locator('[data-shop="s1"]')).toBeHidden();
 await page.locator('#fmJournalOverlay [data-close]').click();await page.locator('#fmJournalOpen').click();await expect(page.locator('[data-jnseg="trip"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-jnseg="shop"]').click();await page.locator('#fmJnNewTop').click();await expect(page.locator('#fmJnAdd')).toBeVisible();await expect(page.locator('#fmJnName')).toBeFocused();
 // 해외 탭엔 가게가 없음
 await page.locator('[data-area="world"]').click();await expect(page.locator('[data-jnseg="shop"]')).toHaveCount(0);await expect(page.locator('.fm-jn-acts [data-shopadd]')).toHaveCount(0);
});

test('📷 가게 사진: 새 가게에 넣으면 같이 저장, 목록에 썸네일, 크게 보고 지우기, 가게를 지우면 사진도 지움 · 사진 ZIP에 「가게/」',async({page})=>{
 await journal(page);await page.locator('.fm-jn-acts [data-shopadd]').click();
 await page.fill('#fmShopPaste','[네이버 지도]\n들안길맛집금등어\n대구 수성구 들안로 57 2층 (상동)\nhttps://naver.me/Ab1');await expect(page.locator('#fmShopWhere')).toContainText('수성구');
 await page.locator('#fmShopPhIn').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:PNG},{name:'b.png',mimeType:'image/png',buffer:PNG}]);
 await expect(page.locator('#fmShopPhs [data-shph]')).toHaveCount(2);await page.locator('#fmShopSheet .primary').click();
 const s=(await st(page,'firemate_travel_shops_v1')).list[0];expect(s.photos).toHaveLength(2);expect(s.photos[0]).toMatch(new RegExp('^shop:'+s.id+':'));expect(await idb(page,s.photos[0])).toBe(true);
 await expect(page.locator('[data-shop] .fm-shop-thumb img')).toHaveAttribute('src',/^blob:/);
 // 열어서 한 장 지우기 → 저장 즉시 반영
 await page.locator('[data-shop]').click();await page.locator('#fmShopPhs [data-shph]').first().click();await page.locator('.fm-jn-view .secondary').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('#fmShopPhs [data-shph]')).toHaveCount(1);expect((await st(page,'firemate_travel_shops_v1')).list[0].photos).toHaveLength(1);expect(await idb(page,s.photos[0])).toBe(false);
 const src=await page.evaluate(async()=>await (await fetch('/index.html')).text());expect(src).toContain("'가게/'+x.name");expect(src).toContain('speak:|shop:|');
 const left=(await st(page,'firemate_travel_shops_v1')).list[0].photos[0];await page.locator('#fmShopDel').click();await page.locator('#fmAskOk').click();
 await expect.poll(()=>idb(page,left)).toBe(false);
});

test('📷 새 가게 창에서 사진만 넣고 닫으면 사진 파일도 남지 않음',async({page})=>{
 await journal(page);await page.locator('.fm-jn-acts [data-shopadd]').click();await page.fill('#fmShopName','임시 가게');
 await page.locator('#fmShopPhIn').setInputFiles([{name:'a.png',mimeType:'image/png',buffer:PNG}]);await expect(page.locator('#fmShopPhs [data-shph]')).toHaveCount(1);
 const k=await page.locator('#fmShopPhs [data-shph]').getAttribute('data-shph');await page.locator('#fmShopX').click();
 await expect.poll(()=>idb(page,k)).toBe(false);expect(await st(page,'firemate_travel_shops_v1')).toBeNull();
});
