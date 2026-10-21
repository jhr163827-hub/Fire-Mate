const {test,expect}=require('@playwright/test');
const DAY=86400000;
const longTimeUser={theme:'dark',tx:[{id:'qa-old',date:'2026-09-01',type:'expense',category:'식비',amount:9000}],rec:[],budgets:{},
 fire:{asset:1000,goal:80000,monthly:200,rate:6,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},
 accounts:[{id:'a',name:'A',kind:'investment',amount:0,fire:true}],holdings:[{id:'h',accountId:'a',ticker:'SPY',type:'USD',qty:1,price:500,cost:400}],
 dailySnapshots:[{day:'2026-09-01',amount:700000,recordedAt:'2026-09-01T00:00:00Z'}]};
const open=async(page,seed,extra={})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(([seed,extra])=>{if(sessionStorage.getItem('qa-seeded'))return;sessionStorage.setItem('qa-seeded','1');if(seed)localStorage.setItem('firemate_smart_v3',JSON.stringify(seed));for(const [k,v] of Object.entries(extra))localStorage.setItem(k,v)},[seed,extra]);
 await page.goto('/index.html');
};
test.use({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});

test('new profile is told the FIRE estimate uses the example goal and sees no backup nag',async({page})=>{
 await open(page,null);
 await expect(page.locator('#homeFireEtaNote')).toHaveText('기본 예시 목표(6억 5,000만 원·월 300만 원) 기준 · 실제 결과는 달라질 수 있어요');
 await expect(page.locator('#homeRefreshStocks')).toHaveClass(/fm-quote-idle/);
 await expect(page.locator('#homeRefreshStocks')).toHaveCSS('min-height','44px');
 await expect(page.locator('.fm-backup-nudge')).toBeHidden();
});

test('saved plans keep the original note and holdings make the quote button primary',async({page})=>{
 await open(page,longTimeUser,{firemate_last_backup_v1:new Date().toISOString()});
 await expect(page.locator('#homeFireEtaNote')).toHaveText('저장한 조건에 따른 추정 · 실제 결과는 달라질 수 있어요');
 await expect(page.locator('#homeRefreshStocks')).not.toHaveClass(/fm-quote-idle/);
 await expect(page.locator('.fm-backup-nudge')).toBeHidden();
});

test('backup nudge appears for unbacked data, backs up, and snoozes without touching finance data (download fallback)',async({page})=>{
 await open(page,longTimeUser);
 const nudge=page.locator('.fm-backup-nudge');
 await expect(nudge).toBeVisible();
 await expect(page.locator('#fmBackupNudgeText')).toContainText('아직 백업한 적이 없어요');
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#fmBackupNow').click()]);
 expect(download.suggestedFilename()).toMatch(/^firemate-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
 await expect(nudge).toBeHidden();
 expect(Date.now()-Date.parse(await page.evaluate(()=>localStorage.getItem('firemate_last_backup_v1')))).toBeLessThan(60000);
 const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))),was=JSON.parse(before);
 for(const key of ['tx','rec','budgets','fire','accounts','holdings','balance'])expect(after[key]).toEqual(was[key]);
});

test('old backups remind again after 30 days and "7일 뒤에" survives reload',async({page})=>{
 await open(page,longTimeUser,{firemate_last_backup_v1:new Date(Date.now()-40*DAY).toISOString()});
 await expect(page.locator('#fmBackupNudgeText')).toContainText('마지막 백업이 40일 전이에요');
 await page.locator('#fmBackupLater').click();
 await expect(page.locator('.fm-backup-nudge')).toBeHidden();
 await page.reload();
 await expect(page.locator('#view-home .fm-home-fire')).toBeVisible();
 await expect(page.locator('.fm-backup-nudge')).toBeHidden();
 expect(Date.parse(await page.evaluate(()=>localStorage.getItem('firemate_backup_snooze_v1')))).toBeGreaterThan(Date.now()+6*DAY);
});

test('brand-new data is not nagged and settings show the last backup',async({page})=>{
 await open(page,{...longTimeUser,tx:[{id:'qa-today',date:new Date().toISOString().slice(0,10),type:'expense',category:'식비',amount:9000}],dailySnapshots:[]});
 await expect(page.locator('.fm-backup-nudge')).toBeHidden();
 await expect(page.locator('#fmBackupStatus')).toHaveText('마지막 백업: 아직 없어요');
});

test('secondary text and selected tabs meet 4.5:1 contrast in both themes',async({page})=>{
 await open(page,longTimeUser,{firemate_last_backup_v1:new Date().toISOString()});
 for(const theme of ['dark','light']){
  await page.evaluate(t=>{if(document.documentElement.dataset.theme!==t)document.getElementById('theme').click()},theme);
  await page.evaluate(()=>window.fmGo('calendar'));
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await page.waitForTimeout(400);
  const ratios=await page.evaluate(()=>{
   const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
   const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
   const bg=el=>{for(let e=el;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;if(!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return rgb(c)}return [255,255,255]};
   const ratio=el=>{const a=lum(rgb(getComputedStyle(el).color)),b=lum(bg(el));return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
   return {sub:ratio(document.querySelector('#view-calendar .fm-ledger-totals span')),tab:ratio(document.getElementById('fmModeCalendar'))};
  });
  expect(ratios.sub,theme+' secondary').toBeGreaterThanOrEqual(4.5);
  expect(ratios.tab,theme+' selected tab').toBeGreaterThanOrEqual(4.5);
 }
});

test('mail backup shares a validated .txt file and restore accepts it',async({page})=>{
 await page.addInitScript(()=>{window.__shared=[];navigator.canShare=d=>Array.isArray(d?.files)&&d.files.every(f=>f.name.endsWith('.txt'));navigator.share=async d=>{window.__shared.push({title:d.title,name:d.files[0].name,type:d.files[0].type,text:await d.files[0].text()})}});
 await open(page,longTimeUser);
 await page.locator('#fmBackupNow').click();
 await expect.poll(()=>page.evaluate(()=>window.__shared.length)).toBe(1);
 const shared=await page.evaluate(()=>window.__shared[0]);
 expect(shared.name).toMatch(/^firemate-backup-\d{4}-\d{2}-\d{2}-\d{4}\.txt$/);
 expect(shared.type).toBe('text/plain');
 const payload=JSON.parse(shared.text);
 expect(payload.app).toBe('FIRE MATE');
 expect(payload.data.tx).toEqual(longTimeUser.tx);
 await expect(page.locator('.fm-backup-nudge')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_last_backup_v1'))).toBeTruthy();
 expect(await page.locator('#importFile').getAttribute('accept')).toContain('.txt');
 // The shared file restores through the normal validated path.
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.tx=[];localStorage.setItem('firemate_smart_v3',JSON.stringify(d))});
 await page.reload();
 await page.locator('#importFile').setInputFiles({name:shared.name,mimeType:'text/plain',buffer:Buffer.from(shared.text)});
 await page.locator('#fmAskOk').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length)).toBe(longTimeUser.tx.length);
});

test('without file sharing the mail button falls back to a .json download',async({page})=>{
 await page.addInitScript(()=>{navigator.canShare=()=>false});
 await open(page,longTimeUser);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportShare').evaluate(b=>b.click())]);
 expect(download.suggestedFilename()).toMatch(/\.json$/);
});
