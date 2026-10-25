const {test,expect}=require('@playwright/test');
const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const monthAgo=n=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-n);return ym(d)};
const today=new Date().toISOString().slice(0,10);
const seed=()=>({theme:'dark',rec:[],budgets:{[ym(new Date())]:100000},tx:[
 {id:'t1',date:today,type:'expense',category:'식비',amount:90000,memo:'점심'},
 ...[1,2,3].flatMap(n=>[{id:'n'+n,date:monthAgo(n)+'-05',type:'expense',category:'통신·구독',amount:55000,memo:'넷플릭스'},{id:'g'+n,date:monthAgo(n)+'-07',type:'expense',category:'식비',amount:10000*n,memo:'들쭉날쭉'}])],
 accounts:[{id:'a',name:'KB',kind:'cash',amount:3000000}],holdings:[],
 dailySnapshots:[{day:monthAgo(2)+'-28',amount:1000000},{day:monthAgo(1)+'-28',amount:2000000},{day:today,amount:3000000}]});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},seed());
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('home shows the month pace and an over-budget category; the decorative circle is gone',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firemate_category_budgets_v1',JSON.stringify({'식비':50000})));
 await page.goto('/index.html');
 const pace=page.locator('#fmPaceLine');
 if(new Date().getDate()>=3)await expect(pace).toContainText('이 속도면 월');
 await expect(pace).toContainText('식비 예산 초과');
 expect(await page.locator('#view-home .fm-home-wealth').evaluate(e=>getComputedStyle(e,'::before').display)).toBe('none');
});

test('소비 분석 saves category budgets in their own key and no longer lists fixed costs',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmFixedList')).toHaveCount(0);
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await page.locator('#fmCatBudgetEdit > summary').click();
 await page.locator('#fmCatB-식비').fill('200000');
 await page.locator('#fmCatBudgetSave').click();
 await expect(page.locator('#fmCatBudgetList')).toContainText('₩90,000 / ₩200,000');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_category_budgets_v1')))).toEqual({'식비':200000});
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
});

test('asset analysis shows growth, monthly P&L, then the milestone card with the next goal',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('assets'));
 await page.locator('#fmAssetQuickAnalysis').click();
 const cards=page.locator('#fmAssetAnalysisView > .card');
 await expect(cards).toHaveCount(3);
 await expect(cards.nth(0)).toContainText('내 자산 성장');
 await expect(cards.nth(1)).toContainText('월별 수익');
 await expect(cards.nth(2)).toContainText('자산 마일스톤');
 await expect(page.locator('#assetBadges .fm-ms-steps .now')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('an overdue import turns the home button primary',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firemate_last_import_v1',new Date(Date.now()-9*86400000).toISOString()));
 await page.goto('/index.html');
 await expect(page.locator('#fmHomeSyncNote')).toHaveClass(/due/);
 await expect(page.locator('#fmHomeSync')).toHaveClass(/primary/);
});

test('pulling down on home runs the quiet net-worth refresh',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>{window.__pulls=0;window.fmRefreshNetWorth=async()=>{window.__pulls++;await new Promise(r=>setTimeout(r,50))}});
 const touch=async(type,y)=>page.evaluate(([type,y])=>{const t=new Touch({identifier:1,target:document.body,clientX:200,clientY:y});window.dispatchEvent(new TouchEvent(type,{touches:type==='touchend'?[]:[t],changedTouches:[t],bubbles:true}))},[type,y]);
 await touch('touchstart',100);await touch('touchmove',180);await touch('touchend',180);
 expect(await page.evaluate(()=>window.__pulls)).toBe(0);
 await touch('touchstart',100);await touch('touchmove',260);
 await expect(page.locator('#fmPull')).toHaveText('↻ 놓으면 순자산 업데이트');
 await touch('touchend',260);
 await expect.poll(()=>page.evaluate(()=>window.__pulls)).toBe(1);
 // Home keeps natural page scrolling (overscroll auto); the pull itself blocks the browser's own refresh.
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe('auto');
 // Not on other tabs.
 await page.evaluate(()=>window.fmGo('calendar'));
 await touch('touchstart',100);await touch('touchmove',300);await touch('touchend',300);
 await page.waitForTimeout(100);
 expect(await page.evaluate(()=>window.__pulls)).toBe(1);
});
