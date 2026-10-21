const {test,expect}=require('@playwright/test');
const today=new Date().toISOString().slice(0,10);
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(t=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[{id:'a',date:t,type:'expense',category:'식비',amount:9000}],
  accounts:Array.from({length:8},(_,i)=>({id:'k'+i,name:'계좌'+i,kind:'cash',amount:1000000*(i+1)})),holdings:[]}))},today);
});
test.use({viewport:{width:390,height:700},isMobile:true,hasTouch:true});

test('switching asset tabs keeps the tab bar in view instead of jumping to the top',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('assets'));
 const nav=page.locator('.fm-asset-jump');
 await page.evaluate(()=>window.scrollTo(0,document.querySelector('.fm-asset-jump').getBoundingClientRect().top+scrollY+300));
 await page.evaluate(()=>document.getElementById('fmAssetQuickDividend').click());
 const top=await nav.evaluate(e=>e.getBoundingClientRect().top);
 expect(top).toBeGreaterThanOrEqual(0);expect(top).toBeLessThan(700-44);
 expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);
});

test('the ledger budget has a labelled 수정 button and the amount opens the editor',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#fmLedgerBudgetEdit')).toHaveText('✎ 수정');
 await page.locator('#fmCalendarBudgetTotal').click();
 await expect(page.locator('#fmLedgerBudgetOverlay')).toHaveClass(/show/);
});

test('a finished pull says what happened',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>{window.fmRefreshNetWorth=async()=>true});
 const touch=async(type,y)=>page.evaluate(([type,y])=>{const t=new Touch({identifier:1,target:document.body,clientX:200,clientY:y});window.dispatchEvent(new TouchEvent(type,{touches:type==='touchend'?[]:[t],changedTouches:[t],bubbles:true}))},[type,y]);
 await touch('touchstart',100);await touch('touchmove',300);await touch('touchend',300);
 await expect(page.locator('#toast')).toContainText('순자산');
});
