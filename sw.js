const CACHE='fire-mate-v3-0-41';
const ASSETS=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  const response=await cache.match('./index.html');
  if(!response||!response.ok||!(await response.text()).includes("const BUILD='"+CACHE+"'"))throw Error('설치 버전 불일치');
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil(self.clients.claim());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'||url.pathname.endsWith('/index.html')){
  if(url.searchParams.has('updated')||url.searchParams.has('preflight')){
   event.respondWith(fetch(new Request(request,{cache:'no-store'})).then(response=>{
    if(response.ok&&url.searchParams.has('updated')){
     const copy=response.clone();
     event.waitUntil((async()=>{
      const text=await copy.clone().text();
      if(text.includes("const BUILD='"+CACHE+"'"))await (await caches.open(CACHE)).put('./index.html',copy);
     })());
    }
    return response;
   }));
  }else{
   event.respondWith(caches.open(CACHE).then(cache=>cache.match('./index.html')).then(cached=>cached||fetch(request)));
  }
  return;
 }
 event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(request))));
});
