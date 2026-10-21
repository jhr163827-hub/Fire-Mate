const {test,expect}=require('@playwright/test');
const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return ds(d)};
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('a first visit offers three ways to start; example data can be explored and cleared',async({page})=>{
 await page.addInitScript(()=>{window.__fmStartTest=true});
 await page.goto('/index.html');
 const card=page.locator('#fmStart');
 await expect(card.locator('[data-start]')).toHaveCount(3);
 await card.locator('[data-start="demo"]').click();
 await expect(page.locator('#fmDemoBar')).toBeVisible();
 const tx=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length);expect(tx).toBeGreaterThan(50);
 await expect(page.locator('#fmStart')).toHaveCount(0);
 await page.locator('#fmDemoBar button').click();await page.locator('#fmAskOk').click();
 await page.waitForLoadState('load');
 await expect(page.locator('#fmDemoBar')).toHaveCount(0);
 expect(await page.evaluate(()=>(JSON.parse(localStorage.getItem('firemate_smart_v3')||'{}').tx||[]).length)).toBe(0);
 await expect(page.locator('#fmStart')).toHaveCount(0);
});

test('"직접 기록으로 시작" opens the entry dialog and is remembered',async({page})=>{
 await page.addInitScript(()=>{window.__fmStartTest=true});
 await page.goto('/index.html');
 await page.locator('#fmStart [data-start="manual"]').click();
 await expect(page.locator('#entryOverlay')).toHaveClass(/show/);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_start_choice_v1'))).toBe('manual');
});

test('FIRE says how much more a month brings the date a year closer',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[],accounts:[{id:'k',name:'KB',kind:'cash',amount:100000000}],holdings:[],fire:{asset:10000,goal:65000,monthly:300,rate:6,withdrawal:4}}))});
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('fire'));
 await expect(page.locator('#fmFireSooner')).toHaveText(/^1년 앞당기려면 매달 [\d,]+만 원 더 모으면 돼요\.$/);
});

test('with under two months of records the trend shows daily bars',async({page})=>{
 await page.addInitScript(([a,b,c])=>{localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[],accounts:[{id:'k',name:'KB',kind:'cash',amount:3000000}],holdings:[],dailySnapshots:[{day:a,amount:1000000},{day:b,amount:2000000},{day:c,amount:3000000}]}))},[ago(2),ago(1),ago(0)]);
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 await expect(page.locator('#fmTrend > div')).toHaveCount(3);
 await expect(page.locator('#fmTrendDelta')).toHaveText('3일 동안 +₩2,000,000');
});

test('backups are suggested weekly',async({page})=>{
 await page.addInitScript(d=>{localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[{id:'t',date:d,type:'expense',category:'식비',amount:9000}]}));localStorage.setItem('firemate_last_backup_v1',new Date(Date.now()-8*86400000).toISOString())},ago(20));
 await page.goto('/index.html');
 await expect(page.locator('#fmBackupNudgeText')).toContainText('이번 주 백업할까요? 마지막 백업이 8일 전이에요');
});
