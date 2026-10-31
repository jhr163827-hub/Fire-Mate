const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const today=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
// The owner types holdings themselves: a BankSalad file never changes them (v3.5.223 did, and is undone once).
const boot=async(page,extra)=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await page.addInitScript(([t,extra])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
 localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],accounts:[{id:'b',name:'NH투자',kind:'investment',amount:0}],balance:{fx:1400},holdings:[{id:'t',name:'TIGER 미국S&P500',ticker:'360750',type:'KRW',qty:extra?722:1500,avg:20000,price:25000,account:'b'},{id:'s',name:'SCHD',ticker:'SCHD',type:'USD',qty:600,avg:25,price:28,account:'b'}]}));
 localStorage.setItem('firemate_bs_snapshot_v1',JSON.stringify({at:t,cash:[],ins:[],invest:[{co:'삼성증권',name:'TIGER 미국S&P500',cost:15000000,value:18057600}]}));
 if(extra)localStorage.setItem('firemate_bs_qty_v1',JSON.stringify(extra))},[today,extra])};
const qty=page=>page.evaluate(()=>Object.fromEntries(JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings.map(h=>[h.id,h.qty])));

test('a BankSalad file does not change holdings; the difference is only shown in the comparison card',async({page})=>{
 await boot(page,null);
 await page.goto('/index.html');await page.waitForTimeout(500);
 expect(await qty(page)).toEqual({t:1500,s:600});
 await page.evaluate(()=>window.fmGo('assets'));await page.locator('#fmAssetQuickAnalysis').click();
 await expect(page.locator('#fmBsList')).toContainText('TIGER 미국S&P500');
});

test('quantities v3.5.223 changed are put back once, unless the owner changed them since',async({page})=>{
 await boot(page,{sig:'x',list:[{id:'t',name:'TIGER 미국S&P500',from:1500,to:722},{id:'s',name:'SCHD',from:500,to:610}]});
 await page.goto('/index.html');
 // TIGER still holds 722 → back to 1,500; SCHD is 600 now (typed by hand), so it stays.
 await expect.poll(()=>qty(page)).toEqual({t:1500,s:600});
 await expect(page.locator('#toast')).toContainText('보유 수량 1개를 원래대로');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_bs_qty_v1')))).toMatchObject({list:[],off:1});
 await page.reload();await page.waitForTimeout(300);expect(await qty(page)).toEqual({t:1500,s:600});
});
