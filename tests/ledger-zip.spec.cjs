const {test,expect}=require('@playwright/test');
const path=require('path');
const XLSX=require('xlsx');
const SHEETJS=path.join(path.dirname(require.resolve('xlsx/package.json')),'dist','xlsx.full.min.js');
const ZIPJS=path.join(path.dirname(require.resolve('@zip.js/zip.js/package.json')),'dist','zip.min.js');
const PASSWORD='qa-zip-pass';
const xlsx=day=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['날짜','시간','타입','대분류','소분류','내용','금액','화폐','결제수단'],[day,'12:10','지출','식비','점심','김밥',-8500,'KRW','카드']]),'가계부 내역');return XLSX.write(wb,{type:'buffer',bookType:'xlsx'})};
// Build an encrypted 뱅크샐러드-style ZIP inside the page with the same zip.js build the app loads.
const zipFile=async(page,day)=>Buffer.from(await page.evaluate(async([bytes,pwd])=>{
 const writer=new zip.ZipWriter(new zip.Uint8ArrayWriter(),{password:pwd});
 await writer.add('banksalad.xlsx',new zip.Uint8ArrayReader(new Uint8Array(bytes)));
 return Array.from(await writer.close());
},[Array.from(xlsx(day)),PASSWORD]));
// Later routes win: block the network first, then serve the pinned libraries locally.
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',route=>route.fulfill({path:SHEETJS,contentType:'application/javascript'}));
 await page.route('https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.62/dist/zip.min.js',route=>route.fulfill({path:ZIPJS,contentType:'application/javascript'}));
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
// The password is asked in the panel, never with a browser prompt (which shows the site address).
const answerZip=async(page,value)=>{const input=page.locator('#fmLedgerSync #bankZipPassword');await expect(input).toBeVisible();await input.fill(value);await page.locator('#fmLedgerSync .fm-zip-ask button[type=submit]').click()};
const noBrowserDialogs=page=>{const seen=[];page.on('dialog',dialog=>{seen.push(dialog.type());dialog.dismiss()});return seen};
const importZip=async(page,day)=>{
 await page.evaluate(()=>window.fmOpenImport());
 await page.addScriptTag({path:ZIPJS});
 const buffer=await zipFile(page,day);
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.zip',mimeType:'application/zip',buffer});
};

test('ZIP password is asked once and remembered only when the user opts in',async({page})=>{
 const dialogs=noBrowserDialogs(page);
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmOpenImport());
 await expect(page.locator('#fmZipRemember')).not.toBeChecked();
 await importZip(page,'2026-10-18');
 // The opt-in sits right next to the password field.
 await expect(page.locator('#bankZipKeep')).not.toBeChecked();
 await page.locator('#bankZipKeep').check();
 await answerZip(page,PASSWORD);
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 await page.locator('#bankExcelConfirm').click();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_bank_zip_pwd_v1'))).toBe(PASSWORD);
 await expect(page.locator('#fmZipRememberText')).toHaveText('ZIP 암호를 기억하고 있어요');
 await expect(page.locator('#fmHomeSyncNote')).toHaveText('오늘 가져옴');
 // A new session no longer asks.
 await page.evaluate(()=>sessionStorage.clear());
 await page.reload();
 await importZip(page,'2026-10-19');
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 await expect(page.locator('#bankZipPassword')).toHaveCount(0);
 expect(dialogs).toEqual([]);
 // 지우기 forgets it.
 await page.locator('#fmSyncOptions > summary').click();
 await page.locator('#fmZipForget').click();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_bank_zip_pwd_v1'))).toBeNull();
 await expect(page.locator('#fmZipRemember')).not.toBeChecked();
});

test('without opting in the password stays for this session only, and a wrong one is forgotten',async({page})=>{
 const dialogs=noBrowserDialogs(page);
 await page.goto('/index.html');
 await importZip(page,'2026-10-18');
 await answerZip(page,'wrong-pass');
 await expect(page.locator('#bankExcelPreview')).toContainText('ZIP 해제 실패');
 expect(await page.evaluate(()=>[sessionStorage.getItem('fm-bank-zip-password'),localStorage.getItem('firemate_bank_zip_pwd_v1')])).toEqual([null,null]);
 await page.locator('#bankExcelFile').setInputFiles([]);
 await importZip(page,'2026-10-18');
 await answerZip(page,PASSWORD);
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 expect(await page.evaluate(()=>[sessionStorage.getItem('fm-bank-zip-password'),localStorage.getItem('firemate_bank_zip_pwd_v1')])).toEqual([PASSWORD,null]);
 expect(dialogs).toEqual([]);
});

test('cancelling the in-app password ask stops the import without changing data',async({page})=>{
 noBrowserDialogs(page);
 await page.goto('/index.html');
 const before=await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'));
 await importZip(page,'2026-10-18');
 await expect(page.locator('#bankZipPassword')).toBeVisible();
 expect((await page.locator('#bankZipPassword').boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.locator('#fmLedgerSync .fm-zip-ask button[type=button]').click();
 await expect(page.locator('#bankExcelPreview')).toContainText('ZIP 암호가 필요합니다');
 await expect(page.locator('#bankExcelConfirm')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_smart_v3'))).toBe(before);
});
