const CACHE='fire-mate-v3-0-35';
const ASSETS=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(async()=>{
  const cached=await caches.open(CACHE).then(c=>c.match('./index.html'));
  if(!cached||!cached.ok||!(await cached.text()).includes("const BUILD='"+CACHE+"'"))throw Error('Staged HTML does not match worker version');
 }));
 // Do not auto-activate: the app must ask the user before switching versions.
});
self.addEventListener('activate',event=>{
 // Keep the previous cache for rollback until a subsequent validated release.
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
   // Cache-first remains deliberate for an unapproved running version.
   // The updater checks network version separately; never silently switch HTML.
   event.respondWith(caches.match('./index.html').then(cached=>cached||fetch(request)));
  }
  return;
 }
 event.respondWith(fetch(request).catch(()=>caches.match(request)));
});