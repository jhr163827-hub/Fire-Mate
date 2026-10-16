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
