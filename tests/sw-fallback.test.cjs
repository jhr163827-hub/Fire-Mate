// sw.js navigation: network first, but after 3 s on a slow network the saved page opens (the download still finishes and is saved).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),build=src.match(/const CACHE='([^']+)'/)[1];
const page=v=>"<html>const BUILD='"+build+"' id=\"view-home\" id=\"view-assets\" id=\"view-fire\" "+v+'x'.repeat(100001)+'</html>';
function load(fetchImpl,cachedText){const store=new Map();if(cachedText!=null)store.set('./index.html',new Response(cachedText));const cache={match:async k=>store.get(k)?.clone(),put:async(k,r)=>{store.set(k,r)}};
 const handlers={},waits=[];vm.runInNewContext(src,{self:{location:{origin:'https://x.dev'},registration:{scope:'https://x.dev/'},addEventListener:(n,h)=>handlers[n]=h},caches:{open:async()=>cache,match:async()=>undefined,keys:async()=>[]},fetch:fetchImpl,URL,Request,Response,Promise,setTimeout});
 const go=async()=>{let res;handlers.fetch({request:new Request('https://x.dev/index.html',{mode:'same-origin'}),respondWith:p=>{res=p},waitUntil:p=>waits.push(p)});return {res:await res,waits,store}};return go}
test('빠른 네트워크면 새 페이지',async()=>{const go=load(async()=>new Response(page('NEW')),page('OLD'));const {res}=await go();assert.match(await res.text(),/NEW/)});
test('느리면 3초 뒤 저장된 페이지, 다운로드는 끝까지 저장',async()=>{let done;const go=load(()=>new Promise(r=>{done=()=>r(new Response(page('NEW')))}),page('OLD'));const t=Date.now(),{res,waits,store}=await go();assert.match(await res.text(),/OLD/);assert.ok(Date.now()-t>=2900&&Date.now()-t<4500);done();await Promise.all(waits);assert.match(await store.get('./index.html').text(),/NEW/)});
test('끊기면 바로 저장된 페이지, 저장된 게 없으면 네트워크를 기다림',async()=>{const go=load(async()=>{throw Error('off')},page('OLD'));const t=Date.now(),{res}=await go();assert.match(await res.text(),/OLD/);assert.ok(Date.now()-t<1000);
 const go2=load(async()=>new Response(page('NEW')),null);assert.match(await (await go2()).res.text(),/NEW/)});
