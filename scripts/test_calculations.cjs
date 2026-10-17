#!/usr/bin/env node
// Deterministic smoke tests against the actual asset calculation functions.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('function fmFiniteNumber(');
const end=html.indexOf('function moveAccount(',begin);
assert(begin>=0&&end>begin,'asset calculation functions found');
const source=html.slice(begin,end);
const context={
  data:{
    balance:{fx:1400,cash:50000,other:20000,debt:10000},
    holdings:[
      {type:'USD',qty:2,price:100,cost:80,accountId:'stocks'},
      {type:'KRW',qty:3,price:10000,cost:9000,accountId:'domestic'}
    ],
    accounts:[{id:'stocks',fire:true,amount:10000,items:[]},{id:'domestic',fire:false,amount:5000,items:[]}]
  }
};
vm.createContext(context);
vm.runInContext(source,context,{timeout:1000});
assert.equal(vm.runInContext('assetValue(data.holdings[0])',context),280000);
assert.equal(vm.runInContext('assetCost(data.holdings[0])',context),224000);
assert.equal(vm.runInContext('assetValue(data.holdings[1])',context),30000);
assert.equal(vm.runInContext('netAsset()',context),385000);
assert.equal(vm.runInContext('fireLiquid()',context),330000);
context.data.holdings.push({type:'USD',qty:'broken',price:100,accountId:'stocks'});
assert.equal(vm.runInContext('netAsset()',context),385000,'invalid quantity cannot corrupt total');
context.data.holdings.push({type:'KRW',qty:1,price:'bad',accountId:'stocks'});
assert.equal(vm.runInContext('netAsset()',context),385000,'invalid price cannot corrupt total');
context.data.balance.other='bad';
assert.equal(vm.runInContext('netAsset()',context),365000,'invalid other balance cannot corrupt total');
console.log('PASS: asset value, cost, net worth, FIRE eligible assets, invalid numeric inputs');

const estimateStart=html.indexOf('function fireMonthlyRate(');
const estimateEnd=html.indexOf('function fmReadableMan(',estimateStart);
assert(estimateStart>=0&&estimateEnd>estimateStart,'production FIRE estimator found');
const fireContext={};
vm.createContext(fireContext);
vm.runInContext(html.slice(estimateStart,estimateEnd),fireContext,{timeout:1000});
const estimate=(...args)=>fireContext.estimate(...args);
assert.equal(estimate(65000,65000,300,7),0,'already reached goal');
assert.equal(estimate(100,200,100,0),1,'zero-return contribution');
assert.equal(estimate(100,200,0,0),null,'unreachable goal');
assert.equal(estimate(100,200,0,-100),null,'invalid total-loss rate');
assert.equal(estimate(0,100,10,0),10,'ten monthly deposits');
assert.ok(estimate(15000,65000,300,7)>0,'representative FIRE estimate');
assert.equal(estimate(-1,100,10,7),null,'negative assets rejected');
assert.equal(estimate(100,200,-10,7),null,'negative contributions rejected');
const project=(...args)=>fireContext.fmProjectedAsset(...args);
assert.equal(project(100,10,0,12),220,'12 monthly deposits without growth');
assert.equal(project(100,10,0,360),3700,'30 year horizon without growth');
const series=(...args)=>fireContext.fmProjectionSeries(...args);
assert.equal(series(100,10,0,360).length,361,'30-year chart includes initial month');
assert.equal(series(100,10,0,360)[360],3700,'30-year chart and projection agree');
assert.equal(series(100,10,-100,12),null,'chart rejects invalid return');
assert.equal(series(100,10,7,1201),null,'chart bounds projection horizon');
assert.equal(series(100,10,7,1.5),null,'chart rejects fractional months');
for(const rate of [0,4,7,10,15]){
 const chart=series(15000,300,rate,360);
 assert.ok(chart&&chart.every(Number.isFinite),'chart has finite points');
 for(const month of [0,1,12,120,240,360])assert.ok(Math.abs(chart[month]-project(15000,300,rate,month))<0.01,'chart and calculator agree at month '+month);
}
assert.ok(html.includes('const values=fmProjectionSeries(initial,monthly,rate,N)'),'forecast uses tested shared projection');
assert.equal(project(100,10,7,-1),null,'negative projection horizon rejected');
assert.equal(project(100,10,-100,12),null,'invalid projection return rejected');
assert.equal(project(100,10,7,1.5),null,'fractional months rejected');
assert.equal(project(100,10,7,1201),null,'calculator and chart share 100-year horizon bound');
assert.ok(Number.isFinite(project(15000,300,7,360)),'30 year projection remains finite');
for(const rate of [0,4,7,10,15]){
 const months=estimate(15000,65000,300,rate);
 assert.ok(months!==null,'representative goal reached');
 assert.ok(project(15000,300,rate,months)>=65000-0.001,'projected goal reached at estimated month');
 if(months>0)assert.ok(project(15000,300,rate,months-1)<65000,'goal not reached in preceding month');
}
assert.ok(html.includes('const values=fmProjectionSeries(initial,monthly,rate,N)'),'forecast uses validated monthly compound projection series');
assert.ok(html.includes("const months=target>0?estimate(principal/10000,target/10000,contribution/10000,annual)"),'home FIRE uses common estimator');
assert.ok(html.includes("const monthsToGoal=estimate(initial,goal,monthly,rate)"),'forecast uses common estimator');
assert.ok(html.includes("const monthlyNetIncome=fmDividendRows.reduce"),'cashflow includes net dividend estimate');
assert.ok(html.includes("const crashNetMonthly=crashMonthly*(1-taxRate/100)"),'retirement stress uses after-tax assumption');
assert.ok(html.includes("budget>=t.expense?won(budget-t.expense):'예산 초과 '"),'overspent budget is labeled, not shown as negative remainder');
console.log('PASS: FIRE estimate edge cases, cross-view consistency guards, net cashflow and budget label');
