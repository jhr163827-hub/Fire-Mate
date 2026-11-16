// Navigate through visible destinations; never unhide production DOM for tests.
async function moreRoot(page){
 const life=page.locator('#fmLifeOverlay');if(await life.isVisible())await life.locator('[data-close="fmLifeOverlay"]').click();
 const space=page.locator('#fmSpaceOverlay');if(await space.isVisible())await space.locator('[data-close]').click();
 if(!await page.locator('#settingsOverlay').isVisible())await page.locator('#settingsBottom').click();
}
async function openSettings(page){
 if(await page.locator('#fmSpaceOverlay').isVisible()&&await page.locator('#fmMoreSettings').isVisible())return;
 await moreRoot(page);await page.locator('#fmMoreSettingsOpen').click();
}
async function openTool(page,id){
 await moreRoot(page);
 const kind=await page.locator(id).evaluate(el=>el.closest('[data-space-page]')?.dataset.spacePage);
 if(!kind)return findMore(page,id);
 await page.locator('[data-space-open="'+kind+'"]').click();
 const manage=page.locator('#fmGoalManage');if(kind==='goals'&&await manage.getAttribute('open')===null)await manage.locator('summary').click();
 await page.locator(id).click();
}
async function findMore(page,id){
 await moreRoot(page);
 const label=await page.locator(id+' strong').innerText();await page.locator('#fmMoreQ').fill(label);await page.locator('#fmMoreHits [data-more-go="'+id.slice(1)+'"]').click();
}
module.exports={openSettings,openTool,findMore,moreRoot};
