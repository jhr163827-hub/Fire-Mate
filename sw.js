const CACHE='fire-mate-v3-0-56';
const ASSETS=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})).then(async response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',copy)))}return response;
  }).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html')).then(r=>r||Response.error())));
  return;
 }
 event.respondWith(fetch(req).catch(()=>caches.match(req)));
});
