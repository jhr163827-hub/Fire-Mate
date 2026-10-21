const {test,expect}=require('@playwright/test');
// A stand-in for Google Identity Services that records each sign-in request.
const FAKE_GSI=`window.__gsi={requests:[]};window.google={accounts:{oauth2:{
 initTokenClient:cfg=>({requestAccessToken:opts=>{window.__gsi.requests.push({hint:cfg.hint||'',prompt:opts&&opts.prompt});
  setTimeout(()=>cfg.callback({access_token:'token-'+window.__gsi.requests.length,expires_in:3599}),0)}}),
 revoke:(t,cb)=>{window.__gsi.revoked=t;cb&&cb()}}}};`;
const setup=async(page,{expireFirst401=false}={})=>{
 const calls=[];
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({body:FAKE_GSI,contentType:'application/javascript'}));
 let rejected=false;
 await page.route('https://gmail.googleapis.com/**',route=>{
  const auth=route.request().headers().authorization,url=route.request().url();calls.push({auth,url});
  if(expireFirst401&&!rejected){rejected=true;return route.fulfill({status:401,body:'{}'})}
  if(url.endsWith('/profile'))return route.fulfill({json:{emailAddress:'owner@example.com'}});
  return route.fulfill({json:{messages:[]}});
 });
 return calls;
};
const importGmail=async page=>{
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.locator('#bankGmailImport').click();
 await expect(page.locator('#bankGmailStatus')).toContainText('뱅크샐러드 ZIP 첨부 메일을 찾지 못했습니다');
};
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('first import signs in once, then reuses the token and remembers the account',async({page})=>{
 const calls=await setup(page);
 await page.goto('/index.html');
 await importGmail(page);
 expect(await page.evaluate(()=>window.__gsi.requests)).toEqual([{hint:'',prompt:''}]);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_gmail_hint_v1'))).toBe('owner@example.com');
 const cached=JSON.parse(await page.evaluate(()=>localStorage.getItem('firemate_gmail_token_v1')));
 expect(cached.token).toBe('token-1');
 expect(cached.exp-Date.now()).toBeGreaterThan(50*60*1000);
 // Within the hour, even after reopening the app, no sign-in window appears.
 await page.reload();
 await importGmail(page);
 expect(await page.evaluate(()=>window.__gsi?.requests.length||0)).toBe(0);
 expect(calls.at(-1).auth).toBe('Bearer token-1');
 await expect(page.locator('#fmGmailForget')).toBeVisible();
});

test('an expired token signs in again with the remembered account as a hint',async({page})=>{
 await setup(page);
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
  localStorage.setItem('firemate_gmail_hint_v1','owner@example.com');
  localStorage.setItem('firemate_gmail_token_v1',JSON.stringify({token:'old',exp:Date.now()-1000}))});
 await page.goto('/index.html');
 await importGmail(page);
 expect(await page.evaluate(()=>window.__gsi.requests)).toEqual([{hint:'owner@example.com',prompt:''}]);
});

test('a rejected cached token is dropped and replaced once',async({page})=>{
 const calls=await setup(page,{expireFirst401:true});
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');
  localStorage.setItem('firemate_gmail_hint_v1','owner@example.com');
  localStorage.setItem('firemate_gmail_token_v1',JSON.stringify({token:'revoked',exp:Date.now()+30*60*1000}))});
 await page.goto('/index.html');
 await importGmail(page);
 expect(calls.map(c=>c.auth).slice(0,2)).toEqual(['Bearer revoked','Bearer token-1']);
 expect(await page.evaluate(()=>window.__gsi.requests.length)).toBe(1);
});

test('"Google 로그인 기억 지우기" forgets the token and the account',async({page})=>{
 await setup(page);
 await page.goto('/index.html');
 await importGmail(page);
 await page.locator('#fmGmailForget').click();
 expect(await page.evaluate(()=>[localStorage.getItem('firemate_gmail_token_v1'),localStorage.getItem('firemate_gmail_hint_v1')])).toEqual([null,null]);
 expect(await page.evaluate(()=>window.__gsi.revoked)).toBe('token-1');
 await expect(page.locator('#fmGmailForget')).toBeHidden();
});
