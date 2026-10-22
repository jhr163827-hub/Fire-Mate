const CACHE='fire-mate-v3-5-112';
const ASSETS=['./index.html','./app.css?v=3.5.112','./js/features.js?v=3.5.112','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
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
  event.respondWith((async()=>{try{const response=await fetch(new Request(req,{cache:'no-store'}));if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}return response}catch{return await caches.match(req)||Response.error()}})());
  return;
 }
 event.respondWith(fetch(req).catch(()=>caches.match(req)));
});
