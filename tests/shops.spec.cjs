const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return ds(d)};
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const journal=async page=>{await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmJournalOpen').click();await expect(page.locator('.fm-shops')).toBeVisible()};
const NAVER='[네이버 지도]\n연남 손칼국수\n서울 마포구 연남동 224-1\nhttps://naver.me/AbCd123';

test('🍽️ 네이버지도 공유 글 → 이름·주소·링크·동네(연남동) 자동, 종류 추정, 방문 저장 → 지도 칠하기·핀, 같은 가게 다른 날은 방문 추가',async({page})=>{
 await journal(page);await page.locator('[data-shopadd]').click();
 await page.fill('#fmShopPaste',NAVER);
 await expect(page.locator('#fmShopName')).toHaveValue('연남 손칼국수');await expect(page.locator('#fmShopAddr')).toHaveValue('서울 마포구 연남동 224-1');
 await expect(page.locator('#fmShopWhere')).toHaveText('📍 마포구 연남동');await expect(page.locator('[data-kind="food"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#fmShopSheet [data-w="couple"]').click();await page.fill('#fmShopRate','4');await page.fill('#fmShopMemo','면이 쫄깃');await page.fill('#fmShopDate',day(-3));
 await page.locator('#fmShopSheet .primary').click();
 const s=(await st(page,'firemate_travel_shops_v1')).list[0];
 expect(s).toMatchObject({name:'연남 손칼국수',url:'https://naver.me/AbCd123',src:'naver',kind:'food',place:'11',gu:'마포구',dong:'연남동',want:false,visits:[{d:day(-3),with:'couple',rate:4,memo:'면이 쫄깃'}]});
 const m=await st(page,'firemate_travel_map_v1');expect(m.kr['11']).toBe(1);expect(m.sub.D11[s.dongc]).toBe(1);expect(Object.values(m.sub.K11)).toContain(1);
 await expect(page.locator('circle.fm-jn-dot.shop')).toHaveCount(1);
 await expect(page.locator('[data-shop]')).toContainText('연남 손칼국수');await expect(page.locator('[data-shop]')).toContainText('★4.0');await expect(page.locator('[data-shop]')).toContainText('면이 쫄깃');
 await expect(page.locator('.fm-shop-go')).toHaveAttribute('href','https://naver.me/AbCd123');await expect(page.locator('#fmJournalSub')).toContainText('가게 1곳');
 // Same shop again (another share link, same name·address): asked, then a second visit on the same shop.
 await page.locator('[data-shopadd]').click();await page.fill('#fmShopPaste',NAVER.replace('AbCd123','Zz999'));await page.locator('#fmShopSheet .primary').click();
 await expect(page.locator('#fmAskOk')).toHaveText('방문 추가');await page.locator('#fmAskOk').click();
 let l=(await st(page,'firemate_travel_shops_v1')).list;expect(l).toHaveLength(1);expect(l[0].visits.map(v=>v.d)).toEqual([day(-3),day(0)]);
 await expect(page.locator('[data-shop]')).toContainText('2번');
 // The same day twice is refused.
 await page.locator('[data-shopadd]').click();await page.fill('#fmShopPaste',NAVER);await page.locator('#fmShopSheet .primary').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('#toast')).toContainText('그날은 이미 기록했어요');expect((await st(page,'firemate_travel_shops_v1')).list[0].visits).toHaveLength(2);
 // Open it: both visits listed, a visit can be removed, the shop deleted.
 await page.locator('#fmShopX').click();await page.locator('[data-shop]').click();await expect(page.locator('.fm-shop-v')).toHaveCount(2);await expect(page.locator('.fm-shop-open')).toHaveAttribute('href','https://naver.me/AbCd123');
 await page.locator('.fm-shop-v [data-vdel]').first().click();await page.locator('#fmAskOk').click();await expect(page.locator('.fm-shop-v')).toHaveCount(1);
 await page.locator('#fmShopDel').click();await page.locator('#fmAskOk').click();expect((await st(page,'firemate_travel_shops_v1')).list).toHaveLength(0);
});

test('🍽️ 카카오맵 공유 · 가고 싶어요 → 다녀왔어요, 종류 칩·동네로 거르기, 링크만이면 미리보기 함수로 이름 채우기',async({page})=>{
 await page.addInitScript(()=>{window.__fmPlaceTest=1});
 await page.route(/fire-mate-627\.pages\.dev\/api\/place/,r=>r.fulfill({json:{url:'https://place.map.kakao.com/777',src:'kakao',pid:'777',name:'해운대 이자카야',addr:'부산 해운대구 우동 1394',cat:'술집'}}));
 await journal(page);await page.locator('[data-shopadd]').click();
 await page.fill('#fmShopPaste','[카카오맵] 어니언 성수\n서울 성동구 아차산로9길 8\nhttps://place.map.kakao.com/12345');
 await expect(page.locator('#fmShopName')).toHaveValue('어니언 성수');await page.locator('[data-kind="cafe"]').click();await page.locator('[data-want="1"]').click();await expect(page.locator('#fmShopVisit')).toBeHidden();
 await page.locator('#fmShopSheet .primary').click();
 expect((await st(page,'firemate_travel_shops_v1')).list[0]).toMatchObject({kind:'cafe',want:true,pid:'12345',src:'kakao',place:'11',gu:'성동구',visits:[]});
 await expect(page.locator('.fm-shop-sub')).toContainText('가고 싶은 가게 1');
 // A bare short link: the preview function fills the rest.
 await page.locator('[data-shopadd]').click();await page.fill('#fmShopPaste','https://kko.to/xYz');
 await expect(page.locator('#fmShopName')).toHaveValue('해운대 이자카야');await expect(page.locator('[data-kind="bar"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#fmShopWhere')).toContainText('해운대구');
 await page.locator('#fmShopSheet .primary').click();
 const l=(await st(page,'firemate_travel_shops_v1')).list;expect(l[1]).toMatchObject({url:'https://place.map.kakao.com/777',pid:'777',place:'26',kind:'bar'});
 // Kind chips filter; picking 부산 on the map narrows to it.
 await page.locator('[data-shopk="bar"]').click();await expect(page.locator('[data-shop]')).toHaveCount(1);await page.locator('[data-shopk=""]').click();
 await page.locator('circle.fm-jn-dot.shop:not(.want)').dispatchEvent('click');await expect(page.locator('.fm-shop-h p')).toContainText('여기서 간 가게 1곳');await expect(page.locator('[data-shop]')).toHaveCount(1);
 // 가고 싶은 가게 → 다녀왔어요.
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmJournalOpen').click();
 await page.locator('[data-shop="'+l[0].id+'"]').click();await page.locator('#fmShopVAdd').click();await page.fill('#fmShopRate','4.7');await expect(page.locator('#fmShopRateV')).toHaveText('4.7점');await page.locator('#fmShopSheet .primary').click();
 expect((await st(page,'firemate_travel_shops_v1')).list[0]).toMatchObject({want:false,visits:[{d:day(0),rate:4.7}]});
});

test('🍽️ 안드로이드 공유로 열면 가게 추가 창이 채워져 열리고, 링크 중복 · 이름 없이는 저장 안 함 · 백업에 들어감',async({page})=>{
 await page.goto('/index.html?text='+encodeURIComponent('[네이버 지도]\n성수 커피 로스터스\n서울 성동구 성수동2가 300\nhttps://naver.me/Kp1'));
 await expect(page.locator('#fmShopSheet')).toBeVisible();await expect(page.locator('#fmShopName')).toHaveValue('성수 커피 로스터스');await expect(page.locator('[data-kind="cafe"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#fmShopWhere')).toContainText('성동구');expect(new URL(page.url()).search).toBe('');
 await page.locator('[data-want="1"]').click();await page.locator('#fmShopSheet .primary').click();
 await page.locator('[data-shopadd]').click();await page.fill('#fmShopPaste','https://naver.me/Kp1');await page.locator('[data-want="1"]').click();await page.locator('#fmShopSheet .primary').click();
 await expect(page.locator('#toast')).toContainText('이미 있어요');expect((await st(page,'firemate_travel_shops_v1')).list).toHaveLength(1);await expect(page.locator('#fmShopVAdd')).toBeVisible();
 await page.locator('#fmShopX').click();await page.locator('[data-shopadd]').click();await page.fill('#fmShopPaste','https://naver.me/Kp1');await page.locator('#fmShopSheet .primary').click();
 await expect(page.locator('#fmAskText')).toContainText('이미 있어요');await page.locator('#fmAskOk').click();
 expect((await st(page,'firemate_travel_shops_v1')).list).toMatchObject([{want:false,visits:[{d:day(0)}]}]);await page.locator('[data-shopadd]').click();await page.locator('#fmShopSheet .primary').click();await expect(page.locator('#toast')).toContainText('이름이나 링크');
 const src=await page.evaluate(async()=>await (await fetch('/index.html')).text()),ex=src.slice(src.indexOf('FM_BACKUP_EXTRAS='),src.indexOf('FM_BACKUP_FLAGS='));expect(ex).toContain('firemate_travel_shops_v1');
 const mf=await page.evaluate(async()=>await (await fetch('/manifest.webmanifest')).json());expect(mf.share_target).toMatchObject({action:'./index.html',method:'GET'});
});
