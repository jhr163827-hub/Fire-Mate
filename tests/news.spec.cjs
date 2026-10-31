const {test,expect}=require('@playwright/test');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const ago=h=>new Date(Date.now()-h*36e5).toISOString();
const feed={at:ago(0.5),top:[{t:'경제 헤드라인',src:'한국경제',url:'https://news.google.com/a',at:ago(2)}],market:[{t:'코스피 상승',src:'연합뉴스',url:'https://news.google.com/b',at:ago(1)}],
 symbols:{QQQ:[{t:'QQQ 나스닥 ETF 자금 유입',src:'머니투데이',url:'https://news.google.com/q',at:ago(3)}],TSLL:[{t:'안 가진 종목',src:'X',url:'https://news.google.com/t',at:ago(1)}]}};
test.beforeEach(async({page})=>{
 await page.route(/news\.json/,r=>r.fulfill({json:feed}));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.addInitScript(()=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('firemate_smart_v3',JSON.stringify({theme:'dark',tx:[],accounts:[],holdings:[{id:'h',name:'QQQ',ticker:'QQQ',type:'USD',qty:1,avg:400,price:500}]}))});
});
test('📰 home line shows news on a held symbol first; the screen lists 내 종목 · 증시 · 경제 with links',async({page})=>{
 await page.goto('/index.html');
 const line=page.locator('#fmHomeNews');
 await expect(line).toContainText('QQQ 나스닥 ETF 자금 유입');await expect(line.locator('b')).toHaveCount(0);
 await line.click();
 const box=page.locator('#fmNewsOverlay');
 await expect(box.locator('h3')).toHaveText(['💼 내 종목','📈 증시','🏦 경제']);
 await expect(box).not.toContainText('안 가진 종목');
 await expect(box.locator('a.fm-news-row').first()).toHaveAttribute('href','https://news.google.com/q');
 await expect(box.locator('a.fm-news-row').first()).toHaveAttribute('target','_blank');
 await expect(box.locator('.fm-news-at')).toContainText('30분 전 업데이트');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await box.locator('[data-close]').click();await expect(box).toBeHidden();
});
test('📰 hides from home with 홈에 보일 것',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firemate_home_hide_v1',JSON.stringify(['news'])));
 await page.goto('/index.html');
 await expect(page.locator('#fmHomeNews')).toBeHidden();
});
