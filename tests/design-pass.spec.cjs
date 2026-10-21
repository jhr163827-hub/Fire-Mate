const {test,expect}=require('@playwright/test');
const today=new Date().toISOString().slice(0,10);
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(t=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[{id:'a',date:t,type:'expense',category:'식비',amount:9000}],accounts:[{id:'k',name:'KB',kind:'cash',amount:94670000}],holdings:[]}))},today);
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test('big totals carry an approximate 만/억 reading on the label line',async({page})=>{
 await page.goto('/index.html');
 await expect(page.locator('#view-home .fm-approx')).toHaveText(' · 약 9,467만 원');
 await expect(page.locator('#homeQuoteProgress')).toBeHidden();
 await page.evaluate(()=>window.fmGo('assets'));
 await expect(page.locator('#view-assets .fm-approx')).toHaveText(' · 약 9,467만 원');
});
test('the quote retry button sits inside the failure details',async({page})=>{
 await page.goto('/index.html');
 expect(await page.evaluate(()=>!!document.getElementById('retryStocks')?.closest('#fmQuoteFailures'))).toBe(true);
});
test('FIRE explanations use at least 13px text',async({page})=>{
 await page.goto('/index.html');await page.evaluate(()=>window.fmGo('fire'));
 const sizes=await page.locator('#view-fire .mini:visible').evaluateAll(es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize)));
 expect(sizes.length).toBeGreaterThan(0);for(const s of sizes)expect(s).toBeGreaterThanOrEqual(13);
});
