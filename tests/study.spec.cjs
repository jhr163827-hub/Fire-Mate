const {test,expect}=require('@playwright/test');
const open=async page=>{await page.locator('#settingsBottom').click();await page.locator('#fmStudyOpen').click();await expect(page.locator('#fmStudyOverlay')).toBeVisible()};

test('⏱️ 공부 타이머 (더보기 안): 자격증 목표가 과목으로 들어오고, 끝내면 기록과 자격증 오늘 공부에 더해진다',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true},{id:'h',name:'일반기계기사',date:'2021-06-10'}]}))});
 await page.goto('/index.html');
 await expect(page.locator('#fmStudySub')).toHaveText('오늘 공부 전');
 await open(page);
 await expect(page.locator('#fmStudyBody .fm-st-sub strong')).toHaveText(['정보처리기사']);
 await page.locator('[data-st-play]').first().click();
 await expect(page.locator('#fmStudyFocus')).toBeVisible();
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1'));s.run.start-=40*6e4;s.run.at-=40*6e4;localStorage.setItem('firemate_study_v1',JSON.stringify(s))});
 await page.reload();await expect(page.locator('#fmStudySub')).toHaveText('⏱ 공부 중');
 await open(page);
 await expect(page.locator('#fmStudyFocus')).toBeVisible();await expect(page.locator('#fmStudyBig')).toContainText('00:40:');
 // phone back closes only the focus screen; the timer keeps going
 await page.goBack();await expect(page.locator('#fmStudyFocus')).toBeHidden();await expect(page.locator('#fmStudyOverlay')).toBeVisible();
 await page.locator('[data-st-play]').first().click();await expect(page.locator('#fmStudyFocus')).toBeVisible();
 await page.locator('#fmStudyStop').click();
 await expect(page.locator('#fmStudyFocus')).toBeHidden();await expect(page.locator('[data-st-total]')).toContainText('0:40:');
 const v=await page.evaluate(()=>({s:JSON.parse(localStorage.getItem('firemate_study_v1')),c:JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study}));
 expect(v.s.log).toHaveLength(1);expect(v.s.log[0].min).toBe(40);expect(Object.values(v.c)).toEqual([40]);
 // the 자격증 screen shows the same minutes; deleting the record takes them back off
 await page.locator('[data-st-tab="r"]').click();await expect(page.locator('.fm-st-sess')).toHaveCount(1);
 await page.locator('[data-st-del]').click();await page.locator('#fmAskOk').click();
 await expect(page.locator('.fm-st-sess')).toHaveCount(0);
 expect(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study))).toEqual([0]);
});

test('⏱️ 공부 타이머: 과목 추가·삭제(삭제한 자격증 과목은 다시 안 생김), 일시정지, 내리기, 바로 가기와 백업',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true}]}))});
 await page.goto('/index.html');await open(page);
 await page.locator('#fmStudyBody [data-st-new]').click();await page.fill('#fmStudyName','수학');await page.locator('#fmStudyForm .primary').click();
 await expect(page.locator('#fmStudyBody .fm-st-sub strong')).toHaveText(['정보처리기사','수학']);
 await page.locator('[data-st-play]').nth(1).click();await page.locator('#fmStudyPause').click();
 await expect(page.locator('#fmStudyPause')).toHaveText('계속하기');await expect(page.locator('#fmStudyBig')).toHaveClass(/paused/);
 await page.locator('#fmStudyMin').click();await expect(page.locator('#fmStudyFocus')).toBeHidden();await expect(page.locator('[data-st-play]').nth(1)).toContainText('⏸');
 await page.locator('[data-st-tab="s"]').click();await page.locator('[data-st-edit]').first().click();
 await page.locator('[data-st-rm]').click();await page.locator('#fmAskOk').click();
 await page.reload();await open(page);await expect(page.locator('#fmStudyBody .fm-st-sub strong')).toHaveText(['수학']);
 expect(await page.evaluate(async()=>(await (await fetch('/index.html')).text()).includes("FM_BACKUP_EXTRAS=['firemate_study_v1'"))).toBe(true);
 await page.goto('/index.html?action=study');await expect(page.locator('#fmStudyOverlay')).toBeVisible();
});
