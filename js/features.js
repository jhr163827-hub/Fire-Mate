// FIRE MATE 기능 모음. index.html의 메인 스크립트 다음에 순서대로 실행된다(순서 유지 필요).
// 새 기능은 블록을 덧붙이지 말고 해당 화면 블록을 고친다. 블록마다 오류가 나도 다른 기능은 계속 돈다.
//
//   1. fm-layout — FIRE·은퇴·자산 · 화면 동작
//   2. fm-ledger-keyboard — 가계부 · 입력 키보드
//   3. fm-premium-finance-ui — FIRE·홈·자산·가계부 · 결정 중심 화면 동작
//   4. fm-strategy-conclusion — FIRE · 전략 비교
//   5. fm-practical-fixes — 공통 · 시세 버튼, 백업 알림
//   6. fm-ledger-sync — 설정 · Gmail·파일 가져오기
//   7. fm-daily-fixes-v3586 — 설정 · 소액 수입, 분류 정리
//   8. fm-plan-v3587 — 홈·자산 · 당겨서 업데이트
//   9. fm-health-calc-v3590 — 설정 · 건보료 계산기
//  10. fm-safety-v3592 — 설정 · 저장 보호, 분류
//  11. fm-design-v3596 — 홈·자산 · 약 N만 원 표시
//  12. fm-start-v3597 — 홈 · 시작 화면, 예시 데이터


// ===== fm-layout — FIRE·은퇴·자산 · 화면 동작 =====
try{
/* The FIRE, retirement and asset screens are laid out in index.html. This block keeps their behaviour:
   overview values, the retirement save bar, tidying of re-rendered results and the FIRE screen tabs. */
document.addEventListener('DOMContentLoaded',()=>{
 try{
 const $=id=>document.getElementById(id);
 const fireView=$('view-fire');
 if(fireView){
  const sync=()=>{
   const state=window.fmFireViewState||{};
   const metric=(id,x)=>{const h=$(id),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=x?.value||'—';small.textContent=x?.note||'';h.replaceChildren(strong,small)};
   metric('fmOverview-cashflow',state.cashflow?{value:state.cashflow.statusValue,note:state.cashflow.statusNote}:null);
   const cashValue=document.querySelector('#fmOverview-cashflow>strong');if(cashValue)cashValue.style.color=state.cashflow?.monthlyRemaining<0?'var(--red)':'var(--green)';
   // A planned shortfall is a warning, not an error.
   if(cashValue&&/부족/.test(cashValue.textContent))cashValue.style.color='var(--yellow)';
   metric('fmOverview-portfolio',state.portfolio?{value:state.portfolio.value,note:'목표 구성과 실제 보유 비교 · 금액 목표와 별개'}:null);
   $('fmOpenCalculator').textContent=state.draft?.dirty?'조건 비교 •':'조건 비교';$('fmOpenCalculator').setAttribute('aria-label',state.draft?.dirty?'조건 비교 · 미저장 조건 이어보기':'조건 비교');
   const p=state.plan;if(p)$('fmFireBasisNote').textContent='저장 계획 · 월 '+Number(p.monthly).toLocaleString('ko-KR')+'만 원 투자 · 연 '+p.rate+'% 가정'+(p.net<0?' · 음수 운용자산은 남은 금액·도달 계산에서 0으로 가정':'');
   const difference=$('fmFirePlanDifference'),different=p&&state.portfolio&&Math.abs(p.goal-state.portfolio.totalTarget)>0.01;
   difference.hidden=!different;if(different)difference.textContent='금액 목표와 배분 합계가 달라요. 생활비는 목표 배분 기준입니다.';
   $('fmOverview-strategy').textContent=state.mode==='detail'?(state.detail?.text||'종목별 장기 비교 · 조건 확인 후 계산'):'배당·자산 매도 비교 · 저장 계획에 미반영';
   $('fmForecastSummaryValue').textContent=state.forecast?.summaryValue||'—';
   $('fmForecastSummaryDate').textContent=state.forecast?.summaryDate||'';
  };
  document.addEventListener('fm-fire-view-updated',sync);
  sync();
 }
 const retirement=$('view-retire');
 if(retirement){
  const portfolio=$('fmRetirePortfolio'),life=$('fmRetireCashflow'),scenario=$('fmLifeScenario'),conditions=$('fmLifeConditions'),form=conditions.querySelector(':scope>.stack');
  const body=$('fmRpEditBody'),toggle=$('fmRpEditToggle'),save=$('rpSave'),cancel=$('fmRetireCancel'),savebar=$('fmRetireSaveBar');
  $('rpTotal').hidden=true;
  $('fmRetireBack').onclick=()=>document.querySelector('.bottomnav [data-view="fire"]').click();
  const setScope=scope=>{save.dataset.scope=scope;save.textContent=scope==='portfolio'?'목표 배분만 저장':'월 생활비 저장';cancel.setAttribute('aria-label',scope==='portfolio'?'목표 배분 변경 취소':'생활 조건 변경 취소')};
  const updateSave=()=>{const scope=save.dataset.scope;if($('view-firelife')?.classList.contains('active')){setScope('life');savebar.hidden=!conditions.open;return}if($('view-retire')?.classList.contains('active')){setScope('portfolio');savebar.hidden=body.hidden;return}if(scope==='portfolio'&&body.hidden&&conditions.open)setScope('life');else if(scope==='life'&&!conditions.open&&!body.hidden)setScope('portfolio');savebar.hidden=body.hidden&&!conditions.open};
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
  const settings=document.getElementById('fmStrategyDetails'),quick=document.getElementById('fmQuickResult'),detail=document.getElementById('fmStrResult');
  detail.hidden=true;
  const tidyQuick=()=>{if(quick.querySelector('.fm-quick-assumptions'))return;const ps=[...quick.querySelectorAll(':scope>p')];if(!ps.length)return;const d=document.createElement('details');d.className='fm-quick-assumptions';d.innerHTML='<summary>비교 가정·세금 기준</summary>';ps.forEach(n=>d.append(n));quick.append(d)};
  const tidyDetail=()=>{const model=detail.querySelector('.fm-str-model-summary');if(!model)return;
   if(!detail.querySelector('.fm-str-annual-details')){const fold=document.createElement('details');fold.className='fm-str-annual-details';fold.innerHTML='<summary>비교에 사용한 종목·연간 요약</summary>';while(detail.firstChild&&detail.firstChild!==model)fold.append(detail.firstChild);detail.insertBefore(fold,model)}
   const assumptions=model.querySelector(':scope>details');const longNote=[...model.querySelectorAll(':scope>p')].find(p=>p.textContent.startsWith('배당 잉여금'));if(assumptions&&longNote)assumptions.append(longNote);
   const end=model.nextElementSibling;if(end?.classList.contains('fm-str-final-balances')){const d=document.createElement('details');d.className='fm-str-end-details';d.innerHTML='<summary>최종 잔액·세금 영향 자세히</summary>';end.before(d);d.append(end)}
  };
  new MutationObserver(tidyQuick).observe(quick,{childList:true});new MutationObserver(tidyDetail).observe(detail,{childList:true});tidyQuick();tidyDetail();
  document.addEventListener('click',e=>{if(e.target?.id==='fmQuickRun'&&quick.querySelector('strong')||e.target?.id==='fmStrRun'&&detail.querySelector('.fm-str-model-summary')){settings.open=false;setTimeout(()=>(e.target.id==='fmQuickRun'?quick:detail).scrollIntoView({block:'start',behavior:'instant'}),0)}});
 }
 // FIRE screen tabs: 현황 and 생활비. 계획 조정 and 전략·위험 open from 현황, so those screens keep 현황 lit.
 for(const button of document.querySelectorAll('.fm-fire-screen-nav [data-fire-screen]'))button.onclick=()=>document.dispatchEvent(new CustomEvent('fm-fire-navigate',{detail:button.dataset.fireScreen}));
 $('fmOverview-strategy').hidden=true;$('fmOverview-portfolio').hidden=true;$('fmFirePortfolioOpen').hidden=true;document.querySelector('#view-fire .fm-fire-calc-card').hidden=true;
 const originalSync=window.fmSyncFireScreens;
 window.fmSyncFireScreens=view=>{
  originalSync?.(view);
  document.querySelectorAll('.fm-fire-screen-nav [data-fire-screen]').forEach(b=>b.setAttribute('aria-current',b.dataset.fireScreen===({firecalc:'fire',retire:'fire'}[view]||view)?'page':'false'));
  const bar=$('fmRetireSaveBar');if(view==='firelife'||view==='retire'){
   $('view-'+view).append(bar);
   document.dispatchEvent(new CustomEvent('fm-fire-save-scope',{detail:view==='firelife'?'life':'portfolio'}));
  }
 };
 window.fmSyncFireScreens(document.querySelector('.view.active')?.id.replace('view-',''));
 const assets=$('view-assets');
 if(assets){
  const oldTabs=$('fmLegacyAssetTabs');if(oldTabs){oldTabs.hidden=true;oldTabs.style.display='none'}
  const divPanel=$('fmDividendPanel');if(divPanel)divPanel.hidden=false;
  for(const [id,mode] of [['fmAssetQuickAccounts','account'],['fmAssetQuickHoldings','holding'],['fmAssetQuickDividend','dividend'],['fmAssetQuickAnalysis','analysis']]){
   const btn=$(id);
   if(btn)btn.onclick=()=>window.fmSelectAssetView(mode);
  }
  window.fmSelectAssetView(typeof fmAssetView==='string'?fmAssetView:'account');
 window.fmRefreshGoalNotes?.();
 }
 }catch(e){console.warn('Layout refinement:',e)}
});
}catch(e){console.error('fm-layout',e)}


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


// ===== fm-premium-finance-ui — FIRE·홈·자산·가계부 · 결정 중심 화면 동작 =====
try{
/* Decision-first presentation; the structure is in index.html. Finance calculations and persistence remain in their existing owners. */
(() => {
 'use strict';
 document.addEventListener('DOMContentLoaded', () => {
  const $=id=>document.getElementById(id);
  const navigate=view=>document.dispatchEvent(new CustomEvent('fm-fire-navigate',{detail:view}));
  const compactMoney=n=>{const v=Math.round(n),e=Math.floor(v/10000),m=v%10000;return (e?e+'억 ':'')+(m?m.toLocaleString('ko-KR')+'만 ':'')+(e||m?'원':'0원')};
  // Amounts in 만원; 1억 and above read as 억 (6억 5,000만 원), never 65,000만 원.
  const money=n=>Math.round(n)===0?'0만 원':(Math.round(n)<0?'-':'')+compactMoney(Math.abs(n));
  const eta=$('fmRetirementETA'),portfolioValue=$('fmOverview-portfolio'),riskBasis=$('fmStressBasis'),basis=$('fmComparisonBasis');
  const conditions=$('fmLifeConditions'),advanced=$('fmUniformExperimentInputs'),draftStatus=$('fmLifeExpenseStatus');
  // The FIRE screen layout hides these two until this block shows them in the overview.
  $('fmFirePortfolioOpen').hidden=false;portfolioValue.hidden=false;
  $('fmFireRiskOpen').onclick=()=>{navigate('retire');$('fmLifeScenario').open=true;requestAnimationFrame(()=>$('fmModelBridge').scrollIntoView({block:'start',behavior:'instant'}))};
  document.querySelector('#fmLifeScenario .fm-stress-edit').onclick=()=>{advanced.open=true;requestAnimationFrame(()=>$('rpCrash').focus())};
  $('fmSaveExperiment').onclick=()=>{const button=$('rpSave'),scope=button.dataset.scope;button.dataset.scope='experiment';button.onclick();button.dataset.scope=scope};
  $('fmCancelExperiment').onclick=()=>{document.dispatchEvent(new CustomEvent('fm-retirement-cancel',{detail:{scope:'experiment'}}));advanced.open=false};
  document.addEventListener('fm-retirement-saved',e=>{if(e.detail?.scope==='experiment'){advanced.open=false;requestAnimationFrame(()=>$('fmLifeScenario').scrollIntoView({block:'start',behavior:'instant'}))}});
  const updateExpense=()=>{const value=$('rpMonthly').value.trim(),saved=window.fmFireViewState?.plan?.lifeMonthly,dirty=value===''||Number(value.replace(/,/g,''))!==saved;draftStatus.textContent=dirty?'월 생활비 수정 중 · 저장 전 결과는 유지됩니다':'저장된 월 생활비 · 목표 배분과 실험에 공통 적용';if($('view-firelife').classList.contains('active'))$('rpSave').disabled=!dirty};
  $('rpMonthly').addEventListener('input',updateExpense);conditions.addEventListener('toggle',updateExpense);
  const originalFireSync=window.fmSyncFireScreens;window.fmSyncFireScreens=view=>{originalFireSync?.(view);if(view==='firelife')updateExpense();else $('rpSave').disabled=false};
  // The income form remains a separate atomic save, with no overlapping expense fields.
  const income=$('fmFireLife');
  const updateIncome=()=>{const editor=$('fmDividendEditor');if(!editor)return;const cash=window.fmFireViewState?.cashflow;let limit=$('fmLifeInputLimits');if(!limit){limit=document.createElement('p');limit.id='fmLifeInputLimits';limit.className='mini';editor.before(limit)}limit.textContent=cash?.missingYieldNames?.length?'분배율 미입력 '+cash.missingYieldNames.length+'종목은 0%로 반영됩니다. 수입 가정에서 확인해 주세요.':'';limit.hidden=!limit.textContent;const fields=[...editor.querySelectorAll('input')],dirty=fields.some(x=>x.value.trim()===''||Number(x.value)!==Number(x.defaultValue));
   const button=$('fmSaveDividendRates');button.disabled=!dirty;button.textContent='수입 가정 저장';
   $('fmCancelDividendRates').textContent=dirty?'변경 취소':'닫기';
   editor.querySelector('summary').textContent='배당률·세금·보험료 수정';
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
    portfolioValue.querySelector('small').textContent='종목별 목표 금액 대비 · 위 진행률과 별개';
   }
   const cash=state.cashflow,cashValue=$('fmOverview-cashflow');
   if(cash){
    const limits=[];if(!cash.insuranceEntered)limits.push('보험료 미입력 · 차감 전');if(cash.missingYieldNames?.length)limits.push('분배율 미입력 '+cash.missingYieldNames.length+'종목은 0% 반영');
    cashValue.querySelector('strong').textContent=cash.expenseEntered?cash.statusValue+' (가정)':'생활비 입력 필요';
    cashValue.querySelector('strong').style.color=cash.expenseEntered&&cash.monthlyRemaining<0?'var(--red)':limits.length||!cash.expenseEntered?'var(--txt)':'var(--green)';
    if(/부족/.test(cashValue.querySelector('strong').textContent))cashValue.querySelector('strong').style.color='var(--yellow)';
    cashValue.querySelector('small').textContent=cash.expenseEntered?'예상 배당 '+money(cash.monthlyNetIncome)+' / 생활비 '+money(cash.spend):'월 생활비를 입력하면 차액을 확인할 수 있어요';
    let note=$('fmCashflowLimits');if(!note){note=document.createElement('small');note.id='fmCashflowLimits';cashValue.after(note)}note.textContent=limits.join(' · ');note.hidden=!limits.length;
   }
   $('fmOpenCalculator').textContent=state.draft?.dirty?'계획 조정 •':'계획 조정';
   const stress=state.stress;
   if(stress){$('fmRiskHeadline').textContent=stress.crash+'% 하락 · 평균 배당률로 계산';riskBasis.textContent='목표 배분 '+money(stress.total)+' · 연 분배율 '+stress.yield+'% · 세금 부담률 '+stress.taxRate+'% · '+stress.crash+'% 일시 하락. 분배금도 자산가치에 비례해 감소하는 가정이며 물가·보험료는 제외합니다.';}
   if(state.cashflow&&state.stress){const c=state.cashflow,t=state.stress,p=state.plan||{};
    $('fmModelValues').replaceChildren();
    for(const [label,value] of [['생활비 화면 · 세후 배당',compactMoney(c.monthlyNetIncome)+'/월'],['하락 확인 · 하락 전',compactMoney(t.monthlyBefore)+'/월']]){const row=document.createElement('div');row.className='fm-model-value';const l=document.createElement('span'),v=document.createElement('strong');l.textContent=label;v.textContent=value;row.append(l,v);$('fmModelValues').append(row)}
    $('fmModelScope').replaceChildren();
    for(const text of ['목표 배분 '+compactMoney(state.portfolio?.totalTarget||0)+' · 공통 생활비 '+compactMoney(c.spend)+'/월','생활비: 종목별 분배율·원천징수, '+(c.insuranceEntered?'입력 보험료 반영':'보험료 미입력 · 미차감'),'하락 실험: 분배율 '+t.yield+'% · 세금 부담 '+t.taxRate+'% · 보험료·물가 제외','전략 비교: 표시된 비교 자산·생활비와 총수익률 사용. 은퇴 계획에 저장되지 않습니다.']){const line=document.createElement('p');line.className='mini';line.textContent=text;$('fmModelScope').append(line)}
   }
   updateExpense();updateIncome();
   const detail=state.mode==='detail';basis.replaceChildren();
   const add=(text,cls='')=>{const span=document.createElement('span');span.className=cls;span.textContent=text;basis.append(span)};
   if(detail){add('임시 · 장기 비교','fm-model-tag');const d=state.detail;if(d){add(d.years+'년 · 물가 '+(d.inflation*100).toFixed(1)+'%');add('비교 자산 '+money(d.budget));add('연 생활비 '+money(d.spend+d.insurance));}else add('종목·조건을 확인한 뒤 계산해 주세요');}
   else{const q=state.quick;add('임시 · 1년 비교','fm-model-tag');if(q){add('비교 자산 '+money(q.assets));add('연 생활비 '+money(q.spend));add('총수익률 '+(q.growthRate*100).toFixed(1)+'% · 배당 포함');add('배당 세금 '+(q.taxRate*100).toFixed(1)+'%');add('물가·매도세·보험료 미반영');}}
  };
  document.addEventListener('fm-fire-view-updated',sync);sync();
  // One quote status owner on 자산.
  const assetHero=$('view-assets').querySelector(':scope>.hero'),quoteContext=$('fmAssetQuoteContext');
  const refreshContext=()=>{const rate=Number($('assetFx').value),fetched=!!(fmLiveData().balance?.fxCheckedAt||fmLiveData().balance?.fxAt),text=rate>0?'환율 '+rate.toLocaleString('ko-KR')+'원/USD'+(fetched?'':' (기본값)')+' · 시세 상태':'환율·시세 확인';const title=quoteContext.querySelector('summary');if(title.textContent!==text)title.textContent=text;const status=$('fxStatus').textContent||'환율 기준일 확인 필요';if($('fmAssetFxStatus').textContent!==status)$('fmAssetFxStatus').textContent=status;};
  new MutationObserver(refreshContext).observe(assetHero,{childList:true,subtree:true});new MutationObserver(refreshContext).observe($('fxStatus'),{childList:true,subtree:true});refreshContext();
  const assetTabs=$('view-assets').querySelector('.fm-asset-jump'),tabButtons=[...assetTabs.querySelectorAll('button')];assetTabs.setAttribute('role','tablist');
  const panels=['fmAssetAccountsPanel','fmAssetHoldingsPanel','fmAssetDividendView','fmAssetAnalysisView'];
    tabButtons.forEach((button,i)=>{button.setAttribute('role','tab');button.setAttribute('aria-controls',panels[i]);$(panels[i]).setAttribute('role','tabpanel');$(panels[i]).setAttribute('aria-labelledby',button.id);button.addEventListener('keydown',event=>{const offset={ArrowRight:1,ArrowLeft:-1}[event.key];if(offset===undefined&&!['Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?3:(i+offset+4)%4;tabButtons[next].click();tabButtons[next].focus({preventScroll:true});});});
  // Date selection reveals its transactions only when they would otherwise be out of sight.
  const calendar=$('cal'),day=$('dayTx'),dayHeader=$('selectedTitle'),calendarBack=$('fmBackToCalendar');let calendarY=0;
  calendarBack.onclick=()=>{scrollTo({top:calendarY,behavior:'instant'});calendar.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});};
  calendar.addEventListener('click',event=>{if(!event.target.closest('[data-date]'))return;calendarY=scrollY;requestAnimationFrame(()=>{if(!day.querySelector('.tx'))return;const rect=day.getBoundingClientRect(),height=window.visualViewport?.height||innerHeight;if(rect.bottom>height-90){dayHeader.scrollIntoView({block:'start',behavior:'instant'});dayHeader.tabIndex=-1;dayHeader.focus({preventScroll:true});}});});
  const syncMainNav=()=>document.querySelectorAll('.bottomnav [data-view]').forEach(button=>{if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  new MutationObserver(syncMainNav).observe(document.querySelector('.bottomnav'),{attributes:true,subtree:true,attributeFilter:['class']});syncMainNav();

 });
})();

}catch(e){console.error('fm-premium-finance-ui',e)}


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
   $('fmBackupNow').textContent=localStorage.getItem('firemate_drive_backup_v1')==='1'?'드라이브에 백업하기':'메일로 백업 보내기';
   if(!nudge.hidden)$('fmBackupNudgeText').textContent=(last===null?'아직 백업한 적이 없어요.':'이번 주 백업할까요? 마지막 백업이 '+daysSince(last)+'일 전이에요.')+' 기록은 이 휴대폰에만 저장돼서, 앱이나 브라우저 데이터를 지우면 사라져요.';
  };
  const sync=()=>{const d=saved();syncQuote(d);syncBackup(d)};
  // With Drive backup on, the reminder backs up there in one tap; otherwise it opens the share sheet.
  $('fmBackupNow').onclick=()=>{if(localStorage.getItem('firemate_drive_backup_v1')==='1')window.fmDriveBackupNow?.().then(sync);else{($('exportShare')||$('export'))?.click();setTimeout(sync,300)}};
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
  window.fmImportFromHome=(b=homeBox)=>{if(b&&live[0]?.parentElement!==b)b.append(...live);if(gmail.disabled)return;fromHome=true;gmail.click()};
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
   if(note){note.textContent=days!==null?(days<1?'오늘 가져옴':days+'일 전 가져옴'):last?day(last)+'까지 있음':'아직 가져온 적 없어요';note.classList.toggle('due',days!==null&&days>=7)}if($('fmLedgerSyncNote'))$('fmLedgerSyncNote').textContent=note?.textContent||''
  };
  for(const el of [$('bankExcelPreview'),$('heroSpent')])if(el)new MutationObserver(sync).observe(el,{childList:true,characterData:true,subtree:true});
  sync();
 });
})();
}catch(e){console.error('fm-ledger-sync',e)}



// ===== fm-daily-fixes-v3586 — 설정 · 소액 수입, 분류 정리 =====
try{
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
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


// ===== fm-plan-v3587 — 홈·자산 · 당겨서 업데이트 =====
try{
/* Pull down on 홈 or 자산 to refresh quotes and net worth. */
(()=>{
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
  // Pull down on 홈 or 자산 to refresh quotes and net worth.
  const pill=el('div','',null);pill.id='fmPull';pill.setAttribute('aria-live','polite');document.body.append(pill);
  let startY=null,pulled=0,busy=false;
  const active=()=>{const v=document.querySelector('.view.active');return v&&(v.id==='view-home'||v.id==='view-assets')&&!document.querySelector('.modalbg.show')&&!document.getElementById('fmAsk')?.matches(':not([hidden])')};
  addEventListener('touchstart',e=>{startY=(scrollY<=0&&active()&&!busy&&e.touches.length===1)?e.touches[0].clientY:null;pulled=0},{passive:true});
  addEventListener('touchmove',e=>{if(startY==null)return;pulled=Math.max(0,e.touches[0].clientY-startY);if(scrollY>0){startY=null;pill.style.transform='';return}if(pulled&&e.cancelable)e.preventDefault();const y=Math.min(pulled*0.5,70)-56;pill.style.transform='translate(-50%,'+y+'px)';pill.textContent=pulled>110?'↻ 놓으면 순자산 업데이트':'↓ 당겨서 업데이트'},{passive:false});
  addEventListener('touchend',async()=>{if(startY==null)return;startY=null;const go=pulled>110;pill.style.transform='';if(!go||typeof window.fmRefreshNetWorth!=='function')return;
   busy=true;pill.textContent='↻ 순자산 업데이트 중…';pill.classList.add('busy');
   const before=$('netWorth')?.textContent||'';let failed=false,ran=true;try{ran=await window.fmRefreshNetWorth()!==false}catch{failed=true}finally{busy=false;pill.classList.remove('busy');pill.textContent=''}const after=$('netWorth')?.textContent||'';if(ran||failed)window.fmToast?.(failed?'업데이트하지 못했어요. 잠시 후 다시 당겨 주세요':'순자산 '+after+(before&&before!==after?' (업데이트됨)':' · 시세 변동 없음'))},{passive:true});

 });
})();
}catch(e){console.error('fm-plan-v3587',e)}



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
  box.querySelector('#fmHcFill').onclick=()=>{
   // Pre-tax monthly payout (만원) published by the 생활비 calculation; display wording does not matter.
   const gross=Number(window.fmFireViewState?.cashflow?.monthlyGrossIncome);
   if(!(gross>0)){window.fmToast?.('생활비 화면에서 목표 배분의 분배금을 먼저 확인해 주세요');return}
   const yearly=Math.round(gross*12);$('finance').value=String(yearly);calc();window.fmToast?.('세전 분배금 연 '+yearly.toLocaleString('ko-KR')+'만 원을 넣었어요');
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
  const anchor=$('insightCats')?.closest('.card');if(anchor)anchor.after(card);
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




// ===== fm-design-v3596 — 홈·자산 · 약 N만 원 표시 =====
try{
/* An approximate 만/억 reading next to the two big totals (their labels are set at runtime). */
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
 });
})();
}catch(e){console.error('fm-design-v3596',e)}


// ===== fm-start-v3597 — 홈 · 시작 화면, 예시 데이터 =====
try{
/* First run: choose how to start (example data / record by hand / 뱅크샐러드). Example data is
   offered only while nothing is saved, and leaving it clears it. */
(()=>{
 'use strict';
 // KEEP holds whatever was saved before example data, and comes back when leaving it.
 const K='firemate_smart_v3',CHOICE='firemate_start_choice_v1',DEMO='firemate_demo_mode_v1',KEEP='firemate_demo_backup_v1';
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
   bar.querySelector('button').onclick=async()=>{if(window.fmAsk&&!await window.fmAsk('예시 데이터를 지우고 내 데이터로 시작할까요?',{ok:'시작',cancel:'취소'}))return;try{const kept=localStorage.getItem(KEEP);if(kept!==null){localStorage.setItem(K,kept);localStorage.removeItem(KEEP)}else localStorage.removeItem(K);localStorage.removeItem(DEMO);localStorage.setItem(CHOICE,'manual')}catch{}location.reload()};}
  // First visit with nothing saved: one card with three ways to start (tests opt in explicitly).
  let d={};try{d=JSON.parse(localStorage.getItem(K)||'{}')||{}}catch{d=null}
  // Anything the person entered counts: records, assets, debt, budgets, recurring items, a changed plan, net-worth history.
  const filled=v=>Array.isArray(v)?v.length>0:!!v&&typeof v==='object'&&Object.keys(v).length>0;
  const fireDefaults={asset:15000,goal:65000,monthly:300,rate:7,withdrawal:4};
  const empty=!!d&&!filled(d.tx)&&!filled(d.holdings)&&!filled(d.rec)&&![...(d.dailySnapshots||[]),...(d.snapshots||[])].some(s=>Number(s?.amount)>0)
   &&!(d.accounts||[]).some(a=>Number(a?.amount)>0||filled(a?.items))&&!['cash','other','debt'].some(k=>Number(d.balance?.[k])>0)
   &&!Object.values(d.budgets||{}).some(v=>Number(v)>0)&&!Object.entries(d.fire||{}).some(([k,v])=>k in fireDefaults&&Number(v)!==fireDefaults[k]);
  let chosen=null;try{chosen=localStorage.getItem(CHOICE)}catch{}
  if(!demo&&empty&&!chosen&&(!navigator.webdriver||window.__fmStartTest)){
   const card=document.createElement('section');card.className='card fm-start';card.id='fmStart';
   card.innerHTML='<h3>어떻게 시작할까요?</h3><p class="mini">언제든 바꿀 수 있어요.</p><div class="fm-start-options"><button type="button" data-start="demo"><strong>👀 예시로 둘러보기</strong><span>샘플 데이터로 화면을 먼저 봐요</span></button><button type="button" data-start="manual"><strong>✍️ 직접 기록으로 시작</strong><span>은행 연결 없이 손으로 적어요</span></button><button type="button" data-start="bank"><strong>📥 뱅크샐러드 연결</strong><span>Gmail로 받은 내역을 가져와요</span></button></div>';
   home.prepend(card);
   card.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{const how=b.dataset.start;try{localStorage.setItem(CHOICE,how)}catch{}
    if(how==='demo'){try{const before=localStorage.getItem(K);if(before!==null)localStorage.setItem(KEEP,before);localStorage.setItem(K,JSON.stringify(sample()));localStorage.setItem(DEMO,'1')}catch{window.fmToast?.('예시 데이터를 넣지 못했어요');return}location.reload();return}
    card.remove();if(how==='manual')window.fmOpenEntry?.();else window.fmImportFromHome?.()});
  }
 });
})();
}catch(e){console.error('fm-start-v3597',e)}
