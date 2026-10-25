const {test,expect}=require('@playwright/test');
const path=require('path');
const XLSX=require('xlsx');
const SHEETJS=path.join(path.dirname(require.resolve('xlsx/package.json')),'dist','xlsx.full.min.js');
const ago=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
const month=ago(0).slice(0,7);
const book=rows=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['날짜','시간','타입','대분류','소분류','내용','금액','화폐','결제수단'],...rows]),'가계부 내역');return XLSX.write(wb,{type:'buffer',bookType:'xlsx'})};
const seedWith=async(page,seed)=>page.addInitScript(seed=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');if(seed)localStorage.setItem('firemate_smart_v3',JSON.stringify(seed))},seed);
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',route=>route.fulfill({path:SHEETJS,contentType:'application/javascript'}));
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('imports map 뱅크샐러드 분류 to app categories and learn a merchant fix',async({page})=>{
 await page.goto('/index.html');
 const load=async rows=>{await page.evaluate(()=>window.fmOpenImport());await page.locator('#fmSyncOptions > summary').evaluate(s=>{if(!s.parentElement.open)s.click()});
  await page.locator('#bankExcelFile').setInputFiles({name:'b.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:book(rows)});
  await page.locator('#bankExcelConfirm').click()};
 await load([[ago(1),'08:00','지출','편의점','','GS25',-3000,'KRW','카드'],[ago(1),'09:00','지출','생활','','다이소',-5000,'KRW','카드'],
  [ago(1),'10:00','수입','급여','','회사',3000000,'KRW','계좌'],[ago(1),'11:00','수입','금융수입','','이자',1200,'KRW','계좌'],[ago(1),'12:00','지출','알수없음','','무언가',-700,'KRW','카드']]);
 await expect.poll(async()=>(await saved(page)).tx.filter(t=>t.bankExcelKey).length).toBe(5);
 const cat=async memo=>(await saved(page)).tx.find(t=>t.memo===memo).category;
 expect([await cat('GS25'),await cat('다이소'),await cat('회사'),await cat('이자'),await cat('무언가')]).toEqual(['식비','쇼핑','급여','배당·이자','기타']);
 // Re-categorise one imported merchant by hand; the next import of that merchant follows it.
 await page.locator('#settingsOverlay [data-close]').first().click();
 await page.evaluate(()=>window.fmGo('calendar'));await page.locator('#fmModeList').click();
 await page.locator('#fmLedgerAllTx .tx',{hasText:'다이소'}).locator('[data-edit]').click();
 await page.locator('#entryCat').selectOption('주거·관리비');await page.locator('#saveEntry').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_category_rules_v1')))).toEqual({'expense|다이소':'주거·관리비'});
 await load([[ago(0),'09:00','지출','생활','','다이소',-8000,'KRW','카드']]);
 await expect.poll(async()=>(await saved(page)).tx.filter(t=>t.memo==='다이소').map(t=>t.category)).toEqual(['주거·관리비','주거·관리비']);
});

test('money sent to my own account is a transfer, not spending, and one fix teaches the importer',async({page})=>{
 await page.goto('/index.html');
 const load=async rows=>{await page.evaluate(()=>window.fmOpenImport());await page.locator('#fmSyncOptions > summary').evaluate(s=>{if(!s.parentElement.open)s.click()});
  await page.locator('#bankExcelFile').setInputFiles({name:'b.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:book(rows)});
  await page.locator('#bankExcelConfirm').click()};
 // 뱅크샐러드 says 지출, but its own category says 이체: no hand fix needed.
 await load([[ago(1),'08:00','지출','이체','내계좌이체','적금 이체',-500000,'KRW','계좌'],[ago(1),'09:00','지출','기타','','마이뱅크',-300000,'KRW','계좌'],[ago(2),'09:00','지출','기타','','마이뱅크',-200000,'KRW','계좌'],[ago(1),'10:00','지출','기타','','업비트 입금',-300000,'KRW','계좌']]);
 await expect.poll(async()=>(await saved(page)).tx.filter(t=>t.bankExcelKey).length).toBe(4);
 const type=async memo=>(await saved(page)).tx.filter(t=>t.memo===memo).map(t=>t.type);
 expect(await type('적금 이체')).toEqual(['transfer']);
 // Money moved to an exchange or brokerage is investing, not spending.
 expect(await type('업비트 입금')).toEqual(['transfer']);
 // One 마이뱅크 row switched to 이체 by hand moves every 마이뱅크 row and the next import.
 await page.locator('#settingsOverlay [data-close]').first().click();
 await page.evaluate(()=>window.fmGo('calendar'));await page.locator('#fmModeList').click();
 await page.locator('#fmLedgerAllTx .tx',{hasText:'마이뱅크'}).first().locator('[data-edit]').click();
 await page.locator('#entryTypes button[data-type="transfer"]').click();await page.locator('#saveEntry').click();
 await expect.poll(()=>type('마이뱅크')).toEqual(['transfer','transfer']);
 await load([[ago(0),'09:00','지출','기타','','마이뱅크',-100000,'KRW','계좌']]);
 await expect.poll(()=>type('마이뱅크')).toEqual(['transfer','transfer','transfer']);
});

test('exchange and 청약 deposits already imported as spending become transfers once',async({page})=>{
 await seedWith(page,{theme:'dark',rec:[],budgets:{},accounts:[],holdings:[],tx:[{id:'u',date:ago(1),type:'expense',category:'쇼핑',amount:300000,memo:'업비트 입금',bankExcelKey:'k-u'},{id:'c',date:ago(1),type:'expense',category:'문화·취미',amount:30000,memo:'762907**47 ,2609-117회차',bankExcelKey:'k-c'},{id:'s',date:ago(1),type:'expense',category:'쇼핑',amount:9000,memo:'쿠팡',bankExcelKey:'k-s'}]});
 await page.goto('/index.html');
 await expect.poll(async()=>(await saved(page)).tx.map(t=>t.type)).toEqual(['transfer','transfer','expense']);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_xfer_fix3_v1'))).toBe('1');
});

test('older imports can be tidied in one confirmed step without touching amounts',async({page})=>{
 const key=(main,memo,amount,type='expense')=>[ago(2),'10:00',type,main,'',memo,amount,'카드'].join('|');
 await seedWith(page,{theme:'dark',rec:[],budgets:{},tx:[
  {id:'a',date:ago(2),type:'expense',category:'편의점',amount:3000,memo:'GS25',bankExcelKey:key('편의점','GS25',3000)},
  {id:'b',date:ago(2),type:'income',category:'기타 수입',amount:3000000,memo:'회사',bankExcelKey:key('급여','회사',3000000,'income')},
  {id:'c',date:ago(2),type:'expense',category:'식비',amount:9000,memo:'직접'}]});
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 const btn=page.locator('#fmTidyCategories');
 // The raw bank label 편의점 is already fixed on load; the income row still waits for the confirmed tidy.
 expect((await saved(page)).tx.find(t=>t.id==='a').category).toBe('식비');
 await expect(btn).toHaveText('가져온 거래 분류 정리 (1건)');
 const before=await saved(page);
 await page.evaluate(()=>window.fmOpenImport());
 await btn.click();await page.locator('#fmAskCancel').click();
 expect(await saved(page)).toEqual(before);
 await btn.click();await page.locator('#fmAskOk').click();
 const after=await saved(page);
 expect(after.tx.map(t=>[t.id,t.category,t.amount,t.date])).toEqual([['a','식비',3000,ago(2)],['b','급여',3000000,ago(2)],['c','식비',9000,ago(2)]]);
 await expect(btn).toBeHidden();
});

test('a new month offers last budget and the recent average; analysis links to the one editor',async({page})=>{
 const prev=(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7)})();
 await seedWith(page,{theme:'dark',rec:[],budgets:{[prev]:1000000},tx:[{id:'p',date:prev+'-10',type:'expense',category:'식비',amount:1500000,memo:'지난달'}]});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#budget')).toHaveCount(0);
 // The budget card sits in the folded '이번 달 흐름 더 보기' section.
 await page.locator('#fmInsightsMore>summary').click();
 await page.locator('#fmInsightsBudgetLink').click();
 await expect(page.locator('#fmLedgerBudgetOverlay')).toHaveClass(/show/);
 await expect(page.locator('#fmLedgerBudgetValue')).toHaveValue('1,000,000');
 const chips=page.locator('#fmBudgetSuggest button');
 await expect(chips).toHaveText(['지난 예산 ₩1,000,000','최근 1개월 평균 지출 ₩1,500,000']);
 await chips.nth(1).click();
 await expect(page.locator('#fmLedgerBudgetValue')).toHaveValue('1,500,000');
 // Nothing is saved until 저장.
 expect((await saved(page)).budgets[month]).toBeUndefined();
 await page.locator('#fmLedgerBudgetSave').click();
 expect((await saved(page)).budgets[month]).toBe(1500000);
});

test('lists are grouped by day with totals and empty accounts fold away',async({page})=>{
 await seedWith(page,{theme:'dark',rec:[],budgets:{},balance:{fx:1400,cash:0,other:0,debt:0},
  accounts:[{id:'k',name:'KB',kind:'cash',amount:5000000},{id:'e1',name:'빈1',kind:'investment',amount:0},{id:'e2',name:'빈2',kind:'investment',amount:0}],holdings:[],
  tx:[{id:'1',date:ago(0),type:'expense',category:'식비',amount:9000,memo:'점심'},{id:'2',date:ago(0),type:'expense',category:'교통',amount:1500,memo:'버스'},{id:'3',date:ago(0),type:'income',category:'급여',amount:100000,memo:'용돈'}]});
 await page.goto('/index.html');
 // The full history list gets day headers (the 가계부 목록 already groups by day).
 await page.evaluate(()=>window.fmGo('history'));
 await expect(page.locator('#historyList .fm-tx-day').first().locator('span')).toHaveText('지출 ₩10,500 · 수입 ₩100,000');
 await page.evaluate(()=>window.fmGo('calendar'));await page.locator('#fmModeList').click();
 await page.locator('#fmLedgerAllTx details.fm-ledger-day > summary').first().evaluate(s=>{if(!s.parentElement.open)s.click()});
 const row=page.locator('#fmLedgerAllTx .tx').first();
 const box=await row.boundingBox();expect(box.height).toBeLessThanOrEqual(64);expect(box.height).toBeGreaterThanOrEqual(44);
 // The whole row opens the editor.
 await row.click();await expect(page.locator('#entryTitle')).toHaveText('거래 수정');
 await page.locator('#entryOverlay [data-close]').first().click();
 await page.evaluate(()=>window.fmGo('assets'));
 const fold=page.locator('#accountSummary .fm-empty-accounts');
 await expect(fold.locator('summary')).toHaveText(/^빈 계좌 [2-9]개$/);
 await expect(page.locator('#accountSummary [data-inline-toggle="e1"]')).toBeHidden();
 await expect(page.locator('#accountSummary [data-inline-toggle="k"]')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('the automatic morning quote refresh does not pop a toast',async({page})=>{
 await seedWith(page,{theme:'dark',rec:[],budgets:{},tx:[],accounts:[{id:'a',name:'A',kind:'investment',amount:0}],holdings:[{id:'h',accountId:'a',ticker:'SPY',type:'USD',qty:1,price:500,cost:400}]});
 await page.goto('/index.html');
 await expect(page.locator('#homeLastQuote')).toContainText(/조회|실패|시세/);
 await page.waitForTimeout(1500);
 await expect(page.locator('#toast')).toBeHidden();
});

test('outgoing 이체 rows (negative) are imported, not treated as cancellations',async({page})=>{
 const d=ago(1),row=(time,amount,memo,main,pay)=>[d,time,'이체',main,'미분류',memo,amount,'KRW',pay];
 const rows=[row('09:00',-1000000,'삼성증권','내계좌이체','토스뱅크 통장'),row('09:01',-30000,'청약 1회차','이체','토스뱅크 통장'),row('09:02',30000,'입금 내역','미분류','주택청약종합저축')];
 // An earlier import already stored this month's 청약 transfer; it must stay.
 await seedWith(page,{theme:'dark',rec:[],budgets:{},accounts:[],holdings:[],tx:[{id:'keep',date:ago(20),type:'transfer',category:'계좌 이체',amount:30000,memo:'청약 1회차'}]});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenImport());await page.locator('#fmSyncOptions > summary').evaluate(s=>{if(!s.parentElement.open)s.click()});
 await page.locator('#bankExcelFile').setInputFiles({name:'b.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:book(rows)});
 await expect(page.locator('#bankExcelPreview')).not.toContainText('결제 취소');
 await page.locator('#bankExcelConfirm').click();
 await expect.poll(async()=>(await saved(page)).tx.length).toBe(4);
 const tx=(await saved(page)).tx;
 expect(tx.find(t=>t.memo==='삼성증권')).toMatchObject({type:'transfer',amount:1000000});
 expect(tx.some(t=>t.id==='keep')).toBe(true);
});

test('a cancelled card payment removes its charge instead of counting as spending, and re-import repairs old ones',async({page})=>{
 const d=ago(1),row=(time,amount,memo='주식회사 티머니')=>[d,time,'지출','교통','',memo,amount,'KRW','카드'];
 // 뱅크샐러드 writes 지출 as negative; the +12,700 row is the cancellation of the 08:00 charge.
 const rows=[row('08:00',-12700),row('08:05',12700),row('08:10',-12700),row('09:00',-3000,'GS25')];
 const key=(time,amount,memo='주식회사 티머니')=>[d,time,'expense','교통','',memo,amount,'카드'].join('|');
 // The old importer stored all three 티머니 rows as spending.
 await seedWith(page,{theme:'dark',rec:[],budgets:{},accounts:[],holdings:[],tx:['08:00','08:05','08:10'].map((t,i)=>({id:'old'+i,date:d,type:'expense',category:'교통',amount:12700,memo:'주식회사 티머니',bankExcelKey:key(t,12700)}))});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenImport());await page.locator('#fmSyncOptions > summary').evaluate(s=>{if(!s.parentElement.open)s.click()});
 await page.locator('#bankExcelFile').setInputFiles({name:'b.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:book(rows)});
 await expect(page.locator('#bankExcelPreview')).toContainText('결제 취소 1건');
 await expect(page.locator('#bankExcelPreview')).toContainText('이미 있던 2건 정리');
 await page.locator('#bankExcelConfirm').click();
 const tmoney=async()=>(await saved(page)).tx.filter(t=>t.memo==='주식회사 티머니').length;
 await expect.poll(tmoney).toBe(1);
 expect((await saved(page)).tx.filter(t=>t.memo==='GS25').length).toBe(1);
 // Undo puts the cleaned-up rows back as they were.
 await page.locator('#bankImportUndo').click();
 await expect.poll(tmoney).toBe(3);
 expect((await saved(page)).tx.filter(t=>t.memo==='GS25').length).toBe(0);
});
