const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const seed=(page,fn,arg)=>page.addInitScript(([f,a])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');new Function('a',f)(a)},[fn,arg]);
const more=async page=>{await page.goto('/index.html');await page.locator('#settingsBottom').click()};
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);

test('📝 메모: 적기 → 수정·고정 → 할 일로·장보기로(누를 때만) → 휴대폰 뒤로 가기는 시트만 닫음 → 삭제는 확인 후, 새로고침해도 남음',async({page})=>{
 await more(page);await page.locator('#fmMemoOpen').click();
 await page.fill('#fmMemoIn','내일 세탁소\n우유, 계란 2판');await page.locator('#fmMemoForm .primary').click();
 await expect(page.locator('#fmMemoIn')).toBeFocused();await expect(page.locator('[data-memo]')).toHaveCount(1);
 expect(await st(page,'firemate_todo_v1')).toBeNull();expect(await st(page,'firemate_shop_v1')).toBeNull();
 await page.locator('[data-memo]').click();await expect(page.locator('#fmLifeSheet')).toBeVisible();
 await page.locator('#fmMemoTodo').click();await page.locator('#fmMemoShop').click();
 const t=(await st(page,'firemate_todo_v1')).list[0];expect(t.text).toBe('세탁소');expect(t.day).toBe(day(1));
 expect((await st(page,'firemate_shop_v1')).list.map(x=>[x.t,x.n||''])).toEqual([['내일 세탁소',''],['우유',''],['계란','2판']]);
 await page.goBack();await expect(page.locator('#fmLifeSheet')).toBeHidden();await expect(page.locator('#fmLifeOverlay')).toBeVisible();
 await page.locator('[data-memo]').click();await page.fill('#fmMemoT','고친 메모');await page.locator('#fmMemoPin').check();await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('[data-memo]')).toContainText('📌 고친 메모');
 await page.reload();await page.locator('#settingsBottom').click();await expect(page.locator('#fmMemoSub')).toHaveText('1개');await page.locator('#fmMemoOpen').click();
 await page.locator('[data-memo]').click();await page.locator('[data-life-del]').click();await page.locator('#fmAskCancel').click();
 expect((await st(page,'firemate_memo_v1')).list).toHaveLength(1);
 await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('#fmLifeSheet')).toBeHidden();await expect(page.locator('[data-memo]')).toHaveCount(0);
});

test('🛒 장보기: 여러 개 한 번에, 체크하면 담은 것으로, 두 번 산 건 자주 사는 것 칩, 담은 것 지우기',async({page})=>{
 await more(page);await page.locator('#fmShopOpen').click();
 for(let i=0;i<2;i++){await page.fill('#fmShopIn','우유, 두부');await page.press('#fmShopIn','Enter');for(const n of ['우유','두부'])await page.locator('.fm-shop-row',{hasText:n}).locator('[data-shop-on]').click();await page.locator('#fmShopClear').click()}
 await expect(page.locator('[data-shop-often]')).toHaveText(['＋ 우유','＋ 두부']);
 await page.locator('[data-shop-often="두부"]').click();await expect(page.locator('.fm-shop-row')).toHaveCount(1);
 await page.fill('#fmShopIn','두부');await page.press('#fmShopIn','Enter');await expect(page.locator('.fm-shop-row')).toHaveCount(1);
 await page.locator('[data-shop-edit]').click();await page.fill('#fmShopN','2모');await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('.fm-shop-row')).toContainText('2모');
});

test('🎂 기념일: 매년 다음 날짜로 D-day 순서, 선물 아이디어·준 해, 위시로 담기,',async({page})=>{
 const soon=day(7),later=day(40);
 await seed(page,`localStorage.setItem('firemate_anniv_v1',JSON.stringify({list:[{id:'b',name:'결혼기념일',date:'2020'+a[1].slice(4),yearly:true},{id:'a',name:'엄마 생신',date:'1960'+a[0].slice(4),yearly:true,gifts:[{id:'g',t:'목도리',price:50000}]}]}));localStorage.setItem('firemate_push_v1',JSON.stringify({on:true,off:{}}))`,[soon,later]);
 await more(page);await expect(page.locator('#fmAnnivSub')).toHaveText('엄마 생신 D-7');await page.locator('#fmAnnivOpen').click();
 await expect(page.locator('[data-anniv] b')).toHaveText(['엄마 생신','결혼기념일']);await expect(page.locator('[data-anniv]').first().locator('em')).toHaveText('D-7');
 await expect(page.locator('[data-anniv]').nth(1)).toContainText(String(+later.slice(0,4)-2020)+'주년');
 await page.locator('[data-anniv="a"]').click();await page.locator('[data-gift-wish]').click();
 expect((await st(page,'firemate_wishlist_v1')).list[0]).toMatchObject({name:'목도리 · 엄마 생신',price:50000});
 await page.locator('[data-gift-on]').click();await page.fill('#fmGiftT','꽃');await page.press('#fmGiftT','Enter');await page.locator('#fmLifeForm .primary').click();
 expect((await st(page,'firemate_anniv_v1')).list.find(x=>x.id==='a').gifts.map(g=>[g.t,g.year||0])).toEqual([['목도리',new Date().getFullYear()],['꽃',0]]);
});

test('💚 가고 싶은 장소: 이름에서 도시를 찾아 저장(여행 일지 💚와 같은 데이터), 여행 계획하기는 이름·도시를 채운 여행 추가로, 다녀왔어요는 발자국으로',async({page})=>{
 await more(page);await page.locator('#fmPlaceOpen').click();
 await page.fill('#fmPlaceIn','부산 해운대 블루라인파크');await page.locator('#fmPlaceForm .primary').click();
 await expect(page.locator('#fmLifeBody [data-pl]')).toContainText('부산');
 const s=(await st(page,'firemate_travel_spots_v1'))[0];expect(s).toMatchObject({name:'부산 해운대 블루라인파크',area:'kr',place:'26',want:true});
 await page.locator('#fmLifeBody [data-pl]').click();await page.locator('#fmPlTrip').click();
 await expect(page.locator('#fmJournalOverlay')).toBeVisible();await expect(page.locator('#fmJnName')).toHaveValue('부산 해운대 블루라인파크');await expect(page.locator('#fmJnPlace')).toHaveValue('26');
 await page.fill('#fmJnFrom',day(30));await page.locator('#fmJnAdd .primary').click();
 expect((await st(page,'firemate_trips_v1'))[0]).toMatchObject({place:'26',spot:s.id});
 await page.locator('#fmJournalOverlay [data-close]').click();await page.locator('#fmPlaceOpen').click();await page.locator('#fmLifeBody [data-pl]').click();await page.locator('#fmPlBeen').click();
 expect((await st(page,'firemate_travel_spots_v1'))[0].want).toBe(false);await expect(page.locator('#fmLifeBody [data-pl]')).toHaveCount(0);
});

test('🧳 체크리스트: 만들고 체크, 다시 쓰기로 풀기, 여행 준비물에 없는 것만 넣기, 수정(줄마다 항목), 삭제하면 목록으로',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'t',name:'오사카',area:'world',place:'JP',from:a[0],to:a[0],items:['우산']}]))`,[day(10)]);
 await more(page);await page.locator('#fmCheckOpen').click();await page.locator('[data-ck-tpl="운동 가방"]').click();
 await expect(page.locator('#fmLifeHead')).toHaveText('운동 가방');await page.fill('#fmCkItem','우산, 수건');await page.press('#fmCkItem','Enter');
 await expect(page.locator('[data-ck-on]')).toHaveCount(6);
 await page.locator('[data-ck-on]').first().click();await expect(page.locator('.fm-life-prog b')).toHaveText('1 / 6');
 await page.locator('#fmCkReset').click();await expect(page.locator('.fm-life-prog b')).toHaveText('0 / 6');expect((await st(page,'firemate_checklist_v1')).list[0].runs).toBe(1);
 await page.locator('#fmCkTrip').click();await page.locator('[data-ck-trip="t"]').click();
 expect((await st(page,'firemate_trips_v1'))[0].items).toEqual(['우산','운동복','운동화','수건','물병','자물쇠']);
 await page.locator('#fmCkEdit').click();await page.fill('#fmCkEItems','운동화\n양말');await page.locator('#fmLifeForm .primary').click();await expect(page.locator('[data-ck-on] b')).toHaveText(['운동화','양말']);
 await page.goBack();await expect(page.locator('#fmLifeHead')).toHaveText('준비물 체크리스트');await page.locator('[data-ck]').click();
 await page.locator('#fmCkEdit').click();await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('#fmLifeHead')).toHaveText('준비물 체크리스트');await expect(page.locator('[data-ck]')).toHaveCount(0);
 await page.goBack();await expect(page.locator('#fmLifeOverlay')).toBeHidden();await expect(page.locator('#settingsOverlay')).toBeVisible();
});

test('⭐ 더보기: 기능 찾기, 즐겨찾기 고르기·순서 바꾸기, 홈 바로가기는 켰을 때만 최대 4개(금융 카드 아래), 백업에 포함',async({page})=>{
 await more(page);await expect(page.locator('.fm-more-chips')).toHaveCount(0);
 await page.fill('#fmMoreQ','백업');await expect(page.locator('#fmMoreHits [data-more-go]')).toHaveText([/백업·복원/]);await expect(page.locator('#fmMoreAll')).toBeHidden();
 await page.locator('#fmMoreHits [data-more-go]').click();await expect(page.locator('#fmStorage')).toHaveAttribute('open','');await expect(page.locator('#fmMoreAll')).toBeVisible();
 await page.fill('#fmMoreQ','열품타');await expect(page.locator('#fmMoreHits [data-more-go]')).toHaveText([/공부 타이머/]);await page.fill('#fmMoreQ','');
 await page.locator('#fmMoreEdit').click();for(const k of ['fmMemoOpen','fmShopOpen','fmTodoOpen','fmAnnivOpen','fmCheckOpen'])await page.locator('[data-fav="'+k+'"]').click();
 await page.locator('[data-mv="1,-1"]').click();
 await page.goBack();await expect(page.locator('#fmMoreSheet')).toBeHidden();await expect(page.locator('#settingsOverlay')).toBeVisible();
 await expect(page.locator('.fm-more-chips [data-more-go]')).toHaveText(['🛒장보기','📝메모','✅할 일','🎂기념일·선물','🧳준비물 체크리스트']);
 await page.locator('#settingsOverlay [data-close]').click();await expect(page.locator('#fmHomeLife')).toBeHidden();
 await page.locator('#settingsBottom').click();await page.locator('#fmMoreEdit').click();await page.locator('#fmMoreHome').check();await page.locator('#fmMoreDone').click();await page.locator('#settingsOverlay [data-close]').click();
 await expect(page.locator('#fmHomeLife button')).toHaveCount(4);
 const y=await page.evaluate(()=>[document.getElementById('homeAssetHero').getBoundingClientRect().top,document.getElementById('fmHomeLife').getBoundingClientRect().top]);expect(y[1]).toBeGreaterThan(y[0]);
 await page.locator('#fmHomeLife button').first().click();await expect(page.locator('#fmLifeOverlay')).toBeVisible();await expect(page.locator('#fmLifeHead')).toHaveText('장보기');
 expect(await page.evaluate(async()=>{const s=await (await fetch('/index.html')).text();return ['firemate_memo_v1','firemate_shop_v1','firemate_anniv_v1','firemate_checklist_v1','firemate_more_v1'].every(k=>s.slice(s.indexOf('FM_BACKUP_EXTRAS='),s.indexOf('FM_BACKUP_FLAGS=')).includes(k))})).toBe(true);
});

test('🔁 구독·고정비 칸은 반복 결제가 없으면 알려 주고, 있으면 소비 분석 돈 흐름의 고정비로 감',async({page})=>{
 await more(page);await page.locator('#fmSubsOpen').click();await expect(page.locator('#toast')).toContainText('반복된 결제가 아직 없어요');await expect(page.locator('#settingsOverlay')).toBeVisible();
});

test('기존 생활 기능 수정 창도 같은 모양: 위 ✕, 아래 빨간 삭제 + 저장, 휴대폰 뒤로 가기는 창만 닫음',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_wishlist_v1',JSON.stringify({list:[{id:'w',name:'키보드',price:100000,at:Date.now()}]}));localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'t',text:'세탁소',day:a[0]}]}))`,[day(0)]);
 await more(page);await page.locator('#fmWishOpen').click();await page.locator('[data-wish-edit="w"]').click();
 await expect(page.locator('#fmWishEForm .fm-bk-foot button')).toHaveText(['삭제','저장']);await expect(page.locator('#fmWishECancel')).toHaveText('✕');
 await page.goBack();await expect(page.locator('#fmWishSheet')).toBeHidden();await expect(page.locator('#fmWishOverlay')).toBeVisible();
 await page.locator('#fmWishOverlay [data-close]').click();await page.locator('#fmTodoOpen').click();await page.locator('.fm-todo-text',{hasText:'세탁소'}).click();
 await expect(page.locator('#fmTodoEForm .fm-bk-foot button')).toHaveText(['삭제','저장']);await page.locator('#fmTodoECancel').click();await expect(page.locator('#fmTodoSheet')).toBeHidden();
});
