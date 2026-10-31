const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort())});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};

test('오늘 할 일: add, carry over, daily repeat, check off and celebrate, push to tomorrow',async({page})=>{
 await page.addInitScript(([y,old])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'a',text:'어제 못 한 일',day:y},{id:'b',text:'물 마시기',day:y,repeat:true,last:y},{id:'c',text:'오래전 끝남',day:old,done:true,doneAt:old}]}))},[day(-1),day(-40)]);
 await page.goto('/index.html');
 const home=page.locator('#fmHomeTodo');
 await expect(home).toContainText('0/2');await expect(home).toContainText('어제 못 한 일');
 await home.click();
 const box=page.locator('#fmTodoOverlay');
 await expect(box.locator('.fm-todo-row')).toHaveCount(2);
 await expect(box.locator('.fm-todo-text i.old')).toHaveText('2일째');
 await expect(box.locator('.fm-todo-text i').filter({hasText:'매일'})).toHaveCount(1);
 await page.fill('#fmTodoIn','세금 서류');await page.press('#fmTodoIn','Enter');
 await expect(box.locator('.fm-todo-row')).toHaveCount(3);
 const list=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_todo_v1')).list);
 expect(list.find(t=>t.id==='c')).toBeUndefined();
 // push the new one to tomorrow from its sheet
 await box.getByRole('button',{name:'세금 서류',exact:true}).click();
 await page.click('#fmTodoETomorrow');
 await expect(page.locator('#fmTodoSheet')).toBeHidden();
 await expect(box.locator('.fm-todo-row')).toHaveCount(2);
 await box.locator('[data-todo-check="a"]').click();
 await box.locator('[data-todo-check="b"]').click();
 await expect(page.locator('#fmTodoHero')).toContainText('100%');
 await expect(box.locator('.fm-todo-row.done')).toHaveCount(2);
 await expect(page.locator('.fm-cele')).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_todo_v1')).list);
 expect(saved.find(t=>t.id==='b').last).toBe(day(0));
 expect(saved.find(t=>t.text==='세금 서류').day).toBe(day(1));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('오늘 할 일 is in settings and in the backup extras',async({page})=>{
 await page.goto('/index.html');
 await expect(page.locator('#fmHomeTodo')).toBeHidden();
 const src=require('./app-source.cjs')();
 expect(src).toContain("'firemate_todo_v1',");
 await expect(page.locator('#fmTodoOpen')).toHaveCount(1);
});

test('the morning popup starts with today\'s to-dos and adds English review, last night\'s sleep and a trip within a week',async({page})=>{
 await page.addInitScript(([t,s])=>{window.__fmBriefTest=1;if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
  localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'a',text:'세금 서류',day:t},{id:'b',text:'운동',day:t,repeat:true}]}));
  localStorage.setItem('firemate_english_v1',JSON.stringify({cards:{accomplish:{b:1,due:t,at:'2026-01-01'}},days:{},goal:10}));
  localStorage.setItem('firemate_health_v1',JSON.stringify({sleep:{[t]:[432,'23:40','06:52']},steps:{}}));
  localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'x',name:'다낭',area:'world',place:'VN',from:s,to:s}]))},[day(0),day(5)]);
 await page.goto('/index.html');
 const li=page.locator('.fm-brief-pop li');
 await expect(li.first()).toHaveText('✅ 오늘 할 일 2개 · 세금 서류');
 await expect(page.locator('.fm-brief-pop')).toContainText('📖 영어 복습');
 await expect(page.locator('.fm-brief-pop')).toContainText('😴 어젯밤 7시간 12분 잤어요');
 await expect(page.locator('.fm-brief-pop')).toContainText('✈️ 다낭 D-5');
});
