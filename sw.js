const CACHE='fire-mate-v3-5-275';
const ASSETS=['./index.html','./app.css?v=3.5.275','./js/features.js?v=3.5.275','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const validPage=text=>text.includes("const BUILD='"+CACHE+"'")&&text.includes('id="view-home"')&&text.includes('id="view-assets"')&&text.includes('id="view-fire"')&&text.length>100000;
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));const page=await cache.match('./index.html');if(!page||!validPage(await page.text())){await caches.delete(CACHE);throw Error('App and worker build mismatch')}})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('fire-mate-v')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})())});
self.addEventListener('message',event=>{
 if(event.data?.type==='GET_BUILD'){const port=event.ports?.[0];if(port){port.postMessage({build:CACHE});port.close()}}
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if((req.mode==='navigate'||url.pathname.endsWith('/index.html')) && (url.pathname===new URL('./',self.registration.scope).pathname || url.pathname===new URL('./index.html',self.registration.scope).pathname)){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(new Request(req,{cache:'no-store'}));if(response.ok&&validPage(await response.clone().text())){await cache.put('./index.html',response.clone());return response}}catch{}return await cache.match('./index.html')||Response.error()})());
  return;
 }
 if(url.pathname.includes('/arcade/')){
  event.respondWith((async()=>{try{const response=await fetch(new Request(req,{cache:'no-store'}));if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone());return response}return await caches.match(req)||response}catch{return await caches.match(req)||Response.error()}})());
  return;
 }
 event.respondWith(fetch(req).catch(()=>caches.match(req)));
});
// 🔔 Daily digest written by the app into the 'fm-notify-v1' cache ({days:{'YYYY-MM-DD':[lines]}}); shown once a day between 07 and 23 KST
// when the browser wakes this worker (periodic background sync). Nothing is fetched and nothing leaves the phone.
async function fmNotify(){const c=await caches.open('fm-notify-v1'),r=await c.match('./__fm_notify.json');if(!r)return;const k=new Date(Date.now()+9*36e5),d=k.toISOString().slice(0,10),h=k.getUTCHours(),plan=await r.json(),lines=[...(plan.days?.[d]||[])],s=await c.match('./__fm_shown');
 if(h<7||h>=23||s&&await s.text()===d)return;
 // 💱 The owner's exchange-rate goal: one public quote request (the app's own Cloudflare function), nothing about the owner is sent.
 if(plan.fx>0)try{const q=await (await fetch('https://fire-mate-627.pages.dev/api/quotes?s=')).json(),p=Number(q?.quotes?.['IDX-USDKRW']?.price);if(p>0&&p<=plan.fx)lines.unshift('💱 환율 '+Math.round(p).toLocaleString('ko-KR')+'원 · 목표 '+Math.round(plan.fx).toLocaleString('ko-KR')+'원 아래예요')}catch{}
 if(!lines.length)return;await c.put('./__fm_shown',new Response(d));
 const todo=lines.join('\n').match(/✅ 오늘 할 일 (\d+)개/);if(todo&&self.navigator.setAppBadge)self.navigator.setAppBadge(+todo[1]).catch(()=>{});
 await self.registration.showNotification('FIRE MATE',{body:lines.join('\n'),icon:'./icon-192.png',badge:'./icon-192.png',tag:'fm-daily',data:{action:todo?'todo':lines.some(l=>l.startsWith('🎓'))?'study':''}})}
self.addEventListener('periodicsync',event=>{if(event.tag==='fm-daily')event.waitUntil(fmNotify())});
self.addEventListener('message',event=>{if(event.data?.type==='FM_NOTIFY_TEST')event.waitUntil(fmNotify())});
// Tapping the daily note opens the app on 오늘 할 일 (or 자격증) — an open window gets a message, otherwise a new one opens with ?action=.
self.addEventListener('notificationclick',event=>{event.notification.close();const a=event.notification.data?.action||'';event.waitUntil(self.clients.matchAll({type:'window'}).then(l=>{if(!l[0])return self.clients.openWindow('./index.html'+(a?'?action='+a:''));if(a)l[0].postMessage({type:'FM_OPEN',action:a});return l[0].focus()}))});
