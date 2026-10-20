const {test,expect}=require('@playwright/test');
const views=['home','calendar','history','insights','assets','fire','retire'];
for(const width of [320,360]){
 test.describe('UX stage 1 at '+width,()=>{
  test.use({viewport:{width,height:800},isMobile:true,hasTouch:true});
  test('Korean text wraps at word boundaries without horizontal overflow',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('/index.html');
   expect(await page.evaluate(()=>getComputedStyle(document.body).wordBreak)).toBe('keep-all');
   // An unset budget reads the same as the ledger card and stays on one line.
   const left=page.locator('#heroLeft');
   await expect(left).toHaveText('미설정');
   expect(await left.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return new Set([...r.getClientRects()].map(x=>Math.round(x.top))).size})).toBe(1);
   for(const view of views){
    await page.locator('.bottomnav [data-view="'+view+'"], #tabs [data-view="'+view+'"]').first().evaluate(el=>el.click());
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view).toBe(true);
   }
   expect(errors).toEqual([]);
  });
 });
}
