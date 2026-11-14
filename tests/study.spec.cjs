const {test,expect}=require('@playwright/test');
const open=async page=>{await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();await expect(page.locator('#fmStudyOverlay')).toBeVisible()};

test('⏱️ 공부 타이머 (더보기 안): 자격증 목표가 과목으로 들어오고, 끝내면 기록과 자격증 오늘 공부에 더해진다',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true},{id:'h',name:'일반기계기사',date:'2021-06-10'}]}))});
 await page.goto('/index.html');
 await expect(page.locator('#fmStudySub')).toHaveText('오늘 공부 전');
 await open(page);
 await expect(page.locator('#fmStudyBody .fm-st-sub strong')).toHaveText(['정보처리기사']);
 await page.locator('[data-st-play]').first().click();
 await expect(page.locator('#fmStudyFocus')).toBeVisible();
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1'));s.run.start-=40*6e4;s.run.at-=40*6e4;localStorage.setItem('firemate_study_v1',JSON.stringify(s))});
 await page.reload();await expect(page.locator('#fmStudySub')).toHaveText('⏱ 공부 중');
 await open(page);
 await expect(page.locator('#fmStudyFocus')).toBeVisible();await expect(page.locator('#fmStudyBig')).toContainText('00:40:');
 // phone back closes only the focus screen; the timer keeps going
 await page.goBack();await expect(page.locator('#fmStudyFocus')).toBeHidden();await expect(page.locator('#fmStudyOverlay')).toBeVisible();
 await page.locator('[data-st-play]').first().click();await expect(page.locator('#fmStudyFocus')).toBeVisible();
 await page.locator('#fmStudyStop').click();
 await expect(page.locator('#fmStudyFocus')).toBeHidden();await expect(page.locator('[data-st-total]')).toContainText('0:40:');
 const v=await page.evaluate(()=>({s:JSON.parse(localStorage.getItem('firemate_study_v1')),c:JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study}));
 expect(v.s.log).toHaveLength(1);expect(v.s.log[0].min).toBe(40);expect(Object.values(v.c)).toEqual([40]);
 // the 자격증 screen shows the same minutes; deleting the record takes them back off
 await page.locator('[data-st-tab="r"]').click();await expect(page.locator('.fm-st-sess')).toHaveCount(1);
 await page.locator('[data-st-del]').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('.fm-st-sess')).toHaveCount(0);
 expect(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study))).toEqual([0]);
});

test('⏱️ 공부 타이머: 과목 추가·삭제(삭제한 자격증 과목은 다시 안 생김), 일시정지, 내리기, 바로 가기와 백업',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true}]}))});
 await page.goto('/index.html');await open(page);
 await page.locator('#fmStudyBody [data-st-new]').click();await page.fill('#fmStudyName','수학');await page.locator('#fmStudyForm .primary').click();
 await expect(page.locator('#fmStudyBody .fm-st-sub strong')).toHaveText(['정보처리기사','수학']);
 await page.locator('[data-st-play]').nth(1).click();await page.locator('#fmStudyPause').click();
 await expect(page.locator('#fmStudyPause')).toHaveText('계속하기');await expect(page.locator('#fmStudyBig')).toHaveClass(/paused/);
 await page.locator('#fmStudyMin').click();await expect(page.locator('#fmStudyFocus')).toBeHidden();await expect(page.locator('[data-st-play]').nth(1)).toContainText('⏸');
 await page.locator('[data-st-tab="s"]').click();await page.locator('[data-st-edit]').first().click();
 await page.locator('[data-st-rm]').click();await page.locator('#fmAskOk').click();
 await page.reload();await open(page);await expect(page.locator('#fmStudyBody .fm-st-sub strong')).toHaveText(['수학']);
 expect(await page.evaluate(async()=>(await (await fetch('/index.html')).text()).includes("FM_BACKUP_EXTRAS=['firemate_study_v1'"))).toBe(true);
 await page.goto('/index.html?action=study');await expect(page.locator('#fmStudyOverlay')).toBeVisible();
});

test('⏱️ 공부 타이머: 일시정지한 시간은 빼고, 하루 시작(5시)을 넘긴 공부는 날마다 나누고, 12시간 넘게 켜 두면 물어보고, 기록을 고치면 자격증도 같이 맞춰짐',async({page})=>{
 const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const t=new Date();t.setHours(6,0,0,0);if(Date.now()<t.getTime())t.setDate(t.getDate()-1);// today 06:00 (already past)
 const y=new Date(t);y.setDate(y.getDate()-1);
 await page.addInitScript(([a,b])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true}]}));
  // 04:00 → 06:00: one hour before the 5 o'clock line (the day before), one hour after it.
  localStorage.setItem('firemate_study_v1',JSON.stringify({subjects:[{id:'s',name:'정보처리기사',color:'#4fe3a9',cert:'g'}],log:[],goal:180,dayStart:5,hide:[],run:{sub:'s',start:a-2*36e5,at:null,acc:2*36e5,segs:[[a-2*36e5,a]]}}))},[t.getTime(),0]);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();
 await page.locator('#fmStudyStop').click();
 await expect(page.locator('#toast')).toContainText('2일에 나눠');
 let v=await page.evaluate(()=>({log:JSON.parse(localStorage.getItem('firemate_study_v1')).log,c:JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study}));
 expect(v.log.map(x=>x.min)).toEqual([60,60]);expect(v.c).toEqual({[ds(y)]:60,[ds(t)]:60});
 // Paused stretch left out: 20 min studied, then paused for 40.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1')),n=Date.now();s.run={sub:'s',start:n-60*6e4,at:null,acc:20*6e4,segs:[[n-60*6e4,n-40*6e4]]};localStorage.setItem('firemate_study_v1',JSON.stringify(s))});
 await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();
 await expect(page.locator('#fmStudyPause')).toHaveText('계속하기');await page.locator('#fmStudyStop').click();
 await expect(page.locator('#toast')).toContainText('20분 기록');
 // Left on for 13 hours: asks, keeps the first 12.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1')),n=Date.now();s.log=[];s.run={sub:'s',start:n-13*36e5,at:n-13*36e5,acc:0,segs:[]};localStorage.setItem('firemate_study_v1',JSON.stringify(s));const c=JSON.parse(localStorage.getItem('firemate_certificates_v1'));c.list[0].study={};localStorage.setItem('firemate_certificates_v1',JSON.stringify(c))});
 await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();await page.locator('#fmStudyStop').click();
 await expect(page.locator('#fmAskText')).toContainText('끝내는 걸 잊었나요?');await page.locator('#fmAskOk').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_study_v1')).log.reduce((n,x)=>n+x.min,0))).toBe(720);
 // Fix one record: the certificate follows the difference.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1')),n=Date.now();s.log=[{id:'f',sub:'s',start:n-6e4,min:50}];localStorage.setItem('firemate_study_v1',JSON.stringify(s));const c=JSON.parse(localStorage.getItem('firemate_certificates_v1')),x=new Date(n-6e4-5*36e5);c.list[0].study={[x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')]:50};localStorage.setItem('firemate_certificates_v1',JSON.stringify(c))});
 await page.reload();await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();await page.locator('[data-st-tab="r"]').click();
 await page.locator('[data-st-fix="f"]').click();await page.fill('#fmStudyMin','30');await page.locator('#fmStudyForm .primary').click();
 v=await page.evaluate(()=>({m:JSON.parse(localStorage.getItem('firemate_study_v1')).log[0].min,c:Object.values(JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study)}));
 expect(v.m).toBe(30);expect(v.c).toEqual([30]);
});
