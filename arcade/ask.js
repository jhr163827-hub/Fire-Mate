/* In-page question box for the arcade games. The browser's own confirm()/prompt() shows the site address
   (the GitHub account name) as its title, so games ask here instead. arcadeAsk → true/false, arcadeInput → text or null. */
(()=>{
 'use strict';
 const css='.arcade-ask{border:0;border-radius:18px;padding:20px;width:min(86vw,340px);background:#fffaf0;color:#3b2e22;box-shadow:0 18px 60px #0007;font:15px/1.5 system-ui,-apple-system,sans-serif}.arcade-ask::backdrop{background:#0008}.arcade-ask p{margin:0 0 14px;white-space:pre-line;font-weight:600}.arcade-ask input{width:100%;box-sizing:border-box;margin:0 0 14px;padding:10px 12px;border:1px solid #d8c9a8;border-radius:12px;font:inherit;background:#fff}.arcade-ask div{display:flex;gap:8px}.arcade-ask button{flex:1;min-height:44px;border-radius:12px;border:1px solid #d8c9a8;background:#fff;color:#3b2e22;font:inherit;font-weight:700}.arcade-ask button[value=ok]{background:#3182f6;border-color:#3182f6;color:#fff}';
 function ask(text,{ok='확인',cancel='취소',input=null}={}){
  if(!document.getElementById('arcadeAskStyle')){const st=document.createElement('style');st.id='arcadeAskStyle';st.textContent=css;document.head.append(st)}
  return new Promise(resolve=>{
   const d=document.createElement('dialog');d.className='arcade-ask';d.setAttribute('aria-label',text);
   d.innerHTML='<form method="dialog"><p></p>'+(input===null?'':'<input id="arcadeAskInput" inputmode="numeric">')+'<div><button value="cancel" id="arcadeAskCancel"></button><button value="ok" id="arcadeAskOk"></button></div></form>';
   d.querySelector('p').textContent=text;d.querySelector('#arcadeAskOk').textContent=ok;d.querySelector('#arcadeAskCancel').textContent=cancel;
   const field=d.querySelector('input');if(field)field.value=input;
   d.addEventListener('close',()=>{const yes=d.returnValue==='ok';d.remove();resolve(field?(yes?field.value:null):yes)});
   document.body.append(d);d.showModal();(field||d.querySelector('#arcadeAskOk')).focus();
  });
 }
 window.arcadeAsk=(text,o)=>ask(text,o);
 window.arcadeInput=(text,value='',o={})=>ask(text,{...o,input:String(value)});
})();
