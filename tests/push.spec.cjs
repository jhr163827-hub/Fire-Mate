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
 await expect.poll(async()=>(await plan(page))?.[day(0)]).toEqual(['🎓 정보처리기사 시험 D-7','✈️ 제주 D-3','✅ 오늘 할 일 1개']);
 const p=await plan(page);expect(p[day(6)]).toEqual(['🎓 정보처리기사 시험 D-1']);expect(p[day(7)]).toEqual(['🎓 정보처리기사 시험 날이에요']);expect(p[day(1)]).toBeUndefined();
 await page.locator('[data-push="cert"]').click();
 await expect.poll(async()=>(await plan(page))?.[day(0)]).toEqual(['✈️ 제주 D-3','✅ 오늘 할 일 1개']);
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
