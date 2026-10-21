const {test,expect}=require('@playwright/test');
const path=require('path');
const XLSX=require('xlsx');
const SHEETJS=path.join(path.dirname(require.resolve('xlsx/package.json')),'dist','xlsx.full.min.js');
// A 뱅크샐러드 export with the columns the importer requires.
const workbook=()=>{
 const rows=[['날짜','시간','타입','대분류','소분류','내용','금액','화폐','결제수단'],
  ['2026-10-18','12:10','지출','식비','점심','김밥천국',-8500,'KRW','카드'],
  ['2026-10-19','09:00','수입','급여','월급','회사',3000000,'KRW','계좌']];
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'가계부 내역');
 return XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
};
// Later routes win: block the network first, then serve the pinned SheetJS build locally.
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',route=>route.fulfill({path:SHEETJS,contentType:'application/javascript'}));
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('the 뱅크샐러드 importer lives in settings, the ledger keeps its calendar, home opens it',async({page})=>{
 await page.goto('/index.html');
 await expect(page.locator('#view-home #fmHomeSync > span').first()).toHaveText('📥 Gmail 가져오기');
 await expect(page.locator('#view-home #fmHomeSyncNote')).toHaveText('아직 가져온 적 없어요');
 await expect(page.locator('#view-home #fmHomeRecord')).toHaveText('＋ 직접 기록');
 // Two equal, quiet buttons instead of a large green one.
 const [sync,record]=await Promise.all(['fmHomeSync','fmHomeRecord'].map(id=>page.locator('#'+id).boundingBox()));
 for(const box of [sync,record]){expect(box.height).toBeGreaterThanOrEqual(44);expect(box.height).toBeLessThanOrEqual(52)}
 expect(Math.abs(sync.width-record.width)).toBeLessThanOrEqual(2);
 await expect(page.locator('#fmHomeSync')).not.toHaveClass(/primary/);
 // 가계부 has no import panel; the calendar follows the budget card.
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#view-calendar #fmLedgerSync')).toHaveCount(0);
 const firstDay=await page.locator('#view-calendar [data-date]').first().boundingBox(),nav=await page.locator('.bottomnav').boundingBox();
 expect(firstDay.y+firstDay.height).toBeLessThan(nav.y);
 // Settings hold the one copy, folded until needed.
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#settingsOverlay #fmLedgerImportMount #fmLedgerSync')).toHaveCount(1);
 await expect(page.locator('#bankGmailImport')).toBeHidden();
 await page.locator('#settingsOverlay [data-close]').first().click();
 // The home button opens it there and starts the Gmail import.
 await page.evaluate(()=>window.fmGo('home'));
 await page.locator('#fmHomeSync').click();
 await expect(page.locator('#settingsOverlay')).toHaveClass(/show/);
 await expect(page.locator('#bankGmailImport')).toBeVisible();
 await expect(page.locator('#bankGmailStatus')).not.toBeEmpty();
 await expect(page.locator('#fmSyncStatus')).toHaveText('아직 가져온 내역이 없어요');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('a 뱅크샐러드 file imports through the moved panel and updates the status',async({page})=>{
 // The labelled button is the confirmation: no browser dialog may appear.
 const dialogs=[];page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.dismiss()});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenImport());
 await page.locator('#fmSyncOptions > summary').click();
 await page.locator('#fmSyncOptions details > summary').click();
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
 await expect(page.locator('#bankExcelPreview')).toHaveText('새 거래 2건 · 지출 ₩8,500');
 await expect(page.locator('#bankExcelConfirm')).toHaveText('2건 가계부에 추가');
 await page.locator('#bankExcelConfirm').click();
 await expect(page.locator('#bankExcelPreview')).toContainText('2건을 가계부에 추가했어요');
 await expect(page.locator('#fmSyncStatus')).toHaveText('가져온 내역 10월 19일까지 · 마지막 가져오기 오늘');
 expect(dialogs).toEqual([]);
 const tx=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(t=>t.bankExcelKey));
 expect(tx.map(t=>[t.date,t.type,t.amount])).toEqual([['2026-10-18','expense',8500],['2026-10-19','income',3000000]]);
 // Importing the same file again adds nothing.
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
 await expect(page.locator('#bankExcelPreview')).toHaveText('새로 추가할 거래가 없어요 · 이미 있는 2건 건너뜀');
 await expect(page.locator('#bankExcelConfirm')).toBeHidden();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(t=>t.bankExcelKey).length)).toBe(2);
});

test('undo removes only the rows just imported and keeps earlier data',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa-seeded'))return;sessionStorage.setItem('qa-seeded','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[{id:'mine',date:'2026-10-01',type:'expense',category:'식비',amount:7000,memo:'직접 기록'}]}))});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenImport());
 await page.locator('#fmSyncOptions > summary').click();
 await page.locator('#fmSyncOptions details > summary').click();
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
 await page.locator('#bankExcelConfirm').click();
 const undo=page.locator('#bankImportUndo');
 await expect(undo).toBeVisible();
 expect((await undo.boundingBox()).height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length)).toBe(3);
 await undo.click();
 await expect(page.locator('#bankExcelPreview')).toHaveText('방금 가져온 2건을 되돌렸어요');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.map(t=>t.id))).toEqual(['mine']);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_last_import_v1'))).toBeNull();
 await expect(page.locator('#fmSyncStatus')).toHaveText('아직 가져온 내역이 없어요');
});

test('rarely used import options stay folded',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenImport());
 await expect(page.locator('#bankGmailImport')).toBeVisible();
 expect((await page.locator('#bankGmailImport').boundingBox()).height).toBeGreaterThanOrEqual(44);
 await expect(page.locator('#fmZipRemember')).toBeHidden();
 await page.locator('#fmSyncOptions > summary').click();
 await expect(page.locator('#fmZipRemember')).toBeVisible();
});
