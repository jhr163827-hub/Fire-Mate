const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

// A stand-in for Google sign-in and the Drive appdata endpoints; nothing leaves the test.
const fakeGoogle=async(page,{disabled=false}={})=>{
 const drive={file:null,calls:[]};
 await page.addInitScript(()=>{window.__tokenRequests=0;window.google={accounts:{oauth2:{initTokenClient:cfg=>({requestAccessToken(){window.__tokenRequests++;cfg.callback({access_token:'drive-test-token',expires_in:3600,scope:cfg.scope})}})}}}});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,async route=>{
  const req=route.request(),url=req.url();
  if(!url.startsWith('https://www.googleapis.com/'))return route.abort();
  drive.calls.push(req.method()+' '+url.replace(/\?.*/,''));
  if(disabled)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{errors:[{reason:'accessNotConfigured'}]}})});
  if(url.includes('/drive/v3/files/f1?alt=media'))return route.fulfill({contentType:'application/json',body:drive.file});
  if(url.includes('/upload/drive/v3/files')){const body=req.postDataBuffer()?.toString('utf8')||'';drive.file=req.method()==='PATCH'?body:body.split('\r\n\r\n').slice(2).join('\r\n\r\n').replace(/\r\n--firemate\d+--$/,'');return route.fulfill({json:{id:'f1'}})}
  if(url.includes('/drive/v3/files?'))return route.fulfill({json:{files:drive.file?[{id:'f1'}]:[]}});
  return route.abort();
 });
 return drive;
};
const seed={theme:'dark',rec:[],budgets:{},tx:[{id:'t1',date:'2026-10-01',type:'expense',category:'식비',amount:9000,memo:'점심'}]};
const openSettings=async page=>{await page.locator('#settingsBottom').click();await expect(page.locator('#fmDriveOn')).toBeAttached()};

test('turning Drive backup on saves a backup there; later backups replace it and carry no token',async({page})=>{
 const drive=await fakeGoogle(page);
 await page.addInitScript(s=>{if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))}},seed);
 await page.goto('/index.html');await openSettings(page);
 await expect(page.locator('#fmDriveActions')).toBeHidden();
 await page.locator('#fmDriveOn').check();
 await expect(page.locator('#fmDriveStatus')).toHaveText('마지막 드라이브 백업: 오늘');
 expect(drive.calls).toContain('POST https://www.googleapis.com/upload/drive/v3/files');
 const backup=JSON.parse(drive.file);expect(backup.app).toBe('FIRE MATE');expect(backup.data.tx[0].memo).toBe('점심');
 expect(drive.file).not.toContain('drive-test-token');
 // A Drive copy counts as a backup for the weekly reminder.
 expect(await page.evaluate(()=>!!localStorage.getItem('firemate_last_backup_v1'))).toBe(true);
 await page.locator('#fmDriveNow').click();
 await expect.poll(()=>drive.calls.filter(c=>c.startsWith('PATCH')).length).toBe(1);
 // Turning it off forgets the token.
 await page.locator('#fmDriveOn').uncheck();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_drive_token_v1'))).toBeNull();
});

test('a new phone can restore from Drive through the normal restore check',async({page})=>{
 const drive=await fakeGoogle(page);
 drive.file=JSON.stringify({app:'FIRE MATE',version:5,data:{...seed,tx:[{id:'x',date:'2026-09-02',type:'income',category:'급여',amount:3000000,memo:'드라이브에서 온 월급'}],holdings:[],accounts:[{id:'a'}],balance:{fx:1400,cash:0,other:0,debt:0},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},favorites:[]}});
 await page.addInitScript(()=>{localStorage.setItem('firemate_drive_backup_v1','1')});
 await page.goto('/index.html');await openSettings(page);
 await page.locator('#fmDriveRestore').click();
 await expect(page.locator('#fmAsk')).toBeVisible();
 await Promise.all([page.waitForEvent('download'),page.locator('#fmAskOk').click()]);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx[0]?.memo)).toBe('드라이브에서 온 월급');
});

test('when the Drive API is off the reason is shown instead of failing silently',async({page})=>{
 await fakeGoogle(page,{disabled:true});
 await page.goto('/index.html');await openSettings(page);
 await page.locator('#fmDriveOn').check();
 await expect(page.locator('#fmDriveStatus')).toContainText('Drive API가 꺼져 있어요');
});

test('after a save, a daily copy goes up quietly only when a token is already in hand',async({page})=>{
 const drive=await fakeGoogle(page);
 await page.addInitScript(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.setItem('firemate_drive_backup_v1','1');localStorage.setItem('firemate_drive_last_v1',new Date(Date.now()-30*3600*1000).toISOString())});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenEntry());await page.locator('#entryAmount').fill('5000');await page.locator('#saveEntry').click();
 await page.waitForTimeout(300);
 // No token yet: nothing uploads and no Google window opens.
 expect(drive.calls.length).toBe(0);
 expect(await page.evaluate(()=>window.__tokenRequests)).toBe(0);
 await page.evaluate(()=>localStorage.setItem('firemate_drive_token_v1',JSON.stringify({token:'drive-test-token',exp:Date.now()+3600e3})));
 await page.evaluate(()=>window.fmOpenEntry());await page.locator('#entryAmount').fill('6000');await page.locator('#saveEntry').click();
 await expect.poll(()=>drive.calls.filter(c=>c.startsWith('POST')).length).toBe(1);
 // Once today's copy exists, further saves do not upload again.
 await page.evaluate(()=>window.fmOpenEntry());await page.locator('#entryAmount').fill('7000');await page.locator('#saveEntry').click();
 await page.waitForTimeout(300);
 expect(drive.calls.filter(c=>c.startsWith('POST')||c.startsWith('PATCH')).length).toBe(1);
});
