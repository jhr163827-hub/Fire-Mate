const {test,expect}=require('@playwright/test');
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('style blocks open and close in order, so no CSS is swallowed as text',()=>{
 // Inside <style>, a second <style ...> is raw text and silently breaks the next rule.
 const problems=[];let open=null;
 for(const m of html.matchAll(/<style\b[^>]*>|<\/style>/g)){
  const line=html.slice(0,m.index).split('\n').length;
  if(m[0]!=='</style>'){if(open)problems.push('line '+line+': '+m[0]+' inside style opened on line '+open);open=line}
  else{if(!open)problems.push('line '+line+': stray </style>');open=null}
 }
 expect(problems).toEqual([]);
});

test('every style block id in the source becomes a real style element',async({page})=>{
 const ids=[...html.matchAll(/<style\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]);
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.goto('/index.html');
 const missing=await page.evaluate(ids=>ids.filter(id=>document.getElementById(id)?.tagName!=='STYLE'),ids);
 expect(missing).toEqual([]);
});
