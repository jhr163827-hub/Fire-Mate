const {test,expect}=require('@playwright/test');

test('three cases, clues, reasoning, save and final envelope on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/arcade/casefiles/');
 await expect(page.getByRole('heading',{name:/심야/})).toBeVisible();
 const cases=[['archive','윤서진'],['observatory','강도윤'],['theatre','한유라']];
 for(const [id,name] of cases){
  await page.locator(`[data-case="${id}"]`).click();
  await expect(page.locator('#scene')).toBeVisible();
  for(let i=0;i<3;i++){
   await page.locator(`#hotspots [data-clue="${i}"]`).click();
   await expect(page.locator('#clueDialog')).toBeVisible();
   await page.locator('#collectClue').click();
  }
  await expect(page.locator('#foundCount')).toContainText('3 / 5');
  await page.locator('#accuse').selectOption({label:name});
  await page.locator('#reason').selectOption('0');
  await page.locator('#submit').click();
  await expect(page.locator('#feedback')).toContainText('사건 해결');
  await page.locator('#toDesk').click();
 }
 await expect(page.locator('#progress')).toContainText('3 / 3');
 await page.reload();
 await expect(page.locator('#progress')).toContainText('3 / 3');
 await page.locator('#finalEnvelope').click();
 for(const [i,symbol] of ['달','별','열쇠'].entries())await page.locator(`[data-symbol="${i}"]`).selectOption({label:symbol});
 await page.locator('#finalSubmit').click();
 await expect(page.locator('#ending')).toBeVisible();
});

test('compact and landscape layout have no horizontal overflow',async({page})=>{
 for(const [width,height] of [[320,700],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  await page.goto('/arcade/casefiles/');
  await expect(page.locator('#caseGrid .polaroid')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.locator('[data-case="archive"]').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 }
});
