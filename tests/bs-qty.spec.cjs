const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const day=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const seed=at=>({theme:'dark',tx:[],accounts:[{id:'b',name:'NH투자',kind:'investment',amount:0}],balance:{fx:1400},
 holdings:[{id:'t',name:'TIGER 미국S&P500',ticker:'360750',type:'KRW',qty:1500,avg:20000,price:25000,account:'b'},{id:'s',name:'SCHD',ticker:'SCHD',type:'USD',qty:600,avg:25,price:28,account:'b'}],
 snap:{at,cash:[],ins:[],invest:[{co:'삼성증권',name:'TIGER 미국S&P500',cost:15000000,value:18057600},{co:'NH투자증권',name:'슈왑 미국 배당주 ETF',cost:20000000,value:23600000}]}});
const boot=async(page,at)=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');const {snap,...d}=s;localStorage.setItem('firemate_smart_v3',JSON.stringify(d));localStorage.setItem('firemate_bs_snapshot_v1',JSON.stringify(snap))},seed(at))};
const qty=page=>page.evaluate(()=>Object.fromEntries(JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings.map(h=>[h.id,h.qty])));

test('holdings follow a recent BankSalad file: off ones get value ÷ price shares, close ones stay, once per file, and 되돌리기 works',async({page})=>{
 await boot(page,day(0));
 await page.goto('/index.html');
 // TIGER: 18,057,600 ÷ 25,000 = 722 shares. SCHD: 600 × 28 × 1,400 = 23,520,000 vs 23,600,000 is within 3%, so it stays.
 await expect.poll(()=>qty(page)).toEqual({t:722,s:600});
 await expect(page.locator('#toast')).toContainText('TIGER 미국S&P500 1,500→722주');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_bs_qty_v1')).list)).toEqual([{id:'t',name:'TIGER 미국S&P500',from:1500,to:722}]);
 // Balances and accounts are untouched.
 const acc=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).accounts);expect(acc.find(a=>a.id==='b').amount).toBe(0);expect(acc.every(a=>!a.amount)).toBe(true);
 await page.reload();expect(await qty(page)).toEqual({t:722,s:600});
 // 자동 변경 기록 → 되돌리기, and the same file is not applied again.
 await page.locator('#settingsBottom').click();await page.locator('#fmStorage>summary').click();await page.locator('#fmAutoLog>summary').click();
 const row=page.locator('#fmAutoLogList p',{hasText:'뱅크샐러드 기준 보유 수량'});await expect(row).toContainText('1건');
 await row.locator('button').click();await page.locator('#fmAskOk').click();
 await expect.poll(()=>qty(page)).toEqual({t:1500,s:600});
 await page.reload();expect(await qty(page)).toEqual({t:1500,s:600});
});

test('an old BankSalad file does not change holdings',async({page})=>{
 await boot(page,day(-5));
 await page.goto('/index.html');await page.waitForTimeout(500);
 expect(await qty(page)).toEqual({t:1500,s:600});
 expect(await page.evaluate(()=>localStorage.getItem('firemate_bs_qty_v1'))).toBeNull();
});
