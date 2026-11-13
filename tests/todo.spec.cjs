const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort())});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};

test('오늘 할 일: add, carry over, daily repeat, check off and celebrate, push to tomorrow',async({page})=>{
 await page.addInitScript(([y,old])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'a',text:'어제 못 한 일',day:y},{id:'b',text:'물 마시기',day:y,repeat:true,last:y},{id:'c',text:'오래전 끝남',day:old,done:true,doneAt:old}]}))},[day(-1),day(-40)]);
 await page.goto('/index.html');
 await expect(page.locator('#fmHomeTodo')).toHaveCount(0);
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmTodoSub')).toHaveText('2개 남음');
 await page.locator('#fmTodoOpen').click();
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
 await expect(box.locator('h3',{hasText:'📅 내일 1'})).toBeVisible();
 await expect(box.locator('.fm-todo-rows').first().locator('.fm-todo-row')).toHaveCount(2);
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
 await expect(page.locator('#fmHomeTodo')).toHaveCount(0);
 const src=require('./app-source.cjs')();
 expect(src).toContain("'firemate_todo_v1',");
 await expect(page.locator('#fmTodoOpen')).toHaveCount(1);
});

test('the morning popup is about money only: no to-dos, English, sleep or trips',async({page})=>{
 await page.addInitScript(([t,s])=>{window.__fmBriefTest=1;if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
  localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',accounts:[],holdings:[],tx:[{id:'x',date:t,type:'expense',category:'식비',amount:9000,memo:'점심'}]}));
  localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'a',text:'세금 서류',day:t}]}));
  localStorage.setItem('firemate_health_v1',JSON.stringify({sleep:{[t]:[432,'23:40','06:52']},steps:{}}));
  localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'x',name:'다낭',area:'world',place:'VN',from:s,to:s}]))},[day(0),day(5)]);
 await page.goto('/index.html');
 const pop=page.locator('.fm-brief-pop');
 await expect(pop).toContainText('💾');
 for(const t of ['오늘 할 일','어젯밤','다낭'])await expect(pop).not.toContainText(t);
});

test('오늘 할 일 brings you back: 내일 chip, 🔥 streak of finished days, the app-icon number and a study to-do that records study time',async({page})=>{
 await page.addInitScript(([y,y2])=>{window.__badge=[];navigator.setAppBadge=async n=>{window.__badge.push(n)};navigator.clearAppBadge=async()=>{window.__badge.push(0)};if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
  localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'a',text:'운동',day:y,repeat:true}],days:{[y]:[1,1],[y2]:[2,2]}}));
  localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'c',name:'정보처리기사',goal:true}]}))},[day(-1),day(-2)]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmTodoSub')).toHaveText('1개 남음 · 🔥2일');
 await expect.poll(()=>page.evaluate(()=>window.__badge.at(-1))).toBe(1);
 await page.locator('#fmTodoOpen').click();const box=page.locator('#fmTodoOverlay');
 await expect(page.locator('#fmTodoHero')).toContainText('🔥 2일 연속 다 했어요');
 // 내일 chip puts a line under 📅 내일, not into today
 await page.locator('#fmTodoTmr').click();await page.fill('#fmTodoIn','장보기');await page.press('#fmTodoIn','Enter');
 await expect(box.locator('h3',{hasText:'📅 내일 1'})).toBeVisible();
 expect((await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_todo_v1')).list)).find(t=>t.text==='장보기').day).toBe(day(1));
 // the study goal offers a to-do; ticking it adds an hour to the certificate's study log
 await box.locator('[data-todo-sugg="cert"]').click();
 const study=box.locator('.fm-todo-row',{hasText:'정보처리기사 공부 1시간'});await expect(study).toHaveCount(1);
 await study.locator('.fm-todo-check').click();
 await expect.poll(()=>page.evaluate(d=>JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study?.[d],day(0))).toBe(60);
 await box.locator('[data-todo-check="a"]').click();
 await expect(page.locator('#fmTodoHero')).toContainText('🔥 3일 연속');
 await expect.poll(()=>page.evaluate(()=>window.__badge.at(-1))).toBe(0);
});

test('자격증 timer keeps running after the app closes and stopping records the minutes',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'c',name:'정보처리기사',goal:true}]}))});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmCertSub')).toHaveText('준비 중 · 오늘 공부 전');
 await page.locator('#fmCertOpen').click();
 await expect(page.locator('#fmCertList .fm-cert-empty')).toHaveCount(0);
 await page.locator('[data-cert-timer]').click();
 await expect(page.locator('[data-cert-timer]')).toContainText('끝내고 기록');
 await page.evaluate(()=>{const t=JSON.parse(localStorage.getItem('firemate_cert_timer_v1'));t.at-=45*6e4;localStorage.setItem('firemate_cert_timer_v1',JSON.stringify(t))});
 await page.reload();await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmCertSub')).toHaveText('⏱ 공부 중 45분');
 await page.locator('#fmCertOpen').click();await page.locator('[data-cert-timer]').click();
 await expect(page.locator('.fm-cert-today .fm-cert-add span')).toHaveText('오늘 45분');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_cert_timer_v1'))).toBeNull();
});

test('버킷 다음 한 걸음 goes to 오늘 할 일 and ticking it counts a step',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_bucket_v1',JSON.stringify({list:[{id:'b',name:'오로라 보기',cat:'travel',cost:4000000,at:1}]}))});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmBucketOpen').click();
 const box=page.locator('#fmBucketOverlay');
 await expect(box.locator('.fm-bk-next')).toContainText('첫 걸음을 적어 보세요');
 await box.locator('[data-bk-edit="b"]').click();await page.fill('#fmBkStep','항공권 가격 알아보기');await page.fill('#fmBkSaved','1000000');await page.locator('#fmBucketEForm button.primary').click();
 await expect(box.locator('.fm-bk-next strong')).toHaveText('항공권 가격 알아보기');
 await expect(box.locator('[data-bk-edit="b"] small').first()).toContainText('모은 돈 25%');
 await box.locator('[data-bk-todo="b"]').click();
 await box.locator('[data-close]').first().click();await page.locator('#fmTodoOpen').click();
 const row=page.locator('#fmTodoOverlay .fm-todo-row',{hasText:'항공권 가격 알아보기'});await row.locator('.fm-todo-check').click();
 const b=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_bucket_v1')).list[0]);
 expect(b.walked).toBe(1);expect(b.step).toBeUndefined();expect(b.saved).toBe(1000000);
});

test('할 일 understands 내일·매일·요일 words, edits the day, and a deleted line can be brought back',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmTodoOpen').click();
 const box=page.locator('#fmTodoOverlay'),list=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_todo_v1')).list);
 await page.fill('#fmTodoIn','내일 장보기');await page.press('#fmTodoIn','Enter');
 await page.fill('#fmTodoIn','매일 스트레칭');await page.press('#fmTodoIn','Enter');
 await page.fill('#fmTodoIn','세금 서류');await page.press('#fmTodoIn','Enter');
 let l=await list();
 expect(l.find(t=>t.text==='장보기').day).toBe(day(1));expect(l.find(t=>t.text==='스트레칭').repeat).toBe(true);
 await expect(page.locator('#fmTodoIn')).toBeFocused();
 // the sheet moves a line to any day
 await box.getByRole('button',{name:'세금 서류',exact:true}).click();await page.fill('#fmTodoEDay',day(3));await page.locator('#fmTodoEForm button.primary').click();
 expect((await list()).find(t=>t.text==='세금 서류').day).toBe(day(3));
 // delete → 되돌리기
 await box.locator('.fm-todo-text',{hasText:'스트레칭'}).click();await page.click('#fmTodoEDel');
 await expect(box.locator('.fm-todo-undo')).toContainText('스트레칭 지웠어요');
 await box.locator('[data-todo-undo]').click();
 expect((await list()).find(t=>t.text==='스트레칭').repeat).toBe(true);
 // a finished line does not say "N일째"
 await page.evaluate(d=>localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'x',text:'세탁소',day:d,done:true,doneAt:new Date().toISOString().slice(0,10)}]})),day(-3));
 await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmTodoOpen').click();
 await expect(box.locator('.fm-todo-row.done i.old')).toHaveCount(0);
});

test('자격증 search finds Korean nicknames like 토익·정처기·운전면허',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 for(const [q,name] of [['토익','TOEIC'],['정처기','정보처리기사'],['오픽','OPIc'],['운전면허','1종 보통 운전면허']]){await page.fill('#fmCertQ',q);await expect(page.locator('.fm-cert-hits button',{hasText:name}).first()).toBeVisible()}
});

test('자격증 +30분 can be taken back right away',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'c',name:'정보처리기사',goal:true}]}))});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await page.locator('.fm-cert-today [data-cert-add="30"]').click();
 await expect(page.locator('.fm-cert-today .fm-cert-add b')).toHaveText('30분');
 await page.locator('[data-cert-undo]').click();
 await expect(page.locator('.fm-cert-today .fm-cert-add b')).toHaveText('0분');
 await expect(page.locator('[data-cert-undo]')).toHaveCount(0);
});

test('자격증 화면: three numbers on top, grade filters only for a long wallet, no ladder or résumé copy',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'a',name:'일반기계기사',date:'2021-06-10'},{id:'b',name:'컴퓨터활용능력 1급',date:'2019-03-02'},{id:'c',name:'TOEIC',date:'2020-01-10'},{id:'d',name:'SQLD',date:'2023-09-01'},{id:'e',name:'컴퓨터활용능력 2급',date:'2018-03-02'}]}))});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await expect(page.locator('.fm-cert-stats')).toContainText('5보유');await expect(page.locator('.fm-wallet-sum')).toContainText('만료 1');
 await expect(page.locator('.fm-wallet-head h3')).toHaveText('보유 자격증 5');
 await expect(page.locator('.fm-wallet-f')).toHaveCount(0);await expect(page.locator('.fm-wallet .fm-cert-row')).toHaveCount(5);
 await expect(page.locator('.fm-lad, [data-cert-copy]')).toHaveCount(0);
});

test('버킷 ⭐ 올해 꼭 pins to the top; 위시 안 살래요 counts the money kept',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_bucket_v1',JSON.stringify({list:[{id:'1',name:'마라톤',cat:'health',at:1},{id:'2',name:'기술사 합격',cat:'learn',at:1}]}));localStorage.setItem('firemate_wishlist_v1',JSON.stringify({list:[{id:'w',name:'퀘스트',price:1200000,at:Date.now()}]}))});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmBucketOpen').click();
 await page.locator('[data-bk-edit="2"]').click();await page.locator('#fmBkPin').check();await page.locator('#fmBucketEForm button.primary').click();
 await expect(page.locator('.fm-bk-row').first()).toContainText('기술사 합격');await expect(page.locator('.fm-bk-row .fm-bk-pin')).toHaveCount(1);
 await page.locator('#fmBucketOverlay [data-close]').first().click();await page.locator('#fmWishOpen').click();
 await page.locator('[data-wish-edit="w"]').click();await page.locator('#fmWishESkip').click();
 await expect(page.locator('.fm-wish-kept')).toContainText('₩1,200,000');
 await expect(page.locator('.fm-wish-sec.skip')).toContainText('참은 것');
 await expect(page.locator('#fmWishSub')).toContainText('참음');
});

test('보유 자격증 opens a detail card: number with copy, undated ones are nudged and sorted by grade, 수정 edits',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'a',name:'2종 보통 운전면허'},{id:'b',name:'일반기계기사'},{id:'c',name:'PE Mechanical: Thermal and Fluid Systems'},{id:'d',name:'TOEIC',date:'2025-01-10'}]}))});
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await expect(page.locator('.fm-wallet .fm-cert-row strong')).toHaveText(['TOEIC','PE Mechanical: Thermal and Fluid Systems','일반기계기사','2종 보통 운전면허']);
 await expect(page.locator('.fm-cert-row',{hasText:'PE Mechanical'}).locator('.fm-cert-ico')).toHaveText('PE');
 await expect(page.locator('[data-cert-nodate]')).toContainText('취득일 안 넣은 자격증 3개');
 await page.locator('.fm-cert-row',{hasText:'일반기계기사'}).click();
 const d=page.locator('#fmCertDetail');await expect(d.locator('.fm-cd-card')).toContainText('일반기계기사');await expect(d).toContainText('평생');
 await d.locator('[data-cd-edit]').first().click();await page.fill('#fmCertNo','21-123-4567');await page.fill('#fmCertDate','2021-06-10');await page.locator('#fmCertForm button.primary').click();
 await expect(d.locator('.fm-cd-no')).toHaveText('21-123-4567');await expect(d.locator('.fm-cd-card')).toContainText('2021.06.10 취득');
 await d.locator('[data-cd-copy]').click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('21-123-4567');
 await d.locator('[data-cd-back]').click();await expect(d).toBeHidden();
 await expect(page.locator('[data-cert-nodate]')).toContainText('2개');
});

test('자격증 점검: empty screen offers common ones, passing a timed goal stops its timer, unknown names show no generic facts',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await expect(page.locator('.fm-cert-first')).toContainText('내 자격증을 넣어 보세요');await expect(page.locator('.fm-cert-empty')).toHaveCount(0);
 await page.locator('[data-cert-pick="TOEIC"]').click();await expect(page.locator('[data-cert-mode="have"]')).toHaveAttribute('aria-pressed','true');await page.locator('#fmCertCancel').click();
 await page.fill('#fmCertQ','사내 교육 수료');await page.locator('.fm-cert-hits .own').click();
 await expect(page.locator('#fmCertInfo')).toContainText('목록에 없는 자격증');await expect(page.locator('#fmCertInfo .fm-cs-facts')).toHaveCount(0);await page.locator('#fmCertCancel').click();
 await page.evaluate(()=>{localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true}]}));localStorage.setItem('firemate_cert_timer_v1',JSON.stringify({id:'g',at:Date.now()-6e5}))});
 await page.reload();await page.locator('#settingsBottom').click();await expect(page.locator('#fmCertSub')).toContainText('공부 중');
 await page.locator('#fmCertOpen').click();await expect(page.locator('.fm-cert-stats')).toContainText('올해 공부');
 await page.locator('.fm-cert-today .fm-cert-thead').click();await page.click('[data-cert-mode="have"]');await page.locator('#fmCertForm button.primary').click();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_cert_timer_v1'))).toBeNull();
 await expect(page.locator('#fmCertSub')).not.toContainText('공부 중');
});
