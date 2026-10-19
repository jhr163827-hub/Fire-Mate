/* Game-only display controls. No saves, finance state, or page-wide orientation preference. */
(()=>{'use strict';const button=document.getElementById('restaurantFullscreen'),hint=document.getElementById('orientationHint');if(!button)return;
 const normalHint='휴대폰을 가로로 돌리면 식당이 넓게 보여요.';
 function sync(){const full=!!document.fullscreenElement;button.textContent=full?'⛶ 화면 축소':'⛶ 전체화면';button.setAttribute('aria-label',full?'게임 전체화면 종료':'게임 전체화면');button.setAttribute('aria-pressed',String(full));}
 async function enter(){if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}return;}
  if(!document.documentElement.requestFullscreen){if(hint)hint.textContent='이 브라우저에서는 휴대폰을 직접 가로로 돌려 주세요.';return;}
  try{await document.documentElement.requestFullscreen();try{await screen.orientation?.lock?.('landscape');}catch{if(hint)hint.textContent='전체화면을 열었어요. 휴대폰을 가로로 돌려 주세요.';}}catch{if(hint)hint.textContent='전체화면을 열지 못했어요. 휴대폰을 가로로 돌려서 플레이할 수 있어요.';}
  sync();
 }
 function release(){try{screen.orientation?.unlock?.();}catch{}}
 button.addEventListener('click',enter);document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){release();if(hint)hint.textContent=normalHint;}sync();});window.addEventListener('pagehide',release);sync();
})();
