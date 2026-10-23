const {test,expect}=require('@playwright/test');
const today=new Date().toISOString().slice(0,10);
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const seed=extra=>({theme:'dark',rec:[],budgets:{},tx:[{id:'a',date:today,type:'expense',category:'식비',amount:200000,memo:'큰'},{id:'b',date:today,type:'expense',category:'교통',amount:50000,memo:'작은'}],...extra});
const open=async(page,s)=>{await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},s);await page.goto('/index.html')};

test('spending bars are scaled to the largest category',async({page})=>{
 await open(page,seed());
 await page.evaluate(()=>window.fmGo('insights'));
 const widths=await page.locator('#insightCats .barfill').evaluateAll(els=>els.map(e=>e.style.width));
 expect(widths).toEqual(['100%','25%']);
});

test('restore first saves the current data, and backups carry the time',async({page})=>{
 await open(page,seed());
 await page.locator('#settingsBottom').click();
 const [backup]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 expect(backup.suggestedFilename()).toMatch(/^firemate-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
 const text=require('fs').readFileSync(await backup.path(),'utf8');
 await page.locator('#importFile').setInputFiles({name:'b.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await expect(page.locator('#fmAskText')).toContainText('복원 직전에 파일로 한 번 더 저장');
 const [safety]=await Promise.all([page.waitForEvent('download'),page.locator('#fmAskOk').click()]);
 expect(safety.suggestedFilename()).toMatch(/^firemate-before-restore-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
});

test('FIRE overview uses plain words',async({page})=>{
 await open(page,seed());
 await page.evaluate(()=>window.fmGo('firelab'));
 await expect(page.locator('#view-firelab .fm-fire-overview h3')).toHaveText('은퇴 준비 점검');
 await expect(page.locator('#view-firelab .fm-fire-overview')).toContainText('은퇴 후 매달 남거나 모자란 돈');
});

test('Samsung Internet gets a one-time note that data is kept per browser',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36'});
 const page=await ctx.newPage();await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.goto('/index.html');
 await expect(page.locator('#fmBrowserNote')).toContainText('삼성 인터넷');
 await page.locator('#fmBrowserNote button').click();
 await page.reload();
 await expect(page.locator('#fmBrowserNote')).toHaveCount(0);
 await ctx.close();
});

test('Chrome shows no browser note and the home quote line stays one line',async({page})=>{
 await open(page,seed());
 await expect(page.locator('#fmBrowserNote')).toHaveCount(0);
 const h=await page.locator('#homeLastQuote').evaluate(e=>e.getBoundingClientRect().height);
 expect(h).toBeLessThanOrEqual(22);
});
