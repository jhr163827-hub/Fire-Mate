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
const importZip=async(page,day)=>{
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.addScriptTag({path:ZIPJS});
 const buffer=await zipFile(page,day);
 await page.locator('#bankExcelFile').setInputFiles({name:'banksalad.zip',mimeType:'application/zip',buffer});
};

test('ZIP password is asked once and remembered only when the user opts in',async({page})=>{
 let prompts=0;
 page.on('dialog',dialog=>{if(dialog.type()==='prompt'){prompts++;dialog.accept(PASSWORD)}else dialog.accept()});
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#fmZipRemember')).not.toBeChecked();
 await page.locator('#fmZipRemember').check();
 await importZip(page,'2026-10-18');
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 await page.locator('#bankExcelConfirm').click();
 expect(prompts).toBe(1);
 expect(await page.evaluate(()=>localStorage.getItem('firemate_bank_zip_pwd_v1'))).toBe(PASSWORD);
 await expect(page.locator('#fmZipRememberText')).toHaveText('ZIP 암호를 기억하고 있어요');
 await expect(page.locator('#fmHomeSyncNote')).toHaveText('오늘 가져옴');
 // A new session no longer asks.
 await page.evaluate(()=>sessionStorage.clear());
 await page.reload();
 await importZip(page,'2026-10-19');
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 expect(prompts).toBe(1);
 // 지우기 forgets it.
 await page.locator('#fmZipForget').click();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_bank_zip_pwd_v1'))).toBeNull();
 await expect(page.locator('#fmZipRemember')).not.toBeChecked();
});

test('without opting in the password stays for this session only, and a wrong one is forgotten',async({page})=>{
 const answers=['wrong-pass',PASSWORD];
 page.on('dialog',dialog=>{if(dialog.type()==='prompt')dialog.accept(answers.shift());else dialog.accept()});
 await page.goto('/index.html');
 await importZip(page,'2026-10-18');
 await expect(page.locator('#bankExcelPreview')).toContainText('ZIP 해제 실패');
 expect(await page.evaluate(()=>[sessionStorage.getItem('fm-bank-zip-password'),localStorage.getItem('firemate_bank_zip_pwd_v1')])).toEqual([null,null]);
 await page.locator('#bankExcelFile').setInputFiles([]);
 await importZip(page,'2026-10-18');
 await expect(page.locator('#bankExcelConfirm')).toBeVisible();
 expect(await page.evaluate(()=>[sessionStorage.getItem('fm-bank-zip-password'),localStorage.getItem('firemate_bank_zip_pwd_v1')])).toEqual([PASSWORD,null]);
});
