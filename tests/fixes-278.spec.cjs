const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const seed=(page,fn,arg)=>page.addInitScript(([f,a])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');new Function('a',f)(a)},[fn,arg]);
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');

test('✅ 할 일 제안: 7일 안 기념일은 선물 준비, 예정일이 된 받을 돈은 입금 확인 — 누르면 연결된 할 일이 되고 칩은 사라짐',async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await seed(page,`localStorage.setItem('firemate_anniv_v1',JSON.stringify({list:[{id:'a',name:'엄마 생신',date:'1960'+a[0].slice(4),yearly:true},{id:'b',name:'친구 생일',date:'1990'+a[1].slice(4),yearly:true}]}));localStorage.setItem('firemate_owed_v1',JSON.stringify({list:[{id:'o',name:'출장비',kind:'출장 정산',amt:500000,due:a[2],got:[{id:'g',amt:200000,date:a[2]}]},{id:'p',name:'환불',kind:'환불',amt:30000,due:a[3],got:[]}]}))`,[day(5),day(20),day(0),day(10)]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmTodoOpen').click();
 const chips=page.locator('[data-todo-sugg="link"]');await expect(chips).toHaveText([/엄마 생신 선물 준비 \(D-5\)/,/출장비 입금 확인 · 남은/]);
 await chips.first().click();
 const t=(await st(page,'firemate_todo_v1')).list.find(x=>x.anniv);expect(t).toMatchObject({anniv:'a',text:'🎁 엄마 생신 선물 준비',day:day(0)});
 await expect(page.locator('[data-todo-sugg="link"]')).toHaveText([/출장비 입금 확인/]);
 await page.locator('[data-todo-sugg="link"]').click();expect((await st(page,'firemate_todo_v1')).list.find(x=>x.owed)).toMatchObject({owed:'o'});
 await expect(page.locator('[data-todo-sugg="link"]')).toHaveCount(0);
});

test('🎬 돌아보기는 스토리로도 보고, 홈 월간 결산 스토리에 지난달 생활 기록(콘텐츠 등)이 이어짐 — 기록 없는 영역은 카드도 없음',async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);const pm=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 await seed(page,`localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},fire:{goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[],holdings:[],tx:[{id:'x',date:a+'-10',type:'expense',category:'식비',amount:30000,memo:'저녁'},{id:'y',date:a+'-25',type:'income',category:'급여',amount:3000000,memo:'월급'}]}));localStorage.setItem('firemate_content_v1',JSON.stringify({list:[{id:'c',title:'듄',kind:'movie',status:'done',rating:5,doneAt:a+'-15'}]}));window.__fmMonthReportAnyDay=true`,pm);
 await page.goto('/index.html');await page.locator('#fmMonthStory').click();
 const cards=page.locator('.fm-story .fm-story-card');await expect(cards.last()).toContainText('콘텐츠');await expect(cards.last()).toContainText('최고: 듄 ★5');
 await expect(page.locator('.fm-story')).not.toContainText('여행');
 await page.locator('.fm-story-x').click();
 await page.locator('#settingsBottom').click();await page.locator('#fmReviewOpen').click();await page.locator('[data-rv-step="-1"]').click();
 await page.locator('#fmRvStory').click();await expect(page.locator('.fm-story .fm-story-card')).toHaveCount(2);
});

test('🔍 콘텐츠 제목을 위키백과에서 찾아 제목·종류·링크·그림을 채우고, 실패하면 아무것도 안 바꿈',async({page})=>{
 let calls=0;
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>{const u=r.request().url();if(u.startsWith('https://ko.wikipedia.org/w/api.php')){calls++;if(calls>1)return r.abort();return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({query:{pages:{'1':{index:1,title:'오징어 게임',description:'대한민국의 텔레비전 드라마',thumbnail:{source:'https://upload.wikimedia.org/x.png'}},'2':{index:2,title:'오징어 게임 (게임)',description:'놀이'}}}})})}if(u.startsWith('https://upload.wikimedia.org/'))return r.fulfill({contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:PNG});return r.abort()});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmContentOpen').click();
 await page.fill('#fmCtIn','오징어');await page.press('#fmCtIn','Enter');await page.locator('[data-ct]').click();
 await page.locator('#fmCtWiki').click();await expect(page.locator('[data-wk]')).toHaveCount(2);await page.locator('[data-wk="0"]').click();
 await expect(page.locator('#fmCtT')).toHaveValue('오징어 게임');await expect(page.locator('#fmCtK')).toHaveValue('drama');await expect(page.locator('#fmCtL')).toHaveValue(/ko\.wikipedia\.org\/wiki\//);
 await expect(page.locator('.fm-life-photo img')).toHaveCount(1);
 await page.locator('#fmLifeForm .primary').click();
 expect((await st(page,'firemate_content_v1')).list[0]).toMatchObject({title:'오징어 게임',kind:'drama',photo:expect.stringMatching(/^content:/)});
 await page.locator('[data-ct]').click();await page.locator('#fmCtWiki').click();await expect(page.locator('#fmCtWikiBox')).toContainText('찾지 못했어요');await expect(page.locator('#fmCtT')).toHaveValue('오징어 게임');
});
