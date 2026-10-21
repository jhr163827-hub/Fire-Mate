const {test,expect}=require('@playwright/test');
const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const monthAgo=n=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-n);return ym(d)};
const seed=()=>({theme:'dark',rec:[],budgets:{},tx:[
 ...[1,2,3].flatMap(n=>[{id:'n'+n,date:monthAgo(n)+'-05',type:'expense',category:'통신·구독',amount:17000,memo:'넷플릭스'},
  ...[3,9,15,21].map(day=>({id:'s'+n+day,date:monthAgo(n)+'-'+String(day).padStart(2,'0'),type:'expense',category:'카페·간식',amount:5000,memo:'스타벅스'}))]),
 {id:'u1',date:monthAgo(1)+'-10',type:'expense',category:'기타',amount:12000,memo:'동네꽃집'},{id:'u2',date:monthAgo(2)+'-10',type:'expense',category:'기타',amount:8000,memo:'동네꽃집'},
 {id:'u3',date:monthAgo(1)+'-11',type:'income',category:'기타 수입',amount:50000,memo:'중고판매'}]});
test.beforeEach(async({page})=>{
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.addInitScript(s=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify(s))},seed());
});
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_smart_v3')));

test('the app asks the browser to keep its storage and says so in settings',async({page})=>{
 await page.addInitScript(()=>{window.__persist=0;Object.defineProperty(navigator,'storage',{value:{persisted:async()=>window.__persist>0,persist:async()=>{window.__persist++;return true}}})});
 await page.goto('/index.html');
 await expect.poll(()=>page.evaluate(()=>window.__persist)).toBe(1);
 await page.locator('#settingsBottom').click();
 await expect(page.locator('#fmPersistStatus')).toContainText('저장 보호 켜짐');
});

test('backups carry category budgets, merchant rules, health inputs and fixed-cost marks; restore brings them back',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>{localStorage.setItem('firemate_category_budgets_v1',JSON.stringify({'식비':300000}));localStorage.setItem('firemate_category_rules_v1',JSON.stringify({'expense|다이소':'쇼핑'}));localStorage.setItem('firemate_health_calc_v1',JSON.stringify({finance:'3000'}));localStorage.setItem('firemate_fixed_costs_v1',JSON.stringify({'넷플릭스':true}));localStorage.setItem('firemate_gmail_token_v1',JSON.stringify({token:'secret',exp:1}))});
 await page.locator('#settingsBottom').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 const text=require('fs').readFileSync(await download.path(),'utf8');const backup=JSON.parse(text);
 expect(Object.keys(backup.extras).sort()).toEqual(['firemate_category_budgets_v1','firemate_category_rules_v1','firemate_fixed_costs_v1','firemate_health_calc_v1']);
 expect(text).not.toContain('secret');
 await page.evaluate(()=>{for(const k of ['firemate_category_budgets_v1','firemate_category_rules_v1','firemate_health_calc_v1','firemate_fixed_costs_v1'])localStorage.removeItem(k)});
 await page.locator('#importFile').setInputFiles({name:'b.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await Promise.all([page.waitForEvent('download'),page.locator('#fmAskOk').click()]);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('firemate_category_budgets_v1'))).toBe(JSON.stringify({'식비':300000}));
 expect(await page.evaluate(()=>localStorage.getItem('firemate_fixed_costs_v1'))).toBe(JSON.stringify({'넷플릭스':true}));
});

test('backups also carry the small-income and auto-add switches',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>{localStorage.setItem('firemate_hide_small_income_v1','0');localStorage.setItem('firemate_import_auto_v1','1')});
 await page.locator('#settingsBottom').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 const text=require('fs').readFileSync(await download.path(),'utf8');
 expect(JSON.parse(text).extras).toMatchObject({firemate_hide_small_income_v1:'0',firemate_import_auto_v1:'1'});
 await page.evaluate(()=>{localStorage.removeItem('firemate_hide_small_income_v1');localStorage.removeItem('firemate_import_auto_v1')});
 await page.locator('#importFile').setInputFiles({name:'b.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await Promise.all([page.waitForEvent('download'),page.locator('#fmAskOk').click()]);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('firemate_hide_small_income_v1'))).toBe('0');
 expect(await page.evaluate(()=>localStorage.getItem('firemate_import_auto_v1'))).toBe('1');
});

test('fixed costs keep monthly bills, skip frequent shops and can be hidden',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 const list=page.locator('#fmFixedList');
 await expect(list).toContainText('넷플릭스');
 await expect(list).not.toContainText('스타벅스');
 // No questions: a wrong row can only be hidden.
 await expect(list.locator('[data-fixed-yes]')).toHaveCount(0);
 await list.locator('[data-fixed-no="넷플릭스"]').click();
 await expect(list).not.toContainText('넷플릭스');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_fixed_costs_v1')))).toEqual({'넷플릭스':false});
});

test('a merchant left under 기타 is re-categorised in one step and remembered',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmUncatTitle')).toHaveText('분류가 필요한 가게 1곳');
 await page.locator('#fmUncatTitle').click();
 const row=page.locator('#fmUncatList .fm-uncat-row',{hasText:'동네꽃집'});
 await expect(row).toContainText('2건 · ₩20,000');
 await row.locator('select').selectOption('문화·취미');
 await row.locator('button').click();
 await expect(page.locator('#toast')).toContainText('동네꽃집 2건');
 const s=await saved(page);
 expect(s.tx.filter(t=>t.memo==='동네꽃집').map(t=>t.category)).toEqual(['문화·취미','문화·취미']);
 expect(s.tx.find(t=>t.memo==='넷플릭스').category).toBe('통신·구독');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_category_rules_v1'))['expense|동네꽃집'])).toBe('문화·취미');
 await expect(page.locator('#fmUncatList')).not.toContainText('동네꽃집');
 // Income left as 기타 수입 is never asked about.
 await expect(page.locator('#fmUncatList')).not.toContainText('중고판매');
});

test('imported spending under 기타 is classified by merchant name on its own, with one-step undo',async({page})=>{
 const key=(memo,amount)=>[monthAgo(1)+'-07','10:00','expense','기타','',memo,amount,'카드'].join('|');
 await page.addInitScript(([a,b])=>{localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',rec:[],budgets:{},tx:[
  {id:'g',date:'2026-09-07',type:'expense',category:'기타',amount:3000,memo:'GS25 강남점',bankExcelKey:a},
  {id:'k',date:'2026-09-08',type:'expense',category:'기타',amount:95770,memo:'KT통신요금자동납부',bankExcelKey:b},
  {id:'m',date:'2026-09-09',type:'expense',category:'기타',amount:7000,memo:'동네꽃집'},
  {id:'r',date:'2026-09-10',type:'expense',category:'뷰티/미용',amount:20000,memo:'헤어샵',bankExcelKey:[ '2026-09-10','10:00','expense','뷰티/미용','','헤어샵',20000,'카드'].join('|')},
  {id:'c',date:'2026-09-11',type:'expense',category:'여행',amount:9000,memo:'GS25',bankExcelKey:['2026-09-11','10:00','expense','편의점','','GS25',9000,'카드'].join('|')}]}))},[key('GS25 강남점',3000),key('KT통신요금자동납부',95770)]);
 await page.goto('/index.html');
 const cats=async()=>Object.fromEntries((await saved(page)).tx.map(t=>[t.id,t.category]));
 // A raw bank label becomes an app category; a category the user picked (여행) stays.
 expect(await cats()).toEqual({g:'식비',k:'통신·구독',m:'기타',r:'쇼핑',c:'여행'});
 await page.evaluate(()=>window.fmGo('insights'));
 await expect(page.locator('#fmAutoCatNote')).toContainText('3건을 자동 분류했어요');
 await page.locator('#fmAutoCatUndo').click();
 expect(await cats()).toEqual({g:'기타',k:'기타',m:'기타',r:'뷰티/미용',c:'여행'});
 // Undone rows are not re-classified on the next visit.
 await page.evaluate(()=>{window.fmAutoCategorized=0});await page.reload();
 expect((await saved(page)).tx.find(x=>x.id==='g').category).toBe('기타');
});
