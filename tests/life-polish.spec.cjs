const {test,expect}=require('@playwright/test');
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const seed=(page,fn,arg)=>page.addInitScript(([f,a])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');new Function('a',f)(a)},[fn,arg]);

test('✅ 할 일: 매주·매달·평일 반복을 알아듣고, 다른 날 반복은 접힌 묶음에; 순서는 오늘 → 내일 → 완료',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'c',text:'세탁소',day:a[0],done:true,doneAt:a[0]},{id:'d',text:'장보기',day:a[1]}]}))`,[day(0),day(1)]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmTodoOpen').click();
 const wd='일월화수목금토'[new Date().getDay()],other='일월화수목금토'[(new Date().getDay()+3)%7];
 await page.fill('#fmTodoIn','매주 '+wd+' 헬스');await page.press('#fmTodoIn','Enter');
 await page.fill('#fmTodoIn','매주 '+other+'요일 분리수거');await page.press('#fmTodoIn','Enter');
 await page.fill('#fmTodoIn','매달 '+new Date().getDate()+'일 카드값 확인');await page.press('#fmTodoIn','Enter');
 const rows=page.locator('#fmTodoList > .fm-todo-rows').first();
 await expect(rows).toContainText('헬스');await expect(rows).toContainText('매주 '+wd);await expect(rows).toContainText('매달 '+new Date().getDate()+'일');
 await expect(rows).not.toContainText('분리수거');
 await expect(page.locator('.fm-todo-reps summary')).toContainText('다른 날 반복 1');
 // order: today rows, then 내일, then 반복, then 완료
 const order=await page.locator('#fmTodoList > *').evaluateAll(es=>es.map(e=>e.tagName+(e.className?'.'+e.className:'')));
 expect(order.indexOf('H3')).toBeGreaterThan(0);expect(order.findIndex(x=>x.includes('fm-todo-reps'))).toBeGreaterThan(order.indexOf('H3'));
 expect(order.lastIndexOf('DETAILS.fm-todo-done')).toBe(order.length-1);
 const l=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_todo_v1')).list);
 expect(l.find(t=>t.text==='분리수거').rw).toEqual(['일','월','화','수','목','금','토'].map((c,i)=>c===other?i:-1).filter(i=>i>=0));
 expect(l.find(t=>t.text==='카드값 확인').rm).toBe(new Date().getDate());
});

test('✅ 할 일: 공부 할 일의 ⏱는 공부 타이머를 그 자격증 과목으로 시작하고, 1시간 채우면 할 일도 끝(분은 한 번만)',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true}]}))`,[]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmTodoOpen').click();
 await page.locator('[data-todo-sugg=cert]').click();
 await page.locator('[data-todo-timer]').click();
 await expect(page.locator('#fmStudyOverlay')).toBeVisible();await expect(page.locator('#fmStudyFocus')).toBeVisible();await expect(page.locator('#fmStudyFSub')).toHaveText('정보처리기사');
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1'));s.run.start-=61*6e4;s.run.at-=61*6e4;localStorage.setItem('firemate_study_v1',JSON.stringify(s))});
 await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();await page.locator('#fmStudyStop').click();
 const v=await page.evaluate(()=>({t:JSON.parse(localStorage.getItem('firemate_todo_v1')).list[0],c:JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study}));
 expect(v.t.done).toBe(true);expect(Object.values(v.c)).toEqual([61]);
});

test('✈️ 여행: 쓴 돈을 항공·숙소·교통으로 나누고(떠나기 전 항공 포함), 여행 중엔 Day N, 탭마다 다음 여행, ₩0은 숨김',async({page})=>{
 await seed(page,`const tx=[{id:'x1',type:'expense',date:'2026-06-25',amount:320000,memo:'제주항공',category:'여행'},{id:'x2',type:'expense',date:'2026-07-20',amount:450000,memo:'신라호텔 제주',category:'여행'},{id:'x3',type:'expense',date:'2026-07-21',amount:86000,memo:'롯데렌터카',category:'교통'},{id:'y1',type:'expense',date:a[0],amount:18000,memo:'택시',category:'교통'}];
 localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx,rec:[],budgets:{},fire:{goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[],holdings:[]}));
 localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'t1',name:'제주',area:'kr',place:'50110',from:'2026-07-20',to:'2026-07-23',budget:1000000},{id:'t2',name:'오사카',area:'world',place:'JP',from:a[2],to:a[2]},{id:'t3',name:'부산',area:'kr',place:'26',from:a[0],to:a[1],budget:300000},{id:'t4',name:'강릉',area:'kr',place:'51150',from:'2026-03-01',to:'2026-03-02'}]))`,[day(0),day(2),day(20)]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmJournalOpen').click();
 await page.locator('[data-area=kr]').click();
 await expect(page.locator('.fm-jn-next')).toContainText('부산');
 await expect(page.locator('.fm-jn-trip',{hasText:'강릉'})).not.toContainText('₩0');
 await expect(page.locator('.fm-jn-noimg')).toHaveCount(0);
 await page.locator('.fm-jn-next').click();
 await expect(page.locator('.fm-jn-hero strong')).toContainText('Day 1');await expect(page.locator('.fm-jn-hero')).toContainText('남은 예산 하루');
 await page.goBack();await page.locator('.fm-jn-trip',{hasText:'제주'}).click();
 await expect(page.locator('.fm-jn-hero strong')).toHaveText('₩856,000');
 await expect(page.locator('.fm-jn-kinds p')).toHaveText([/숙소.*₩450,000/,/항공.*₩320,000/,/교통.*₩86,000/]);
 await expect(page.locator('.fm-jn-pre')).toContainText('₩320,000');
 await expect(page.locator('.fm-jn-budget .progress>div')).toHaveAttribute('style',/width:86%/);
 await page.goBack();await page.locator('[data-area=world]').click();await expect(page.locator('.fm-jn-next')).toContainText('오사카');
});

test('🪣 버킷: 매달 모을 돈, 여행 일지에 계획하기 → 다녀오면 이뤘어요 체크, 시트는 삭제·저장 두 버튼',async({page})=>{
 const yr=new Date().getFullYear()+1;
 await seed(page,`localStorage.setItem('firemate_bucket_v1',JSON.stringify({list:[{id:'1',name:'오로라 보기',cat:'travel',year:a[0],cost:4000000,saved:1000000,at:1}]}))`,[yr]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmBucketOpen').click();
 await expect(page.locator('.fm-bk-row')).toContainText('월 ');
 await page.locator('[data-bk-edit="1"]').click();
 await expect(page.locator('.fm-bk-calc')).toContainText(yr+'년까지 매달');
 await expect(page.locator('#fmBucketEForm .fm-bk-foot button')).toHaveText(['삭제','저장']);
 await page.locator('[data-bk-trip]').click();
 await expect(page.locator('#fmJournalOverlay')).toBeVisible();await expect(page.locator('#fmJnName')).toHaveValue('오로라 보기');
 await page.locator('#fmJnFrom').fill('2026-01-10');await page.locator('#fmJnTo').fill('2026-01-15');await page.locator('#fmJnAdd .primary').click();
 const t=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_trips_v1'))[0]);expect(t.bucket).toBe('1');
 await page.locator('.fm-jn-trip',{hasText:'오로라'}).click();
 await page.locator('[data-bkdone]').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_bucket_v1')).list[0].done)).toBe(true);
});
