const {test,expect}=require('@playwright/test');
const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const monthAgo=n=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-n);return ym(d)};
const today=new Date().toISOString().slice(0,10);
const seed=()=>({theme:'dark',rec:[],budgets:{[monthAgo(1)]:100000},tx:[
 {id:'a',date:today,type:'expense',category:'식비',amount:9000,memo:'점심'},
 {id:'b',date:monthAgo(1)+'-10',type:'expense',category:'쇼핑',amount:120000,memo:'운동화'},
 {id:'c',date:monthAgo(1)+'-12',type:'expense',category:'식비',amount:30000,memo:'저녁'},
 {id:'d',date:monthAgo(1)+'-25',type:'income',category:'급여',amount:3000000,memo:'월급'},
 {id:'e',date:monthAgo(6)+'-03',type:'expense',category:'여행',amount:500000,memo:'제주'}],
 dailySnapshots:[{day:monthAgo(2)+'-28',amount:10000000},{day:monthAgo(1)+'-28',amount:12500000}]});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s));window.__fmMonthReportAnyDay=true},seed());
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const edits=page=>page.locator('#historyList [data-edit]').evaluateAll(els=>els.map(e=>e.dataset.edit).sort());

test('history search widens by period and narrows by amount range',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('history'));
 expect(await edits(page)).toEqual(['a']);
 await page.locator('#filterPeriod').selectOption('3m');
 expect(await edits(page)).toEqual(['a','b','c','d']);
 await page.locator('#filterMin').fill('20000');await page.locator('#filterMax').fill('200000');
 expect(await edits(page)).toEqual(['b','c']);
 await expect(page.locator('#historySummary')).toHaveText('2건 · 지출 ₩150,000 · 수입 ₩0 · 최근 3개월');
 await page.locator('#filterPeriod').selectOption('all');await page.locator('#filterMax').fill('');
 expect(await edits(page)).toEqual(['b','c','d','e']);
 await page.locator('#search').fill('제주');
 expect(await edits(page)).toEqual(['e']);
});

test('home shows last month in one card and closing it keeps it closed',async({page})=>{
 await page.goto('/index.html');
 const card=page.locator('#fmMonthReport');
 await expect(card).toContainText('지출₩150,000');
 await expect(card).toContainText('수입₩3,000,000');
 await expect(card).toContainText('₩50,000 넘었어요');
 await expect(card).toContainText('쇼핑 ₩120,000');
 await expect(card).toContainText('+₩2,500,000');
 await page.locator('#fmMonthReportClose').click();
 await expect(card).toHaveCount(0);
 await page.reload();
 await expect(page.locator('#view-home .fm-home-fire')).toBeVisible();
 await expect(page.locator('#fmMonthReport')).toHaveCount(0);
});

test('last month opens as swipeable story cards that close at the end',async({page})=>{
 await page.goto('/index.html');
 await page.locator('#fmMonthStory').click();
 const story=page.locator('.fm-story');await expect(story).toBeVisible();
 const cards=story.locator('.fm-story-card');await expect(cards).toHaveCount(4);
 await expect(cards.nth(0)).toContainText('₩150,000');
 await expect(cards.nth(1)).toContainText('쇼핑');
 await expect(cards.nth(2)).toContainText('+₩2,500,000');
 await expect(cards.nth(3)).toContainText('돈 안 쓴 날');
 for(let i=0;i<4;i++){await story.locator('.fm-story-track').click({position:{x:350,y:400}});await page.waitForTimeout(450)}
 await expect(story).toHaveCount(0);
});

test('the year report opens as story cards too',async({page})=>{
 await page.addInitScript(()=>{window.__fmYearAnyDay=true});
 await page.goto('/index.html');
 await page.locator('#fmHomeYear').click();
 await page.locator('#fmYearStory').click();
 const cards=page.locator('.fm-story .fm-story-card');
 await expect(cards.first()).toContainText('년 모은 돈');
 await expect(page.locator('.fm-story')).toContainText('무지출 날');
});
