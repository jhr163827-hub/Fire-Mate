const {test,expect}=require('@playwright/test');
const ago=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
const history={theme:'dark',rec:[],budgets:{},tx:[
 {id:'c1',date:ago(1),type:'expense',category:'카페·간식',amount:4800,memo:'스타벅스'},
 {id:'c2',date:ago(3),type:'expense',category:'카페·간식',amount:4800,memo:'스타벅스'},
 {id:'s1',date:ago(2),type:'expense',category:'교통',amount:1550,memo:'지하철'},
 {id:'s2',date:ago(4),type:'expense',category:'교통',amount:1550,memo:'지하철'},
 {id:'s3',date:ago(5),type:'expense',category:'교통',amount:1550,memo:'지하철'},
 {id:'o1',date:ago(200),type:'expense',category:'식비',amount:9000,memo:'오래된 기록'},
 {id:'o2',date:ago(201),type:'expense',category:'식비',amount:9000,memo:'오래된 기록'},
 {id:'once',date:ago(1),type:'expense',category:'쇼핑',amount:55000,memo:'한 번'},
 {id:'p1',date:ago(10),type:'income',category:'급여',amount:3000000,memo:'월급'},
 {id:'p2',date:ago(40),type:'income',category:'급여',amount:3000000,memo:'월급'}]};
const open=async(page,seed)=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 if(seed)await page.addInitScript(seed=>{if(!sessionStorage.getItem('qa-seeded')){sessionStorage.setItem('qa-seeded','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(seed))}},seed);
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('calendar'));
 await page.locator('#fmLedgerAddBtn').click();
};
const chips=page=>page.locator('#fmQuickEntry button');
test.use({viewport:{width:360,height:640},isMobile:true,hasTouch:true});

test('new profiles get the default favorites and a tap fills the form without saving',async({page})=>{
 await open(page,null);
 await expect(page.locator('#fmQuickEntryLabel')).toHaveText('빠른 입력');
 await expect(chips(page)).toHaveText(['🍚 점심 9,000원','☕ 커피 4,500원','🚌 교통 1,500원','🛒 장보기 30,000원']);
 for(const box of await chips(page).evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height)))expect(box).toBeGreaterThanOrEqual(44);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length);
 await chips(page).nth(1).click();
 await expect(page.locator('#entryAmount')).toHaveValue('4,500');
 await expect(page.locator('#entryCat')).toHaveValue('카페·간식');
 await expect(page.locator('#entryMemo')).toHaveValue('커피');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length)).toBe(before);
 await page.locator('#saveEntry').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.at(-1));
 expect(saved).toMatchObject({type:'expense',amount:4500,category:'카페·간식',memo:'커피'});
});

test('history suggests repeated recent entries per type and hides while editing',async({page})=>{
 await open(page,history);
 await expect(page.locator('#fmQuickEntryLabel')).toHaveText('자주 쓰는 거래');
 // Most frequent first; one-off and 120+ day old entries are left out.
 await expect(chips(page)).toHaveText(['지하철 1,550원','스타벅스 4,800원']);
 await page.locator('#entryTypes [data-type="income"]').click();
 await expect(chips(page)).toHaveText(['월급 3,000,000원']);
 await page.locator('#entryTypes [data-type="transfer"]').click();
 await expect(page.locator('#fmQuickEntry')).toBeHidden();
 await page.locator('#entryOverlay [data-close]').click();
 await page.evaluate(()=>window.fmGo('history'));
 await page.locator('[data-edit]').first().click();
 await expect(page.locator('#entryTitle')).toHaveText('거래 수정');
 await expect(page.locator('#fmQuickEntry')).toBeHidden();
});
