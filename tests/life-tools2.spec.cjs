const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const base=(o={})=>JSON.stringify({theme:'dark',rec:[],favorites:[],budgets:{},tx:[],fire:{goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[],holdings:[],...o});
const seed=(page,fn,arg)=>page.addInitScript(([f,a])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');new Function('a',f)(a)},[fn,arg]);
const more=async page=>{await page.goto('/index.html');await page.locator('#settingsBottom').click()};
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);

test('🎬 콘텐츠 보관함: 제목만 저장, 종류 추정, 회차·별점·지출 연결, 이어서 보기 +1화, 오늘 뭐 볼까는 적은 시간만 쓰고 모르면 따로, 삭제',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a)`,base({tx:[{id:'e1',type:'expense',date:day(-3),amount:15000,memo:'넷플릭스',category:'구독'}]}));
 await more(page);await page.locator('#fmContentOpen').click();
 await page.fill('#fmCtIn','오징어 게임 넷플릭스 드라마');await page.press('#fmCtIn','Enter');await expect(page.locator('#fmCtIn')).toBeFocused();
 await page.fill('#fmCtIn','듄 영화');await page.press('#fmCtIn','Enter');
 expect((await st(page,'firemate_content_v1')).list.map(c=>[c.kind,c.status])).toEqual([['movie','want'],['drama','want']]);
 await page.locator('[data-ct]',{hasText:'오징어'}).click();await page.selectOption('#fmCtS','doing');await page.fill('#fmCtEp','3');await page.fill('#fmCtEps','9');await page.fill('#fmCtM','60');
 await page.locator('[data-star="4"]').click();await page.locator('#fmCtTxAdd').click();await page.locator('[data-pick-tx="e1"]').click();await expect(page.locator('#fmCtTx')).toContainText('넷플릭스');
 await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('.fm-ct-last')).toContainText('오징어');await page.locator('[data-ct-step]').click();await expect(page.locator('.fm-ct-last')).toContainText('4/9화');
 const c=(await st(page,'firemate_content_v1')).list.find(x=>x.kind==='drama');expect(c).toMatchObject({status:'doing',ep:4,eps:9,min:60,rating:4,tx:['e1']});
 await page.locator('#fmCtToday').click();await page.locator('[data-m="90"]').click();
 await expect(page.locator('#fmCtPickBox .fm-life-rows [data-ct-go]')).toHaveText([/오징어/]);await expect(page.locator('#fmCtPickBox')).toContainText('시간을 안 적은 것 1개');
 await page.goBack();await expect(page.locator('#fmLifeSheet')).toBeHidden();
 await page.reload();await page.locator('#settingsBottom').click();await expect(page.locator('#fmContentSub')).toHaveText('보는 중 1');await page.locator('#fmContentOpen').click();
 await page.locator('[data-ct-stat="doing"]').click();await expect(page.locator('#fmCtList [data-ct]')).toHaveCount(1);
 await page.locator('#fmCtList [data-ct]').click();await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();
 expect((await st(page,'firemate_content_v1')).list).toHaveLength(1);expect((await st(page,'firemate_smart_v3')).tx).toHaveLength(1);
});

test('🏆 자산 달성 보상: 처음 닿은 날 기록·축하는 한 번, 내려가도 달성 기록 유지, 다시 올라가도 축하 안 함, 기준 바꾸기, 위시는 고르기만',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a);localStorage.setItem('firemate_wishlist_v1',JSON.stringify({list:[{id:'w',name:'게이밍 PC',price:3000000,at:1}]}))`,base({balance:{fx:1400,cash:250000000,other:0,debt:0}}));
 await more(page);await page.locator('#fmRewardOpen').click();
 await page.fill('#fmRwGoal','2억');await page.fill('#fmRwName','PC 구매');await page.locator('#fmRwForm .primary').click();
 await expect(page.locator('.fm-cele')).toHaveCount(1);await expect(page.locator('.fm-cele')).toContainText('2억 달성');
 await page.fill('#fmRwGoal','3억');await page.fill('#fmRwName','스위스 여행');await page.locator('#fmRwForm .primary').click();
 await expect(page.locator('[data-rw]')).toHaveText([/2억 · PC 구매.*달성 · 보상 받기 전/,/3억 · 스위스 여행.*남은 ₩50,000,000/]);
 let l=(await st(page,'firemate_reward_v1')).list;expect(l[0].hitAt).toBe(day(0));expect(l[1].hitAt).toBeUndefined();
 expect((await st(page,'firemate_wishlist_v1')).list).toHaveLength(1);
 // Assets fall: the record stays, today's progress shows separately; then back up: no second celebration.
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.balance.cash=180000000;localStorage.setItem('firemate_smart_v3',JSON.stringify(d));const r=JSON.parse(localStorage.getItem('firemate_reward_v1'));r.list[0].hitAt='2026-01-02';localStorage.setItem('firemate_reward_v1',JSON.stringify(r))});
 await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmRewardOpen').click();
 await expect(page.locator('[data-rw]').first()).toContainText('26.01.02 달성 · 지금 90%');
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.balance.cash=260000000;localStorage.setItem('firemate_smart_v3',JSON.stringify(d))});
 await page.reload();await page.waitForTimeout(3000);await expect(page.locator('.fm-cele')).toHaveCount(0);
 expect((await st(page,'firemate_reward_v1')).list[0].hitAt).toBe('2026-01-02');
 await page.locator('#settingsBottom').click();await page.locator('#fmRewardOpen').click();
 await page.locator('[data-rw]').first().click();await page.selectOption('#fmRwW','w');await page.locator('#fmRwGot').click();await page.locator('#fmLifeForm .primary').click();
 l=(await st(page,'firemate_reward_v1')).list;expect(l[0]).toMatchObject({wish:'w',doneAt:day(0),hitAt:'2026-01-02'});expect((await st(page,'firemate_wishlist_v1')).list).toHaveLength(1);
 await page.locator('[data-rw-basis="fire"]').click();await expect(page.locator('.fm-life-prog small').first()).toContainText('FIRE 운용자산');
 expect((await st(page,'firemate_smart_v3')).balance.cash).toBe(260000000);
});

test('🎯 목표자금: FIRE에 안 넣은 돈 안에서만 나누고, 넘게는 저장 안 됨, 순자산은 그대로',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a)`,base({accounts:[{id:'s',name:'파킹',kind:'cash',amount:20000000,fire:false},{id:'i',name:'증권',kind:'investment',amount:80000000,fire:true}]}));
 await more(page);await page.locator('#fmAllocOpen').click();
 await expect(page.locator('.fm-life-prog b')).toHaveText('나눌 수 있는 돈 ₩20,000,000');
 await page.fill('#fmAlName','비상금');await page.fill('#fmAlAmt','1500만');await page.locator('#fmAlForm .primary').click();
 await page.fill('#fmAlName','여행');await page.fill('#fmAlAmt','600만');await page.locator('#fmAlForm .primary').click();
 await expect(page.locator('#toast')).toContainText('많이 나눌 수 없어요');expect((await st(page,'firemate_alloc_v1')).list.map(x=>x.amt)).toEqual([15000000]);
 await page.fill('#fmAlAmt','500만');await page.locator('#fmAlForm .primary').click();await expect(page.locator('.fm-life-prog')).toContainText('배정 안 한 돈 ₩0');
 expect((await st(page,'firemate_smart_v3')).accounts.filter(a=>['s','i'].includes(a.id)).map(a=>a.amount)).toEqual([20000000,80000000]);
});

test('💵 받을 돈: 부분 수령·입금 거래 연결(한 입금은 한 곳만), 다 받으면 완료, 거래·자산은 안 바뀜',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a)`,base({tx:[{id:'i1',type:'income',date:day(-1),amount:300000,memo:'회사 출장비',category:'기타'},{id:'i2',type:'income',date:day(0),amount:200000,memo:'회사',category:'기타'}]}));
 await more(page);await page.locator('#fmOwedOpen').click();
 await page.fill('#fmOwName','11월 출장비');await page.fill('#fmOwAmt','50만');await page.locator('#fmOwForm .primary').click();
 expect((await st(page,'firemate_owed_v1')).list[0]).toMatchObject({kind:'출장 정산',amt:500000});
 await page.locator('[data-ow]').click();await page.locator('#fmOwPick').click();await page.locator('[data-pick-tx="i1"]').click();await expect(page.locator('#fmOwGot')).toContainText('남은 ₩200,000');
 await page.locator('#fmLifeForm .primary').click();await expect(page.locator('[data-ow]')).toContainText('₩200,000');
 await page.locator('[data-ow]').click();await page.fill('#fmOwGA','200000');await page.locator('#fmOwGAdd').click();await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('.fm-life-fold summary')).toHaveText('다 받은 것 1');
 const o=(await st(page,'firemate_owed_v1')).list[0];expect(o.doneAt).toBeTruthy();expect(o.got.map(g=>[g.amt,g.tx||''])).toEqual([[300000,'i1'],[200000,'']]);
 expect((await st(page,'firemate_smart_v3')).tx).toHaveLength(2);
});

test('✈️ 여행 거래·정산: 잡힌 거래 빼기·다른 거래 넣기, 회사·동행 정산을 빼서 내 부담, 받을 돈 기록은 두 번 눌러도 하나',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a[0]);localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'t',name:'부산 출장',area:'kr',place:'26',from:a[1],to:a[2]}]))`,[base({tx:[{id:'a',type:'expense',date:day(-5),amount:100000,memo:'호텔',category:'여행'},{id:'b',type:'expense',date:day(-4),amount:30000,memo:'편의점',category:'식비'},{id:'c',type:'expense',date:day(-20),amount:50000,memo:'KTX',category:'교통'}]}),day(-5),day(-4)]);
 await more(page);await page.locator('#fmJournalOpen').click();await page.locator('[data-area=kr]').click();await page.locator('.fm-jn-trip',{hasText:'부산'}).click();
 await page.locator('.fm-jn-txs summary').click();await expect(page.locator('.fm-jn-txs [data-trip-ex]')).toHaveCount(2);
 await page.locator('[data-trip-ex="b"]').click();await expect(page.locator('.fm-jn-hero strong')).toHaveText('₩100,000');
 await page.locator('#fmTripInc').click();await page.locator('[data-pick-tx="c"]').click();await expect(page.locator('.fm-jn-hero strong')).toHaveText('₩150,000');
 await page.fill('#fmTripCo','120000');await page.locator('#fmTripCo').blur();await expect(page.locator('.fm-jn-mine')).toContainText('내 부담 ₩30,000');
 await page.locator('#fmTripOwe').click();await page.locator('#fmTripOwe').click();
 expect((await st(page,'firemate_owed_v1')).list.map(o=>[o.kind,o.amt,o.trip])).toEqual([['출장 정산',120000,'t']]);
 await page.locator('[data-trip-unex="b"]').click();await expect(page.locator('.fm-jn-hero strong')).toHaveText('₩180,000');
 expect((await st(page,'firemate_trips_v1'))[0]).toMatchObject({inc:['c'],backCo:120000});
});

test('🔗 내 바로가기 링크·🚪 시작 화면·🔍 통합 검색',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a);localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'t',text:'출장 보고서',day:'2026-01-01'}]}))`,base({tx:[{id:'e',type:'expense',date:day(-1),amount:9000,memo:'출장 택시',category:'교통'}],holdings:[{id:'h',ticker:'SCHD',name:'SCHD',type:'USD',qty:1,price:27,cost:25}]}));
 await page.addInitScript(()=>{window.__opened=[];window.open=u=>{window.__opened.push(u)}});
 await more(page);await page.locator('#fmMoreEdit').click();await page.fill('#fmLkName','회사 메일');await page.fill('#fmLkUrl','mail.example.com');await page.locator('#fmLkAdd').click();
 await page.locator('[data-lk-edit]').click();await page.fill('#fmLkName','메일');await page.locator('#fmLkAdd').click();await page.locator('#fmMoreDone').click();
 await page.locator('.fm-more-chips [data-more-go]').click();expect(await page.evaluate(()=>window.__opened)).toEqual(['https://mail.example.com']);
 await page.fill('#fmMoreQ','출장');await expect(page.locator('#fmMoreHits [data-sr]')).toHaveText([/출장 보고서/,/출장 택시/]);
 await page.locator('[data-sr="tx"]').click();await expect(page.locator('#entryOverlay')).toBeVisible();await expect(page.locator('#entryTitle')).toHaveText('거래 수정');
 await page.goBack();await page.locator('#settingsBottom').click();await page.fill('#fmMoreQ','');await page.selectOption('#fmStartSel','fire');await expect(page.locator('#fmStartSub')).toHaveText('FIRE');
 // The holding detail is full screen (no bottom bar), so it comes last.
 await page.fill('#fmMoreQ','SCHD');await page.locator('[data-sr="hold"]').click();await expect(page.locator('#view-assets')).toHaveClass(/active/);await expect(page.locator('#fmAccountDetail')).toBeVisible();
 const p2=await page.context().newPage();await p2.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await p2.goto('/index.html');await expect(p2.locator('#view-fire')).toHaveClass(/active/);
 await p2.reload();await p2.waitForTimeout(500);await expect(p2.locator('#view-fire')).toHaveClass(/active/);
 expect(await st(page,'firemate_more_v1')).toMatchObject({start:'fire',links:[{name:'메일',url:'https://mail.example.com'}]});
});

test('📸 새 데이터·사진은 백업과 사진 ZIP에 들어감',async({page})=>{
 await page.goto('/index.html');
 const src=await page.evaluate(async()=>await (await fetch('/index.html')).text());
 const ex=src.slice(src.indexOf('FM_BACKUP_EXTRAS='),src.indexOf('FM_BACKUP_FLAGS='));
 for(const k of ['firemate_content_v1','firemate_reward_v1','firemate_alloc_v1','firemate_owed_v1'])expect(ex).toContain(k);
 expect(src).toContain("/^(trip:|bucket:|content:|reward:|item:|[\\w-]+$)/");expect(src).toContain("m[c.photo]='콘텐츠/'+c.title");
});

test('🧩 취미 프로젝트: 할 일·메모를 묶고 완료 수로 진행, 할 일 화면에도 같은 할 일, 지우면 할 일은 남고 연결만 풀림',async({page})=>{
 await more(page);await page.locator('#fmProjOpen').click();await page.fill('#fmPjName','유튜브 첫 영상');await page.locator('#fmPjForm .primary').click();
 await expect(page.locator('#fmLifeHead')).toHaveText('유튜브 첫 영상');
 for(const t of ['대본 쓰기','촬영'])await (async()=>{await page.fill('#fmPjTodoIn',t);await page.press('#fmPjTodoIn','Enter')})();
 await page.fill('#fmPjMemoIn','썸네일은 밝게');await page.press('#fmPjMemoIn','Enter');
 await page.locator('[data-pj-t]').first().click();await expect(page.locator('.fm-life-prog b')).toHaveText('1 / 2');
 const id=(await st(page,'firemate_project_v1')).list[0].id;expect((await st(page,'firemate_todo_v1')).list.map(t=>[t.text,t.proj,!!t.done])).toEqual([['대본 쓰기',id,true],['촬영',id,false]]);
 expect((await st(page,'firemate_memo_v1')).list[0].proj).toBe(id);
 await page.goBack();await expect(page.locator('[data-pj]')).toContainText('1/2 완료');await page.locator('[data-pj]').click();
 await page.locator('#fmPjEdit').click();await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('#fmLifeHead')).toHaveText('취미 프로젝트');expect((await st(page,'firemate_todo_v1')).list.map(t=>t.proj)).toEqual([undefined,undefined]);
 expect((await st(page,'firemate_memo_v1')).list[0].proj).toBeUndefined();
});

test('📦 내 물건: 산 위시에서 한 번에, 보증 60일 안·교체할 때는 위로, 오늘 교체했어요 기록, 지출 연결',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a[0]);localStorage.setItem('firemate_wishlist_v1',JSON.stringify({list:[{id:'w',name:'공기청정기',price:300000,done:true,boughtAt:Date.parse(a[1]+'T12:00'),at:1}]}))`,[base({tx:[{id:'e',type:'expense',date:day(-340),amount:299000,memo:'공기청정기 쿠팡',category:'쇼핑'}]}),day(-340)]);
 await more(page);await page.locator('#fmItemsOpen').click();await page.locator('[data-it-wish="w"]').click();
 await page.locator('[data-it]').first().click();await page.selectOption('#fmItW','12');await page.fill('#fmItC','90');await page.locator('#fmItSwap').click();
 await page.locator('#fmItTxAdd').click();await page.locator('[data-pick-tx="e"]').click();await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('.fm-life-h').first()).toHaveText('챙길 것');await expect(page.locator('[data-it]').first()).toContainText('보증 ⚠️ 25일 남음');
 expect((await st(page,'firemate_items_v1')).list[0]).toMatchObject({name:'공기청정기',wish:'w',warranty:12,cycle:90,tx:'e',last:day(0),log:[day(0)]});
 await expect(page.locator('[data-it-wish]')).toHaveCount(0);
});

test('🗓️ 돌아보기: 기록이 있는 영역만 보이고 없는 영역은 아예 안 나옴',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_smart_v3',a[0]);localStorage.setItem('firemate_content_v1',JSON.stringify({list:[{id:'c',title:'듄',kind:'movie',status:'done',rating:5,doneAt:a[1]}]}))`,[base({tx:[{id:'e',type:'expense',date:day(0),amount:12000,memo:'점심',category:'식비'}]}),day(0)]);
 await more(page);await page.locator('#fmReviewOpen').click();
 await expect(page.locator('.fm-rv-row b')).toHaveText(['돈','콘텐츠']);await expect(page.locator('.fm-rv-row').nth(1)).toContainText('최고: 듄 ★5');
 await page.locator('[data-rv-step="-1"]').click();await expect(page.locator('.fm-life-empty')).toHaveText('이 기간의 기록이 없어요');
 await page.locator('[data-rv-y="true"]').click();await expect(page.locator('.fm-rv-row b')).toHaveText(['돈','콘텐츠']);
});

test('💑 데이트 후보 고르기 · 🧳 출장 준비 템플릿',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_travel_spots_v1',JSON.stringify([{id:'p',d:'2026-01-01',area:'kr',place:'',name:'성수 카페',want:true,date:true},{id:'q',d:'2026-01-01',area:'kr',place:'',name:'한강 공원',want:true}]))`,0);
 await more(page);await page.locator('#fmPlaceOpen').click();await expect(page.locator('.fm-life-hrow')).toContainText('💑 데이트 후보 1');
 await page.locator('#fmPlPick').click();await expect(page.locator('#fmPlName')).toHaveValue('성수 카페');await page.locator('[data-life-x]').click();
 await page.locator('#fmLifeOverlay [data-close]').click();await page.locator('#fmCheckOpen').click();await page.locator('[data-ck-tpl="출장 준비"]').click();await expect(page.locator('[data-ck-on]')).toHaveCount(7);
});
