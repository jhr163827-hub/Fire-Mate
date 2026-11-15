const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(()=>{if(sessionStorage.organizeSeed)return;sessionStorage.organizeSeed='1';localStorage.setItem('firemate_onboarding_v1','dismissed');localStorage.setItem('firemate_bucket_v1',JSON.stringify({list:[{id:'b',name:'스위스 여행',cost:3000000}]}));localStorage.setItem('firemate_wishlist_v1',JSON.stringify({list:[{id:'w',name:'새 컴퓨터',price:2000000,at:Date.now()}]}));localStorage.setItem('firemate_reward_v1',JSON.stringify({list:[{id:'r',name:'자산 달성 여행',goal:900000000}]}));localStorage.setItem('firemate_alloc_v1',JSON.stringify({list:[{id:'a',name:'여행 준비금',amt:1000000,bucket:'b'},{id:'a2',name:'비상금',amt:200000}]}));});
 await page.goto('/index.html');
});
test('compact default, disclosure keyboard access, search reaches relocated tools and gear exposes settings',async({page})=>{
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmMoreAll > details > summary strong')).toHaveText(['목표·하고 싶은 것','공부','일상','여행','취미','앱 설정']);
 await expect(page.locator('#fmCertOpen')).toBeHidden();await expect(page.locator('#fmStorage')).toBeHidden();
 await page.locator('#fmMoreSpace-study > summary').focus();await page.keyboard.press('Enter');await expect(page.locator('#fmCertOpen')).toBeVisible();
 await page.locator('#fmMoreQ').fill('퇴사 리허설');await page.locator('#fmMoreHits [data-more-go="fmRehearsalOpen"]').click();await expect(page.locator('#fmLifeHead')).toHaveText('퇴사 리허설');await page.locator('#fmLifeOverlay [data-close]').click();
 await page.locator('#fmMoreSettingsOpen').click();await expect(page.locator('#fmStorage')).toBeVisible();
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
});
test('unified goals show linked money once and edit original record without migration',async({page})=>{
 const old=await page.evaluate(()=>localStorage.firemate_alloc_v1);await page.locator('#settingsBottom').click();await page.locator('#fmMoreSpace-goals > summary').click();
 await expect(page.locator('[data-goal-kind]')).toHaveCount(4);await expect(page.locator('[data-goal-kind=bucket]')).toContainText('배정 ₩1,000,000');await expect(page.locator('[data-goal-kind=alloc]')).toHaveCount(1);
 await page.locator('[data-goal-kind=wish]').click();await expect(page.locator('#fmWishSheet')).toBeVisible();await page.locator('#fmWishEName').fill('바꾼 컴퓨터');await page.locator('#fmWishEForm .primary').click();await page.locator('#fmWishOverlay [data-close]').click();await expect(page.locator('#fmGoalOverview')).toContainText('바꾼 컴퓨터');
 expect(await page.evaluate(()=>localStorage.firemate_alloc_v1)).toBe(old);await page.locator('[data-goal-filter=reward]').click();await expect(page.locator('[data-goal-kind]')).toHaveCount(1);
});
test('favorite overflow and hiding a space preserve all records and search access after reload',async({page})=>{
 const fav=['fmBucketOpen','fmWishOpen','fmStudyOpen','fmMemoOpen','fmTodoOpen','fmJournalOpen','fmContentOpen','fmTimeOpen'];
 await page.evaluate(fav=>localStorage.setItem('firemate_more_v1',JSON.stringify({fav,home:true,links:[],start:'fmTimeOpen'})),fav);
 await page.reload();await page.locator('#settingsBottom').click();await expect(page.locator('#fmMoreFav > .fm-more-chips [data-more-go]')).toHaveCount(6);await expect(page.locator('#fmMoreFav details [data-more-go]')).toHaveCount(2);
 await page.locator('#fmMoreEdit').click();await page.locator('[data-space-on=goals]').uncheck();await page.locator('#fmMoreDone').click();await expect(page.locator('#fmMoreSpace-goals')).toBeHidden();
 await page.locator('#fmMoreQ').fill('버킷리스트');await page.locator('#fmMoreHits [data-more-go="fmBucketOpen"]').click();await expect(page.locator('#fmBucketList')).toContainText('스위스 여행');
 await page.reload();await page.locator('#settingsBottom').click();await expect(page.locator('#fmMoreSpace-goals')).toBeHidden();const saved=await page.evaluate(()=>JSON.parse(localStorage.firemate_more_v1));expect(saved.fav).toEqual(fav);expect(saved.start).toBe('fmTimeOpen');expect(saved.home).toBe(true);
});
test('FIRE tools and history are in their owning screens; study and travel routes replace sibling overlays',async({page})=>{
 await page.locator('.bottomnav [data-view="fire"]').click();await page.locator('#fmLifeMapOpen').click();await expect(page.locator('#fmLifeHead')).toHaveText('인생 계획 지도');await page.locator('.fm-future-nav [data-future-go=rehearsal]').click();await expect(page.locator('#fmLifeHead')).toHaveText('퇴사 리허설');await expect(page.locator('[data-future-go=timemachine]')).toHaveCount(0);await page.locator('#fmLifeOverlay [data-close]').click();
 await page.locator('.bottomnav [data-view="assets"]').click();await page.locator('#fmAssetQuickAnalysis').click();await page.locator('#fmTimeOpen').click();await page.locator('[data-future-go=review]').click();await expect(page.locator('#fmLifeHead')).toHaveText('돌아보기');await page.locator('#fmLifeOverlay [data-close]').click();
 await page.locator('#settingsBottom').click();await page.locator('#fmMoreSpace-study > summary').click();await page.locator('#fmCertOpen').click();await page.locator('#fmCertOverlay [data-organize-go=fmStudyOpen]').click();await expect(page.locator('#fmStudyOverlay')).toBeVisible();await expect(page.locator('#fmCertOverlay')).toBeHidden();await page.locator('#fmStudyOverlay [data-close]').click();
 await page.locator('#fmMoreSpace-travel > summary').click();await page.locator('#fmJournalOpen').click();await page.locator('#fmJournalOverlay [data-organize-go=fmCheckOpen]').click();await expect(page.locator('#fmLifeHead')).toHaveText('준비물 체크리스트');await expect(page.locator('#fmJournalOverlay')).toBeHidden();
});
