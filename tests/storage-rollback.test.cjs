const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');

const checks = [
  ['FIRE settings rollback', /data\.fire=p;if\(!persist\(\)\)\{data\.fire=previousFire;return\}/],
  ['retirement plan rollback', /if\(!persist\(\)\)\{data\.retirement=previousRetirement;return\}/],
  ['budget rollback', /if\(!persist\(\)\)\{data\.budgets=previousBudgets;return\}/],
  ['daily record delete rollback', /if\(!persist\(\)\)\{data\.dailySnapshots=previousDailySnapshots;return\}/],
  ['monthly record rollback', /if\(!persist\(\)\)\{data\.snapshots=previousSnapshots;return\}/],
  ['other asset rollback', /if\(!persist\(\)\)\{a\.items=previousItems;return\}/],
];
let failed = 0;
for (const [name, pattern] of checks) {
  try { assert.match(html, pattern); console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, error.message); }
}
console.log(checks.length + ' static rollback guards; ' + failed + ' failures.');
console.log('Note: these checks verify source guards, not browser storage-failure behavior.');
process.exitCode = failed ? 1 : 0;

const vm = require('node:vm');
const storageCases = [
  ['FIRE settings', "const previousFire=data.fire;data.fire=p;if(!persist()){data.fire=previousFire;return}"],
  ['retirement plan', "const previousRetirement=data.retirement;data.retirement=scope==='portfolio'?{...previousRetirement,items:previousRetirement.items.map((it,i)=>({...it,amount:vals[i]}))}:scope==='life'?{...previousRetirement,monthly:nums[0]}:{...previousRetirement,yield:nums[1],priceChange:nums[2],crash:nums[3],taxRate:nums[4]};if(!persist()){data.retirement=previousRetirement;return}"],
  ['budget', "const previousBudgets={...data.budgets};data.budgets={...previousBudgets,[month]:v};if(!persist()){data.budgets=previousBudgets;return}"],
  ['other asset deletion', "const previousItems=a.items;a.items=a.items.filter(x=>x.id!==item.id);if(!persist()){a.items=previousItems;return}"],
  ['daily record deletion', "const previousDailySnapshots=data.dailySnapshots;data.dailySnapshots=previousDailySnapshots.filter(x=>x.day!==day);if(!persist()){data.dailySnapshots=previousDailySnapshots;return}"],
];
for (const [name, fragment] of storageCases) {
  try {
    assert.ok(html.includes(fragment), name + ': production fragment missing');
    const data = {
      fire:{goal:100}, retirement:{items:[{name:'A',amount:10}],monthly:10},
      budgets:{'2026-10':500}, dailySnapshots:[{day:'2026-10-17',amount:100}]
    };
    const a={items:[{id:'one',amount:100},{id:'two',amount:200}]};
    const before=JSON.stringify({data,a});
    const context={data,a,p:{goal:200},vals:[20],nums:[20,5,7,25,20],month:'2026-10',v:900,
      scope:'portfolio',item:{id:'one'},day:'2026-10-17',persist:()=>false};
    vm.runInNewContext('(function(){'+fragment+'})()',context);
    assert.equal(JSON.stringify({data,a}),before,name + ': failed persistence changed state');
    context.persist=()=>true;
    vm.runInNewContext('(function(){'+fragment+'})()',context);
    assert.notEqual(JSON.stringify({data,a}),before,name + ': successful persistence made no change');
    if(name==='retirement plan'){
      assert.equal(data.retirement.monthly,10,'allocation save must preserve living conditions');
      assert.equal(data.retirement.taxRate,undefined,'allocation save must not add default tax settings');
      context.scope='life';const items=JSON.stringify(data.retirement.items);
      vm.runInNewContext('(function(){'+fragment+'})()',context);
      assert.equal(JSON.stringify(data.retirement.items),items,'living-condition save must preserve allocations');
      assert.equal(data.retirement.monthly,20);
      assert.equal(data.retirement.taxRate,undefined,'expense save must not save experiment defaults');
      context.scope='experiment';context.nums=[999,5,7,25,20];
      const beforeExperiment=JSON.stringify(data.retirement);context.persist=()=>false;
      vm.runInNewContext('(function(){'+fragment+'})()',context);
      assert.equal(JSON.stringify(data.retirement),beforeExperiment,'experiment quota failure must roll back');
      context.persist=()=>true;vm.runInNewContext('(function(){'+fragment+'})()',context);
      assert.equal(data.retirement.monthly,20,'experiment save must not save expense drafts');
      assert.equal(data.retirement.taxRate,20);
      assert.equal(JSON.stringify(data.retirement.items),items);
    }
    console.log('PASS simulated failure/success:',name);
  } catch (error) {
    failed++;
    console.error('FAIL simulated failure/success:',name,error.message);
  }
}
console.log('Simulation uses exact source fragments in an isolated VM, not full browser integration.');
process.exitCode=failed?1:0;
