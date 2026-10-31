const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('settings is one page of grouped rows: 나의 목표 · 돈 관리 · 보안·데이터 · 재미, without mail, quote or export sections',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 const groups=await page.evaluate(()=>[...document.querySelectorAll('#settingsOverlay .fm-set-h')].map(h=>[h.textContent,[...h.nextElementSibling.children].map(e=>e.id||e.querySelector(':scope>summary')?.textContent.trim())]));
 expect(groups).toEqual([['나의 목표',['fmTodoOpen','fmCertOpen','fmBucketOpen','fmWishOpen']],['돈 관리',['📋월급 주기 계획','fmHomeLines']],['보안·데이터',['fmLockRow','fmStorage','⚠️데이터 초기화']],['생활',['fmEngOpen','fmHealthOpen','fmJournalOpen']],['재미',['fmArcadeOpen']]]);
 // A full page, not a sheet; the lock is a switch.
 const box=await page.locator('#settingsOverlay .modal').boundingBox();expect(box.height).toBeGreaterThan(800);
 await expect(page.locator('#fmLockOn')).toHaveClass(/fm-switch/);
 // 내 데이터 보관 is folded to one line; opening it shows the backup tools.
 await expect(page.locator('#fmStorageSum')).toHaveText('☁️ 백업 꺼짐');
 await expect(page.locator('#export')).toBeHidden();await page.locator('#fmStorage>summary').click();
 for(const id of ['export','fmBackupStatus','importBtn'])await expect(page.locator('.fm-device-storage #'+id)).toBeVisible();
 await expect(page.locator('#exportShare')).toBeHidden();
 await expect(page.locator('#csvExport')).toHaveCount(0);
 await expect(page.locator('.fm-device-storage #fmLedgerImport')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('certificates are found by search, show their facts, and are added, edited, deleted and backed up',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 await page.locator('#fmCertOpen').click();
 await expect(page.locator('#fmCertOverlay')).toBeVisible();
 // Typing part of a name finds it in the catalog.
 await page.locator('#fmCertQ').fill('기계기사');
 await expect(page.locator('.fm-cert-hits button').first()).toContainText('일반기계기사');
 await page.locator('.fm-cert-hits button',{hasText:'일반기계기사'}).click();
 const info=page.locator('#fmCertInfo');
 await expect(info).toContainText('일반기계기사');await expect(info).toContainText('한국산업인력공단 (Q-net) ↗');await expect(info).toContainText('필기(객관식) → 실기');
 await expect(info.locator('a')).toHaveAttribute('href','https://www.q-net.or.kr');
 await page.locator('#fmCertDate').fill('2021-06-01');await page.locator('#fmCertForm button.primary').click();
 // A US licence by its Korean nickname.
 await page.locator('#fmCertQ').fill('미국기술사');await page.locator('.fm-cert-hits button',{hasText:'Thermal and Fluid Systems'}).click();
 await expect(info).toContainText('NCEES (미국)');await expect(info).toContainText('주별 갱신');
 await page.locator('#fmCertDate').fill('2024-10-20');await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('#fmCertTitle')).toHaveText('내 자격증 2개');
 await expect(page.locator('.fm-cert-row')).toHaveText(['🇺🇸'.length?/PE Mechanical: Thermal and Fluid SystemsPE · NCEES \(미국\) · 2024\.10 취득/:'',/일반기계기사기사 · 한국산업인력공단 \(Q-net\) · 2021\.06 취득/]);
 await expect(page.locator('.fm-cert-grades i')).toHaveText(['보유 2','PE 1','기사 1']);
 // Edit, then delete.
 await page.locator('.fm-cert-row',{hasText:'일반기계기사'}).click();await page.locator('#fmCertOrg').fill('Q-net');await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('.fm-cert-row',{hasText:'일반기계기사'})).toContainText('기사 · Q-net');
 // 기사 suggests the same field's 기술사; picking one starts a goal.
 await page.locator('[data-cert-sug="건설기계기술사"]').click();
 await expect(page.locator('[data-cert-mode="goal"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#fmCertDateLbl')).toHaveText('시험일');
 await page.locator('#fmCertDate').fill(await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+23);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));
 await page.locator('#fmCertForm button.primary').click();
 // The main goal takes the top: D-day, this week against 10 hours, today's minutes, 12-week grass and stages.
 const g=page.locator('.fm-cert-today');
 await expect(g.locator('.fm-cert-thead b')).toHaveText('D-23');await expect(g.locator('.fm-cert-stages button')).toHaveText(['1 필기','2 면접']);
 await expect(g.locator('.fm-cert-grass i')).toHaveCount(84);
 await g.locator('[data-cert-add="30"]').click();await g.locator('[data-cert-add="30"]').click();
 await expect(g.locator('.fm-cert-add span')).toHaveText('오늘 1시간');await expect(g.locator('.fm-cert-week span')).toHaveText('이번 주 1시간 / 10시간');
 await expect(g.locator('.fm-cert-tip')).toContainText('🔥 1일 연속');
 await g.locator('[data-cert-weekedit]').click();await g.locator('[data-cert-weekform] input').fill('5');await g.locator('[data-cert-weekform] button').click();
 await expect(page.locator('.fm-cert-today .fm-cert-week span')).toHaveText('이번 주 1시간 / 5시간');
 await page.locator('.fm-cert-today [data-cert-stage]').first().click();await expect(page.locator('.fm-cert-today .fm-cert-stages button')).toHaveText(['✓ 필기','2 면접']);
 await expect(page.locator('#fmCertSub')).toHaveText('준비 중 1 · D-23');
 // Typing a name that is not in the catalog adds it as typed.
 await page.locator('#fmCertQ').fill('사내 품질 인증');await page.locator('.fm-cert-hits .own').click();await page.locator('#fmCertForm button.primary').click();
 await page.locator('.fm-cert-row',{hasText:'사내 품질 인증'}).click();await page.locator('#fmCertDel').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('.fm-cert-row')).toHaveCount(2);
 await page.locator('[data-close="fmCertOverlay"]').click();await expect(page.locator('#fmCertOverlay')).toBeHidden();
 await page.locator('#fmStorage>summary').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 const backup=JSON.parse(require('fs').readFileSync(await download.path(),'utf8'));
 expect(backup.extras.firemate_certificates_v1.list.map(c=>c.name).sort()).toEqual(['PE Mechanical: Thermal and Fluid Systems','건설기계기술사','일반기계기사']);
});

test('names typed before the catalog still get their grade and issuer, and language scores show when they expire',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'a',name:'일반기계기사',date:'2021-06-01'},{id:'b',name:'미국 기술사',date:'2024-10-20'},{id:'c',name:'TOEIC',date:'2020-01-05'}]})));
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await expect(page.locator('.fm-cert-row',{hasText:'미국 기술사'})).toContainText('PE · NCEES (미국)');
 await expect(page.locator('.fm-cert-row',{hasText:'TOEIC'}).locator('em')).toHaveText('만료');
});

test('위시리스트 adds items, edits price, saving, link and 꼭, checks them off, deletes after asking, and survives reload',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmWishSub')).toHaveText('갖고 싶은 걸 적어 두세요');
 await page.locator('#fmWishOpen').click();
 await page.locator('#fmWishName').fill('아이패드');await page.locator('#fmWishPrice').fill('1200000');await expect(page.locator('#fmWishPrice')).toHaveValue('1,200,000');await page.locator('#fmWishForm button').click();
 await page.locator('#fmWishName').fill('러닝화');await page.locator('#fmWishForm button').click();
 await expect(page.locator('#fmWishHero')).toContainText('갖고 싶은 것 2개');
 await expect(page.locator('#fmWishHero')).toContainText('₩1,200,000');
 // Every new wish starts the 30-day rule; one without a price asks for it.
 await expect(page.locator('.fm-wish-item',{hasText:'아이패드'})).toContainText('30일 더 고민');
 await page.locator('.fm-wish-item',{hasText:'러닝화'}).locator('.fm-wish-noprice').click();
 await page.locator('#fmWishEPrice').fill('150000');await page.locator('[data-wish-add="50000"]').click();
 await page.locator('#fmWishELink').fill('shop.example.com/shoe');await page.locator('#fmWishEPri').check();
 await page.locator('#fmWishEForm button.primary').click();await expect(page.locator('#fmWishSheet')).toBeHidden();
 const shoe=page.locator('.fm-wish-item',{hasText:'러닝화'});
 await expect(page.locator('.fm-wish-item').first()).toContainText('러닝화');// 꼭 goes to the top
 await expect(shoe).toContainText('₩150,000 · ₩50,000 모음');await expect(shoe).toContainText('🔥 러닝화 🔗');
 await expect(page.locator('#fmWishHero')).toContainText('₩1,300,000');
 await page.locator('[aria-label="러닝화 샀어요"]').click();
 await expect(page.locator('.fm-wish-sec')).toHaveText('산 것 ✓ · ₩150,000');
 await page.locator('[data-wish-edit]',{hasText:'아이패드'}).click();await page.locator('#fmWishEDel').click();
 await page.getByRole('button',{name:'지우기',exact:true}).last().click();
 await expect(page.locator('.fm-wish-item')).toHaveCount(1);
 await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_wishlist_v1')).list.map(w=>[w.name,w.price,w.saved,w.link,w.pri,w.done]))).toEqual([['러닝화',150000,50000,'https://shop.example.com/shoe',true,true]]);
});

test('앱 잠금 is a 6-digit PIN on the app\'s own keypad (no browser sheet showing the site address)',async({page})=>{
 const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());d.dismiss()});
 await page.goto('/index.html');
 const type=async pin=>{for(const k of pin)await page.locator('#fmPinPad [data-k="'+k+'"]').click()};
 await page.locator('#settingsBottom').click();
 await page.locator('#fmLockOn').check();
 await expect(page.locator('#fmLockTitle')).toHaveText('새 비밀번호 6자리');await type('135790');
 await expect(page.locator('#fmLockTitle')).toHaveText('한 번 더 입력해 주세요');await type('135790');
 await expect(page.locator('#fmLock')).toBeHidden();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_pin_v1')));
 expect(saved.hash).toMatch(/^[A-Za-z0-9+/=]{40,}$/);expect(JSON.stringify(saved)).not.toContain('135790');
 await page.reload();
 await expect(page.locator('#fmLock')).toBeVisible();await expect(page.locator('.app')).toBeHidden();
 await type('111111');await expect(page.locator('#fmLockTitle')).toHaveText('비밀번호가 달라요');
 await type('135790');await expect(page.locator('#fmLock')).toBeHidden();await expect(page.locator('.app')).toBeVisible();
 // Turning it off asks for the PIN once.
 await page.locator('#settingsBottom').click();await page.locator('#fmLockOn').uncheck();await type('135790');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('firemate_pin_v1'))).toBeNull();
 await expect(page.locator('#fmLockOn')).not.toBeChecked();
 expect(dialogs).toEqual([]);
});

test('on a phone with 지문·Face ID the lock uses it, with no keypad',async({page})=>{
 await page.addInitScript(()=>{PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable=async()=>true;
  CredentialsContainer.prototype.create=async()=>({rawId:new Uint8Array([7,7,7]).buffer});
  CredentialsContainer.prototype.get=async o=>{if(!window.__pass)throw new DOMException('cancelled','NotAllowedError');return {rawId:o.publicKey.allowCredentials[0].id}}});
 await page.goto('/index.html');
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmLockSub')).toHaveText('지문·Face ID');
 await page.locator('#fmLockOn').check();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('firemate_lock_v1'))).toBe('BwcH');
 await page.reload();
 await expect(page.locator('#fmLockGo')).toHaveText('지문으로 열기');await expect(page.locator('#fmPinPad')).toBeHidden();await expect(page.locator('.app')).toBeHidden();
 await page.evaluate(()=>{window.__pass=true});await page.locator('#fmLockGo').click();
 await expect(page.locator('#fmLock')).toBeHidden();await expect(page.locator('.app')).toBeVisible();
 await page.locator('#settingsBottom').click();await page.locator('#fmLockOn').uncheck();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('firemate_lock_v1'))).toBeNull();
});

test('Mensa and 기술자 등급 are in the search with what they are, and a 기술자 grade suggests the next one',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await page.locator('#fmCertQ').fill('멘사');await page.locator('.fm-cert-hits button',{hasText:'멘사 (Mensa) 회원'}).click();
 const info=page.locator('#fmCertInfo');await expect(info).toContainText('멘사코리아 ↗');await expect(info).toContainText('지능검사 (상위 2%)');
 await page.locator('#fmCertForm button.primary').click();
 await page.locator('#fmCertQ').fill('기술자');await expect(page.locator('.fm-cert-hits button',{hasText:'소방기술자 초급'})).toBeVisible();
 await page.locator('#fmCertQ').fill('건설기술인 중급');await page.locator('.fm-cert-hits button',{hasText:'건설기술인 중급'}).click();
 await expect(info).toContainText('시험 없음 · 자격·학력·경력 점수로 등급');await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('[data-cert-sug="건설기술인 고급"]')).toBeVisible();
 await expect(page.locator('.fm-cert-row',{hasText:'멘사'}).locator('.fm-cert-ico')).toHaveText('🧠');
});

test('a certificate keeps a photo or PDF of itself on this phone',async({page})=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnxEJMDKgAhwmAQBSRgP7PwEQXgAAAABJRU5ErkJggg==','base64');
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await page.locator('#fmCertQ').fill('일반기계기사');await page.locator('.fm-cert-hits button',{hasText:'일반기계기사'}).click();
 // Picked before saving: kept with the new entry.
 await page.locator('#fmCertFileIn').setInputFiles({name:'license.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#fmCertFileOpen')).toContainText('사진 보기');
 await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('.fm-cert-row .fm-cert-clip')).toHaveCount(1);
 await page.locator('.fm-cert-row').click();await page.locator('#fmCertFileOpen').click();
 await expect(page.locator('#fmCertView')).toBeVisible();await expect(page.locator('#fmCertViewImg')).toHaveAttribute('src',/^blob:/);
 await page.locator('#fmCertViewX').click();
 // A PDF replaces it; taking it off asks first.
 await page.locator('#fmCertFileDel').click();await page.locator('#fmAskOk').click();
 await page.locator('#fmCertFileIn').setInputFiles({name:'license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%qa\n')});
 await expect(page.locator('#fmCertFileOpen')).toContainText('license.pdf');
 expect(await page.evaluate(()=>JSON.stringify(localStorage).includes('PDF-1.4'))).toBe(false);
});

test('certificates live in settings only (no home line or morning notice), and passing is celebrated',async({page})=>{
 await page.addInitScript(()=>{window.__fmBriefTest=true;localStorage.setItem('firemate_last_backup_v1',new Date().toISOString());if(sessionStorage.getItem('cg'))return;sessionStorage.setItem('cg','1');const k=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'건설기계기술사',goal:true,date:k(7),apply:k(2),study:{[k(-4)]:60}}]}))});
 await page.goto('/index.html');
 // FIRE MATE's home and morning popup are about money; the certificate screen is in settings.
 await page.waitForTimeout(400);
 await expect(page.locator('#fmHomeCert')).toHaveCount(0);
 expect(await page.locator('.fm-brief-pop').count()?await page.locator('.fm-brief-pop').textContent():'').not.toContain('건설기계기술사');
 await page.locator('#settingsBottom').click();await page.locator('#fmHomeLines>summary').click();await expect(page.locator('[data-home-line="cert"]')).toHaveCount(0);
 await page.locator('#fmCertOpen').click();
 await page.locator('.fm-cert-thead').click();await page.locator('[data-cert-mode="have"]').click();await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('.fm-cele')).toContainText('합격 축하해요!');
 await expect(page.locator('.fm-cert-none')).toContainText('🎯 다음 목표 하나 정하기');
});

test('the phone\'s back closes only the certificate sheet or photo, then the certificate screen',async({page})=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnxEJMDKgAhwmAQBSRgP7PwEQXgAAAABJRU5ErkJggg==','base64');
 await page.goto('/index.html');await page.locator('#settingsBottom').click();await page.locator('#fmCertOpen').click();
 await page.locator('#fmCertQ').fill('일반기계기사');await page.locator('.fm-cert-hits button',{hasText:'일반기계기사'}).click();
 await expect(page.locator('#fmCertSheet')).toBeVisible();
 // 취득 has no 접수 마감; 준비 has.
 await expect(page.locator('#fmCertApplyRow')).toBeHidden();await page.locator('[data-cert-mode="goal"]').click();await expect(page.locator('#fmCertApplyRow')).toBeVisible();await page.locator('[data-cert-mode="have"]').click();
 await page.goBack();
 await expect(page.locator('#fmCertSheet')).toBeHidden();await expect(page.locator('#fmCertOverlay')).toBeVisible();
 // Saving closes the sheet without leaving a step behind; a photo opens over the sheet and back closes just the photo.
 await page.locator('#fmCertQ').fill('일반기계기사');await page.locator('.fm-cert-hits button',{hasText:'일반기계기사'}).click();
 await page.locator('#fmCertFileIn').setInputFiles({name:'l.png',mimeType:'image/png',buffer:png});await page.locator('#fmCertForm button.primary').click();
 await expect(page.locator('#fmCertSheet')).toBeHidden();
 await page.locator('.fm-cert-row').click();await page.locator('#fmCertFileOpen').click();await expect(page.locator('#fmCertView')).toBeVisible();
 await page.goBack();await expect(page.locator('#fmCertView')).toBeHidden();await expect(page.locator('#fmCertSheet')).toBeVisible();
 await page.goBack();await expect(page.locator('#fmCertSheet')).toBeHidden();await expect(page.locator('#fmCertOverlay')).toBeVisible();
 await page.goBack();await expect(page.locator('#fmCertOverlay')).toBeHidden();await expect(page.locator('#settingsOverlay')).toBeVisible();
});

test('버킷리스트: add by typing or an idea, sorted by the words, edited with year and cost, and checked off with a moment',async({page})=>{
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmBucketSub')).toHaveText('해 보고 싶은 걸 적어 두세요');
 await page.locator('#fmBucketOpen').click();await expect(page.locator('#fmBucketOverlay')).toBeVisible();
 await page.locator('#fmBucketName').fill('아이슬란드 오로라 여행');await page.locator('#fmBucketForm button').click();
 await page.locator('[data-bk-idea="풀코스 마라톤 완주"]').click();
 await expect(page.locator('.fm-bk-row .fm-bk-ico')).toHaveText(['✈️','💪']);
 // Edit: target year and cost; the hero counts this year and the money.
 await page.locator('.fm-bk-open',{hasText:'오로라'}).click();
 const y=new Date().getFullYear();await page.locator('#fmBkYear').fill(String(y));await page.locator('#fmBkCost').fill('6000000');await page.locator('#fmBucketEForm button.primary').click();
 await expect(page.locator('#fmBucketSheet')).toBeHidden();
 await expect(page.locator('.fm-bk-hero p')).toContainText('올해 목표 1개 · 남은 것에 필요한 돈 600만원');
 await expect(page.locator('#fmBucketList h3').first()).toHaveText(y+'년 · 올해');
 // Back closes only the sheet.
 await page.locator('.fm-bk-open',{hasText:'마라톤'}).click();await page.goBack();await expect(page.locator('#fmBucketSheet')).toBeHidden();await expect(page.locator('#fmBucketOverlay')).toBeVisible();
 await page.locator('[data-bk-check]').first().click();
 await expect(page.locator('.fm-cele')).toContainText('이뤘어요!');
 await expect(page.locator('.fm-bk-hero strong')).toHaveText('1 / 2');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_bucket_v1')).list);expect(saved.map(b=>b.cat)).toEqual(['travel','health']);expect(saved.find(b=>b.done).doneAt).toMatch(/^\d{4}-\d\d-\d\d$/);
});
