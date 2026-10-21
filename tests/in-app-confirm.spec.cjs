const {test,expect}=require('@playwright/test');
const fs=require('fs');
const seed={theme:'dark',rec:[],budgets:{},tx:[{id:'t1',date:new Date().toISOString().slice(0,10),type:'expense',category:'식비',amount:9000,memo:'점심'}]};
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(seed=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(seed))},seed);
});
test.use({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
const txCount=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length);

test('the finance app no longer calls browser confirm or alert',()=>{
 const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
 expect(html.match(/(?<![\w.])(confirm|alert)\(/g)||[]).toEqual([]);
});

test('deleting asks in the app: cancel keeps the entry, 삭제 removes it',async({page})=>{
 const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());d.dismiss()});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.locator('#fmModeList').click();
 await page.locator('#fmLedgerAllTx [data-edit]').first().click();
 await page.locator('#deleteEntry').click();
 const sheet=page.locator('#fmAsk');
 await expect(sheet).toBeVisible();
 await expect(page.locator('#fmAskText')).toHaveText('이 거래를 삭제할까요?');
 await expect(page.locator('#fmAskOk')).toHaveText('삭제');
 for(const id of ['fmAskOk','fmAskCancel'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.locator('#fmAskCancel').click();
 await expect(sheet).toBeHidden();
 expect(await txCount(page)).toBe(1);
 // The backdrop and Escape also cancel.
 await page.locator('#deleteEntry').click();
 await page.keyboard.press('Escape');
 await expect(sheet).toBeHidden();
 expect(await txCount(page)).toBe(1);
 await page.locator('#deleteEntry').click();
 await page.locator('#fmAskOk').click();
 await expect.poll(()=>txCount(page)).toBe(0);
 expect(dialogs).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('the confirm sheet follows the light theme',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>{if(document.documentElement.dataset.theme!=='light')document.getElementById('theme').click()});
 await page.evaluate(()=>{window.fmAsk('기본 FIRE 설정을 변경할까요?')});
 const bg=await page.locator('#fmAsk .fm-ask-card').evaluate(e=>getComputedStyle(e).backgroundColor);
 const [r,g,b]=bg.match(/\d+/g).map(Number);expect(r+g+b).toBeGreaterThan(600);
 await expect(page.locator('#fmAskOk')).toHaveText('확인');
});
