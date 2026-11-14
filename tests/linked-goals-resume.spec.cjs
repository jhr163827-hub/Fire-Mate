const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(()=>{if(sessionStorage.qa)return;sessionStorage.qa='1';
 const set=(k,v)=>localStorage.setItem('firemate_'+k+'_v1',JSON.stringify(v));
 localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},fire:{goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},accounts:[{id:'cash',name:'현금 계좌',kind:'cash',amount:10000000,fire:false}],holdings:[],tx:[]}));
 set('bucket',{list:[{id:'b',name:'스위스 여행',cost:5000000,saved:100000,cat:'travel'}]});
 set('alloc',{list:[{id:'a',name:'여행 자금',amt:2000000,bucket:'b',trip:'t',reward:'r'}]});
 set('trips',[{id:'t',name:'스위스',from:'2027-01-01',to:'2027-01-07',area:'world',country:'CH'}]);
 set('reward',{list:[{id:'r',name:'여행 보상',goal:200000000}]});
 set('content',{list:[{id:'c',title:'보던 책',kind:'book',status:'doing',progress:20,up:100}]});
 set('project',{list:[{id:'p',name:'첫 영상',at:200}]});set('todo',{list:[{id:'todo',text:'편집',proj:'p',day:'2026-11-14'}]});
 set('study',{subjects:[{id:'s',name:'기술사',color:'#4fe3a9'}],log:[],run:{sub:'s',start:Date.now(),at:null,acc:1000}});
 });await page.goto('/index.html');
});
test('이어하기는 실제 진행 중 항목 3개, 상세 이동·숨기기·재표시·재시작 유지',async({page})=>{
 const cards=page.locator('#fmHomeResume [data-resume]');await expect(cards).toHaveCount(3);await expect(cards.first()).toContainText('기술사');
 await page.locator('[data-resume="content"]').click();await expect(page.locator('#fmLifeSheet')).toBeVisible();await expect(page.locator('#fmCtT')).toHaveValue('보던 책');
 await page.locator('[data-life-x]').click();await page.locator('#fmLifeOverlay [data-close]').click();
 await page.locator('#fmResumeHide').click();await expect(page.locator('#fmHomeResume')).toBeHidden();await page.reload();await expect(page.locator('#fmHomeResume')).toBeHidden();
 await page.locator('#settingsBottom').click();await page.locator('#fmMoreEdit').click();await page.locator('#fmResumeOn').check();await page.locator('#fmMoreDone').click();await page.locator('#settingsOverlay [data-close]').click();await expect(cards).toHaveCount(3);
});
test('연결된 버킷은 배정액을 읽고 수동 금액은 보존, 배정 변경·연결 해제 반영',async({page})=>{
 await page.locator('#settingsBottom').click();await page.locator('#fmBucketOpen').click();await page.locator('[data-bk-edit="b"]').click();
 await expect(page.locator('#fmBkSaved')).toHaveValue('2,000,000');await expect(page.locator('#fmBkSaved')).toHaveAttribute('readonly','');
 await page.locator('#fmBucketEForm button.primary').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.firemate_bucket_v1).list[0].saved)).toBe(100000);
 await page.locator('#fmBucketOverlay [data-close]').click();await page.locator('#fmAllocOpen').click();await page.locator('[data-al="a"]').click();await page.locator('#fmAlA').fill('2500000');await page.locator('#fmLifeForm .primary').click();
 await page.locator('#fmLifeOverlay [data-close]').click();await page.locator('#fmBucketOpen').click();await page.locator('[data-bk-edit="b"]').click();await expect(page.locator('#fmBkSaved')).toHaveValue('2,500,000');await page.locator('#fmBucketEForm button.primary').click();await page.locator('#fmBucketOverlay [data-close]').click();await page.locator('#fmAllocOpen').click();
 await page.locator('[data-al="a"]').click();await page.locator('#fmAl_bucket').selectOption('');await page.locator('#fmLifeForm .primary').click();await page.locator('#fmLifeOverlay [data-close]').click();await page.locator('#fmBucketOpen').click();await page.locator('[data-bk-edit="b"]').click();await expect(page.locator('#fmBkSaved')).toHaveValue('100,000');await expect(page.locator('#fmBkSaved')).not.toHaveAttribute('readonly','');
});
test('연결은 백업에 포함되고, 중복 연결·한도 초과·저장 실패는 기존 배정을 보존',async({page})=>{
 const [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.getElementById('export').click())]);
 expect(JSON.parse(fs.readFileSync(await dl.path(),'utf8')).extras.firemate_alloc_v1.list[0]).toMatchObject({bucket:'b',trip:'t',reward:'r'});
 await page.evaluate(()=>{const v=JSON.parse(localStorage.firemate_alloc_v1);v.list.push({id:'a2',name:'다른 돈',amt:1});localStorage.firemate_alloc_v1=JSON.stringify(v)});
 await page.locator('#settingsBottom').click();await page.locator('#fmAllocOpen').click();await page.locator('[data-al="a2"]').click();await page.locator('#fmAl_bucket').selectOption('b');await page.locator('#fmLifeForm .primary').click();await expect(page.locator('#fmLifeSheet')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.firemate_alloc_v1).list[1].bucket)).toBeUndefined();
 await page.locator('#fmAl_bucket').selectOption('');await page.locator('#fmAlA').fill('999999999999');await page.locator('#fmLifeForm .primary').click();expect(await page.evaluate(()=>JSON.parse(localStorage.firemate_alloc_v1).list[1].amt)).toBe(1);
 await page.locator('#fmAlA').fill('200');await page.evaluate(()=>{const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='firemate_alloc_v1')throw new Error('quota');return orig.call(this,k,v)}});await page.locator('#fmLifeForm .primary').click();expect(await page.evaluate(()=>JSON.parse(localStorage.firemate_alloc_v1).list[1].amt)).toBe(1);
});
test('숫자 기준과 오래된 시장 자료 시각 표시',async({page})=>{
 await expect(page.locator('.fm-number-basis')).toContainText('입출금·시세·환율');
 await page.route('**/chart-data/live-quotes.json',r=>r.fulfill({json:{updatedAt:'2020-01-01T00:00:00Z',quotes:{'IDX-USDKRW':{price:1400,prevClose:1390,at:'2020-01-01T00:00:00Z'}}}}));await page.reload();await expect(page.locator('#fmHomeMarket')).toContainText('오래된 자료');
});
