const test=require('node:test');const assert=require('node:assert/strict');
test('independent KRW/USD valuation, net worth and return reference',()=>{
 const fx=1400,usd={qty:2,price:100,cost:80},krw={qty:3,price:10000,cost:9000};
 const investment=usd.qty*usd.price*fx+krw.qty*krw.price;
 const cost=usd.qty*usd.cost*fx+krw.qty*krw.cost;
 assert.equal(investment,310000);assert.equal(cost,251000);
 assert.equal(investment+5000+7000+10000+2000-3000,331000);
 assert.ok(Math.abs((investment-cost)/cost*100-23.50597609561753)<1e-10);
});
test('multi-account aggregation and gross/net dividend reference',()=>{
 const positions=[{ticker:'ABC',account:'A',qty:2,price:100},{ticker:'ABC',account:'B',qty:3,price:100}];
 const combined=positions.filter(x=>x.ticker==='ABC').reduce((sum,x)=>sum+x.qty*x.price,0);
 assert.equal(combined,500);
 const gross=5*2.5;const net=gross*(1-0.15);
 assert.equal(gross,12.5);assert.equal(net,10.625);
});

test('production FIRE projection matches independent annuity and goal boundary references',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync('index.html','utf8');
 const start=html.indexOf('function fireMonthlyRate('),end=html.indexOf('function fmReadableMan(',start);
 assert.ok(start>=0&&end>start);
 const app=vm.createContext({});vm.runInContext(html.slice(start,end),app);
 // Closed-form end-of-month annuity, independent of the production recurrence.
 for(const asset of [0,15000])for(const monthly of [0,300])for(const rate of [-30,0,7,40]){
  for(const years of [5,10,20,30]){
   const months=years*12,r=Math.expm1(Math.log1p(rate/100)/12);
   const expected=rate===0?asset+monthly*months:asset*Math.exp(months*Math.log1p(r))+monthly*Math.expm1(months*Math.log1p(r))/r;
   const actual=app.fmProjectedAsset(asset,monthly,rate,months);
   assert.ok(Math.abs(actual-expected)<=Math.max(0.000001,Math.abs(expected)*1e-11),JSON.stringify({asset,monthly,rate,years,actual,expected}));
   const series=app.fmProjectionSeries(asset,monthly,rate,months);
   assert.equal(series.length,months+1);assert.equal(series[months],actual);
  }
 }
 for(const rate of [-10,0,7,15]){
  const m=app.estimate(15000,65000,300,rate);
  if(m!==null){assert.ok(app.fmProjectedAsset(15000,300,rate,m)>=65000);assert.ok(app.fmProjectedAsset(15000,300,rate,m-1)<65000)}
  else assert.ok(app.fmProjectedAsset(15000,300,rate,1200)<65000);
 }
 assert.equal(app.estimate(65000,65000,0,7),0);
 assert.equal(app.estimate(100,200,0,-10),null);
 assert.equal(app.fmProjectedAsset(100,10,0,1),110,'deposit earns no return in its contribution month');
 assert.ok(Math.abs(app.fmProjectedAsset(100,10,12,1)-(100*Math.pow(1.12,1/12)+10))<1e-10);
 for(const args of [[100,-1,7,12],[100,10,-100,12],[100,10,7,1.5],[100,10,7,1201]])assert.equal(app.fmProjectedAsset(...args),null);
});
