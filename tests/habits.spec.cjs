const {test,expect}=require('@playwright/test');
const ds=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return ds(d)};
const monday=(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d})();
const lastWeek=n=>{const d=new Date(monday);d.setDate(d.getDate()-7+n);return ds(d)};
const prevWeek=n=>{const d=new Date(monday);d.setDate(d.getDate()-14+n);return ds(d)};
const month=ds(new Date()).slice(0,7);
const seed=()=>({theme:'dark',rec:[],budgets:{[month]:500000},tx:[
 {id:'t',date:ds(new Date()),type:'expense',category:'식비',amount:12000,memo:'점심'},
 {id:'w1',date:lastWeek(0),type:'expense',category:'쇼핑',amount:60000,memo:'옷'},{id:'w2',date:lastWeek(2),type:'expense',category:'식비',amount:20000,memo:'저녁'},
 {id:'p1',date:prevWeek(1),type:'expense',category:'식비',amount:40000,memo:'장보기'}]});
test.beforeEach(async({page})=>{await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort())});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const open=async(page,s=seed(),flags={})=>{await page.addInitScript(([s,flags])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s));Object.assign(window,flags);for(const [k,v] of Object.entries(flags.store||{}))localStorage.setItem(k,v)},[s,flags]);await page.goto('/index.html')};

test('home says what was spent today and what is left this month',async({page})=>{
 await open(page);
 await expect(page.locator('#fmPaceLine')).toContainText('오늘 ₩12,000');
 await expect(page.locator('#fmPaceLine')).toContainText('이 속도면 월');
});

test('the weekly report compares last week with the week before and can be dismissed',async({page})=>{
 await open(page,seed(),{__fmWeekReportAnyDay:true});
 const card=page.locator('#fmWeekReport');
 await expect(card).toContainText('지출₩80,000');
 await expect(card).toContainText('+₩40,000 (100%)');
 await expect(card).toContainText('쇼핑 ₩60,000');
 await expect(card).toContainText('무지출5일');
 await card.locator('button').click();await expect(card).toHaveCount(0);
 await page.reload();await expect(page.locator('#view-home .fm-home-fire')).toBeVisible();await expect(page.locator('#fmWeekReport')).toHaveCount(0);
});

test('no-spend days are marked only inside the recorded range, with the month count and streak',async({page})=>{
 const day=new Date().getDate();test.skip(day<4,'needs a few days of this month');
 await open(page,{theme:'dark',rec:[],budgets:{},tx:[{id:'a',date:month+'-01',type:'expense',category:'식비',amount:5000},{id:'b',date:ago(1),type:'income',category:'급여',amount:1}]});
 await page.evaluate(()=>window.fmGo('calendar'));
 await expect(page.locator('#view-calendar .day[data-date="'+month+'-01"]')).not.toHaveClass(/fm-nospend/);
 await expect(page.locator('#view-calendar .day[data-date="'+month+'-02"]')).toHaveClass(/fm-nospend/);
 await expect(page.locator('#view-calendar .day[data-date="'+ds(new Date())+'"]')).not.toHaveClass(/fm-nospend/);
 await expect(page.locator('#fmNoSpendLine')).toContainText('이번 달 무지출 '+(day-2)+'일');
 await expect(page.locator('#fmNoSpendLine')).toContainText('연속 '+(day-2)+'일');
});

test('a newly crossed net-worth line is celebrated once',async({page})=>{
 await open(page,{...seed(),accounts:[{id:'k',name:'KB',kind:'cash',amount:105000000}],holdings:[]},{__fmMilestoneTest:true,store:{firemate_milestone_v1:'50000000'}});
 const card=page.locator('#fmMilestone');
 await expect(card).toContainText('순자산 1억 돌파');
 await expect(card).toContainText('다음 목표 1.5억까지 ₩45,000,000');
 await card.locator('button').click();
 expect(await page.evaluate(()=>localStorage.getItem('firemate_milestone_v1'))).toBe('100000000');
});

test('home-screen shortcuts are declared and ?action=record opens the entry dialog',async({page})=>{
 const manifest=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..','manifest.webmanifest'),'utf8'));
 expect(manifest.shortcuts.map(s=>s.url)).toEqual(['./index.html?action=import','./index.html?action=record']);
 await page.goto('/index.html?action=record');
 await expect(page.locator('#entryOverlay')).toHaveClass(/show/);
 expect(new URL(page.url()).search).toBe('');
});
