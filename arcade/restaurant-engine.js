/* Restaurant 1.3: cooking -> counter -> automatic table service -> payment.
 * Existing recipe indexes, durations, costs and total batch rewards are preserved.
 * Service timings are implementation calibration, not recovered original constants.
 */
(()=>{'use strict';
const KEY='firemate_arcade_restaurant_v2',OLD='firemate_arcade_restaurant_v1',$=id=>document.getElementById(id);
const recipes=[{name:'주먹밥',emoji:'🍙',ms:60000,cost:3,sell:12,lv:1},{name:'라면',emoji:'🍜',ms:300000,cost:10,sell:35,lv:1},{name:'카레',emoji:'🍛',ms:1800000,cost:40,sell:110,lv:2},{name:'햄버거',emoji:'🍔',ms:3600000,cost:90,sell:250,lv:3},{name:'스테이크',emoji:'🥩',ms:14400000,cost:250,sell:780,lv:4}];
let lastStored=null;
try{lastStored=localStorage.getItem(KEY)}catch{}
let readable=lastStored===null;
let data={coins:150,served:0,level:1,stoves:[null,null],decor:0};
try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&Number.isFinite(d.coins)&&Array.isArray(d.stoves)){data={...data,...d,stoves:d.stoves.slice(0,4)};readable=true}}catch{}
if(!localStorage.getItem(KEY)){try{const old=JSON.parse(localStorage.getItem(OLD)||'null');if(old){data.coins+=Math.max(0,Number(old.coins)||0);data.level=Math.max(1,Number(old.level)||1);data.served=Math.max(0,Number(old.served)||0)}}catch{}}
const copy=x=>JSON.parse(JSON.stringify(x));
const notify=msg=>{if($('status').textContent!==msg)$('status').textContent=msg};
const save=()=>{try{if(!readable){notify('읽을 수 없는 레스토랑 저장 기록을 보존하고 있어요. 원본을 확인해 주세요.');return false}if(localStorage.getItem(KEY)!==lastStored){notify('다른 창에서 진행이 바뀌었어요. 새로고침하면 저장된 진행을 이어갈 수 있어요.');return false}const raw=JSON.stringify(data);localStorage.setItem(KEY,raw);lastStored=raw;return true}catch{notify('저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요.');return false}};
function transaction(change){const previous=copy(data);change(data);if(!save()){data=previous;paint();return false}paint();return true}
const fmt=ms=>{const sec=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),ss=sec%60;return (h?h+'시간 ':'')+(m?m+'분 ':'')+(!h||!m?ss+'초':'')};
const known=job=>!!job&&Number.isInteger(job.recipe)&&!!recipes[job.recipe]&&Number.isFinite(job.ends);
function validBatch(x){return x&&typeof x.id==='string'&&Number.isInteger(x.recipe)&&!!recipes[x.recipe]&&x.value===recipes[x.recipe].sell}
const batches=(service,i)=>{const slot=service?.stock?.[i];return !slot?[]:service.version===1?[slot]:slot.batches};
function supported(service){
 if(service===undefined)return true;
 if(!service||![1,2].includes(service.version)||!Array.isArray(service.stock)||service.stock.length!==2||!Array.isArray(service.guests)||service.guests.length!==2)return false;
 if(!service.stock.every(x=>!x||(service.version===1?validBatch(x):Number.isInteger(x.recipe)&&!!recipes[x.recipe]&&Array.isArray(x.batches)&&x.batches.length>0&&x.batches.every(b=>validBatch(b)&&b.recipe===x.recipe))))return false;
 if(!service.guests.every(x=>!x||typeof x.id==='string'&&Number.isInteger(x.counter)&&x.counter>=0&&x.counter<2&&Number.isInteger(x.table)&&x.table>=0&&x.table<2&&['entering','waiting','serving','eating','leaving'].includes(x.phase)&&(!x.batch||validBatch(x.batch))))return false;
 const ids=[...service.stock.flatMap((_,i)=>batches(service,i)),...service.guests.flatMap(g=>g?.batch?[g.batch]:[])].map(b=>b.id);
 return new Set(ids).size===ids.length;
}
function upgradeService(d){
 if(!d.service)d.service={version:2,stock:[null,null],guests:[null,null]};
 else if(d.service.version===1)d.service={...d.service,version:2,stock:d.service.stock.map(b=>b?{recipe:b.recipe,batches:[b]}:null)};
 return d.service;
}
function inventory(){return [0,1].map(i=>{if(!supported(data.service))return null;const list=batches(data.service,i);return list.length?{recipe:list[0].recipe,name:recipes[list[0].recipe].name,remaining:list.length,value:list.reduce((sum,b)=>sum+b.value,0)}:null})}
const durations={entering:2500,waiting:0,serving:3000,eating:4500,leaving:2500};
let phaseElapsed=new Map(),lastTick=performance.now(),timer=null,suspended=false;
function transfer(i){const job=data.stoves[i];if(!known(job)||Date.now()<job.ends)return;
 if(!supported(data.service)){notify('지원하지 않는 서빙 기록을 보존하고 있어요. 저장 파일을 확인해 주세요.');return}
 const stock=inventory();let slot=stock.findIndex(x=>x?.recipe===job.recipe);if(slot<0)slot=stock.findIndex(x=>!x);if(slot<0){notify('서빙대가 가득 찼어요. 같은 요리는 보충할 수 있고, 다른 요리는 빈 서빙대가 필요해요.');return}
 const batch={id:'batch-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),recipe:job.recipe,value:recipes[job.recipe].sell};
 if(transaction(d=>{const service=upgradeService(d);if(service.stock[slot])service.stock[slot].batches.push(batch);else service.stock[slot]={recipe:job.recipe,batches:[batch]};d.stoves[i]=null}))notify(recipes[job.recipe].name+' 보충 완료 · '+inventory()[slot].remaining+'회분 남았어요.');
}
function paint(){const now=Date.now();$('coins').textContent=Math.floor(data.coins).toLocaleString();$('served').textContent=data.served;$('level').textContent=data.level;if(!readable){$('coins').textContent='—';$('served').textContent='—';$('level').textContent='—';}
 const kitchen=$('kitchen');if(kitchen.children.length!==data.stoves.length)kitchen.replaceChildren();
 data.stoves.forEach((job,i)=>{const card=kitchen.children[i]||document.createElement('button');card.type='button';card.className='stove';card.dataset.slot=i;
 if(!job){card.textContent='조리대 '+(i+1)+' · 요리 선택';card.onclick=()=>showRecipes(i)}
 else if(!known(job)){card.textContent='조리대 '+(i+1)+' · 기록 확인 필요';card.onclick=()=>notify('알 수 없는 요리 기록을 그대로 보존하고 있어요.')}
 else{const r=recipes[job.recipe],remaining=job.ends-now;card.textContent=(remaining<=0?'완성 · 서빙대로 옮기기':'조리 중 · '+fmt(remaining))+'\n'+r.name+' · '+(i+1)+'번';card.onclick=()=>{if(Date.now()<job.ends){notify(r.name+' 조리 중 · '+fmt(job.ends-Date.now())+' 남았어요.');return}transfer(i)}}
 if(!card.isConnected)kitchen.append(card)});
 $('upgrade').textContent='식당 확장 · '+data.level*150+'코인';$('upgrade').disabled=!readable||!supported(data.service)||data.coins<data.level*150||data.level>=5;
 const ready=data.stoves.filter(x=>known(x)&&x.ends<=now).length;$('progress').style.width=(ready/data.stoves.length*100)+'%';$('cookTime').textContent=ready+'개 완성';
 const service=data.service,available=supported(service),stock=inventory(),remaining=stock.reduce((n,x)=>n+(x?.remaining||0),0);$('serviceSummary').textContent=!readable?'읽을 수 없는 저장 기록 보존 중 · 초기화 전 원본을 확인하세요':!available?'확인되지 않은 서빙 기록 보존 중':service?'재고 '+remaining+'회분 · 응대 '+service.guests.filter(Boolean).length+'/2':'완성 요리를 서빙대로 옮겨 영업을 시작하세요';
 window.dispatchEvent(new Event('restaurant-painted'));
}
function showRecipes(i){const box=$('recipeDialog');box.replaceChildren();const h=document.createElement('h2');h.textContent=(i+1)+'번 조리대 · 요리 선택';box.append(h);
 recipes.forEach((r,n)=>{if(data.level<r.lv)return;const btn=document.createElement('button');btn.type='button';btn.className='recipe-choice';btn.innerHTML='<strong>'+r.name+'</strong><span>'+fmt(r.ms)+' · 재료 '+r.cost+'코인</span><small>1회분 판매 수입 '+r.sell+'코인</small>';btn.disabled=!readable||!supported(data.service)||data.coins<r.cost;
 btn.onclick=()=>{if(data.stoves[i])return;if(!transaction(d=>{d.coins-=r.cost;d.stoves[i]={recipe:n,ends:Date.now()+r.ms}}))return;box.close();notify(r.name+' 조리 시작 · 완성되면 서빙대로 옮겨 주세요.')};box.append(btn)});
 const close=document.createElement('button');close.type='button';close.textContent='취소';close.onclick=()=>box.close();box.append(close);window.restaurantRoomUI?window.restaurantRoomUI.open(box):box.showModal();
}
$('upgrade').onclick=()=>{const cost=data.level*150;if(data.coins<cost||data.level>=5)return;if(transaction(d=>{d.coins-=cost;d.level++;if(d.stoves.length<4)d.stoves.push(null)}))notify('식당을 확장했어요. 새 조리대와 요리를 확인하세요.')};
$('newGame').onclick=()=>{if(!confirm('레스토랑의 코인·요리·레벨을 모두 초기화할까요?'))return;const previous=data,previousReadable=readable;readable=true;data={coins:150,served:0,level:1,stoves:[null,null],decor:0};if(!save()){data=previous;readable=previousReadable;paint();return}phaseElapsed.clear();paint()};
function tick(){const now=performance.now(),dt=Math.max(0,Math.min(1000,now-lastTick));lastTick=now;
 if(suspended||document.hidden||!supported(data.service)||!data.service)return;
 for(let i=0;i<2;i++){const s=data.service,guest=s.guests[i];
  if(!guest){const reserved=[0,1].map(n=>s.guests.filter(g=>g&&['entering','waiting'].includes(g.phase)&&g.counter===n).length);const counter=s.stock.findIndex((_,n)=>batches(s,n).length>reserved[n]);
   if(counter>=0&&(!window.restaurantRoomUI?.canServe||window.restaurantRoomUI.canServe(i,counter))){const id=batches(s,counter)[reserved[counter]].id;if(transaction(d=>{upgradeService(d).guests[i]={id,phase:'entering',counter,table:i}}))phaseElapsed.set(i,0)}else if(counter>=0)notify('가구가 손님 길을 막고 있어요. 가구 옮기기에서 출입구와 좌석 사이를 비워 주세요.');continue}
  if(window.restaurantRoomUI?.canServe&&!window.restaurantRoomUI.canServe(i,guest.counter)){notify('서빙 길이 막혔어요. 가구 배치를 바꾸면 남은 재고와 응대를 이어가요.');continue}
  const elapsed=(phaseElapsed.get(i)||0)+dt;phaseElapsed.set(i,elapsed);if(elapsed<durations[guest.phase])continue;
  if(guest.phase==='entering'){if(transaction(d=>{upgradeService(d).guests[i].phase='waiting'}))phaseElapsed.set(i,0)}
  else if(guest.phase==='waiting'){if(s.guests.some((g,j)=>j!==i&&g?.phase==='serving'))continue;const batch=batches(s,guest.counter)[0];if(!batch)continue;
   if(transaction(d=>{const service=upgradeService(d),slot=service.stock[guest.counter];service.guests[i].batch=slot.batches.shift();if(!slot.batches.length)service.stock[guest.counter]=null;service.guests[i].phase='serving'}))phaseElapsed.set(i,0)}
  else if(guest.phase==='serving'){if(transaction(d=>{upgradeService(d).guests[i].phase='eating'}))phaseElapsed.set(i,0)}
  else if(guest.phase==='eating'){const batch=guest.batch;if(!validBatch(batch))continue;
   if(transaction(d=>{const g=upgradeService(d).guests[i];if(!g.paid){d.coins+=g.batch.value;d.served++;g.paid=true}g.phase='leaving'})){phaseElapsed.set(i,0);notify(recipes[batch.recipe].name+' 판매 완료 · +'+batch.value+'코인')}}
  else if(guest.phase==='leaving'){if(transaction(d=>{upgradeService(d).guests[i]=null}))phaseElapsed.delete(i)}
 }
}
function setActive(){clearInterval(timer);timer=null;lastTick=performance.now();if(!document.hidden)timer=setInterval(()=>{tick();paint()},250)}
document.addEventListener('visibilitychange',()=>{setActive();if(!document.hidden)paint()});window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null});window.addEventListener('pageshow',setActive);
window.restaurantRoomBridge=Object.freeze({snapshot:()=>copy(data),useStove:i=>{if(Number.isInteger(i)&&i>=0&&i<data.stoves.length)document.querySelector('#kitchen [data-slot="'+i+'"]')?.click()},
 saveLayout:layout=>transaction(d=>{d.roomLayout=layout}),
 serviceAvailable:()=>supported(data.service),
 inventory,
 setSuspended:value=>{suspended=!!value;setActive()},
 serviceMotion:()=>({progress:[0,1].map(i=>{const g=data.service?.guests?.[i];return g?Math.min(1,(phaseElapsed.get(i)||0)/(durations[g.phase]||1)):0})})
});
if(lastStored===null)save();paint();setActive();
})();
