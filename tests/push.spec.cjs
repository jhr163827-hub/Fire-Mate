const {test,expect}=require('@playwright/test');
// 🔔 폰 알림: the app writes a daily digest plan to the 'fm-notify-v1' cache; sw.js shows it (no server).
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['notifications'],timezoneId:'Asia/Seoul'});
// Dates as the browser sees them (the CI config pins a time zone, so the runner's own clock may be on another day).
const day=k=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date(Date.now()+k*864e5));
const plan=page=>page.evaluate(async()=>{const r=await (await caches.open('fm-notify-v1')).match('./__fm_notify.json');return r?(await r.json()).days:null});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 // Headless Chromium always answers 'denied'; the permission prompt itself is the browser's, so stand in for it.
 await page.addInitScript(()=>{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}})});
 await page.addInitScript(([d7,d3])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
  localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'c',name:'정보처리기사',goal:true,date:d7}]}));
  localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'t',name:'제주',from:d3,to:d3}]));
  localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'a',text:'운동',day:'2020-01-01'}]}))},[day(7),day(3)]);
});
test('turning 폰 알림 on plans one digest a day: exam D-7 and trip D-3 today, to-dos ride along, and chips switch kinds off',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmPushKinds')).toBeHidden();
 await page.locator('#fmPushOn').check();
 await expect(page.locator('#fmPushKinds')).toBeVisible();
 await expect.poll(async()=>(await plan(page))?.[day(0)]).toEqual(['✅ 오늘 할 일 1개','🎓 정보처리기사 시험 D-7','✈️ 제주 D-3']);
 // To-dos and the study goal come every day now, so there is a reason to open the app each morning.
 const p=await plan(page);expect(p[day(6)]).toEqual(['✅ 오늘 할 일 1개','🎓 정보처리기사 시험 D-1']);expect(p[day(7)]).toEqual(['✅ 오늘 할 일 1개','🎓 정보처리기사 시험 날이에요']);expect(p[day(1)]).toEqual(['✅ 오늘 할 일 1개','🎓 정보처리기사 D-6 · 오늘 공부 기록하기']);
 await page.locator('[data-push="cert"]').click();
 await expect.poll(async()=>(await plan(page))?.[day(0)]).toEqual(['✅ 오늘 할 일 1개','✈️ 제주 D-3']);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_push_v1')))).toEqual({on:true,off:{cert:true}});
 await page.locator('#fmPushOn').uncheck();
 await expect.poll(async()=>Object.keys(await plan(page)||{x:1}).length).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('수면·걸음 is hidden from settings',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmEngOpen')).toBeVisible();await expect(page.locator('#fmHealthOpen')).toBeHidden();
});

test('FIRE: an example plan offers numbers from my own records once, and applying it saves the plan',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa2'))return;sessionStorage.setItem('qa2','1');const tx=[],d=new Date();
  for(let k=1;k<=3;k++){const m=new Date(d.getFullYear(),d.getMonth()-k,5),ym=m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0');
   tx.push({id:'e'+k,date:ym+'-05',type:'expense',category:'식비',amount:2000000},{id:'i'+k,date:ym+'-06',type:'transfer',category:'투자',amount:1500000,memo:'키움증권'})}
  localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx,rec:[],budgets:{},accounts:[],holdings:[],balance:{cash:50000000,fx:1400,debt:0},fire:{asset:5000,goal:65000,monthly:300,rate:7,withdrawal:4}}))});
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('fire'));
 const line=page.locator('#fmFireFit');
 // 생활비 월 200만 × 12 ÷ 4% = 6억, 투자 평균 월 150만
 await expect(line).toContainText('목표 6억');await expect(line).toContainText('월 150만');
 await line.click();await page.locator('#fmAskOk').click();
 await expect.poll(()=>page.evaluate(()=>{const f=JSON.parse(localStorage.getItem('firemate_smart_v3')).fire;return f.goal+'/'+f.monthly})).toBe('60000/150');
 await expect(line).toBeHidden();
 await page.reload();await page.evaluate(()=>window.fmGo('fire'));await expect(page.locator('#fmFireFit')).toBeHidden();
});

test('미용·보험 are categories: saved 기타/쇼핑 rows move by name once, with undo in 자동 변경 기록',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa3'))return;sessionStorage.setItem('qa3','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},accounts:[],holdings:[],tx:[
  {id:'a',date:'2026-10-05',type:'expense',category:'기타',amount:69810,memo:'DB손17210'},{id:'b',date:'2026-10-06',type:'expense',category:'쇼핑',amount:25000,memo:'S.F헤어'},
  {id:'c',date:'2026-10-07',type:'expense',category:'식비',amount:9000,memo:'헤어진 뒤 술집'},{id:'d',date:'2026-10-08',type:'expense',category:'쇼핑',amount:30000,memo:'쿠팡'},
  {id:'e',date:'2026-10-09',type:'expense',category:'쇼핑',amount:45000,memo:'다이슨 헤어드라이어'},{id:'f',date:'2026-10-10',type:'expense',category:'기타',amount:12000,memo:'생명과학 키트'}]}))});
 await page.goto('/index.html');
 const cats=()=>page.evaluate(()=>Object.fromEntries(JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.map(t=>[t.id,t.category])));
 expect(await cats()).toEqual({a:'보험',b:'미용',c:'식비',d:'쇼핑',e:'쇼핑',f:'기타'});// 헤어드라이어·생명과학 stay
 await page.evaluate(()=>window.fmOpenEntry());
 expect(await page.locator('#entryCat option').allTextContents()).toEqual(expect.arrayContaining(['미용','보험','교육','경조사·선물']));
 await page.reload();
 await page.locator('#settingsBottom').click();await page.locator('#fmStorage > summary').click();await page.locator('#fmAutoLog>summary').click();
 const row=page.locator('#fmAutoLogList p',{hasText:'미용·보험·교육·경조사'});await expect(row).toContainText('2건');
 await row.locator('button').click();await page.locator('#fmAskOk').click();
 await expect.poll(cats).toEqual({a:'기타',b:'쇼핑',c:'식비',d:'쇼핑',e:'쇼핑',f:'기타'});
 await page.reload();expect(await cats()).toEqual({a:'기타',b:'쇼핑',c:'식비',d:'쇼핑',e:'쇼핑',f:'기타'});
});

test('🎂 기념일도 폰 알림에: D-7·D-1은 선물 준비, 당일은 오늘 (생활 알림을 끄면 빠짐)',async({page})=>{
 await page.addInitScript(d=>{if(!localStorage.getItem('firemate_anniv_v1'))localStorage.setItem('firemate_anniv_v1',JSON.stringify({list:[{id:'a',name:'엄마 생신',date:'1960'+d.slice(4),yearly:true}]}))},day(7));
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmPushOn').check();
 await expect.poll(async()=>(await plan(page))?.[day(0)]).toContain('🎂 엄마 생신 D-7 · 선물 준비');
 const p=await plan(page);expect(p[day(6)]).toContain('🎂 엄마 생신 D-1 · 선물 준비');expect(p[day(7)]).toContain('🎂 엄마 생신 오늘');expect(p[day(3)]||[]).not.toContain('🎂 엄마 생신 D-4 · 선물 준비');
 await page.locator('[data-push="life"]').click();await expect.poll(async()=>JSON.stringify(await plan(page))).not.toContain('엄마 생신');
});
