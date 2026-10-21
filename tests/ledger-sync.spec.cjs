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

test('뱅크샐러드 import sits at the top of 가계부 and home offers it first',async({page})=>{
 await page.goto('/index.html');
 await expect(page.locator('#view-home #fmHomeSync > span').first()).toHaveText('📥 Gmail에서 가져오기');
 await expect(page.locator('#view-home #fmHomeSyncNote')).toHaveText('아직 가져온 적 없어요');
 await expect(page.locator('#view-home #fmHomeRecord')).toHaveText('＋ 직접 기록');
 for(const id of ['fmHomeSync','fmHomeRecord'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.evaluate(()=>window.fmGo('calendar'));
 const panel=page.locator('#view-calendar #fmLedgerSync');
 await expect(panel).toBeVisible();
 await expect(panel.locator('#bankGmailImport')).toBeVisible();
 await expect(page.locator('#fmSyncStatus')).toHaveText('아직 가져온 내역이 없어요');
 // Settings point to the new place instead of holding a second copy.
 await expect(page.locator('#settingsOverlay #bankGmailImport')).toHaveCount(0);
 await expect(page.locator('#fmLedgerImportMount #fmSettingsImportLink')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('a 뱅크샐러드 file imports through the moved panel and updates the status',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.locator('#fmLedgerSync details > summary').click();
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 await page.locator('#bankExcelConfirm').click();
 await expect(page.locator('#fmSyncStatus')).toHaveText('가져온 내역 10월 19일까지 · 마지막 가져오기 오늘');
 const tx=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(t=>t.bankExcelKey));
 expect(tx.map(t=>[t.date,t.type,t.amount])).toEqual([['2026-10-18','expense',8500],['2026-10-19','income',3000000]]);
 // Importing the same file again adds nothing.
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
 await expect(page.locator('#bankExcelPreview')).toContainText(/0건|새로|중복/);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(t=>t.bankExcelKey).length)).toBe(2);
});
