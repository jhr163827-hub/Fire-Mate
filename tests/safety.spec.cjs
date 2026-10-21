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

test('fixed costs skip frequent shops and can be confirmed or hidden',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
 const list=page.locator('#fmFixedList');
 await expect(list).toContainText('넷플릭스');
 await expect(list).not.toContainText('스타벅스');
 await list.locator('[data-fixed-yes="넷플릭스"]').click();
 await expect(list).toContainText('넷플릭스 ✓');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('firemate_fixed_costs_v1')))).toEqual({'넷플릭스':true});
});

test('a merchant left under 기타 is re-categorised in one step and remembered',async({page})=>{
 await page.goto('/index.html');
 await page.evaluate(()=>window.fmGo('insights'));
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
 await expect(page.locator('#fmUncatList')).toContainText('중고판매');
});
