const CACHE='fire-mate-v3-0-41';
const ASSETS=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(async()=>{
  const cached=await caches.open(CACHE).then(c=>c.match('./index.html'));
  if(!cached||!cached.ok||!(await cached.text()).includes("const BUILD='"+CACHE+"'"))throw Error('Staged HTML does not match worker version');
 }));
 // A new version waits for explicit consent from the update button.
});
self.addEventListener('activate',event=>{
 // Claim pages after verified installation. Never delete user site storage.
 event.waitUntil(self.clients.claim());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const navigation=request.mode==='navigate'||url.pathname.endsWith('/index.html');
 if(navigation){
  if(url.searchParams.has('updated')||url.searchParams.has('preflight')){
   event.respondWith(fetch(new Request(request,{cache:'no-store'})).then(response=>{
    if(response.ok&&url.searchParams.has('updated')){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',copy)))}
    return response;
   }).catch(()=>Response.error()));
  }else{
   // Only the current worker's verified cache can serve the app shell.
   // Never use caches.match here: it can return an older version's HTML.
   event.respondWith(caches.open(CACHE).then(cache=>cache.match('./index.html')).then(cached=>cached||fetch(request)));
  }
  return;
 }
 event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(request))));
});