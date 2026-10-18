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
