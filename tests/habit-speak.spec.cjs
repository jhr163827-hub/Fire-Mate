const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return ds(d)};
const seed=(page,fn,arg)=>page.addInitScript(([f,a])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');new Function('a',f)(a)},[fn,arg]);
const st=(page,k)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const more=async page=>{await page.goto('/index.html');await page.locator('#settingsBottom').click()};
// A fake microphone and speech recognizer (the test browser has neither); the recognizer "hears" one sentence.
const fakeMic=page=>page.addInitScript(()=>{
 navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop(){}}]});
 window.MediaRecorder=class{constructor(){this.state='inactive'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['x'],{type:'audio/webm'})});setTimeout(()=>this.onstop?.(),0)}};
 window.SpeechRecognition=window.webkitSpeechRecognition=class{start(){setTimeout(()=>this.onresult?.({results:[Object.assign([{transcript:'결론부터 말하면 음 세 가지가 있어요 어 첫째는 시간입니다'}],{isFinal:true})]}),50)}stop(){}};
});

test('🌱 습관: 매일·주 N회·횟수 채우기를 말로 알아듣고, 체크하면 🔥 연속과 이번 주 점, 다 하면 축하, 새로고침해도 남음',async({page})=>{
 await seed(page,`localStorage.setItem('firemate_habit_v1',JSON.stringify({list:[{id:'s',name:'스트레칭',type:'daily',at:1}],log:{[a[0]]:{s:1},[a[1]]:{s:1}}}))`,[day(-1),day(-2)]);
 await more(page);await page.locator('#fmHabitOpen').click();
 await expect(page.locator('[data-hb="s"]')).toContainText('🔥 2일');
 for(const t of ['운동 주 3회','물 8잔']){await page.fill('#fmHbIn',t);await page.press('#fmHbIn','Enter')}
 const l=(await st(page,'firemate_habit_v1')).list;expect(l.map(h=>[h.name,h.type,h.n||0])).toEqual([['스트레칭','daily',0],['운동','week',3],['물 8잔','count',8]]);
 await expect(page.locator('.fm-life-prog b')).toHaveText('0 / 3');
 await page.locator('[data-hb-on="s"]').click();await expect(page.locator('[data-hb="s"]')).toContainText('🔥 3일');
 const w=l[1].id,c=l[2].id;await page.locator('[data-hb-on="'+w+'"]').click();await expect(page.locator('[data-hb="'+w+'"]')).toContainText('이번 주 1/3');
 for(let i=0;i<7;i++)await page.locator('[data-hb-on="'+c+'"]').click();await expect(page.locator('[data-hb="'+c+'"]')).toContainText('오늘 7/8');
 await page.locator('[data-hb-on="'+c+'"]').click();await expect(page.locator('.fm-cele')).toContainText('오늘 습관 끝');
 await page.reload();await page.locator('#settingsBottom').click();await expect(page.locator('#fmHabitSub')).toHaveText('오늘 3/3');
 await page.locator('#fmHabitOpen').click();await page.locator('[data-hb="s"]').click();await expect(page.locator('.fm-hb-grass i.on')).toHaveCount(3);
 await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();
 const v=await st(page,'firemate_habit_v1');expect(v.list.map(h=>h.name)).toEqual(['운동','물 8잔']);expect(JSON.stringify(v.log)).not.toContain('"s"');
});

test('🌱 매일 할 일을 습관으로 옮기기(물어보고), 공부 타이머·말하기 연습으로 자동 체크',async({page})=>{
 const now=Date.now();
 await seed(page,`localStorage.setItem('firemate_todo_v1',JSON.stringify({list:[{id:'r',text:'영양제',day:'2026-01-01',repeat:true},{id:'o',text:'세탁소',day:a[0]}]}));localStorage.setItem('firemate_study_v1',JSON.stringify({subjects:[{id:'m',name:'수학',color:'#fff'}],log:[{id:'x',sub:'m',start:a[1]-40*6e4,min:40}],goal:180,dayStart:0,hide:[]}))`,[day(0),now]);
 await more(page);await page.locator('#fmHabitOpen').click();await page.locator('#fmHbMove').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('[data-hb]')).toHaveText([/영양제/]);expect((await st(page,'firemate_todo_v1')).list.map(t=>t.text)).toEqual(['세탁소']);
 await page.fill('#fmHbIn','수학 공부');await page.press('#fmHbIn','Enter');const id=(await st(page,'firemate_habit_v1')).list[1].id;
 await page.locator('[data-hb="'+id+'"]').click();await page.selectOption('#fmHbL','m');await page.fill('#fmHbM','30');await page.locator('#fmLifeForm .primary').click();
 await expect(page.locator('[data-hb-on="'+id+'"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-hb="'+id+'"]')).toContainText('공부 30분이면 자동');
 await page.fill('#fmHbIn','말하기 연습');await page.press('#fmHbIn','Enter');const sid=(await st(page,'firemate_habit_v1')).list[2].id;
 await expect(page.locator('[data-hb-on="'+sid+'"]')).toHaveAttribute('aria-pressed','false');
 await page.evaluate(d=>localStorage.setItem('firemate_speak_v1',JSON.stringify({list:[{id:'p',day:d,at:1,topic:'t',frame:'prep',sec:60,checks:[true,false,false,false]}]})),day(0));
 await page.locator('#fmLifeOverlay [data-close]').click();await page.locator('#fmHabitOpen').click();await expect(page.locator('[data-hb-on="'+sid+'"]')).toHaveAttribute('aria-pressed','true');
});

test('🗣️ 말하기 연습: 주제·틀, 녹음+받아쓰기 → 음·어 횟수와 분당 글자, 점검 저장(녹음은 폰에), 기록 열어 다시 듣고 지우기',async({page})=>{
 await fakeMic(page);
 await more(page);await page.locator('#fmSpeakOpen').click();
 const t1=await page.locator('#fmSpTopic').textContent();await page.locator('#fmSpNext').click();await expect(page.locator('#fmSpTopic')).not.toHaveText(t1);
 await page.locator('[data-sp-cat="면접"]').click();await page.locator('[data-sp-fr="star"]').click();await expect(page.locator('.fm-sp-steps li')).toHaveText(['상황','과제','내 행동','결과']);
 await page.locator('#fmSpStt').check();expect((await st(page,'firemate_speak_v1')).stt).toBe(true);
 await page.locator('#fmSpGo').click();await expect(page.locator('#fmSpGo')).toHaveText('⏹ 끝내기');await expect(page.locator('.fm-sp-live')).toContainText('세 가지');
 await page.waitForTimeout(6000);await page.locator('#fmSpGo').click();
 await expect(page.locator('.fm-sp-done .fm-life-h')).toContainText('음·어 2번');await expect(page.locator('.fm-sp-text mark')).toHaveText(['음','어']);await expect(page.locator('#fmSpAudio')).toHaveCount(1);
 await page.locator('[data-sp-ck="0"]').check();await page.locator('#fmSpSave').click();
 await expect.poll(async()=>(await st(page,'firemate_speak_v1'))?.list?.length).toBe(1);
 const r=(await st(page,'firemate_speak_v1')).list[0];expect(r).toMatchObject({frame:'star',filler:2,audio:1,checks:[true,false,false,true]});expect(r.cpm).toBeGreaterThan(0);
 expect(await page.evaluate(async id=>{const b=await new Promise((ok,no)=>{const q=indexedDB.open('firemate_files_v1');q.onsuccess=()=>{const g=q.result.transaction('certs').objectStore('certs').get('speak:'+id);g.onsuccess=()=>ok(g.result);g.onerror=no}});return !!b},r.id)).toBe(true);
 await expect(page.locator('.fm-life-prog small')).toContainText('🔥 1일 연속');
 await page.locator('[data-sp]').click();await expect(page.locator('#fmSpPlay')).toHaveCount(1);await page.locator('[data-life-del]').click();await page.locator('#fmAskOk').click();
 expect((await st(page,'firemate_speak_v1')).list).toHaveLength(0);
});

test('🗣️ 마이크가 없어도 시간만 재고 점검은 저장, 받아쓰기는 꺼져 있으면 안 씀 · 새 데이터는 백업에',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new Error('no')};window.SpeechRecognition=window.webkitSpeechRecognition=class{start(){window.__srStarted=1}stop(){}}});
 await more(page);await page.locator('#fmSpeakOpen').click();await page.locator('#fmSpGo').click();await expect(page.locator('#toast')).toContainText('녹음 없이');
 await page.locator('#fmSpGo').click();await expect(page.locator('#fmSpAudio')).toHaveCount(0);expect(await page.evaluate(()=>window.__srStarted||0)).toBe(0);
 await page.locator('#fmSpSave').click();await expect.poll(async()=>(await st(page,'firemate_speak_v1'))?.list?.length).toBe(1);expect((await st(page,'firemate_speak_v1')).list[0].audio).toBeUndefined();
 const src=await page.evaluate(async()=>await (await fetch('/index.html')).text()),ex=src.slice(src.indexOf('FM_BACKUP_EXTRAS='),src.indexOf('FM_BACKUP_FLAGS='));
 for(const k of ['firemate_habit_v1','firemate_speak_v1'])expect(ex).toContain(k);expect(src).toContain('speak:|');
});
