const {test,expect}=require('@playwright/test');

test('공부 타이머: 자격증 목표가 과목으로 들어오고, 끝내면 기록과 자격증 오늘 공부에 더해진다',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.clear();localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true},{id:'h',name:'일반기계기사',date:'2021-06-10'}]}))});
 await page.goto('/study/index.html');
 await expect(page.locator('#subs .sub strong')).toHaveText(['정보처리기사']);
 await page.locator('[data-play]').first().click();
 await expect(page.locator('#focus')).toBeVisible();
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('firemate_study_v1'));s.run.start-=40*6e4;s.run.at-=40*6e4;localStorage.setItem('firemate_study_v1',JSON.stringify(s))});
 await page.reload();
 await expect(page.locator('#focus')).toBeVisible();await expect(page.locator('#fBig')).toContainText('00:40:');
 await page.locator('#fStop').click();
 await expect(page.locator('#focus')).toBeHidden();await expect(page.locator('#total')).toContainText('0:40:');
 const v=await page.evaluate(()=>({s:JSON.parse(localStorage.getItem('firemate_study_v1')),c:JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study}));
 expect(v.s.log).toHaveLength(1);expect(v.s.log[0].min).toBe(40);expect(Object.values(v.c)).toEqual([40]);
 // deleting the record takes the minutes back off the 자격증
 await page.locator('[data-tab=tStats]').click();
 await page.locator('[data-delsess]').click();await page.locator('[data-delsess]').click();
 await expect(page.locator('#sessions .sess')).toHaveCount(0);
 expect(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('firemate_certificates_v1')).list[0].study))).toEqual([0]);
});

test('공부 타이머: 과목 추가·삭제, 삭제한 자격증 과목은 다시 안 생긴다; FIRE MATE 더보기에서 열리고 백업에 들어간다',async({page})=>{
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.clear();localStorage.setItem('firemate_certificates_v1',JSON.stringify({list:[{id:'g',name:'정보처리기사',goal:true}]}))});
 await page.goto('/study/index.html');
 await page.locator('#subs [data-addsub]').click();await page.fill('#sName','수학');await page.locator('#sheet .pri').click();
 await expect(page.locator('#subs .sub strong')).toHaveText(['정보처리기사','수학']);
 await page.locator('[data-tab=tSet]').click();await page.locator('[data-edit]').first().click();
 await page.locator('[data-del]').click();await page.locator('[data-del]').click();
 await page.reload();await expect(page.locator('#subs .sub strong')).toHaveText(['수학']);
 await page.goto('/index.html');await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmStudySub')).toHaveText('오늘 공부 전');
 expect(await page.evaluate(async()=>(await (await fetch('/index.html')).text()).includes("FM_BACKUP_EXTRAS=['firemate_study_v1'"))).toBe(true);
 await page.locator('#fmStudyOpen').click();await expect(page).toHaveURL(/\/study\/$/);
});
