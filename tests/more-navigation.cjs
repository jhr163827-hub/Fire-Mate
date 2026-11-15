// Existing feature suites open the compact catalog through its visible disclosures.
// Default collapsed layout, search and visibility preferences have separate navigation coverage.
async function expandMore(page){
 for(const selector of ['#fmMoreAll > details','#fmGoalManage']){
  for(const item of await page.locator(selector).all()){
   if(await item.isVisible()&&await item.getAttribute('open')===null)await item.locator(':scope > summary').click();
  }
 }
}
async function findMore(page,id){
 const life=page.locator('#fmLifeOverlay');if(await life.isVisible())await life.locator('[data-close="fmLifeOverlay"]').click();
 if(!await page.locator('#settingsOverlay').isVisible())await page.locator('#settingsBottom').click();
 const label=await page.locator(id+' strong').innerText();await page.locator('#fmMoreQ').fill(label);await page.locator('#fmMoreHits [data-more-go="'+id.slice(1)+'"]').click();
}
module.exports={expandMore,findMore};
