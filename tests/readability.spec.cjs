const {test,expect}=require('@playwright/test');
const day=new Date().toISOString().slice(0,10),month=day.slice(0,7);
const seed={theme:'dark',tx:[{id:'qa-1',date:day,type:'expense',category:'식비',amount:12500},{id:'qa-2',date:day,type:'income',category:'급여',amount:3450000}],rec:[],budgets:{[month]:1500000},
 fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},balance:{fx:1400,cash:12345678,other:2000000,debt:3000000},
 accounts:[{id:'a',name:'미국 주식 계좌',kind:'investment',amount:5000,fire:true}],holdings:[{id:'h1',accountId:'a',ticker:'JEPQ',type:'USD',qty:12,price:55.3,cost:50}]};
// Calendar day cells and six-bar chart labels share narrow columns and keep their compact sizes.
const compact='#view-calendar .day *, #view-calendar .fm-ledger-trend-col strong, #view-insights .fm-six-amount';
const views=['home','calendar','history','insights','assets','fire','firecalc','firelife','retire','monthly'];
for(const width of [320,390]){
 test('secondary text is at least 12px and amounts stay on one line at '+width,async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.addInitScript(value=>{if(!sessionStorage.getItem('qa-seeded')){sessionStorage.setItem('qa-seeded','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(value))}},seed);
  await page.goto('/index.html');
  for(const view of views){
   await page.evaluate(view=>window.fmGo(view),view);
   await expect(page.locator('#view-'+view)).toHaveClass(/active/);
   const small=await page.evaluate(compact=>{const out=[];const skip=new Set(document.querySelectorAll(compact));const walker=document.createTreeWalker(document.querySelector('.view.active'),NodeFilter.SHOW_TEXT);let node;
    while(node=walker.nextNode()){const el=node.parentElement;if(!node.textContent.trim()||!el.offsetParent||skip.has(el))continue;const size=parseFloat(getComputedStyle(el).fontSize);if(size<12)out.push(size+'px '+node.textContent.trim().slice(0,20))}
    return out},compact);
   expect(small,view).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view).toBe(true);
  }
  await page.evaluate(()=>window.fmGo('retire'));
  for(const amount of ['#rpGap','#view-retire .fm-fire-target-gap strong']){
   const lines=await page.locator(amount).first().evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return new Set([...r.getClientRects()].filter(x=>x.width).map(x=>Math.round(x.top))).size});
   expect(lines,amount).toBe(1);
  }
 });
}
