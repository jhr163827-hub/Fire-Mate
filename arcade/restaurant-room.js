/* Independent vector artwork and room controls. No original Pucca game assets. */
(()=>{'use strict';
const $=id=>document.getElementById(id),bridge=window.restaurantRoomBridge,svg=$('restaurantRoom');
if(!bridge||!svg)return;
const SIZE=8,blocked=new Set(['6,0']);
let editing=false,selected=null,draft=null,cacheKey='',unsupported=false,inspectedCounter=null;
const labels={stove:'조리대',counter:'서빙대',table:'식탁',chair:'의자',plant:'화분'};
function items(state){
 const list=state.stoves.map((_,i)=>({id:'stove-'+i,type:'stove',slot:i,x:1+i*2,y:1}));
 return list.concat([{id:'counter-0',type:'counter',x:2,y:3},{id:'counter-1',type:'counter',x:3,y:3},{id:'table-0',type:'table',x:2,y:5},{id:'chair-0',type:'chair',x:1,y:5},{id:'chair-1',type:'chair',x:2,y:6},{id:'table-1',type:'table',x:5,y:5},{id:'chair-2',type:'chair',x:4,y:5},{id:'chair-3',type:'chair',x:5,y:6},{id:'plant-0',type:'plant',x:0,y:6},{id:'plant-1',type:'plant',x:7,y:6}]);
}
const defaults=list=>Object.fromEntries(list.map(a=>[a.id,{x:a.x,y:a.y}]));
function valid(positions,list){const occupied=new Set();return list.every(a=>{const p=positions[a.id];if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>=SIZE||p.y>=SIZE)return false;const key=p.x+','+p.y;if(blocked.has(key)||occupied.has(key))return false;occupied.add(key);return true})}
function savedPositions(state,list){const fallback=defaults(list),layout=state.roomLayout;
 if(layout===undefined){unsupported=false;return fallback}
 if(!layout||layout.version!==1||!layout.positions||typeof layout.positions!=='object'){unsupported=true;return fallback}
 const positions={...fallback,...layout.positions};unsupported=!valid(positions,list);return unsupported?fallback:positions;
}
const point=(x,y)=>[300+(x-y)*34,92+(x+y)*17];
const polygon=(points,fill,extra='')=>'<polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="'+fill+'" '+extra+'/>';
// Shaded faces share the same cell projection as saved layouts and walking paths.
function box(top='url(#steelTop)',front='url(#steelFront)',side='#89969a',height=30){return polygon([[0,-height-14],[29,-height],[0,-height+14],[-29,-height]],top,'stroke="#68787c" stroke-width=".8"')+polygon([[-29,-height],[0,-height+14],[0,14],[-29,0]],front,'stroke="#68787c" stroke-width=".8"')+polygon([[0,-height+14],[29,-height],[29,0],[0,14]],side,'stroke="#68787c" stroke-width=".8"')}
// Dishes keep their saved recipe indexes; the art is independently drawn, not a source sprite.
function dish(recipe=0,y=-34){
 const food=[
  '<g fill="#fff9e4" stroke="#cbbd99" stroke-width=".6"><path d="M-13 0l7-11 7 12z"/><path d="M-1 2l7-12 8 11z"/></g><path d="M-9-1h6v5h-6zm13 0h6v5H4z" fill="#314e35"/><path d="M-13 5h26" stroke="#bd8053"/>',
  '<path d="M-15-4q1 17 15 17T15-4" fill="#ae4d38" stroke="#77362d"/><ellipse cy="-4" rx="15" ry="6" fill="#efc461" stroke="#713f32"/><path d="M-11-5q4-5 8 1t8 0t7 0M-9-1q5-4 10 0t8-1" fill="none" stroke="#fff0ad" stroke-width="1.6"/><ellipse cx="7" cy="-5" rx="4" ry="2.8" fill="#fff8dc"/><circle cx="7" cy="-5" r="1.7" fill="#eaa33b"/><path d="M-8-6l4 3m-3 2 4-1" stroke="#44783c" stroke-width="2"/>',
  '<path d="M-14 2q-4-10 7-12Q3-7 2 4z" fill="#fff6d9" stroke="#d6c49d"/><path d="M0-6q16-5 15 6Q10 9-1 5z" fill="#b76f2d"/><g fill="#ecb552"><rect x="4" y="-4" width="4" height="3" rx="1"/><rect x="9" y="0" width="4" height="3" rx="1"/></g><path d="M-11-4l2 1m3-3 2 1m-5 4 2 1" stroke="#d9cda9"/><circle cx="6" cy="2" r="1.8" fill="#658b40"/>',
  '<path d="M-15-2q0-13 15-13T15-2z" fill="#e9ab48" stroke="#b67b30"/><path d="M-12-8l1 1m7-3 1 1m6-1 1 1m6 1 1 1" stroke="#fff0bb" stroke-width="1.6"/><path d="M-15 1h30" stroke="#477540" stroke-width="5"/><path d="M-13 3h26" stroke="#a8442d" stroke-width="3"/><path d="M-13 5h26" stroke="#5e3828" stroke-width="4"/><path d="M-14 8q14 7 28 0v-2h-28z" fill="#e4a347"/><path d="M-12 2l8 6 9-6" fill="#f6cf57"/>',
  '<path d="M-13-6q8-8 19-3 11 5 4 12-8 8-21 2-7-3-2-11z" fill="#8f4833" stroke="#663a2b"/><path d="M-9-7l12 10m-7-12 13 10M-10-1l9 7" stroke="#bd7850" stroke-width="2"/><path d="M10 5l6-3m-5 6 5-2" stroke="#597b3a" stroke-width="3"/>'
 ][Number.isInteger(recipe)&&recipe>=0&&recipe<5?recipe:0];
 return '<g class="room-food room-food-'+recipe+'" transform="translate(0 '+y+')"><ellipse cy="5" rx="20" ry="8" fill="#655244" opacity=".16"/><ellipse cy="2" rx="19" ry="8" fill="#f8f2e5" stroke="#b2ad9d"/><ellipse cy="1" rx="16" ry="6" fill="#e9e5d6"/>'+food+'</g>';
}
function artwork(type){
 if(type==='stove')return '<ellipse class="stove-glow" cy="-7" rx="35" ry="19" fill="transparent"/>'+box()+'<path d="M-23-26l21 10m5 0 20-10" stroke="#eef2ed" stroke-width="1.5"/><ellipse cy="-31" rx="22" ry="10" fill="#394448"/><ellipse cy="-32" rx="17" ry="7" fill="#202a2b"/><path d="M-18-32q1 15 18 15 17 0 18-15" fill="#535e60" stroke="#2f3a3d" stroke-width="1.2"/><ellipse cy="-32" rx="17" ry="7" fill="#b9a37c"/><path d="M-24-33l-7-4m55 4 7 3" stroke="#3b4649" stroke-width="4" stroke-linecap="round"/><g fill="#dbb047" stroke="#575c55" stroke-width=".8"><circle cx="-21" cy="-6" r="2.5"/><circle cx="-12" cy="-2" r="2.5"/></g><path d="M-24 4l18 8m10 0 19-9" stroke="#53656b" stroke-width="2"/><path class="room-flame" d="M-12-16q-5-5 0-9l4 4 5-7 5 8 6-4q5 6 1 9z" fill="#edb54c"/><g class="room-steam" fill="none" stroke="#fff9e9" stroke-width="2" stroke-linecap="round"><path d="M-7-42q-5-7 0-14m9 9q6-8 0-14"/></g>';
 if(type==='counter')return box('url(#counterTop)','#d8dedb','#a6b4b0',35)+'<path d="M-27-31L0-18l27-13" fill="none" stroke="#fff" stroke-width="2"/><path d="M-16-19V5M15-17V6" stroke="#a6b3af" stroke-width="1"/><path d="M-10-7l5 2m11 1 5-2" stroke="#748c90" stroke-width="2"/><ellipse cy="-35" rx="18" ry="8" fill="#b8c5c0" opacity=".5"/>';
 if(type==='table')return '<ellipse cy="12" rx="25" ry="10" fill="#674d3330"/><path d="M-23-13v27m46-27v27M0-2v24" stroke="#6e4227" stroke-width="5"/>'+box('url(#tableTop)','#ab6032','#804729',22)+'<path d="M-25-22L0-10l25-12M-15-34L11-21m-22 6 25-12" fill="none" stroke="#f4c382" stroke-width=".8"/>';
 if(type==='chair')return '<ellipse cy="12" rx="17" ry="6" fill="#674d3328"/><path d="M-14-19v32m25-23v24M-14-40v20M11-28v17" stroke="#85462e" stroke-width="4"/>'+polygon([[-16,-43],[13,-29],[13,-16],[-16,-30]],'#b94b43','stroke="#793c2c" stroke-width="1.5"')+'<path d="M-11-37l19 9m-19-4 19 9" stroke="#e79c77" stroke-width="1"/>'+polygon([[-14,-18],[2,-26],[19,-18],[2,-9]],'#d45c4c','stroke="#793c2c" stroke-width="1.5"');
 return '<ellipse cy="8" rx="18" ry="7" fill="#634e3430"/><path d="M-15-13h30l-4 20h-22z" fill="#b56943" stroke="#875333"/><path d="M-10-8l3 14m6-12v13m8-15L6 5" stroke="#d68f60"/><ellipse cy="-13" rx="16" ry="7" fill="#e6aa7e"/><ellipse cy="-14" rx="12" ry="4" fill="#5c4633"/><g fill="#6c9e47" stroke="#477b3e" stroke-width="1"><ellipse cx="-8" cy="-28" rx="9" ry="16" transform="rotate(-30 -8 -28)"/><ellipse cx="8" cy="-31" rx="9" ry="18" transform="rotate(25 8 -31)"/><ellipse cy="-40" rx="9" ry="19"/></g>';
}
function person(x,y,color,chef=false,variant=0){
 const [px,py]=point(x,y),hair=chef?'#242128':variant?'#453344':'#65412d';
 return '<g class="room-person room-art" transform="translate('+px+' '+(py-6)+')"><ellipse cy="8" rx="12" ry="4.5" fill="#4c3c3130"/><g class="room-posture"><g class="room-person-bob"><g class="room-legs" stroke="#302b32" stroke-width="5" stroke-linecap="round"><path class="room-leg-left" d="M-4 2v7l-3 1"/><path class="room-leg-right" d="M4 2v7l3 1"/></g><path d="M-10-15q10-5 20 0L8 3H-8z" fill="'+color+'" stroke="#70463a" stroke-width=".7"/>'+(chef?'<path d="M-6-13H6L8 2H-8z" fill="#fff0c8"/><path d="M-5-5H5" stroke="#d9c69f"/>':'')+'<g class="room-arms" stroke="'+color+'" stroke-width="5" stroke-linecap="round"><path d="M-9-12l-4 10"/><path class="room-serving-hand" d="M9-12l4 10"/></g><path class="room-utensil" d="M10-13l-3-6m-1-3 1 3m1-4 1 3" fill="none" stroke="#7a7770" stroke-width="1.2"/><g class="room-head">'+(chef?'<circle cx="-14" cy="-39" r="7" fill="'+hair+'"/><circle cx="14" cy="-39" r="7" fill="'+hair+'"/>':variant?'<path d="M13-32q15 0 8 13l-9-7" fill="'+hair+'"/>':'')+'<ellipse cy="-28" rx="16" ry="15" fill="#f4d1aa" stroke="#a97559" stroke-width=".7"/><path d="M-16-29q-1-19 16-18 19 1 16 23l-7-13-9 4-9-4-5 13z" fill="'+hair+'"/><g class="room-face"><g class="room-eyes" fill="#302630"><ellipse cx="-5" cy="-27" rx="1.4" ry="2.1"/><ellipse cx="5" cy="-27" rx="1.4" ry="2.1"/></g><path d="M-3-21q3 3 6 0" fill="none" stroke="#9c5b50" stroke-width="1.2"/><g fill="#e99785" opacity=".65"><ellipse cx="-10" cy="-23" rx="3" ry="1.5"/><ellipse cx="10" cy="-23" rx="3" ry="1.5"/></g></g><path class="room-back-hair" d="M-16-29q-1-19 16-18 19 1 16 23Q0-11-16-29" fill="'+hair+'"/></g></g></g></g>';
}
function chefPosition(list,positions){const p=positions['stove-0'];return freeNeighbors(p,list,positions)[0]||[p.x+.5,p.y+.5]}
function inventory(state){if(bridge.inventory)return bridge.inventory();return [0,1].map(i=>{const batch=state.service?.version===1?state.service.stock[i]:null;return batch?{recipe:batch.recipe,remaining:1,value:batch.value,name:'이전 요리',price:batch.value}:null})}
function roomMarkup(state,list,positions){
 const stock=inventory(state);let floor='';for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const p=point(x,y);floor+=polygon([p,point(x+1,y),point(x+1,y+1),point(x,y+1)],(x+y)%2?'#b67c50':'#c48c5c','class="room-cell" data-room-cell="'+x+','+y+'"');for(const t of [.25,.5,.75]){const a=point(x+t,y),b=point(x+t,y+1);floor+='<path d="M'+a.join(' ')+'L'+b.join(' ')+'" stroke="#e6b57d" stroke-width=".6" opacity=".45" pointer-events="none"/>'}}
 const corner=point(0,0),right=point(SIZE,0),left=point(0,SIZE),bottom=point(SIZE,SIZE);
 const walls=polygon([[corner[0],corner[1]-78],[right[0],right[1]-78],right,corner],'url(#rightWall)')+polygon([[left[0],left[1]-78],[corner[0],corner[1]-78],corner,left],'url(#leftWall)')+polygon([left,bottom,[bottom[0],bottom[1]+13],[left[0],left[1]+13]],'#9e7555')+polygon([bottom,right,[right[0],right[1]+13],[bottom[0],bottom[1]+13]],'#795b44');
 const wallArt=[];
 // Windows are drawn in wall coordinates so frames retain the isometric perspective.
 for(const y of [1.6,4.4,6.7]){const p=point(0,y);wallArt.push('<g transform="translate('+p[0]+' '+(p[1]-20)+')"><path d="M-14-5v-31q0-12 14-19 14-7 14 5v31z" fill="#aad5dc" stroke="#f7e4c6" stroke-width="6"/><path d="M-14-5v-31q0-12 14-19 14-7 14 5v31zM0-51v39m-14-17 28-14" fill="none" stroke="#638b9e" stroke-width="2"/></g>')}
 const p=point(6.5,0);wallArt.push('<g transform="translate('+p[0]+' '+p[1]+')"><path d="M-18-9v-68l36 18v68z" fill="#8d6545" stroke="#73513b" stroke-width="3"/><path d="M-12-18v-46l24 12v46z" fill="#b6d5d1" stroke="#b18c61" stroke-width="2"/><path d="M-12-39l24 12" stroke="#f2dfb5" stroke-width="2"/><circle cx="11" cy="-1" r="2" fill="#eacb78"/></g>');
 const door=wallArt.join(''),windowArt='';
 let entities=list.map(a=>({...a,...positions[a.id]}));entities.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
 const occupied=new Set(entities.map(a=>a.x+','+a.y));let targets='';if(editing&&selected)for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const key=x+','+y;if(occupied.has(key)||blocked.has(key))continue;const p=point(x+.5,y+.5);targets+='<circle class="room-placement" data-room-target="'+key+'" cx="'+p[0]+'" cy="'+p[1]+'" r="9"/>';}
 const furniture=entities.map(a=>{const p=point(a.x+.5,a.y+.5),active=selected===a.id;return '<g data-room-item="'+a.id+'" data-kind="'+a.type+'"'+(a.type==='stove'?' data-room-stove="'+a.slot+'"':'')+' data-depth="'+(a.x+a.y+1)+'" class="room-item'+(active?' selected':'')+'" role="button" tabindex="'+(editing||a.type==='stove'||a.type==='counter'?0:-1)+'" aria-label="'+(a.type==='stove'?(a.slot+1)+'번 조리대':a.type==='counter'?(Number(a.id.split('-')[1])+1)+'번 서빙대 · '+(stock[Number(a.id.split('-')[1])]?.remaining||0)+'접시':labels[a.type])+'" aria-pressed="'+active+'" transform="translate('+p[0]+' '+p[1]+')">'+polygon([[0,-19],[35,-2],[0,16],[-35,-2]],'#ffdc76','class="selection" stroke="#ab7135" stroke-width="3"')+'<g class="room-art">'+artwork(a.type)+(a.type==='stove'&&state.stoves[a.slot]?'<g class="room-cooked-dish">'+dish(state.stoves[a.slot].recipe,-34)+'</g>':'')+(a.type==='counter'&&stock[Number(a.id.split('-')[1])]?'<g class="room-stock-plates"><ellipse cy="-31" rx="19" ry="7" fill="#f6f0de" stroke="#aca99b"/>'+(stock[Number(a.id.split('-')[1])].remaining>1?'<ellipse cy="-34" rx="19" ry="7" fill="#fff8e6" stroke="#aca99b"/>':'')+dish(stock[Number(a.id.split('-')[1])].recipe,-38)+'</g>':'')+'</g>'+(a.type==='counter'?'<g class="room-stock-badge"><rect x="-21" y="12" width="42" height="16" rx="6"/><text y="24">'+(stock[Number(a.id.split('-')[1])]?.remaining||0)+'접시</text></g>':'')+'<polygon class="room-action" points="0,-41 34,-24 0,-7 -34,-24"/>'+(a.type==='stove'?'<g><rect class="room-stove-badge-bg" x="-28" y="-69" width="56" height="22" rx="9"/><text class="room-stove-badge" y="-53">'+(a.slot+1)+'</text></g>':'')+'</g>'}).join('');
 return '<defs><linearGradient id="steelTop" x2=".3" y2="1"><stop stop-color="#f5f4eb"/><stop offset="1" stop-color="#bcc7c7"/></linearGradient><linearGradient id="steelFront" x2="0" y2="1"><stop stop-color="#bdc9c9"/><stop offset="1" stop-color="#889ba1"/></linearGradient><linearGradient id="counterTop" x2=".4" y2="1"><stop stop-color="#fffdf0"/><stop offset="1" stop-color="#e2e8df"/></linearGradient><linearGradient id="tableTop" x2=".3" y2="1"><stop stop-color="#e8b470"/><stop offset="1" stop-color="#c58043"/></linearGradient><linearGradient id="leftWall" x2="0" y2="1"><stop stop-color="#f4d5ce"/><stop offset="1" stop-color="#e5bcb3"/></linearGradient><linearGradient id="rightWall" x2="0" y2="1"><stop stop-color="#d3e3df"/><stop offset="1" stop-color="#a8c9c7"/></linearGradient><filter id="roomShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity=".12"/></filter></defs><ellipse cx="300" cy="349" rx="244" ry="48" fill="#1b352630"/><g filter="url(#roomShadow)">'+walls+floor+'</g><g class="room-art">'+door+windowArt+'</g>'+'<g id="roomServiceActors">'+furniture+(editing?'':'<g class="room-chef" data-depth="'+chefPosition(list,positions).reduce((a,b)=>a+b,0)+'">'+person(...chefPosition(list,positions),'#c7473d',true)+'</g>')+'</g>'+targets;
}
function status(message){$('status').textContent=message}
function paint(){const state=bridge.snapshot(),list=items(state),stored=savedPositions(state,list),positions=editing?draft:stored,key=JSON.stringify([positions,state.stoves.map(j=>j?.recipe??null),editing,selected,inventory(state)]);
 if(key!==cacheKey){const actors=[...svg.querySelectorAll('[data-actor]')];svg.innerHTML=roomMarkup(state,list,positions);if(!editing)svg.querySelector('#roomServiceActors').append(...actors);cacheKey=key}
 $('restaurantWorld').classList.toggle('editing',editing);$('roomModeLabel').textContent=editing?'가구 배치 중':'나의 작은 식당';$('roomDock').hidden=editing;$('roomEditBar').hidden=!editing;$('roomEditHelp').hidden=!editing;
 svg.querySelectorAll('[data-room-stove]').forEach(el=>{const i=+el.dataset.roomStove,job=state.stoves[i],remaining=job?Number(job.ends)-Date.now():null,known=!job||Number.isInteger(job.recipe)&&job.recipe>=0&&job.recipe<5;const label=!known||job&&!Number.isFinite(remaining)?'확인':job?remaining<=0?'완성':Math.ceil(remaining/60000)+'분':(i+1)+'번';el.classList.toggle('ready',!!job&&known&&remaining<=0);el.classList.toggle('cooking',!!job&&known&&remaining>0);el.querySelector('.room-stove-badge').textContent=label;el.setAttribute('aria-label',(i+1)+'번 조리대 · '+(!known?'확인 필요':!job?'요리 선택':remaining<=0?'완성 · 서빙대로 옮기기':'조리 중'))});
 scene={state,list,positions};if(!editing)paintService(state,list,positions);syncFrames();
 svg.querySelector('.room-chef')?.classList.toggle('room-chef-cooking',state.stoves.some(j=>j&&j.ends>Date.now()));
 svg.querySelectorAll('[data-room-item]').forEach(el=>{el.classList.toggle('room-touched',touchFeedback?.id===el.dataset.roomItem&&performance.now()<touchFeedback.until);el.classList.toggle('room-rejected',el.classList.contains('room-touched')&&touchFeedback?.rejected)});
 if($('counterDialog')?.open&&inspectedCounter!==null){const info=inventory(state)[inspectedCounter];const pending=bridge.pendingValue?.(inspectedCounter)||0;const text=(info?info.name+' · 남은 '+info.remaining+'접시 · 접시당 '+info.price+'코인\n재고 판매 예정 '+info.value.toLocaleString()+'코인':'빈 서빙대예요. 완성된 조리대를 누르면 음식을 옮길 수 있어요.')+(pending?'\n전달·식사 중 '+pending.toLocaleString()+'코인 · 재고에서 제외':'');if($('counterStockDetails').textContent!==text)$('counterStockDetails').textContent=text;}
}
// Paths stay in free floor cells. Only a guest's final chair is an allowed occupied endpoint.
function freeNeighbors(p,list,positions){const used=new Set(list.map(a=>positions[a.id].x+','+positions[a.id].y));return [[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>[p.x+dx+.5,p.y+dy+.5]).filter(([x,y])=>x>=0&&y>=0&&x<SIZE&&y<SIZE&&!used.has(Math.floor(x)+','+Math.floor(y))&&!blocked.has(Math.floor(x)+','+Math.floor(y)))}
function route(from,to,list,positions,avoidChef=true){
 const start=from.map(Math.floor),end=to.map(Math.floor),key=p=>p.join(',');
 const occupied=new Set(list.map(a=>key([positions[a.id].x,positions[a.id].y])));
 if(avoidChef){const chef=chefPosition(list,positions).map(Math.floor);occupied.add(key(chef))}
 occupied.delete(key(start));occupied.delete(key(end));
 const queue=[start],parents=new Map([[key(start),null]]);let found=null;
 for(let n=0;n<queue.length;n++){const p=queue[n];if(key(p)===key(end)){found=p;break}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy],k=key(q);if(q[0]<0||q[1]<0||q[0]>=SIZE||q[1]>=SIZE||occupied.has(k)||parents.has(k))continue;parents.set(k,p);queue.push(q)}}
 if(!found)return null;const path=[];for(let p=found;p;p=parents.get(key(p)))path.push([p[0]+.5,p[1]+.5]);path.reverse();
 if(Math.hypot(path[0][0]-from[0],path[0][1]-from[1])>.001)path.unshift(from);
 return path;
}
function along(path,t){if(!path?.length)return [6.5,.5];const p=Math.max(0,Math.min(path.length-1,t*(path.length-1))),i=Math.floor(p),a=path[i],b=path[Math.min(i+1,path.length-1)];return [a[0]+(b[0]-a[0])*(p-i),a[1]+(b[1]-a[1])*(p-i)]}
let pathsKey='',pathsObject=null,pathsCache=new Map();
function servicePaths(list,positions,table,counter){
 if(positions!==pathsObject){const key=JSON.stringify(positions);pathsObject=positions;if(key!==pathsKey){pathsKey=key;pathsCache.clear()}}
 const id=table+','+counter;if(pathsCache.has(id))return pathsCache.get(id);
 const seat=positions['chair-'+(table===0?1:3)],c=positions['counter-'+counter],tablePos=positions['table-'+table];if(!seat||!c||!tablePos)return null;
 const guest=route([6.5,.5],[seat.x+.5,seat.y+.5],list,positions),chef=chefPosition(list,positions).map(Math.floor).join(',');
 const pickupOptions=freeNeighbors(c,list,positions).filter(p=>p.map(Math.floor).join(',')!==chef).sort((a,b)=>a[1]-b[1]);
 const dropOptions=freeNeighbors(tablePos,list,positions).filter(p=>p.map(Math.floor).join(',')!==chef);
 let result=null;
 for(const pickup of pickupOptions){for(const drop of dropOptions){const waiter=route(pickup,drop,list,positions);if(guest&&waiter){result={guest,waiter,pickup,drop,table:[tablePos.x+.5,tablePos.y+.5]};break}}if(result)break}
 pathsCache.set(id,result);return result;
}
function canServe(table,counter){const state=bridge.snapshot(),list=items(state),positions=savedPositions(state,list);return !!servicePaths(list,positions,table,counter)}
let scene=null,frame=null,lastFrame=0,visualClock=0,visualLast=performance.now(),motionPaused=false,touchFeedback=null;
const visualProgress=new Map(),actorElements=new Map(),poses=new Map(),worker={xy:null,task:null,delivery:null,returning:null,layout:null};
function actorNode(layer,id){let el=actorElements.get(id);if(!el?.isConnected){el=layer.querySelector('[data-actor="'+id+'"]')}if(!el){el=document.createElementNS('http://www.w3.org/2000/svg','g');el.dataset.actor=id;el.classList.add('room-actor');layer.append(el)}actorElements.set(id,el);return el}
function putPerson(layer,id,xy,color,walking=false,pose='standing',variant=0){
 const el=actorNode(layer,id);if(!el.firstElementChild)el.innerHTML=person(0,0,color,false,variant).replace('transform="translate(300 86)"','');
 const prior=poses.get(id),p=point(...xy),old=prior?point(...prior):p,dx=p[0]-old[0],dy=p[1]-old[1];
 if(Math.abs(dx)>.03){el.dataset.facing=dx<0?'left':'right';el.firstElementChild.setAttribute('transform','scale('+(dx<0?-1:1)+' 1)')}
 if(walking&&Math.hypot(dx,dy)>.03)el.dataset.view=dy<-.03?'back':'front';
 if(!walking)el.dataset.view='front';
 el.classList.toggle('room-walking',walking);el.dataset.pose=pose;el.dataset.depth=xy[0]+xy[1];el.dataset.x=xy[0];el.dataset.y=xy[1];const transform='translate('+p[0]+' '+(p[1]-6)+')';if(el.getAttribute('transform')!==transform)el.setAttribute('transform',transform);poses.set(id,xy);return el;
}
function putFood(layer,id,xy,recipe,y=-23){const el=actorNode(layer,id),p=point(...xy);if(el.dataset.recipe!==String(recipe)||el.dataset.foodY!==String(y)){el.innerHTML=dish(recipe,y);el.dataset.recipe=recipe;el.dataset.foodY=y}el.dataset.depth=xy[0]+xy[1]+.02;const transform='translate('+p[0]+' '+p[1]+')';if(el.getAttribute('transform')!==transform)el.setAttribute('transform',transform);return el}
function advanceVisualClock(){const now=performance.now();if(!motionPaused&&!editing&&!document.hidden)visualClock+=Math.max(0,now-visualLast);visualLast=now}
function paintService(state,list,positions){
 advanceVisualClock();const layer=$('roomServiceActors');if(!layer||motionPaused)return;
 if(bridge.serviceAvailable&&!bridge.serviceAvailable()){layer.querySelectorAll('[data-actor]').forEach(el=>el.remove());return}
 const guests=[1,2,3].includes(state.service?.version)?state.service.guests:[],motion=bridge.serviceMotion?.()||{progress:[0,0]},wanted=new Set();
 guests.forEach((g,i)=>{
  if(!g){visualProgress.delete(i);return}
  const token=g.id+':'+g.phase+':'+(g.batch?.id||''),last=visualProgress.get(i);
  // The engine paints a committed phase before clearing the previous phase's elapsed time.
  // Never latch that stale elapsed value as completion of a newly displayed phase.
  if(last?.token===token)motion.progress[i]=Math.max(last.progress,motion.progress[i]);
  else if(last)motion.progress[i]=0;
  visualProgress.set(i,{token,progress:motion.progress[i]});
 });
 for(let i=0;i<guests.length;i++){
  const g=guests[i];if(!g)continue;const paths=servicePaths(list,positions,i,g.counter),id='guest-'+i;
  let xy=poses.get(id)||[6.5,.5];
  if(paths){const path=g.phase==='leaving'?[...paths.guest].reverse():paths.guest;xy=['entering','leaving'].includes(g.phase)?along(path,motion.progress[i]):paths.guest.at(-1);
   // Parallel lane spacing fades at the chair; it does not change path cells or gameplay time.
   if(['entering','leaving'].includes(g.phase)){const amount=Math.sin(Math.PI*motion.progress[i])*(i?.1:-.1);xy=[xy[0]+amount,xy[1]-amount]}
  }
  const walking=!!paths&&['entering','leaving'].includes(g.phase);putPerson(layer,id,xy,i?'#aa7793':'#cb985a',walking,g.phase==='eating'?'eating':['waiting','serving'].includes(g.phase)?'seated':'standing',i);wanted.add(id);
  if(g.phase==='eating'&&g.batch){const table=positions['table-'+i];putFood(layer,'meal-'+i,paths?.table||[table.x+.5,table.y+.5],g.batch.recipe);wanted.add('meal-'+i)}
 }
 const layoutKey=JSON.stringify(positions),base=servicePaths(list,positions,0,0)?.pickup||worker.xy;
 if(base){
  if(worker.layout!==layoutKey){worker.xy=base;worker.task=null;worker.delivery=null;worker.returning=null;worker.layout=layoutKey}
  const serving=guests.findIndex(g=>g?.phase==='serving'),g=guests[serving],paths=g?servicePaths(list,positions,serving,g.counter):null;
  let walking=false;
  if(g&&paths){
   const task=(g.batch?.id||g.id)+':'+serving;
   if(worker.task!==task){const approach=route(worker.xy||base,paths.pickup,list,positions)||[paths.pickup];worker.delivery={path:[...approach,...paths.waiter.slice(1)],pickup:Math.max(0,approach.length-1),table:paths.table,source:[positions['counter-'+g.counter].x+.5,positions['counter-'+g.counter].y+.5]};worker.task=task;worker.returning=null}
   const d=worker.delivery,t=motion.progress[serving],walkT=Math.min(1,t/.82),steps=Math.max(1,d.path.length-1);worker.xy=along(d.path,walkT);walking=walkT<1&&d.path.length>1;
   const pickupT=d.pickup/steps*.82;
   let foodXY=[worker.xy[0]+.25,worker.xy[1]-.25],foodY=-22;
   if(t<pickupT){foodXY=d.source;foodY=-38}
   else if(t>.82){const h=(t-.82)/.18;foodXY=[foodXY[0]+(d.table[0]-foodXY[0])*h,foodXY[1]+(d.table[1]-foodXY[1])*h];foodY=-22-h}
   putFood(layer,'carry-'+serving,foodXY,g.batch?.recipe||0,foodY);wanted.add('carry-'+serving);
  }else if(g?.batch){putFood(layer,'carry-'+serving,[worker.xy[0]+.25,worker.xy[1]-.25],g.batch.recipe,-22);wanted.add('carry-'+serving)}else if(!g){
   if(worker.delivery){worker.returning={path:route(worker.xy,base,list,positions)||[worker.xy],started:visualClock};worker.delivery=null;worker.task=null}
   if(worker.returning){const t=Math.min(1,(visualClock-worker.returning.started)/1800);worker.xy=along(worker.returning.path,t);walking=t<1&&worker.returning.path.length>1;if(t===1)worker.returning=null}
  }
  putPerson(layer,'waiter-service',worker.xy||base,'#558b86',walking,g&&paths?'carrying':'standing');wanted.add('waiter-service');
 }
 for(const el of layer.querySelectorAll('[data-actor]'))if(!wanted.has(el.dataset.actor)){poses.delete(el.dataset.actor);actorElements.delete(el.dataset.actor);el.remove()}
 const ordered=[...layer.children].sort((a,b)=>Number(a.dataset.depth)-Number(b.dataset.depth));ordered.forEach((el,i)=>{if(layer.children[i]!==el)layer.insertBefore(el,layer.children[i]||null)});
}
function motionNeeded(){return worker.returning||scene?.state.service?.guests?.some(g=>g&&['entering','serving','leaving'].includes(g.phase))}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');reducedMotion.addEventListener('change',()=>syncFrames());
function syncFrames(){
 if(editing||motionPaused||document.hidden||reducedMotion.matches||!scene||!motionNeeded()){if(frame!==null)cancelAnimationFrame(frame);frame=null;lastFrame=0;return}
 if(frame!==null)return;
 const draw=now=>{frame=null;if(editing||motionPaused||document.hidden||reducedMotion.matches)return;
  if(!lastFrame||now-lastFrame>=32){lastFrame=now;paintService(scene.state,scene.list,scene.positions)}
  if(motionNeeded())frame=requestAnimationFrame(draw);else lastFrame=0;
 };
 frame=requestAnimationFrame(draw);
}
function feedback(id,rejected=false){touchFeedback={id,rejected,until:performance.now()+600};paint()}
function activate(el){if(historyBusy)return;const id=el.dataset.roomItem;touchFeedback={id,until:performance.now()+600};const state=bridge.snapshot(),list=items(state);if(editing){selected=id;cacheKey='';paint();status(labels[list.find(a=>a.id===id).type]+' 선택 · 초록 표시를 눌러 놓으세요.');return}if(el.dataset.roomStove!==undefined){const slot=+el.dataset.roomStove,job=state.stoves[slot];if(job&&(!Number.isInteger(job.recipe)||job.recipe<0||job.recipe>=5)){status('알 수 없는 요리 기록을 유지하고 있어요. 기록을 확인한 뒤 처리해 주세요.');return}bridge.useStove(slot);feedback(id,/저장하지 못|다른 창|가득|알 수 없는|지원하지 않는/.test($('status').textContent))}else if(el.dataset.kind==='counter'){inspectedCounter=Number(id.split('-')[1]);const info=inventory(state)[inspectedCounter];if($('counterDialog')){$('counterTitle').textContent=(inspectedCounter+1)+'번 서빙대 재고';openDialog($('counterDialog'));paint()}else status(info?'음식 '+info.remaining+'접시가 준비됐어요. 직원이 자동으로 서빙해요.':'빈 서빙대예요. 완성된 조리대를 눌러 음식을 옮기세요.')}else status('가구를 옮기려면 아래 가구 옮기기를 누르세요.')}
svg.addEventListener('click',e=>{const item=e.target.closest('[data-room-item]');if(item){activate(item);return}const cell=e.target.closest('[data-room-target],[data-room-cell]');if(!editing||!selected||!cell)return;const [x,y]=(cell.dataset.roomTarget||cell.dataset.roomCell).split(',').map(Number),next={...draft,[selected]:{x,y}};if(!valid(next,items(bridge.snapshot()))){status('다른 가구나 출입구가 있는 칸에는 놓을 수 없어요.');return}draft=next;selected=null;cacheKey='';paint();status('위치를 옮겼어요. 배치 적용을 누르면 저장돼요.')});
svg.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-room-item]')){e.preventDefault();activate(e.target)}});
$('roomEdit').onclick=()=>{const state=bridge.snapshot(),list=items(state);draft=savedPositions(state,list);if(unsupported){status('지원하지 않는 저장 배치입니다. 원래 기록을 보존하고 기본 배치를 보여드려요.');return}draft=JSON.parse(JSON.stringify(draft));editing=true;syncActivity();history.pushState({...history.state,restaurantEditing:true},'',location.href);selected=null;cacheKey='';paint();status('옮길 가구를 누른 뒤 빈 바닥 칸을 선택하세요.')};
function backWithinGame(){historyBusy=true;document.querySelectorAll('#roomDock button').forEach(b=>b.disabled=true);history.back()}
function leaveEditHistory(){if(!restoring&&history.state?.restaurantEditing)backWithinGame()}
function cancelEdit(){leaveEditHistory();editing=false;syncActivity();selected=null;draft=null;cacheKey='';paint();status('배치 변경을 취소했어요.')}
$('roomEditCancel').onclick=cancelEdit;
$('roomEditSave').onclick=()=>{const state=bridge.snapshot();if(!valid(draft,items(state))){status('가구 배치를 다시 확인해 주세요.');return}const previous=state.roomLayout||{},layout={...previous,version:1,positions:{...(previous.positions||{}),...draft}};if(!bridge.saveLayout(layout))return;leaveEditHistory();editing=false;syncActivity();selected=null;draft=null;cacheKey='';paint();status('가구 배치를 저장했어요.')};
// Each modal gets one history entry. Back closes the modal before leaving the game.
const stack=[];let restoring=false,historyBusy=false;
function openDialog(dialog){if(dialog.open)return;dialog.setAttribute('aria-label',dialog.getAttribute('aria-label')||dialog.querySelector('h2')?.textContent||'레스토랑');dialog.showModal();syncActivity();stack.push(dialog.id);history.pushState({...history.state,restaurantDialog:dialog.id},'',location.href)}
window.restaurantRoomUI=Object.freeze({open:openDialog,canServe});
for(const dialog of document.querySelectorAll('dialog')){
 dialog.querySelectorAll('[data-dialog-close]').forEach(button=>button.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>{syncActivity();const index=stack.indexOf(dialog.id);if(index>=0)stack.splice(index,1);if(!restoring&&history.state?.restaurantDialog===dialog.id)backWithinGame()});
}
window.addEventListener('popstate',e=>{restoring=true;const target=e.state?.restaurantDialog;while(stack.length&&stack.at(-1)!==target){const id=stack.pop();$(id).close()}if(editing&&!target&&!e.state?.restaurantEditing)cancelEdit();restoring=false;historyBusy=false;document.querySelectorAll('#roomDock button').forEach(b=>b.disabled=false)});
$('openKitchen').onclick=()=>openDialog($('kitchenDialog'));$('openExpansion').onclick=()=>openDialog($('expansionDialog'));
function syncActivity(){advanceVisualClock();const paused=editing||document.hidden||!!document.querySelector('dialog[open]');motionPaused=paused;document.body.classList.toggle('restaurant-paused',paused);bridge.setSuspended?.(paused);syncFrames()}
window.addEventListener('pagehide',()=>{motionPaused=true;syncFrames()});window.addEventListener('pageshow',syncActivity);document.addEventListener('visibilitychange',syncActivity);window.addEventListener('restaurant-painted',paint);paint();
})();
