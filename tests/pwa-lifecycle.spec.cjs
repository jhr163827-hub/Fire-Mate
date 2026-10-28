const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
// The scheduled backup quote file is live on GitHub; keep these fixtures' prices fixed.
test.beforeEach(async({page})=>{await page.route('**/chart-data/live-quotes.json*',r=>r.fulfill({status:404,body:''}));await page.route('https://polling.finance.naver.com/**',r=>r.abort())});
// The app and both workers are real repository sources; only the release server changes.
test('real worker update can be deferred, retried and activated without mixing version caches or financial data',async({browser})=>{
 test.setTimeout(90000);
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 const current=html.match(/VERSION='([^']+)'/)[1],parts=current.split('.').map(Number);parts[2]--;const basePrevious=parts.join('.');let previous=basePrevious,legacy=false,partial=false;
 const build=v=>'fire-mate-v'+v.replaceAll('.','-');
 const version=(text,v)=>text.replaceAll(build(current),build(v)).replaceAll('v'+current,'v'+v).replaceAll("VERSION='"+current+"'","VERSION='"+v+"'");
 const legacyUpdater=fs.readFileSync('tests/fixtures/legacy-pwa-v3541.js','utf8'),legacySW=fs.readFileSync('tests/fixtures/legacy-sw-v3541.js','utf8');
 const oldHTML=()=>legacy?version(html,'3.5.41').replace(/(<script id="fm-pwa-updates">)[\s\S]*?(<\/script>)/,(_,start,end)=>start+legacyUpdater+end):version(html,previous);
 let released=false;
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');let file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(file==='index.html'){res.setHeader('Content-Type','text/html');res.end((released&&!partial?html:oldHTML()));return}if(file==='sw.js'){res.setHeader('Content-Type','application/javascript');res.end((released?sw:legacy?legacySW:version(sw,previous)));return}if(['manifest.webmanifest','icon-192.png','icon-512.png','dividends.json','app.css'].includes(file)||/^js\/[\w-]+\.js$/.test(file)){res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'application/json');res.end(fs.readFileSync(path.resolve(file)));return}res.writeHead(404);res.end()});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 try{for(const [width,theme,isLegacy,reloadIntoCurrent] of [[320,'dark',false,false],[390,'light',true,false],[430,'dark',true,true]]){
  legacy=isLegacy;previous=legacy?'3.5.41':basePrevious;partial=false;
  released=false;const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});await context.route('**/chart-data/live-quotes.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://polling.finance.naver.com/**',r=>r.abort());
  await context.route('https://api.frankfurter.dev/**',r=>r.abort());
  // Legacy clients check the repository; current clients must verify the actual release origin.
  await context.route('https://raw.githubusercontent.com/**',r=>r.fulfill({contentType:'text/html',body:(released&&!partial?html:oldHTML())}));
  await context.addInitScript(theme=>{const day=new Date().toLocaleDateString('sv-SE');localStorage.setItem('fm_auto_quote_day_v1',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));if(!localStorage.getItem('firemate_smart_v3'))localStorage.setItem('firemate_smart_v3',JSON.stringify({theme,tx:[{id:'salary',date:day,type:'income',category:'급여',amount:4500000},{id:'food',date:day,type:'expense',category:'식비',amount:9000}],rec:[],budgets:{[day.slice(0,7)]:1500000},accounts:[{id:'legacy-us',name:'미국',amount:1000000},{id:'legacy-kr',name:'국내',amount:2000000}],holdings:[{id:'us',accountId:'legacy-us',type:'USD',ticker:'JEPQ',name:'JEPQ',qty:10,price:50,cost:40},{id:'kr',accountId:'legacy-kr',type:'KRW',ticker:'005930.KS',name:'삼성전자',qty:10,price:80000,cost:70000}],balance:{fx:1400,cash:1000000,other:1000000,debt:500000},fire:{asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4},retirement:{items:[{name:'JEPQ',amount:65000}],monthly:300,yield:4,priceChange:0,crash:25}}))},theme);
  await context.addInitScript(()=>{for(const [key,value] of Object.entries({firemate_arcade_restaurant_v2:{coins:321,served:7,level:2,stoves:[{recipe:1,ends:1893456000000},null],decor:3},firemate_arcade_restaurant_v1:{coins:99,level:1}}))if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(value))});
  const page=await context.newPage();await page.goto(origin+'/index.html');await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('fm-pwa-stage9-marker','preserve');},theme);
  await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmOpenCalculator').click();await page.locator('#goal').fill('77777');
  const restaurantBefore=await page.evaluate(()=>['firemate_arcade_restaurant_v1','firemate_arcade_restaurant_v2'].map(k=>localStorage.getItem(k)));
  const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
  const financialUnchanged=async()=>{const expected=JSON.parse(before),actual=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));expect(actual.dailySnapshots.length).toBe(expected.dailySnapshots.length);for(let i=0;i<actual.dailySnapshots.length;i++){expect(Date.parse(actual.dailySnapshots[i].recordedAt)).toBeGreaterThanOrEqual(Date.parse(expected.dailySnapshots[i].recordedAt));delete actual.dailySnapshots[i].recordedAt;delete expected.dailySnapshots[i].recordedAt;}expect(actual).toEqual(expected);expect(await page.evaluate(()=>['firemate_arcade_restaurant_v1','firemate_arcade_restaurant_v2'].map(k=>localStorage.getItem(k)))).toEqual(restaurantBefore)};

  const active=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();window.stage9OldWorker=r.active;await caches.open('unrelated-cache');return !!r.active});expect(active).toBe(true);
  if(!legacy){
   partial=true;released=true;
   await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();const w=r.installing;if(w)await new Promise(resolve=>{const done=()=>{if(w.state==='redundant'){w.removeEventListener('statechange',done);resolve()}};w.addEventListener('statechange',done);done()})});
   await expect.poll(()=>page.evaluate(()=>caches.keys())).not.toContain(build(current));
   expect(await page.evaluate(()=>navigator.serviceWorker.controller===window.stage9OldWorker)).toBe(true);
   expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
   partial=false;
  }
  released=true;if(legacy){await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()})}else{await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+61000;window.dispatchEvent(new Event('focus'))})}
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  if(!legacy){await expect(page.locator('#fmManualUpdate')).toContainText('업데이트 가능',{timeout:6000});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0)}
  if(!legacy){await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await expect(page.locator('#fmUpdatePrompt')).toHaveCount(0);await expect(page.locator('#goal')).toHaveValue('77,777');}
  await page.locator('#fmManualUpdate').click();await page.getByText('새 업데이트가 준비됐어요',{exact:true}).waitFor();await page.getByRole('button',{name:'나중에',exact:true}).click();
  await expect(page.locator('#goal')).toHaveValue('77,777');expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
  expect(await page.evaluate(()=>navigator.serviceWorker.controller===window.stage9OldWorker)).toBe(true);
  // A version check must not overwrite the old worker's offline HTML with the new build.
  const cached=await page.evaluate(async key=>(await(await caches.open(key)).match('./index.html')).text(),build(previous));expect(cached).toContain("VERSION='"+previous+"'");expect(cached).not.toContain("VERSION='"+current+"'");
  await context.setOffline(true);await page.reload();await expect(page.locator('#fmManualUpdate')).toContainText(previous);await financialUnchanged();
  await context.setOffline(false);if(reloadIntoCurrent){await page.reload();await expect(page.locator('#fmManualUpdate')).toContainText(current);await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting)}await page.locator('#fmManualUpdate').click();await page.getByRole('button',{name:'지금 업데이트',exact:true}).click();await page.waitForURL('**/index.html?updated=*');
  await expect(page.locator('#fmManualUpdate')).toContainText(current);await financialUnchanged();
  const keys=await page.evaluate(()=>caches.keys());expect(keys).toContain(build(current));expect(keys).not.toContain(build(previous));expect(keys).toContain('unrelated-cache');
  await context.setOffline(true);await page.reload();await expect(page.locator('#fmManualUpdate')).toContainText(current);expect(await page.evaluate(()=>localStorage.getItem('fm-pwa-stage9-marker'))).toBe('preserve');await context.close();
 }}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
