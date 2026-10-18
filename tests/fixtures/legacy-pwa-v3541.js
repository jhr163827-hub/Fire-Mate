
(()=>{
 if(!('serviceWorker' in navigator))return;
 const BUILD='fire-mate-v3-5-41',VERSION='3.5.41';
 let busy=false;
 const button=document.createElement('button');
 button.id='fmManualUpdate';button.className='iconbtn';button.type='button';
 button.style.cssText='font-size:12px;white-space:nowrap;padding:7px 9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.15';
 const reset=()=>{button.innerHTML='<span>↻ 업데이트</span><small>v'+VERSION+'</small>'};
 reset();document.querySelector('header.top .right')?.prepend(button);
 const modal=(title,message,choices)=>new Promise(resolve=>{
  const shade=document.createElement('div');shade.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(4,10,24,.78);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px';
  const card=document.createElement('div');card.style.cssText='width:min(100%,360px);padding:26px 22px;border-radius:24px;background:linear-gradient(145deg,#233450,#111827);color:#f8fafc;box-shadow:0 20px 70px #0009;text-align:center;font-family:inherit;border:1px solid #64748b66';
  const star=document.createElement('div');star.textContent='✦';star.style.cssText='margin:auto;width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:grid;place-items:center;font-size:30px';
  const head=document.createElement('h3');head.textContent=title;head.style.cssText='font-size:20px;margin:18px 0 10px';
  const desc=document.createElement('p');desc.textContent=message;desc.style.cssText='font-size:14px;color:#cbd5e1;line-height:1.6;margin:0 0 22px';
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px';
  choices.forEach((choice,i)=>{const btn=document.createElement('button');btn.type='button';btn.textContent=choice;btn.style.cssText='flex:1;padding:13px 8px;border-radius:12px;border:0;font-weight:800;background:'+(i===choices.length-1?'#60a5fa':'#334155')+';color:'+(i===choices.length-1?'#0f172a':'white');btn.onclick=()=>{shade.remove();resolve(i)};actions.append(btn)});
  card.append(star,head,desc,actions);shade.append(card);document.body.append(shade);
 });
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;button.textContent='확인 중…';
  try{
   const response=await fetch('https://raw.githubusercontent.com/jhr163827-hub/Fire-Mate/main/index.html?check='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('서버 연결에 실패했어');
   const html=await response.text();
   const match=html.match(/const BUILD='(fire-mate-v[0-9-]+)'/);
   if(!match)throw Error('버전 확인에 실패했어');
   if(!html.includes('id="view-home"')||!html.includes('id="view-assets"')||!html.includes('id="view-fire"')||!html.includes('id="settingsOverlay"')||!html.includes('function renderFire()')||html.length<100000)throw Error('새 버전 파일 검증에 실패했어. 업데이트를 중단했어');const versionParts=v=>v.replace('fire-mate-v','').split('-').map(Number);const compareVersions=(a,b)=>{const aa=versionParts(a),bb=versionParts(b);for(let i=0;i<Math.max(aa.length,bb.length);i++){if((aa[i]||0)!==(bb[i]||0))return (aa[i]||0)-(bb[i]||0)}return 0};if(compareVersions(match[1],BUILD)<0){await modal('서버 반영 대기 중','서버에서 이전 버전이 확인됐어. 현재 버전은 유지하고 잠시 후 다시 확인해 줘.',['확인']);return}if(match[1]===BUILD){await modal('최신 버전이에요','현재 v'+VERSION+'을 사용 중이야.',['확인']);return}
   const next=match[1].replace('fire-mate-v','').replaceAll('-','.');
   if(await modal('새 업데이트가 준비됐어요','v'+VERSION+' → v'+next+'\n지금 업데이트할까요?',['나중에','지금 업데이트'])!==1)return;
   button.textContent='업데이트 중…';
   if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg){await reg.update();let waiting=reg.waiting;if(!waiting&&reg.installing){await new Promise(resolve=>{const worker=reg.installing;const done=()=>{if(worker.state==='installed'||worker.state==='activated'||worker.state==='redundant')resolve()};worker.addEventListener('statechange',done);done();setTimeout(resolve,5000)});waiting=reg.waiting;}if(waiting){const changed=new Promise(resolve=>{navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});setTimeout(resolve,5000)});waiting.postMessage({type:'SKIP_WAITING'});await changed;}}}location.replace('./index.html?updated='+Date.now());
  }catch(e){await modal('업데이트 확인 실패',e.message+' 기존 데이터는 그대로 유지돼.',['확인'])}
  finally{busy=false;button.disabled=false;reset()}
 };
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(console.warn));
})();
