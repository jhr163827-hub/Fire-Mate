const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],accounts:[],holdings:[]}))});
});
const openSettings=async(page,id)=>{await page.locator('#settingsBottom').click();await page.locator('#'+id).click()};

test('📖 영어 공부: new words, reveal, 알아요 schedules a review, 다시 comes back today, goal and home line',async({page})=>{
 await page.goto('/index.html');
 await openSettings(page,'fmEngOpen');
 const box=page.locator('#fmEngOverlay');
 await box.locator('[data-mode=card]').click();
 await expect(box.locator('.fm-eng-card strong')).toHaveText('accomplish');
 await expect(box.locator('.fm-eng-card small')).toContainText('남은 10개');
 await page.click('#fmEngReveal');
 await expect(box.locator('.fm-eng-mean')).toHaveText('성취하다, 해내다');
 await expect(box.locator('.fm-eng-ex')).toContainText('ahead of schedule');
 await page.click('#fmEngKnow');
 await expect(box.locator('.fm-eng-card strong')).toHaveText('accurate');
 await page.click('#fmEngReveal');await page.click('#fmEngAgain');
 await expect(box.locator('.fm-eng-card small')).toContainText('남은 9개');
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_english_v1')));
 expect(s.cards.accomplish).toMatchObject({b:1,at:expect.any(String)});expect(s.cards.accomplish.due>s.cards.accomplish.at).toBe(true);
 expect(s.cards.accurate.b).toBe(0);
 expect(Object.values(s.days)[0]).toBe(2);
 await box.locator('#fmEngGoal [data-goal="5"]').click();
 await expect(box.locator('.fm-eng-card small')).toContainText('남은 4개');// accurate (due) + 3 new
 expect(await page.evaluate(()=>localStorage.getItem('firemate_english_words_v1')!==null)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await box.locator('[data-close]').click();await page.locator('#settingsOverlay [data-close]').first().click();
 await expect(page.locator('#fmHomeEng')).toContainText('영어 오늘 4개');
});

test('😴 수면·걸음 reads Samsung Health sleep and step CSVs, skips stage files and shows the last night on home',async({page})=>{
 await page.goto('/index.html');
 await openSettings(page,'fmHealthOpen');
 const y=day(-1),t=day(0),ms=d=>Date.parse(d+'T00:00:00Z');
 // Times are UTC with a +09:00 offset: 14:40Z = 23:40 local, 21:52Z = 06:52 local next morning.
 const sleep='com.samsung.shealth.sleep,6315003,3\ncom.samsung.health.sleep.start_time,com.samsung.health.sleep.end_time,com.samsung.health.sleep.time_offset,extra_data\n'+y+' 14:40:00.000,'+y+' 21:52:00.000,UTC+0900,"a,b"\n'+y+' 05:00:00.000,'+y+' 05:10:00.000,UTC+0900,\n';
 const stage='com.samsung.health.sleep_stage,1,1\nstart_time,end_time,stage\n'+y+' 15:00:00.000,'+y+' 16:00:00.000,40001\n';
 const steps='com.samsung.shealth.step_daily_trend,1,1\nday_time,count,source_type\n'+ms(y)+',8432,-2\n'+ms(y)+',9000,0\n'+ms(t)+',1200,-2\n';
 await page.setInputFiles('#fmHealthFile',[{name:'com.samsung.shealth.sleep.20261031.csv',mimeType:'text/csv',buffer:Buffer.from(sleep)},{name:'com.samsung.shealth.sleep_stage.20261031.csv',mimeType:'text/csv',buffer:Buffer.from(stage)},{name:'com.samsung.shealth.step_daily_trend.20261031.csv',mimeType:'text/csv',buffer:Buffer.from(steps)}]);
 await expect(page.locator('#toast')).toContainText('수면 1일 · 걸음 2일');
 const h=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_health_v1')));
 expect(h.sleep[t]).toEqual([432,'23:40','06:52']);
 expect(h.steps).toEqual({[y]:8432,[t]:1200});
 await expect(page.locator('#fmHealthHero')).toContainText('7시간 12분');
 await expect(page.locator('#fmHealthHero')).toContainText('23:40 → 06:52');
 await expect(page.locator('#fmHealthBody .fm-hl-bars')).toHaveCount(2);
 await page.locator('#fmHealthOverlay [data-close]').click();await page.locator('#settingsOverlay [data-close]').first().click();
 await expect(page.locator('#fmHomeHealth')).toContainText('지난밤 7시간 12분 · 어제 8,432걸음');
});

test('✈️ 여행 일지: 국내/해외 maps mark 가 봤어요·가고 싶어요, a trip gets a place, checklist, budget, rating, notes and photos, and shows on home',async({page})=>{
 await page.addInitScript(([a,b])=>{if(sessionStorage.getItem('qa2'))return;sessionStorage.setItem('qa2','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',accounts:[],holdings:[],tx:[{id:'x1',date:a,type:'expense',category:'식비',amount:32000,memo:'라멘'},{id:'x2',date:b,type:'expense',category:'교통',amount:15000,memo:'JR'}]}))},[day(-3),day(-2)]);
 await page.goto('/index.html');
 await openSettings(page,'fmJournalOpen');
 const box=page.locator('#fmJournalOverlay');
 await expect(box.locator('.fm-jn-map path')).toHaveCount(17);
 // Tapping 강원 marks it 가 봤어요, then 가고 싶어요 (a chip), then clears it.
 const gw=box.locator('path[data-place="gangwon"]');
 await gw.click();await expect(gw).toHaveClass('been');await expect(box.locator('.fm-jn-stat')).toContainText('가 봤어요 1 / 17곳');
 await gw.click();await expect(gw).toHaveClass('want');await expect(box.locator('.fm-jn-wants button')).toHaveText('강원');
 await gw.click();await expect(gw).not.toHaveClass(/been|want/);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_travel_map_v1')))).toEqual({kr:{},world:{}});
 // 해외: add a past trip to Japan; the country turns visited.
 await box.locator('[data-area=world]').click();
 await expect(box.locator('.fm-jn-map path[data-place="JP"]')).toHaveCount(1);
 await page.click('#fmJnNew');
 for(const w of [390,320]){await page.setViewportSize({width:w,height:844});const r=await page.locator('#fmJnAdd button').boundingBox();expect(r.x+r.width).toBeLessThanOrEqual(w)}
 await page.setViewportSize({width:390,height:844});
 await page.fill('#fmJnName','오사카');await page.selectOption('#fmJnPlace','JP');await page.fill('#fmJnFrom',day(-3));await page.fill('#fmJnTo',day(-2));await page.click('#fmJnAdd button');
 await expect(box.locator('path[data-place="JP"]')).toHaveClass('been');
 const trip=box.locator('.fm-jn-trip');await expect(trip).toContainText('오사카');await expect(trip).toContainText('₩47,000');await expect(trip.locator('.fm-jn-noimg')).toHaveText('🇯🇵');
 await trip.click();
 await expect(page.locator('#fmJnHead')).toHaveText('오사카');
 await expect(box.locator('.fm-jn-hero')).toContainText('₩47,000');
 await expect(page.locator('.fm-jn-day')).toHaveCount(2);await expect(page.locator('.fm-jn-day').first()).toContainText('라멘');
 await page.fill('#fmJnBudget','10');await page.locator('#fmJnBudget').blur();await expect(box.locator('.fm-jn-budget')).toContainText('₩53,000 남음');
 await box.locator('[data-rate="5"]').click();await page.fill('#fmJnReview','또 가고 싶다');await page.locator('#fmJnReview').blur();
 await page.locator('[data-note]').first().fill('도톤보리 산책');await page.locator('[data-note]').first().blur();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
 await page.setInputFiles('#fmJnPhoto',{name:'a.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('.fm-jn-photos [data-view]')).toHaveCount(1);
 let t=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_trips_v1'))[0]);
 expect(t).toMatchObject({area:'world',place:'JP',budget:100000,rating:5,review:'또 가고 싶다',notes:{[t.from]:'도톤보리 산책'}});expect(t.photos).toHaveLength(1);
 await page.locator('.fm-jn-photos [data-view]').click();
 await page.locator('.fm-jn-view button',{hasText:'지우기'}).click();await page.locator('#fmAskOk').click();
 await expect(page.locator('.fm-jn-photos [data-view]')).toHaveCount(0);
 // The phone's back closes only the trip page.
 await page.goBack();await expect(page.locator('#fmJnHead')).toHaveText('여행 일지');await expect(box).toBeVisible();
 await expect(trip).toContainText('★★★★★ 또 가고 싶다');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('✈️ an upcoming trip has a checklist and shows on home with its D-day',async({page})=>{
 await page.addInitScript(([a,b,c])=>{if(sessionStorage.getItem('qa2'))return;sessionStorage.setItem('qa2','1');localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'s',name:'다낭',area:'world',place:'VN',from:a,to:b}]))},[day(10),day(13)]);
 await page.goto('/index.html');
 const line=page.locator('#fmHomeTrip');await expect(line).toContainText('다낭 D-10 · 준비 0/7');
 await line.click();
 await expect(page.locator('#fmJnHead')).toHaveText('다낭');
 await page.fill('#fmJnItemIn','선크림');await page.click('#fmJnItem button');
 const checks=page.locator('#fmJournalOverlay [data-chk]');await expect(checks).toHaveCount(8);
 for(let i=0;i<8;i++)await checks.nth(i).click();
 await expect(page.locator('.fm-cele')).toContainText('준비 끝!');
 await page.locator('#fmJournalOverlay [data-close]').click();await page.locator('#fmJournalOverlay [data-close]').click();
 await expect(line).toContainText('준비 8/8');
});

test('📖 퀴즈 picks the meaning out of four; my own words come first and can be removed',async({page})=>{
 await page.goto('/index.html');
 await openSettings(page,'fmEngOpen');
 const box=page.locator('#fmEngOverlay');
 await expect(box.locator('[data-mode=quiz]')).toHaveAttribute('aria-pressed','true');
 await expect(box.locator('.fm-eng-card strong')).toHaveText('accomplish');
 const opts=box.locator('[data-opt]');await expect(opts).toHaveCount(4);
 await opts.filter({hasText:'성취하다, 해내다'}).click();
 await expect(box.locator('[data-opt].ok')).toHaveText('성취하다, 해내다');await expect(box.locator('.fm-eng-ex')).toContainText('ahead of schedule');
 await page.click('#fmEngNext');
 // A wrong pick shows the right one and brings the word back today.
 await expect(box.locator('.fm-eng-card strong')).toHaveText('accurate');
 await opts.filter({hasNotText:'정확한'}).first().click();
 await expect(box.locator('[data-opt].no')).toHaveCount(1);await expect(box.locator('[data-opt].ok')).toHaveText('정확한');
 await page.click('#fmEngNext');
 let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_english_v1')));
 expect(s.cards.accomplish.b).toBe(1);expect(s.cards.accurate.b).toBe(0);
 // 내 단어: added words are learned before the built-in list.
 await box.locator('#fmEngMineSum').click();
 await page.fill('#fmEngW','hydraulic');await page.fill('#fmEngM','유압의');await page.fill('#fmEngX','Check the hydraulic pressure.');await page.click('#fmEngAdd button');
 await expect(box.locator('#fmEngMineSum')).toHaveText('＋ 내 단어 1개');
 s=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_english_v1')));expect(s.mine).toEqual([['hydraulic','유압의','Check the hydraulic pressure.']]);
 await box.locator('[data-close]').click();await page.locator('#fmEngOpen').click();
 await expect(box.locator('.fm-eng-card strong')).toHaveText('accurate');// due review first
 await opts.filter({hasText:'정확한'}).click();await page.click('#fmEngNext');
 await expect(box.locator('.fm-eng-card strong')).toHaveText('hydraulic');await expect(box.locator('.fm-eng-card small')).toContainText('내 단어');
 await box.locator('[data-mine="hydraulic"]').click();await page.locator('#fmAskOk').click();
 await expect(box.locator('#fmEngMineSum')).toHaveText('＋ 내 단어');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_english_v1')).mine)).toEqual([]);
});

test('📸 photos and PDFs on this phone are counted and saved as one ZIP that puts them back',async({page})=>{
 const path=require('path'),ZIPJS=path.join(path.dirname(require.resolve('@zip.js/zip.js/package.json')),'dist','zip.min.js');
 await page.route('https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.62/dist/zip.min.js',r=>r.fulfill({path:ZIPJS,contentType:'application/javascript'}));
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa3'))return;sessionStorage.setItem('qa3','1');localStorage.setItem('firemate_trips_v1',JSON.stringify([{id:'t',name:'제주',from:'2026-07-10',to:'2026-07-11',photos:['trip:t:1']}]))});
 await page.goto('/index.html');
 await page.evaluate(()=>new Promise((ok,no)=>{const r=indexedDB.open('firemate_files_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('certs');r.onsuccess=()=>{const t=r.result.transaction('certs','readwrite');t.objectStore('certs').put(new Blob(['jpg-bytes'],{type:'image/jpeg'}),'trip:t:1');t.oncomplete=()=>{r.result.close();ok()};t.onerror=no}}));
 await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click();
 await expect(page.locator('#fmPhotoKeepN')).toHaveText('📸 사진·파일 1개는 이 폰에만 있어요');
 const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#fmPhotoSave')]);
 expect(dl.suggestedFilename()).toMatch(/^firemate-photos-\d{4}-\d\d-\d\d\.zip$/);
 const file=await dl.path(),buf=require('fs').readFileSync(file);
 // Wipe the photo, then load the ZIP back.
 await page.evaluate(()=>new Promise(ok=>{const r=indexedDB.open('firemate_files_v1',1);r.onsuccess=()=>{const t=r.result.transaction('certs','readwrite');t.objectStore('certs').clear();t.oncomplete=()=>{r.result.close();ok()}}}));
 await page.setInputFiles('#fmPhotoFile',{name:'p.zip',mimeType:'application/zip',buffer:buf});
 await expect(page.locator('#toast')).toContainText('사진·파일 1개를 되살렸어요');
 expect(await page.evaluate(()=>new Promise(ok=>{const r=indexedDB.open('firemate_files_v1',1);r.onsuccess=()=>{const q=r.result.transaction('certs').objectStore('certs').get('trip:t:1');q.onsuccess=async()=>ok(q.result&&await q.result.text())}}))).toBe('jpg-bytes');
});
