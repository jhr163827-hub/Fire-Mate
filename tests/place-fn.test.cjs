// 🍽️ functions/api/place.js: follows only 네이버지도·카카오맵 links and reads the preview (og:title/description, Kakao place info).
const test=require('node:test'),assert=require('node:assert');const path=require('path');
const load=()=>import('file://'+path.join(__dirname,'..','functions','api','place.js'));
globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
const call=async(fn,u,pages)=>{const seen=[];globalThis.fetch=async(url)=>{seen.push(url);const p=pages[url];if(!p)throw Error('unexpected '+url);return p.loc?new Response(null,{status:302,headers:{location:p.loc}}):new Response(p.body,{status:200,headers:{'content-type':p.json?'application/json':'text/html'}})};
 const r=await fn.onRequestGet({request:new Request('https://x.dev/api/place?u='+encodeURIComponent(u)),waitUntil(){}});return {status:r.status,body:await r.json(),seen}};
test('naver.me → 장소 페이지의 미리보기에서 이름·주소',async()=>{const fn=await load();
 const r=await call(fn,'https://naver.me/AbC',{'https://naver.me/AbC':{loc:'https://m.place.naver.com/restaurant/1234567/home'},'https://m.place.naver.com/restaurant/1234567/home':{body:'<meta property="og:title" content="연남 손칼국수 : 네이버"><meta property="og:description" content="서울 마포구 연남동 224-1">'}});
 assert.deepStrictEqual(r.body,{url:'https://m.place.naver.com/restaurant/1234567/home',src:'naver',pid:'1234567',name:'연남 손칼국수',addr:'서울 마포구 연남동 224-1'})});
test('kko.to → 카카오 장소 정보(이름·주소·분류)',async()=>{const fn=await load();
 const r=await call(fn,'https://kko.to/x1',{'https://kko.to/x1':{loc:'https://place.map.kakao.com/777'},'https://place.map.kakao.com/777':{body:'<title>카카오맵</title>'},'https://place.map.kakao.com/main/v/777':{json:1,body:JSON.stringify({basicInfo:{placenamefull:'해운대 이자카야',address:{region:{newaddrfullname:'부산 해운대구'},newaddr:{newaddrfull:'구남로 1'}},category:{catename:'술집'}}})}});
 assert.deepStrictEqual(r.body,{url:'https://place.map.kakao.com/777',src:'kakao',pid:'777',name:'해운대 이자카야',addr:'부산 해운대구 구남로 1',cat:'술집'})});
test('지도 링크가 아니면 거절, 다른 사이트로 넘어가면 따라가지 않음',async()=>{const fn=await load();
 assert.strictEqual((await call(fn,'https://evil.example/x',{})).status,400);assert.strictEqual((await call(fn,'http://naver.me/x',{})).status,400);
 const r=await call(fn,'https://naver.me/Q',{'https://naver.me/Q':{loc:'https://evil.example/steal'}});assert.deepStrictEqual(r.seen,['https://naver.me/Q']);assert.deepStrictEqual(r.body,{url:'https://naver.me/Q',src:'naver'})});
