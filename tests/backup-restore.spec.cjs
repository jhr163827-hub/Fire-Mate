// Backup → empty phone → restore: every record outside the main data (lists that are arrays too), the user's decisions,
// photos in the ZIP, all-or-nothing restore when storage fails, and older backup files.
const {test,expect}=require('@playwright/test');
const fs=require('fs');
const today=new Date().toISOString().slice(0,10);
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

// A tiny stand-in for zip.js (the real one comes from a CDN, blocked in tests): same API, entries kept as JSON with base64 files.
const ZIP_MOCK=()=>{window.zip={BlobWriter:function(type){this.k='blob';this.type=type},TextWriter:function(){this.k='text'},BlobReader:function(b){this.b=b},TextReader:function(t){this.t=t},
 ZipWriter:function(){const e={};this.add=async(n,r)=>{if(r.t!==undefined)e[n]={t:r.t};else{const u=new Uint8Array(await r.b.arrayBuffer());let s='';u.forEach(c=>s+=String.fromCharCode(c));e[n]={b:btoa(s)}}};this.close=async()=>new Blob([JSON.stringify(e)],{type:'application/zip'})},
 ZipReader:function(r){this.getEntries=async()=>Object.entries(JSON.parse(await r.b.text())).map(([filename,v])=>({filename,getData:async w=>{if(w.k==='text')return v.t;const s=atob(v.b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Blob([u],{type:w.type})}}));this.close=async()=>{}}}};

const SEED={
 firemate_smart_v3:{theme:'dark',rec:[],favorites:[],budgets:{},tx:[{id:'a',date:today,type:'expense',category:'식비',amount:12000,memo:'점심'}],fire:{goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[],holdings:[]},
 firemate_trips_v1:[{id:'t1',name:'제주',area:'kr',place:'50110',from:'2026-07-20',to:'2026-07-23',budget:800000,photos:['trip:t1:p1'],bucket:'b1',notes:{'2026-07-21':'바다'}}],
 firemate_travel_spots_v1:[{id:'s1',lat:33.45,lon:126.56,d:'2026-07-21',area:'kr',place:'50110',name:'성산일출봉',with:'friends'}],
 firemate_travel_map_v1:{kr:{'50110':1},world:{JP:2}},
 firemate_home_hide_v1:['news','market'],
 firemate_todo_v1:{list:[{id:'d1',text:'운동',day:today,repeat:true,rw:[1,3]},{id:'d2',text:'🎓 정보처리기사 공부 1시간',day:today,cert:'c2',min:60}],days:{[today]:[0,2]}},
 firemate_certificates_v1:{list:[{id:'c1',name:'일반기계기사',date:'2021-06-10',no:'21-123'},{id:'c2',name:'정보처리기사',goal:true,study:{[today]:40}}]},
 firemate_bucket_v1:{list:[{id:'b1',name:'제주 한 달 살기',cat:'travel',done:true,doneAt:'2026-07-23',photo:'bucket:b1',at:1}]},
 firemate_study_v1:{subjects:[{id:'s1',name:'정보처리기사',color:'#4fe3a9',cert:'c2'}],log:[{id:'l1',sub:'s1',start:Date.parse(today+'T10:00:00'),min:40}],goal:180,dayStart:5,run:null,hide:[]},
 firemate_english_v1:{cards:{asset:{b:2,due:today,at:1}},days:{[today]:3},goal:10,mode:'quiz',mine:[]},
 firemate_rebal_v1:{us:60,kr:30,cash:10},
 firemate_import_deleted_v1:['bank|2026-10-01|x|1000'],
 firemate_buy_log_v1:[{id:'h1',at:today,prev:{qty:1,cost:10}}],
};
const FLAGS={firemate_split_off_v1:'1',firemate_newcat_v1:'1',firemate_cancelfix_v1:'1'};
const seed=(page,s,f)=>page.addInitScript(([s,f])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');for(const [k,v] of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));for(const [k,v] of Object.entries(f||{}))localStorage.setItem(k,v)},[s,f]);
const putFiles=page=>page.evaluate(()=>new Promise((ok,no)=>{const r=indexedDB.open('firemate_files_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('certs');r.onsuccess=()=>{const t=r.result.transaction('certs','readwrite'),s=t.objectStore('certs');s.put(new Blob(['CERT'],{type:'image/jpeg'}),'c1');s.put(new Blob(['TRIP'],{type:'image/jpeg'}),'trip:t1:p1');s.put(new Blob(['BUCK'],{type:'image/jpeg'}),'bucket:b1');t.oncomplete=()=>{r.result.close();ok()};t.onerror=()=>no(t.error)}}));
const readFiles=page=>page.evaluate(()=>new Promise(ok=>{const r=indexedDB.open('firemate_files_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('certs');r.onsuccess=()=>{const t=r.result.transaction('certs'),s=t.objectStore('certs'),out={};s.openCursor().onsuccess=async e=>{const c=e.target.result;if(c){out[c.key]=c.value;c.continue()}else{const o={};for(const [k,v] of Object.entries(out))o[k]=await v.text();r.result.close();ok(o)}}}}));
const openStorage=async page=>{await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click()};
const dump=(page,keys)=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),keys);

test('백업 → 빈 폰 복원: 여행·발자국·홈 설정(배열)·할 일·자격증·버킷·공부·영어·설정·결정 기록, 사진 ZIP까지 연결 그대로',async({browser})=>{
 const a=await (await browser.newContext()).newPage();await a.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await a.addInitScript(ZIP_MOCK);
 await seed(a,SEED,FLAGS);await a.goto('/index.html');await putFiles(a);
 await openStorage(a);
 const [dl]=await Promise.all([a.waitForEvent('download'),a.locator('#export').click()]);
 const text=fs.readFileSync(await dl.path(),'utf8'),backup=JSON.parse(text);
 // Arrays used to be dropped: trips, spots, home lines and the buy log are in the file now.
 expect(backup.extras.firemate_trips_v1).toEqual(SEED.firemate_trips_v1);
 expect(backup.extras.firemate_travel_spots_v1).toEqual(SEED.firemate_travel_spots_v1);
 expect(backup.extras.firemate_home_hide_v1).toEqual(SEED.firemate_home_hide_v1);
 expect(backup.extras.firemate_split_off_v1).toBe('1');
 expect(backup.extrasKeys).toContain('firemate_trips_v1');
 // No tokens, keys or passwords travel.
 expect(text).not.toMatch(/firemate_(drive_token|gmail_token|td_key|bank_zip_pwd|pin|lock)_v1/);
 // Photos: the ZIP used to fail whenever a certificate existed; bucket photos were never in it.
 const [zipDl]=await Promise.all([a.waitForEvent('download'),a.evaluate(()=>document.getElementById('fmPhotoSave').click())]);
 const zipBuf=fs.readFileSync(await zipDl.path());
 expect(Object.values(JSON.parse(JSON.parse(zipBuf.toString()).manifest_json?.t||JSON.parse(zipBuf.toString())['manifest.json'].t)).sort()).toEqual(['bucket:b1','c1','trip:t1:p1']);

 // An empty phone: ZIP first (before the data backup — still kept, linked once the backup is in), then the backup.
 const b=await (await browser.newContext()).newPage();await b.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await b.addInitScript(ZIP_MOCK);
 await b.goto('/index.html');await openStorage(b);
 await b.locator('#fmPhotoFile').setInputFiles({name:'p.zip',mimeType:'application/zip',buffer:zipBuf});
 await expect(b.locator('#toast')).toContainText('사진·파일 3개를 되살렸어요');
 await b.locator('#importFile').setInputFiles({name:'b.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await expect(b.locator('#fmAskText')).toContainText('여행 1');await expect(b.locator('#fmAskText')).toContainText('할 일 2');
 await Promise.all([b.waitForEvent('download'),b.locator('#fmAskOk').click()]);
 await expect(b.locator('#fmAskText')).toContainText('백업을 복원했어요');
 await Promise.all([b.waitForNavigation(),b.locator('#fmAskOk').click()]);
 const keys=[...Object.keys(SEED).filter(k=>k!=='firemate_smart_v3'),...Object.keys(FLAGS)],got=await dump(b,keys),want=await dump(a,keys);
 for(const k of keys)expect(got[k],k).toEqual(want[k]);
 expect(JSON.parse(await b.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).tx).toEqual(SEED.firemate_smart_v3.tx);
 expect(await readFiles(b)).toEqual({'bucket:b1':'BUCK',c1:'CERT','trip:t1:p1':'TRIP'});
 // The restored records still point at each other: trip ↔ bucket, cert ↔ study subject ↔ to-do.
 await b.locator('#settingsBottom').click();await b.locator('#fmJournalOpen').click();await b.locator('.fm-jn-trip',{hasText:'제주'}).click();
 await expect(b.locator('#fmJnHead')).toHaveText('제주');
 await b.goBack();await b.evaluate(()=>document.querySelectorAll('.modalbg.show').forEach(e=>{if(e.id!=='settingsOverlay')e.classList.remove('show')}));
 await b.locator('#fmStudyOpen').click();await expect(b.locator('#fmStudyBody .fm-st-sub',{hasText:'정보처리기사'})).toContainText('🎓 자격증과 연결');
});

test('복원 중 저장이 실패하면 전부 원래대로: 본 데이터·할 일·여행이 하나도 안 바뀌고 실패를 알려 줌',async({browser})=>{
 const a=await (await browser.newContext()).newPage();await a.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await seed(a,SEED,FLAGS);await a.goto('/index.html');await openStorage(a);
 const [dl]=await Promise.all([a.waitForEvent('download'),a.locator('#export').click()]);const text=fs.readFileSync(await dl.path(),'utf8');
 const b=await (await browser.newContext()).newPage();await b.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const mine={firemate_smart_v3:{theme:'dark',rec:[],budgets:{},tx:[{id:'mine',date:today,type:'expense',category:'카페',amount:4500,memo:'내 커피'}]},firemate_todo_v1:{list:[{id:'x',text:'이 폰의 할 일',day:today}]},firemate_trips_v1:[{id:'m',name:'이 폰 여행',from:'2026-01-01',to:'2026-01-02'}]};
 await seed(b,mine);await b.goto('/index.html');
 const keys=['firemate_smart_v3','firemate_todo_v1','firemate_trips_v1','firemate_certificates_v1','firemate_split_off_v1'],before=await dump(b,keys);
 // Storage gives up halfway: the travel list cannot be written.
 await b.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='firemate_trips_v1'&&String(v).includes('제주'))throw new DOMException('full','QuotaExceededError');return set.call(this,k,v)}});
 await openStorage(b);
 await b.locator('#importFile').setInputFiles({name:'b.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await Promise.all([b.waitForEvent('download'),b.locator('#fmAskOk').click()]);
 await expect(b.locator('#toast')).toContainText('복원 실패');await expect(b.locator('#toast')).toContainText('기존 데이터는 그대로');
 expect(await dump(b,keys)).toEqual(before);
});

test('예전 형식 백업(여행 목록 없음)은 이 폰의 여행을 지우지 않고 알려 주고, 모양이 틀린 항목은 건너뛴다고 이름을 말함',async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await seed(page,{firemate_smart_v3:SEED.firemate_smart_v3,firemate_trips_v1:[{id:'m',name:'이 폰 여행',from:'2026-01-01',to:'2026-01-02'}]});
 await page.goto('/index.html');await openStorage(page);
 const old={app:'FIRE MATE',version:5,exportedAt:new Date().toISOString(),data:SEED.firemate_smart_v3,extras:{firemate_todo_v1:SEED.firemate_todo_v1,firemate_bucket_v1:'깨진 값'}};
 await page.locator('#importFile').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await expect(page.locator('#fmAskText')).toContainText('예전 형식 백업');await expect(page.locator('#fmAskText')).toContainText('건너뛸 항목: 버킷리스트');
 await Promise.all([page.waitForEvent('download'),page.locator('#fmAskOk').click()]);
 await expect(page.locator('#fmAskText')).toContainText('복원하지 못한 항목: 버킷리스트');
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_trips_v1')))[0].name).toBe('이 폰 여행');
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_todo_v1'))).list).toHaveLength(2);
});

test('새 형식 백업에 없는 항목은 비워서, 백업한 그 상태와 똑같아짐',async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await seed(page,{firemate_smart_v3:SEED.firemate_smart_v3,firemate_trips_v1:[{id:'m',name:'이 폰 여행',from:'2026-01-01',to:'2026-01-02'}]},{firemate_split_off_v1:'1'});
 await page.goto('/index.html');await openStorage(page);
 const now={app:'FIRE MATE',version:5,exportedAt:new Date().toISOString(),data:SEED.firemate_smart_v3,extras:{firemate_todo_v1:SEED.firemate_todo_v1},extrasKeys:['firemate_todo_v1','firemate_trips_v1','firemate_split_off_v1']};
 await page.locator('#importFile').setInputFiles({name:'new.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(now))});
 await Promise.all([page.waitForEvent('download'),page.locator('#fmAskOk').click()]);
 await expect(page.locator('#fmAskText')).toContainText('백업을 복원했어요');
 expect(await page.evaluate(()=>[localStorage.getItem('firemate_trips_v1'),localStorage.getItem('firemate_split_off_v1')])).toEqual([null,null]);
});

test('망가진 백업 파일은 아무것도 바꾸지 않음',async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await seed(page,{firemate_smart_v3:SEED.firemate_smart_v3,firemate_todo_v1:SEED.firemate_todo_v1});await page.goto('/index.html');await openStorage(page);
 const before=await dump(page,['firemate_smart_v3','firemate_todo_v1']);
 for(const bad of ['{"app":"FIRE MATE"','{"app":"FIRE MATE","version":5,"data":{"tx":"x"}}']){
  await page.locator('#importFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(bad)});
  await expect(page.locator('#toast')).toContainText('복원 실패');
 }
 expect(await dump(page,['firemate_smart_v3','firemate_todo_v1'])).toEqual(before);
});
