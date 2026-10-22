// FIRE MATE 기능 모음. index.html의 메인 스크립트 다음에 순서대로 실행된다(순서 유지 필요).
// 새 기능은 블록을 덧붙이지 말고 해당 화면 블록을 고친다. 블록마다 오류가 나도 다른 기능은 계속 돈다.
//
//   1. fm-layout — 공통 · 화면 배치
//   2. fm-home-improvements-20261016 — 홈
//   3. fm-ledger-keyboard — 가계부 · 입력 키보드
//   4. fm-premium-finance-ui — 공통 · 카드 디자인
//   5. fm-home-onboarding — 홈 · 시작 안내
//   6. fm-strategy-conclusion — FIRE · 전략 비교
//   7. fm-practical-fixes — 공통 · 시세 버튼, 백업 알림
//   8. fm-home-record — 홈 · 기록 버튼
//   9. fm-settings-order — 설정 · 순서
//  10. fm-assets-balance-row — 자산 · 현금·기타·부채
//  11. fm-ledger-sync — 설정 · Gmail·파일 가져오기
//  12. fm-in-app-confirm — 공통 · 확인 창(fmAsk)
//  13. fm-daily-fixes-v3586 — 자산·설정 · 빈 계좌 접기, 소액 수입, 분류 정리
//  14. fm-plan-v3587 — 홈·자산 · 이번 달 속도, 순자산 추이, 당겨서 업데이트
//  15. fm-polish-v3588 — 공통 · 다듬기
//  16. fm-feedback-v3589 — 공통 · 알림(fmToast)
//  17. fm-health-calc-v3590 — 설정 · 건보료 계산기
//  18. fm-safety-v3592 — 설정 · 저장 보호, 분류
//  19. fm-search-report-v3593 — 가계부·홈 · 검색, 월간 리포트
//  20. fm-habits-v3594 — 홈 · 습관(오늘, 주간, 무지출)
//  21. fm-design-v3596 — 공통 · 디자인
//  22. fm-start-v3597 — 홈 · 시작 화면, 예시 데이터


// ===== fm-layout — 공통 · 화면 배치 =====
try{
document.addEventListener('DOMContentLoaded',()=>{
 try{
 // 홈 화면 배치는 index.html 마크업에 바로 들어 있다(FIRE 카드, 바로가기, 숨김 보관함, 소비 분석으로 옮긴 카드).
 const fireView=document.getElementById('view-fire');
 if(fireView){
  const hero=fireView.querySelector('.fm-fire-hero'),calc=fireView.querySelector('.fm-fire-calc-card'),life=fireView.querySelector('.fm-fire-life-card'),portfolio=fireView.querySelector('.fm-fire-portfolio-card'),chart=fireView.querySelector('.fm-fire-chart-card'),strategy=fireView.querySelector('.fm-fire-strategy-card');
  const retire=document.getElementById('view-retire');
  calc.className='fm-fire-calc-card';calc.replaceChildren(document.getElementById('fmOpenCalculator'));calc.firstElementChild.textContent='조건 바꿔보기';hero.append(calc);
  hero.querySelector('.fm-fire-eyebrow').firstChild.textContent='내 FIRE 계획 ';
  const summary=document.createElement('section');summary.className='card fm-fire-overview';summary.setAttribute('aria-label','은퇴 준비 요약');
  summary.innerHTML='<h3>은퇴 생활비 점검</h3><p class="mini fm-fire-scope">현재 수입이 아닌 목표 배분 완성 시 가정</p><p class="mini" id="fmFirePlanDifference" hidden></p>';
  for(const [id,label,key,cls] of [['fmFireLifeOpen','생활비 차액','cashflow','fm-fire-life-card'],['fmFireStrategyOpen','임시 전략 비교','strategy','fm-fire-strategy-card'],['fmFirePortfolioOpen','목표 자산 구성','portfolio','fm-fire-portfolio-card']]){
   const button=document.getElementById(id);button.className='fm-fire-overview-row '+cls;button.innerHTML='<span><strong>'+label+'</strong><span id="fmOverview-'+key+'" class="fm-fire-overview-value"></span></span><span aria-hidden="true">›</span>';if(key==='cashflow')summary.append(button);else {button.hidden=true;retire.append(button);}
  }
  hero.after(summary);
  life.id='fmRetireCashflow';portfolio.id='fmRetirePortfolio';life.className='card fm-retire-cashflow';portfolio.className='card fm-retire-portfolio';
  life.querySelector('.fm-fire-section-head').innerHTML='<h3>은퇴 후 생활비</h3>';
  portfolio.querySelector('.fm-fire-section-head').innerHTML='<h3>보유자산과 목표 배분</h3>';
  const retireGrid=retire.querySelector(':scope>.grid');retireGrid.before(portfolio,life);strategy.remove();
  const fold=document.createElement('details');fold.className='card fm-fire-chart-card';fold.id='fmForecastDisclosure';
  fold.innerHTML='<summary><span>미래 자산 예상<small id="fmForecastSummaryDate"></small></span><strong id="fmForecastSummaryValue">—</strong></summary>';
  fold.append(document.getElementById('fmFireForecast'));summary.after(fold);chart.remove();
  const sync=()=>{
   const state=window.fmFireViewState||{};
   const metric=(id,x)=>{const h=document.getElementById(id),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=x?.value||'—';small.textContent=x?.note||'';h.replaceChildren(strong,small)};
   metric('fmOverview-cashflow',state.cashflow?{value:state.cashflow.statusValue,note:state.cashflow.statusNote}:null);
   const cashValue=document.querySelector('#fmOverview-cashflow>strong');if(cashValue)cashValue.style.color=state.cashflow?.monthlyRemaining<0?'var(--red)':'var(--green)';
   metric('fmOverview-portfolio',state.portfolio?{value:state.portfolio.value,note:'목표 구성과 실제 보유 비교 · 금액 목표와 별개'}:null);
   document.getElementById('fmOpenCalculator').textContent=state.draft?.dirty?'조건 비교 •':'조건 비교';document.getElementById('fmOpenCalculator').setAttribute('aria-label',state.draft?.dirty?'조건 비교 · 미저장 조건 이어보기':'조건 비교');
   const p=state.plan;if(p)document.getElementById('fmFireBasisNote').textContent='저장 계획 · 월 '+Number(p.monthly).toLocaleString('ko-KR')+'만 원 투자 · 연 '+p.rate+'% 가정'+(p.net<0?' · 음수 순자산은 남은 금액·도달 계산에서 0으로 가정':'');
   const difference=document.getElementById('fmFirePlanDifference'),different=p&&state.portfolio&&Math.abs(p.goal-state.portfolio.totalTarget)>0.01;
   difference.hidden=!different;if(different)difference.textContent='금액 목표와 배분 합계가 달라요. 생활비는 목표 배분 기준입니다.';
   document.getElementById('fmOverview-strategy').textContent=state.mode==='detail'?(state.detail?.text||'종목별 장기 비교 · 조건 확인 후 계산'):'배당·자산 매도 비교 · 저장 계획에 미반영';
   document.getElementById('fmForecastSummaryValue').textContent=state.forecast?.summaryValue||'—';
   document.getElementById('fmForecastSummaryDate').textContent=state.forecast?.summaryDate||'';
  };
  document.addEventListener('fm-fire-view-updated',sync);
  sync();
 }
 const retirement=document.getElementById('view-retire');
 if(retirement){
  const portfolio=document.getElementById('fmRetirePortfolio'),life=document.getElementById('fmRetireCashflow'),grid=retirement.querySelector(':scope>.grid'),allocation=grid.firstElementChild,lab=grid.lastElementChild;
  const header=retirement.querySelector(':scope>.hero'),stats=header.querySelector('.hero-row'),total=document.getElementById('rpTotal'),calculator=document.getElementById('fmRetireToCalculator');
  const back=document.createElement('button');back.type='button';back.className='secondary';back.id='fmRetireBack';back.textContent='← FIRE';back.onclick=()=>document.querySelector('.bottomnav [data-view="fire"]').click();
  header.className='fm-retire-topbar';header.replaceChildren(back);const title=document.createElement('h2');title.textContent='은퇴 계획';header.append(title);
  total.hidden=true;total.setAttribute('aria-hidden','true');header.append(total);
  const body=document.getElementById('fmRpEditBody'),toggle=document.getElementById('fmRpEditToggle');
  body.append(allocation.querySelector('#rpSum').parentElement,calculator);calculator.textContent='FIRE 목표·투자 설정';
  document.getElementById('rpSum').previousElementSibling.textContent='저장된 배분 합계';
  const draftNote=document.createElement('p');draftNote.className='mini';draftNote.textContent='수정 중인 배분은 저장 후 결과에 반영됩니다.';body.prepend(draftNote);
  portfolio.append(toggle,body);allocation.remove();
  const scenario=document.createElement('details');scenario.id='fmLifeScenario';scenario.innerHTML='<summary>단일 분배율 생활·하락 실험<small>종목별 현금흐름과 별도 조건</small></summary>';
  const conditions=document.createElement('details');conditions.id='fmLifeConditions';conditions.innerHTML='<summary>생활비·실험 조건 변경</summary>';
  const form=lab.querySelector(':scope>.stack');conditions.append(form);
  const save=form.querySelector('#rpSave');save.textContent='목표 배분만 저장';
  const savebar=document.createElement('div');savebar.id='fmRetireSaveBar';savebar.hidden=true;
  const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.id='fmRetireCancel';cancel.textContent='취소';savebar.append(cancel,save);
  const note=document.createElement('p');note.className='mini';note.textContent='수정 중인 값은 저장 후 반영됩니다. 월 생활비는 생활비 화면과 전략·위험의 하락 실험에 함께 적용됩니다. 분배율·세금 부담률·하락 조건은 단일 분배율 실험 전용이며 전략 비교는 별개입니다.';form.append(note);
  const modelNote=document.createElement('p');modelNote.className='mini';modelNote.textContent='위 비교 기준을 확인한 뒤 결과를 읽어 주세요. 생활비 화면의 종목별 분배금을 그대로 낮추는 실험은 아닙니다.';
  scenario.append(modelNote,stats);life.append(conditions);
  // Keep every existing stress result, report and assumption available under this experiment.
  for(const node of [...lab.children])if(node.tagName!=='H3'&&!node.classList.contains('line'))scenario.append(node);
  life.append(scenario);lab.remove();grid.remove();retirement.append(savebar);
  const setScope=scope=>{save.dataset.scope=scope;save.textContent=scope==='portfolio'?'목표 배분만 저장':'월 생활비 저장';cancel.setAttribute('aria-label',scope==='portfolio'?'목표 배분 변경 취소':'생활 조건 변경 취소')};
  const updateSave=()=>{const scope=save.dataset.scope;if(document.getElementById('view-firelife')?.classList.contains('active')){setScope('life');savebar.hidden=!conditions.open;return}if(document.getElementById('view-retire')?.classList.contains('active')){setScope('portfolio');savebar.hidden=body.hidden;return}if(scope==='portfolio'&&body.hidden&&conditions.open)setScope('life');else if(scope==='life'&&!conditions.open&&!body.hidden)setScope('portfolio');savebar.hidden=body.hidden&&!conditions.open};
  setScope('portfolio');
  document.addEventListener('fm-fire-save-scope',e=>{setScope(e.detail);updateSave()});
  new MutationObserver(updateSave).observe(body,{attributes:true,attributeFilter:['hidden']});
  toggle.addEventListener('click',()=>{if(!body.hidden)setScope('portfolio');updateSave()});
  conditions.addEventListener('toggle',()=>{if(conditions.open)setScope('life');updateSave()});
  body.addEventListener('focusin',()=>setScope('portfolio'));form.addEventListener('focusin',()=>setScope('life'));
  const closeEdit=scope=>{if(scope==='experiment')return;if(scope==='portfolio'){window.fmRpEditing=false;body.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='목표 배분 수정 ↓'}else conditions.open=false;updateSave()};
  cancel.onclick=()=>{const scope=save.dataset.scope;document.dispatchEvent(new CustomEvent('fm-retirement-cancel',{detail:{scope}}));closeEdit(scope)};
  document.addEventListener('fm-retirement-saved',e=>{const scope=e.detail?.scope||'portfolio';closeEdit(scope);(scope==='portfolio'?portfolio:scope==='experiment'?scenario:life).scrollIntoView({block:'start',behavior:'instant'})});
  const tidyPortfolio=()=>{const p=document.getElementById('fmFirePortfolioProgress'),d=p.querySelector('#fmFirePortfolioDetails');if(!d)return;const classes=p.querySelector(':scope>.fm-fire-target-classes');if(classes)d.append(classes);p.querySelectorAll(':scope>p').forEach(n=>d.append(n))};
  const tidyLife=()=>{const l=document.getElementById('fmFireLife'),editor=l.querySelector('#fmDividendEditor'),button=l.querySelector('#fmSaveDividendRates');if(editor&&button&&button.parentElement!==editor)editor.insertBefore(button,editor.querySelector('#fmCancelDividendRates'))};
  new MutationObserver(tidyPortfolio).observe(document.getElementById('fmFirePortfolioProgress'),{childList:true});new MutationObserver(tidyLife).observe(document.getElementById('fmFireLife'),{childList:true});tidyPortfolio();tidyLife();
  const strategy=document.getElementById('fmStrategyCard'),settings=document.getElementById('fmStrategyDetails'),quick=document.getElementById('fmQuickResult'),detail=document.getElementById('fmStrResult');
  strategy.querySelector('h3').textContent='FIRE 전략 비교';strategy.querySelector(':scope>p').textContent='배당으로 생활비 받기와 자산을 일부 팔아 생활비 쓰기(자가배당)를 비교해요. 임시 비교이며 저장 계획과 실제 자산에는 반영되지 않습니다.';
  settings.querySelector(':scope>summary').textContent='비교 조건 변경';
  const comparisonNote=document.createElement('p');comparisonNote.className='mini';comparisonNote.textContent='비교용 조건 · 은퇴 계획에 저장되지 않으며 새로고침하면 초기화됩니다. 간편 비교는 1년, 종목별 비교는 선택한 기간의 별도 모델입니다.';settings.querySelector(':scope>summary').after(comparisonNote);
  strategy.append(quick,detail);detail.hidden=true;
  const tidyQuick=()=>{if(quick.querySelector('.fm-quick-assumptions'))return;const ps=[...quick.querySelectorAll(':scope>p')];if(!ps.length)return;const d=document.createElement('details');d.className='fm-quick-assumptions';d.innerHTML='<summary>비교 가정·세금 기준</summary>';ps.forEach(n=>d.append(n));quick.append(d)};
  const tidyDetail=()=>{const model=detail.querySelector('.fm-str-model-summary');if(!model)return;
   if(!detail.querySelector('.fm-str-annual-details')){const fold=document.createElement('details');fold.className='fm-str-annual-details';fold.innerHTML='<summary>비교에 사용한 종목·연간 요약</summary>';while(detail.firstChild&&detail.firstChild!==model)fold.append(detail.firstChild);detail.insertBefore(fold,model)}
   const assumptions=model.querySelector(':scope>details');const longNote=[...model.querySelectorAll(':scope>p')].find(p=>p.textContent.startsWith('배당 잉여금'));if(assumptions&&longNote)assumptions.append(longNote);
   const end=model.nextElementSibling;if(end?.classList.contains('fm-str-final-balances')){const d=document.createElement('details');d.className='fm-str-end-details';d.innerHTML='<summary>최종 잔액·세금 영향 자세히</summary>';end.before(d);d.append(end)}
  };
  new MutationObserver(tidyQuick).observe(quick,{childList:true});new MutationObserver(tidyDetail).observe(detail,{childList:true});tidyQuick();tidyDetail();
  document.addEventListener('click',e=>{if(e.target?.id==='fmQuickRun'&&quick.querySelector('strong')||e.target?.id==='fmStrRun'&&detail.querySelector('.fm-str-model-summary')){settings.open=false;setTimeout(()=>(e.target.id==='fmQuickRun'?quick:detail).scrollIntoView({block:'start',behavior:'instant'}),0)}});
 }
 // FIRE internal screens share the existing main navigation and calculation owners.
 const lifeView=document.getElementById('view-firelife');
 const retirementView=document.getElementById('view-retire');retirementView.before(lifeView);
 lifeView.append(document.getElementById('fmRetireCashflow'));
 const scenario=document.getElementById('fmLifeScenario');retirementView.append(scenario);
 scenario.querySelector('summary').innerHTML='단일 분배율로 하락 실험<small>종목별 생활비 계산과 다른 가정</small>';
 const allocationDetails=document.createElement('details');allocationDetails.id='fmPortfolioDisclosure';allocationDetails.className='card';
 allocationDetails.innerHTML='<summary>목표 자산 구성</summary>';
 allocationDetails.append(document.getElementById('fmRetirePortfolio'));retirementView.append(allocationDetails);
 const strategyLink=document.getElementById('fmFireStrategyOpen'),portfolioLink=document.getElementById('fmFirePortfolioOpen');
 retirementView.append(strategyLink,portfolioLink); // Existing event targets remain available to integrations.
 const strategyStatus=document.getElementById('fmOverview-strategy'),portfolioStatus=document.getElementById('fmOverview-portfolio');
 strategyStatus.hidden=true;
 portfolioStatus.hidden=true;
 retirementView.append(strategyStatus,portfolioStatus);
 for(const [id,title] of [['fire','현황'],['firecalc','조건 비교'],['firelife','생활비'],['retire','전략·위험']]){
  const view=document.getElementById('view-'+id),nav=document.createElement('nav');nav.className='fm-fire-screen-nav';nav.setAttribute('aria-label','FIRE 화면');
  for(const [target,label] of [['fire','현황'],['firecalc','조건 비교'],['firelife','생활비'],['retire','전략·위험']]){
   const button=document.createElement('button');button.type='button';button.dataset.fireScreen=target;button.textContent=label;button.setAttribute('aria-current',id===target?'page':'false');
   button.onclick=()=>document.dispatchEvent(new CustomEvent('fm-fire-navigate',{detail:target}));nav.append(button);
  }
  view.prepend(nav);view.setAttribute('aria-label','FIRE '+title);
 }
 const strategyNav=document.querySelector('#view-fire [data-fire-screen="retire"]');strategyLink.hidden=false;strategyLink.className='';strategyLink.replaceChildren(...strategyNav.childNodes);strategyLink.dataset.fireScreen='retire';strategyLink.setAttribute('aria-current','false');strategyNav.replaceWith(strategyLink);
 portfolioLink.hidden=true;
 const calc=document.querySelector('#view-fire .fm-fire-calc-card'),calcNav=document.querySelector('#view-fire [data-fire-screen="firecalc"]'),calcButton=document.getElementById('fmOpenCalculator');calcButton.dataset.fireScreen='firecalc';calcButton.setAttribute('aria-current','false');calcButton.textContent='조건 비교';calcNav.replaceWith(calcButton);calc.hidden=true;
 const originalSync=window.fmSyncFireScreens;
 window.fmSyncFireScreens=view=>{
  originalSync?.(view);
  document.querySelectorAll('.fm-fire-screen-nav [data-fire-screen]').forEach(b=>b.setAttribute('aria-current',b.dataset.fireScreen===view?'page':'false'));
  const bar=document.getElementById('fmRetireSaveBar');if(view==='firelife'||view==='retire'){
   document.getElementById('view-'+view).append(bar);
   document.dispatchEvent(new CustomEvent('fm-fire-save-scope',{detail:view==='firelife'?'life':'portfolio'}));
  }
 };
 window.fmSyncFireScreens(document.querySelector('.view.active')?.id.replace('view-',''));
 const assets=document.getElementById('view-assets');
 if(assets){
  const hero=assets.querySelector(':scope > .hero');
  const jump=assets.querySelector('.fm-asset-jump');
  const accounts=document.getElementById('fmAssetAccountsPanel');
  const holdings=document.getElementById('fmAssetHoldingsPanel');
  const oldTabs=assets.querySelector('.fm-main-asset-tabs');
  const composition=assets.querySelector('.fm-asset-composition');
  const growth=document.getElementById('assetGrowthChart')?.closest('.card');
  const milestone=assets.querySelector('.fm-milestone-details');
  const history=document.getElementById('snapshotList')?.closest('.card');
  if(hero)hero.classList.add('fm-unified-hero');
  if(jump&&hero)hero.after(jump);
  if(oldTabs){oldTabs.id='fmLegacyAssetTabs';oldTabs.hidden=true;oldTabs.style.display='none';}
  const dividend=document.createElement('section');dividend.id='fmAssetDividendView';dividend.className='fm-asset-main-panel';dividend.hidden=true;
  const analysis=document.createElement('section');analysis.id='fmAssetAnalysisView';analysis.className='fm-asset-main-panel';analysis.hidden=true;
  if(jump){jump.after(dividend);jump.after(analysis);}
  if(accounts&&jump)jump.after(accounts);
  if(holdings&&accounts)accounts.after(holdings);
  if(composition){
   const divPanel=document.getElementById('fmDividendPanel');
   if(divPanel){
    dividend.append(divPanel);divPanel.hidden=false;
    const method=divPanel.querySelector('.fm-div-method');
    if(method){
     method.querySelector('summary').textContent='계산 기준 · 환율 · 조회 상태';
     for(const id of ['fmDivStatus','fmDivFxBasis']){const info=document.getElementById(id);if(info)method.append(info);}
    }
   }
   const subTabs=composition.querySelector('.fm-analysis-tabs');
   if(subTabs)subTabs.hidden=true;
   analysis.append(composition);
   const wrap=composition.querySelector('.fm-asset-donut-wrap');if(wrap)wrap.hidden=false;
   const more=document.getElementById('fmCompositionMore');if(more)more.style.display='';
  }
  if(milestone)analysis.append(milestone);
  if(growth)analysis.append(growth);
  if(history)analysis.append(history);
  for(const [id,mode] of [['fmAssetQuickAccounts','account'],['fmAssetQuickHoldings','holding'],['fmAssetQuickDividend','dividend'],['fmAssetQuickAnalysis','analysis']]){
   const btn=document.getElementById(id);
   if(btn)btn.onclick=()=>window.fmSelectAssetView(mode);
  }
  window.fmSelectAssetView(typeof fmAssetView==='string'?fmAssetView:'account');
 window.fmRefreshGoalNotes?.();
 }
 }catch(e){console.warn('Layout refinement:',e)}
});
}catch(e){console.error('fm-layout',e)}


// ===== fm-home-improvements-20261016 — 홈 =====
try{
(function(){
 function update(){try{
 const host=document.getElementById('fmHomeTrend'),mile=document.getElementById('fmNextMilestone');if(!host||!mile||typeof data==='undefined')return;
 const records=(Array.isArray(data.dailySnapshots)?data.dailySnapshots:[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.day)&&Number.isFinite(+x.amount)).sort((a,b)=>a.day.localeCompare(b.day));
 const unique=[...new Map(records.map(x=>[x.day,+x.amount])).entries()];const now=new Date(),cutoff=new Date(now);cutoff.setDate(now.getDate()-29);const day=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const series=unique.filter(x=>x[0]>=day(cutoff)&&x[0]<=day(now));
 if(series.length<2){host.innerHTML='<div style="font-size:12px;color:var(--sub)">📈 '+(series.length?'첫 자산 기록 완료 · 다음 날짜부터 성장 그래프 표시':'자산 기록이 쌓이면 성장 그래프 표시')+'</div>'}else{
 const values=series.map(x=>x[1]),min=Math.min(...values),max=Math.max(...values),span=max-min||1;const pts=values.map((v,i)=>(8+i*304/(values.length-1)).toFixed(1)+','+(53-(v-min)/span*42).toFixed(1)).join(' ');host.innerHTML='<div style="font-size:12px;color:var(--sub);margin-bottom:4px">최근 30일 자산 추이</div><svg viewBox="0 0 320 62" style="width:100%;height:55px;display:block" role="img" aria-label="최근 30일 순자산 기록 그래프"><polyline points="'+pts+'" fill="none" stroke="var(--green)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>';
 }

 const compare=document.getElementById('heroCompare');if(compare){const t=compare.textContent||'';compare.style.color=t.includes('더 사용')?'var(--red)':t.includes('차이')?'var(--green)':'var(--sub)';}
 }catch(e){console.warn('Home trend:',e)}}
 window.fmUpdateHomeTrend=update;
 document.addEventListener('DOMContentLoaded',()=>{update();const target=document.getElementById('homeTotalAssets');if(target)new MutationObserver(update).observe(target,{childList:true,subtree:true});const recordsTarget=document.getElementById('homeDailyChange');if(recordsTarget)new MutationObserver(update).observe(recordsTarget,{childList:true,subtree:true});document.querySelectorAll('[data-view="home"]').forEach(b=>b.addEventListener('click',update));});
})();
}catch(e){console.error('fm-home-improvements-20261016',e)}


// ===== fm-ledger-keyboard — 가계부 · 입력 키보드 =====
try{
/* visualViewport reflects the visible region when Android's keyboard is open: keep the
   budget and entry sheets inside it while they are shown. */
(()=>{const viewport=window.visualViewport;
 for(const id of ['fmLedgerBudgetOverlay','entryOverlay']){const overlay=document.getElementById(id);if(!overlay)continue;
  const sync=()=>{if(!overlay.classList.contains('show')){overlay.style.top='';overlay.style.height='';overlay.style.bottom='';return}if(viewport){overlay.style.top=viewport.offsetTop+'px';overlay.style.height=viewport.height+'px';overlay.style.bottom='auto'}};
  if(viewport){viewport.addEventListener('resize',sync);viewport.addEventListener('scroll',sync)}
  new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});overlay.addEventListener('focusin',sync);
 }
})();
}catch(e){console.error('fm-ledger-keyboard',e)}


// ===== fm-premium-finance-ui — 공통 · 카드 디자인 =====
try{
/* Decision-first presentation. Finance calculations and persistence remain in their existing owners. */
(() => {
 'use strict';
 document.addEventListener('DOMContentLoaded', () => {
  const $=id=>document.getElementById(id);
  const navigate=view=>document.dispatchEvent(new CustomEvent('fm-fire-navigate',{detail:view}));
  const compactMoney=n=>{const v=Math.round(n),e=Math.floor(v/10000),m=v%10000;return (e?e+'억 ':'')+(m?m.toLocaleString('ko-KR')+'만 ':'')+(e||m?'원':'0원')};
  // Amounts in 만원; 1억 and above read as 억 (6억 5,000만 원), never 65,000만 원.
  const money=n=>Math.round(n)===0?'0만 원':(Math.round(n)<0?'-':'')+compactMoney(Math.abs(n));
  const fire=$('view-fire'),overview=fire.querySelector('.fm-fire-overview');
  for(const nav of document.querySelectorAll('.fm-fire-screen-nav')){
   for(const button of nav.querySelectorAll('[data-fire-screen]')){
    const label={fire:'은퇴 현황',firecalc:'계획 조정',firelife:'생활비',retire:'전략·위험'}[button.dataset.fireScreen];
    button.textContent=label;
   }
  }
  const eta=document.createElement('p');eta.id='fmRetirementETA';eta.className='fm-decision-eta';
  $('fireYears').after(eta);
  overview.querySelector('h3').textContent='은퇴 준비 점검';
  const scope=overview.querySelector('.fm-fire-scope');scope.textContent='목표 배분 완성 시 예상 · 지금 월급과는 별개예요';
  const portfolioButton=$('fmFirePortfolioOpen'),portfolioValue=$('fmOverview-portfolio');
  portfolioButton.hidden=false;portfolioButton.className='fm-fire-overview-row fm-fire-portfolio-card';
  portfolioButton.firstElementChild.append(portfolioValue);portfolioValue.hidden=false;
  portfolioButton.querySelector('strong').textContent='목표 자산 구성';overview.append(portfolioButton);
  const risk=document.createElement('button');risk.type='button';risk.id='fmFireRiskOpen';risk.className='fm-fire-overview-row';
  risk.innerHTML='하락 실험 열기 <span aria-hidden="true">→</span>';risk.className='fm-decision-action';
  risk.onclick=()=>{navigate('retire');$('fmLifeScenario').open=true;requestAnimationFrame(()=>$('fmModelBridge').scrollIntoView({block:'start',behavior:'instant'}))};overview.append(risk);
  for(const [button,label,action] of [[$('fmFireLifeOpen'),'은퇴 후 매달 남거나 모자란 돈','조건 확인'],[portfolioButton,'목표 자산까지 남은 금액','배분 보기']]){
   const content=button.firstElementChild,row=document.createElement('section');row.className='fm-decision-row';
   content.querySelector(':scope>strong').textContent=label;
   button.before(row);row.append(content,button);button.className='fm-decision-action';button.replaceChildren(document.createTextNode(action+' →'));
  }
  const riskRow=document.createElement('div');riskRow.className='fm-decision-risk';risk.before(riskRow);
  riskRow.innerHTML='<span>하락 시 생활비 변화<small id="fmRiskHeadline">목표 배분 · 별도 가정</small></span>';riskRow.append(risk);
  $('fmOpenCalculator').textContent='계획 조정';
  const calc=$('view-firecalc');calc.querySelector('.hero>strong').textContent='은퇴 시점을 앞당기려면';
  calc.querySelector('.grid>.card>h3').textContent='목표와 월 투자금 비교';
  const purpose=document.createElement('p');purpose.className='mini fm-decision-purpose';purpose.textContent='월 투자금·목표를 바꿔 도달 시점의 차이를 확인하세요. 저장 전까지 기존 계획은 유지됩니다.';calc.querySelector('.grid>.card>h3').after(purpose);
  $('fmStrModeQuick').textContent='1년 비교';$('fmStrModeDetail').textContent='장기 비교';
  const strategy=$('fmStrategyCard'),settings=$('fmStrategyDetails');
  strategy.querySelector('h3').textContent='배당과 자산 매도, 어떻게 다를까요?';
  strategy.querySelector(':scope>p').textContent='같은 비교 자산과 생활비로 은퇴 방식을 점검해요. 저장된 FIRE 계획과 별개의 임시 비교입니다.';
  const modes=$('fmStrModeQuick').parentElement;modes.classList.add('fm-comparison-modes');strategy.insertBefore(modes,settings);
  const basis=document.createElement('div');basis.id='fmComparisonBasis';basis.className='fm-comparison-basis';basis.setAttribute('aria-live','polite');strategy.insertBefore(basis,settings);
  const riskBasis=document.createElement('p');riskBasis.id='fmStressBasis';riskBasis.className='mini fm-model-basis';$('fmLifeScenario').querySelector('summary').after(riskBasis);
  const riskEdit=document.createElement('button');riskEdit.type='button';riskEdit.className='secondary fm-stress-edit';riskEdit.textContent='실험 조건 수정';
  riskEdit.onclick=()=>{$('fmUniformExperimentInputs').open=true;requestAnimationFrame(()=>$('rpCrash').focus())};$('fmLifeScenario').append(riskEdit);
  // The common living expense stays directly editable; separate model parameters remain available.
  const conditions=$('fmLifeConditions'),form=conditions.querySelector(':scope>.stack');conditions.querySelector(':scope>summary').textContent='월 생활비 수정';
  const advanced=document.createElement('details');advanced.id='fmUniformExperimentInputs';advanced.innerHTML='<summary>단일 분배율 하락 실험 설정</summary><p class="mini">위 종목별 생활비 계산과 다른 모델입니다. 모든 목표 자산에 같은 분배율·세금 부담률을 적용합니다.</p>';
  for(const id of ['rpTaxRate','rpYield','rpAdvancedSettings'])advanced.append(id==='rpAdvancedSettings'?$(id):$(id).closest('.field'));
  $('fmLifeScenario').append(advanced);
  form.querySelector(':scope>.mini').textContent='월 생활비만 저장합니다. 분배율·세금·보험료와 실험 조건은 각각의 수정 메뉴에서 관리해요.';
  advanced.querySelector('summary').textContent='실험 조건 수정 · 분배율·세금·하락률';
  riskEdit.hidden=true;
  const experimentActions=document.createElement('div');experimentActions.className='fm-flow-actions';
  experimentActions.innerHTML='<button type="button" class="secondary" id="fmCancelExperiment">취소</button><button type="button" class="primary" id="fmSaveExperiment">실험 조건 저장</button>';
  advanced.append(experimentActions);
  $('fmSaveExperiment').onclick=()=>{const button=$('rpSave'),scope=button.dataset.scope;button.dataset.scope='experiment';button.onclick();button.dataset.scope=scope};
  $('fmCancelExperiment').onclick=()=>{document.dispatchEvent(new CustomEvent('fm-retirement-cancel',{detail:{scope:'experiment'}}));advanced.open=false};
  document.addEventListener('fm-retirement-saved',e=>{if(e.detail?.scope==='experiment'){advanced.open=false;requestAnimationFrame(()=>$('fmLifeScenario').scrollIntoView({block:'start',behavior:'instant'}))}});
  const bridge=document.createElement('section');bridge.id='fmModelBridge';bridge.className='card fm-model-bridge';
  bridge.innerHTML='<h3>비교 기준 확인</h3><p class="mini">생활비는 목표 배분의 종목별 분배율, 하락 실험은 단일 분배율을 사용합니다.</p><div id="fmModelValues"></div><details><summary>모델별 적용 범위</summary><div id="fmModelScope"></div></details>';
  $('fmLifeScenario').before(bridge);
  const draftStatus=document.createElement('p');draftStatus.id='fmLifeExpenseStatus';draftStatus.className='mini';draftStatus.setAttribute('role','status');form.prepend(draftStatus);
  const updateExpense=()=>{const value=$('rpMonthly').value.trim(),saved=window.fmFireViewState?.plan?.lifeMonthly,dirty=value===''||Number(value.replace(/,/g,''))!==saved;draftStatus.textContent=dirty?'월 생활비 수정 중 · 저장 전 결과는 유지됩니다':'저장된 월 생활비 · 목표 배분과 실험에 공통 적용';if($('view-firelife').classList.contains('active'))$('rpSave').disabled=!dirty};
  $('rpMonthly').addEventListener('input',updateExpense);conditions.addEventListener('toggle',updateExpense);
  const originalFireSync=window.fmSyncFireScreens;window.fmSyncFireScreens=view=>{originalFireSync?.(view);if(view==='firelife')updateExpense();else $('rpSave').disabled=false};
  // The income form remains a separate atomic save, with no overlapping expense fields.
  const income=$('fmFireLife');
  const updateIncome=()=>{const editor=$('fmDividendEditor');if(!editor)return;const cash=window.fmFireViewState?.cashflow;let limit=$('fmLifeInputLimits');if(!limit){limit=document.createElement('p');limit.id='fmLifeInputLimits';limit.className='mini';editor.before(limit)}limit.textContent=cash?.missingYieldNames?.length?'분배율 미입력 '+cash.missingYieldNames.length+'종목은 0%로 반영됩니다. 수입 가정에서 확인해 주세요.':'';limit.hidden=!limit.textContent;const fields=[...editor.querySelectorAll('input')],dirty=fields.some(x=>x.value.trim()===''||Number(x.value)!==Number(x.defaultValue));
   const button=$('fmSaveDividendRates');button.disabled=!dirty;button.textContent='수입 가정 저장';
   $('fmCancelDividendRates').textContent=dirty?'변경 취소':'닫기';
   editor.querySelector('summary').textContent='분배율·세금·보험료 수정';
   let notice=$('fmIncomeDraftStatus');if(!notice){notice=document.createElement('p');notice.id='fmIncomeDraftStatus';notice.className='mini';notice.setAttribute('role','status');editor.querySelector('summary').after(notice)}
   notice.textContent=dirty?'수입 가정 수정 중 · 저장 전 결과는 유지됩니다':'종목별 수입 가정만 저장합니다. 월 생활비는 아래에서 수정해요.';
  };
  income.addEventListener('input',updateIncome);income.addEventListener('click',()=>queueMicrotask(updateIncome));
  new MutationObserver(updateIncome).observe(income,{childList:true});updateIncome();

  const sync=()=>{
   const state=window.fmFireViewState||{},forecast=state.forecast;
   const months=forecast?.baselineMonthsToGoal;
   if(months===null)eta.textContent='저장된 조건으로 100년 내 목표 미도달';
   else if(Number.isInteger(months)){const now=new Date(),date=new Date(now.getFullYear(),now.getMonth()+months,1);eta.textContent=months===0?'금액 목표 달성 · 생활비와 위험은 별도 점검':date.getFullYear()+'년 '+(date.getMonth()+1)+'월 예상 · 저장 계획 기준';}
   if(state.portfolio){
    const p=state.portfolio;portfolioValue.querySelector('strong').textContent=p.totalTarget>0?(p.gap>0?compactMoney(p.gap)+' 부족':'목표 배분 충족'):'목표 배분 미설정';
    portfolioValue.querySelector('small').textContent='종목별 목표 대비 · 총자산 달성률과 별개';
   }
   const cash=state.cashflow,cashValue=$('fmOverview-cashflow');
   if(cash){
    const limits=[];if(!cash.insuranceEntered)limits.push('보험료 미입력 · 차감 전');if(cash.missingYieldNames?.length)limits.push('분배율 미입력 '+cash.missingYieldNames.length+'종목은 0% 반영');
    cashValue.querySelector('strong').textContent=cash.expenseEntered?cash.statusValue+' (가정)':'생활비 입력 필요';
    cashValue.querySelector('strong').style.color=cash.expenseEntered&&cash.monthlyRemaining<0?'var(--red)':limits.length||!cash.expenseEntered?'var(--txt)':'var(--green)';
    cashValue.querySelector('small').textContent=cash.expenseEntered?'예상 분배금 '+money(cash.monthlyNetIncome)+' / 생활비 '+money(cash.spend):'월 생활비를 입력하면 차액을 확인할 수 있어요';
    let note=$('fmCashflowLimits');if(!note){note=document.createElement('small');note.id='fmCashflowLimits';cashValue.after(note)}note.textContent=limits.join(' · ');note.hidden=!limits.length;
   }
   $('fmOpenCalculator').textContent=state.draft?.dirty?'계획 조정 •':'계획 조정';
   const stress=state.stress;
   if(stress){$('fmRiskHeadline').textContent=stress.crash+'% 하락 · 별도 단일 분배율 가정';riskBasis.textContent='목표 배분 '+money(stress.total)+' · 연 분배율 '+stress.yield+'% · 세금 부담률 '+stress.taxRate+'% · '+stress.crash+'% 일시 하락. 분배금도 자산가치에 비례해 감소하는 가정이며 물가·보험료는 제외합니다.';}
   if(state.cashflow&&state.stress){const c=state.cashflow,t=state.stress,p=state.plan||{};
    $('fmModelValues').replaceChildren();
    for(const [label,value] of [['생활비 화면 · 세후 분배금',compactMoney(c.monthlyNetIncome)+'/월'],['하락 실험 · 하락 전',compactMoney(t.monthlyBefore)+'/월']]){const row=document.createElement('div');row.className='fm-model-value';const l=document.createElement('span'),v=document.createElement('strong');l.textContent=label;v.textContent=value;row.append(l,v);$('fmModelValues').append(row)}
    $('fmModelScope').replaceChildren();
    for(const text of ['목표 배분 '+compactMoney(state.portfolio?.totalTarget||0)+' · 공통 생활비 '+compactMoney(c.spend)+'/월','생활비: 종목별 분배율·원천징수, '+(c.insuranceEntered?'입력 보험료 반영':'보험료 미입력 · 미차감'),'하락 실험: 분배율 '+t.yield+'% · 세금 부담 '+t.taxRate+'% · 보험료·물가 제외','전략 비교: 표시된 비교 자산·생활비와 총수익률 사용. 은퇴 계획에 저장되지 않습니다.']){const line=document.createElement('p');line.className='mini';line.textContent=text;$('fmModelScope').append(line)}
   }
   updateExpense();updateIncome();
   const detail=state.mode==='detail';basis.replaceChildren();
   const add=(text,cls='')=>{const span=document.createElement('span');span.className=cls;span.textContent=text;basis.append(span)};
   if(detail){add('임시 · 장기 비교','fm-model-tag');const d=state.detail;if(d){add(d.years+'년 · 물가 '+(d.inflation*100).toFixed(1)+'%');add('비교 자산 '+money(d.budget));add('연 생활비 '+money(d.spend+d.insurance));}else add('종목·조건을 확인한 뒤 계산해 주세요');}
   else{const q=state.quick;add('임시 · 1년 비교','fm-model-tag');if(q){add('비교 자산 '+money(q.assets));add('연 생활비 '+money(q.spend));add('총수익률 '+(q.growthRate*100).toFixed(1)+'% · 배당 포함');add('배당 부담 '+(q.taxRate*100).toFixed(1)+'%');add('물가·매도세·보험료 미반영');}}
  };
  document.addEventListener('fm-fire-view-updated',sync);sync();
  // Compact daily dashboard, with the existing render targets and handlers intact.
  const home=$('view-home'),budget=home.querySelector('.fm-home-budget'),budgetTotal=document.createElement('div');
  budgetTotal.className='fm-home-budget-total';$('heroSpent').before(budgetTotal);budgetTotal.append($('heroSpent'),$('homeBudgetAction'));
  const homeFire=home.querySelector('.fm-home-fire'),cache=$('fmHomeRenderCache');
  // Keep existing render targets available without duplicating the FIRE plan on home.
  cache.append($('fmHomeEstimateInputs'),$('homeAssetGoal').closest('.hero-stat'),$('fmNextMilestone'),$('homeFireRemaining'));
  homeFire.querySelector('.hero-stat .light').textContent='목표 달성률';
  // One quote status owner; the holding-only location made failures hard to discover.
  const assetHero=$('view-assets').querySelector(':scope>.hero'),quoteContext=document.createElement('details');quoteContext.id='fmAssetQuoteContext';
  quoteContext.innerHTML='<summary>환율·시세 확인</summary><p class="mini" id="fmAssetFxStatus"></p><p class="mini">국내·해외·코인 시세는 거래 시간과 공급처에 따라 갱신 시점이 다릅니다. 마지막 조회 시간은 모든 종목의 실시간 가격을 보장하지 않습니다.</p>';
  const stockStatus=$('stockStatus'),statusRow=stockStatus.parentElement;quoteContext.append(stockStatus);if(!statusRow.children.length)statusRow.remove();assetHero.append(quoteContext);
  const refreshContext=()=>{const rate=Number($('assetFx').value),text=rate>0?'환율 '+rate.toLocaleString('ko-KR')+'원/USD · 시세 상태':'환율·시세 확인';const title=quoteContext.querySelector('summary');if(title.textContent!==text)title.textContent=text;const status=$('fxStatus').textContent||'환율 기준일 확인 필요';if($('fmAssetFxStatus').textContent!==status)$('fmAssetFxStatus').textContent=status;};
  new MutationObserver(refreshContext).observe(assetHero,{childList:true,subtree:true});new MutationObserver(refreshContext).observe($('fxStatus'),{childList:true,subtree:true});refreshContext();
  const assetTabs=$('view-assets').querySelector('.fm-asset-jump'),tabButtons=[...assetTabs.querySelectorAll('button')];assetTabs.setAttribute('role','tablist');
  const panels=['fmAssetAccountsPanel','fmAssetHoldingsPanel','fmAssetDividendView','fmAssetAnalysisView'];
  const selectTabs=()=>tabButtons.forEach((button,i)=>{const selected=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  tabButtons.forEach((button,i)=>{button.setAttribute('role','tab');button.setAttribute('aria-controls',panels[i]);$(panels[i]).setAttribute('role','tabpanel');$(panels[i]).setAttribute('aria-labelledby',button.id);new MutationObserver(selectTabs).observe(button,{attributes:true,attributeFilter:['aria-pressed']});button.addEventListener('keydown',event=>{const offset={ArrowRight:1,ArrowLeft:-1}[event.key];if(offset===undefined&&!['Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?3:(i+offset+4)%4;tabButtons[next].click();tabButtons[next].focus({preventScroll:true});});});selectTabs();
  // Date selection reveals its transactions only when they would otherwise be out of sight.
  const calendar=$('cal'),day=$('dayTx'),dayHeader=$('selectedTitle');let calendarY=0;
  const calendarBack=document.createElement('button');calendarBack.id='fmBackToCalendar';calendarBack.type='button';calendarBack.className='secondary';calendarBack.textContent='달력으로 ↑';dayHeader.after(calendarBack);
  calendarBack.onclick=()=>{scrollTo({top:calendarY,behavior:'instant'});calendar.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});};
  calendar.addEventListener('click',event=>{if(!event.target.closest('[data-date]'))return;calendarY=scrollY;requestAnimationFrame(()=>{if(!day.querySelector('.tx'))return;const rect=day.getBoundingClientRect(),height=window.visualViewport?.height||innerHeight;if(rect.bottom>height-90){dayHeader.scrollIntoView({block:'start',behavior:'instant'});dayHeader.tabIndex=-1;dayHeader.focus({preventScroll:true});}});});
  // Keep backup creation one tap away in settings; import/reset retain their safeguards.
  const storage=document.createElement('section');storage.className='fm-device-storage';storage.innerHTML='<h3>내 데이터 보관</h3>';
  const backup=$('export'),group=backup.closest('details'),note=group.querySelector('.notice');storage.append(note,backup);$('settingsOverlay').querySelector('.stack').prepend(storage);group.querySelector(':scope>summary').textContent='복원·가져오기·거래 내보내기';
  const syncMainNav=()=>document.querySelectorAll('.bottomnav [data-view]').forEach(button=>{if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  new MutationObserver(syncMainNav).observe(document.querySelector('.bottomnav'),{attributes:true,subtree:true,attributeFilter:['class']});syncMainNav();

 });
})();

}catch(e){console.error('fm-premium-finance-ui',e)}


// ===== fm-home-onboarding — 홈 · 시작 안내 =====
try{
/* First-run checklist on home. Completion is read from saved data and never written; only dismissal is stored. */
(()=>{
 'use strict';
 const KEY='firemate_onboarding_v1';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const home=$('view-home'),fire=home&&home.querySelector('.fm-home-fire');
  if(!home||!fire||typeof window.fmGo!=='function')return;
  try{if(localStorage.getItem(KEY)==='dismissed')return}catch{}
  const steps=[
   {id:'assets',title:'자산 등록하기',hint:'통장·주식·현금을 추가하면 순자산이 계산돼요',
    // New profiles start with three empty default accounts, so only entered values count.
    done:d=>(Array.isArray(d.holdings)&&d.holdings.length>0)||(Array.isArray(d.accounts)&&d.accounts.some(a=>Number(a?.amount)>0||(Array.isArray(a?.items)&&a.items.length>0)))||['cash','other','debt'].some(k=>Number(d.balance?.[k])>0),
    run:()=>{window.fmGo('assets');const add=$('unifiedAddAsset'),box=$('assetAddChoices');if(!add)return;if(box&&(box.hidden||box.style.display==='none'))add.click();add.scrollIntoView({block:'center'})}},
   {id:'budget',title:'이번 달 예산 정하기',hint:'예산을 정하면 남은 금액을 알려 드려요',
    done:d=>Object.values(d.budgets&&typeof d.budgets==='object'?d.budgets:{}).some(v=>Number(v)>0),
    run:()=>$('homeBudgetAction')?.click()},
   {id:'tx',title:'첫 거래 기록하기',hint:'오늘 쓴 돈이나 받은 돈을 남겨 보세요',
    done:d=>Array.isArray(d.tx)&&d.tx.length>0,
    run:()=>{window.fmGo('calendar');$('fmLedgerAddBtn')?.click()}}
  ];
  const card=document.createElement('section');card.className='card fm-onboarding';card.setAttribute('aria-labelledby','fmOnboardingTitle');
  card.innerHTML='<div class="fm-onboarding-head"><div><h3 id="fmOnboardingTitle">시작하기</h3><p id="fmOnboardingCount" aria-live="polite"></p></div><button type="button" class="fm-onboarding-close" aria-label="시작하기 안내 닫기">닫기</button></div><ol class="fm-onboarding-steps"></ol>';
  const list=card.querySelector('ol');
  for(const step of steps){
   const item=document.createElement('li');item.dataset.step=step.id;
   item.innerHTML='<button type="button"><span class="fm-onboarding-mark" aria-hidden="true"></span><span class="fm-onboarding-text"><strong></strong><small></small></span><span class="fm-onboarding-go" aria-hidden="true">→</span></button>';
   item.querySelector('strong').textContent=step.title;item.querySelector('small').textContent=step.hint;item.querySelector('button').onclick=step.run;
   list.append(item);
  }
  // Below the shortcuts so the core metrics and report shortcuts stay in the first screen.
  (home.querySelector('.home-shortcuts')||fire).after(card);
  const update=()=>{
   let saved=fmLiveData();
   let count=0;
   for(const step of steps){
    const ok=!!step.done(saved),item=list.querySelector('[data-step="'+step.id+'"]');count+=ok;
    item.classList.toggle('done',ok);item.querySelector('.fm-onboarding-mark').textContent=ok?'✓':'';
    item.querySelector('button').setAttribute('aria-label',step.title+(ok?' (완료)':''));
   }
   $('fmOnboardingCount').textContent=steps.length+'개 중 '+count+'개 완료';
   card.hidden=count===steps.length;
  };
  // Home re-renders after every saved change; refresh while it is the visible view.
  let queued=false;
  const observer=new MutationObserver(records=>{
   if(queued||records.every(r=>card.contains(r.target)))return;
   queued=true;requestAnimationFrame(()=>{queued=false;if(home.classList.contains('active'))update()});
  });
  observer.observe(home,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  card.querySelector('.fm-onboarding-close').onclick=()=>{try{localStorage.setItem(KEY,'dismissed')}catch{}observer.disconnect();card.remove()};
  update();
 });
})();
}catch(e){console.error('fm-home-onboarding',e)}


// ===== fm-strategy-conclusion — FIRE · 전략 비교 =====
try{
/* One-line takeaway for the dividend vs. sell-down comparison. Reads the values the comparison
   already published to window.fmFireViewState; no calculation or storage changes. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const card=document.getElementById('fmStrategyCard'),title=card&&card.querySelector('h3');
  if(!title)return;
  const box=document.createElement('div');box.id='fmStrategyConclusion';box.setAttribute('role','status');box.hidden=true;
  title.after(box);
  // Amounts arrive in 만원, as in the comparison itself; no-break spaces keep each amount on one line.
  const money=n=>{const v=Math.round(Math.abs(n)),e=Math.floor(v/10000),m=v%10000;return ((e?e+'억 ':'')+(m?m.toLocaleString('ko-KR')+'만 ':'')+(e||m?'원':'0원')).replace(/ /g,' ')};
  const more=(dividend,sale,when)=>{
   const diff=sale-dividend;
   if(Math.abs(diff)<1)return when+' 남는 자산은 두 방식이 비슷해요.';
   return diff>0?'필요한 만큼 팔아 쓰면 '+when+' 자산이 '+money(diff)+' 더 남아요.':'배당만으로 살면 '+when+' 자산이 '+money(diff)+' 더 남아요.';
  };
  const sync=()=>{
   const state=window.fmFireViewState||{},lines=[];
   if(state.mode==='detail'){
    const d=state.detail;
    if(d&&Array.isArray(d.balances)&&d.balances.length>=2&&d.balances.every(Number.isFinite)){
     const [dividend,sale]=d.balances,left=v=>v>0?money(v):'0원(자산 소진)';
     if(dividend<=0&&sale<=0){lines.push(d.years+'년 안에 두 방식 모두 자산이 바닥나요.');lines.push('생활비나 비교 기간을 바꿔 다시 확인해 보세요.')}
     else{lines.push(d.years+'년 뒤 남는 자산 · 배당만 '+left(dividend)+' · 팔아 쓰기 '+left(sale));lines.push(more(dividend,sale,d.years+'년 뒤'))}
    }
   }else{
    const q=state.quick;
    if(q&&[q.net,q.spend,q.dividendEnd,q.saleEnd].every(Number.isFinite)){
     const surplus=q.net-q.spend;
     lines.push(surplus>=0?'배당만으로 살면 1년 생활비를 내고도 '+money(surplus)+'이 남아요.':'배당만으로 살면 1년 생활비가 '+money(surplus)+' 모자라요.');
     lines.push(more(q.dividendEnd,q.saleEnd,'1년 뒤'));
    }
   }
   box.hidden=!lines.length;
   box.replaceChildren();
   if(!lines.length)return;
   const tag=document.createElement('span');tag.textContent='한눈에 보기';box.append(tag);
   for(const text of lines){const line=document.createElement('p');line.textContent=text;box.append(line)}
  };
  document.addEventListener('fm-fire-view-updated',sync);
  sync();
 });
})();
}catch(e){console.error('fm-strategy-conclusion',e)}


// ===== fm-practical-fixes — 공통 · 시세 버튼, 백업 알림 =====
try{
/* Quote button emphasis and backup reminders. Reads saved data only; writes UI keys
   firemate_last_backup_v1 (set by the backup button) and firemate_backup_snooze_v1. */
(()=>{
 'use strict';
 const LAST='firemate_last_backup_v1',SNOOZE='firemate_backup_snooze_v1',DAY=86400000;
 const saved=fmLiveData;
 const readTime=key=>{try{const t=Date.parse(localStorage.getItem(key)||'');return Number.isFinite(t)?t:null}catch{return null}};
 const daysSince=t=>Math.floor((Date.now()-t)/DAY);
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const home=$('view-home');if(!home)return;
  // Quote refresh only matters once holdings exist.
  const syncQuote=d=>{
   const idle=!(Array.isArray(d.holdings)&&d.holdings.length);
   for(const id of ['homeRefreshStocks','refreshStocks']){const b=$(id);if(!b)continue;b.classList.toggle('fm-quote-idle',idle);b.title=idle?'등록된 종목이 없어요 · 자산에서 종목을 추가하면 시세를 불러와요':'보유 종목 시세 업데이트'}
  };
  // Backup nudge: only once there is data worth losing, and never for brand-new profiles.
  const nudge=document.createElement('section');nudge.className='card fm-backup-nudge';nudge.hidden=true;nudge.setAttribute('aria-labelledby','fmBackupNudgeTitle');
  nudge.innerHTML='<h3 id="fmBackupNudgeTitle">데이터를 백업해 두세요</h3><p id="fmBackupNudgeText"></p><div class="fm-backup-nudge-actions"><button type="button" class="primary" id="fmBackupNow">메일로 백업 보내기</button><button type="button" class="secondary" id="fmBackupLater">7일 뒤에</button></div>';
  (home.querySelector('.fm-onboarding')||home.querySelector('.home-shortcuts')||home.lastElementChild).after(nudge);
  const status=document.createElement('div');status.id='fmBackupStatus';status.className='mini';status.setAttribute('aria-live','polite');
  ($('exportShare')||$('export'))?.after(status);
  const hasData=d=>(Array.isArray(d.tx)&&d.tx.length>0)||(Array.isArray(d.holdings)&&d.holdings.length>0)||(Array.isArray(d.accounts)&&d.accounts.some(a=>Number(a?.amount)>0||(Array.isArray(a?.items)&&a.items.length>0)))||['cash','other','debt'].some(k=>Number(d.balance?.[k])>0);
  const firstDay=d=>{const days=[...(Array.isArray(d.tx)?d.tx.map(t=>t?.date):[]),...(Array.isArray(d.dailySnapshots)?d.dailySnapshots.map(s=>s?.day):[])].filter(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)).sort();return days.length?Date.parse(days[0]+'T00:00:00'):null};
  const syncBackup=d=>{
   const last=readTime(LAST),snooze=readTime(SNOOZE);
   status.textContent=last===null?'마지막 백업: 아직 없어요':'마지막 백업: '+(daysSince(last)<1?'오늘':daysSince(last)+'일 전');
   const start=firstDay(d),due=last!==null?daysSince(last)>=7:start!==null&&daysSince(start)>=3;
   nudge.hidden=!(hasData(d)&&due&&!(snooze!==null&&snooze>Date.now()));
   if(!nudge.hidden)$('fmBackupNudgeText').textContent=(last===null?'아직 백업한 적이 없어요.':'이번 주 백업할까요? 마지막 백업이 '+daysSince(last)+'일 전이에요.')+' 기록은 이 휴대폰에만 저장돼서, 앱이나 브라우저 데이터를 지우면 사라져요.';
  };
  const sync=()=>{const d=saved();syncQuote(d);syncBackup(d)};
  $('fmBackupNow').onclick=()=>{($('exportShare')||$('export'))?.click();setTimeout(sync,300)};
  $('fmBackupLater').onclick=()=>{try{localStorage.setItem(SNOOZE,new Date(Date.now()+7*DAY).toISOString())}catch{}sync()};
  for(const id of ['export','exportShare'])$(id)?.addEventListener('click',()=>setTimeout(sync,300));
  // Totals re-render after every saved change; follow them instead of polling.
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})};
  for(const id of ['homeTotalAssets','netWorth','heroSpent'])if($(id))new MutationObserver(schedule).observe($(id),{childList:true,characterData:true,subtree:true});
  new MutationObserver(schedule).observe(home,{attributes:true,attributeFilter:['class']});
  sync();
 });
})();
}catch(e){console.error('fm-practical-fixes',e)}


// ===== fm-home-record — 홈 · 기록 버튼 =====
try{
/* Record a transaction straight from home: opens the existing entry dialog and stays on home. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const card=document.querySelector('#view-home .fm-home-budget');
  if(!card||typeof window.fmOpenEntry!=='function')return;
  const actions=document.createElement('div');actions.className='fm-home-actions';
  const sync=document.createElement('button');sync.type='button';sync.id='fmHomeSync';sync.className='secondary fm-home-record';sync.textContent='📥 Gmail 가져오기';
  sync.onclick=()=>{if(window.fmImportFromHome)window.fmImportFromHome();else document.getElementById('bankGmailImport')?.click()};
  const button=document.createElement('button');button.type='button';button.id='fmHomeRecord';button.className='secondary fm-home-record';
  button.textContent='＋ 직접 기록';button.onclick=()=>window.fmOpenEntry();
  // The import age rides inside the button as a second line so the card does not grow.
  sync.textContent='';const label=document.createElement('span');label.textContent='📥 Gmail 가져오기';
  const note=document.createElement('span');note.id='fmHomeSyncNote';note.setAttribute('aria-live','polite');sync.append(label,note);
  actions.append(sync,button);card.append(actions);
 });
})();
}catch(e){console.error('fm-home-record',e)}


// ===== fm-settings-order — 설정 · 순서 =====
try{
/* Settings in the order people look for them: 내 데이터 → 화면 → 연동 → 가져오기·내보내기 → 게임 → 초기화.
   Only existing nodes are moved; ids and handlers stay as they are. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const stack=document.querySelector('#settingsOverlay .stack'),storage=stack&&stack.querySelector(':scope>.fm-device-storage');
  if(!storage)return;
  // Every backup action lives with the backup button.
  let anchor=$('export');
  for(const id of ['exportShare','fmBackupStatus','importBtn']){const el=$(id);if(el&&anchor){anchor.after(el);anchor=el}}
  const groups=[...stack.querySelectorAll(':scope>details.fm-settings-group')];
  const summary=g=>g.querySelector(':scope>summary');
  const sync=groups.find(g=>/시세/.test(summary(g)?.textContent||'')),io=groups.find(g=>g.querySelector('#csvExport')),reset=groups.find(g=>g.querySelector('#clearAll'));
  if(io)summary(io).textContent='📥 가져오기 · 내보내기';
  if(reset)summary(reset).textContent='⚠️ 데이터 초기화';
  const theme=stack.querySelector(':scope>.fm-settings-theme'),arcade=$('fmArcadeOpen');
  const order=[storage,theme,sync,io,arcade,reset].filter(Boolean);
  for(const el of order)stack.append(el);
 });
})();
}catch(e){console.error('fm-settings-order',e)}


// ===== fm-assets-balance-row — 자산 · 현금·기타·부채 =====
try{
/* Cash, other assets and debt kept in balance count toward net worth but had no visible home once
   their settings entry was hidden. Show them under the accounts and reopen the existing editor. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const details=$('accountDetails'),open=$('openLegacyAssets');
  if(!details||!open)return;
  const row=document.createElement('div');row.id='fmBalanceRow';
  row.innerHTML='<div><strong>현금·기타 자산·부채</strong><span id="fmBalanceRowText"></span></div><button type="button" class="secondary" id="fmBalanceRowEdit" aria-label="현금·기타 자산·부채 관리">관리</button>';
  details.after(row);
  const title=$('legacyAssetsOverlay')?.querySelector('h2');if(title)title.textContent='현금·기타 자산·부채';
  $('fmBalanceRowEdit').onclick=()=>open.click();
  const won=n=>'₩'+Math.round(n).toLocaleString('ko-KR');
  const sync=()=>{
   let b=fmLiveData().balance||{};
   const parts=[['현금·예금',b.cash],['기타',b.other],['부채',b.debt]].filter(([,v])=>Number(v)>0).map(([k,v])=>k+' '+(k==='부채'?'-':'')+won(Number(v)));
   $('fmBalanceRowText').textContent=parts.length?parts.join(' · ')+' · 순자산에 포함':'없음 · 대출 같은 부채도 여기서 입력해요';
  };
  for(const id of ['netWorth','homeTotalAssets'])if($(id))new MutationObserver(sync).observe($(id),{childList:true,characterData:true,subtree:true});
  sync();
 });
})();
}catch(e){console.error('fm-assets-balance-row',e)}


// ===== fm-ledger-sync — 설정 · Gmail·파일 가져오기 =====
try{
/* Most entries arrive from 뱅크샐러드 via Gmail, so the importer lives at the top of 가계부 instead
   of three folds deep in settings. Existing nodes, ids and handlers are moved, not rebuilt. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const gmail=$('bankGmailImport'),card=gmail?.closest('.card'),mount=$('fmLedgerImportMount');
  if(!card||!mount)return;
  const panel=document.createElement('section');panel.id='fmLedgerSync';panel.setAttribute('aria-labelledby','fmSyncTitle');
  // One compact row so the calendar stays on the first screen; rarely used options fold away.
  panel.innerHTML='<div class="fm-sync-head"><div><strong id="fmSyncTitle">뱅크샐러드 가져오기</strong><span id="fmSyncStatus" aria-live="polite"></span></div></div>';
  const file=document.createElement('details');file.innerHTML='<summary>엑셀·ZIP 파일로 직접 가져오기</summary>';
  const fileInput=$('bankExcelFile');file.append(fileInput,fileInput.nextElementSibling);
  gmail.textContent='📥 가져오기';gmail.setAttribute('aria-label','Gmail에서 뱅크샐러드 최신 내역 가져오기');
  const remember=document.createElement('label');remember.className='fm-zip-remember';
  remember.innerHTML='<input type="checkbox" id="fmZipRemember"><span id="fmZipRememberText">ZIP 암호를 이 휴대폰에 기억하기</span><button type="button" class="secondary" id="fmZipForget" hidden>지우기</button>';
  const confirmImport=$('bankExcelConfirm');
  const options=document.createElement('details');options.id='fmSyncOptions';options.innerHTML='<summary>가져오기 설정 · 파일로 가져오기</summary>';
  const autoAdd=document.createElement('label');autoAdd.className='fm-zip-remember';autoAdd.innerHTML='<input type="checkbox" id="fmImportAuto"><span>홈에서 가져올 때 확인 없이 바로 추가 (되돌리기는 가능)</span>';
  const autoBox=autoAdd.querySelector('input');try{autoBox.checked=localStorage.getItem('firemate_import_auto_v1')==='1'}catch{}autoBox.onchange=()=>{try{localStorage.setItem('firemate_import_auto_v1',autoBox.checked?'1':'0')}catch{}};
  options.append(remember,autoAdd,file);
  panel.firstElementChild.append(gmail);
  panel.append($('bankGmailStatus'),$('bankExcelPreview'),confirmImport,options);
  // The panel is not in the document yet, so look inside the label rather than by global id.
  const box=remember.querySelector('#fmZipRemember'),text=remember.querySelector('#fmZipRememberText'),forget=remember.querySelector('#fmZipForget');
  const keptPwd=()=>{try{return !!localStorage.getItem('firemate_bank_zip_pwd_v1')}catch{return false}};
  const syncZip=()=>{const kept=keptPwd();box.checked=kept;text.textContent=kept?'ZIP 암호를 기억하고 있어요':'ZIP 암호를 이 휴대폰에 기억하기';forget.hidden=!kept};
  box.onchange=()=>{if(!box.checked){try{localStorage.removeItem('firemate_bank_zip_pwd_v1')}catch{}syncZip()}else text.textContent='다음 가져오기에서 입력한 암호를 기억해요'};
  forget.onclick=e=>{e.preventDefault();try{localStorage.removeItem('firemate_bank_zip_pwd_v1')}catch{}syncZip()};
  syncZip();
  confirmImport.addEventListener('click',()=>setTimeout(syncZip,0));
  const forgetGoogle=document.createElement('button');forgetGoogle.type='button';forgetGoogle.className='secondary';forgetGoogle.id='fmGmailForget';forgetGoogle.textContent='Google 로그인 기억 지우기';
  const googleKept=()=>{try{return !!(localStorage.getItem('firemate_gmail_hint_v1')||localStorage.getItem('firemate_gmail_token_v1'))}catch{return false}};
  const syncGoogle=()=>{forgetGoogle.hidden=!googleKept()};
  forgetGoogle.onclick=()=>{try{const t=JSON.parse(localStorage.getItem('firemate_gmail_token_v1')||'null');if(t?.token&&window.google?.accounts?.oauth2?.revoke)google.accounts.oauth2.revoke(t.token,()=>{})}catch{}try{localStorage.removeItem('firemate_gmail_token_v1');localStorage.removeItem('firemate_gmail_hint_v1')}catch{}syncGoogle()};
  file.after(forgetGoogle);syncGoogle();
  new MutationObserver(syncGoogle).observe(panel.querySelector('#bankGmailStatus')||panel,{childList:true,characterData:true,subtree:true});
  // The calendar keeps the 가계부 screen; the importer lives in settings and home opens it there.
  mount.replaceChildren(panel);card.remove();
  // Home runs the import in place: the live status, preview and 추가 button move under the
  // home buttons, and back into this panel whenever settings open.
  const live=[$('bankGmailStatus'),$('bankExcelPreview'),confirmImport].filter(Boolean);
  const homeActions=$('fmHomeSync')?.closest('.fm-home-actions');let homeBox=null;
  if(homeActions){homeBox=document.createElement('div');homeBox.id='fmHomeImport';homeActions.after(homeBox)}
  const toPanel=()=>{if(live[0]?.parentElement!==panel)panel.querySelector('.fm-sync-head').after(...live)};
  $('settingsBottom')?.addEventListener('click',toPanel);
  $('fmLedgerImport')?.addEventListener('toggle',e=>{if(e.target.open)toPanel()});
  // From home, a found batch is offered in a small 예/아니오 sheet instead of a second button.
  let fromHome=false;
  new MutationObserver(()=>{
   if(!fromHome||confirmImport.hidden||typeof window.fmAsk!=='function')return;
   fromHome=false;
   let direct=false;try{direct=localStorage.getItem('firemate_import_auto_v1')==='1'}catch{}
   if(direct){confirmImport.click();return}
   const summary=($('bankExcelPreview')?.textContent||'').split(' · ').join('\n');
   window.fmAsk('뱅크샐러드에서 가져온 내역\n'+summary+'\n\n가계부에 추가할까요? 계좌 잔액은 바뀌지 않아요.',{ok:'예',cancel:'아니오'}).then(yes=>{
    if(yes){confirmImport.click();return}
    try{bankPending=[]}catch{}
    confirmImport.hidden=true;$('bankExcelPreview').textContent='가져오기를 취소했어요. 아무것도 바뀌지 않았어요.';
   });
  }).observe(confirmImport,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(()=>{if(!gmail.disabled)setTimeout(()=>{fromHome=false},0)}).observe(gmail,{attributes:true,attributeFilter:['disabled']});
  window.fmImportFromHome=()=>{if(homeBox&&live[0]?.parentElement!==homeBox)homeBox.append(...live);if(gmail.disabled)return;fromHome=true;gmail.click()};
  window.fmOpenImport=start=>{
   toPanel();
   const settings=$('settingsOverlay');
   if(!settings?.classList.contains('show'))$('settingsBottom')?.click();
   const group=panel.closest('details.fm-settings-group'),fold=$('fmLedgerImport');
   if(group)group.open=true;if(fold)fold.open=true;
   panel.scrollIntoView({block:'start'});
   if(start&&!gmail.disabled)gmail.click();
  };
  const day=s=>{const [,m,d]=s.split('-').map(Number);return m+'월 '+d+'일'};
  const sync=()=>{
   let tx=fmLiveData().tx||[];
   const last=tx.filter(t=>t?.bankExcelKey&&typeof t.date==='string').map(t=>t.date).sort().pop();
   let at=null;try{at=Date.parse(localStorage.getItem('firemate_last_import_v1')||'')}catch{}
   const days=Number.isFinite(at)?Math.floor((Date.now()-at)/86400000):null;
   $('fmSyncStatus').textContent=(last?'가져온 내역 '+day(last)+'까지':'아직 가져온 내역이 없어요')+(days===null?'':' · 마지막 가져오기 '+(days<1?'오늘':days+'일 전'));
   const note=$('fmHomeSyncNote');
   // Short on purpose: it is the second line of the home button; the ledger card has the details.
   if(note){note.textContent=days!==null?(days<1?'오늘 가져옴':days+'일 전 가져옴'):last?day(last)+'까지 있음':'아직 가져온 적 없어요';note.classList.toggle('due',days!==null&&days>=7)}
  };
  for(const el of [$('bankExcelPreview'),$('heroSpent')])if(el)new MutationObserver(sync).observe(el,{childList:true,characterData:true,subtree:true});
  sync();
 });
})();
}catch(e){console.error('fm-ledger-sync',e)}


// ===== fm-in-app-confirm — 공통 · 확인 창(fmAsk) =====
try{
/* fmAsk(message) → Promise<boolean>. Same wording as the old browser confirm calls; cancel, the
   backdrop and Escape all answer false, so nothing changes unless 확인 is tapped. */
(()=>{
 'use strict';
 let pending=null;
 window.fmAsk=(message,labels={})=>new Promise(resolve=>{
  if(pending)pending(false);
  let host=document.getElementById('fmAsk');
  if(!host){
   host=document.createElement('div');host.id='fmAsk';host.hidden=true;
   host.innerHTML='<div class="fm-ask-card" role="alertdialog" aria-modal="true" aria-describedby="fmAskText"><p id="fmAskText"></p><div class="fm-ask-actions"><button type="button" class="secondary" id="fmAskCancel">취소</button><button type="button" class="primary" id="fmAskOk">확인</button></div></div>';
   document.body.append(host);
  }
  const text=String(message),ok=host.querySelector('#fmAskOk'),cancel=host.querySelector('#fmAskCancel'),back=document.activeElement;
  host.querySelector('#fmAskText').textContent=text;
  const danger=/삭제|초기화|덮어쓸|교체/.test(text);
  ok.textContent=labels.ok||(/삭제/.test(text)?'삭제':/초기화/.test(text)?'초기화':'확인');cancel.textContent=labels.cancel||'취소';ok.classList.toggle('fm-ask-danger',danger);
  const done=value=>{if(pending!==finish)return;pending=null;host.hidden=true;document.removeEventListener('keydown',key,true);try{back?.focus?.({preventScroll:true})}catch{}resolve(value)};
  const finish=done;pending=finish;
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false)}};
  ok.onclick=()=>done(true);cancel.onclick=()=>done(false);host.onclick=e=>{if(e.target===host)done(false)};
  document.addEventListener('keydown',key,true);
  host.hidden=false;(danger?cancel:ok).focus({preventScroll:true});
 });
})();
}catch(e){console.error('fm-in-app-confirm',e)}


// ===== fm-daily-fixes-v3586 — 자산·설정 · 빈 계좌 접기, 소액 수입, 분류 정리 =====
try{
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const saved=fmLiveData;
  const won=n=>'₩'+Math.round(n).toLocaleString('ko-KR');
  // Fold accounts that hold nothing, but only once some account has value (new profiles keep the starter list).
  const fold=()=>{
   const holder=$('accountSummary');if(!holder||holder.querySelector(':scope>.fm-empty-accounts'))return;
   const d=saved(),hs=d.holdings||[];
   const empty=a=>!(Number(a.amount)>0)&&!(a.items||[]).length&&!hs.some(h=>h.accountId===a.id);
   const accounts=d.accounts||[];if(!accounts.some(a=>!empty(a)))return;
   const rows=[...holder.querySelectorAll(':scope>.fm-account-row')].filter(r=>{const id=r.querySelector('[data-inline-toggle]')?.dataset.inlineToggle;const a=accounts.find(x=>x.id===id);return a&&empty(a)&&r.querySelector('[data-inline-toggle]')?.getAttribute('aria-expanded')!=='true'&&!r.querySelector('[data-move-up]')});
   if(rows.length<2)return;
   const box=document.createElement('details');box.className='fm-empty-accounts';box.innerHTML='<summary></summary>';box.firstChild.textContent='빈 계좌 '+rows.length+'개';
   box.append(...rows);holder.append(box);
  };
  const holder=$('accountSummary');if(holder){fold();new MutationObserver(fold).observe(holder,{childList:true})}
  // Settings: one tap tidies categories of rows imported before the new mapping.
  const mount=$('fmLedgerImportMount');
  if(mount){const tiny=document.createElement('label');tiny.className='fm-zip-remember';tiny.id='fmHideTinyIncome';tiny.innerHTML='<input type="checkbox"><span>1,000원 미만 이자·배당·캐시백은 가계부에서 숨기기</span>';const box=tiny.querySelector('input');try{box.checked=localStorage.getItem('firemate_hide_small_income_v1')!=='0'}catch{box.checked=true}box.onchange=()=>{try{localStorage.setItem('firemate_hide_small_income_v1',box.checked?'1':'0')}catch{}location.reload()};mount.after(tiny)}
  if(mount&&typeof window.fmBankTidyCategories==='function'){
   const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.id='fmTidyCategories';
   const sync=()=>{const n=window.fmBankTidyCategories(false);btn.hidden=!n;btn.textContent='가져온 거래 분류 정리 ('+n+'건)'};
   btn.onclick=async()=>{const n=window.fmBankTidyCategories(false);if(!n)return sync();
    if(!await window.fmAsk('가져온 거래 '+n+'건의 분류를 앱 분류(식비·쇼핑 등)로 정리할까요?\n금액·날짜·메모는 그대로예요.',{ok:'정리',cancel:'취소'}))return;
    const done=window.fmBankTidyCategories(true);sync();
    if(typeof window.fmToast==='function')window.fmToast(done>0?done+'건의 분류를 정리했어요':'저장에 실패해 그대로 두었어요')};
   mount.after(btn);sync();
   $('settingsBottom')?.addEventListener('click',sync);
  }
 });
})();
}catch(e){console.error('fm-daily-fixes-v3586',e)}


// ===== fm-plan-v3587 — 홈·자산 · 이번 달 속도, 순자산 추이, 당겨서 업데이트 =====
try{
/* Month pace on home, net-worth trend, import nudge, pull-to-refresh. Fixed costs and category
   budgets on 소비 분석 are drawn by the main script (fmRenderFixed / fmRenderCatBudget). */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const CATB='firemate_category_budgets_v1';
  const load=fmLiveData;
  const won=n=>'₩'+Math.round(n).toLocaleString('ko-KR');
  const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const expenses=(d,m)=>(d.tx||[]).filter(t=>t&&t.type==='expense'&&typeof t.date==='string'&&t.date.slice(0,7)===m);
  const sum=rows=>rows.reduce((a,t)=>a+(Number(t.amount)||0),0);
  const catBudgets=()=>{try{const v=JSON.parse(localStorage.getItem(CATB)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}};
  const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // 6. This month's pace on the home spending card (+ any category over its budget).
  const anchor=$('homeBudgetAction')?.closest('.card')||$('fmHomeSync')?.closest('.fm-home-actions')?.parentElement;
  const pace=el('div','fm-pace');pace.id='fmPaceLine';
  const actions=$('fmHomeSync')?.closest('.fm-home-actions');if(actions)actions.before(pace);else anchor?.append(pace);
  const renderPace=()=>{
   const d=load(),now=new Date(),m=ym(now),day=now.getDate(),days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
   const spent=sum(expenses(d,m));const budget=Number(d.budgets?.[m])||0;
   const parts=[];
   const todayKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(day).padStart(2,'0'),spentToday=sum(expenses(d,m).filter(t=>t.date===todayKey));
   // One short line: today's spend, then the month pace (kept to one line so home shortcuts stay above the nav).
   const first=[];if(spentToday>0)first.push('오늘 <strong>'+won(spentToday)+'</strong>');
   if(day>=3&&spent>0){const est=Math.round(spent/day*days/1000)*1000;let line='이 속도면 월 <strong>'+won(est)+'</strong>';if(budget){const diff=est-budget;line+=diff>0?' <span class="over">(예산 +'+won(diff)+')</span>':' (예산 안)'}first.push(line)}
   if(first.length)parts.push(first.join(' · '));
   const cb=catBudgets(),over=Object.entries(cb).filter(([c,v])=>v>0&&sum(expenses(d,m).filter(t=>t.category===c))>v).map(([c])=>c);
   if(over.length)parts.push('<span class="over">'+over.map(esc).join('·')+' 예산 초과</span>');
   pace.innerHTML=parts.join('<br>');pace.hidden=!parts.length;
  };

  // 9. Net-worth trend from the daily records the app already keeps.
  const assetsCard=null,analysisView=$('fmAssetAnalysisView');
  const trend=el('div','card fm-card-x','<div class="fm-trend-head"><h3>순자산 추이</h3><strong id="fmTrendDelta"></strong></div><div class="fm-trend" id="fmTrend" role="img" aria-label="최근 12개월 순자산"></div><p class="mini" id="fmTrendNote" style="margin-top:8px"></p>');trend.id='fmTrendCard';
  if(analysisView)analysisView.prepend(trend);else if(assetsCard)assetsCard.after(trend);
  const renderTrend=()=>{
   const d=load(),last=new Map();
   for(const s of d.snapshots||[])if(s&&typeof s.month==='string'&&Number.isFinite(Number(s.amount)))last.set(s.month,Number(s.amount));
   for(const s of [...(d.dailySnapshots||[])].sort((a,b)=>String(a.day).localeCompare(String(b.day))))if(s&&typeof s.day==='string'&&Number.isFinite(Number(s.amount)))last.set(s.day.slice(0,7),Number(s.amount));
   const months=[...last.keys()].sort().slice(-12),host=$('fmTrend');if(!host)return;
   if(months.length<2){
    // Fewer than two months: show the daily records instead of an empty chart.
    const days=[...(d.dailySnapshots||[])].filter(s=>s&&typeof s.day==='string'&&Number.isFinite(Number(s.amount))).sort((a,b)=>a.day.localeCompare(b.day)).slice(-30);
    if(days.length<2){host.innerHTML='';$('fmTrendDelta').textContent='';$('fmTrendNote').textContent='이틀 이상 기록되면 추이를 보여 드려요. 앱을 열 때마다 자동으로 기록돼요.';return}
    const vals=days.map(s=>Number(s.amount)),max=Math.max(...vals),min=Math.min(...vals),span=Math.max(1,max-min*0.98);
    host.innerHTML=days.map((s,i)=>'<div title="'+s.day+' '+won(vals[i])+'"><i style="height:'+Math.max(6,(vals[i]-min*0.98)/span*100).toFixed(1)+'%"></i><span>'+(i===0||i===days.length-1||i%7===0?Number(s.day.slice(8)):'')+'</span></div>').join('');
    const diff=vals.at(-1)-vals[0];$('fmTrendDelta').className=diff>=0?'fm-up':'fm-down';$('fmTrendDelta').textContent=days.length+'일 동안 '+(diff>=0?'+':'-')+won(Math.abs(diff));
    $('fmTrendNote').textContent='일별 기록 기준 · 다음 달부터는 월별로 보여 드려요.';return}
   const vals=months.map(m=>last.get(m)),max=Math.max(...vals,1),min=Math.min(...vals,0);
   host.innerHTML=months.map((m,i)=>'<div title="'+m+' '+won(vals[i])+'"><i style="height:'+Math.max(4,(vals[i]-Math.min(0,min))/(max-Math.min(0,min))*100).toFixed(1)+'%"></i><span>'+Number(m.slice(5))+'월</span></div>').join('');
   const diff=vals.at(-1)-vals.at(-2);$('fmTrendDelta').className=diff>=0?'fm-up':'fm-down';$('fmTrendDelta').textContent='전월 대비 '+(diff>=0?'+':'-')+won(Math.abs(diff));
   $('fmTrendNote').textContent='각 달의 마지막 기록 기준이에요.';
  };

  // 10. Import nudge: after 7 days the home import button turns primary.
  const sync=$('fmHomeSync'),note=$('fmHomeSyncNote');
  const nudge=()=>{if(!sync||!note)return;const due=note.classList.contains('due');sync.classList.toggle('primary',due);sync.classList.toggle('secondary',!due)};
  if(note)new MutationObserver(nudge).observe(note,{attributes:true,attributeFilter:['class'],childList:true});

  // Pull down on 홈 or 자산 to refresh quotes and net worth.
  const pill=el('div','',null);pill.id='fmPull';pill.setAttribute('aria-live','polite');document.body.append(pill);
  let startY=null,pulled=0,busy=false;
  const active=()=>{const v=document.querySelector('.view.active');return v&&(v.id==='view-home'||v.id==='view-assets')&&!document.querySelector('.modalbg.show')&&!document.getElementById('fmAsk')?.matches(':not([hidden])')};
  addEventListener('touchstart',e=>{startY=(scrollY<=0&&active()&&!busy&&e.touches.length===1)?e.touches[0].clientY:null;pulled=0},{passive:true});
  addEventListener('touchmove',e=>{if(startY==null)return;pulled=Math.max(0,e.touches[0].clientY-startY);if(scrollY>0){startY=null;pill.style.transform='';return}const y=Math.min(pulled*0.5,70)-56;pill.style.transform='translate(-50%,'+y+'px)';pill.textContent=pulled>110?'↻ 놓으면 순자산 업데이트':'↓ 당겨서 업데이트'},{passive:true});
  addEventListener('touchend',async()=>{if(startY==null)return;startY=null;const go=pulled>110;pill.style.transform='';if(!go||typeof window.fmRefreshNetWorth!=='function')return;
   busy=true;pill.textContent='↻ 순자산 업데이트 중…';pill.classList.add('busy');
   const before=$('netWorth')?.textContent||'';let failed=false,ran=true;try{ran=await window.fmRefreshNetWorth()!==false}catch{failed=true}finally{busy=false;pill.classList.remove('busy');pill.textContent=''}const after=$('netWorth')?.textContent||'';if(ran||failed)window.fmToast?.(failed?'업데이트하지 못했어요. 잠시 후 다시 당겨 주세요':'순자산 '+after+(before&&before!==after?' (업데이트됨)':' · 시세 변동 없음'))},{passive:true});

  const all=()=>{renderPace();renderTrend();nudge()};
  all();
  for(const id of ['heroSpent','netWorth','homeTotalAssets'])if($(id))new MutationObserver(all).observe($(id),{childList:true,characterData:true,subtree:true});
  window.addEventListener('storage',all);
 });
})();
}catch(e){console.error('fm-plan-v3587',e)}


// ===== fm-polish-v3588 — 공통 · 다듬기 =====
try{
/* Data lives per browser: Samsung Internet and Chrome do not share it. Say so where it matters. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const KEY='firemate_browser_note_v1',home=document.getElementById('view-home');if(!home)return;
  try{if(localStorage.getItem(KEY)==='dismissed')return}catch{}
  if(!/SamsungBrowser/i.test(navigator.userAgent))return;
  const note=document.createElement('div');note.className='fm-browser-note';note.id='fmBrowserNote';note.setAttribute('role','note');
  note.innerHTML='<p></p><button type="button" class="secondary">닫기</button>';
  note.querySelector('p').textContent='삼성 인터넷에서 열었어요. 데이터는 브라우저마다 따로 저장돼서, Chrome에서 쓰던 기록은 여기 보이지 않아요. 늘 같은 브라우저(Chrome 권장)로 열어 주세요.';
  note.querySelector('button').onclick=()=>{try{localStorage.setItem(KEY,'dismissed')}catch{}note.remove()};
  home.prepend(note);
 });
})();
}catch(e){console.error('fm-polish-v3588',e)}


// ===== fm-feedback-v3589 — 공통 · 알림(fmToast) =====
try{
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  // Tapping the budget amount opens the same editor as the 수정 button.
  $('fmCalendarBudgetTotal')?.addEventListener('click',()=>$('fmLedgerBudgetEdit')?.click());
  $('heroBudget')?.addEventListener('click',()=>window.fmOpenBudgetEditorHere?.());
 });
})();
}catch(e){console.error('fm-feedback-v3589',e)}


// ===== fm-health-calc-v3590 — 설정 · 건보료 계산기 =====
try{
/* 은퇴 후 지역가입자 건강보험료 추정. Income part follows the published rules (금융소득 1,000만 원
   이하 미반영·초과 시 전액, 공적연금 50%, 그 외 소득 100%); the property part comes from the NHIS
   모의계산 because its 60-grade score table is not reproduced here. Rates are editable. */
(()=>{
 'use strict';
 const KEY='firemate_health_calc_v1';
 const DEFAULTS={finance:'',pension:'',other:'',property:'0',rate:'7.19',care:'13.14'};
 document.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('view-firelife');if(!host)return;
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  const v={...DEFAULTS,...saved};
  const box=document.createElement('details');box.id='fmHealthCalc';box.className='card';
  const field=(id,label,hint,val,step)=>'<label for="fmHc-'+id+'">'+label+(hint?'<small>'+hint+'</small>':'')+'</label><input id="fmHc-'+id+'" inputmode="decimal" autocomplete="off" value="'+val+'"'+(step?' step="'+step+'"':'')+'>';
  box.innerHTML='<summary>🏥 은퇴 후 건강보험료 계산기</summary>'+
   '<p class="fm-hc-note" style="margin-top:0">회사를 그만두면 지역가입자가 돼요. 소득과 재산으로 보험료가 정해져요. 금액은 만원 단위로 넣어 주세요.</p>'+
   '<div class="fm-hc-grid">'+
   field('finance','배당·이자 (연, 만원)','연 1,000만 원 이하면 반영 안 돼요',v.finance)+
   field('pension','공적연금 (연, 만원)','국민연금 등 · 50%만 반영',v.pension)+
   field('other','그 밖의 소득 (연, 만원)','사업·임대·근로·기타 · 전액 반영',v.other)+
   field('property','재산분 (월, 원)','집·전세 등 · 공단 모의계산 결과',v.property)+
   field('rate','건강보험료율 (%)','해마다 바뀌어요',v.rate,'0.01')+
   field('care','장기요양 비율 (%)','건강보험료 대비',v.care,'0.01')+
   '</div><div class="fm-hc-result" id="fmHcResult" aria-live="polite"></div>'+
   '<div class="fm-hc-actions"><button type="button" class="secondary" id="fmHcFill">배당 금액 채우기</button><button type="button" class="primary" id="fmHcApply">생활비 계산에 넣기</button></div>'+
   '<div class="fm-hc-actions" style="grid-template-columns:1fr"><a class="secondary" href="https://www.nhis.or.kr" target="_blank" rel="noopener" style="border:1px solid var(--line);border-radius:12px;text-decoration:none;color:var(--txt)">재산분은 건강보험공단 ‘보험료 모의계산’에서 확인 ↗</a></div>'+
   '<p class="fm-hc-note">추정치예요. 실제 보험료는 공단이 매년 11월 전년도 소득으로 다시 정해요. 연 소득 합계가 2,000만 원 이하이고 재산 요건을 맞추면 가족의 피부양자가 돼 보험료가 없을 수 있어요.</p>';
  const anchor=host.querySelector(':scope>.card');if(anchor)anchor.after(box);else host.append(box);
  const $=id=>box.querySelector('#fmHc-'+id);
  const num=id=>{const n=Number(String($(id).value).replace(/[^\d.]/g,''));return Number.isFinite(n)&&n>0?n:0};
  const won=n=>Math.round(n).toLocaleString('ko-KR')+'원';
  let last=null;
  const calc=()=>{
   const finance=num('finance')*10000,pension=num('pension')*10000,other=num('other')*10000,property=num('property'),rate=num('rate')/100,care=num('care')/100;
   const counted=(finance>10000000?finance:0)+pension*0.5+other;
   const incomePart=Math.floor(counted/12*rate/10)*10;
   const health=incomePart+property,careFee=Math.floor(health*care/10)*10,total=health+careFee;
   last={health,total};
   const dependent=finance+pension+other<=20000000;
   box.querySelector('#fmHcResult').innerHTML=
    '<div class="fm-hc-row"><span>보험료에 반영되는 소득 (연)</span><strong>'+won(counted)+'</strong></div>'+
    '<div class="fm-hc-row"><span>소득분 (월)</span><strong>'+won(incomePart)+'</strong></div>'+
    '<div class="fm-hc-row"><span>재산분 (월)</span><strong>'+won(property)+'</strong></div>'+
    '<div class="fm-hc-row"><span>장기요양보험료 (월)</span><strong>'+won(careFee)+'</strong></div>'+
    '<div class="fm-hc-row fm-hc-total"><span>매달 내는 돈</span><strong>약 '+won(total)+'</strong></div>'+
    (dependent?'<p class="fm-hc-note">연 소득 합계가 2,000만 원 이하예요. 피부양자 요건(재산 등)을 맞추면 보험료가 없을 수 있어요.</p>':'');
   try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(Object.keys(DEFAULTS).map(k=>[k,$(k).value]))))}catch{}
  };
  box.addEventListener('input',calc);calc();
  // Pre-tax yearly payout of the retirement portfolio, read from the 생활비 card itself.
  box.querySelector('#fmHcFill').onclick=()=>{
   const text=host.textContent||'';const m=text.match(/세전\s*((?:\d[\d,]*억\s*)?(?:\d[\d,]*만\s*)?(?:\d[\d,]*)?)\s*원/);
   if(!m){window.fmToast?.('생활비 화면에서 세전 분배금을 찾지 못했어요');return}
   const t=m[1].replace(/\s/g,'');const eok=Number((t.match(/([\d,]+)억/)||[,'0'])[1].replace(/,/g,'')),man=Number((t.match(/([\d,]+)만/)||[,'0'])[1].replace(/,/g,'')),rest=Number((t.replace(/.*만|.*억/,'').match(/^[\d,]+$/)||['0'])[0].replace(/,/g,''));
   const monthly=eok*1e8+man*1e4+rest;if(!(monthly>0)){window.fmToast?.('세전 분배금을 읽지 못했어요');return}
   $('finance').value=String(Math.round(monthly*12/10000));calc();window.fmToast?.('세전 분배금 연 '+Math.round(monthly*12/10000).toLocaleString('ko-KR')+'만 원을 넣었어요');
  };
  // Hand the health-insurance part (without 장기요양, which the app adds itself) to the 생활비 settings.
  box.querySelector('#fmHcApply').onclick=()=>{
   const input=document.getElementById('fmHealthMonthly');if(!input||!last){window.fmToast?.('생활비 설정을 찾지 못했어요');return}
   input.closest('details')?.setAttribute('open','');input.closest('details')?.parentElement?.closest('details')?.setAttribute('open','');
   input.value=String(Math.round(last.health/1000)/10);input.dispatchEvent(new Event('input',{bubbles:true}));
   input.scrollIntoView({block:'center'});
   window.fmToast?.('월 '+input.value+'만 원을 넣었어요. 아래 저장을 눌러 반영하세요');
  };
 });
})();
}catch(e){console.error('fm-health-calc-v3590',e)}


// ===== fm-safety-v3592 — 설정 · 저장 보호, 분류 =====
try{
/* 1. Ask the browser to keep this app's storage (no eviction under storage pressure).
   4. Merchants still under 기타 can be re-categorised in one step from 소비 분석. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const statusLine=document.createElement('p');statusLine.id='fmPersistStatus';
  $('fmBackupStatus')?.after(statusLine);
  const showPersist=async()=>{try{const kept=await navigator.storage?.persisted?.();statusLine.textContent=kept===true?'🔒 저장 보호 켜짐 · 휴대폰이 공간 정리로 지우지 않아요':kept===false?'저장 보호 꺼짐 · 홈 화면에 설치하면 켜질 수 있어요. 백업을 꼭 해 두세요':''}catch{statusLine.textContent=''}};
  (async()=>{try{if(navigator.storage?.persist&&!(await navigator.storage.persisted()))await navigator.storage.persist()}catch{}showPersist()})();
  $('settingsBottom')?.addEventListener('click',showPersist);
  const LISTS={expense:['식비','카페·간식','주거·관리비','교통','쇼핑','의료·건강','문화·취미','통신·구독','여행'],income:['급여','상여금','부수입','배당·이자']};
  const won=n=>'₩'+Math.round(n).toLocaleString('ko-KR');
  const card=document.createElement('div');card.className='card fm-card-x';card.id='fmUncatCard';
  card.innerHTML='<p class="mini" id="fmAutoCatNote" hidden></p><details id="fmUncatFold"><summary id="fmUncatTitle">분류가 필요한 가게</summary><p class="mini">가게 이름으로 분류하지 못한 지출이에요. 한 번 고르면 지난 거래와 다음 가져오기에 모두 적용돼요.</p><div id="fmUncatList"></div></details>';
  const anchor=$('fmFixedList')?.closest('.card')||$('insightCats')?.closest('.card');if(anchor)anchor.after(card);
  const render=()=>{
   let d=fmLiveData();
   const groups=new Map();
   // Income under 기타 수입 (refunds, cashback, 1원 checks) is already a real category, so only spending is asked about.
   for(const t of d.tx||[]){if(!t||t.type!=='expense')continue;const memo=String(t.memo||'').trim();if(!memo||t.category!=='기타'||Number(t.amount)<100)continue;const k=t.type+'|'+memo,g=groups.get(k)||{type:t.type,memo,n:0,sum:0};g.n++;g.sum+=Number(t.amount)||0;groups.set(k,g)}
   const rows=[...groups.values()].sort((a,b)=>b.sum-a.sum).slice(0,8),host=$('fmUncatList');if(!host)return;
   const auto=Number(window.fmAutoCategorized)||0,note=$('fmAutoCatNote');if(note){note.hidden=!auto;if(auto&&!note.dataset.ready){note.dataset.ready='1';note.innerHTML='가게 이름으로 <strong>'+auto+'건</strong>을 자동 분류했어요. <button type="button" class="secondary" id="fmAutoCatUndo">되돌리기</button>';note.querySelector('button').onclick=()=>{const n=window.fmUndoAutoCategorize?.();window.fmAutoCategorized=0;note.hidden=true;window.fmToast?.(n?n+'건을 기타로 되돌렸어요':'되돌릴 기록이 없어요');render()}}}
   card.hidden=!rows.length&&!auto;const title=$('fmUncatTitle');if(title)title.textContent='분류가 필요한 가게 '+rows.length+'곳';const fold=$('fmUncatFold');if(fold)fold.hidden=!rows.length;
   host.replaceChildren(...rows.map(g=>{const row=document.createElement('div');row.className='fm-uncat-row';
    row.innerHTML='<div><strong></strong><span></span></div><select aria-label="분류 선택"><option value="">분류 선택</option>'+LISTS[g.type].map(c=>'<option>'+c+'</option>').join('')+'</select><button type="button" class="secondary">적용</button>';
    row.querySelector('strong').textContent=g.memo;row.querySelector('span').textContent=(g.type==='income'?'수입 ':'')+g.n+'건 · '+won(g.sum);
    row.querySelector('button').onclick=()=>{const c=row.querySelector('select').value;if(!c){window.fmToast?.('분류를 먼저 골라 주세요');return}const n=window.fmRecategorizeMerchant?.(g.type,g.memo,c);window.fmToast?.(n>0?g.memo+' '+n+'건을 '+c+'(으)로 바꿨어요':'바꾸지 못했어요');render()};
    return row}));
  };
  render();
  for(const id of ['heroSpent','netWorth'])if($(id))new MutationObserver(render).observe($(id),{childList:true,characterData:true,subtree:true});
 });
})();
}catch(e){console.error('fm-safety-v3592',e)}


// ===== fm-search-report-v3593 — 가계부·홈 · 검색, 월간 리포트 =====
try{
/* 7. In the first week of a month, home shows last month's closing in one card until dismissed. */
(()=>{
 'use strict';
 const KEY='firemate_month_report_v1';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const home=$('view-home'),fire=home?.querySelector('.fm-home-fire');if(!home||!fire)return;
  // Browser tests opt in explicitly so first-week dates never shift other layouts.
  const now=new Date();if(navigator.webdriver?!window.__fmMonthReportAnyDay:now.getDate()>7)return;
  const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const prev=ym(new Date(now.getFullYear(),now.getMonth()-1,1)),before=ym(new Date(now.getFullYear(),now.getMonth()-2,1));
  try{if(localStorage.getItem(KEY)===prev)return}catch{}
  let d=fmLiveData();
  const rows=(d.tx||[]).filter(t=>t&&typeof t.date==='string'&&t.date.slice(0,7)===prev);if(!rows.length)return;
  const sum=type=>rows.filter(t=>t.type===type).reduce((a,t)=>a+(Number(t.amount)||0),0),out=sum('expense'),inc=sum('income');
  const cats={};for(const t of rows)if(t.type==='expense')cats[t.category]=(cats[t.category]||0)+(Number(t.amount)||0);
  const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  const budget=Number(d.budgets?.[prev])||0;
  const lastOf=m=>{const v=(d.dailySnapshots||[]).filter(x=>x&&typeof x.day==='string'&&x.day.slice(0,7)===m).sort((a,b)=>a.day.localeCompare(b.day)).at(-1);return v?Number(v.amount):null};
  const nw=lastOf(prev),nwBefore=lastOf(before);
  const won=n=>'₩'+Math.round(Math.abs(n)).toLocaleString('ko-KR');
  const line=(label,value,cls='')=>'<div class="fm-mr-row"><span>'+label+'</span><strong class="'+cls+'">'+value+'</strong></div>';
  const card=document.createElement('section');card.className='card';card.id='fmMonthReport';card.setAttribute('aria-labelledby','fmMonthReportTitle');
  card.innerHTML='<h3 id="fmMonthReportTitle">'+Number(prev.slice(5))+'월 결산</h3>'+
   line('지출',won(out))+line('수입',won(inc))+line('남은 돈',(inc-out<0?'-':'')+won(inc-out),inc-out>=0?'fm-mr-good':'fm-mr-bad')+
   (budget?line('예산 '+won(budget),out<=budget?won(budget-out)+' 아꼈어요':won(out-budget)+' 넘었어요',out<=budget?'fm-mr-good':'fm-mr-bad'):'')+
   (top?line('가장 많이 쓴 곳',top[0]+' '+won(top[1])):'')+
   (nw!==null&&nwBefore!==null?line('순자산 변화',(nw>=nwBefore?'+':'-')+won(nw-nwBefore),nw>=nwBefore?'fm-mr-good':'fm-mr-bad'):'')+
   '<div class="fm-mr-actions"><button type="button" class="secondary" id="fmMonthReportOpen">월간 결산 자세히 →</button><button type="button" class="secondary" id="fmMonthReportClose">닫기</button></div>';
  fire.before(card);
  card.querySelector('#fmMonthReportOpen').onclick=()=>window.fmGo?.('monthly');
  card.querySelector('#fmMonthReportClose').onclick=()=>{try{localStorage.setItem(KEY,prev)}catch{}card.remove()};
 });
})();
}catch(e){console.error('fm-search-report-v3593',e)}


// ===== fm-habits-v3594 — 홈 · 습관(오늘, 주간, 무지출) =====
try{
/* Habit loop: weekly report (Mon–Tue), no-spend days and streak, net-worth milestones, and
   home-screen shortcuts (?action=import|record). Reads saved data only; marks live in their own keys. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const load=fmLiveData;
  const won=n=>'₩'+Math.round(Math.abs(n)).toLocaleString('ko-KR');
  const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const home=$('view-home'),fire=home?.querySelector('.fm-home-fire');
  const testOnly=flag=>navigator.webdriver&&!window[flag];
  // Weekly report: last Monday–Sunday versus the week before.
  (()=>{const now=new Date(),dow=now.getDay();if(!home||!fire)return;if(navigator.webdriver?!window.__fmWeekReportAnyDay:!(dow===1||dow===2))return;
   const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((dow+6)%7));const start=new Date(monday);start.setDate(start.getDate()-7);const prevStart=new Date(start);prevStart.setDate(prevStart.getDate()-7);
   const key=ds(start);try{if(localStorage.getItem('firemate_week_report_v1')===key)return}catch{}
   const tx=(load().tx||[]).filter(t=>t&&t.type==='expense'&&typeof t.date==='string');
   const inRange=(a,b)=>tx.filter(t=>t.date>=ds(a)&&t.date<ds(b));
   const week=inRange(start,monday),before=inRange(prevStart,start);if(!week.length)return;
   const total=r=>r.reduce((a,t)=>a+(Number(t.amount)||0),0),w=total(week),p=total(before);
   const cats={};for(const t of week)cats[t.category]=(cats[t.category]||0)+(Number(t.amount)||0);const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
   const spentDays=new Set(week.map(t=>t.date)).size;
   const card=document.createElement('section');card.className='card';card.id='fmWeekReport';
   const row=(l,v,c='')=>'<div class="fm-wr-row"><span>'+l+'</span><strong class="'+c+'">'+v+'</strong></div>';
   card.innerHTML='<h3>지난주 리포트 · '+(start.getMonth()+1)+'/'+start.getDate()+'~'+(new Date(monday.getTime()-864e5).getMonth()+1)+'/'+new Date(monday.getTime()-864e5).getDate()+'</h3>'+row('지출',won(w))+(p?row('전주 대비',(w>=p?'+':'-')+won(w-p)+' ('+Math.round(Math.abs(w-p)/p*100)+'%)',w>p?'fm-wr-up':'fm-wr-down'):'')+(top?row('가장 많이 쓴 곳',top[0]+' '+won(top[1])):'')+row('무지출',(7-spentDays)+'일')+'<button type="button" class="secondary">확인했어요</button>';
   (($('fmMonthReport'))||fire).before(card);
   card.querySelector('button').onclick=()=>{try{localStorage.setItem('firemate_week_report_v1',key)}catch{}card.remove()};
  })();
  // Net-worth milestones: celebrate a newly crossed line once; the first run only records the current one.
  (()=>{if(!home||!fire||navigator.webdriver&&!window.__fmMilestoneTest)return;const LINES=[1e7,3e7,5e7,1e8,1.5e8,2e8,3e8,4e8,5e8,6.5e8,1e9,1.5e9,2e9];
   const snaps=(load().dailySnapshots||[]).filter(x=>x&&Number.isFinite(Number(x.amount))).sort((a,b)=>String(a.day).localeCompare(String(b.day)));const latest=snaps.at(-1);if(!latest)return;
   const amount=Number(latest.amount),reached=LINES.filter(v=>amount>=v).at(-1)||0;
   let seen=null;try{seen=localStorage.getItem('firemate_milestone_v1')}catch{}
   if(seen===null){try{localStorage.setItem('firemate_milestone_v1',String(reached))}catch{}return}
   if(!(reached>Number(seen)))return;
   const next=LINES.find(v=>v>amount),label=v=>v>=1e8?(v/1e8)+'억':(v/1e4).toLocaleString('ko-KR')+'만';
   const card=document.createElement('section');card.className='card';card.id='fmMilestone';
   card.innerHTML='<h3>🎉 순자산 '+label(reached)+' 돌파!</h3><p>'+(next?'다음 목표 '+label(next)+'까지 '+won(next-amount)+' 남았어요.':'정해 둔 목표를 모두 넘었어요.')+'</p><button type="button" class="primary">좋아요</button>';
   home.querySelector('.card,.hero')?.after(card);
   card.querySelector('button').onclick=()=>{try{localStorage.setItem('firemate_milestone_v1',String(reached))}catch{}card.remove()};
  })();
  // No-spend days on the calendar, only inside the range the records cover.
  const line=document.createElement('p');line.id='fmNoSpendLine';$('view-calendar')?.querySelector('.fm-ledger-compare')?.append(line);
  const marks=()=>{const d=load(),tx=(d.tx||[]).filter(t=>t&&typeof t.date==='string');if(!tx.length){line.hidden=true;return}
   const spend=new Set(tx.filter(t=>t.type==='expense').map(t=>t.date)),dates=tx.map(t=>t.date).sort(),first=dates[0],last=dates.at(-1),todayKey=ds(new Date());
   const known=day=>day>=first&&day<=last&&day<=todayKey;
   document.querySelectorAll('#view-calendar .day[data-date]').forEach(el=>el.classList.toggle('fm-nospend',known(el.dataset.date)&&!spend.has(el.dataset.date)));
   const m=todayKey.slice(0,7);let count=0;for(let i=1;i<=31;i++){const day=m+'-'+String(i).padStart(2,'0');if(known(day)&&!spend.has(day))count++}
   let streak=0;for(let x=new Date(last+'T12:00:00');ds(x)>=first;x.setDate(x.getDate()-1)){if(spend.has(ds(x)))break;streak++}
   line.hidden=false;line.innerHTML='이번 달 무지출 <strong>'+count+'일</strong>'+(streak?' · 연속 <strong>'+streak+'일</strong> 🌱':'')+(last<todayKey?' · '+Number(last.slice(5,7))+'/'+Number(last.slice(8))+'까지 기록 기준':'');
  };
  const cal=$('cal');if(cal){new MutationObserver(marks).observe(cal,{childList:true});marks()}
  // Home-screen shortcuts.
  const action=new URLSearchParams(location.search).get('action');
  if(action){history.replaceState(history.state,'',location.pathname);setTimeout(()=>{if(action==='import')window.fmImportFromHome?.();else if(action==='record')window.fmOpenEntry?.()},300)}
 });
})();
}catch(e){console.error('fm-habits-v3594',e)}


// ===== fm-design-v3596 — 공통 · 디자인 =====
try{
/* Design pass: one quiet home total, short quote failures on 자산, an approximate 만/억 reading
   next to the two big totals, and a softer colour for planned shortfalls on FIRE. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const approx=n=>{const v=Math.round(Math.abs(n)/10000);if(!v)return '';const e=Math.floor(v/10000),m=v%10000;return (n<0?'-':'')+(e?e+'억'+(m?' ':''):'')+(m?m.toLocaleString('ko-KR')+'만':'')+' 원'};
  // 3. "약 9,467만 원" rides on the label line, so card heights do not change.
  for(const id of ['homeTotalAssets','netWorth']){
   const big=$(id),card=big?.closest('.card,.hero');if(!big||!card)continue;
   const label=[...card.querySelectorAll('span,small,div,strong,p')].find(e=>e.childElementCount===0&&e.textContent.trim()==='전체 순자산');if(!label)continue;
   const tag=document.createElement('span');tag.className='fm-approx';label.append(tag);
   const sync=()=>{const raw=String(big.textContent||'').replace(/[^\d-]/g,'');const n=Number(raw);tag.textContent=raw&&Number.isFinite(n)&&Math.abs(n)>=10000?' · 약 '+approx(n):''};
   new MutationObserver(sync).observe(big,{childList:true,characterData:true,subtree:true});sync();
  }
  // 2. The retry button lives inside the failure details instead of under the summary.
  const retry=$('retryStocks'),list=$('fmQuoteFailuresList');if(retry&&list)list.after(retry);
  // 4. A planned shortfall is a warning, not an error.
  const cash=$('fmOverview-cashflow');if(cash){const tone=()=>{const v=cash.querySelector('strong');if(v&&/부족/.test(v.textContent)&&v.style.color!=='var(--yellow)')v.style.color='var(--yellow)'};new MutationObserver(tone).observe(cash,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style']});tone()}
 });
})();
}catch(e){console.error('fm-design-v3596',e)}


// ===== fm-start-v3597 — 홈 · 시작 화면, 예시 데이터 =====
try{
/* First run: choose how to start (example data / record by hand / 뱅크샐러드). Example data is
   offered only while nothing is saved, and leaving it clears it. Plus a "1년 앞당기려면" line on FIRE. */
(()=>{
 'use strict';
 const K='firemate_smart_v3',CHOICE='firemate_start_choice_v1',DEMO='firemate_demo_mode_v1';
 const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 function sample(){
  const tx=[],now=new Date(),shops=[['식비','김밥천국',8500],['카페·간식','스타벅스',5800],['교통','지하철',1550],['쇼핑','쿠팡',23900],['식비','배달의민족',21000],['문화·취미','CGV',14000]];
  for(let n=0;n<75;n++){const day=new Date(now);day.setDate(day.getDate()-n);const k=ds(day);if(n%6===4)continue;
   for(let j=0;j<1+(n%3===0?1:0);j++){const [c,m,a]=shops[(n*2+j)%shops.length];tx.push({id:'demo-'+n+'-'+j,date:k,type:'expense',category:c,amount:a+((n*137)%9)*100,memo:m})}
   if(day.getDate()===25)tx.push({id:'demo-pay-'+n,date:k,type:'income',category:'급여',amount:3200000,memo:'월급'});
   if(day.getDate()===5)tx.push({id:'demo-tel-'+n,date:k,type:'expense',category:'통신·구독',amount:55000,memo:'휴대폰 요금'})}
  const snaps=[];for(let n=89;n>=0;n--){const day=new Date(now);day.setDate(day.getDate()-n);snaps.push({day:ds(day),amount:52000000+(89-n)*95000+((n*7919)%11)*40000,recordedAt:day.toISOString()})}
  const month=ds(now).slice(0,7);
  return {theme:'dark',tx,rec:[],favorites:[],budgets:{[month]:1500000},fire:{asset:5500,goal:65000,monthly:250,rate:6,withdrawal:4},balance:{fx:1400,cash:0,other:0,debt:0},
   accounts:[{id:'demo-bank',name:'예시 입출금',kind:'cash',amount:8500000},{id:'demo-invest',name:'예시 투자 계좌',kind:'investment',amount:46000000,fire:true}],holdings:[],dailySnapshots:snaps,snapshots:[]};
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id),home=$('view-home');if(!home)return;
  let demo=false;try{demo=localStorage.getItem(DEMO)==='1'}catch{}
  if(demo){const bar=document.createElement('div');bar.className='fm-demo-bar';bar.id='fmDemoBar';bar.innerHTML='<span>예시 데이터로 둘러보는 중이에요</span><button type="button" class="primary">내 데이터로 시작</button>';home.prepend(bar);
   bar.querySelector('button').onclick=async()=>{if(window.fmAsk&&!await window.fmAsk('예시 데이터를 지우고 빈 상태에서 시작할까요?',{ok:'시작',cancel:'취소'}))return;try{localStorage.removeItem(K);localStorage.removeItem(DEMO);localStorage.setItem(CHOICE,'manual')}catch{}location.reload()};}
  // First visit with nothing saved: one card with three ways to start (tests opt in explicitly).
  let d={};try{d=JSON.parse(localStorage.getItem(K)||'{}')||{}}catch{}
  const empty=!(d.tx||[]).length&&!(d.holdings||[]).length&&!(d.accounts||[]).some(a=>Number(a?.amount)>0);
  let chosen=null;try{chosen=localStorage.getItem(CHOICE)}catch{}
  if(!demo&&empty&&!chosen&&(!navigator.webdriver||window.__fmStartTest)){
   const card=document.createElement('section');card.className='card fm-start';card.id='fmStart';
   card.innerHTML='<h3>어떻게 시작할까요?</h3><p class="mini">언제든 바꿀 수 있어요.</p><div class="fm-start-options"><button type="button" data-start="demo"><strong>👀 예시로 둘러보기</strong><span>샘플 데이터로 화면을 먼저 봐요</span></button><button type="button" data-start="manual"><strong>✍️ 직접 기록으로 시작</strong><span>은행 연결 없이 손으로 적어요</span></button><button type="button" data-start="bank"><strong>📥 뱅크샐러드 연결</strong><span>Gmail로 받은 내역을 가져와요</span></button></div>';
   home.prepend(card);
   card.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{const how=b.dataset.start;try{localStorage.setItem(CHOICE,how)}catch{}
    if(how==='demo'){try{localStorage.setItem(K,JSON.stringify(sample()));localStorage.setItem(DEMO,'1')}catch{window.fmToast?.('예시 데이터를 넣지 못했어요');return}location.reload();return}
    card.remove();if(how==='manual')window.fmOpenEntry?.();else window.fmImportFromHome?.()});
  }
  // FIRE: how much more a month brings the date one year closer (same monthly compounding as the plan).
  const sooner=document.createElement('p');sooner.id='fmFireSooner';sooner.className='fm-fire-sooner';
  ($('fmRetirementETA')||$('fireYears'))?.after(sooner);
  const months=(asset,monthly,rate,goal)=>{const r=Math.pow(1+rate/100,1/12)-1;let v=asset;for(let i=0;i<=1200;i++){if(v>=goal)return i;v=v*(1+r)+monthly}return Infinity};
  const sync=()=>{const p=window.fmFireViewState?.plan;sooner.textContent='';if(!p||!(p.goal>0))return;const asset=Number(p.net)/10000,base=months(asset,p.monthly,p.rate,p.goal);if(!Number.isFinite(base)||base<=12)return;
   let lo=p.monthly,hi=Math.max(p.monthly*4,p.goal);for(let k=0;k<40;k++){const mid=(lo+hi)/2;if(months(asset,mid,p.rate,p.goal)<=base-12)hi=mid;else lo=mid}
   const extra=Math.ceil(hi-p.monthly);if(extra>0&&extra<100000)sooner.textContent='1년 앞당기려면 매달 '+extra.toLocaleString('ko-KR')+'만 원 더 모으면 돼요.'};
  document.addEventListener('fm-fire-view-updated',sync);sync();
 });
})();
}catch(e){console.error('fm-start-v3597',e)}
