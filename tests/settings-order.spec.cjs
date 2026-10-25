const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('settings list 게임 아케이드 → 자격증 → 위시리스트 → 월급 주기 계획 → 내 데이터 → 초기화, without mail, quote or export sections',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 const order=await page.evaluate(()=>[...document.querySelector('#settingsOverlay .stack').children].filter(e=>!e.hidden).map(e=>
  e.id==='fmArcadeOpen'?'arcade':e.id==='fmWishOpen'?'wish':e.matches('.fm-certs')?'certs':e.matches('.fm-device-storage')?'data':e.querySelector(':scope>summary')?.textContent.trim()));
 expect(order).toEqual(['arcade','certs','wish','📋 월급 주기 계획','data','⚠️ 데이터 초기화']);
 // 내 데이터 보관 is folded to one line; opening it shows the backup tools.
 await expect(page.locator('#fmStorageSum')).toHaveText('☁️ 백업 꺼짐');
 await expect(page.locator('#export')).toBeHidden();await page.locator('#fmStorage>summary').click();
 for(const id of ['export','fmBackupStatus','importBtn'])await expect(page.locator('.fm-device-storage #'+id)).toBeVisible();
 await expect(page.locator('#exportShare')).toBeHidden();
 await expect(page.locator('#csvExport')).toHaveCount(0);
 await expect(page.locator('.fm-device-storage #fmLedgerImport')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('certificates can be added, edited and deleted, and ride along in backups',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 await page.locator('#fmCertOpen').click();
 await expect(page.locator('#fmCertOverlay')).toBeVisible();
 await page.locator('#fmCertAdd').click();
 await page.locator('#fmCertName').fill('정보처리기사');await page.locator('#fmCertOrg').fill('한국산업인력공단');await page.locator('#fmCertDate').fill('2024-06-14');
 await page.locator('#fmCertForm button.primary').click();
 await page.locator('#fmCertAdd').click();await page.locator('#fmCertName').fill('SQLD');await page.locator('#fmCertDate').fill('2025-03-01');await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('#fmCertTitle')).toHaveText('🎓 내 자격증 2개');
 await expect(page.locator('.fm-cert')).toHaveText(['💻SQLD2025.03.01','💻정보처리기사한국산업인력공단 · 2024.06.14']);
 await page.locator('.fm-cert',{hasText:'SQLD'}).click();
 await page.locator('#fmCertOrg').fill('데이터산업진흥원');await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('.fm-cert').first()).toHaveText('💻SQLD데이터산업진흥원 · 2025.03.01');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_certificates_v1')).list.length);expect(saved).toBe(2);
 await page.locator('.fm-cert',{hasText:'SQLD'}).click();await page.locator('#fmCertDel').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('.fm-cert')).toHaveCount(1);
 await page.locator('#fmCertAdd').click();await page.locator('#fmCertName').fill('일반기계기사');await page.locator('#fmCertGoal').check();await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('.fm-cert-goal')).toHaveText('🎯일반기계기사도전 중');
 await expect(page.locator('#fmCertSub')).toHaveText('새내기 수집가 · 도전 중 1');
 // A goal with an exam date counts down; the form label follows the goal checkbox.
 await page.locator('.fm-cert-goal').click();await expect(page.locator('#fmCertDateLbl')).toHaveText('시험일');
 await page.locator('#fmCertDate').fill(await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+23);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));
 await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('.fm-cert-goal .fm-cert-dday')).toHaveText('D-23');
 await expect(page.locator('#fmCertSub')).toHaveText('새내기 수집가 · 도전 중 1 · D-23');
 await page.locator('[data-close="fmCertOverlay"]').click();await expect(page.locator('#fmCertOverlay')).toBeHidden();
 await page.locator('#fmStorage>summary').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 const backup=JSON.parse(require('fs').readFileSync(await download.path(),'utf8'));
 expect(backup.extras.firemate_certificates_v1.list.map(c=>c.name)).toEqual(['정보처리기사','일반기계기사']);
});

test('위시리스트 adds items with a price, checks them off when bought, deletes after asking, and survives reload',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmWishSub')).toHaveText('갖고 싶은 걸 적어 두세요');
 await page.locator('#fmWishOpen').click();
 await page.locator('#fmWishName').fill('아이패드');await page.locator('#fmWishPrice').fill('1,200,000');await page.locator('#fmWishForm button').click();
 await page.locator('#fmWishName').fill('러닝화');await page.locator('#fmWishPrice').fill('150000');await page.locator('#fmWishForm button').click();
 await expect(page.locator('#fmWishHero')).toContainText('갖고 싶은 것 2개₩1,350,0000 / 2 샀어요');
 await page.locator('[aria-label="러닝화 샀어요"]').click();
 await expect(page.locator('.fm-wish-item.done')).toContainText('러닝화');
 await expect(page.locator('#fmWishHero')).toContainText('1 / 2 샀어요');
 await expect(page.locator('.fm-wish-sec')).toHaveText('산 것 ✓');
 await page.locator('[aria-label="아이패드 지우기"]').click();
 await page.getByRole('button',{name:'지우기',exact:true}).click();
 await expect(page.locator('.fm-wish-item')).toHaveCount(1);
 await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_wishlist_v1')).list.map(w=>[w.name,w.price,w.done]))).toEqual([['러닝화',150000,true]]);
});
