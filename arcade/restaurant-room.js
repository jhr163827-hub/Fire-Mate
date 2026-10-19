/* Independent vector artwork and room controls. No original Pucca game assets. */
(()=>{'use strict';
const $=id=>document.getElementById(id),bridge=window.restaurantRoomBridge,svg=$('restaurantRoom');
if(!bridge||!svg)return;
const SIZE=8,blocked=new Set(['6,0']);
let editing=false,selected=null,draft=null,cacheKey='',unsupported=false;
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
function box(top='#dce4e2',front='#92a3a1',side='#6d7e7c',height=30){return polygon([[0,-height-14],[29,-height],[0,-height+14],[-29,-height]],top)+polygon([[-29,-height],[0,-height+14],[0,14],[-29,0]],front)+polygon([[0,-height+14],[29,-height],[29,0],[0,14]],side)}
function artwork(type){
 if(type==='stove')return '<ellipse class="stove-glow" cy="-7" rx="35" ry="19" fill="transparent"/>'+box()+'<ellipse cx="0" cy="-30" rx="17" ry="9" fill="#4d4943"/><path d="M-15-31 Q-13-15 0-15 Q13-15 15-31" fill="#a9613f" stroke="#493a31" stroke-width="2"/><ellipse cy="-31" rx="13" ry="6" fill="#e7af60"/><circle cx="-17" cy="-9" r="3" fill="#e6cb80"/><path d="M-20 2h12m18-1h12" stroke="#465b5b" stroke-width="3"/><g class="room-steam" fill="none" stroke="#fff5df" stroke-width="3" stroke-linecap="round"><path d="M-6-44q-7-7 0-14m10 11q7-7 0-13"/></g>';
 if(type==='counter')return box('#ffedc6','#c69058','#a06b42',37)+'<ellipse cy="-36" rx="18" ry="9" fill="#fffaf0" stroke="#c3b598"/><path d="M-22-20v17m9-10v17m20-10v17m9-27v17" stroke="#b9834c" stroke-width="2"/>';
 if(type==='table')return '<path d="M-18-12v25m36-25v25M0-3v24" stroke="#805736" stroke-width="6"/>'+polygon([[0,-35],[31,-20],[0,-5],[-31,-20]],'#d99c56','stroke="#805736" stroke-width="3"')+polygon([[0,-30],[23,-20],[0,-9],[-23,-20]],'#f5cc83')+'<ellipse cy="-20" rx="11" ry="5" fill="#ffefce" stroke="#d8b170"/>';
 if(type==='chair')return '<path d="M-14-19v32m25-23v24M-14-40v20M11-28v17" stroke="#865d3d" stroke-width="5"/>'+polygon([[-16,-43],[13,-29],[13,-16],[-16,-30]],'#d7a063','stroke="#865d3d" stroke-width="2"')+polygon([[-14,-18],[2,-26],[19,-18],[2,-9]],'#f5d294','stroke="#865d3d" stroke-width="2"');
 return '<ellipse cy="4" rx="16" ry="8" fill="#d18c63"/><path d="M-15-13h30l-4 20h-22z" fill="#bb7654"/><ellipse cy="-13" rx="16" ry="7" fill="#e6aa7e"/><g fill="#6d9e63" stroke="#3f7152" stroke-width="2"><ellipse cx="-8" cy="-28" rx="10" ry="17" transform="rotate(-30 -8 -28)"/><ellipse cx="8" cy="-31" rx="10" ry="20" transform="rotate(25 8 -31)"/><ellipse cy="-40" rx="9" ry="20"/></g>';
}
function person(x,y,color,chef=false){const [px,py]=point(x,y);return '<g class="room-art" transform="translate('+px+' '+(py-6)+')"><ellipse cy="12" rx="14" ry="6" fill="#5c4a3333"/><g class="room-person-bob"><path d="M-5 3v8m10-8v8" stroke="#302a29" stroke-width="7" stroke-linecap="round"/><path d="M-12-18Q0-24 12-18L10 4H-10z" fill="'+color+'"/>'+(chef?'<circle cx="-16" cy="-47" r="9" fill="#252022"/><circle cx="17" cy="-47" r="9" fill="#252022"/>':'')+'<circle cy="-33" r="17" fill="#f4c89c"/><path d="M-17-34q-2-24 21-18 17 4 11 23l-5-11-22 3z" fill="'+(chef?'#252022':'#70533d')+'"/><path d="M-8-32h3m10 0h3" stroke="#4b3b34" stroke-width="2.5" stroke-linecap="round"/><path d="M-3-25q3 3 6-1" fill="none" stroke="#a46f57" stroke-width="1.5"/>'+(chef?'<path d="M0-16v18" stroke="#f0bd82" stroke-width="2"/>':'')+'</g></g>'}
function roomMarkup(state,list,positions){
 let floor='';for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const p=point(x,y);floor+=polygon([p,point(x+1,y),point(x+1,y+1),point(x,y+1)],(x+y)%2?'#ead9bb':'#f3e4cc','class="room-cell" data-room-cell="'+x+','+y+'"')}
 const corner=point(0,0),right=point(SIZE,0),left=point(0,SIZE),bottom=point(SIZE,SIZE);
 const walls=polygon([[corner[0],corner[1]-78],[right[0],right[1]-78],right,corner],'#e5c99d')+polygon([[left[0],left[1]-78],[corner[0],corner[1]-78],corner,left],'#f2ddba')+polygon([left,bottom,[bottom[0],bottom[1]+13],[left[0],left[1]+13]],'#9e7555')+polygon([bottom,right,[right[0],right[1]+13],[bottom[0],bottom[1]+13]],'#795b44');
 const door='<path d="M480 102l43 21v75l-43-21z" fill="#86634d" stroke="#6f503d" stroke-width="4"/><path d="M486 112l30 15v26l-30-15z" fill="#b5d2ce"/><circle cx="511" cy="169" r="2.5" fill="#eacb78"/>';
 const windowArt='<path d="M100 115l54-27v43l-54 27z" fill="#b7d9d8" stroke="#a17b57" stroke-width="5"/><path d="M127 101v43m-27-8 54-27" stroke="#ffefce" stroke-width="3"/>';
 let entities=list.map(a=>({...a,...positions[a.id]}));entities.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
 const furniture=entities.map(a=>{const p=point(a.x+.5,a.y+.5),active=selected===a.id;return '<g data-room-item="'+a.id+'" data-kind="'+a.type+'"'+(a.type==='stove'?' data-room-stove="'+a.slot+'"':'')+' class="room-item'+(active?' selected':'')+'" role="button" tabindex="'+(editing||a.type==='stove'?0:-1)+'" aria-label="'+(a.type==='stove'?(a.slot+1)+'번 조리대':labels[a.type])+'" aria-pressed="'+active+'" transform="translate('+p[0]+' '+p[1]+')">'+polygon([[0,-19],[35,-2],[0,16],[-35,-2]],'#ffdc76','class="selection" stroke="#ab7135" stroke-width="3"')+'<g class="room-art">'+artwork(a.type)+(a.type==='counter'&&state.service?.version===1&&state.service.stock?.[Number(a.id.split('-')[1])]?'<ellipse cy="-39" rx="15" ry="7" fill="#f6fbf3"/><ellipse cy="-42" rx="12" ry="6" fill="#d99737"/><path d="M-6-43q7-5 11 0m-12 3 9 1" stroke="#76a24e" stroke-width="2" fill="none"/>':'')+'</g><polygon class="room-action" points="0,-41 34,-24 0,-7 -34,-24"/>'+(a.type==='stove'?'<g><rect class="room-stove-badge-bg" x="-28" y="-69" width="56" height="22" rx="9"/><text class="room-stove-badge" y="-53">'+(a.slot+1)+'</text></g>':'')+'</g>'}).join('');
 return '<defs><filter id="roomShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity=".12"/></filter></defs><ellipse cx="300" cy="349" rx="244" ry="48" fill="#1b352630"/><g filter="url(#roomShadow)">'+walls+floor+'</g><g class="room-art">'+door+windowArt+'</g>'+furniture+(editing?'':person(2,2.3,'#d34839',true)+'<g id="roomServiceActors"></g>');
}
function status(message){$('status').textContent=message}
function paint(){const state=bridge.snapshot(),list=items(state),stored=savedPositions(state,list),positions=editing?draft:stored,key=JSON.stringify([positions,state.stoves.length,editing,selected,state.service?.version===1?state.service.stock:null]);
 if(key!==cacheKey){svg.innerHTML=roomMarkup(state,list,positions);cacheKey=key}
 $('restaurantWorld').classList.toggle('editing',editing);$('roomModeLabel').textContent=editing?'가구 배치 중':'나의 작은 식당';$('roomDock').hidden=editing;$('roomEditBar').hidden=!editing;$('roomEditHelp').hidden=!editing;
 svg.querySelectorAll('[data-room-stove]').forEach(el=>{const i=+el.dataset.roomStove,job=state.stoves[i],remaining=job?Number(job.ends)-Date.now():null,known=!job||Number.isInteger(job.recipe)&&job.recipe>=0&&job.recipe<5;const label=!known||job&&!Number.isFinite(remaining)?'확인':job?remaining<=0?'완성':Math.ceil(remaining/60000)+'분':(i+1)+'번';el.classList.toggle('ready',!!job&&known&&remaining<=0);el.classList.toggle('cooking',!!job&&known&&remaining>0);el.querySelector('.room-stove-badge').textContent=label;el.setAttribute('aria-label',(i+1)+'번 조리대 · '+(!known?'확인 필요':!job?'요리 선택':remaining<=0?'완성 · 서빙대로 옮기기':'조리 중'))});
 if(!editing)paintService(state,list,positions);
}
function route(from,to,list,positions){
 const start=[Math.floor(from[0]),Math.floor(from[1])],end=[Math.floor(to[0]),Math.floor(to[1])],key=p=>p.join(',');
 const occupied=new Set(list.map(a=>key([positions[a.id].x,positions[a.id].y])));occupied.delete(key(start));occupied.delete(key(end));
 const queue=[start],parents=new Map([[key(start),null]]);let found=null;
 for(let n=0;n<queue.length;n++){const p=queue[n];if(key(p)===key(end)){found=p;break}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy],k=key(q);if(q[0]<0||q[1]<0||q[0]>=SIZE||q[1]>=SIZE||occupied.has(k)||parents.has(k))continue;parents.set(k,p);queue.push(q)}}
 if(!found)return null;const path=[];for(let p=found;p;p=parents.get(key(p)))path.push([p[0]+.5,p[1]+.5]);return path.reverse();
}
function along(path,t){if(!path?.length)return [6.5,.5];const p=Math.max(0,Math.min(path.length-1,t*(path.length-1))),i=Math.floor(p),a=path[i],b=path[Math.min(i+1,path.length-1)];return [a[0]+(b[0]-a[0])*(p-i),a[1]+(b[1]-a[1])*(p-i)]}
function servicePaths(list,positions,table,counter){const seat=positions['chair-'+(table===0?1:3)],c=positions['counter-'+counter];if(!seat||!c)return null;return {guest:route([6.5,.5],[seat.x+.5,seat.y+.5],list,positions),waiter:route([c.x+.5,c.y+.5],[seat.x+.5,seat.y+.5],list,positions)}}
function canServe(table,counter){const state=bridge.snapshot(),list=items(state),positions=savedPositions(state,list),paths=servicePaths(list,positions,table,counter);return !!(paths?.guest&&paths?.waiter)}
function paintService(state,list,positions){const layer=$('roomServiceActors');if(!layer)return;if(bridge.serviceAvailable&&!bridge.serviceAvailable()){layer.replaceChildren();return;}const guests=state.service?.version===1?state.service.guests:[],motion=bridge.serviceMotion?.()||{progress:[0,0]};
 const wanted=new Set();
 const actor=(id,xy,color,waiter=false)=>{wanted.add(id);let el=layer.querySelector('[data-actor="'+id+'"]');if(!el){el=document.createElementNS('http://www.w3.org/2000/svg','g');el.dataset.actor=id;el.classList.add('room-actor');el.innerHTML=person(0,0,color,false).replace('transform="translate(300 86)"','')+(waiter?'<ellipse cy="-18" rx="13" ry="5" fill="#fff8e6"/><ellipse cy="-20" rx="9" ry="4" fill="#d99737"/>':'');layer.append(el)}const p=point(...xy);el.setAttribute('transform','translate('+p[0]+' '+(p[1]-6)+')')};
 guests?.forEach((g,i)=>{if(!g)return;const paths=servicePaths(list,positions,i,g.counter);if(!paths?.guest||!paths?.waiter)return;const t=motion.progress[i],path=paths.guest,seat=path.at(-1);actor('guest-'+i,g.phase==='entering'?along(path,t):g.phase==='leaving'?along([...path].reverse(),t):seat,i?'#9a78b7':'#db9c61');if(g.phase==='serving')actor('waiter-'+i,along(paths.waiter,t),'#547e83',true)});
 for(const el of layer.querySelectorAll('[data-actor]'))if(!wanted.has(el.dataset.actor))el.remove();
}
function activate(el){if(historyBusy)return;const id=el.dataset.roomItem,state=bridge.snapshot(),list=items(state);if(editing){selected=id;cacheKey='';paint();status(labels[list.find(a=>a.id===id).type]+' 선택 · 빈 바닥 칸을 눌러 놓으세요.');return}if(el.dataset.roomStove!==undefined){const slot=+el.dataset.roomStove,job=state.stoves[slot];if(job&&(!Number.isInteger(job.recipe)||job.recipe<0||job.recipe>=5)){status('알 수 없는 요리 기록을 유지하고 있어요. 기록을 확인한 뒤 처리해 주세요.');return}bridge.useStove(slot)}else if(el.dataset.kind==='counter'){const batch=state.service?.version===1?state.service.stock[Number(id.split('-')[1])]:null;status(batch?'음식 한 배치가 준비됐어요. 직원이 자동으로 서빙해요.':'빈 서빙대예요. 완성된 조리대를 눌러 음식을 옮기세요.')}else status('가구를 옮기려면 아래 가구 옮기기를 누르세요.')}
svg.addEventListener('click',e=>{const item=e.target.closest('[data-room-item]');if(item){activate(item);return}const cell=e.target.closest('[data-room-cell]');if(!editing||!selected||!cell)return;const [x,y]=cell.dataset.roomCell.split(',').map(Number),next={...draft,[selected]:{x,y}};if(!valid(next,items(bridge.snapshot()))){status('다른 가구나 출입구가 있는 칸에는 놓을 수 없어요.');return}draft=next;cacheKey='';paint();status('위치를 옮겼어요. 배치 적용을 누르면 저장돼요.')});
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
function syncActivity(){const paused=editing||document.hidden||!!document.querySelector('dialog[open]');document.body.classList.toggle('restaurant-paused',paused);bridge.setSuspended?.(paused)}
document.addEventListener('visibilitychange',syncActivity);window.addEventListener('restaurant-painted',paint);paint();
})();
