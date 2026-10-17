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
assert.match(html,/const months=target>0\\?estimate\\(principal\\/10000,target\\/10000,contribution\\/10000,annual\\)/,'home FIRE uses common estimator');
assert.match(html,/const monthsToGoal=estimate\\(initial,goal,monthly,rate\\)/,'forecast uses common estimator');
assert.match(html,/const monthlyNetIncome=fmDividendRows\\.reduce/,'cashflow includes net dividend estimate');
assert.match(html,/const crashNetMonthly=crashMonthly\\*\\(1-taxRate\\/100\\)/,'retirement stress uses after-tax assumption');
assert.match(html,/budget>=t\\.expense\\?won\\(budget-t\\.expense\\):'예산 초과 '/,'overspent budget is labeled, not shown as negative remainder');
console.log('PASS: FIRE estimate edge cases, cross-view consistency guards, net cashflow and budget label');
