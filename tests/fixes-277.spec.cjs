const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const seed=(page,fn,arg)=>page.addInitScript(([f,a])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');new Function('a',f)(a)},[fn,arg]);
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);

test('🗺️ 지도 지역 이름은 보통 글자 크기(11)로 그리고 확대는 transform으로 — 아주 작은 글꼴은 안드로이드에서 글자가 겹쳐 깨졌음',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmJournalOpen').click();await expect(page.locator('.fm-jn-map path[data-place]').first()).toBeAttached();
 for(let i=0;i<3;i++)await page.locator('.fm-jn-zoombtn button').first().click();
 const l=await page.locator('.fm-jn-labels text').evaluateAll(ts=>ts.filter(t=>t.style.display!=='none').map(t=>[t.getAttribute('font-size'),t.getAttribute('transform')||'',t.getBoundingClientRect().height]));
 expect(l.length).toBeGreaterThan(0);for(const [fs,tr,h] of l){expect(fs).toBe('11');expect(tr).toMatch(/^translate\([-\d.]+ [-\d.]+\) scale\([\d.]+\)$/);expect(h).toBeGreaterThan(8);expect(h).toBeLessThan(20)}
});

test('🧾 자동 변경 기록: 건별로 한 건만 되돌리고(다시 자동으로 안 바꿈), 나머지는 그대로',async({page})=>{
 const d=new Date().toISOString().slice(0,10);
 await seed(page,`localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],favorites:[],budgets:{},fire:{goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[],holdings:[],tx:[{id:'c1',date:a,type:'expense',category:'미용',amount:15000,memo:'헤어살롱'},{id:'c2',date:a,type:'expense',category:'보험',amount:30000,memo:'삼성화재보험'}]}));
 localStorage.setItem('firemate_newcat_v1','1');localStorage.setItem('firemate_newcat_backup_v1',JSON.stringify({c1:'쇼핑',c2:'기타'}));
 localStorage.setItem('firemate_dup_backup_v1',JSON.stringify([{id:'d1',date:a,type:'expense',category:'식비',amount:7000,memo:'김밥'},{id:'d2',date:a,type:'expense',category:'식비',amount:9000,memo:'라면'}]))`,d);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click();await page.locator('#fmAutoLog>summary').click();
 const row=page.locator('.fm-autolog-row',{hasText:'두 번 찍힌'});await row.locator('.fm-autolog-each>summary').click();
 await row.locator('[data-auto-one="dup|d2"]').click();
 await expect.poll(async()=>(await st(page,'firemate_smart_v3')).tx.map(t=>t.id).sort()).toEqual(['c1','c2','d2']);
 expect((await st(page,'firemate_dup_backup_v1')).map(t=>t.id)).toEqual(['d1']);
 const nc=page.locator('.fm-autolog-row',{hasText:'미용·보험'});await nc.locator('.fm-autolog-each>summary').click();await nc.locator('[data-auto-one="newcat|c1"]').click();
 await expect.poll(async()=>(await st(page,'firemate_smart_v3')).tx.find(t=>t.id==='c1').category).toBe('쇼핑');
 expect((await st(page,'firemate_smart_v3')).tx.find(t=>t.id==='c2').category).toBe('보험');
 expect(await st(page,'firemate_newcat_backup_v1')).toEqual({c2:'기타'});expect(await st(page,'firemate_autocat_skip_v1')).toContain('c1');
 await page.reload();expect((await st(page,'firemate_smart_v3')).tx.find(t=>t.id==='c1').category).toBe('쇼핑');
});

test('🌙 음력 기념일: 이름에 "음력"을 넣으면 음력으로, 다음 날짜는 브라우저 음력 달력으로(추석 8/15 → 2027-09-15), 시트에서 끄고 켬',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-14T10:00:00+09:00'));
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmAnnivOpen').click();
 await page.fill('#fmAnnivName','할머니 생신 음력');await page.fill('#fmAnnivDate','1940-08-15');await page.locator('#fmAnnivForm .primary').click();
 const a=(await st(page,'firemate_anniv_v1')).list[0];expect(a).toMatchObject({name:'할머니 생신',lunar:true,date:'1940-08-15'});
 await expect(page.locator('[data-anniv]')).toContainText('음력 8/15 → 9월 15일');await expect(page.locator('[data-anniv] em')).toHaveText('D-305');
 await page.locator('[data-anniv]').click();await page.locator('#fmAnLunar').uncheck();await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('[data-anniv] em')).toHaveText('D-274');expect((await st(page,'firemate_anniv_v1')).list[0].lunar).toBeUndefined();
});
